// Logique de recherche sur la page d'accueil (index.html)
// Ne modifie pas le HTML ni les classes Bootstrap : on se branche uniquement sur les IDs / classes existants.

/**
 * Récupère les éléments du formulaire de recherche de la home.
 * On utilise les IDs/class déjà présents dans le HTML.
 */
function getHomeSearchElements() {
    const departureSelect = document.getElementById('departure-city');
    const arrivalSelect = document.getElementById('arrival-city');
    const dateInput = document.querySelector('.search-grid input[type="date"]');
    const searchButton = document.querySelector('.search-grid .btn-search');

    return { departureSelect, arrivalSelect, dateInput, searchButton };
}

/**
 * Gère le clic sur le bouton "Rechercher un vol" de la home.
 * Construit l'URL avec query params et redirige vers flights.html.
 */
function handleHomeSearchClick(event) {
    event.preventDefault();

    const { departureSelect, arrivalSelect, dateInput } = getHomeSearchElements();
    if (!departureSelect || !arrivalSelect || !dateInput) {
        console.warn('Formulaire de recherche introuvable sur la home.');
        return;
    }

    const depart = departureSelect.value;
    const arrivee = arrivalSelect.value;
    const date = dateInput.value;

    // Simple validation UX de base
    if (!depart || !arrivee) {
        if (typeof showNotification === 'function') {
            showNotification('Veuillez sélectionner une ville de départ et une ville d’arrivée.', 'error');
        } else {
            console.error('Validation recherche vols:', 'Veuillez sélectionner une ville de départ et une ville d’arrivée.');
        }
        return;
    }

    // Empêche la recherche avec même ville de départ et d'arrivée
    if (depart === arrivee) {
        if (typeof showNotification === 'function') {
            showNotification('La ville de départ et la destination doivent être différentes.', 'error');
        } else {
            console.error('Validation recherche vols:', 'Départ et destination identiques.');
        }
        return;
    }

    const params = new URLSearchParams({
        depart,
        arrivee,
        date
    });

    // Redirige vers la page des vols en conservant les paramètres encodés
    window.location.href = `flights.html?${params.toString()}`;
}

/**
 * Initialise la logique de la home.
 * À appeler après le chargement du DOM.
 */
function initHomeSearch() {
    const { searchButton } = getHomeSearchElements();
    if (!searchButton) return;

    // Intercepte le clic sur le bouton (il agit comme submit)
    searchButton.addEventListener('click', handleHomeSearchClick);
}

// Auto-init uniquement si on est sur la home (index.html)
document.addEventListener('DOMContentLoaded', function () {
    // On vérifie la présence du bouton pour éviter d'exécuter ce code sur d'autres pages.
    const searchButton = document.querySelector('.search-grid .btn-search');
    if (searchButton) {
        initHomeSearch();
    }
});

