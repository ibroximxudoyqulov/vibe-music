// ==================== 1080x1920 60FPS GUARANTEED DELIVERY EXPORTER & TRIMMER ====================

let isVinylActive = false;
let isParticlesActive = true;
let customBgUrl = null;

// SIZNING BOT TOKENINGIZ:
const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";

// Particles
const particles = [];
for (let i = 0; i < 45; i++) {
    particles.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        radius: Math.random() * 3 + 1,
        speedY: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.7 + 0.3
    });
}

window.updatePreviewFont = function(fontFamily) {
    const lyricsLines = document.querySelectorAll('#spotify-lyrics-scroll p');
    lyricsLines.forEach(line => { line.style.fontFamily = fontFamily; });
};

window.handleCustomFontUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fontName = "CustomFont_" + Date.now();
    const fontUrl = URL.createObjectURL(file);
    const newStyle = document.createElement('style');
    newStyle.appendChild(document.createTextNode(`@font-face { font-family: '${fontName}'; src: url('${fontUrl}'); }`));
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
    alert("🎉 Shaxsiy shrift yuklandi va qo'llandi!");
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

window.toggleParticlesEffect = function() {
    isParticlesActive = !isParticlesActive;
    const btn = document.getElementById('btn-particles');
    if (isParticlesActive) {
        btn.classList.add('border-brand-cyan', 'text-brand-cyan');
    } else {
        btn.classList.remove('border-brand-cyan', 'text-brand-cyan');
    }
};

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = Math.round(y);

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, Math.round(x), currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, Math.round(x), currentY);
}

// ==================== 1. HAR BIR ODAMNING O'ZIGA 100% YETKAZUVCHI VIDEO EKSPORT ====================
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

    // FAQAT SHU ODAMNING SHAXSIY TELEGRAM ID RAQAMI
    let currentUserId = null;
    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            currentUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
    } catch (e) {
        currentUserId = null;
    }

    const btn = document.getElementById('btn-export-send');
    btn.innerHTML = `⏳ Video tayyorlanmoqda (${Math.ceil(exactVideoDuration)}s)...`;
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
            btn.innerHTML = "📤 Video saqlanmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(blob);

            // 1-YO'L: AGAR TELEGRAM BO'LSA O'SHA ODAMNING O'ZIGA YUBORISH
            if (currentUserId) {
                const formData = new FormData();
                formData.append('chat_id', currentUserId); // FAQAT SHU ODAMNING ID SI!
                formData.append('video', blob, `VibeStudio_${Date.now()}.mp4`);
                formData.append('caption', `🎬 <b>VibeStudio 60FPS Videongiz Tayyor!</b>\n🎵 Qo'shiq: ${document.getElementById('preview-track-title').innerText}\n⏱ Davomiyligi: ${Math.ceil(exactVideoDuration)} soniya\n\n👇 Saqlab olishingiz mumkin!`);
                formData.append('parse_mode', 'HTML');

                fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                    method: 'POST',
                    body: formData
                }).then(res => res.json()).then(data => {
                    if (data.ok) {
                        alert("🎉 Video shaxsiy botingizga yuborildi! Telegram chatini oching.");
                    } else {
                        triggerPhoneDownload(videoUrl);
                    }
                }).catch(err => {
                    triggerPhoneDownload(videoUrl);
                });
            } else {
                triggerPhoneDownload(videoUrl);
            }

            btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
            btn.disabled = false;
        };

        // 2-YO'L: TELEFON GALEREYASIGA TO'G'RIDAN-TO'G'RI SAQLASH
        function triggerPhoneDownload(url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `VibeStudio_Video_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert("✅ Video tayyor bo'ldi va telefoningizga yuklandi!");
        }

        recorder.start();
        bufferSource.start(0);
        const startTime = audioCtx.currentTime;

        const selectedFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";
        const selectedTextColor = window.activeLyricsColor || "#ffffff";

        function renderFrame() {
            const elapsedTime = audioCtx.currentTime - startTime;

            if (elapsedTime >= exactVideoDuration) {
                if (recorder.state === "recording") {
                    recorder.stop();
                    bufferSource.stop();
                }
                return;
            }

            // 1. Qorong'u Fon
            ctx.fillStyle = "#09090d";
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Yulduzchalar
            if (isParticlesActive) {
                particles.forEach(p => {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                    ctx.beginPath();
                    ctx.arc(Math.round(p.x), Math.round(p.y), p.radius, 0, Math.PI * 2);
                    ctx.fill();
                    p.y -= p.speedY;
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

            // 4. ANIQ KINETIK MATNLAR (FADE-OUT)
            let activeIdx = 0;
            for (let i = 0; i < lyrics.length; i++) {
                if (lyrics[i].time !== null && elapsedTime >= lyrics[i].time) {
                    activeIdx = i;
                }
            }

            lyrics.forEach((l, i) => {
                if (i === activeIdx) {
                    // FAOL SATR: ULKAN VA YORQIN
                    ctx.save();
                    ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
                    ctx.shadowBlur = 25;
                    ctx.fillStyle = selectedTextColor;
                    ctx.font = `900 58px ${selectedFont}`;
                    ctx.textAlign = "left";
                    drawWrappedText(ctx, l.text, 90, 820, 900, 72);
                    ctx.restore();
                } else if (i === activeIdx + 1) {
                    // KELAYOTGAN SATR: PASTDA XIRA
                    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
                    ctx.font = `bold 42px ${selectedFont}`;
                    ctx.textAlign = "left";
                    drawWrappedText(ctx, l.text, 90, 1080, 900, 56);
                }
            });

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
            trimmerAudioBuffer = buffer;
            trimmerTotalDur = buffer.duration;
            trimStartTime = 0;
            trimEndTime = Math.min(trimmerTotalDur, 30);
            document.getElementById('trimmer-controls').classList.remove('hidden');
            document.getElementById('trimmer-total-duration').innerText = formatAudioTime(trimmerTotalDur);
            updateInShotUI();
            setupInShotTouchEvents();
        });
    };
    reader.readAsArrayBuffer(file);
};

function updateInShotUI() {
    document.getElementById('trim-start-val').innerText = formatAudioTime(trimStartTime);
    document.getElementById('trim-end-val').innerText = formatAudioTime(trimEndTime);
    const track = document.getElementById('inshot-active-track');
    if (track && trimmerTotalDur > 0) {
        const leftPercent = (trimStartTime / trimmerTotalDur) * 100;
        const rightPercent = 100 - ((trimEndTime / trimmerTotalDur) * 100);
        track.style.left = `${leftPercent}%`;
        track.style.right = `${rightPercent}%`;
    }
}

function setupInShotTouchEvents() {
    const container = document.getElementById('inshot-waveform-container');
    const handleStart = document.getElementById('handle-start');
    const handleEnd = document.getElementById('handle-end');
    if (!container || !handleStart || !handleEnd) return;

    let draggingType = null;
    handleStart.ontouchstart = (e) => { e.stopPropagation(); draggingType = 'start'; };
    handleEnd.ontouchstart = (e) => { e.stopPropagation(); draggingType = 'end'; };

    container.ontouchmove = (e) => {
        if (!draggingType) return;
        const rect = container.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const percent = Math.max(0, Math.min(1, touchX / rect.width));
        const newTime = percent * trimmerTotalDur;

        if (draggingType === 'start') {
            trimStartTime = Math.min(newTime, trimEndTime - 0.5);
            if (trimmerMedia.src) {
                trimmerMedia.currentTime = trimStartTime;
                trimmerMedia.play();
                setTimeout(() => { trimmerMedia.pause(); }, 400);
            }
        } else if (draggingType === 'end') {
            trimEndTime = Math.max(newTime, trimStartTime + 0.5);
            if (trimmerMedia.src) {
                trimmerMedia.currentTime = trimEndTime;
                trimmerMedia.play();
                setTimeout(() => { trimmerMedia.pause(); }, 400);
            }
        }
        updateInShotUI();
    };

    window.ontouchend = () => { draggingType = null; };
}

function formatAudioTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${min}:${sec < 10 ? '0' : ''}${sec}.${ms}`;
}

window.previewTrimmedAudio = function() {
    const icon = document.getElementById('btn-trim-play-icon');
    if (isTrimPlaying) {
        trimmerMedia.pause();
        isTrimPlaying = false;
        icon.className = "fa-solid fa-play";
        return;
    }
    trimmerMedia.currentTime = trimStartTime;
    trimmerMedia.play();
    isTrimPlaying = true;
    icon.className = "fa-solid fa-pause";

    const checkInterval = setInterval(() => {
        if (trimmerMedia.currentTime >= trimEndTime || trimmerMedia.paused) {
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

    let userId = null;
    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            userId = window.Telegram.WebApp.initDataUnsafe.user.id;
        }
    } catch (e) {
        userId = null;
    }

    const btn = document.getElementById('btn-trim-send');
    btn.innerHTML = "⏳ Musiqa qirqilmoqda va MP3 tayyorlanmoqda...";
    btn.disabled = true;

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = trimmerAudioBuffer.sampleRate;
        const startOffset = Math.floor(trimStartTime * sampleRate);
        const endOffset = Math.floor(trimEndTime * sampleRate);
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

        if (userId) {
            btn.innerHTML = "📤 Botingizga yuborilmoqda...";
            const formData = new FormData();
            formData.append('chat_id', userId); // FAQAT SHU ODAMNING ID SI!
            formData.append('audio', wavBlob, `VibeStudio_Cut_${Date.now()}.mp3`);
            formData.append('caption', `✂️ <b>VibeStudio'da Qirqilgan Musiqangiz!</b>\n⏱ Oraliq: ${formatAudioTime(trimStartTime)} — ${formatAudioTime(trimEndTime)}\n\n👇 Saqlab olishingiz mumkin!`);
            formData.append('parse_mode', 'HTML');

            fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
                method: 'POST',
                body: formData
            }).then(res => res.json()).then(data => {
                if (data.ok) {
                    alert("🎉 Qirqilgan MP3 botingiz lichkasiga yetib bordi! Telegramni tekshiring.");
                } else {
                    downloadDirectly(wavBlob);
                }
            }).catch(err => {
                downloadDirectly(wavBlob);
            });
        } else {
            downloadDirectly(wavBlob);
        }
    } catch (e) {
        console.error(e);
        alert("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    }

    function downloadDirectly(blob) {
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `VibeStudio_Cut_${Date.now()}.mp3`;
        a.click();
        alert("✅ Qirqilgan MP3 telefoningizga yuklandi!");
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

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
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
