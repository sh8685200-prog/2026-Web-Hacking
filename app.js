document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            alert('환영합니다! 어떤 새로운 기능을 만들어 볼까요?');
        });
    }
});
