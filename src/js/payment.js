(function () {
    const params = new URLSearchParams(window.location.search);
    const reservationId = parseInt(params.get("reservationId") || "", 10);

    const alertBox = document.getElementById("payment-alert");

    function showAlert(message, type) {
        if (!alertBox) return;
        alertBox.textContent = message;
        const baseClasses =
            "mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border";
        const variants = {
            success: "bg-green-50 border-green-200 text-green-700",
            error: "bg-red-50 border-red-200 text-red-700",
            warning: "bg-amber-50 border-amber-200 text-amber-700",
        };
        alertBox.className = `${baseClasses} ${variants[type] || variants.error}`;
    }

    function clearAlert() {
        if (!alertBox) return;
        alertBox.className = "hidden";
        alertBox.textContent = "";
    }

    async function loadReservation() {
            if (!reservationId) {
                // On tente de charger depuis le stockage local si l'ID n'est pas présent
                return loadFromLocal();
            }

        const token = localStorage.getItem("jetcongo_token");
        if (!token) {
            showAlert(
                "Votre session a expiré. Merci de vous reconnecter.",
                "warning"
            );
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE_URL}/reservations/${reservationId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("jetcongo_token");
                    showAlert(
                        "Votre session a expiré. Merci de vous reconnecter.",
                        "warning"
                    );
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                    return;
                }
                if (response.status === 404) {
                    // Fallback sur les données stockées lors de la réservation
                    return loadFromLocal();
                }
                throw new Error(data.detail || "Impossible de charger la réservation.");
            }

            hydrateUI(data);
        } catch (error) {
            console.error(error);
            // En cas d'erreur réseau ("Failed to fetch") ou d'erreur serveur,
            // on tente de récupérer les données depuis le stockage local
            // plutôt que d'afficher directement le message technique.
            loadFromLocal();
        }
    }

    function loadFromLocal() {
        try {
            const raw = localStorage.getItem("jetcongo_last_reservation");
            if (!raw) {
                showAlert(
                    "Aucune réservation en cours trouvée. Merci de revenir à la sélection de vol.",
                    "error"
                );
                return;
            }
            const stored = JSON.parse(raw);

            const payload = {
                vol: {
                    id: stored.vol_id,
                    ville_depart: stored.ville_depart,
                    ville_arrivee: stored.ville_arrivee,
                    date_depart: stored.date_depart,
                    heure_depart: stored.heure_depart,
                    prix: stored.prix_unitaire,
                },
                nombre_place: stored.seats,
                total_payer: stored.total,
            };

            hydrateUI(payload);
        } catch (e) {
            console.error(e);
            showAlert(
                "Impossible de retrouver les informations de la réservation. Merci de recommencer la réservation.",
                "error"
            );
        }
    }

    function hydrateUI(payload) {
        const { vol, nombre_place, total_payer } = payload;

        // Codes et villes
        const depCodeEl = document.getElementById("pay-depart-code");
        const depCityEl = document.getElementById("pay-depart-city");
        const arrCodeEl = document.getElementById("pay-arrive-code");
        const arrCityEl = document.getElementById("pay-arrive-city");
        const metaEl = document.getElementById("pay-meta");
        const flightIdEl = document.getElementById("pay-flight-id");
        const passengerEl = document.getElementById("pay-passenger");
        const datetimeEl = document.getElementById("pay-datetime");

        const flightLabelEl = document.getElementById("pay-flight-label");
        const flightPriceEl = document.getElementById("pay-flight-price");
        const seatsEl = document.getElementById("pay-seats");
        const taxesEl = document.getElementById("pay-taxes");
        const totalEl = document.getElementById("pay-total");

        const seats = Number(nombre_place) || 1;
        const unitPrice = Number(vol.prix);
        const taxeFixe = 12.5;
        const subtotal = unitPrice * seats;

        // On privilégie le montant calculé/stocké côté backend
        let total = Number(total_payer);
        if (!isFinite(total) || total <= 0) {
            total = subtotal + taxeFixe;
        }

        // Récap vol
        if (depCodeEl)
            depCodeEl.textContent = vol.ville_depart.slice(0, 3).toUpperCase();
        if (depCityEl) depCityEl.textContent = vol.ville_depart;
        if (arrCodeEl)
            arrCodeEl.textContent = vol.ville_arrivee.slice(0, 3).toUpperCase();
        if (arrCityEl) arrCityEl.textContent = vol.ville_arrivee;
        if (metaEl)
            metaEl.textContent = "Vol direct"; // simplifié pour l'instant
        if (flightIdEl) flightIdEl.textContent = `Vol ID: ${vol.id}`;

        const userName = localStorage.getItem("jetcongo_user_name") || "";
        if (passengerEl) passengerEl.textContent = userName || "Passager principal";

        if (datetimeEl)
            datetimeEl.textContent = `${vol.date_depart} • ${vol.heure_depart}`;

        // Récap paiement
        if (flightLabelEl)
            flightLabelEl.textContent = `Vol Aller (${vol.ville_depart} - ${vol.ville_arrivee})`;
        if (flightPriceEl) flightPriceEl.textContent = `$${subtotal.toFixed(2)}`;
        if (seatsEl) seatsEl.textContent = `x ${seats}`;
        if (taxesEl) taxesEl.textContent = `$${taxeFixe.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    }

    function initPaymentButton() {
        const payBtn = document.getElementById("pay-now");
        const terms = document.getElementById("terms");
        const phoneInput = document.getElementById("mobile-phone");
        const phoneError = document.getElementById("mobile-phone-error");

        if (!payBtn || !terms || !phoneInput || !phoneError) return;

        payBtn.addEventListener("click", async () => {
            clearAlert();
            phoneError.classList.add("hidden");
            if (!terms.checked) {
                showAlert(
                    "Merci d'accepter les conditions générales avant de continuer.",
                    "warning"
                );
                return;
            }

            const rawPhone = phoneInput.value.replace(/\D/g, "");
            if (rawPhone.length !== 9) {
                phoneError.classList.remove("hidden");
                showAlert(
                    "Veuillez saisir un numéro Mobile Money valide de 9 chiffres (sans indicatif).",
                    "warning"
                );
                return;
            }

            payBtn.disabled = true;
            payBtn.textContent = "Traitement du paiement...";

            const raw = localStorage.getItem("jetcongo_last_reservation");
            const token = localStorage.getItem("jetcongo_token");

            if (!raw || !token) {
                showAlert(
                    "Aucune réservation en cours ou session expirée. Merci de recommencer.",
                    "error"
                );
                payBtn.textContent = "Payer maintenant";
                payBtn.disabled = false;
                return;
            }

            try {
                const stored = JSON.parse(raw);

                const body = {
                    reservation_id: stored.reservation_id,
                    phone_number: rawPhone,
                };

                const response = await fetch(`${API_BASE_URL}/payments/process`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                });

                const data = await response.json();

                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem("jetcongo_token");
                        showAlert(
                            "Votre session a expiré. Merci de vous reconnecter.",
                            "warning"
                        );
                        setTimeout(() => {
                            window.location.href = "login.html";
                        }, 1500);
                        return;
                    }
                    throw new Error(data.detail || "Erreur lors du traitement du paiement.");
                }

                showAlert(
                    "Paiement effectué avec succès. Votre réservation est maintenant PAYÉE.",
                    "success"
                );
            } catch (error) {
                console.error(error);
                showAlert(
                    error.message ||
                        "Une erreur est survenue lors du traitement du paiement.",
                    "error"
                );
            } finally {
                payBtn.textContent = "Payer maintenant";
                payBtn.disabled = false;
            }
        });
    }

    // Initialisation
    document.addEventListener("DOMContentLoaded", () => {
        loadReservation();
        initPaymentButton();
    });
})();

