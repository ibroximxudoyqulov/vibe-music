// ==========================================
// MICRO-FILE: 70+ FONTS & CUSTOM BG UPLOADER
// (UMUMAN TAYYOR SOXTA FONLARSIZ!)
// ==========================================

let hasVinyl = false;
let hasSpectrum = false;

// 70+ Shriftlarni almashtirish
function updatePreviewFont(fontName) {
    const activeLine = document.getElementById('preview-active-line');
    if (activeLine) {
        activeLine.style.fontFamily = fontName;
    }
}

// O'z telefonidan yoki Bot orqali fon yuklash (100% Haqiqiy!)
function handleCustomBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const bgUrl = URL.createObjectURL(file);
        const previewBox = document.getElementById('video-canvas-preview');
        if (previewBox) {
            previewBox.style.backgroundImage = `url('${bgUrl}')`;
            previewBox.style.backgroundSize = 'cover';
            previewBox.style.backgroundPosition = 'center';
        }
        const bgNameElem = document.getElementById('custom-bg-name');
        if (bgNameElem) bgNameElem.innerText = file.name;
    }
}

// Aylanuvchi Vinil Diska effekti
function toggleVinylEffect() {
    hasVinyl = !hasVinyl;
    const box = document.getElementById('preview-vinyl-box');
    const btn = document.getElementById('btn-vinyl');
    if (box && btn) {
        if (hasVinyl) {
            box.classList.remove('hidden');
            btn.classList.add('border-brand-red', 'text-brand-red');
        } else {
            box.classList.add('hidden');
            btn.classList.remove('border-brand-red', 'text-brand-red');
        }
    }
}

// Bas Ekvalayzer to'lqinlari effekti
function toggleSpectrumEffect() {
    hasSpectrum = !hasSpectrum;
    const box = document.getElementById('preview-spectrum-box');
    const btn = document.getElementById('btn-spectrum');
    if (box && btn) {
        if (hasSpectrum) {
            box.classList.remove('hidden');
            box.classList.add('flex');
            btn.classList.add('border-brand-cyan', 'text-brand-cyan');
        } else {
            box.classList.add('hidden');
            box.classList.remove('flex');
            btn.classList.remove('border-brand-cyan', 'text-brand-cyan');
        }
    }
}
