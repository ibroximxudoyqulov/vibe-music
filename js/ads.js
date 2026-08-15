// ==================== ADSGRAM REWARDED ADS & WALLET ENGINE ====================
let userBalance = parseFloat(localStorage.getItem('vibe_balance') || '0.00');

// Adsgram rasmiy Rewarded Video Blok IDsi (yoki o'zingizning Adsgram ID'ingiz)
const ADSGRAM_BLOCK_ID = "594"; // Rasmiy test bloki

let AdController = null;
if (window.Adsgram) {
    try {
        AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
    } catch (e) {
        console.log("Adsgram init:", e);
    }
}

// Reklama ko'rish tugmasi
window.watchRewardedAd = function() {
    const btn = document.querySelector('#earn-modal button');
    
    if (AdController) {
        btn.innerHTML = "⏳ Reklama yuklanmoqda...";
        btn.disabled = true;

        AdController.show().then((result) => {
            // REKLAMA TO'LIQ KO'RILDI -> RANDOM PUL BERISH
            giveRandomReward();
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        }).catch((error) => {
            // Reklama topilmasa yoki yopilsa
            console.log("Adsgram error:", error);
            // Foydalanuvchini xafa qilmaslik uchun test mukofoti
            giveRandomReward();
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        });
    } else {
        // Adsgram yuklanmagan bo'lsa
        giveRandomReward();
    }
};

// RANDOM PUL BERISH ($0.01 dan $0.50 gacha)
function giveRandomReward() {
    const chances = [0.01, 0.01, 0.02, 0.03, 0.05, 0.10, 0.25, 0.50];
    const reward = chances[Math.floor(Math.random() * chances.length)];

    userBalance += reward;
    localStorage.setItem('vibe_balance', userBalance.toFixed(2));

    updateAllBalanceUI();

    alert(`🎉 Tabriklaymiz! Sizga +$${reward.toFixed(2)} taqdim etildi!\nJoriy balansingiz: $${userBalance.toFixed(2)}`);
}

window.updateAllBalanceUI = function() {
    const balFormatted = `$${userBalance.toFixed(2)}`;
    if (document.getElementById('user-balance-header')) document.getElementById('user-balance-header').innerText = balFormatted;
    if (document.getElementById('earn-modal-balance')) document.getElementById('earn-modal-balance').innerText = balFormatted;
    if (document.getElementById('wallet-total-balance')) document.getElementById('wallet-total-balance').innerText = balFormatted;
};

// Sahifa yuklanganda balansni ko'rsatish
document.addEventListener('DOMContentLoaded', () => {
    updateAllBalanceUI();
});
