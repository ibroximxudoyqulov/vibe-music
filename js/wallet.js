// ==================== NAVIGATION & MODALS ENGINE ====================

window.openEarnAdsModal = function() {
    const modal = document.getElementById('earn-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeEarnAdsModal = function() {
    const modal = document.getElementById('earn-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.openWalletModal = function() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeWalletModal = function() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.requestPayout = function() {
    const amount = parseFloat(document.getElementById('payout-amount').value);
    const account = document.getElementById('payout-account').value;
    const system = document.getElementById('payout-system').value;
    const currentBal = parseFloat(localStorage.getItem('vibe_balance') || '0.00');

    if (!account) {
        alert("⚠️ Iltimos, hisob yoki karta raqamingizni kiriting!");
        return;
    }
    if (isNaN(amount) || amount < 2.0) {
        alert("⚠️ Minimal yechish summasi: $2.00");
        return;
    }
    if (amount > currentBal) {
        alert("⚠️ Balansingizda yetarli mablag' yo'q!");
        return;
    }

    const newBal = currentBal - amount;
    localStorage.setItem('vibe_balance', newBal.toFixed(2));
    if (window.updateAllBalanceUI) window.updateAllBalanceUI();

    alert(`✅ So'rov qabul qilindi!\nSumma: $${amount.toFixed(2)}\nTizim: ${system}\nPullar 1-24 soat ichida kartangizga tushadi!`);
    closeWalletModal();
};
