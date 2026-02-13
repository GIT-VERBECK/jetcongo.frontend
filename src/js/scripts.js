// JetCongo Global Scripts
// URL de base de l'API FastAPI.
// En local : backend écoutant sur le port 8001.
// En production : remplacer par l'URL Render, par ex. 'https://jetcongo-backend.onrender.com/api/v1'.
const API_BASE_URL = 'http://127.0.0.1:8001/api/v1';

// --- Thème global (light/dark) ---
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('jetcongo_theme', theme);

    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
        icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
}

function initTheme() {
    try {
        const saved = localStorage.getItem('jetcongo_theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        applyTheme(theme);
    } catch (e) {
        // Fallback sans localStorage
        applyTheme('light');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
}

// Simple système de notifications (push) réutilisable
// type: "success" | "error" | "info"
function showNotification(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.minWidth = '260px';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontSize = '0.9rem';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.justifyContent = 'space-between';
    toast.style.gap = '8px';

    let bg = '#1a73e8';
    if (type === 'error') bg = '#d93025';
    if (type === 'success') bg = '#188038';

    toast.style.backgroundColor = bg;

    const text = document.createElement('span');
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.color = '#fff';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '1rem';
    closeBtn.onclick = () => container.removeChild(toast);

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    setTimeout(() => {
        if (container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 4000);
}

// Function to load external components (Header/Footer)
async function loadComponents() {
    try {
        const headerRes = await fetch('../components/header.html');
        const footerRes = await fetch('../components/footer.html');

        if (headerRes.ok) {
            const headerContainer = document.getElementById('header-container');
            if (headerContainer) {
                headerContainer.innerHTML = await headerRes.text();
                updateAuthUI(); // Update UI based on login status

                // ATTACH THEME TOGGLE LISTENER AFTER HEADER IS LOADED
                const themeToggleBtn = document.getElementById('theme-toggle-btn');
                if (themeToggleBtn) {
                    themeToggleBtn.addEventListener('click', toggleTheme);
                }

                // ATTACH HAMBURGER LISTENER
                const hamburgerBtn = document.getElementById('hamburger-btn');
                const navLinks = document.getElementById('nav-links');

                if (hamburgerBtn && navLinks) {
                    hamburgerBtn.addEventListener('click', () => {
                        navLinks.classList.toggle('active');
                        // Change icon?
                        const icon = hamburgerBtn.querySelector('i');
                        if (icon) {
                            if (navLinks.classList.contains('active')) {
                                icon.classList.replace('fa-bars', 'fa-times');
                            } else {
                                icon.classList.replace('fa-times', 'fa-bars');
                            }
                        }
                    });
                }
            } else {
                console.error("Header Container not found in DOM");
            }
        } else {
            console.error("Failed to fetch header.html", headerRes.status, headerRes.statusText);
        }

        if (footerRes.ok) {
            const footerContainer = document.getElementById('footer-container');
            if (footerContainer) footerContainer.innerHTML = await footerRes.text();
        }
    } catch (e) {
        console.error("Error loading components (Header/Footer)", e);
    }
}

// Tab Switching Logic for Flight Search
function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) activeTab.classList.remove('active');
            this.classList.add('active');
        });
    });
}

// Database locale des villes de la RDC
const cities = [
    { name: "Kinshasa", code: "FIH" },
    { name: "Goma", code: "GOM" },
    { name: "Lubumbashi", code: "FBM" },
    { name: "Kisangani", code: "FKI" },
    { name: "Bukavu", code: "BKY" },
    { name: "Mbuji-Mayi", code: "MJM" },
    { name: "Kananga", code: "KGA" },
    { name: "Mbandaka", code: "MDK" },
    { name: "Kindu", code: "KND" },
    { name: "Matadi", code: "MAT" },
    { name: "Kalemie", code: "FMI" },
    { name: "Isiro", code: "IRP" },
    { name: "Bunia", code: "BUN" },
    { name: "Tshikapa", code: "TSH" },
    { name: "Kolwezi", code: "KWZ" },
    { name: "Lodja", code: "LJA" },
    { name: "Gemena", code: "GMA" },
    { name: "Bandundu", code: "FDU" },
    { name: "Bumba", code: "BMB" },
    { name: "Uundu", code: "KND" },
    { name: "Kamina", code: "KMN" },
    { name: "Lisala", code: "LIQ" },
    { name: "Butembo", code: "BEM" },
    { name: "Beni", code: "BNC" }
];

function populateCities() {
    const departureSelect = document.getElementById('departure-city');
    const arrivalSelect = document.getElementById('arrival-city');

    if (!departureSelect || !arrivalSelect) return;

    // Reset des menus (garde l'option par défaut)
    departureSelect.innerHTML = '<option value="" disabled selected>Sélectionnez une ville...</option>';
    arrivalSelect.innerHTML = '<option value="" disabled selected>Sélectionnez une ville...</option>';

    // Tri alphabétique des villes
    cities.sort((a, b) => a.name.localeCompare(b.name));

    cities.forEach(city => {
        const optionText = `${city.name} (${city.code})`;

        // On utilise le NOM de la ville comme valeur pour rester cohérent
        // avec la base de données (ville_depart / ville_arrivee).
        // Le code IATA reste affiché dans le texte.

        // Ajout au départ
        const depOption = document.createElement('option');
        depOption.value = city.name;
        depOption.textContent = optionText;
        departureSelect.appendChild(depOption);

        // Ajout à l'arrivée
        const arrOption = document.createElement('option');
        arrOption.value = city.name;
        arrOption.textContent = optionText;
        arrivalSelect.appendChild(arrOption);
    });
}

/** Authentication Logic **/

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Form Validations
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(pass) {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);
}

// Handle Login (Real API Call)
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const emailError = document.getElementById('email-error');
    const btn = e.target.querySelector('button[type="submit"]');

    if (!validateEmail(email)) {
        emailError.style.display = 'block';
        return;
    } else {
        emailError.style.display = 'none';
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

        // standard OAuth2 form encoding for FastAPI
        const formData = new URLSearchParams();
        formData.append('username', email); // FastAPI OAuth2 expects 'username'
        formData.append('password', password);

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('jetcongo_token', data.access_token);
            await redirectAfterLogin(data.access_token);
        } else {
            showNotification(data.detail || "Identifiants incorrects.", 'error');
        }
    } catch (error) {
        console.error("Erreur de connexion", error);
        showNotification("Impossible de contacter le serveur.", 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Se connecter <i class="fas fa-arrow-right"></i>';
    }
}

// Handle Register (Real API Call)
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const passError = document.getElementById('password-error');
    const btn = e.target.querySelector('button[type="submit"]');

    let isValid = true;

    if (name.length < 2) {
        nameError.style.display = 'block';
        isValid = false;
    } else {
        nameError.style.display = 'none';
    }

    if (!validateEmail(email)) {
        emailError.style.display = 'block';
        isValid = false;
    } else {
        emailError.style.display = 'none';
    }

    if (!validatePassword(password)) {
        passError.style.display = 'block';
        isValid = false;
    } else {
        passError.style.display = 'none';
    }

    if (!isValid) return;

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: password,
                nom: name
            })
        });

        if (response.ok) {
            // Success: Automatically login the user
            const loginFormData = new URLSearchParams();
            loginFormData.append('username', email);
            loginFormData.append('password', password);

            const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: loginFormData
            });
            const loginData = await loginRes.json();

            if (loginRes.ok) {
                localStorage.setItem('jetcongo_token', loginData.access_token);
                await redirectAfterLogin(loginData.access_token);
            }
        } else {
            const errorData = await response.json();
            showNotification(errorData.detail || "Erreur lors de l'inscription.", 'error');
        }
    } catch (error) {
        console.error("Erreur d'inscription", error);
        showNotification("Erreur de connexion réseau.", 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = "S'inscrire <i class=\"fas fa-arrow-right\"></i>";
    }
}

// Rediriger selon le rôle après login
async function redirectAfterLogin(token) {
    try {
        const meRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (meRes.ok) {
            const user = await meRes.json();
            const role = (user.role || '').toLowerCase();

            if (role === 'agent') {
                window.location.href = 'agent-dashboard.html';
                return;
            }
        }
    } catch (e) {
        console.error('Erreur lors de la récupération du profil pour la redirection', e);
    }

    // Fallback pour tous les autres rôles / en cas d'erreur
    window.location.href = 'flights.html';
}

// UI: Update Header based on Auth status
// UI: Update Header based on Auth status
function updateAuthUI() {
    const token = localStorage.getItem('jetcongo_token');

    // Desktop Container
    const authContainer = document.querySelector('.nav-auth');
    // Mobile Container
    const mobileContainer = document.getElementById('mobile-auth-container');

    if (token) {
        // --- LOGGED IN --- //

        // Desktop View
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="profile.html" class="btn-login" style="display:flex;align-items:center;gap:8px;">
                    <img id="nav-avatar" src="../../public/user.png" alt="Profil utilisateur" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
                    <span>Mon compte</span>
                </a>
                <a href="#" class="btn-login" onclick="logout(event)">Déconnexion</a>
            `;
        }

        // Mobile View
        if (mobileContainer) {
            mobileContainer.innerHTML = `
                 <a href="profile.html" class="auth-icon-link" aria-label="Mon compte">
                    <img id="mobile-nav-avatar" src="../../public/user.png" alt="Profil" style="height:32px;width:32px;border-radius:50%;object-fit:cover;border:1px solid var(--text-muted);">
                 </a>
                 <a href="#" class="auth-icon-link" onclick="logout(event)" aria-label="Déconnexion">
                    <i class="fas fa-sign-out-alt"></i>
                 </a>
            `;
        }

        // Load avatar image for both
        loadHeaderAvatar();

    } else {
        // --- NOT LOGGED IN --- //

        // Desktop View (Default is already correct in HTML, but we can reset if needed, 
        // useful if user logs out without reload)
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="login.html" class="btn-login">Connexion</a>
                <a href="register.html" class="btn-signup">S'inscrire</a>
            `;
        }

        // Mobile View
        if (mobileContainer) {
            mobileContainer.innerHTML = `
                <a href="login.html" class="auth-icon-link" aria-label="Connexion">
                    <i class="fas fa-user-circle"></i>
                </a>
            `;
        }
    }
}

async function loadHeaderAvatar() {
    const token = localStorage.getItem('jetcongo_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) return;

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Update Desktop Avatar
        const imgDesktop = document.getElementById('nav-avatar');
        if (imgDesktop) imgDesktop.src = objectUrl;

        // Update Mobile Avatar
        const imgMobile = document.getElementById('mobile-nav-avatar');
        if (imgMobile) imgMobile.src = objectUrl;

    } catch (e) {
        console.error('Erreur lors du chargement de l\'avatar nav', e);
    }
}

function logout(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('jetcongo_token');
    window.location.href = 'index.html'; // Redirect to home on logout
}

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Attach theme toggle listener for pages with static headers (like agent pages)
    const staticThemeToggleBtn = document.getElementById('theme-toggle-btn');
    if (staticThemeToggleBtn) {
        staticThemeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Agent Sidebar Toggle Logic
    const sidebar = document.getElementById('agent-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

    function openSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); // Fade in
        }
    }

    function closeSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); // Wait for fade out
        }
    }

    if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', openSidebar);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    loadComponents();
    initTabs();
    populateCities();

    // Bind Forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    console.log('JetCongo Frontend Initialized with Real Backend Auth');
});
