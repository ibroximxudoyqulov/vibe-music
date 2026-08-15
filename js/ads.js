// ==========================================
// MICRO-FILE: WATCH ADS & EARN (65% / 35%)
// ==========================================

function openEarnAdsModal() {
    const modal = document.getElementById('earn-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (window.updateBalanceUI) updateBalanceUI();
    }
}

function closeEarnAdsModal() {
    const modal = document.getElementById('earn-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

function watchRewardedAd() {
    const isUz = (currentLang === 'uz');
    alert(isUz ? "📺 30 soniyalik video reklama ko'rilmoqda..." : "📺 Просмотр 30-секундной рекламы...");

    setTimeout(() => {
        userBalance += 0.01; // Foydalanuvchiga 65% ulush ($0.01) yoziladi
        localStorage.setItem('vibe_balance', userBalance.toFixed(2));
        if (window.updateBalanceUI) updateBalanceUI();

        alert(isUz 
            ? "🎉 Tabriklaymiz! Balansingizga +$0.01 sof pul qo'shildi!" 
            : "🎉 Поздравляем! Вам начислено +$0.01 на баланс!");
    }, 1000);
}

function triggerExport(format) {
    const isUz = (currentLang === 'uz');
    alert(isUz 
        ? `🎬 ${format.toUpperCase()} eksport boshlandi! Video HD sifatda tayyorlanadi.` 
        : `🎬 Экспорт ${format.toUpperCase()} начался! Видео будет сгенерировано в HD качестве.`);
}
