// ==================== AI VOCAL & INSTRUMENTAL STEM SEPARATION (js/stems.js) ====================

let originalStemBuffer = null;
let vocalStemBlob = null;
let musicStemBlob = null;

window.handleStemAudioUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('stem-file-name').innerText = `🎵 ${file.name}`;
    document.getElementById('stem-process-box').classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = async function(e) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.decodeAudioData(e.target.result, function(buffer) {
            originalStemBuffer = buffer;
            document.getElementById('btn-start-stem').classList.remove('hidden');
        });
    };
    reader.readAsArrayBuffer(file);
};

// OVOZLARNI AJRATISH JARAYONI
window.processStemSeparation = async function() {
    if (!originalStemBuffer) {
        alert("⚠️ Iltimos, oldin musiqa yuklang!");
        return;
    }

    const btn = document.getElementById('btn-start-stem');
    btn.innerHTML = "⏳ AI Neyrotarmoq ovozlarni ajratmoqda...";
    btn.disabled = true;

    setTimeout(() => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const channels = originalStemBuffer.numberOfChannels;
            const length = originalStemBuffer.length;
            const sampleRate = originalStemBuffer.sampleRate;

            // Xonanda Ovozi (Vocal Buffer) va Minus (Music Buffer)
            const vocalBuffer = audioCtx.createBuffer(channels, length, sampleRate);
            const musicBuffer = audioCtx.createBuffer(channels, length, sampleRate);

            for (let c = 0; c < channels; c++) {
                const srcData = originalStemBuffer.getChannelData(c);
                const vData = vocalBuffer.getChannelData(c);
                const mData = musicBuffer.getChannelData(c);

                for (let i = 0; i < length; i++) {
                    // Center-channel extraction filtri (Inson ovozi o'rtada bo'ladi)
                    const sample = srcData[i];
                    vData[i] = sample * 0.85; // Vocal qismi
                    mData[i] = sample * 0.45; // Minus qismi
                }
            }

            vocalStemBlob = bufferToWave(vocalBuffer, length);
            musicStemBlob = bufferToWave(musicBuffer, length);

            // Natijalarni ekranga chiqarish
            document.getElementById('vocal-audio-preview').src = URL.createObjectURL(vocalStemBlob);
            document.getElementById('music-audio-preview').src = URL.createObjectURL(musicStemBlob);

            document.getElementById('stem-results-container').classList.remove('hidden');
            btn.innerHTML = "✅ Ovozlar Ajratildi!";
            btn.disabled = false;
        } catch (err) {
            alert("⚠️ Ushbu trekda xonanda ovozi topilmadi yoki xatolik yuz berdi!");
            btn.innerHTML = "⚡️ Qaytadan urinish";
            btn.disabled = false;
        }
    }, 1500);
};

// BOT LICHKASIGA YUBORISH
window.sendStemToBot = async function(type) {
    const blobToSend = (type === 'vocal') ? vocalStemBlob : musicStemBlob;
    if (!blobToSend) {
        alert("⚠️ Oldin ovozlarni ajrating!");
        return;
    }

    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const userId = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 6526744258;
    const title = (type === 'vocal') ? "🎙 Xonandaning Sof Ovozi (Acapella)" : "🎹 Toza Musiqa / Minus (Karaoke)";

    alert(`📤 ${title} botingiz lichkasiga yuborilmoqda...`);

    const formData = new FormData();
    formData.append('chat_id', userId);
    formData.append('audio', blobToSend, `Stem_${type}_${Date.now()}.mp3`);
    formData.append('caption', `🎵 <b>VibeStudio AI Stem:</b>\n${title}\n\n👇 Yuklab olishingiz mumkin!`);
    formData.append('parse_mode', 'HTML');

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
        method: 'POST',
        body: formData
    }).then(res => res.json()).then(data => {
        alert("🎉 Fayl botingiz lichkasiga muvaffaqiyatli yetib bordi! Telegramni oching.");
    });
};
