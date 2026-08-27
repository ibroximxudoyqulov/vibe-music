// ==================== 100% SMOOTH 2-SLOT APPLE MUSIC KINETIC ENGINE ====================

window.lyricsData = [];
let activeLineIndex = -1;
let currentRenderedIdx = -1;

window.updateTrackInfo = function() {
    const artist = document.getElementById('track-artist-input').value || 'Artist';
    const title = document.getElementById('track-title-input').value || 'Song Title';
    document.getElementById('preview-track-artist').innerText = artist;
    document.getElementById('preview-track-title').innerText = title;
};

// 1. Matnni qatorlarga ajratish
window.parseLyricsForSync = function() {
    const raw = document.getElementById('raw-lyrics-input').value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, oldin qo'shiq matnini kiriting!");
        return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    window.lyricsData = lines.map(line => ({ time: null, text: line }));

    const container = document.getElementById('sync-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    document.getElementById('btn-stamp-line').classList.remove('hidden');

    window.lyricsData.forEach((item, index) => {
        const div = document.createElement('div');
        div.id = `sync-line-${index}`;
        div.className = "p-2.5 bg-brand-input rounded-xl border border-gray-800 flex justify-between items-center text-xs";
        div.innerHTML = `
            <span class="text-gray-300 flex-1 break-words pr-2">${index + 1}. ${item.text}</span>
            <span id="time-badge-${index}" class="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg">--:--</span>
        `;
        container.appendChild(div);
    });

    initCinemaSlots();
    activeLineIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Musiqani qo'ying va har bir satr boshlanganda 'Vaqtni Saqlash' tugmasini bosing.");
};

// 2. 2-Slotli Barqaror Kinematik Ekran Yaratish (Sakramaydi!)
function initCinemaSlots() {
    const box = document.getElementById('spotify-lyrics-scroll');
    if (!box) return;
    
    const currentFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";
    const selectedColor = window.activeLyricsColor || "#ffffff";

    box.className = "flex-1 flex flex-col justify-center items-start overflow-hidden px-2 my-auto select-none";
    box.innerHTML = `
        <!-- 1-SLOT: FAOL AYTILAYOTGAN ULKAN SATR -->
        <p id="cinema-slot-active" class="text-2xl md:text-3xl font-black transition-all duration-500 ease-out leading-tight my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] break-words w-full" style="font-family: ${currentFont}; color: ${selectedColor};">
            ${window.lyricsData[0] ? window.lyricsData[0].text : "Matn yuklang..."}
        </p>

        <!-- 2-SLOT: KELAYOTGAN KEYINGI XIRA SATR -->
        <p id="cinema-slot-next" class="text-lg md:text-xl font-bold text-white/30 transition-all duration-500 ease-out leading-snug my-2 break-words w-full" style="font-family: ${currentFont};">
            ${window.lyricsData[1] ? window.lyricsData[1].text : ""}
        </p>
    `;
    currentRenderedIdx = 0;
}

function highlightNextSyncLine() {
    document.querySelectorAll('#sync-container > div').forEach(d => d.classList.remove('border-brand-red', 'bg-brand-red/10'));
    const activeDiv = document.getElementById(`sync-line-${activeLineIndex}`);
    const container = document.getElementById('sync-container');
    if (activeDiv && container) {
        activeDiv.classList.add('border-brand-red', 'bg-brand-red/10');
        container.scrollTop = activeDiv.offsetTop - container.offsetTop - 30;
    }
}

// 3. Vaqtni Saqlash
window.timestampCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Oldin MP3 fayl tanlang!");
        return;
    }
    if (activeLineIndex >= window.lyricsData.length) return;

    const currentTime = audio.currentTime;
    window.lyricsData[activeLineIndex].time = currentTime;

    const min = Math.floor(currentTime / 60), sec = Math.floor(currentTime % 60);
    const badge = document.getElementById(`time-badge-${activeLineIndex}`);
    if (badge) {
        badge.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-brand-red text-white font-bold rounded-lg";
    }

    activeLineIndex++;
    if (activeLineIndex < window.lyricsData.length) {
        highlightNextSyncLine();
    } else {
        document.getElementById('btn-stamp-line').classList.add('hidden');
        alert("🎉 Barcha satrlar sinxronlandi! Endi videoni tayyorlang.");
    }
};

// 4. JONLI SILLIQ 2-SLOTLI ALMASHINISH (SAKRAMAYDI VA SILLIQ SUZIB YO'QOLADI)
window.updateLiveKaraokeDisplay = function(currentTime) {
    if (!window.lyricsData || window.lyricsData.length === 0) return;

    let targetIdx = 0;
    for (let i = 0; i < window.lyricsData.length; i++) {
        if (window.lyricsData[i].time !== null && currentTime >= window.lyricsData[i].time) {
            targetIdx = i;
        }
    }

    const slotActive = document.getElementById('cinema-slot-active');
    const slotNext = document.getElementById('cinema-slot-next');
    if (!slotActive || !slotNext) return;

    // Satr almashganda silliq suzish animatsiyasi
    if (targetIdx !== currentRenderedIdx) {
        currentRenderedIdx = targetIdx;

        // 1. Eski satr silliq yuqoriga suzib yo'qoladi
        slotActive.style.transform = "translateY(-20px)";
        slotActive.style.opacity = "0";

        setTimeout(() => {
            // 2. Yangi satr 100% silliq joylashadi
            slotActive.innerText = window.lyricsData[targetIdx] ? window.lyricsData[targetIdx].text : "";
            slotActive.style.color = window.activeLyricsColor || "#ffffff";
            slotActive.style.transform = "translateY(0)";
            slotActive.style.opacity = "1";

            // 3. Keyingi satr pastda tayyor turadi
            slotNext.innerText = window.lyricsData[targetIdx + 1] ? window.lyricsData[targetIdx + 1].text : "";
        }, 150);
    }
};
