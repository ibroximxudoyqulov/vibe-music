// ==================== AESTHETIC TEXT COLOR PALETTE ENGINE ====================
window.activeLyricsColor = "#ffffff"; // Default oq

window.setLyricsColor = function(color) {
    window.activeLyricsColor = color;

    const previewBox = document.getElementById('spotify-lyrics-scroll');
    if (previewBox) {
        const activeLine = previewBox.querySelector('p.font-extrabold');
        if (activeLine) {
            activeLine.style.color = color;
        }
    }

    document.querySelectorAll('.color-preset-btn').forEach(btn => {
        btn.classList.remove('ring-4', 'ring-white', 'scale-110');
    });

    const cleanHex = color.replace('#', '');
    const activeBtn = document.getElementById(`color-btn-${cleanHex}`);
    if (activeBtn) {
        activeBtn.classList.add('ring-4', 'ring-white', 'scale-110');
    }
};

window.onCustomColorChange = function(input) {
    window.setLyricsColor(input.value);
};
