// ==================== STRICT ADSGRAM REWARDED ADS ENGINE ====================
let userBalance = parseFloat(localStorage.getItem('vibe_balance') || '0.00');

// Siz partner.adsgram.ai dan olgan Block ID'ingizni shu yerga yozasiz:
const ADSGRAM_BLOCK_ID = "43028"; 

let AdController = null;
if (window.Adsgram) {
    try {
        AdController = window.Adsgram.init({ blockId: 43028 });
    } catch (e) {
        console.log("Adsgram Init Error:", e);
    }
}

// Reklama ko'rish tugmasi
window.watchRewardedAd = function() {
    const btn = document.querySelector('#earn-modal button');
    
    if (AdController) {
        btn.innerHTML = "⏳ Reklama yuklanmoqda...";
        btn.disabled = true;

        AdController.show().then((result) => {
            // FAQATGINA REKLAMANI TO'LIQ KO'RGANDAGINA PUL YOZILADI
            giveRandomReward();
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        }).catch((error) => {
            // AGAR REKLAMA KO'RILMASA YOKI YOPILSA -> UMUMAN PUL BERILMAYDI!
            console.error("Adsgram Error:", error);
            alert("⚠️ Reklama ko'rilmadi yoki internetda xatolik bo'ldi. Hisobingizga pul qo'shilmadi!");
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        });
    } else {
        alert("⚠️ Reklama tarmog'i hali ulanmagan. Iltimos, keyinroq urinib ko'ring!");
    }
};

// RANDOM PUL BERISH ($0.01 dan $0.50 gacha)
function giveRandomReward() {
    const chances = [0.01, 0.01, 0.02, 0.03, 0.05, 0.10, 0.25, 0.50];
    const reward = chances[Math.floor(Math.random() * chances.length)];

    userBalance += reward;
    localStorage.setItem('vibe_balance', userBalance.toFixed(2));

    updateAllBalanceUI();

    alert(`🎉 Tabriklaymiz! Siz reklamani to'liq ko'rdingiz va hisobingizga +$${reward.toFixed(2)} qo'shildi!`);
}

window.updateAllBalanceUI = function() {
    const balFormatted = `$${userBalance.toFixed(2)}`;
    if (document.getElementById('user-balance-header')) document.getElementById('user-balance-header').innerText = balFormatted;
    if (document.getElementById('earn-modal-balance')) document.getElementById('earn-modal-balance').innerText = balFormatted;
    if (document.getElementById('wallet-total-balance')) document.getElementById('wallet-total-balance').innerText = balFormatted;
};

document.addEventListener('DOMContentLoaded', () => {
    updateAllBalanceUI();
});
