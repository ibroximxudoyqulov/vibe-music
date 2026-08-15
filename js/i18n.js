// ==========================================
// MICRO-FILE: MULTI-LANGUAGE CONTROLLER (UZ / RU)
// ==========================================

let currentLang = localStorage.getItem('vibe_lang') || 'ru';
let currentDictionary = {};

async function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('vibe_lang', lang);

    try {
        const res = await fetch(`locales/${lang}.json`);
        if (res.ok) {
            currentDictionary = await res.json();
            applyLanguageToDOM();
        }
    } catch (e) {
        console.log("Language load error:", e);
    }
}

function applyLanguageToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (currentDictionary[key]) {
            if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                elem.placeholder = currentDictionary[key];
            } else {
                elem.innerText = currentDictionary[key];
            }
        }
    });

    // Til tugmalari dizaynini yangilash
    const btnUz = document.getElementById('btn-lang-uz');
    const btnRu = document.getElementById('btn-lang-ru');
    if (btnUz && btnRu) {
        if (currentLang === 'uz') {
            btnUz.className = 'px-3 py-1 bg-brand-red text-white text-xs font-bold rounded-xl active:scale-95 transition';
            btnRu.className = 'px-3 py-1 bg-brand-input text-gray-400 text-xs font-semibold rounded-xl border border-gray-800 active:scale-95 transition';
        } else {
            btnRu.className = 'px-3 py-1 bg-brand-red text-white text-xs font-bold rounded-xl active:scale-95 transition';
            btnUz.className = 'px-3 py-1 bg-brand-input text-gray-400 text-xs font-semibold rounded-xl border border-gray-800 active:scale-95 transition';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
});
