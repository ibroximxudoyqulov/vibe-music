// ==================== ADSGRAM REWARDED ADS ENGINE (BLOCK: 43028) ====================
let userBalance = parseFloat(localStorage.getItem('vibe_balance') || '0.00');
const ADSGRAM_BLOCK_ID = "43028"; // Sizning rasmiy Adsgram Blok ID raqamingiz

window.watchRewardedAd = function() {
    const btn = document.querySelector('#earn-modal button');
    
    // Adsgramni har bosilganda tekshirib ishga tushirish
    if (window.Adsgram) {
        btn.innerHTML = "⏳ Reklama yuklanmoqda...";
        btn.disabled = true;

        const AdController = window.Adsgram.init({ 
    blockId: ADSGRAM_BLOCK_ID,
    debug: true
});

        AdController.show().then((result) => {
            // REKLAMA 100% KO'RILDI -> PUL BERISH
            giveRandomReward();
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        }).catch((error) => {
            console.error("Adsgram xatosi:", error);
            alert("⚠️ Reklama ko'rilmadi yoki yopildi. Hisobingizga pul qo'shilmadi!");
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        });
    } else {
        alert("⚠️ Adsgram tarmog'i yuklanmoqda, iltimos 3 soniyadan keyin qayta bosing!");
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
