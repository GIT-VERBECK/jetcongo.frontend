// Logique de la page de réservation (booking.html)
// - Récupère le vol sélectionné via ?volId=... depuis l'URL
// - Affiche le résumé du vol et du paiement
// - Valide le formulaire passager côté client
// - Envoie la réservation au backend FastAPI

(function () {
    const params = new URLSearchParams(window.location.search);
    const volId = parseInt(params.get("volId") || "", 10);

    const alertBox = document.getElementById("reservation-alert");
    const form = document.getElementById("reservation-form");
    const submitBtn = document.getElementById("submit-reservation");
    const seatsSelect = document.getElementById("seats");

    const flightSummaryEl = document.getElementById("flight-summary");
    const paymentSummaryEl = document.getElementById("payment-summary");

    let currentFlight = null;
    let unitPrice = 0;
    const fixedTaxes = 12.5; // pour l'instant, constant côté frontend

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

    function isEmailValid(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isFutureDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) return false;
        const dt = new Date(`${dateStr}T${timeStr}`);
        return dt.getTime() > Date.now();
    }

    function renderFlightSummary(flight) {
        const compagnie =
            (flight.avion && flight.avion.compagnie) || "Non spécifié";
        const modele =
            (flight.avion && flight.avion.modele) || "Non spécifié";

        flightSummaryEl.innerHTML = `
            <div class="p-8">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <span
                            class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">VOL ID: ${flight.id}</span>
                        <span
                            class="px-3 py-1 bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 text-xs font-bold rounded-full">
                            ${flight.statut}
                        </span>
                    </div>
                    <p class="text-sm text-slate-400">Date de réservation: ${flight.date_depart}</p>
                </div>
                <div class="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
                    <div class="text-center md:text-left">
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white">
                            ${flight.ville_depart.slice(0, 3).toUpperCase()}
                        </h2>
                        <p class="text-sm text-slate-500 uppercase tracking-widest">
                            ${flight.ville_depart}
                        </p>
                        <p class="text-lg font-medium mt-2">
                            ${flight.heure_depart}
                        </p>
                    </div>
                    <div class="flex-1 flex flex-col items-center gap-2 max-w-[200px]">
                        <span class="text-xs font-medium text-primary">
                            ${compagnie} • ${modele}
                        </span>
                        <div class="w-full flex items-center gap-2">
                            <div class="h-1.5 w-1.5 rounded-full bg-primary/30"></div>
                            <div
                                class="h-px flex-1 bg-dashed border-t-2 border-dashed border-primary/30 relative">
                                <span
                                    class="material-icons-round absolute -top-3 left-1/2 -translate-x-1/2 text-primary text-2xl">flight_takeoff</span>
                            </div>
                            <div class="h-1.5 w-1.5 rounded-full bg-primary/30"></div>
                        </div>
                        <span class="text-[10px] text-slate-400">
                            ${flight.date_arrivee && flight.heure_arrivee
                                ? `Arrivée: ${flight.date_arrivee} ${flight.heure_arrivee}`
                                : "Vol direct"}
                        </span>
                    </div>
                    <div class="text-center md:text-right">
                        <h2 class="text-4xl font-bold text-slate-900 dark:text-white">
                            ${flight.ville_arrivee.slice(0, 3).toUpperCase()}
                        </h2>
                        <p class="text-sm text-slate-500 uppercase tracking-widest">
                            ${flight.ville_arrivee}
                        </p>
                        <p class="text-lg font-medium mt-2">
                            ${flight.heure_arrivee || ""}
                        </p>
                    </div>
                </div>
                <div
                    class="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-4">
                    <div>
                        <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Date du vol</p>
                        <p class="font-medium">${flight.date_depart}</p>
                    </div>
                </div>
            </div>
        `;
    }

    function renderPaymentSummary() {
        const seats = parseInt(seatsSelect.value || "1", 10);
        const subtotal = unitPrice * seats;
        const total = subtotal + fixedTaxes;

        paymentSummaryEl.innerHTML = `
            <div class="bg-slate-900 text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
                <div class="absolute -right-8 -top-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl"></div>
                <h3 class="text-lg font-bold mb-6 relative z-10">Résumé du paiement</h3>
                <div class="space-y-4 mb-8 relative z-10">
                    <div class="flex justify-between text-slate-400">
                        <span>Prix unitaire</span>
                        <span class="text-white font-medium">$${unitPrice.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Nombre de places</span>
                        <span class="text-white font-medium">x ${seats}</span>
                    </div>
                    <div class="flex justify-between text-slate-400">
                        <span>Taxes &amp; Frais</span>
                        <span class="text-white font-medium">$${fixedTaxes.toFixed(2)}</span>
                    </div>
                    <div class="pt-4 border-t border-white/10 flex justify-between items-end">
                        <div>
                            <p class="text-xs text-slate-400 uppercase tracking-widest">Total à payer</p>
                            <p class="text-3xl font-bold text-primary">$${total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadFlight() {
        if (!volId) {
            showAlert(
                "Aucun vol sélectionné. Veuillez revenir à la page des vols.",
                "error"
            );
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/flights/${volId}`);
            if (!response.ok) {
                throw new Error("Impossible de charger le vol.");
            }
            const data = await response.json();
            currentFlight = data;
            unitPrice = Number(data.prix) || 0;
            renderFlightSummary(data);
            renderPaymentSummary();
        } catch (error) {
            console.error(error);
            showAlert(
                "Erreur lors du chargement des informations du vol.",
                "error"
            );
        }
    }

    function validateForm() {
        if (!form) return false;

        let isValid = true;
        clearAlert();

        Array.from(form.elements).forEach((el) =>
            el.classList.remove("is-invalid")
        );

        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const seats = seatsSelect ? seatsSelect.value : "";

        if (!fullName) {
            form.fullName.classList.add("is-invalid");
            isValid = false;
        }
        if (!email || !isEmailValid(email)) {
            form.email.classList.add("is-invalid");
            isValid = false;
        }
        if (!seats) {
            if (seatsSelect) seatsSelect.classList.add("is-invalid");
            isValid = false;
        }

        if (!isValid) {
            showAlert(
                "Merci de corriger les champs en rouge avant de confirmer la réservation.",
                "warning"
            );
        }

        return isValid;
    }

    async function submitReservation() {
        if (!validateForm() || !currentFlight) return;

        const token = localStorage.getItem("jetcongo_token");
        if (!token) {
            showAlert(
                "Vous devez être connecté pour confirmer la réservation. Redirection vers la page de connexion...",
                "warning"
            );
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
            return;
        }

        const payload = {
            vol_id: currentFlight.id,
            full_name: form.fullName.value.trim(),
            email: form.email.value.trim(),
            // On envoie les infos de date/heure provenant du vol lui-même
            date: currentFlight.date_depart,
            time: currentFlight.heure_depart,
            seats: parseInt(seatsSelect.value, 10),
        };

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = "Enregistrement...";

            const response = await fetch(`${API_BASE_URL}/reservations/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Gestion spécifique du cas authentification expirée / invalide
                if (response.status === 401) {
                    localStorage.removeItem("jetcongo_token");
                    showAlert(
                        "Votre session a expiré ou est invalide. Merci de vous reconnecter.",
                        "warning"
                    );
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                    return;
                }
                throw new Error(data.detail || "Erreur lors de la réservation.");
            }

            // On stocke les infos de la réservation courante pour la page de paiement
            try {
                const seats = parseInt(seatsSelect.value, 10) || 1;
                const subtotal = unitPrice * seats;
                const total = subtotal + fixedTaxes;

                localStorage.setItem(
                    "jetcongo_last_reservation",
                    JSON.stringify({
                        reservation_id: data.id,
                        vol_id: currentFlight.id,
                        ville_depart: currentFlight.ville_depart,
                        ville_arrivee: currentFlight.ville_arrivee,
                        date_depart: currentFlight.date_depart,
                        heure_depart: currentFlight.heure_depart,
                        prix_unitaire: unitPrice,
                        seats,
                        total,
                    })
                );
            } catch (e) {
                console.warn("Impossible de stocker la réservation en localStorage", e);
            }

            showAlert(
                "Réservation enregistrée avec succès ! Redirection vers le paiement...",
                "success"
            );

            if (data.id) {
                setTimeout(() => {
                    window.location.href = `payment.html?reservationId=${data.id}`;
                }, 1000);
            }
        } catch (error) {
            console.error(error);
            showAlert(
                error.message ||
                    "Une erreur est survenue lors de l'enregistrement de la réservation.",
                "error"
            );
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Confirmer la réservation";
        }
    }

    if (submitBtn) {
        submitBtn.addEventListener("click", submitReservation);
    }

    if (seatsSelect) {
        seatsSelect.addEventListener("change", renderPaymentSummary);
    }

    // Charge les informations du vol dès l'arrivée sur la page
    loadFlight();
})();

