// ==========================================
// MICRO-FILE: WALLET & SNG CARD WITHDRAWALS
// ==========================================

let userBalance = parseFloat(localStorage.getItem('vibe_balance')) || 0.00;

function openWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        updateBalanceUI();
    }
}

function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function updateBalanceUI() {
    const formatted = `$${userBalance.toFixed(2)}`;
    const headBal = document.getElementById('user-balance-header');
    const earnBal = document.getElementById('earn-modal-balance');
    const wallBal = document.getElementById('wallet-total-balance');

    if (headBal) headBal.innerText = formatted;
    if (earnBal) earnBal.innerText = formatted;
    if (wallBal) wallBal.innerText = formatted;
}

function requestPayout() {
    const system = document.getElementById('payout-system').value;
    const account = document.getElementById('payout-account').value.trim();
    const amountInput = document.getElementById('payout-amount').value;
    const amount = parseFloat(amountInput);

    const isUz = (currentLang === 'uz');

    if (!account) {
        return alert(isUz ? "Iltimos, karta yoki telefon raqamingizni kiriting!" : "Пожалуйста, введите номер карты или телефона!");
    }

    if (isNaN(amount) || amount < 2.00) {
        return alert(isUz ? "Minimal yechish summasi: $2.00 (20 Somoni / 25,000 UZS)" : "Минимальная сумма для вывода: $2.00");
    }

    if (amount > userBalance) {
        return alert(isUz ? "Hisobingizda mablag' yetarli emas!" : "Недостаточно средств на балансе!");
    }

    // Balansdan yechish
    userBalance -= amount;
    localStorage.setItem('vibe_balance', userBalance.toFixed(2));
    updateBalanceUI();
    closeWalletModal();

    const msg = isUz 
        ? `✅ $${amount.toFixed(2)} miqdoridagi so'rov qabul qilindi!\nTo'lov tizimi: ${system.toUpperCase()} (${account})\nPul 15 daqiqa ichida kartangizga tushadi.`
        : `✅ Заявка на вывод $${amount.toFixed(2)} принята!\nСистема: ${system.toUpperCase()} (${account})\nДеньги поступят в течение 15 минут.`;

    alert(msg);
}

document.addEventListener('DOMContentLoaded', () => {
    updateBalanceUI();
});
