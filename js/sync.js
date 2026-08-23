// ==================== APPLE MUSIC "MALVINA" KINETIC SPOTLIGHT ENGINE ====================

window.lyricsData = [];
let activeLineIndex = -1;

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
        alert("⚠️ Iltimos, qo'shiq matnini kiriting yoki 🤖 AI Matn tugmasidan foydalaning!");
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

    renderAppleMusicPreviewList();
    activeLineIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Musiqani qo'ying va har bir satr aytilganda 'Vaqtni Saqlash' tugmasini bosing.");
};

// 2. Apple Music Uslubidagi Matnlar Ro'yxati
function renderAppleMusicPreviewList() {
    const box = document.getElementById('spotify-lyrics-scroll');
    if (!box) return;
    box.innerHTML = '';

    const currentFont = document.getElementById('font-family-select') ? document.getElementById('font-family-select').value : "'Montserrat', sans-serif";

    window.lyricsData.forEach((item, index) => {
        const p = document.createElement('p');
        p.id = `spotify-line-${index}`;
        // Dastlab pastdagi satrlar xira (blur) va yarim shaffof turadi
        p.className = "text-base md:text-lg font-bold text-white/20 blur-[1px] transition-all duration-500 ease-out leading-relaxed cursor-pointer transform origin-left break-words w-full";
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
        alert("🎉 Barcha satrlar sinxronlandi! Endi pastga tushib videoni tayyorlang.");
    }
};

// 4. JONLI APPLE MUSIC "MALVINA" FADE-OUT ALMASHINISHI
window.updateLiveKaraokeDisplay = function(currentTime) {
    if (!window.lyricsData || window.lyricsData.length === 0) return;

    let currentIndex = -1;
    for (let i = 0; i < window.lyricsData.length; i++) {
        if (window.lyricsData[i].time !== null && currentTime >= window.lyricsData[i].time) {
            currentIndex = i;
        }
    }

    if (currentIndex !== -1) {
        const scrollBox = document.getElementById('spotify-lyrics-scroll');
        const selectedGlowColor = window.activeLyricsColor || "#ffffff";

        window.lyricsData.forEach((_, idx) => {
            const el = document.getElementById(`spotify-line-${idx}`);
            if (!el) return;

            if (idx === currentIndex) {
                // AYTILAYOTGAN FAOL SATR: #1 Markaziy o'ringa chiqadi, kattalashadi, yorqin porlaydi
                el.className = "text-xl md:text-2xl font-extrabold scale-105 blur-none transition-all duration-500 ease-out leading-relaxed cursor-pointer transform origin-left drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] break-words w-full";
                el.style.color = selectedGlowColor;
                el.style.opacity = "1";
                el.style.display = "block";
                
                if (scrollBox) {
                    const targetScroll = el.offsetTop - scrollBox.offsetTop - 80;
                    scrollBox.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
                }
            } else if (idx < currentIndex) {
                // AYTIB BO'LINGAN SATR: Yuqoriga siljib BUTUNLAY YO'QOLADI (Fade-Out / Opacity: 0)
                el.className = "text-sm font-bold text-white/0 -translate-y-4 transition-all duration-500 ease-in pointer-events-none";
                el.style.opacity = "0";
                el.style.display = "none"; // Ekrandan butunlay tozalanadi!
            } else {
                // KELAYOTGAN SATRLAR: Pastda xira (blur) va navbat kutadi
                el.className = "text-base md:text-lg font-bold text-white/25 blur-[1px] scale-100 transition-all duration-500 ease-out leading-relaxed cursor-pointer transform origin-left break-words w-full";
                el.style.color = "#ffffff";
                el.style.opacity = "0.35";
                el.style.display = "block";
            }
        });
    }
};
