// ==================== HAR BIR ODAMNING O'Z LICHKASIGA YUBORISH ====================
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

    // FAQAT VIDEO YASAYOTGAN HAQIQIY ODAMNING O'ZINI ANIQLASH (ADMIN EMAS!)
    let currentUserId = null;
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            if (window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
                currentUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
            }
        }
    } catch (e) {
        currentUserId = null;
    }

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
            recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 12000000 });
        } catch (e) {
            recorder = new MediaRecorder(combinedStream);
        }

        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            btn.innerHTML = "📤 Video botingizga yuborilmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });

            // AGAR FOYDALANUVCHI TELEGRAMDA BO'LSA -> FAQAT O'SHA ODAMNING O'ZIGA BORADI!
            if (currentUserId) {
                const formData = new FormData();
                formData.append('chat_id', currentUserId); // AYQAN O'SHA YASAGAN ODAMNING CHAT ID SI!
                formData.append('video', blob, `VibeStudio_Video_${Date.now()}.mp4`);
                formData.append('caption', `🎬 <b>VibeStudio 60FPS Videongiz Tayyor!</b>\n🎵 Qo'shiq: ${document.getElementById('preview-track-title').innerText}\n⏱ Davomiyligi: ${Math.ceil(exactVideoDuration)} soniya\n\n👇 Videoni ustiga bosib 'Galereyaga saqlash' qilishingiz mumkin!`);
                formData.append('parse_mode', 'HTML');

                try {
                    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    if (data.ok) {
                        alert("🎉 Video shaxsiy botingizga yuborildi! Telegram chatini oching.");
                    } else {
                        downloadDirectly(blob);
                    }
                } catch (err) {
                    downloadDirectly(blob);
                }
            } else {
                // Agar ID topilmasa to'g'ridan-to'g'ri telefoniga yuklab beradi (Sizga bormaydi!)
                downloadDirectly(blob);
            }

            btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
            btn.disabled = false;
        };

        function downloadDirectly(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `VibeStudio_Video_${Date.now()}.mp4`;
            a.click();
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

            // 1. Fon
            ctx.fillStyle = "#09090d";
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. Yulduzchalar
            if (isParticlesActive) {
                particles.forEach(p => {
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
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
                    ctx.save();
                    ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = selectedTextColor;
                    ctx.font = `900 58px ${selectedFont}`;
                    ctx.textAlign = "left";
                    drawWrappedText(ctx, l.text, 90, 850, 900, 72);
                    ctx.restore();
                } else if (i === activeIdx + 1) {
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
        alert("⚠️ Xatolik yuz berdi. Qaytadan urinib ko'ring.");
        btn.innerHTML = "🎬 60FPS Ovozli Videoni Botga Yuborish";
        btn.disabled = false;
    }
};
