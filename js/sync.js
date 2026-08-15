// ==================== PURE SPOTIFY LYRICS ENGINE ====================
let lyricsData = []; // [{ time: 0, text: "..." }]
let activeLineIndex = -1;

window.updateTrackInfo = function() {
    const artist = document.getElementById('track-artist-input').value || 'Artist';
    const title = document.getElementById('track-title-input').value || 'Song Title';
    document.getElementById('preview-track-artist').innerText = artist;
    document.getElementById('preview-track-title').innerText = title;
};

// 1. Matnni satrlarga bo'lish
window.parseLyricsForSync = function() {
    const raw = document.getElementById('raw-lyrics-input').value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, qo'shiq matnini kiriting!");
        return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsData = lines.map(line => ({ time: null, text: line }));

    // Sinxronlash qutisi
    const container = document.getElementById('sync-container');
    container.innerHTML = '';
    container.classList.remove('hidden');
    document.getElementById('btn-stamp-line').classList.remove('hidden');

    lyricsData.forEach((item, index) => {
        const div = document.createElement('div');
        div.id = `sync-line-${index}`;
        div.className = "p-2.5 bg-brand-input rounded-xl border border-gray-800 flex justify-between items-center text-xs";
        div.innerHTML = `
            <span class="text-gray-300 flex-1">${index + 1}. ${item.text}</span>
            <span id="time-badge-${index}" class="text-[10px] font-mono px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg">--:--</span>
        `;
        container.appendChild(div);
    });

    renderSpotifyPreviewList();
    activeLineIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Musiqani qo'ying va har bir satr aytilganda 'Vaqtni Saqlash' tugmasini bosing.");
};

// 2. Spotify Preview ro'yxatini chiqarish
function renderSpotifyPreviewList() {
    const box = document.getElementById('spotify-lyrics-scroll');
    if (!box) return;
    box.innerHTML = '';

    const currentFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";

    lyricsData.forEach((item, index) => {
        const p = document.createElement('p');
        p.id = `spotify-line-${index}`;
        // Dastlab barcha satrlar xira bo'lib turadi
        p.className = "text-base md:text-lg font-bold text-white/30 transition-all duration-300 leading-relaxed cursor-pointer transform origin-left";
        p.style.fontFamily = currentFont;
        p.innerText = item.text;
        p.onclick = () => {
            if (item.time !== null && window.vibeAudioElement) {
                window.vibeAudioElement.currentTime = item.time;
            }
        };
        box.appendChild(p);
    });
}

function highlightNextSyncLine() {
    document.querySelectorAll('#sync-container > div').forEach(d => d.classList.remove('border-brand-red', 'bg-brand-red/10'));
    const activeDiv = document.getElementById(`sync-line-${activeLineIndex}`);
    if (activeDiv) {
        activeDiv.classList.add('border-brand-red', 'bg-brand-red/10');
        activeDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 3. Vaqt tamg'asini bosish
window.timestampCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio || !audio.src) {
        alert("⚠️ Oldin 1-qadamda MP3 fayl tanlang!");
        return;
    }

    if (activeLineIndex >= lyricsData.length) return;

    const currentTime = audio.currentTime;
    lyricsData[activeLineIndex].time = currentTime;

    const min = Math.floor(currentTime / 60);
    const sec = Math.floor(currentTime % 60);
    const badge = document.getElementById(`time-badge-${activeLineIndex}`);
    if (badge) {
        badge.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-brand-red text-white font-bold rounded-lg";
    }

    activeLineIndex++;
    if (activeLineIndex < lyricsData.length) {
        highlightNextSyncLine();
    } else {
        document.getElementById('btn-stamp-line').classList.add('hidden');
        alert("🎉 Barcha satrlar sinxronlandi! Endi 9:16 ekranni bosib rohatlaning!");
    }
};

// 4. Jonli Spotify Almashinish Animatsiyasi
window.updateLiveKaraokeDisplay = function(currentTime) {
    if (lyricsData.length === 0) return;

    let currentIndex = -1;
    for (let i = 0; i < lyricsData.length; i++) {
        if (lyricsData[i].time !== null && currentTime >= lyricsData[i].time) {
            currentIndex = i;
        }
    }

    if (currentIndex !== -1) {
        lyricsData.forEach((_, idx) => {
            const el = document.getElementById(`spotify-line-${idx}`);
            if (!el) return;

            if (idx === currentIndex) {
                // AYTILAYOTGAN SATR: Katta, Yorqin Oppoq, Oldinga chiqadi
                el.className = "text-xl md:text-2xl font-extrabold text-white scale-105 transition-all duration-300 leading-relaxed cursor-pointer transform origin-left drop-shadow-md";
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (idx < currentIndex) {
                // O'TIB KETGAN SATRLAR: Joyiga qaytadi, xiralashadi
                el.className = "text-base md:text-lg font-bold text-white/35 scale-100 transition-all duration-300 leading-relaxed cursor-pointer transform origin-left";
            } else {
                // KELAYOTGAN SATRLAR: Joyida, ko'proq xira
                el.className = "text-base md:text-lg font-bold text-white/20 scale-100 transition-all duration-300 leading-relaxed cursor-pointer transform origin-left";
            }
        });
    }
};
