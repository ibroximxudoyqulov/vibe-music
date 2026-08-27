// ==================== VIBESTUDIO 1080x1920 60FPS MASTER ENGINE ====================

let isVinylActive = false;
let isParticlesActive = true;
let customBgUrl = null;

// SIZNING BOTINGIZ VA RENDER SERVER KO'PRIGI:
const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";
const RENDER_SERVER_URL = "https://vibe-music-iays.onrender.com";

// 1. SAHIFALARNI ALMASHTIRISH (STUDIYA / KESISH)
window.switchTab = function(tab) {
    const studio = document.getElementById('tab-studio');
    const trimmer = document.getElementById('tab-trimmer');
    const btnStudio = document.getElementById('nav-btn-studio');
    const btnTrimmer = document.getElementById('nav-btn-trimmer');

    if (studio) studio.classList.add('hidden');
    if (trimmer) trimmer.classList.add('hidden');
    if (btnStudio) btnStudio.className = "flex flex-col items-center text-gray-400 space-y-1";
    if (btnTrimmer) btnTrimmer.className = "flex flex-col items-center text-gray-400 space-y-1";

    if (tab === 'studio' && studio) {
        studio.classList.remove('hidden');
        if (btnStudio) btnStudio.className = "flex flex-col items-center text-brand-red space-y-1";
    } else if (tab === 'trimmer' && trimmer) {
        trimmer.classList.remove('hidden');
        if (btnTrimmer) btnTrimmer.className = "flex flex-col items-center text-brand-cyan space-y-1";
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 2. SHRIFTNI YANGILASH
window.updatePreviewFont = function(fontFamily) {
    const slotActive = document.getElementById('cinema-slot-active');
    const slotNext = document.getElementById('cinema-slot-next');
    if (slotActive) slotActive.style.fontFamily = fontFamily;
    if (slotNext) slotNext.style.fontFamily = fontFamily;
};

// 3. SHAXSIY TTF/OTF SHRIFT YUKLASH
window.handleCustomFontUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fontName = "CustomFont_" + Date.now();
    const fontUrl = URL.createObjectURL(file);

    const newStyle = document.createElement('style');
    newStyle.appendChild(document.createTextNode(`
        @font-face {
            font-family: '${fontName}';
            src: url('${fontUrl}');
        }
    `));
    document.head.appendChild(newStyle);

    const select = document.getElementById('font-family-select');
    if (select) {
        const opt = document.createElement('option');
        opt.value = `'${fontName}', sans-serif`;
        opt.innerText = `🌟 Shaxsiy: ${file.name.replace(/\.[^/.]+$/, "")}`;
        opt.selected = true;
        select.prepend(opt);
        window.updatePreviewFont(opt.value);
    }
    alert("🎉 Shaxsiy shrift muvaffaqiyatli yuklandi va qo'llandi!");
};

// 4. SHAXSIY FON YUKLASH
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

window.toggleParticlesEffect = function() {
    isParticlesActive = !isParticlesActive;
    const btn = document.getElementById('btn-particles');
    if (isParticlesActive) {
        btn.classList.add('border-brand-cyan', 'text-brand-cyan');
    } else {
        btn.classList.remove('border-brand-cyan', 'text-brand-cyan');
    }
};

// TEBRANMAYDIGAN VA DYNAMIC 2-3 QATORLI MATN CHIZISH
function drawSmartWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return y;
    const words = text.split(' ');
    let lines = [];
    let curLine = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = curLine + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(curLine);
            curLine = words[n] + ' ';
        } else {
            curLine = testLine;
        }
    }
    lines.push(curLine);

    lines.forEach((line, idx) => {
        ctx.fillText(line, Math.round(x), Math.round(y + (idx * lineHeight)));
    });

    return y + (lines.length * lineHeight);
}

// ==================== 1. 100% OVOZLI & AQLLI 60FPS VIDEO EKSPORT ====================
window.exportAndSendToBot = async function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin MP3 yuklang!");
        return;
    }

    const lyrics = window.lyricsData || [];
    if (lyrics.length === 0) {
        alert("⚠️ Qo'shiq matnini kiritib, sinxronlang!");
        return;
    }

    const stampedTimes = lyrics.map(l => l.time).filter(t => t !== null && t > 0);
    if (stampedTimes.length === 0) {
        alert("⚠️ Kamida bitta satr vaqtini 'Vaqtni Saqlash' orqali belgilang!");
        return;
    }

    const maxLyricTime = Math.max(...stampedTimes);
    const exactVideoDuration = maxLyricTime + 2.5;

    const btn = document.getElementById('btn-export-send');
    btn.innerHTML = `⏳ 60FPS Video yozilmoqda (${Math.ceil(exactVideoDuration)}s)...`;
    btn.disabled = true;

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch(audio.src);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = decodedBuffer;

        const audioDest = audioCtx.createMediaStreamDestination();
        bufferSource.connect(audioDest);
        bufferSource.connect(audioCtx.destination);

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const canvasStream = canvas.captureStream(60);

        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks()
        ]);

        let recorder;
        try {
            recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8000000 });
        } catch (e) {
            recorder = new MediaRecorder(combinedStream);
        }

        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            btn.innerHTML = "📤 Botingizga uzatilmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });

            fetch(`${RENDER_SERVER_URL}/upload_video`, {
                method: 'POST',
                body: blob
            }).then(res => {
                alert("🎉 60FPS Video botingiz chatiga yetkazildi! Telegramni oching.");
                btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
                btn.disabled = false;
            }).catch(err => {
                const videoUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = videoUrl;
                a.download = `VibeStudio_${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
                btn.disabled = false;
            });
        };

        recorder.start();
        bufferSource.start(0);
        const startTime = audioCtx.currentTime;

        const selectedFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";
        const selectedTextColor = window.activeLyricsColor || "#ffffff";

        const stars = [];
        for (let i = 0; i < 45; i++) {
            stars.push({ x: Math.random() * 1080, y: Math.random() * 1920, r: Math.random() * 3 + 1, s: Math.random() * 1.5 + 0.5 });
        }

        function renderFrame() {
            const elapsedTime = audioCtx.currentTime - startTime;

            if (elapsedTime >= exactVideoDuration) {
                if (recorder.state === "recording") {
                    recorder.stop();
                    bufferSource.stop();
                }
                return;
            }

            // 1. Fon
            ctx.fillStyle = "#09090d";
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Yulduzchalar
            if (isParticlesActive) {
                stars.forEach(p => {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.beginPath();
                    ctx.arc(Math.round(p.x), Math.round(p.y), p.r, 0, Math.PI * 2);
                    ctx.fill();
                    p.y -= p.s;
                    if (p.y < 0) { p.y = 1920; p.x = Math.random() * 1080; }
                });
            }

            // 3. Header
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 44px Montserrat, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(document.getElementById('preview-track-title').innerText, 90, 150);

            ctx.fillStyle = "#8696a0";
            ctx.font = "30px Montserrat, sans-serif";
            ctx.fillText(document.getElementById('preview-track-artist').innerText, 90, 200);

            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(90, 240);
            ctx.lineTo(990, 240);
            ctx.stroke();

            // 4. ANIQ VA MOSLASHUVCHAN MATNLAR (2-3 QATORGA BO'LINADI)
            let activeIdx = 0;
            for (let i = 0; i < lyrics.length; i++) {
                if (lyrics[i].time !== null && elapsedTime >= lyrics[i].time) {
                    activeIdx = i;
                }
            }

            const activeText = lyrics[activeIdx] ? lyrics[activeIdx].text : "";
            const nextText = lyrics[activeIdx + 1] ? lyrics[activeIdx + 1].text : "";

            const activeFontSize = activeText.length > 55 ? 46 : (activeText.length > 35 ? 50 : 56);
            const activeLineHeight = activeFontSize + 16;

            ctx.save();
            ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
            ctx.shadowBlur = 25;
            ctx.fillStyle = selectedTextColor;
            ctx.font = `900 ${activeFontSize}px ${selectedFont}`;
            ctx.textAlign = "left";
            
            const nextStartY = drawSmartWrappedText(ctx, activeText, 90, 800, 900, activeLineHeight);
            ctx.restore();

            if (nextText) {
                const nextFontSize = nextText.length > 55 ? 34 : 40;
                ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
                ctx.font = `bold ${nextFontSize}px ${selectedFont}`;
                ctx.textAlign = "left";
                drawSmartWrappedText(ctx, nextText, 90, nextStartY + 60, 900, nextFontSize + 14);
            }

            requestAnimationFrame(renderFrame);
        }

        renderFrame();

    } catch (err) {
        console.error(err);
        alert("⚠️ Video tayyorlashda xatolik bo'ldi. Qaytadan urinib ko'ring.");
        btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
        btn.disabled = false;
    }
};

// ==================== 2. INSHOT TOUCH TRIMMER ====================
let trimmerMedia = new Audio();
let rawTrimmerFile = null;
let trimmerAudioBuffer = null;
let isTrimPlaying = false;
let trimStartTime = 0;
let trimEndTime = 30;
let trimmerTotalDur = 100;

window.handleTrimmerUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    rawTrimmerFile = file;
    document.getElementById('trimmer-file-name').innerText = `🎵 ${file.name}`;
    trimmerMedia.src = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = function(e) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.decodeAudioData(e.target.result, function(buffer) {
