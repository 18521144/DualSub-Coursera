(async () => {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    console.error("Không tìm thấy phần tử video trên trang!");
    return;
  }

  // Lấy các phần tử <track> từ video
  const tracks = videoElement.querySelectorAll('track');
  if (tracks.length === 0) {
    console.error("Không tìm thấy track nào!");
    return;
  }

  // Tìm track tiếng Anh
  const trackEn = Array.from(tracks).find(t => t.getAttribute('srclang') === 'en');
  const trackVi = Array.from(tracks).find(t => t.getAttribute('srclang') === 'vi');

  if (!trackEn) {
    console.error("Không tìm thấy track tiếng Anh!");
    return;
  }

  const subtitleUrlEn = trackEn.src; // Link tiếng Anh

  // Hàm phân tích file .vtt
  const parseVTT = (vttText) => {
    const lines = vttText.split('\n');
    const cues = [];
    let currentCue = null;

    for (let i = 1; i < lines.length; i++) { // Bỏ qua dòng "WEBVTT"
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const [start, end] = line.split(' --> ').map(time => {
          const [h, m, s] = time.split(':');
          return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
        });
        currentCue = { start, end, text: '' };
      } else if (line && currentCue) {
        currentCue.text += (currentCue.text ? '\n' : '') + line;
      } else if (!line && currentCue) {
        cues.push(currentCue);
        currentCue = null;
      }
    }
    if (currentCue) cues.push(currentCue);
    return cues;
  };

  // Hàm dịch văn bản qua Google Translate API
  const translateText = async (text) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Không thể dịch văn bản");
    const data = await response.json();
    return data[0][0][0]; // Lấy kết quả dịch
  };

  try {
    // Fetch và phân tích subtitle tiếng Anh
    const responseEn = await fetch(subtitleUrlEn);
    if (!responseEn.ok) throw new Error("Không thể tải subtitle tiếng Anh: " + (await responseEn.text()));
    const subtitleTextEn = await responseEn.text();
    if (!subtitleTextEn.startsWith("WEBVTT")) throw new Error("Subtitle tiếng Anh không phải .vtt");

    const cuesEn = parseVTT(subtitleTextEn); // Cues tiếng Anh

    // Nếu có track tiếng Việt, fetch nó; nếu không, dịch từ tiếng Anh
    let cuesVi;
    if (trackVi) {
      const subtitleUrlVi = trackVi.src;
      const responseVi = await fetch(subtitleUrlVi);
      if (!responseVi.ok) throw new Error("Không thể tải subtitle tiếng Việt: " + (await responseVi.text()));
      const subtitleTextVi = await responseVi.text();
      if (!subtitleTextVi.startsWith("WEBVTT")) throw new Error("Subtitle tiếng Việt không phải .vtt");
      cuesVi = parseVTT(subtitleTextVi);
    } else {
      console.log("Không tìm thấy subtitle tiếng Việt, đang dịch từ tiếng Anh...");
      cuesVi = await Promise.all(cuesEn.map(async cue => ({
        start: cue.start,
        end: cue.end,
        text: await translateText(cue.text)
      })));
    }

    // Tạo container cho subtitle
    const subtitleContainer = document.createElement('div');
    subtitleContainer.style.position = 'absolute';
    subtitleContainer.style.bottom = '10%';
    subtitleContainer.style.left = '0';
    subtitleContainer.style.right = '0';
    subtitleContainer.style.textAlign = 'center';
    subtitleContainer.style.pointerEvents = 'none';
    subtitleContainer.style.zIndex = '1000';

    const subEn = document.createElement('div');
    subEn.style.color = 'white';
    subEn.style.background = 'rgba(0, 0, 0, 0.7)';
    subEn.style.padding = '5px';
    subEn.style.fontSize = '20px';
    subEn.style.fontFamily = 'Arial, sans-serif';

    const subVi = document.createElement('div');
    subVi.style.color = 'yellow';
    subVi.style.background = 'rgba(0, 0, 0, 0.7)';
    subVi.style.padding = '5px';
    subVi.style.fontSize = '18px';
    subVi.style.fontFamily = 'Arial, sans-serif';
    subVi.style.marginTop = '5px';

    subtitleContainer.appendChild(subEn);
    subtitleContainer.appendChild(subVi);
    videoElement.parentElement.style.position = 'relative';
    videoElement.parentElement.appendChild(subtitleContainer);

    // Cập nhật subtitle theo thời gian video
    videoElement.addEventListener('timeupdate', () => {
      const currentTime = videoElement.currentTime;

      // Subtitle tiếng Anh
      const activeCueEn = cuesEn.find(cue => currentTime >= cue.start && currentTime <= cue.end);
      subEn.textContent = activeCueEn ? activeCueEn.text : '';

      // Subtitle tiếng Việt
      const activeCueVi = cuesVi.find(cue => currentTime >= cue.start && currentTime <= cue.end);
      subVi.textContent = activeCueVi ? activeCueVi.text : '';
    });

    console.log("Đã thêm dual subtitle (English + Tiếng Việt)!");
  } catch (error) {
    console.error("Lỗi:", error);
  }
})();
