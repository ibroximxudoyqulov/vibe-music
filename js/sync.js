// ==================== SPOTIFY / MUSIXMATCH SYNC ENGINE ====================
let lyricsData = []; // [{time: 0, text: "Satr"}]
let currentActiveIndex = -1;

// 1. Matnni sinxronlashga tayyorlash
window.parseLyricsForSync = function() {
    const raw = document.getElementById('raw-lyrics-input').value.trim();
    if (!raw) {
        alert("⚠️ Iltimos, oldin qo'shiq matnini kiriting!");
        return;
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsData = lines.map(line => ({ time: null, text: line }));

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

    currentActiveIndex = 0;
    highlightNextSyncLine();
    alert("✅ Matn tayyor! Endi musiqani qo'yib, har bir satr vaqtida 'Vaqtni Saqlash' tugmasini bosing.");
};

function highlightNextSyncLine() {
    document.querySelectorAll('#sync-container > div').forEach(d => d.classList.remove('border-brand-red', 'bg-brand-red/10'));
    const activeDiv = document.getElementById(`sync-line-${currentActiveIndex}`);
    if (activeDiv) {
        activeDiv.classList.add('border-brand-red', 'bg-brand-red/10');
        activeDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// 2. Musixmatch uslubida vaqtni saqlash
window.timestampCurrentLine = function() {
    const audio = window.vibeAudioElement;
    if (!audio) {
        alert("⚠️ Oldin 1-qadamda MP3 fayl yuklang!");
        return;
    }

    if (currentActiveIndex >= lyricsData.length) {
        alert("🎉 Barcha satrlar sinxronlandi!");
        return;
    }

    const currentTime = audio.currentTime;
    lyricsData[currentActiveIndex].time = currentTime;

    const min = Math.floor(currentTime / 60);
    const sec = Math.floor(currentTime % 60);
    const formatted = `${min}:${sec < 10 ? '0' : ''}${sec}`;

    const badge = document.getElementById(`time-badge-${currentActiveIndex}`);
    if (badge) {
        badge.innerText = formatted;
        badge.className = "text-[10px] font-mono px-2 py-0.5 bg-brand-red text-white font-bold rounded-lg";
    }

    currentActiveIndex++;
    if (currentActiveIndex < lyricsData.length) {
        highlightNextSyncLine();
    } else {
        document.getElementById('btn-stamp-line').classList.add('hidden');
        alert("🎬 Ajoyib! Endi 9:16 ekranni bosib, jonli Spotify karaokeni ko'rishingiz mumkin!");
    }
};

// 3. Jonli 9:16 ekranda Spotify uslubidagi animatsiya
window.updateLiveKaraokeDisplay = function(currentTime) {
    if (lyricsData.length === 0) return;

    // Hozirgi vaqtga mos satrni topish
    let activeIdx = -1;
    for (let i = 0; i < lyricsData.length; i++) {
        if (lyricsData[i].time !== null && currentTime >= lyricsData[i].time) {
            activeIdx = i;
        }
    }

    if (activeIdx !== -1) {
        const previewText = document.getElementById('preview-active-line');
        if (previewText) {
            // Spotify uslubi: O'tgan qatorlar xira, hozirgi qator yorqin va katta
            let html = '';
            
            // Oldingi satr (Xira)
            if (activeIdx > 0 && lyricsData[activeIdx - 1]) {
                html += `<p class="text-xs text-white/30 transition-all duration-300">${lyricsData[activeIdx - 1].text}</p>`;
            }
            
            // Faol satr (Yorqin, Katta, Oq)
            html += `<p class="text-xl font-extrabold text-white scale-105 transition-all duration-300 drop-shadow-md my-2">${lyricsData[activeIdx].text}</p>`;
            
            // Keyingi satr (Xira)
            if (activeIdx + 1 < lyricsData.length && lyricsData[activeIdx + 1]) {
                html += `<p class="text-xs text-white/40 transition-all duration-300">${lyricsData[activeIdx + 1].text}</p>`;
            }

            previewText.innerHTML = html;
        }
    }
};
