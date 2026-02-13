// Logique de recherche avancée sur la page des vols (flights.html)
// - Recherche en temps réel avec debounce
// - Cache frontend intelligent
// - Tri dynamique par prix
// - Pagination infinie (infinite scroll)
// - Synchronisation des filtres avec l'URL

// Cache en mémoire des résultats de vols
const volCache = {};

// Pagination & état global
let currentPage = 1;
let isLoading = false;
let hasMore = true;

// Base URL de l'API FastAPI pour la recherche de vols (endpoint paginé)
const FLIGHTS_API_BASE_URL = `${API_BASE_URL}/flights/`;

/**
 * Debounce utilitaire
 * @param {Function} func
 * @param {number} delay
 * @returns {Function}
 */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Lit les paramètres de la query string.
 */
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        depart: params.get("depart") || "",
        arrivee: params.get("arrivee") || "",
        date: params.get("date") || "",
        sort: params.get("sort") || "price_asc"
    };
}

/**
 * Met à jour l'URL sans recharger la page.
 */
function syncUrlWithFilters(filters) {
    const params = new URLSearchParams();

    if (filters.depart) params.set("depart", filters.depart);
    if (filters.arrivee) params.set("arrivee", filters.arrivee);
    if (filters.date) params.set("date", filters.date);
    if (filters.sort) params.set("sort", filters.sort);

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
}

/**
 * Récupère les références vers les éléments du DOM utilisés sur la page vols.
 */
function getVolsPageElements() {
    const departInput = document.getElementById("departure-city");
    const arriveeInput = document.getElementById("arrival-city");
    const dateInput = document.getElementById("vol-date") || document.querySelector('input[type="date"]');

    const filtersForm = document.getElementById("volsFilterForm") || document.querySelector(".vols-filter-form");
    const volsContainer = document.getElementById("volsContainer");
    const errorContainer = document.getElementById("volsError");

    const sortSelect = document.getElementById("sortSelect");
    const resetButton = document.getElementById("resetFilters");

    return {
        departInput,
        arriveeInput,
        dateInput,
        filtersForm,
        volsContainer,
        errorContainer,
        sortSelect,
        resetButton,
    };
}

/**
 * Affiche un message d'erreur (ou d'information).
 */
function showError(message) {
    const { errorContainer } = getVolsPageElements();
    if (!errorContainer) {
        console.error(message);
        return;
    }

    errorContainer.textContent = message;
    errorContainer.classList.remove("d-none");
}

/**
 * Efface les messages d'erreur.
 */
function clearError() {
    const { errorContainer } = getVolsPageElements();
    if (!errorContainer) return;
    errorContainer.textContent = "";
    errorContainer.classList.add("d-none");
}

/**
 * Rend ou ajoute les cartes de vols dans le conteneur dédié.
 * @param {Array} vols
 * @param {boolean} append
 */
function renderVols(vols, append = false) {
    const { volsContainer } = getVolsPageElements();
    if (!volsContainer) return;

    if (!append) {
        volsContainer.innerHTML = "";
    }

    if (!vols || vols.length === 0) {
        if (!append) {
            volsContainer.innerHTML = `
                <div class="alert alert-info" role="alert">
                    Aucun vol trouvé pour ces critères.
                </div>
            `;
        }
        return;
    }

    const cardsHtml = vols
        .map((vol) => {
            const {
                id,
                ville_depart,
                ville_arrivee,
                date_depart,
                heure_depart,
                date_arrivee,
                heure_arrivee,
                prix,
                statut,
                avion,
                // compat: certaines réponses peuvent déjà exposer compagnie / modele en racine
                compagnie: flatCompagnie,
                modele: flatModele,
            } = vol;

            const isActif = !statut || statut.toLowerCase() === "actif";

            // On affecte directement les valeurs venant de la base :
            // 1) avion.compagnie / avion.modele si l'objet avion est présent
            // 2) sinon, on regarde les champs à plat (flatCompagnie / flatModele)
            const compagnie =
                (avion && avion.compagnie) ||
                flatCompagnie ||
                "Non spécifié";

            const modele =
                (avion && avion.modele) ||
                flatModele ||
                "Non spécifié";

            const arrivalInfo =
                date_arrivee && heure_arrivee
                    ? ` &nbsp;→&nbsp; <strong>${date_arrivee}</strong> à <strong>${heure_arrivee}</strong>`
                    : "";

            return `
                <div class="card flight-card mb-3 shadow-sm reveal">
                    <div class="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center">
                        <div class="d-flex align-items-center mb-3 mb-md-0 flight-main-info">
                            <div class="flight-airline-icon me-3">
                                <span>${compagnie.charAt(0)}</span>
                            </div>
                            <div>
                                <h5 class="card-title mb-1">${ville_depart} → ${ville_arrivee}</h5>
                                <p class="mb-1 text-muted flight-airline-text">
                                    <strong>Compagnie :</strong>
                                    <span class="badge bg-primary ms-1">${compagnie}</span>
                                    ${modele ? ` · <span class="text-muted">Modèle :</span> ${modele}` : ""}
                                </p>
                                <p class="mb-0 flight-datetime">
                                    <strong>${date_depart}</strong> à <strong>${heure_depart}</strong>${arrivalInfo}
                                </p>
                            </div>
                        </div>
                        <div class="text-md-right flight-price-block">
                            <div class="h4 mb-2">${prix} $</div>
                            <button
                                class="btn btn-primary flight-book-btn"
                                ${isActif ? "" : "disabled"}
                                data-vol-id="${id || ""}"
                            >
                                Réserver
                            </button>
                            ${!isActif ? '<div class="small text-muted mt-1">Indisponible</div>' : ""}
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");

    if (append) {
        volsContainer.insertAdjacentHTML("beforeend", cardsHtml);
    } else {
        volsContainer.innerHTML = cardsHtml;
    }
}

/**
 * Construit la clé de cache à partir des critères.
 */
function buildVolKey(filters) {
    const { depart, arrivee, date, sort, page } = filters;
    return [
        depart || "",
        arrivee || "",
        date || "",
        sort || "",
        String(page || 1)
    ].join("-");
}

/**
 * Construit l'objet de filtres courant à partir des inputs.
 */
function getCurrentFilters() {
    const {
        departInput,
        arriveeInput,
        dateInput,
        sortSelect
    } = getVolsPageElements();

    return {
        depart: departInput ? departInput.value : "",
        arrivee: arriveeInput ? arriveeInput.value : "",
        date: dateInput ? dateInput.value : "",
        sort: sortSelect ? sortSelect.value || "price_asc" : "price_asc",
        page: currentPage,
    };
}

/**
 * Appelle l’API FastAPI ou renvoie le cache si disponible.
 */
async function fetchVols({ append = false } = {}) {
    if (isLoading) return;

    const filters = getCurrentFilters();

    clearError();

    // Empêche la recherche avec même ville de départ et d'arrivée
    if (filters.depart && filters.arrivee && filters.depart === filters.arrivee) {
        showError("La ville de départ et la destination doivent être différentes.");
        return;
    }

    const key = buildVolKey(filters);

    if (!append && volCache[key]) {
        const cached = volCache[key];
        hasMore = cached.has_more;
        renderVols(cached.data, false);
        return;
    }

    isLoading = true;

    try {
        const params = new URLSearchParams();
        if (filters.depart) params.append("depart", filters.depart);
        if (filters.arrivee) params.append("arrivee", filters.arrivee);
        if (filters.date) params.append("date", filters.date);
        if (filters.sort) params.append("sort", filters.sort);

        params.append("page", String(filters.page));
        params.append("limit", "10");

        // Synchronisation URL (sans param de page pour rester propre)
        syncUrlWithFilters(filters);

        const response = await fetch(`${FLIGHTS_API_BASE_URL}?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Erreur serveur (${response.status})`);
        }

        const json = await response.json();

        // Compatibilité : accepte soit un tableau brut, soit un objet paginé { data, has_more }
        const vols = Array.isArray(json) ? json : (json.data || []);

        hasMore = Array.isArray(json) ? vols.length === 10 : Boolean(json.has_more);

        volCache[key] = {
            data: vols,
            has_more: hasMore,
        };

        renderVols(vols, append);
        if (typeof setupScrollAnimations === 'function') setupScrollAnimations();
    } catch (error) {
        console.error("Erreur lors de la recherche de vols", error);
        showError("Une erreur est survenue lors de la recherche de vols. Veuillez réessayer.");
    } finally {
        isLoading = false;
    }
}

/**
 * Charge la page suivante (infinite scroll).
 */
function loadMoreVols() {
    if (!hasMore || isLoading) return;
    currentPage += 1;
    fetchVols({ append: true });
}

/**
 * Crée dynamiquement les contrôles supplémentaires (tri, prix min/max, reset).
 */
function ensureExtraControls() {
    const { filtersForm } = getVolsPageElements();
    if (!filtersForm) return;

    // Tri
    if (!document.getElementById("sortSelect")) {
        const sortGroup = document.createElement("div");
        sortGroup.className = "mb-3";
        sortGroup.innerHTML = `
            <label class="form-label" for="sortSelect">Tri</label>
            <select id="sortSelect" class="form-select">
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
            </select>
        `;
        filtersForm.appendChild(sortGroup);
    }

    // Bouton reset
    if (!document.getElementById("resetFilters")) {
        const resetWrapper = document.createElement("div");
        resetWrapper.className = "d-flex justify-content-between align-items-center mt-2";
        resetWrapper.innerHTML = `
            <button id="resetFilters" type="button" class="btn btn-outline-secondary btn-sm">
                Effacer les filtres
            </button>
        `;
        filtersForm.appendChild(resetWrapper);
    }
}

/**
 * Réinitialise les filtres et recharge les vols.
 */
function resetFilters() {
    const {
        departInput,
        arriveeInput,
        dateInput,
        sortSelect
    } = getVolsPageElements();

    if (departInput) departInput.value = "";
    if (arriveeInput) arriveeInput.value = "";
    if (dateInput) dateInput.value = "";
    if (sortSelect) sortSelect.value = "price_asc";

    currentPage = 1;
    hasMore = true;

    // Efface les query params (on reste sur flights.html)
    window.history.replaceState({}, "", window.location.pathname);

    // Recharge tous les vols actifs
    fetchVols({ append: false });
}

/**
 * Pré-remplit le formulaire à partir des query params.
 */
function populateVolsFormFromQuery() {
    const params = getQueryParams();
    const {
        departInput,
        arriveeInput,
        dateInput,
        sortSelect
    } = getVolsPageElements();

    if (departInput && params.depart) departInput.value = params.depart;
    if (arriveeInput && params.arrivee) arriveeInput.value = params.arrivee;
    if (dateInput && params.date) dateInput.value = params.date;
    if (sortSelect && params.sort) sortSelect.value = params.sort;
}

/**
 * Initialise la page vols : filtres, recherche auto, infinite scroll.
 */
function initVolsPage() {
    const {
        departInput,
        arriveeInput,
        dateInput,
        filtersForm,
    } = getVolsPageElements();

    const volsContainer = document.getElementById("volsContainer");
    if (!volsContainer) {
        return;
    }

    // Crée dynamiquement les contrôles avancés
    ensureExtraControls();

    // On relit après création
    const {
        sortSelect,
        resetButton,
    } = getVolsPageElements();

    // Pré-remplit à partir de l'URL
    populateVolsFormFromQuery();

    // Recherche débouncée (~450ms)
    const debouncedSearch = debounce(() => {
        currentPage = 1;
        hasMore = true;
        fetchVols({ append: false });
    }, 450);

    // Recherche en temps réel : input
    if (filtersForm) {
        filtersForm.addEventListener("input", (event) => {
            const target = event.target;
            if (
                target === departInput ||
                target === arriveeInput
            ) {
                debouncedSearch();
            }
        });
    }

    // Date + tri sur change
    if (dateInput) {
        dateInput.addEventListener("change", debouncedSearch);
    }
    if (sortSelect) {
        sortSelect.addEventListener("change", debouncedSearch);
    }

    // Bouton reset
    if (resetButton) {
        resetButton.addEventListener("click", resetFilters);
    }

    // Infinite scroll
    window.addEventListener("scroll", () => {
        if (
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
            !isLoading &&
            hasMore
        ) {
            loadMoreVols();
        }
    });

    // Bouton "Réserver"
    volsContainer.addEventListener("click", (event) => {
        const btn = event.target.closest(".flight-book-btn");
        if (!btn) return;
        const id = btn.getAttribute("data-vol-id");
        if (!id) return;

        // Vérifie si l'utilisateur est connecté avant d'aller à la confirmation
        const token = localStorage.getItem("jetcongo_token");
        if (!token) {
            // Si pas connecté → redirection vers la page de login
            window.location.href = "login.html";
            return;
        }

        // Utilisateur connecté → on passe à la page de confirmation de réservation
        window.location.href = `booking.html?volId=${encodeURIComponent(id)}`;
    });

    // Recherche initiale (avec éventuels filtres URL)
    fetchVols({ append: false });
}

// Auto-init uniquement si la page contient le conteneur des vols
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("volsContainer")) {
        initVolsPage();
    }
});

