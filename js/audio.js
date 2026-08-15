// ==================== AUDIO PLAYER ENGINE ====================
window.vibeAudioElement = new Audio();
let isPlaying = false;

// MP3 Fayl yuklash
window.handleAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('audio-file-name').innerText = file.name;
    const url = URL.createObjectURL(file);
    window.vibeAudioElement.src = url;

    document.getElementById('audio-player-box').classList.remove('hidden');
    document.getElementById('audio-player-box').classList.add('flex');

    // 9:16 ekranni bosganda ham musiqani qo'yish
    const previewBox = document.getElementById('video-canvas-preview');
    if (previewBox) {
        previewBox.onclick = () => toggleAudioPlay();
        previewBox.style.cursor = 'pointer';
    }
};

// Play / Pause boshqaruvi
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

// Audio o'ynaganda jonli vaqtni va karaoke satrlarini yangilash
window.vibeAudioElement.ontimeupdate = function() {
    const audio = window.vibeAudioElement;
    const cur = audio.currentTime;
    const dur = audio.duration || 0;

    const curMin = Math.floor(cur / 60);
    const curSec = Math.floor(cur % 60);
    const durMin = Math.floor(dur / 60);
    const durSec = Math.floor(dur % 60);

    const timeDisplay = document.getElementById('audio-current-time');
    if (timeDisplay) {
        timeDisplay.innerText = `${curMin}:${curSec < 10 ? '0' : ''}${curSec} / ${durMin}:${durSec < 10 ? '0' : ''}${durSec}`;
    }

    // Spotify Karaoke satrlarini yangilash
    if (window.updateLiveKaraokeDisplay) {
        window.updateLiveKaraokeDisplay(cur);
    }
};
