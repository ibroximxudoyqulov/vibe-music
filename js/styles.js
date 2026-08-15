// ==================== 1080x1920 60FPS SMART EXPORTER ====================

let isVinylActive = false;
let isSpectrumActive = false;
let customBgUrl = null;

// 1. Shriftni yangilash
window.updatePreviewFont = function(fontFamily) {
    const lyricsLines = document.querySelectorAll('#spotify-lyrics-scroll p');
    lyricsLines.forEach(line => { line.style.fontFamily = fontFamily; });
};

// 2. Fon yuklash
window.handleCustomBgUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('custom-bg-name').innerText = `🖼 ${file.name}`;
    customBgUrl = URL.createObjectURL(file);

    const bgLayer = document.getElementById('custom-bg-layer');
    if (bgLayer) {
        bgLayer.style.backgroundImage = `url('${customBgUrl}')`;
        bgLayer.style.opacity = '0.45';
    }
};

// 3. Vinil va Ekvalayzer
window.toggleVinylEffect = function() {
    isVinylActive = !isVinylActive;
    const vinylBox = document.getElementById('preview-vinyl-box');
    const btn = document.getElementById('btn-vinyl');
    if (isVinylActive) {
        vinylBox.classList.remove('hidden');
        btn.classList.add('border-brand-red', 'text-brand-red');
    } else {
        vinylBox.classList.add('hidden');
        btn.classList.remove('border-brand-red', 'text-brand-red');
    }
};

window.toggleSpectrumEffect = function() {
    isSpectrumActive = !isSpectrumActive;
    const spectrumBox = document.getElementById('preview-spectrum-box');
    const btn = document.getElementById('btn-spectrum');
    if (isSpectrumActive) {
        spectrumBox.classList.remove('hidden');
        spectrumBox.classList.add('flex');
        btn.classList.add('border-brand-cyan', 'text-brand-cyan');
    } else {
        spectrumBox.classList.add('hidden');
        spectrumBox.classList.remove('flex');
        btn.classList.remove('border-brand-cyan', 'text-brand-cyan');
    }
};

// 4. SMART 60FPS VIDEO EKSPORT (MATN TUGAGAN JOYDA KESUVCHI)
window.exportHighQualityVideo = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin MP3 fayl yuklang!");
        return;
    }
    if (typeof lyricsData === 'undefined' || lyricsData.length === 0) {
        alert("⚠️ Qo'shiq matnini kiritib, sinxronlang!");
        return;
    }

    // OXIRGI SATRNING VAQTINI HISOBLASH (Qo'shiqni shu yerda kesish uchun)
    let lastLyricTime = 0;
    lyricsData.forEach(l => {
        if (l.time !== null && l.time > lastLyricTime) lastLyricTime = l.time;
    });
    const videoEndTime = lastLyricTime > 0 ? lastLyricTime + 3 : audio.duration || 10;

    alert(`🎬 60FPS Video tayyorlanmoqda... (Davomiyligi: ${Math.ceil(videoEndTime)} soniya). Iltimos, kuting!`);

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(60);
    let recorder;
    try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
    } catch (e) {
        recorder = new MediaRecorder(stream);
    }

    const chunks = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        // Telefonda yuklab olishni majburlash
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `Spotify_Lyrics_${Date.now()}.mp4`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        audio.pause();
        audio.currentTime = 0;
        alert("🎉 Video muvaffaqiyatli yuklab olindi! Galereyangiz yoki Yuklamalar (Downloads) papkasini tekshiring.");
    };

    recorder.start();
    audio.currentTime = 0;
    audio.play();

    const selectedFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";

    function renderLoop() {
        // MATN TUGAGANDA MUSIQANI KESISH VA VIDEONI YOPISH
        if (audio.currentTime >= videoEndTime || audio.ended || audio.paused) {
            if (recorder.state === "recording") {
                recorder.stop();
            }
            return;
        }

        // Fon
        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, 1080, 1920);

        // Header
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px Montserrat, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(document.getElementById('preview-track-title').innerText, 100, 180);

        ctx.fillStyle = "#a7a7a7";
        ctx.font = "30px Montserrat, sans-serif";
        ctx.fillText(document.getElementById('preview-track-artist').innerText, 100, 230);

        // Chiziq
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 270);
        ctx.lineTo(980, 270);
        ctx.stroke();

        // Spotify Matnlari
        const curTime = audio.currentTime;
        let activeIdx = 0;
        lyricsData.forEach((l, i) => {
            if (l.time !== null && curTime >= l.time) activeIdx = i;
        });

        let startY = 650 - (activeIdx * 120);
        lyricsData.forEach((l, i) => {
            const y = startY + (i * 120);
            if (y > 350 && y < 1700) {
                if (i === activeIdx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = `bold 56px ${selectedFont}`;
                    ctx.fillText(l.text, 100, y);
                } else if (i < activeIdx) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
                    ctx.font = `bold 42px ${selectedFont}`;
                    ctx.fillText(l.text, 100, y);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                    ctx.font = `bold 42px ${selectedFont}`;
                    ctx.fillText(l.text, 100, y);
                }
            }
        });

        requestAnimationFrame(renderLoop);
    }

    renderLoop();
};

window.exportStoryImage = function() {
    alert("🖼 Story rasm formati saqlanmoqda...");
};
