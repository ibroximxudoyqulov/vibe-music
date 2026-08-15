// ==========================================
// MICRO-FILE: MUSIXMATCH MANUAL LYRIC SYNC
// ==========================================

window.parsedLines = [];
window.activeLineIndex = 0;

function parseLyricsForSync() {
    const rawText = document.getElementById('raw-lyrics-input').value.trim();
    if (!rawText) {
        return alert(currentLang === 'uz' ? "Iltimos, qo'shiq matnini kiriting!" : "Пожалуйста, введите текст песни!");
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    window.parsedLines = lines.map(l => ({ text: l, time: null }));
    window.activeLineIndex = 0;

    const container = document.getElementById('sync-container');
    if (!container) return;
    container.innerHTML = '';
    container.classList.remove('hidden');

    window.parsedLines.forEach((item, index) => {
        container.innerHTML += `
            <div id="sync-line-${index}" class="p-2.5 bg-brand-input rounded-xl border border-gray-800 text-xs flex justify-between items-center transition">
                <span class="truncate pr-2 text-gray-300">${escapeHtml(item.text)}</span>
                <span id="sync-time-${index}" class="font-mono text-[10px] text-gray-500">--:--</span>
            </div>
        `;
    });

    const stampBtn = document.getElementById('btn-stamp-line');
    if (stampBtn) stampBtn.classList.remove('hidden');

    alert(currentLang === 'uz' ? "▶️ Musiqani yoqing va har bir satr aytilganda 'SAQLASH' tugmasini bosing!" : "▶️ Включите музыку и нажимайте 'СОХРАНИТЬ' на каждой строке!");
}

function timestampCurrentLine() {
    if (window.activeLineIndex >= window.parsedLines.length) {
        return alert(currentLang === 'uz' ? "Barcha satrlar sinxronlandi!" : "Все строки синхронизированы!");
    }

    const curTime = window.uploadedAudio.currentTime;
    window.parsedLines[window.activeLineIndex].time = curTime;

    const timeSpan = document.getElementById(`sync-time-${window.activeLineIndex}`);
    if (timeSpan) {
        timeSpan.innerText = formatTime(curTime);
        timeSpan.className = 'font-mono text-[10px] text-brand-cyan font-bold';
    }

    const lineBox = document.getElementById(`sync-line-${window.activeLineIndex}`);
    if (lineBox) {
        lineBox.classList.remove('border-gray-800');
        lineBox.classList.add('border-brand-cyan');
    }

    window.activeLineIndex++;
}

function checkSyncedLyricHighlight() {
    const curTime = window.uploadedAudio.currentTime;
    const durTime = window.uploadedAudio.duration || 0;
    
    const timerElem = document.getElementById('audio-current-time');
    if (timerElem) {
        timerElem.innerText = `${formatTime(curTime)} / ${formatTime(durTime)}`;
    }

    for (let i = window.parsedLines.length - 1; i >= 0; i--) {
        if (window.parsedLines[i].time !== null && curTime >= window.parsedLines[i].time) {
            const activePreview = document.getElementById('preview-active-line');
            if (activePreview) {
                activePreview.innerText = window.parsedLines[i].text;
            }
            break;
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.uploadedAudio) {
        window.uploadedAudio.addEventListener('timeupdate', checkSyncedLyricHighlight);
    }
});
