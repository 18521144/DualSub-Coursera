(async () => {
  const videoElement = document.querySelector('video');
  if (!videoElement) {
    console.error("Không tìm thấy phần tử video trên trang!");
    return;
  }

  // Lấy các phần tử <track> từ video
  const tracks = videoElement.querySelectorAll('track');
  if (tracks.length < 2) {
    console.error("Không tìm thấy đủ 2 track để hiển thị dual subtitle!");
    return;
  }

  // Giả định track đầu tiên là English, track thứ hai là Tiếng Việt
  const track1 = Array.from(tracks).find(t => t.getAttribute('srclang') === 'en');
  const track2 = Array.from(tracks).find(t => t.getAttribute('srclang') === 'vi');

  if (!track1 || !track2) {
    console.error("Không tìm thấy track cho English hoặc Tiếng Việt!");
    return;
  }

  const subtitleUrl1 = track1.src; // Link English
  const subtitleUrl2 = track2.src; // Link Tiếng Việt

  try {
    // Fetch Subtitle 1 (English)
    const response1 = await fetch(subtitleUrl1);
    if (!response1.ok) throw new Error("Không thể tải subtitle 1: " + (await response1.text()));
    const subtitleText1 = await response1.text();
    if (!subtitleText1.startsWith("WEBVTT")) throw new Error("Subtitle 1 không phải .vtt");

    // Fetch Subtitle 2 (Tiếng Việt)
    const response2 = await fetch(subtitleUrl2);
    if (!response2.ok) throw new Error("Không thể tải subtitle 2: " + (await response2.text()));
    const subtitleText2 = await response2.text();
    if (!subtitleText2.startsWith("WEBVTT")) throw new Error("Subtitle 2 không phải .vtt");

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

    // Phân tích hai file subtitle
    const cues1 = parseVTT(subtitleText1); // English
    const cues2 = parseVTT(subtitleText2); // Tiếng Việt

    // Tạo container cho subtitle
    const subtitleContainer = document.createElement('div');
    subtitleContainer.style.position = 'absolute';
    subtitleContainer.style.bottom = '10%';
    subtitleContainer.style.left = '0';
    subtitleContainer.style.right = '0';
    subtitleContainer.style.textAlign = 'center';
    subtitleContainer.style.pointerEvents = 'none';
    subtitleContainer.style.zIndex = '1000';

    const sub1 = document.createElement('div');
    sub1.style.color = 'white';
    sub1.style.background = 'rgba(0, 0, 0, 0.7)';
    sub1.style.padding = '5px';
    sub1.style.fontSize = '20px';
    sub1.style.fontFamily = 'Arial, sans-serif';

    const sub2 = document.createElement('div');
    sub2.style.color = 'yellow';
    sub2.style.background = 'rgba(0, 0, 0, 0.7)';
    sub2.style.padding = '5px';
    sub2.style.fontSize = '18px';
    sub2.style.fontFamily = 'Arial, sans-serif';
    sub2.style.marginTop = '5px';

    subtitleContainer.appendChild(sub1);
    subtitleContainer.appendChild(sub2);
    videoElement.parentElement.style.position = 'relative';
    videoElement.parentElement.appendChild(subtitleContainer);

    // Cập nhật subtitle theo thời gian video
    videoElement.addEventListener('timeupdate', () => {
      const currentTime = videoElement.currentTime;

      // Subtitle 1 (English)
      const activeCue1 = cues1.find(cue => currentTime >= cue.start && currentTime <= cue.end);
      sub1.textContent = activeCue1 ? activeCue1.text : '';

      // Subtitle 2 (Tiếng Việt)
      const activeCue2 = cues2.find(cue => currentTime >= cue.start && currentTime <= cue.end);
      sub2.textContent = activeCue2 ? activeCue2.text : '';
    });

    console.log("Đã thêm dual subtitle (English + Tiếng Việt) từ các track có sẵn!");
  } catch (error) {
    console.error("Lỗi:", error);
  }
})();
