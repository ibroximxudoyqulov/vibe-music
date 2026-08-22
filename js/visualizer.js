// ==================== 1:1 CYBERHUD 3D BASS REACTOR ENGINE (1080x1920 60FPS) ====================

window.visAudioElement = new Audio();
let isVisPlaying = false;
let selectedVisPreset = 'cyber'; // 'cyber', 'headphones', 'flame'
let visCustomBgUrl = null;
let visCustomBgImgObj = null;

// SIZNING ASOSIY BOT TOKENINGIZ:
const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";

// 1. MP3 Faylni Yuklash
window.handleVisAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('vis-audio-name').innerText = `🎵 ${file.name}`;
    window.visAudioElement.src = URL.createObjectURL(file);

    window.visAudioElement.onloadedmetadata = () => {
        const slider = document.getElementById('vis-audio-seek-slider');
        if (slider) slider.max = window.visAudioElement.duration;
        updateVisTimeUI(0, window.visAudioElement.duration);
    };

    document.getElementById('vis-player-box').classList.remove('hidden');
    document.getElementById('vis-player-box').classList.add('flex');
};

window.toggleVisAudioPlay = function() {
    const audio = window.visAudioElement;
    if (!audio.src) {
        alert("⚠️ Iltimos, oldin MP3 fayl tanlang!");
        return;
    }
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

window.onVisAudioSeek = function(val) {
    const audio = window.visAudioElement;
    if (audio && audio.src) {
        audio.currentTime = parseFloat(val);
        updateVisTimeUI(audio.currentTime, audio.duration || 0);
    }
};

function updateVisTimeUI(cur, dur) {
    const curMin = Math.floor(cur / 60), curSec = Math.floor(cur % 60);
    const durMin = Math.floor(dur / 60), durSec = Math.floor(dur % 60);
    const el = document.getElementById('vis-audio-time');
    if (el) el.innerText = `${curMin}:${curSec < 10 ? '0' : ''}${curSec} / ${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
}

window.visAudioElement.ontimeupdate = function() {
    const audio = window.visAudioElement;
    const slider = document.getElementById('vis-audio-seek-slider');
    if (slider) slider.value = audio.currentTime;
    updateVisTimeUI(audio.currentTime, audio.duration || 0);
};

window.selectVisPreset = function(preset) {
    selectedVisPreset = preset;
    document.querySelectorAll('.vis-preset-btn').forEach(btn => {
        btn.classList.remove('border-brand-cyan', 'bg-brand-cyan/20', 'scale-105');
    });
    const activeBtn = document.getElementById(`vis-btn-${preset}`);
    if (activeBtn) activeBtn.classList.add('border-brand-cyan', 'bg-brand-cyan/20', 'scale-105');
};

window.handleVisBgUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    visCustomBgUrl = URL.createObjectURL(file);
    const imgObj = new Image();
    imgObj.src = visCustomBgUrl;
    visCustomBgImgObj = imgObj;
    document.getElementById('vis-bg-name').innerText = `🖼 ${file.name}`;
};

// ==================== 60FPS ULTRA-HD CYBER REACTOR VIDEO EKSPORT ====================
window.exportVisVideoAndSend = async function() {
    const audio = window.visAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin MP3 yuklang!");
        return;
    }

    const duration = audio.duration && !isNaN(audio.duration) ? audio.duration : 30;
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    const btn = document.getElementById('btn-vis-export');
    btn.innerHTML = `⏳ 60FPS CyberHUD Video yozilmoqda (${Math.ceil(duration)}s)...`;
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
            recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 12000000 });
        } catch (e) {
            recorder = new MediaRecorder(combinedStream);
        }

        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            btn.innerHTML = "📤 Video botingizga yuborilmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });

            const formData = new FormData();
            formData.append('chat_id', userId);
            formData.append('video', blob, `CyberHUD_Visualizer_${Date.now()}.mp4`);
            formData.append('caption', `⚡️ <b>VibeStudio 60FPS CyberHUD Basli Videongiz Tayyor!</b>\n⏱ Davomiyligi: ${Math.ceil(duration)} soniya\n\n👇 Saqlab olishingiz mumkin!`);
            formData.append('parse_mode', 'HTML');

            try {
                const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.ok) {
                    alert("🎉 CyberHUD video botingiz lichkasiga yetib bordi! Telegramni oching.");
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CyberHUD_Visualizer_${Date.now()}.mp4`;
                    a.click();
                    alert("✅ Video telefoningizga yuklandi!");
                }
            } catch (err) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `CyberHUD_Visualizer_${Date.now()}.mp4`;
                a.click();
                alert("✅ Video tayyorlandi!");
            }

            btn.innerHTML = "🎬 60FPS Basli Videoni Botga Yuborish";
            btn.disabled = false;
        };

        recorder.start();
        bufferSource.start(0);
        const startTime = audioCtx.currentTime;

        // Kosmik Zarrachalar (Particles)
        const stars = [];
        for (let i = 0; i < 70; i++) {
            stars.push({
                x: Math.random() * 1080,
                y: Math.random() * 1920,
                r: Math.random() * 3 + 1,
                s: Math.random() * 2 + 0.8,
                color: (i % 2 === 0) ? "rgba(0, 242, 254, 0.7)" : "rgba(255, 42, 95, 0.7)"
            });
        }

        function renderCyberReactor() {
            const elapsed = audioCtx.currentTime - startTime;
            if (elapsed >= duration) {
                if (recorder.state === "recording") {
                    recorder.stop();
                    bufferSource.stop();
                }
                return;
            }

            // 1. Dinamik Bas Tebranishlari (Frequency Sim)
            const bassKick = Math.abs(Math.sin(elapsed * 7)) * 55;
            const subBass = Math.abs(Math.sin(elapsed * 14)) * 40;
            const beatShake = (bassKick > 45) ? (Math.random() * 6 - 3) : 0;

            const centerX = 540 + beatShake;
            const centerY = 960 + beatShake;

            // 2. Qorong'u Kosmik Fon
            if (visCustomBgImgObj) {
                ctx.drawImage(visCustomBgImgObj, 0, 0, 1080, 1920);
                ctx.fillStyle = "rgba(11, 14, 26, 0.65)";
                ctx.fillRect(0, 0, 1080, 1920);
            } else {
                const bgGrad = ctx.createRadialGradient(centerX, centerY, 100, centerX, centerY, 900);
                bgGrad.addColorStop(0, "#15102a");
                bgGrad.addColorStop(0.6, "#090912");
                bgGrad.addColorStop(1, "#030305");
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, 1080, 1920);
            }

            // 3. Uchuvchi Yulduzchalar va Zarrachalar
            stars.forEach(s => {
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
                s.y -= s.s + (bassKick * 0.05);
                if (s.y < 0) s.y = 1920;
            });

            // 4. SHOCKWAVE (Kengayuvchi Neon Zarba To'lqini)
            if (bassKick > 35) {
                const shockRadius = 240 + (bassKick * 4.5);
                ctx.save();
                ctx.strokeStyle = `rgba(0, 242, 254, ${(60 - bassKick) / 60})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(centerX, centerY, shockRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            // 5. HUD TEXNO-HALQALARI (Qarama-qarshi Aylanuvchi Doiralar)
            ctx.save();
            ctx.translate(centerX, centerY);

            // 1-Halqa (Soat yo'nalishida aylanadi)
            ctx.rotate(elapsed * 1.5);
            ctx.strokeStyle = "rgba(0, 242, 254, 0.4)";
            ctx.lineWidth = 3;
            ctx.setLineDash([18, 12, 6, 12]);
            ctx.beginPath();
            ctx.arc(0, 0, 220 + bassKick * 0.4, 0, Math.PI * 2);
            ctx.stroke();

            // 2-Halqa (Teskari aylanadi)
            ctx.rotate(-elapsed * 3);
            ctx.strokeStyle = "rgba(255, 42, 95, 0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([30, 20]);
            ctx.beginPath();
            ctx.arc(0, 0, 250 + bassKick * 0.6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // 6. RADIAL NEON EKVALAYZER USTUNLARI (Doira Atrofida)
            ctx.save();
            ctx.translate(centerX, centerY);
            const barsCount = 64;
            for (let i = 0; i < barsCount; i++) {
                const angle = (i / barsCount) * Math.PI * 2;
                const freqHeight = Math.abs(Math.sin(elapsed * 8 + i * 0.4)) * (85 + bassKick);
                const rInner = 180 + bassKick * 0.3;
                const rOuter = rInner + freqHeight;

                const x1 = Math.cos(angle) * rInner;
                const y1 = Math.sin(angle) * rInner;
                const x2 = Math.cos(angle) * rOuter;
                const y2 = Math.sin(angle) * rOuter;

                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, "#00f2fe");
                grad.addColorStop(1, "#ff2a5f");

                ctx.strokeStyle = grad;
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            ctx.restore();

            // 7. MARKAZIY GOLOGRAMMA GLIF / NOTA (Neon Porlash Bilan)
            ctx.save();
            ctx.shadowColor = (bassKick > 40) ? "#ff2a5f" : "#00f2fe";
            ctx.shadowBlur = 45;

            // Markaziy Katta Porlovchi Nota
            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${100 + bassKick * 0.5}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🎵", centerX, centerY);

            ctx.restore();

            // 8. PASTKI OYNA SIMMETRIYALI GORIZONTAL BAS TO'LQINI
            ctx.save();
            const bottomY = 1600;
            for (let i = -24; i <= 24; i++) {
                const h = Math.abs(Math.sin(elapsed * 9 + i * 0.25)) * (80 + subBass);
                const x = centerX + (i * 20);
                
                const barGrad = ctx.createLinearGradient(x, bottomY - h, x, bottomY + h);
                barGrad.addColorStop(0, "#ff2a5f");
                barGrad.addColorStop(0.5, "#00f2fe");
                barGrad.addColorStop(1, "#ff2a5f");

                ctx.fillStyle = barGrad;
                ctx.fillRect(x, bottomY - h, 14, h * 2);
            }
            ctx.restore();

            requestAnimationFrame(renderCyberReactor);
        }

        renderCyberReactor();

    } catch (e) {
        console.error(e);
        alert("⚠️ Video tayyorlashda xatolik bo'ldi. Qaytadan urinib ko'ring.");
        btn.innerHTML = "🎬 60FPS Basli Videoni Botga Yuborish";
        btn.disabled = false;
    }
};
