// ==================== 1080x1920 60FPS EXPORTER & INSHOT TRIMMER ====================

let isVinylActive = false;
let isSpectrumActive = false;
let customBgUrl = null;

// TEST BOT TOKENINGIZ:
const BOT_TOKEN = "8996809088:AAHpjXuUsA2LkLW0szvg4AZb8Fa0scv1p2M";

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

// ==================== OXIRGI MATN TUGAGAN JOYDA KESUVCHI 60FPS VIDEO EKSPORT ====================
window.exportAndSendToBot = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin MP3 yuklang!");
        return;
    }
    if (typeof lyricsData === 'undefined' || lyricsData.length === 0) {
        alert("⚠️ Qo'shiq matnini kiritib, sinxronlang!");
        return;
    }

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    // OXIRGI MATN VAQTINI TOPISH VA SHU JOYDA VIDEONI KESISH!
    let lastLyricTime = 0;
    lyricsData.forEach(l => {
        if (l.time !== null && l.time > lastLyricTime) lastLyricTime = l.time;
    });

    // Agar matn 20-soniyada tugasa, video 22.5 soniya bo'ladi (157s bo'lib ketmaydi!)
    const totalVideoDuration = lastLyricTime > 0 ? (lastLyricTime + 2.5) : (audio.duration || 30);

    const btn = document.getElementById('btn-export-send');
    btn.innerHTML = `⏳ 60FPS Video yozilmoqda (${Math.ceil(totalVideoDuration)}s)...`;
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
    recorder.onstop = async () => {
        btn.innerHTML = "📤 Video botingiz lichkasiga yuborilmoqda...";
        const blob = new Blob(chunks, { type: 'video/mp4' });

        const formData = new FormData();
        formData.append('chat_id', userId);
        formData.append('video', blob, `Spotify_Lyric_${Date.now()}.mp4`);
        formData.append('caption', `🎬 <b>VibeStudio Spotify Videongiz Tayyor!</b>\n\nQo'shiq: ${document.getElementById('preview-track-title').innerText}\nIjrochi: ${document.getElementById('preview-track-artist').innerText}\n\n👇 Videoni ustiga bosib 'Galereyaga saqlash' qilishingiz mumkin!`);
        formData.append('parse_mode', 'HTML');

        try {
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.ok) {
                alert("🎉 Video botingizning shaxsiy lichkasiga yuborildi! Telegramni oching.");
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Spotify_Lyric_${Date.now()}.mp4`;
                a.click();
                alert("✅ Video tayyor bo'ldi va telefoningizga yuklandi!");
            }
        } catch (err) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Spotify_Lyric_${Date.now()}.mp4`;
            a.click();
            alert("✅ Video tayyorlandi va yuklandi!");
        }

        btn.innerHTML = "🎬 Videoni Tayyorlash & Bot Lichkasiga Yuborish";
        btn.disabled = false;
        audio.pause();
        audio.currentTime = 0;
    };

    recorder.start();
    audio.currentTime = 0;
    audio.play();

    const selectedFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";

    function renderLoop() {
        // OXIRGI MATN TUGASHI BILAN VIDEONI YOPISH
        if (audio.currentTime >= totalVideoDuration || audio.ended) {
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

// ==================== TRIMMER BOSHQARUVI (KO'K VA QIZIL MUSTAQIL ISHLAYDI) ====================
let trimmerMedia = new Audio();
let rawTrimmerFile = null;
let trimmerAudioBuffer = null;
let isTrimPlaying = false;

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
            trimmerAudioBuffer = buffer;
            const dur = buffer.duration;
            document.getElementById('trimmer-controls').classList.remove('hidden');
            document.getElementById('trimmer-total-duration').innerText = formatAudioTime(dur);
            
            const startRange = document.getElementById('trim-start-range');
            const endRange = document.getElementById('trim-end-range');
            startRange.max = dur;
            endRange.max = dur;
            startRange.value = 0;
            endRange.value = Math.min(dur, 30);
            updateTrimUI();
        });
    };
    reader.readAsArrayBuffer(file);
};

window.onTrimHandleChange = function(type) {
    const startRange = document.getElementById('trim-start-range');
    const endRange = document.getElementById('trim-end-range');

    let start = parseFloat(startRange.value);
    let end = parseFloat(endRange.value);

    // Ko'k qizildan o'tib ketmasligi uchun
    if (start >= end - 0.5) {
        if (type === 'start') startRange.value = end - 0.5;
        else endRange.value = start + 0.5;
    }

    updateTrimUI();

    // Barmoq qayerga surilsa o'sha joyini eshittirish
    if (trimmerMedia.src) {
        trimmerMedia.currentTime = (type === 'start') ? parseFloat(startRange.value) : parseFloat(endRange.value);
        trimmerMedia.play();
        setTimeout(() => { trimmerMedia.pause(); }, 1000);
    }
};

function updateTrimUI() {
    const start = parseFloat(document.getElementById('trim-start-range').value);
    const end = parseFloat(document.getElementById('trim-end-range').value);

    document.getElementById('trim-start-val').innerText = formatAudioTime(start);
    document.getElementById('trim-end-val').innerText = formatAudioTime(end);
}

function formatAudioTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${min}:${sec < 10 ? '0' : ''}${sec}.${ms}`;
}

window.previewTrimmedAudio = function() {
    const start = parseFloat(document.getElementById('trim-start-range').value);
    const end = parseFloat(document.getElementById('trim-end-range').value);
    const icon = document.getElementById('btn-trim-play-icon');

    if (isTrimPlaying) {
        trimmerMedia.pause();
        isTrimPlaying = false;
        icon.className = "fa-solid fa-play";
        return;
    }

    trimmerMedia.currentTime = start;
    trimmerMedia.play();
    isTrimPlaying = true;
    icon.className = "fa-solid fa-pause";

    const checkInterval = setInterval(() => {
        if (trimmerMedia.currentTime >= end || trimmerMedia.paused) {
            trimmerMedia.pause();
            isTrimPlaying = false;
            icon.className = "fa-solid fa-play";
            clearInterval(checkInterval);
        }
    }, 100);
};

window.executeRealAudioTrimAndSend = async function() {
    if (!trimmerAudioBuffer) {
        alert("⚠️ Iltimos, oldin musiqa yuklang!");
        return;
    }

    const start = parseFloat(document.getElementById('trim-start-range').value);
    const end = parseFloat(document.getElementById('trim-end-range').value);
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    const btn = document.getElementById('btn-trim-send');
    btn.innerHTML = "⏳ Musiqa qirqilmoqda va MP3 tayyorlanmoqda...";
    btn.disabled = true;

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = trimmerAudioBuffer.sampleRate;
        const startOffset = Math.floor(start * sampleRate);
        const endOffset = Math.floor(end * sampleRate);
        const frameCount = endOffset - startOffset;

        const slicedBuffer = audioCtx.createBuffer(
            trimmerAudioBuffer.numberOfChannels,
            frameCount,
            sampleRate
        );

        for (let channel = 0; channel < trimmerAudioBuffer.numberOfChannels; channel++) {
            const channelData = trimmerAudioBuffer.getChannelData(channel).subarray(startOffset, endOffset);
            slicedBuffer.copyToChannel(channelData, channel, 0);
        }

        const wavBlob = bufferToWave(slicedBuffer, frameCount);

        btn.innerHTML = "📤 Bot lichkasiga yuborilmoqda...";

        const formData = new FormData();
        formData.append('chat_id', userId);
        formData.append('audio', wavBlob, `VibeStudio_Cut_${Date.now()}.mp3`);
        formData.append('caption', `✂️ <b>VibeStudio'da Qirqilgan Musiqangiz!</b>\n⏱ Oraliq: ${formatAudioTime(start)} — ${formatAudioTime(end)}\n\n👇 Saqlab olishingiz mumkin!`);
        formData.append('parse_mode', 'HTML');

        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.ok) {
            alert("🎉 Qirqilgan MP3 botingiz lichkasiga yuborildi! Telegramni tekshiring.");
        } else {
            const downloadUrl = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `VibeStudio_Cut_${Date.now()}.mp3`;
            a.click();
            alert("✅ Qirqilgan MP3 telefoningizga yuklandi!");
        }
    } catch (e) {
        console.error(e);
        alert("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }

    btn.innerHTML = "✂️ Qirqish & Bot Lichkasiga MP3 Qilib Olish";
    btn.disabled = false;
};

function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        out = new DataView(new ArrayBuffer(length)),
        channels = [], i, sample, offset = 0, pos = 0;

    function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            out.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([out], { type: "audio/mp3" });
    }
