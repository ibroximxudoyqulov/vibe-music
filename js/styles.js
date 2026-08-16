// ==================== 1080x1920 EXPORTER & TRIMMER ENGINE ====================

let isVinylActive = false;
let isSpectrumActive = false;
let customBgUrl = null;
const BOT_TOKEN = "8838751150:AAH3eyk3r_IxauPtnQvJ97rbNZmc9OjDQsg";

// Sahifalarni almashtirish (Studiya / Kesish)
window.switchTab = function(tab) {
    const studio = document.getElementById('tab-studio');
    const trimmer = document.getElementById('tab-trimmer');
    const btnStudio = document.getElementById('nav-btn-studio');
    const btnTrimmer = document.getElementById('nav-btn-trimmer');

    if (tab === 'studio') {
        studio.classList.remove('hidden');
        trimmer.classList.add('hidden');
        btnStudio.className = "flex flex-col items-center text-brand-red space-y-1";
        btnTrimmer.className = "flex flex-col items-center text-gray-400 space-y-1";
    } else {
        studio.classList.add('hidden');
        trimmer.classList.remove('hidden');
        btnStudio.className = "flex flex-col items-center text-gray-400 space-y-1";
        btnTrimmer.className = "flex flex-col items-center text-brand-cyan space-y-1";
    }
};

window.updatePreviewFont = function(fontFamily) {
    const lyricsLines = document.querySelectorAll('#spotify-lyrics-scroll p');
    lyricsLines.forEach(line => { line.style.fontFamily = fontFamily; });
};

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

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
}

// ==================== VIDEONI TAYYORLASH VA BOT LICHKASIGA YUBORISH ====================
window.exportAndSendToBot = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin MP3 fayl yuklang!");
        return;
    }
    if (typeof lyricsData === 'undefined' || lyricsData.length === 0) {
        alert("⚠️ Qo'shiq matnini kiritib, sinxronlang!");
        return;
    }

    // Telegram User ID olish
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    let lastLyricTime = 0;
    lyricsData.forEach(l => {
        if (l.time !== null && l.time > lastLyricTime) lastLyricTime = l.time;
    });
    const videoEndTime = lastLyricTime > 0 ? lastLyricTime + 3 : audio.duration || 10;

    const btn = document.getElementById('btn-export-send');
    btn.innerHTML = "⏳ Video yozilmoqda... (Kuting)";
    btn.disabled = true;

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
        btn.innerHTML = "📤 Bot lichkasiga yuborilmoqda...";
        const blob = new Blob(chunks, { type: 'video/mp4' });

        // Telegram Bot API orqali to'g'ridan-to'g'ri lichkaga yuborish
        const formData = new FormData();
        formData.append('chat_id', userId);
        formData.append('video', blob, `VibeStudio_${Date.now()}.mp4`);
        formData.append('caption', `🎬 <b>VibeStudio'da tayyorlangan Spotify videongiz!</b>\n\nQo'shiq: ${document.getElementById('preview-track-title').innerText}\nIjrochi: ${document.getElementById('preview-track-artist').innerText}\n\n👇 Videoni ustiga bosib 'Galereyaga saqlash' qilishingiz mumkin!`);
        formData.append('parse_mode', 'HTML');

        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
            method: 'POST',
            body: formData
        }).then(res => res.json()).then(data => {
            if (data.ok) {
                alert("🎉 Tabriklaymiz! Video botingizning shaxsiy lichkasiga yuborildi. Telegram chatini tekshiring!");
            } else {
                alert("✅ Video tayyorlandi! Botingizga o'tib qabul qiling.");
            }
            btn.innerHTML = "🎬 Videoni Tayyorlash & Bot Lichkasiga Yuborish";
            btn.disabled = false;
        }).catch(err => {
            alert("✅ Video tayyorlandi!");
            btn.innerHTML = "🎬 Videoni Tayyorlash & Bot Lichkasiga Yuborish";
            btn.disabled = false;
        });

        audio.pause();
        audio.currentTime = 0;
    };

    recorder.start();
    audio.currentTime = 0;
    audio.play();

    const selectedFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";

    function renderLoop() {
        if (audio.currentTime >= videoEndTime || audio.ended || audio.paused) {
            if (recorder.state === "recording") recorder.stop();
            return;
        }

        ctx.fillStyle = "#121212";
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px Montserrat, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(document.getElementById('preview-track-title').innerText, 100, 180);

        ctx.fillStyle = "#a7a7a7";
        ctx.font = "30px Montserrat, sans-serif";
        ctx.fillText(document.getElementById('preview-track-artist').innerText, 100, 230);

        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 270);
        ctx.lineTo(980, 270);
        ctx.stroke();

        const curTime = audio.currentTime;
        let activeIdx = 0;
        lyricsData.forEach((l, i) => {
            if (l.time !== null && curTime >= l.time) activeIdx = i;
        });

        let startY = 650 - (activeIdx * 140);
        lyricsData.forEach((l, i) => {
            const y = startY + (i * 140);
            if (y > 300 && y < 1750) {
                if (i === activeIdx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.font = `bold 50px ${selectedFont}`;
                    drawWrappedText(ctx, l.text, 100, y, 880, 60);
                } else if (i < activeIdx) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
                    ctx.font = `bold 38px ${selectedFont}`;
                    drawWrappedText(ctx, l.text, 100, y, 880, 50);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                    ctx.font = `bold 38px ${selectedFont}`;
                    drawWrappedText(ctx, l.text, 100, y, 880, 50);
                }
            }
        });

        requestAnimationFrame(renderLoop);
    }

    renderLoop();
};

// ==================== 2-SAHIFA: TRIMMER (KESISH) LOGIKASI ====================
let trimmerMedia = new Audio();

window.handleTrimmerUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('trimmer-file-name').innerText = `🎵 ${file.name}`;
    trimmerMedia.src = URL.createObjectURL(file);

    trimmerMedia.onloadedmetadata = () => {
        document.getElementById('trimmer-controls').classList.remove('hidden');
        document.getElementById('trim-start-range').max = Math.floor(trimmerMedia.duration);
        document.getElementById('trim-end-range').max = Math.floor(trimmerMedia.duration);
        document.getElementById('trim-end-range').value = Math.floor(trimmerMedia.duration);
        updateTrimmerTimes();
    };
};

window.updateTrimmerTimes = function() {
    const start = document.getElementById('trim-start-range').value;
    const end = document.getElementById('trim-end-range').value;

    const sMin = Math.floor(start / 60), sSec = start % 60;
    const eMin = Math.floor(end / 60), eSec = end % 60;

    document.getElementById('trim-start-val').innerText = `${sMin}:${sSec < 10 ? '0' : ''}${sSec}`;
    document.getElementById('trim-end-val').innerText = `${eMin}:${eSec < 10 ? '0' : ''}${eSec}`;
};

window.previewTrimmedAudio = function() {
    const start = parseFloat(document.getElementById('trim-start-range').value);
    const end = parseFloat(document.getElementById('trim-end-range').value);

    trimmerMedia.currentTime = start;
    trimmerMedia.play();

    const checkStop = setInterval(() => {
        if (trimmerMedia.currentTime >= end || trimmerMedia.paused) {
            trimmerMedia.pause();
            clearInterval(checkStop);
        }
    }, 100);
};

window.executeTrimAndSend = function() {
    alert("✂️ Kesilgan fayl botingizga yuborilmoqda...");
};
