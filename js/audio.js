// ==================== REAL-TIME INTERACTIVE AUDIO ENGINE ====================
window.vibeAudioElement = new Audio();
let isPlaying = false;
let isUserSeeking = false;

// 1. MP3 Fayl Yuklash
window.handleAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('audio-file-name').innerText = file.name;
    const url = URL.createObjectURL(file);
    window.vibeAudioElement.src = url;

    window.vibeAudioElement.onloadedmetadata = () => {
        const slider = document.getElementById('audio-seek-slider');
        if (slider) {
            slider.max = window.vibeAudioElement.duration;
            slider.value = 0;
        }
        updateTimeUI(0, window.vibeAudioElement.duration);
    };

    document.getElementById('audio-player-box').classList.remove('hidden');
    document.getElementById('audio-player-box').classList.add('flex');

    // 9:16 ekranni bosganda ham play/pause qilish
    const previewBox = document.getElementById('video-canvas-preview');
    if (previewBox) {
        previewBox.onclick = () => toggleAudioPlay();
        previewBox.style.cursor = 'pointer';
    }
};

// 2. Play / Pause Boshqaruvi
window.toggleAudioPlay = function() {
    const audio = window.vibeAudioElement;
    if (!audio.src) {
        alert("⚠️ Iltimos, oldin MP3 fayl tanlang!");
        return;
    }

    const icon = document.getElementById('btn-audio-icon');
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        if (icon) icon.className = "fa-solid fa-play";
    } else {
        audio.play();
        isPlaying = true;
        if (icon) icon.className = "fa-solid fa-pause";
    }
};

// 3. Qo'lda (Barmoq Bilan) Oldinga-Orqaga Jonli Surish Funksiyasi
window.onAudioSeek = function(val) {
    const audio = window.vibeAudioElement;
    if (audio && audio.src) {
        const seekTime = parseFloat(val);
        audio.currentTime = seekTime;
        updateTimeUI(seekTime, audio.duration || 0);

        // Barmoq bilan surilganda matnlar animatsiyasi ham darhol o'sha soniyaga sakraydi
        if (window.updateLiveKaraokeDisplay) {
            window.updateLiveKaraokeDisplay(seekTime);
        }
    }
};

// 4. Vaqtni Formatlash (Min:Sec)
function updateTimeUI(cur, dur) {
    const curMin = Math.floor(cur / 60), curSec = Math.floor(cur % 60);
    const durMin = Math.floor(dur / 60), durSec = Math.floor(dur % 60);
    const timeDisplay = document.getElementById('audio-current-time');
    if (timeDisplay) {
        timeDisplay.innerText = `${curMin}:${curSec < 10 ? '0' : ''}${curSec} / ${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
    }
}

// 5. Jonli Vaqt Yangilanishi (Audio o'ynaganda)
window.vibeAudioElement.ontimeupdate = function() {
    const audio = window.vibeAudioElement;
    const cur = audio.currentTime;
    const dur = audio.duration || 0;

    const slider = document.getElementById('audio-seek-slider');
    if (slider && !isUserSeeking) {
        slider.value = cur;
    }

    updateTimeUI(cur, dur);

    // Spotify Karaoke matnlarini yangilab turish
    if (window.updateLiveKaraokeDisplay) {
        window.updateLiveKaraokeDisplay(cur);
    }
};

// 6. Audio tugaganda tugmani Play holatiga qaytarish
window.vibeAudioElement.onended = function() {
    isPlaying = false;
    const icon = document.getElementById('btn-audio-icon');
    if (icon) icon.className = "fa-solid fa-play";
};
