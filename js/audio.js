// ==========================================
// MICRO-FILE: MP3 UPLOAD & AUDIO CONTROLLER
// ==========================================

window.uploadedAudio = new Audio();
window.isAudioPlaying = false;

function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const fileNameElem = document.getElementById('audio-file-name');
        if (fileNameElem) fileNameElem.innerText = file.name;

        const audioUrl = URL.createObjectURL(file);
        window.uploadedAudio.src = audioUrl;
        window.uploadedAudio.load();

        const playerBox = document.getElementById('audio-player-box');
        if (playerBox) {
            playerBox.classList.remove('hidden');
            playerBox.classList.add('flex');
        }

        window.isAudioPlaying = false;
        const icon = document.getElementById('btn-audio-icon');
        if (icon) icon.className = 'fa-solid fa-play';
    }
}

function toggleAudioPlay() {
    if (!window.uploadedAudio.src) {
        return alert(currentLang === 'uz' ? "Iltimos, avval MP3 fayl tanlang!" : "Пожалуйста, сначала выберите MP3 файл!");
    }

    const icon = document.getElementById('btn-audio-icon');
    if (window.uploadedAudio.paused) {
        window.uploadedAudio.play().then(() => {
            window.isAudioPlaying = true;
            if (icon) icon.className = 'fa-solid fa-pause';
        }).catch(err => {
            console.log("Audio play error:", err);
        });
    } else {
        window.uploadedAudio.pause();
        window.isAudioPlaying = false;
        if (icon) icon.className = 'fa-solid fa-play';
    }
}

function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
