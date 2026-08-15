// ==================== HAQIQIY REKLAMA VA DAROMAD MODULI ====================
let userBalance = parseFloat(localStorage.getItem('vibe_balance') || '0.00');

// Adsgram Controller (Hozircha test Block ID bilan, keyin o'zingiznikini qo'yasiz)
const AdController = window.Adsgram ? window.Adsgram.init({ blockId: "int-6842" }) : null;

function watchRewardedAd() {
    const btn = document.querySelector('#earn-modal button');
    
    if (AdController) {
        btn.innerHTML = "⏳ Reklama yuklanmoqda...";
        btn.disabled = true;

        AdController.show().then((result) => {
            // FOYDALANUVCHI REKLAMANI TO'LIQ KO'RGANDA
            giveRandomReward();
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        }).catch((error) => {
            // REKLAMA BEKOR QILINSA YOKI XATOLIK BO'LSA
            alert("⚠️ Reklamani oxirigacha ko'rmadingiz yoki internetda uzilish bo'ldi!");
            btn.innerHTML = "▶️ ПОСМОТРЕТЬ РЕКЛАМУ";
            btn.disabled = false;
        });
    } else {
        // Agar Telegram brauzerida Adsgram ochilmasa (Fallback)
        giveRandomReward();
    }
}

// RANDOM PUL BERISH ($0.01 dan $0.50 gacha)
function giveRandomReward() {
    // Ehtimollik bo'yicha turli xil yutuqlar
    const chances = [0.01, 0.01, 0.01, 0.02, 0.03, 0.05, 0.10, 0.50];
    const reward = chances[Math.floor(Math.random() * chances.length)];

    userBalance += reward;
    localStorage.setItem('vibe_balance', userBalance.toFixed(2));

    // Ekrandagi barcha balanslarni yangilash
    updateAllBalanceUI();

    alert(`🎉 Tabriklaymiz! Sizga +$${reward.toFixed(2)} taqdim etildi!`);
}

function updateAllBalanceUI() {
    const balFormatted = `$${userBalance.toFixed(2)}`;
    if (document.getElementById('user-balance-header')) document.getElementById('user-balance-header').innerText = balFormatted;
    if (document.getElementById('earn-modal-balance')) document.getElementById('earn-modal-balance').innerText = balFormatted;
    if (document.getElementById('wallet-total-balance')) document.getElementById('wallet-total-balance').innerText = balFormatted;
}

// Sahifa ochilganda balansni yuklash
document.addEventListener('DOMContentLoaded', () => {
    updateAllBalanceUI();
});
