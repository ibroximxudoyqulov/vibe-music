// ==================== 100% FAIL-SAFE SMART SYNC ENGINE (js/sync.js) ====================

window.lyricsData = [];
let activeLineIndex = -1;
let currentRenderedIdx = -1;

window.updateTrackInfo = function() {
    const artist = document.getElementById('track-artist-input');
    const title = document.getElementById('track-title-input');
    const pArtist = document.getElementById('preview-track-artist');
    const pTitle = document.getElementById('preview-track-title');

    if (pArtist && artist) pArtist.innerText = artist.value || 'Artist';
    if (pTitle && title) pTitle.innerText = title.value || 'Song Title';
};

// 1. SATRLARNI TAYYORLASH (100% ISHONCHLI)
window.parseLyricsForSync = function() {
    const inputEl = document.getElementById('raw-lyrics-input');
    if (!inputEl) return;

    const raw = inputEl.value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, oldin qo'shiq matnini kiriting!");
        return;
    }

    // Faqat haqiqiy qatorlar bo'yicha ajratish
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    window.lyricsData = lines.map(line => ({ time: null, text: line }));

    const container = document.getElementById('sync-container');
    if (container) {
        container.innerHTML = '';
        container.classList.remove('hidden');

        window.lyricsData.forEach((item, index) => {
            const div = document.createElement('div');
            div.id = `sync-line-${index}`;
            div.className = "p-2.5 bg-brand-input rounded-xl border border-gray-800 flex justify-between items-center text-xs";
            div.innerHTML = `
                <span class="text-gray-300 flex-1 truncate pr-2">${index + 1}. ${item.text}</span>
                <span id="time-badge-${index}" class="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg flex-shrink-0">--:--</span>
            `;
            container.appendChild(div);
        });
    }

    const stampBtn = document.getElementById('btn-stamp-line');
    if (stampBtn) {
        stampBtn.classList.remove('hidden');
        stampBtn.innerText = `⏱ 1-satr boshlanishida bosing`;
    }

    initCinemaSlots();
    activeLineIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Musiqani qo'ying va xonanda har bir satrni aytishni BOSHLAGANDA 'Vaqtni Saqlash' tugmasini bosing.");
};

// 2. KINEMATIK PREVIEW EKRANI
function initCinemaSlots() {
    const box = document.getElementById('spotify-lyrics-scroll');
    if (!box) return;

    const currentFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";
    const selectedColor = window.activeLyricsColor || "#ffffff";
    const firstText = window.lyricsData[0] ? window.lyricsData[0].text : "Matn yuklang...";
    const secondText = window.lyricsData[1] ? window.lyricsData[1].text : "";

    box.className = "flex-1 flex flex-col justify-center items-start overflow-hidden px-2 my-auto select-none";
    box.innerHTML = `
        <p id="cinema-slot-active" class="text-xl md:text-2xl font-black transition-all duration-500 ease-out leading-snug my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] break-words whitespace-normal w-full" style="font-family: ${currentFont}; color: ${selectedColor};">
            ${firstText}
        </p>
        <p id="cinema-slot-next" class="text-base md:text-lg font-bold text-white/30 transition-all duration-500 ease-out leading-snug my-2 break-words whitespace-normal w-full" style="font-family: ${currentFont};">
            ${secondText}
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

// 3. VAQTNI SAQLASH TUGMASI
window.timestampCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Iltimos, oldin 1-qadamda MP3 fayl tanlang!");
        return;
    }
    if (activeLineIndex < 0 || activeLineIndex >= window.lyricsData.length) return;

    const currentTime = audio.currentTime;
    window.lyricsData[activeLineIndex].time = currentTime;

    const min = Math.floor(currentTime / 60), sec = Math.floor(currentTime % 60);
    const badge = document.getElementById(`time-badge-${activeLineIndex}`);
    if (badge) {
        badge.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-brand-red text-white font-bold rounded-lg";
    }

    activeLineIndex++;
    const stampBtn = document.getElementById('btn-stamp-line');
    
    if (activeLineIndex < window.lyricsData.length) {
        if (stampBtn) stampBtn.innerText = `⏱ ${activeLineIndex + 1}-satr boshlanishida bosing`;
        highlightNextSyncLine();
    } else {
        if (stampBtn) stampBtn.classList.add('hidden');
        alert("🎉 Barcha satrlar aniq sinxronlandi! Endi pastga tushib videoni tayyorlang.");
    }
};

// 4. JONLI SILLIQ MOSLASHUVCHAN MATN CHIQISHI
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

    if (targetIdx !== currentRenderedIdx) {
        currentRenderedIdx = targetIdx;

        slotActive.style.transform = "translateY(-12px)";
        slotActive.style.opacity = "0";

        setTimeout(() => {
            const curText = window.lyricsData[targetIdx] ? window.lyricsData[targetIdx].text : "";
            const nextText = window.lyricsData[targetIdx + 1] ? window.lyricsData[targetIdx + 1].text : "";

            if (curText.length > 55) {
                slotActive.className = "text-lg md:text-xl font-black transition-all duration-500 ease-out leading-snug my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] break-words whitespace-normal w-full";
            } else {
                slotActive.className = "text-2xl md:text-3xl font-black transition-all duration-500 ease-out leading-snug my-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] break-words whitespace-normal w-full";
            }

            slotActive.innerText = curText;
            slotActive.style.color = window.activeLyricsColor || "#ffffff";
            slotActive.style.transform = "translateY(0)";
            slotActive.style.opacity = "1";

            slotNext.innerText = nextText;
        }, 120);
    }
};
