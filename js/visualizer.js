// ==================== REAL-TIME AUDIO-REACTIVE 60FPS VISUALIZER ====================

window.visAudioElement = new Audio();
let isVisPlaying = false;
let currentVisTheme = 'galaxy'; // 'galaxy', 'headphones', 'fire', 'wings'
const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";

window.handleVisAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('vis-audio-name').innerText = `🎵 ${file.name}`;
    window.visAudioElement.src = URL.createObjectURL(file);

    window.visAudioElement.onloadedmetadata = () => {
        document.getElementById('vis-controls-box').classList.remove('hidden');
        document.getElementById('vis-controls-box').classList.add('flex');
    };
};

window.toggleVisPlay = function() {
    const audio = window.visAudioElement;
    if (!audio.src) return;

    const icon = document.getElementById('btn-vis-play-icon');
    if (isVisPlaying) {
        audio.pause();
        isVisPlaying = false;
        if (icon) icon.className = "fa-solid fa-play";
    } else {
        audio.play();
        isVisPlaying = true;
        if (icon) icon.className = "fa-solid fa-pause";
    }
};

window.setVisTheme = function(theme) {
    currentVisTheme = theme;
    document.querySelectorAll('.vis-theme-btn').forEach(btn => btn.classList.remove('border-brand-cyan', 'text-brand-cyan'));
    const activeBtn = document.getElementById(`vis-btn-${theme}`);
    if (activeBtn) activeBtn.classList.add('border-brand-cyan', 'text-brand-cyan');
};

// 60FPS OVOZGA QARAB TEBRANUVCHI VIDEO EKSPORT
window.exportVisualizerVideo = async function() {
    const audio = window.visAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Iltimos, oldin musiqa yuklang!");
        return;
    }

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    const duration = audio.duration || 30;
    const btn = document.getElementById('btn-vis-export');
    btn.innerHTML = `⏳ 60FPS Audio Vizualizator yozilmoqda (${Math.ceil(duration)}s)...`;
    btn.disabled = true;

    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch(audio.src);
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = decodedBuffer;

        // REAL-TIME AUDIO ANALYSER (BAS VA ZARBNI O'LCHASH)
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const audioDest = audioCtx.createMediaStreamDestination();
        bufferSource.connect(analyser);
        analyser.connect(audioDest);
        analyser.connect(audioCtx.destination);

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        const canvasStream = canvas.captureStream(60);

        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioDest.stream.getAudioTracks()
        ]);

        let recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 12000000 });
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            btn.innerHTML = "📤 Video botingizga yuborilmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });

            const formData = new FormData();
            formData.append('chat_id', userId);
            formData.append('video', blob, `Visualizer_${Date.now()}.mp4`);
            formData.append('caption', `⚡️ <b>VibeStudio 60FPS Audio Vizualizator Videongiz Tayyor!</b>\n⏱ Davomiyligi: ${Math.ceil(duration)} soniya\n\n👇 Saqlab olishingiz mumkin!`);
            formData.append('parse_mode', 'HTML');

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, { method: 'POST', body: formData });
            alert("🎉 Audio Vizualizator video botingiz lichkasiga yetib bordi!");
            btn.innerHTML = "🎬 60FPS Vizualizator Videoni Botga Yuborish";
            btn.disabled = false;
        };

        recorder.start();
        bufferSource.start(0);
        const startTime = audioCtx.currentTime;

        function drawVisualizerFrame() {
            const elapsed = audioCtx.currentTime - startTime;
            if (elapsed >= duration) {
                if (recorder.state === "recording") {
                    recorder.stop();
                    bufferSource.stop();
                }
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            // BAS KUCHINI HISOBLASH
            let bassSum = 0;
            for (let i = 0; i < 10; i++) bassSum += dataArray[i];
            const bassLevel = (bassSum / 10) / 255; // 0.0 dan 1.0 gacha
            const scale = 1.0 + (bassLevel * 0.35); // Zarbga qarab kattalashish

            // 1. Qorong'u Fon
            ctx.fillStyle = "#09090d";
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Tanlangan Temaga Qarab Chizish
            const centerX = 540;
            const centerY = 960;

            if (currentVisTheme === 'galaxy' || currentVisTheme === 'fire') {
                // AYLANMA EKVALAYZER NURLARI
                const radius = 220 * scale;
                const bars = 64;
                for (let i = 0; i < bars; i++) {
                    const angle = (i / bars) * Math.PI * 2;
                    const val = dataArray[i % dataArray.length] / 255;
                    const barLen = val * 180 * scale;

                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    const x2 = centerX + Math.cos(angle) * (radius + barLen);
                    const y2 = centerY + Math.sin(angle) * (radius + barLen);

                    ctx.strokeStyle = currentVisTheme === 'galaxy' ? `hsl(${260 + i * 2}, 100%, 65%)` : `hsl(${10 + i * 2}, 100%, 55%)`;
                    ctx.lineWidth = 6;
                    ctx.shadowColor = ctx.strokeStyle;
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // MARKAZDAGI NOTA
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(scale, scale);
                ctx.fillStyle = currentVisTheme === 'galaxy' ? "#00f2fe" : "#ff2a5f";
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 30;
                ctx.font = "bold 140px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🎵", 0, 0);
                ctx.restore();

            } else if (currentVisTheme === 'headphones' || currentVisTheme === 'wings') {
                // TO'LQINLI CHIZIQLI EKVALAYZER
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(scale, scale);
                ctx.fillStyle = "#ffffff";
                ctx.font = "160px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🎧", 0, -50);
                ctx.restore();

                // Pastdagi to'lqinlar
                ctx.lineWidth = 6;
                ctx.strokeStyle = "#00f2fe";
                ctx.shadowColor = "#00f2fe";
                ctx.shadowBlur = 20;
                ctx.beginPath();
                for (let x = 0; x < 1080; x += 15) {
                    const idx = Math.floor((x / 1080) * dataArray.length);
                    const h = (dataArray[idx] / 255) * 140 * (bassLevel + 0.3);
                    const y = 1300 + Math.sin(x * 0.05 + elapsed * 5) * 20 - h;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            requestAnimationFrame(drawVisualizerFrame);
        }

        drawVisualizerFrame();

    } catch (e) {
        console.error(e);
        alert("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
        btn.disabled = false;
    }
};
