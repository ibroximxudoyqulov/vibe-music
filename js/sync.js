// ==================== 100% STABLE NO-JUMP LYRICS ENGINE (js/sync.js) ====================

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

// 1. FAQAT ENTER BO'YICHA QATORLARGA BO'LISH
window.parseLyricsForSync = function() {
    const inputEl = document.getElementById('raw-lyrics-input');
    if (!inputEl) return;

    const raw = inputEl.value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, oldin qo'shiq matnini kiriting!");
        return;
    }

    // FAQAT ODAM ENTER BOSGAN QATORLAR BO'YICHA AJRATISH
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

    renderFixedGeometryList();
    activeLineIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Musiqani qo'ying va xonanda har bir satrni aytishni BOSHLAGANDA tugmani bosing.");
};

// 2. SO'ZLAR SAKRAMAYDIGAN QAT'IY O'LCHAMLI RO'YXAT
function renderFixedGeometryList() {
    const box = document.getElementById('spotify-lyrics-scroll');
    if (!box) return;

    const currentFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";
    const selectedColor = window.activeLyricsColor || "#ffffff";
    box.innerHTML = '';

    window.lyricsData.forEach((item, index) => {
        const p = document.createElement('p');
        p.id = `spotify-line-${index}`;
        p.style.fontFamily = currentFont;
        // Barcha satrlar uchun bir xil qat'iy o'lcham (harflar sakramaydi!)
        p.className = "text-lg md:text-xl font-bold transition-all duration-300 leading-snug my-3 break-words w-full";
        
        if (index === 0) {
            p.style.color = selectedColor;
            p.style.opacity = "1";
            p.style.fontWeight = "900";
        } else {
            p.style.color = "#ffffff";
            p.style.opacity = "0.35";
            p.style.fontWeight = "700";
        }

        p.innerText = item.text;
        box.appendChild(p);
    });

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

// 3. VAQTNI SAQLASH
window.timestampCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Iltimos, oldin MP3 fayl tanlang!");
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

// 4. JONLI SILLIQ YORITISH (SO'ZLAR JOYIDAN QIMIRLAMAYDI)
window.updateLiveKaraokeDisplay = function(currentTime) {
    if (!window.lyricsData || window.lyricsData.length === 0) return;

    let targetIdx = 0;
    for (let i = 0; i < window.lyricsData.length; i++) {
        if (window.lyricsData[i].time !== null && currentTime >= window.lyricsData[i].time) {
            targetIdx = i;
        }
    }

    if (targetIdx !== currentRenderedIdx) {
        currentRenderedIdx = targetIdx;
        const scrollBox = document.getElementById('spotify-lyrics-scroll');
        const selectedColor = window.activeLyricsColor || "#ffffff";

        window.lyricsData.forEach((_, idx) => {
            const el = document.getElementById(`spotify-line-${idx}`);
            if (!el) return;

            if (idx === targetIdx) {
                // FAOL SATR: Yorqin yonadi
                el.style.color = selectedColor;
                el.style.opacity = "1";
                el.style.fontWeight = "900";

                if (scrollBox) {
                    const targetScroll = el.offsetTop - scrollBox.offsetTop - 60;
                    scrollBox.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
                }
            } else {
                // QOLGAN SATRLAR: Xira turadi (Joyidan siljimaydi!)
                el.style.color = "#ffffff";
                el.style.opacity = "0.35";
                el.style.fontWeight = "700";
            }
        });
    }
};
