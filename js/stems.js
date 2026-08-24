// ==================== REAL DSP PHASE INVERSION STEM SEPARATOR ====================

let originalStemBuffer = null;
let vocalStemBlob = null;
let musicStemBlob = null;

const BOT_TOKEN = "8824021433:AAEYvgkP5nHfymQRzDgvZ69Gj1PCvlyoC5o";

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

// HAQIQIY FAZAVIY OVOZ VA MINUS AJRATISH (PHASE CANCELLATION)
window.processStemSeparation = async function() {
    if (!originalStemBuffer) {
        alert("⚠️ Iltimos, oldin musiqa yuklang!");
        return;
    }

    const btn = document.getElementById('btn-start-stem');
    btn.innerHTML = "⏳ Raqamli faza orqali ovozlar ajratilmoqda...";
    btn.disabled = true;

    setTimeout(() => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const channels = originalStemBuffer.numberOfChannels;
            const length = originalStemBuffer.length;
            const sampleRate = originalStemBuffer.sampleRate;

            if (channels < 2) {
                alert("⚠️ Musiqa stereo formatda emas (Mono). To'liq stereo qo'shiq yuklang!");
                btn.innerHTML = "⚡️ Qaytadan urinish";
                btn.disabled = false;
                return;
            }

            const vocalBuffer = audioCtx.createBuffer(2, length, sampleRate);
            const musicBuffer = audioCtx.createBuffer(2, length, sampleRate);

            const leftData = originalStemBuffer.getChannelData(0);
            const rightData = originalStemBuffer.getChannelData(1);

            const vLeft = vocalBuffer.getChannelData(0);
            const vRight = vocalBuffer.getChannelData(1);
            const mLeft = musicBuffer.getChannelData(0);
            const mRight = musicBuffer.getChannelData(1);

            for (let i = 0; i < length; i++) {
                const l = leftData[i];
                const r = rightData[i];

                // MINUS (KARAOKE): (Left - Right) -> Markazdagi ovoz butunlay so'nadi!
                const karaokeSample = (l - r) * 0.9;
                mLeft[i] = karaokeSample;
                mRight[i] = karaokeSample;

                // VOCAL (ACAPELLA): (Left + Right) / 2 -> Ovoz ajratiladi
                const vocalSample = (l + r) * 0.7 - karaokeSample * 0.4;
                vLeft[i] = vocalSample;
                vRight[i] = vocalSample;
            }

            vocalStemBlob = bufferToWave(vocalBuffer, length);
            musicStemBlob = bufferToWave(musicBuffer, length);

            document.getElementById('vocal-audio-preview').src = URL.createObjectURL(vocalStemBlob);
            document.getElementById('music-audio-preview').src = URL.createObjectURL(musicStemBlob);

            document.getElementById('stem-results-container').classList.remove('hidden');
            btn.innerHTML = "✅ Ovozlar Muvaffaqiyatli Ajratildi!";
            btn.disabled = false;
        } catch (err) {
            console.error(err);
            alert("⚠️ Ajratishda xatolik yuz berdi!");
            btn.innerHTML = "⚡️ Qaytadan urinish";
            btn.disabled = false;
        }
    }, 1200);
};

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
    formData.append('audio', blobToSend, `VibeStudio_${type}_${Date.now()}.mp3`);
    formData.append('caption', `🎵 <b>VibeStudio AI Audio:</b>\n${title}\n\n📥 @ms_mus1c_bot orqali yuklandi!`);
    formData.append('parse_mode', 'HTML');

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
        method: 'POST',
        body: formData
    }).then(res => res.json()).then(data => {
        alert("🎉 Fayl botingiz lichkasiga yetib bordi! Telegramni oching.");
    });
};

function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        out = new DataView(new ArrayBuffer(length)),
        channels = [], i, sample, offset = 0, pos = 0;

    function setUint16(data) { out.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { out.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            out.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([out], { type: "audio/mp3" });
}
