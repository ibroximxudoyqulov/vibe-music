// ==================== 1:1 EXACT WHATSAPP 60FPS CHAT ENGINE ====================

window.waAudioElement = new Audio();
let isWaPlaying = false;
let isWaUserSeeking = false;

window.waLyricsData = [];
window.waContactName = "Jonim 🖤";
window.waStatus = "online";
window.waPartnerAvatarUrl = null;
window.waPartnerAvatarImgObj = null;
window.waMyAvatarUrl = null;
let waActiveIndex = -1;

// SIZNING BOT TOKENINGIZ:
const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";

// 1. MP3 Yuklash
window.handleWaAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('wa-audio-file-name').innerText = `🎵 ${file.name}`;
    window.waAudioElement.src = URL.createObjectURL(file);

    window.waAudioElement.onloadedmetadata = () => {
        const slider = document.getElementById('wa-audio-seek-slider');
        if (slider) {
            slider.max = window.waAudioElement.duration;
            slider.value = 0;
        }
        updateWaTimeUI(0, window.waAudioElement.duration);
    };

    document.getElementById('wa-audio-player-box').classList.remove('hidden');
    document.getElementById('wa-audio-player-box').classList.add('flex');
};

// Play / Pause
window.toggleWaAudioPlay = function() {
    const audio = window.waAudioElement;
    if (!audio.src) {
        alert("⚠️ Iltimos, oldin WhatsApp uchun MP3 fayl tanlang!");
        return;
    }

    const icon = document.getElementById('btn-wa-audio-icon');
    if (isWaPlaying) {
        audio.pause();
        isWaPlaying = false;
        if (icon) icon.className = "fa-solid fa-play";
    } else {
        audio.play();
        isPlaying = true;
        if (icon) icon.className = "fa-solid fa-pause";
    }
};

window.onWaAudioSeek = function(val) {
    const audio = window.waAudioElement;
    if (audio && audio.src) {
        const seekTime = parseFloat(val);
        audio.currentTime = seekTime;
        updateWaTimeUI(seekTime, audio.duration || 0);
        if (window.updateLiveWaChatDisplay) {
            window.updateLiveWaChatDisplay(seekTime);
        }
    }
};

function updateWaTimeUI(cur, dur) {
    const curMin = Math.floor(cur / 60), curSec = Math.floor(cur % 60);
    const durMin = Math.floor(dur / 60), durSec = Math.floor(dur % 60);
    const timeDisplay = document.getElementById('wa-audio-current-time');
    if (timeDisplay) {
        timeDisplay.innerText = `${curMin}:${curSec < 10 ? '0' : ''}${curSec} / ${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
    }
}

window.waAudioElement.ontimeupdate = function() {
    const audio = window.waAudioElement;
    const cur = audio.currentTime;
    const dur = audio.duration || 0;

    const slider = document.getElementById('wa-audio-seek-slider');
    if (slider && !isWaUserSeeking) {
        slider.value = cur;
    }
    updateWaTimeUI(cur, dur);

    if (window.updateLiveWaChatDisplay) {
        window.updateLiveWaChatDisplay(cur);
    }
};

// 2. Avatarlarni yuklash
window.handleWaPartnerAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.waPartnerAvatarUrl = URL.createObjectURL(file);
    
    // Videoga chizish uchun Image ob'yekti
    const imgObj = new Image();
    imgObj.src = window.waPartnerAvatarUrl;
    window.waPartnerAvatarImgObj = imgObj;

    const img1 = document.getElementById('wa-partner-avatar-img');
    const imgHeader = document.getElementById('wa-header-avatar');
    
    if (img1) {
        img1.src = window.waPartnerAvatarUrl;
        img1.classList.remove('hidden');
        document.getElementById('wa-partner-placeholder').classList.add('hidden');
    }
    if (imgHeader) {
        imgHeader.src = window.waPartnerAvatarUrl;
        imgHeader.classList.remove('hidden');
        document.getElementById('wa-header-placeholder').classList.add('hidden');
    }
};

window.handleWaMyAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    window.waMyAvatarUrl = URL.createObjectURL(file);
    const img = document.getElementById('wa-my-avatar-img');
    if (img) {
        img.src = window.waMyAvatarUrl;
        img.classList.remove('hidden');
        document.getElementById('wa-my-placeholder').classList.add('hidden');
    }
};

window.updateWaContactInfo = function() {
    window.waContactName = document.getElementById('wa-contact-name-input').value || 'Jonim 🖤';
    window.waStatus = document.getElementById('wa-contact-status-input').value || 'online';
    document.getElementById('wa-preview-name').innerText = window.waContactName;
    document.getElementById('wa-preview-status').innerText = window.waStatus;
};

// 3. Matnni tayyorlash va 1-Tugmali Kim aytishini belgilash
window.parseWaLyricsForSync = function() {
    const raw = document.getElementById('raw-wa-lyrics-input').value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, dialog matnini kiriting!");
        return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    window.waLyricsData = lines.map((line, idx) => ({
        time: null,
        text: line,
        sender: (idx % 2 === 0) ? 'partner' : 'me'
    }));

    const container = document.getElementById('wa-sync-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    document.getElementById('btn-wa-stamp-line').classList.remove('hidden');

    renderWaSyncRows();
    waActiveIndex = 0;
    highlightNextWaSyncLine();
    alert("✅ Dialog tayyor! Kim aytishini o'zgartirish uchun [👤 Men] yoki [👥 U] tugmasini bosing.");
};

function renderWaSyncRows() {
    const container = document.getElementById('wa-sync-container');
    container.innerHTML = '';

    window.waLyricsData.forEach((item, index) => {
        const div = document.createElement('div');
        div.id = `wa-sync-line-${index}`;
        div.className = "p-2.5 bg-brand-input rounded-xl border border-gray-800 flex justify-between items-center text-xs space-x-2";
        
        const isMe = item.sender === 'me';
        div.innerHTML = `
            <button onclick="toggleWaSender(${index})" class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${isMe ? 'bg-cyan-600 text-white' : 'bg-emerald-600 text-white'}">
                ${isMe ? '👤 Men' : '👥 U'}
            </button>
            <span class="text-gray-300 flex-1 truncate">${index + 1}. ${item.text}</span>
            <span id="wa-time-badge-${index}" class="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg">--:--</span>
        `;
        container.appendChild(div);
    });
}

window.toggleWaSender = function(index) {
    if (window.waLyricsData[index]) {
        window.waLyricsData[index].sender = (window.waLyricsData[index].sender === 'me') ? 'partner' : 'me';
        renderWaSyncRows();
        highlightNextWaSyncLine();
    }
};

function highlightNextWaSyncLine() {
    document.querySelectorAll('#wa-sync-container > div').forEach(d => d.classList.remove('border-emerald-500', 'bg-emerald-500/10'));
    const activeDiv = document.getElementById(`wa-sync-line-${waActiveIndex}`);
    const container = document.getElementById('wa-sync-container');
    if (activeDiv && container) {
        activeDiv.classList.add('border-emerald-500', 'bg-emerald-500/10');
        container.scrollTop = activeDiv.offsetTop - container.offsetTop - 30;
    }
}

// 4. Vaqtni saqlash
window.timestampWaCurrentLine = function() {
    const audio = window.waAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Iltimos, oldin 1-qadamda WhatsApp uchun MP3 yuklang!");
        return;
    }
    if (waActiveIndex >= window.waLyricsData.length) return;

    const currentTime = audio.currentTime;
    window.waLyricsData[waActiveIndex].time = currentTime;

    const min = Math.floor(currentTime / 60), sec = Math.floor(currentTime % 60);
    const badge = document.getElementById(`wa-time-badge-${waActiveIndex}`);
    if (badge) {
        badge.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-emerald-500 text-black font-bold rounded-lg";
    }

    waActiveIndex++;
    if (waActiveIndex < window.waLyricsData.length) {
        highlightNextWaSyncLine();
    } else {
        document.getElementById('btn-wa-stamp-line').classList.add('hidden');
        alert("🎉 Barcha dialoglar sinxronlandi! Endi pastga tushib videoni tayyorlang.");
    }
};

// 5. Jonli Preview (Animatsiyali 3 ta Nuqta Bilan)
window.updateLiveWaChatDisplay = function(currentTime) {
    if (!window.waLyricsData || window.waLyricsData.length === 0) return;

    const chatBox = document.getElementById('wa-live-messages-box');
    if (!chatBox) return;

    let html = '';
    let nextMsg = null;

    window.waLyricsData.forEach((msg, idx) => {
        if (msg.time !== null && currentTime >= msg.time) {
            const isMe = msg.sender === 'me';
            const timeFormatted = formatMessageClock(msg.time);

            if (isMe) {
                html += `
                    <div class="flex justify-end items-end space-x-1.5 my-2 animate-fade-in">
                        <div class="bg-[#005c4b] text-white text-xs p-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-md flex items-end space-x-2">
                            <span class="leading-relaxed font-medium break-words">${msg.text}</span>
                            <span class="text-[9px] text-white/70 font-mono flex items-center space-x-0.5 flex-shrink-0">
                                <span>${timeFormatted}</span>
                                <span class="text-[#53bdeb]">✓✓</span>
                            </span>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="flex justify-start items-end space-x-1.5 my-2 animate-fade-in">
                        <div class="bg-[#1f2c34] text-white text-xs p-3 rounded-2xl rounded-tl-none max-w-[80%] shadow-md flex items-end space-x-2">
                            <span class="leading-relaxed font-medium break-words">${msg.text}</span>
                            <span class="text-[9px] text-gray-400 font-mono flex-shrink-0">${timeFormatted}</span>
                        </div>
                    </div>
                `;
            }
        } else if (msg.time !== null && currentTime < msg.time && !nextMsg) {
            nextMsg = msg;
        }
    });

    // PECHATAYET (3 TA NUQTA) ANIMATSIYASI
    if (nextMsg && nextMsg.time - currentTime <= 2.0) {
        const isNextMe = nextMsg.sender === 'me';
        if (isNextMe) {
            html += `
                <div class="flex justify-end my-1.5 animate-pulse">
                    <div class="bg-[#005c4b]/80 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-none flex items-center space-x-1">
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style="animation-delay:0.2s"></span>
                        <span class="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style="animation-delay:0.4s"></span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="flex justify-start my-1.5 animate-pulse">
                    <div class="bg-[#1f2c34]/80 text-white text-xs px-3 py-2 rounded-2xl rounded-tl-none flex items-center space-x-1">
                        <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                        <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
                        <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0.4s"></span>
                    </div>
                </div>
            `;
        }
    }

    chatBox.innerHTML = html;
    chatBox.scrollTop = chatBox.scrollHeight;
};

function formatMessageClock(sec) {
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec / 60) % 60) + 12;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Canvasda yumaloq to'rtburchak chizish (WhatsApp pufakchalari uchun)
function drawWhatsAppBubble(ctx, x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// ==================== 6. HAQIQIY 1:1 WHATSAPP 60FPS VIDEO EKSPORT ====================
window.exportWaAndSendToBot = async function() {
    const audio = window.waAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Eksport qilish uchun oldin WhatsApp MP3 faylini yuklang!");
        return;
    }

    const lyrics = window.waLyricsData || [];
    if (lyrics.length === 0) {
        alert("⚠️ Dialog matnini kiritib, sinxronlang!");
        return;
    }

    const stampedTimes = lyrics.map(l => l.time).filter(t => t !== null && t > 0);
    if (stampedTimes.length === 0) {
        alert("⚠️ Kamida bitta dialog vaqtini belgilang!");
        return;
    }

    const maxTime = Math.max(...stampedTimes);
    const exactVideoDuration = maxTime + 2.5;

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;

    const btn = document.getElementById('btn-wa-export-send');
    btn.innerHTML = `⏳ 1:1 WhatsApp Video yozilmoqda (${Math.ceil(exactVideoDuration)}s)...`;
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
            btn.innerHTML = "📤 Video botingizga yuborilmoqda...";
            const blob = new Blob(chunks, { type: 'video/mp4' });

            const formData = new FormData();
            formData.append('chat_id', userId);
            formData.append('video', blob, `WhatsApp_Chat_${Date.now()}.mp4`);
            formData.append('caption', `💬 <b>VibeStudio 1:1 WhatsApp Dialog Videongiz Tayyor!</b>\n👤 Suhbatdosh: ${window.waContactName}\n⏱ Davomiyligi: ${Math.ceil(exactVideoDuration)} soniya\n\n👇 Saqlab olishingiz mumkin!`);
            formData.append('parse_mode', 'HTML');

            try {
                const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.ok) {
                    alert("🎉 1:1 WhatsApp video botingiz lichkasiga yetib bordi! Telegramni oching.");
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `WhatsApp_Chat_${Date.now()}.mp4`;
                    a.click();
                    alert("✅ WhatsApp video telefoningizga yuklandi!");
                }
            } catch (err) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `WhatsApp_Chat_${Date.now()}.mp4`;
                a.click();
                alert("✅ Video tayyorlandi!");
            }

            btn.innerHTML = "🎬 Ovozli WhatsApp Videoni Botga Yuborish";
            btn.disabled = false;
        };

        recorder.start();
        bufferSource.start(0);
        const startTime = audioCtx.currentTime;

        function renderFrame() {
            const elapsedTime = audioCtx.currentTime - startTime;

            if (elapsedTime >= exactVideoDuration) {
                if (recorder.state === "recording") {
                    recorder.stop();
                    bufferSource.stop();
                }
                return;
            }

            // 1. WhatsApp Fon (#0b141a)
            ctx.fillStyle = "#0b141a";
            ctx.fillRect(0, 0, 1080, 1920);

            // 2. WhatsApp Header Bar (#1f2c34)
            ctx.fillStyle = "#1f2c34";
            ctx.fillRect(0, 0, 1080, 220);

            // Qaytish belgisi
            ctx.fillStyle = "#8696a0";
            ctx.font = "bold 46px sans-serif";
            ctx.fillText("←", 40, 130);

            // Profil Rasmi (Aylana)
            ctx.save();
            ctx.beginPath();
            ctx.arc(160, 110, 50, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            if (window.waPartnerAvatarImgObj) {
                ctx.drawImage(window.waPartnerAvatarImgObj, 110, 60, 100, 100);
            } else {
                ctx.fillStyle = "#6b7280";
                ctx.fillRect(110, 60, 100, 100);
            }
            ctx.restore();

            // Ism va Status
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 44px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(window.waContactName, 235, 105);

            ctx.fillStyle = "#25d366";
            ctx.font = "30px sans-serif";
            ctx.fillText(window.waStatus, 235, 155);

            // Header Ikonkalari (Video, Tel, Nuqtalar)
            ctx.fillStyle = "#8696a0";
            ctx.font = "38px sans-serif";
            ctx.fillText("📹    📞    ⋮", 800, 125);

            // 3. Xabarlarni chizish (Multi-line Wrap bilan)
            let currentY = 280;
            let nextMsg = null;

            lyrics.forEach((msg) => {
                if (msg.time !== null && elapsedTime >= msg.time) {
                    const isMe = msg.sender === 'me';
                    const timeFormatted = formatMessageClock(msg.time);
                    
                    // So'zlarni 2-qatorga bo'lish
                    ctx.font = "36px sans-serif";
                    const words = msg.text.split(' ');
                    let lines = [];
                    let curLine = '';
                    for (let w = 0; w < words.length; w++) {
                        let testL = curLine + words[w] + ' ';
                        if (ctx.measureText(testL).width > 600 && w > 0) {
                            lines.push(curLine);
                            curLine = words[w] + ' ';
                        } else {
                            curLine = testL;
                        }
                    }
                    lines.push(curLine);

                    const bubbleHeight = (lines.length * 48) + 60;

                    if (isMe) {
                        // Yashil Pufakcha (O'ngda)
                        drawWhatsAppBubble(ctx, 330, currentY, 700, bubbleHeight, 24, "#005c4b");
                        ctx.fillStyle = "#ffffff";
                        lines.forEach((l, li) => {
                            ctx.fillText(l, 360, currentY + 50 + (li * 48));
                        });
                        // Vaqt va Moviy Qushchalar
                        ctx.fillStyle = "rgba(255,255,255,0.7)";
                        ctx.font = "26px sans-serif";
                        ctx.fillText(timeFormatted, 900, currentY + bubbleHeight - 15);
                        ctx.fillStyle = "#53bdeb";
                        ctx.fillText("✓✓", 975, currentY + bubbleHeight - 15);
                    } else {
                        // Qora Pufakcha (Chapda)
                        drawWhatsAppBubble(ctx, 50, currentY, 700, bubbleHeight, 24, "#1f2c34");
                        ctx.fillStyle = "#ffffff";
                        lines.forEach((l, li) => {
                            ctx.fillText(l, 80, currentY + 50 + (li * 48));
                        });
                        ctx.fillStyle = "#8696a0";
                        ctx.font = "26px sans-serif";
                        ctx.fillText(timeFormatted, 660, currentY + bubbleHeight - 15);
                    }

                    currentY += bubbleHeight + 25;
                } else if (msg.time !== null && elapsedTime < msg.time && !nextMsg) {
                    nextMsg = msg;
                }
            });

            // 4. JONLI 3 TA NUQTA (PECHATAYET •••) CHIZISH
            if (nextMsg && nextMsg.time - elapsedTime <= 1.8) {
                const isNextMe = nextMsg.sender === 'me';
                const dotY = currentY;
                const dotColor = isNextMe ? "#005c4b" : "#1f2c34";
                const dotX = isNextMe ? 850 : 50;

                drawWhatsAppBubble(ctx, dotX, dotY, 180, 80, 24, dotColor);
                
                // Sakrovchi 3 ta nuqta
                const bounce = Math.sin(elapsedTime * 8) * 8;
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(dotX + 50, dotY + 40 + bounce, 8, 0, Math.PI * 2);
                ctx.arc(dotX + 90, dotY + 40 - bounce, 8, 0, Math.PI * 2);
                ctx.arc(dotX + 130, dotY + 40 + bounce, 8, 0, Math.PI * 2);
                ctx.fill();
            }

            // 5. WhatsApp Footer Input Bar (#1f2c34)
            ctx.fillStyle = "#1f2c34";
            ctx.fillRect(0, 1770, 1080, 150);

            // Input qutisi
            drawWhatsAppBubble(ctx, 30, 1795, 870, 100, 50, "#2a3942");
            ctx.fillStyle = "#8696a0";
            ctx.font = "36px sans-serif";
            ctx.fillText("😊  Сообщение                📎", 60, 1860);

            // Yashil Mikrofon Doirasi
            ctx.fillStyle = "#00a884";
            ctx.beginPath();
            ctx.arc(980, 1845, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "40px sans-serif";
            ctx.fillText("🎤", 960, 1860);

            requestAnimationFrame(renderFrame);
        }

        renderFrame();

    } catch (e) {
        console.error(e);
        alert("⚠️ Video tayyorlashda xatolik bo'ldi. Qaytadan urinib ko'ring.");
        btn.innerHTML = "🎬 Ovozli WhatsApp Videoni Botga Yuborish";
        btn.disabled = false;
    }
};
