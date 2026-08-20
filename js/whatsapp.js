// ==================== AESTHETIC WHATSAPP CHAT DIALOG ENGINE ====================

window.waLyricsData = []; // [{ time: 0, text: "Salom", sender: "me" / "partner" }]
window.waContactName = "Jonim 🖤";
window.waStatus = "online";
window.waAvatarUrl = null;
let waActiveIndex = -1;

// 1. Kontakt ma'lumotlarini yangilash
window.updateWaContactInfo = function() {
    window.waContactName = document.getElementById('wa-contact-name-input').value || 'Jonim 🖤';
    window.waStatus = document.getElementById('wa-contact-status-input').value || 'online';
    
    document.getElementById('wa-preview-name').innerText = window.waContactName;
    document.getElementById('wa-preview-status').innerText = window.waStatus;
};

// 2. Suhbatdosh rasmini yuklash
window.handleWaAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    window.waAvatarUrl = URL.createObjectURL(file);
    const avatarEl = document.getElementById('wa-preview-avatar');
    if (avatarEl) {
        avatarEl.src = window.waAvatarUrl;
        avatarEl.classList.remove('hidden');
        document.getElementById('wa-avatar-placeholder').classList.add('hidden');
    }
};

// 3. Matnni qatorlarga ajratish va 1-Tugmali Kim aytishini belgilash
window.parseWaLyricsForSync = function() {
    const raw = document.getElementById('raw-wa-lyrics-input').value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, qo'shiq matnini kiriting!");
        return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Dastlab toq satrlar "partner" (u), juft satrlar "me" (men) qilib belgilanadi
    window.waLyricsData = lines.map((line, idx) => ({
        time: null,
        text: line,
        sender: (idx % 2 === 0) ? 'partner' : 'me' // 'partner' (Chapda) yoki 'me' (O'ngda)
    }));

    const container = document.getElementById('wa-sync-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    document.getElementById('btn-wa-stamp-line').classList.remove('hidden');

    renderWaSyncRows();
    waActiveIndex = 0;
    highlightNextWaSyncLine();
    alert("✅ Matn tayyor! Kim aytishini o'zgartirish uchun [👤 Men] yoki [👥 U] tugmasini bosing.");
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
            <button onclick="toggleWaSender(${index})" class="px-2 py-1 rounded-lg text-[10px] font-bold ${isMe ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}">
                ${isMe ? '👤 Men' : '👥 U'}
            </button>
            <span class="text-gray-300 flex-1 truncate">${index + 1}. ${item.text}</span>
            <span id="wa-time-badge-${index}" class="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg">--:--</span>
        `;
        container.appendChild(div);
    });
}

// 1-Tugmali Kim yuborganini almashtirish
window.toggleWaSender = function(index) {
    if (window.waLyricsData[index]) {
        window.waLyricsData[index].sender = (window.waLyricsData[index].sender === 'me') ? 'partner' : 'me';
        renderWaSyncRows();
        highlightNextWaSyncLine();
    }
};

function highlightNextWaSyncLine() {
    document.querySelectorAll('#wa-sync-container > div').forEach(d => d.classList.remove('border-brand-cyan', 'bg-brand-cyan/10'));
    const activeDiv = document.getElementById(`wa-sync-line-${waActiveIndex}`);
    const container = document.getElementById('wa-sync-container');
    if (activeDiv && container) {
        activeDiv.classList.add('border-brand-cyan', 'bg-brand-cyan/10');
        container.scrollTop = activeDiv.offsetTop - container.offsetTop - 30;
    }
}

// 4. Vaqtni saqlash
window.timestampWaCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Oldin 1-qadamda MP3 fayl tanlang!");
        return;
    }
    if (waActiveIndex >= window.waLyricsData.length) return;

    const currentTime = audio.currentTime;
    window.waLyricsData[waActiveIndex].time = currentTime;

    const min = Math.floor(currentTime / 60), sec = Math.floor(currentTime % 60);
    const badge = document.getElementById(`wa-time-badge-${waActiveIndex}`);
    if (badge) {
        badge.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-brand-cyan text-black font-bold rounded-lg";
    }

    waActiveIndex++;
    if (waActiveIndex < window.waLyricsData.length) {
        highlightNextWaSyncLine();
    } else {
        document.getElementById('btn-wa-stamp-line').classList.add('hidden');
        alert("🎉 Barcha dialoglar sinxronlandi! Endi videoni tayyorlashingiz mumkin.");
    }
};

// 5. Jonli WhatsApp Xabarlarini Preview'da Chiqarish
window.updateLiveWaChatDisplay = function(currentTime) {
    if (!window.waLyricsData || window.waLyricsData.length === 0) return;

    const chatBox = document.getElementById('wa-live-messages-box');
    if (!chatBox) return;

    let html = '';
    window.waLyricsData.forEach((msg, idx) => {
        if (msg.time !== null && currentTime >= msg.time) {
            const isMe = msg.sender === 'me';
            const timeFormatted = formatMessageClock(msg.time);

            if (isMe) {
                // MENING XABARIM (O'ng tomonda, WhatsApp Yashil)
                html += `
                    <div class="flex justify-end animate-fade-in my-1.5">
                        <div class="bg-[#005c4b] text-white text-xs p-2.5 rounded-2xl rounded-tr-none max-w-[80%] shadow-md flex items-end space-x-1.5">
                            <span class="leading-relaxed font-medium">${msg.text}</span>
                            <span class="text-[9px] text-white/70 font-mono flex items-center space-x-0.5">
                                <span>${timeFormatted}</span>
                                <span class="text-[#53bdeb]">✓✓</span>
                            </span>
                        </div>
                    </div>
                `;
            } else {
                // SUHBATDOSH XABARI (Chap tomonda, WhatsApp To'q Kulrang)
                html += `
                    <div class="flex justify-start animate-fade-in my-1.5">
                        <div class="bg-[#1f2c34] text-white text-xs p-2.5 rounded-2xl rounded-tl-none max-w-[80%] shadow-md flex items-end space-x-1.5">
                            <span class="leading-relaxed font-medium">${msg.text}</span>
                            <span class="text-[9px] text-gray-400 font-mono">${timeFormatted}</span>
                        </div>
                    </div>
                `;
            }
        }
    });

    chatBox.innerHTML = html;
    chatBox.scrollTop = chatBox.scrollHeight;
};

function formatMessageClock(sec) {
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec / 60) % 60) + 12; // Real vaqt effekti (masalan: 12:45)
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
