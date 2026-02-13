(function () {
    const nameEl = document.getElementById("profile-name");
    const fullNameInput = document.getElementById("profile-full-name");
    const emailInput = document.getElementById("profile-email");
    const roleEl = document.getElementById("profile-role");
    const avatarImg = document.getElementById("profile-avatar");
    const avatarBtn = document.getElementById("avatar-edit-btn");
    const avatarInput = document.getElementById("avatar-input");
    const personalForm = document.getElementById("personal-info-form");
    const personalCancelBtn = document.getElementById("personal-cancel-btn");
    const passwordForm = document.getElementById("password-form");
    const navPersonal = document.getElementById("nav-personal");
    const navSecurity = document.getElementById("nav-security");

    // Pour pouvoir réinitialiser le formulaire "Infos personnelles"
    let originalProfile = null;

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

        originalProfile = {
            nom: user.nom || "",
            email: user.email || "",
        };

        if (nameEl) nameEl.textContent = displayName;
        if (fullNameInput) fullNameInput.value = originalProfile.nom;
        if (emailInput) emailInput.value = originalProfile.email;
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

    function resetPersonalForm() {
        if (!originalProfile) return;
        if (fullNameInput) fullNameInput.value = originalProfile.nom;
        if (emailInput) emailInput.value = originalProfile.email;
    }

    function initPersonalForm() {
        if (!personalForm) return;

        personalForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const token = localStorage.getItem("jetcongo_token");
            if (!token) {
                window.location.href = "login.html";
                return;
            }

            const payload = {
                nom: fullNameInput ? fullNameInput.value.trim() : undefined,
                email: emailInput ? emailInput.value.trim() : undefined,
            };

            try {
                const response = await fetch(`${API_BASE_URL}/users/me`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.detail || "Impossible de mettre à jour vos informations.");
                    return;
                }

                // Rafraîchir les infos avec les données retournées
                hydrateProfile(data);
                // Confirmation côté utilisateur une fois la BD à jour
                alert("Vos informations personnelles ont été mises à jour avec succès.");
            } catch (error) {
                console.error("Erreur lors de la mise à jour du profil", error);
            }
        });

        if (personalCancelBtn) {
            personalCancelBtn.addEventListener("click", (event) => {
                event.preventDefault();
                resetPersonalForm();
            });
        }
    }

    function initPasswordForm() {
        if (!passwordForm) return;

        const currentPasswordInput = document.getElementById("current-password");
        const newPasswordInput = document.getElementById("new-password");
        const confirmPasswordInput = document.getElementById("confirm-password");

        passwordForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
            const newPassword = newPasswordInput ? newPasswordInput.value : "";
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";

            if (!currentPassword || !newPassword || !confirmPassword) {
                alert("Veuillez remplir tous les champs.");
                return;
            }

            if (newPassword !== confirmPassword) {
                alert("La confirmation du mot de passe ne correspond pas.");
                return;
            }

            const token = localStorage.getItem("jetcongo_token");
            if (!token) {
                window.location.href = "login.html";
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/users/me/password`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        old_password: currentPassword,
                        new_password: newPassword,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.detail || "Impossible de mettre à jour le mot de passe.");
                    return;
                }

                alert("Mot de passe mis à jour avec succès.");
                if (currentPasswordInput) currentPasswordInput.value = "";
                if (newPasswordInput) newPasswordInput.value = "";
                if (confirmPasswordInput) confirmPasswordInput.value = "";
            } catch (error) {
                console.error("Erreur lors du changement de mot de passe", error);
            }
        });
    }

    function setActiveNav(section) {
        if (!navPersonal || !navSecurity) return;

        const personalSection = document.getElementById("personal-info");
        const securitySection = document.getElementById("security");
        const sectionsContainer = personalSection ? personalSection.parentElement : null;

        const activeClasses =
            "bg-primary/5 text-primary border-r-4 border-primary";
        const inactiveClasses =
            "text-slate-600 dark:text-slate-400 border-r-0 bg-transparent";

        // Réinitialiser les styles des liens
        navPersonal.classList.remove("bg-primary/5", "text-primary", "border-r-4", "border-primary");
        navSecurity.classList.remove("bg-primary/5", "text-primary", "border-r-4", "border-primary");

        navPersonal.classList.remove("text-slate-600", "dark:text-slate-400");
        navSecurity.classList.remove("text-slate-600", "dark:text-slate-400");

        // Appliquer en fonction de la section
        if (section === "personal") {
            navPersonal.classList.add("bg-primary/5", "text-primary", "border-r-4", "border-primary");
            navSecurity.classList.add("text-slate-600", "dark:text-slate-400");

            // Afficher section Info Personnelles, masquer Sécurité
            if (personalSection) personalSection.classList.remove("hidden");
            if (securitySection) securitySection.classList.add("hidden");

        } else {
            navSecurity.classList.add("bg-primary/5", "text-primary", "border-r-4", "border-primary");
            navPersonal.classList.add("text-slate-600", "dark:text-slate-400");

            // Afficher Sécurité, masquer Info Personnelles
            if (personalSection) personalSection.classList.add("hidden");
            if (securitySection) securitySection.classList.remove("hidden");
        }

        // Ajustement du conteneur parent pour éviter le layout grille 2 colonnes quand un seul élément est visible
        if (sectionsContainer && sectionsContainer.classList.contains("md:grid-cols-2")) {
            sectionsContainer.classList.remove("md:grid-cols-2");
            sectionsContainer.classList.add("grid-cols-1");
        }
    }

    function initNav() {
        if (navPersonal) {
            navPersonal.addEventListener("click", () => {
                setActiveNav("personal");
            });
        }
        if (navSecurity) {
            navSecurity.addEventListener("click", () => {
                setActiveNav("security");
            });
        }

        // Par défaut, on affiche les infos personnelles
        setActiveNav("personal");
    }

    document.addEventListener("DOMContentLoaded", () => {
        loadProfile();
        initAvatarUpload();
        initPersonalForm();
        initPasswordForm();
        initNav();
    });
})();

