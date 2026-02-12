(function () {
    const token = localStorage.getItem("jetcongo_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    const tbody = document.getElementById("reservation-table-body");
    const searchInput = document.getElementById("reservation-search-input");
    const exportBtn = document.getElementById("reservations-export-btn");

    const metricTotal = document.getElementById("metric-reservations-total");
    const metricConfirmed = document.getElementById("metric-reservations-confirmed");
    const metricPending = document.getElementById("metric-reservations-pending");
    const metricCancelled = document.getElementById("metric-reservations-cancelled");

    let reservations = [];

    async function loadReservations() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/reservations`, {
                headers,
            });
            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }
            const data = await res.json();
            reservations = data.items || [];
            updateMetrics();
            renderReservations();
        } catch (e) {
            console.error("Erreur chargement réservations", e);
            if (typeof showNotification === "function") {
                showNotification(
                    "Erreur lors du chargement des réservations.",
                    "error"
                );
            }
        }
    }

    function updateMetrics() {
        const total = reservations.length;
        const confirmed = reservations.filter((r) =>
            (r.statut || "").toUpperCase() === "CONFIRMEE" ||
            (r.statut || "").toUpperCase() === "PAYE"
        ).length;
        const pending = reservations.filter((r) =>
            (r.statut || "").toUpperCase() === "EN_ATTENTE"
        ).length;
        const cancelled = reservations.filter((r) =>
            (r.statut || "").toUpperCase() === "ANNULEE"
        ).length;

        if (metricTotal) metricTotal.textContent = total.toString();
        if (metricConfirmed) metricConfirmed.textContent = confirmed.toString();
        if (metricPending) metricPending.textContent = pending.toString();
        if (metricCancelled) metricCancelled.textContent = cancelled.toString();
    }

    function getFilteredReservations() {
        const query = (searchInput?.value || "").toLowerCase();

        return reservations.filter((r) => {
            const userName = (r.utilisateur?.nom || "").toLowerCase();
            const userEmail = (r.utilisateur?.email || "").toLowerCase();
            const code = `#${r.id}`.toLowerCase();
            const route = `${r.vol?.ville_depart || ""} ${r.vol?.ville_arrivee || ""}`.toLowerCase();
            if (!query) return true;
            return (
                userName.includes(query) ||
                userEmail.includes(query) ||
                code.includes(query) ||
                route.includes(query)
            );
        });
    }

    function renderReservations() {
        if (!tbody) return;

        const filtered = getFilteredReservations();

        if (!filtered.length) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="px-6 py-4 text-sm text-slate-500">Aucune réservation trouvée.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered
            .map((r) => {
                const status = (r.statut || "").toUpperCase();
                let badgeClass =
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                let label = "En attente";
                if (status === "CONFIRMEE" || status === "PAYE") {
                    badgeClass =
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                    label = "Confirmée";
                } else if (status === "ANNULEE") {
                    badgeClass =
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                    label = "Annulée";
                }

                const user = r.utilisateur || {};
                const vol = r.vol || {};

                const amount =
                    typeof r.total_payer === "number"
                        ? r.total_payer
                        : parseFloat(r.total_payer || "0");

                const amountLabel = new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                }).format(amount || 0);

                return `
                <tr class="hover:bg-primary/5 transition-colors">
                    <td class="px-6 py-4 font-semibold text-primary">#${r.id}</td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-sm font-bold">${user.nom || "Inconnu"}</span>
                            <span class="text-xs text-slate-500">${user.email || ""}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-sm font-bold">${vol.ville_depart || "?"} - ${vol.ville_arrivee || "?"}</span>
                            <span class="text-xs text-slate-500">${vol.date_depart || ""} ${vol.heure_depart || ""}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="${badgeClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${
                                status === "ANNULEE"
                                    ? "bg-red-500"
                                    : status === "CONFIRMEE" || status === "PAYE"
                                    ? "bg-green-500"
                                    : "bg-amber-500"
                            }"></span>
                            ${label}
                        </span>
                    </td>
                    <td class="px-6 py-4 font-bold">${amountLabel}</td>
                    <td class="px-6 py-4">
                        <div class="flex gap-2">
                            <button class="bg-primary text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
                                    data-res-id="${r.id}" data-res-confirm="1">
                                Confirmer
                            </button>
                            <button class="border border-red-200 text-red-500 text-[10px] uppercase font-bold px-3 py-1.5 rounded hover:bg-red-50 transition-colors"
                                    data-res-id="${r.id}" data-res-cancel="1">
                                Annuler
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            })
            .join("");
    }

    async function confirmReservation(id) {
        if (!id) return;
        try {
            const res = await fetch(
                `${API_BASE_URL}/admin/reservations/${id}/confirm`,
                { method: "POST", headers }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || `Erreur ${res.status}`);
            }
            await loadReservations();
            if (typeof showNotification === "function") {
                showNotification("Réservation confirmée.", "success");
            }
        } catch (e) {
            console.error("Erreur confirmation réservation", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message || "Erreur lors de la confirmation.",
                    "error"
                );
            }
        }
    }

    async function cancelReservation(id) {
        if (!id) return;
        try {
            const res = await fetch(
                `${API_BASE_URL}/admin/reservations/${id}/cancel`,
                { method: "POST", headers }
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || `Erreur ${res.status}`);
            }
            await loadReservations();
            if (typeof showNotification === "function") {
                showNotification("Réservation annulée.", "success");
            }
        } catch (e) {
            console.error("Erreur annulation réservation", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message || "Erreur lors de l'annulation.",
                    "error"
                );
            }
        }
    }

    function exportReservationsToExcel(list) {
        if (!window.XLSX || !list.length) return;

        const rows = list.map((r) => {
            const user = r.utilisateur || {};
            const vol = r.vol || {};

            const amount =
                typeof r.total_payer === "number"
                    ? r.total_payer
                    : parseFloat(r.total_payer || "0");

            return {
                "ID réservation": r.id,
                "Passager": user.nom || "Inconnu",
                "Email": user.email || "",
                "Ville départ": vol.ville_depart || "",
                "Ville arrivée": vol.ville_arrivee || "",
                "Date départ": vol.date_depart || "",
                "Heure départ": vol.heure_depart || "",
                "Statut": r.statut || "",
                "Montant (USD)": Number(amount || 0),
            };
        });

        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Réservations");

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        window.XLSX.writeFile(wb, `reservations_agent_${dateStr}.xlsx`);
    }

    function exportReservationsToPdf(list) {
        if (!window.jspdf || !list.length) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");

        const today = new Date();
        const dateStr = today.toLocaleString("fr-FR");

        doc.setFontSize(16);
        doc.text("Rapport Réservations - Vue Agent", 40, 40);
        doc.setFontSize(10);
        doc.text(`Généré le ${dateStr}`, 40, 58);

        const head = [
            [
                "ID",
                "Passager",
                "Email",
                "Trajet",
                "Date départ",
                "Heure départ",
                "Statut",
                "Montant (USD)",
            ],
        ];

        const body = list.map((r) => {
            const user = r.utilisateur || {};
            const vol = r.vol || {};

            const amount =
                typeof r.total_payer === "number"
                    ? r.total_payer
                    : parseFloat(r.total_payer || "0");

            return [
                r.id,
                user.nom || "Inconnu",
                user.email || "",
                `${vol.ville_depart || "?"} - ${vol.ville_arrivee || "?"}`,
                vol.date_depart || "",
                vol.heure_depart || "",
                r.statut || "",
                Number(amount || 0).toFixed(2),
            ];
        });

        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: 80,
                head,
                body,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [19, 127, 236] },
            });
        }

        const filenameSafeDate = today.toISOString().slice(0, 10);
        doc.save(`reservations_agent_${filenameSafeDate}.pdf`);
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => renderReservations());
    }

    if (tbody) {
        tbody.addEventListener("click", (e) => {
            const confirmBtn = e.target.closest("[data-res-confirm]");
            if (confirmBtn) {
                const id = Number(confirmBtn.getAttribute("data-res-id"));
                confirmReservation(id);
                return;
            }
            const cancelBtn = e.target.closest("[data-res-cancel]");
            if (cancelBtn) {
                const id = Number(cancelBtn.getAttribute("data-res-id"));
                cancelReservation(id);
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const filtered = getFilteredReservations();
            if (!filtered.length) {
                if (typeof showNotification === "function") {
                    showNotification("Aucune réservation à exporter pour les filtres actuels.", "info");
                }
                return;
            }

            try {
                exportReservationsToExcel(filtered);
                exportReservationsToPdf(filtered);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Export des réservations effectué en Excel et PDF (filtres actuels).",
                        "success"
                    );
                }
            } catch (e) {
                console.error("Erreur export réservations", e);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Une erreur est survenue lors de l'export des réservations.",
                        "error"
                    );
                }
            }
        });
    }

    loadReservations();
})(); 

