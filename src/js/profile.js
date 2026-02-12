(function () {
    const nameEl = document.getElementById("profile-name");
    const fullNameEl = document.getElementById("profile-full-name");
    const emailEl = document.getElementById("profile-email");
    const roleEl = document.getElementById("profile-role");
    const avatarImg = document.getElementById("profile-avatar");
    const avatarBtn = document.getElementById("avatar-edit-btn");
    const avatarInput = document.getElementById("avatar-input");

    async function loadProfile() {
        const token = localStorage.getItem("jetcongo_token");
        if (!token) {
            // Pas connecté → retour à la page de login
            window.location.href = "login.html";
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("jetcongo_token");
                    window.location.href = "login.html";
                    return;
                }
                throw new Error(data.detail || "Impossible de charger le profil utilisateur.");
            }

            hydrateProfile(data);
        } catch (error) {
            console.error(error);
        }
    }

    function hydrateProfile(user) {
        const displayName = user.nom || "Utilisateur";

        if (nameEl) nameEl.textContent = displayName;
        if (fullNameEl) fullNameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = user.email || "-";
        if (roleEl) roleEl.textContent = user.role || "client";

        // Charger l'avatar depuis le backend (s'il existe)
        loadAvatarFromBackend();
    }

    async function loadAvatarFromBackend() {
        if (!avatarImg) return;
        const token = localStorage.getItem("jetcongo_token");
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                // 404 = pas d'avatar, on garde l'image par défaut
                return;
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            avatarImg.src = objectUrl;
        } catch (error) {
            console.error("Erreur lors du chargement de l'avatar", error);
        }
    }

    function initAvatarUpload() {
        if (!avatarBtn || !avatarInput) return;

        avatarBtn.addEventListener("click", () => {
            avatarInput.click();
        });

        avatarInput.addEventListener("change", async () => {
            const file = avatarInput.files && avatarInput.files[0];
            if (!file) return;

            const token = localStorage.getItem("jetcongo_token");
            if (!token) {
                window.location.href = "login.html";
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch(`${API_BASE_URL}/users/me/avatar`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error(data);
                    return;
                }

                // Prévisualisation locale immédiate
                if (avatarImg) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        avatarImg.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                console.error("Erreur lors du téléversement de l'avatar", error);
            } finally {
                avatarInput.value = "";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadProfile();
        initAvatarUpload();
    });
})();

