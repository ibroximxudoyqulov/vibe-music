// ==================== AI LYRICS, VOICE RECORDER & MIXER ENGINE (js/aimusic.js) ====================

window.aiSelectedLang = 'uz';
window.aiSelectedCategory = null;
window.userRecordedAudioBlob = null;
let mediaRecorderInstance = null;
let audioChunks = [];
let isRecordingVoice = false;

// 6 TA KATEGORIYADAGI PROFESSIONAL QO'SHIQ MATNLARI BAZASI
const AI_LYRICS_DATABASE = {
    uz: {
        love: [
            "Yuragim tubida qolding bir o'zing,\nKuzgi barglardek to'kildi so'zing.\nKutaman hamon o'sha yo'llarda,\nIsming jaranglar mayin kuylarda.",
            "Kechalari bedor o'ylayman seni,\nNahot unutding sevgilim meni?\nSensiz bu dunyo menga begona,\nQalbim sen uchun bo'ldi devona."
        ],
        motivation: [
            "Yiqilsang ham qayta tur, to'xtama aslo,\nOldinda kutyapti g'alaba, dunyo!\nQiyinchiliklar ortda qoladi,\nSabr qilganlar qadr topadi.",
            "Qora bulutlar tarqalar bir kun,\nYulduzlar charx urar sen uchun bugun.\nOrzuing sari olg'a qadam bos,\nBu hayot faqat kuchlilarga mos!"
        ],
        heart: [
            "Taqdir sinovlari kelganda qator,\nDo'st qadrin bilinar ekan har bahor.\nKimdir yonimda, kimdir yiroqda,\nLekin qalbimiz bitta o'choqda."
        ],
        family: [
            "Onam duolari asraydi mudom,\nOtamning so'zlari menga intizom.\nOila baxtimdir, mening qo'rg'onim,\nSizlar borsizlar omon bu jonim."
        ],
        phonk: [
            "Tungi shahar, neon chiroqlar yonadi,\nTezlik 200, motor ovozi qoladi.\nHech kim to'xtatolmas bizning yo'limiz,\nBaland baslarda urar ko'nglimiz."
        ],
        friends: [
            "Yillar o'tsa ham o'zgarmas do'stlar,\nQiyin damda ham qadrdon ko'zlar.\nBrodski mehr hech qachon so'nmas,\nHaqiqiy do'stlar bir-birin sotmas."
        ]
    },
    ru: {
        love: [
            "В темноте ночной я ищу твой след,\nБез тебя померк этот яркий свет.\nТы осталась в сердце навсегда,\nКак на небе яркая звезда.",
            "Снова дождь стучит в мое окно,\nМы не вместе, но мне не все равно.\nЯ храню в душе твои слова,\nОт любви кружится голова."
        ],
        motivation: [
            "Не смей сдаваться, иди вперед,\nТебя победа на вершине ждет!\nСквозь бури, грозы и туман,\nТы сокрушишь любой обман.",
            "Пусть говорят, что шансов нет,\nВ твоих глазах горит рассвет.\nБорись за цель, держи удар,\nВнутри тебя горит пожар!"
        ],
        heart: [
            "Жизнь научила верить делам,\nНе отдавать душу ветрам.\nКто был со мной в самый трудный час,\nТот дорог мне и дорог сейчас."
        ],
        family: [
            "Молитва мамы защитит в пути,\nС ней легче эту жизнь пройти.\nСемья — мой дом, моя броня,\nВ ней сила и покой для меня."
        ],
        phonk: [
            "Ночной дрифт, дым из-под колес,\nБасс рвет динамики всерьез.\nСкорость в крови, летим вперед,\nНикто нас больше не вернет."
        ],
        friends: [
            "Сквозь года и расстояния,\nМы прошли все испытания.\nВерный друг всегда поймет,\nРуку в трудный миг подаст."
        ]
    },
    en: {
        love: [
            "Lost in the shadows of your eyes,\nUnderneath the midnight skies.\nEvery word you said is true,\nMy whole world belongs to you."
        ],
        motivation: [
            "Rise up again and break the chains,\nThere is no glory without pain.\nKeep moving forward, reach the light,\nYou're born to win this endless fight."
        ],
        heart: [
            "Deep in my soul the fire burns,\nWith every page the story turns.\nI found my peace inside the sound,\nWhere all my broken dreams are found."
        ],
        family: [
            "A mother's love, a father's hand,\nThe strongest ground on which I stand.\nFamily is forever true,\nEverything I do is for you."
        ],
        phonk: [
            "Midnight cruising in the rain,\nHeavy bass relieves the pain.\nNeon lights across the street,\nMoving to the cyber beat."
        ],
        friends: [
            "Through the darkness, through the storm,\nTrue friendship keeps the spirit warm.\nSide by side until the end,\nI'm proud to call you my best friend."
        ]
    }
};

// 1. AI MATN NAVIGATSIYASI
window.openAiLyricsFlow = function() {
    document.getElementById('ai-step-category').classList.add('hidden');
    document.getElementById('ai-step-result').classList.add('hidden');
    document.getElementById('ai-step-lang').classList.remove('hidden');
    document.getElementById('ai-lyrics-modal').classList.remove('hidden');
};

window.closeAiLyricsFlow = function() {
    document.getElementById('ai-lyrics-modal').classList.add('hidden');
};

window.selectAiLang = function(lang) {
    window.aiSelectedLang = lang;
    document.getElementById('ai-step-lang').classList.add('hidden');
    document.getElementById('ai-step-category').classList.remove('hidden');
};

window.selectAiCategory = function(cat) {
    window.aiSelectedCategory = cat;
    const langData = AI_LYRICS_DATABASE[window.aiSelectedLang] || AI_LYRICS_DATABASE['uz'];
    const lyricsList = langData[cat] || langData['love'];
    
    // Tasodifiy matn tanlash
    const chosenText = lyricsList[Math.floor(Math.random() * lyricsList.length)];

    document.getElementById('ai-result-textarea').value = chosenText;
    document.getElementById('ai-step-category').classList.add('hidden');
    document.getElementById('ai-step-result').classList.remove('hidden');
};

window.applyAiLyricsToStudio = function() {
    const text = document.getElementById('ai-result-textarea').value;
    const targetInput = document.getElementById('raw-lyrics-input');
    if (targetInput) {
        targetInput.value = text;
        window.parseLyricsForSync();
    }
    closeAiLyricsFlow();
    alert("🎉 AI Matn studiyaga muvaffaqiyatli joylandi!");
};

// 2. MIKROFON ORQALI OVOZ YOZISH (VOICE RECORDER)
window.toggleVoiceRecording = async function() {
    const btn = document.getElementById('btn-voice-record');
    const status = document.getElementById('voice-record-status');

    if (!isRecordingVoice) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderInstance = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorderInstance.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorderInstance.onstop = () => {
                window.userRecordedAudioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const recordedUrl = URL.createObjectURL(window.userRecordedAudioBlob);
                
                const previewAudio = document.getElementById('recorded-voice-preview');
                if (previewAudio) {
                    previewAudio.src = recordedUrl;
                    document.getElementById('recorded-voice-box').classList.remove('hidden');
                }
                status.innerText = "✅ Ovoz yozib olindi!";
                btn.classList.remove('bg-red-600', 'animate-pulse');
                btn.classList.add('bg-gray-800');
            };

            mediaRecorderInstance.start();
            isRecordingVoice = true;
            btn.classList.add('bg-red-600', 'animate-pulse');
            status.innerText = "🔴 Ovoz yozilmoqda... (To'xtatish uchun bosing)";

            // Agar musiqa yuklangan bo'lsa, fon sifatida birga o'ynaydi
            if (window.vibeAudioElement && window.vibeAudioElement.src) {
                window.vibeAudioElement.currentTime = 0;
                window.vibeAudioElement.play();
            }
        } catch (err) {
            alert("⚠️ Mikrofonga ruxsat berilmadi!");
        }
    } else {
        if (mediaRecorderInstance) mediaRecorderInstance.stop();
        if (window.vibeAudioElement) window.vibeAudioElement.pause();
        isRecordingVoice = false;
    }
};

// 3. TIKTOK PROMO BUYURTMA VA TELEGRAM STARS (⭐)
window.orderTikTokPromotion = function() {
    const caption = prompt("TikTok @ms.music_uz tavsifiga (opisanie) nima yozaylik? (Ismingiz, shahringiz va buyurtma matni):");
    if (!caption) return;

    alert("⭐ Buyurtmangiz qabul qilinmoqda... Botingizga to'lov uchun Stars yuborildi!");
    
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    if (tg) {
        tg.sendData(JSON.stringify({
            action: "tiktok_promo_order",
            caption: caption
        }));
    }
};
