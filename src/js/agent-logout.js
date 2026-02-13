// Fonction de déconnexion unifiée pour les agents
document.addEventListener('DOMContentLoaded', () => {
    console.log('Flight Agent Logout script loaded');
    const logoutBtn = document.getElementById('agent-logout-btn');
    if (logoutBtn) {
        console.log('Logout button found');
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Logout clicked');
            if (true) { // Confirmation simplified for direct execution or replaced by UI logic later
                // Supprimer le token
                localStorage.removeItem('jetcongo_token');
                console.log('Token removed');

                // Rediriger vers la page de login
                window.location.href = 'login.html';
            }
        });
    } else {
        console.warn('Logout button NOT found in DOM');
    }
});
