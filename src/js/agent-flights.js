// Page "Horaires des vols" - Vue agent
// Charge les données depuis le backend FastAPI et les affiche dans le tableau.

(async function () {
    const token = localStorage.getItem("jetcongo_token");
    if (!token) {
        // Redirection vers la page de connexion si l'agent n'est pas authentifié
        window.location.href = "login.html";
        return;
    }

    const authHeaders = {
        Authorization: `Bearer ${token}`,
    };

    const summaryIds = {
        totalFlightsToday: "metric-total-flights-today",
        avgLoadFactor: "metric-avg-load-factor",
        pendingCancellations: "metric-pending-cancellations",
    };

    const tbody = document.getElementById("flights-tbody");
    const searchInput = document.getElementById("flight-search-input");
    const statusFilter = document.getElementById("status-filter");
    const aircraftFilter = document.getElementById("aircraft-filter");
    const resetBtn = document.getElementById("reset-filters-btn");
    const paginationSummary = document.getElementById("pagination-summary");
    const prevBtn = document.getElementById("prev-page-btn");
    const nextBtn = document.getElementById("next-page-btn");
    const exportBtn = document.getElementById("flights-export-btn");
    const addFlightBtn = document.getElementById("flight-add-btn");
    const flightsAlertMessage = document.getElementById("flights-alert-message");

    // Modal détails vol
    const flightModal = document.getElementById("flight-details-modal");
    const flightModalTitle = document.getElementById("flight-modal-title");
    const flightModalBody = document.getElementById("flight-modal-body");
    const flightModalClose = document.getElementById("flight-modal-close");

    let allFlights = [];
    let filteredFlights = [];

    function mapStatusToLabel(raw) {
        const value = (raw || "").toString().toLowerCase();
        if (value === "actif") return "Prévu / Actif";
        if (["annule", "annulé", "annulee", "annulée", "cancelled", "canceled"].includes(value)) {
            return "Annulé";
        }
        return raw || "N/A";
    }

    function buildRouteSegment(city) {
        if (!city) return "";
        const code = city.slice(0, 3).toUpperCase();
        return {
            code,
            name: city,
        };
    }

    function formatDate(dateStr) {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    function formatTime(timeStr) {
        if (!timeStr) return "-";
        // timeStr peut être "HH:MM:SS" ou ISO partiel; on reconstruit une Date artificielle
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;
        const d = new Date();
        d.setHours(Number(parts[0]) || 0, Number(parts[1]) || 0, 0, 0);
        return d.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function formatCurrency(amount) {
        const value = Number(amount || 0);
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "USD",
        }).format(value);
    }

    function renderFlights(list) {
        if (!tbody) return;
        tbody.innerHTML = "";

        if (!list.length) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="7" class="px-6 py-6 text-sm text-slate-500 text-center">
                Aucun vol trouvé pour les filtres actuels.
            </td>`;
            tbody.appendChild(tr);
            if (paginationSummary) {
                paginationSummary.textContent = "Aucun vol à afficher";
            }
            return;
        }

        list.forEach((f) => {
            const flightCode = f.flight_code || `JC-${String(f.id || 0).padStart(3, "0")}`;
            const depart = buildRouteSegment(f.depart_city);
            const arrivee = buildRouteSegment(f.arrivee_city);

            const capacity = f.aircraft_capacity || 0;
            const seatsBooked = f.seats_booked || 0;
            const loadFactor = typeof f.load_factor === "number" ? f.load_factor : (
                capacity > 0 ? (seatsBooked / capacity) * 100 : 0
            );

            const availabilityLabel = capacity
                ? `${seatsBooked}/${capacity}`
                : "—";

            const tr = document.createElement("tr");
            tr.className =
                "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group";

            tr.innerHTML = `
                <td class="px-6 py-4 align-top">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-900 dark:text-white">${flightCode}</span>
                        <span class="text-xs text-slate-500">${f.aircraft_model || "Type d'avion inconnu"}</span>
                    </div>
                </td>
                <td class="px-6 py-4 align-top">
                    <div class="flex items-center gap-3">
                        <div class="flex flex-col">
                            <span class="font-medium">${depart.code || ""}</span>
                            <span class="text-[10px] text-slate-400">${depart.name || ""}</span>
                        </div>
                        <span class="material-icons-outlined text-slate-300 text-sm">east</span>
                        <div class="flex flex-col">
                            <span class="font-medium">${arrivee.code || ""}</span>
                            <span class="text-[10px] text-slate-400">${arrivee.name || ""}</span>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 align-top">
                    <div class="flex flex-col">
                        <span class="text-sm font-medium">${formatDate(f.date_depart)}</span>
                        <span class="text-xs text-slate-500">${formatTime(f.heure_depart)}</span>
                    </div>
                </td>
                <td class="px-6 py-4 align-middle">
                    <div class="w-full max-w-[140px]">
                        <div class="flex justify-between text-[10px] mb-1">
                            <span>${availabilityLabel}</span>
                            <span class="font-medium">${Math.round(loadFactor)}%</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full">
                            <div class="bg-primary h-1.5 rounded-full" style="width: ${Math.min(
                                100,
                                Math.max(0, loadFactor)
                            )}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 align-top font-semibold text-slate-900 dark:text-white">
                    ${formatCurrency(f.price)}
                </td>
                <td class="px-6 py-4 align-top">
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                        ${
                            mapStatusToLabel(f.status) === "Annulé"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        }">
                        ${mapStatusToLabel(f.status)}
                    </span>
                </td>
                <td class="px-6 py-4 align-top">
                    <div class="flex items-center gap-2">
                        <button class="flight-edit-btn p-1.5 text-slate-400 hover:text-primary transition-colors"
                                type="button"
                                data-flight-id="${f.id}">
                            <span class="material-icons-outlined text-xl pointer-events-none">edit</span>
                        </button>
                        <button class="flight-more-btn p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                type="button"
                                data-flight-id="${f.id}">
                            <span class="material-icons-outlined text-xl pointer-events-none">more_vert</span>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        if (paginationSummary) {
            paginationSummary.textContent = `Affichage de 1 à ${list.length} sur ${allFlights.length} vols`;
        }

        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
    }

    function applyFilters() {
        const query = (searchInput?.value || "").toLowerCase().trim();
        const statusValue = (statusFilter?.value || "all").toLowerCase();
        const aircraftValue = (aircraftFilter?.value || "all").toLowerCase();

        filteredFlights = allFlights.filter((f) => {
            const label = mapStatusToLabel(f.status).toLowerCase();
            const aircraft = (f.aircraft_model || "").toLowerCase();
            const code = (f.flight_code || `JC-${String(f.id || 0).padStart(3, "0")}`).toLowerCase();
            const depart = (f.depart_city || "").toLowerCase();
            const arrivee = (f.arrivee_city || "").toLowerCase();

            let ok = true;

            if (query) {
                ok =
                    code.includes(query) ||
                    depart.includes(query) ||
                    arrivee.includes(query);
            }

            if (ok && statusValue !== "all") {
                if (statusValue === "cancelled") {
                    ok = label === "annulé";
                } else if (statusValue === "scheduled") {
                    ok = label === "prévu / actif";
                }
            }

            if (ok && aircraftValue !== "all") {
                ok = aircraft === aircraftValue;
            }

            return ok;
        });

        renderFlights(filteredFlights);
    }

    function populateAircraftFilter() {
        if (!aircraftFilter) return;
        const models = Array.from(
            new Set(
                allFlights
                    .map((f) => (f.aircraft_model || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "fr"));

        aircraftFilter.innerHTML = `<option value="all">Tous les types d'avion</option>`;
        models.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = m.toLowerCase();
            opt.textContent = m;
            aircraftFilter.appendChild(opt);
        });
    }

    async function loadSummary() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flights/summary`, {
                headers: authHeaders,
            });
            if (!res.ok) return;

            const data = await res.json();

            const totalEl = document.getElementById(summaryIds.totalFlightsToday);
            const avgEl = document.getElementById(summaryIds.avgLoadFactor);
            const cancelEl = document.getElementById(summaryIds.pendingCancellations);

            if (totalEl) totalEl.textContent = data.total_flights_today ?? 0;
            if (avgEl) {
                const v = data.avg_load_factor ?? 0;
                avgEl.textContent = `${v.toFixed(1)}%`;
            }
            if (cancelEl) cancelEl.textContent = data.pending_cancellations ?? 0;
        } catch (e) {
            console.error("Erreur lors du chargement du résumé des vols", e);
        }
    }

    async function loadFlights() {
        try {
            const res = await fetch(
                `${API_BASE_URL}/admin/flights?limit=200`,
                {
                    headers: authHeaders,
                }
            );

            if (!res.ok) {
                console.error("Erreur de chargement des vols", await res.text());
                return;
            }

            const data = await res.json();
            allFlights = data.items || [];
            filteredFlights = [...allFlights];

            populateAircraftFilter();
            renderFlights(filteredFlights);
        } catch (e) {
            console.error("Erreur réseau lors du chargement des vols", e);
        }
    }

    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    if (aircraftFilter) aircraftFilter.addEventListener("change", applyFilters);

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "all";
            if (aircraftFilter) aircraftFilter.value = "all";
            filteredFlights = [...allFlights];
            renderFlights(filteredFlights);
            if (flightsAlertMessage) {
                flightsAlertMessage.textContent =
                    "Filtres réinitialisés. Tous les vols disponibles sont affichés.";
            }
        });
    }

    // Actions sur les boutons d'action dans le tableau (voir détails, actions rapides)
    if (tbody) {
        tbody.addEventListener("click", (event) => {
            const editBtn = event.target.closest(".flight-edit-btn");
            const moreBtn = event.target.closest(".flight-more-btn");
            if (!editBtn && !moreBtn) return;

            const sourceBtn = editBtn || moreBtn;
            const id = Number(sourceBtn.dataset.flightId || "0");
            if (!id) return;

            const flight = allFlights.find((f) => f.id === id);
            if (!flight) {
                if (typeof showNotification === "function") {
                    showNotification("Vol introuvable pour cette action.", "error");
                }
                return;
            }

            if (editBtn) {
                openFlightDetailsModal(flight);
            } else if (moreBtn) {
                if (typeof showNotification === "function") {
                    showNotification(
                        `Actions avancées pour ${flight.flight_code || `JC-${String(id).padStart(3, "0")}`} en cours de préparation.`,
                        "info"
                    );
                }
            }
        });
    }

    function openFlightDetailsModal(flight) {
        if (!flightModal || !flightModalBody || !flightModalTitle) return;

        const flightCode = flight.flight_code || `JC-${String(flight.id || 0).padStart(3, "0")}`;
        const depart = buildRouteSegment(flight.depart_city);
        const arrivee = buildRouteSegment(flight.arrivee_city);
        const capacity = flight.aircraft_capacity || 0;
        const seatsBooked = flight.seats_booked || 0;
        const loadFactor =
            typeof flight.load_factor === "number"
                ? flight.load_factor
                : capacity > 0
                ? (seatsBooked / capacity) * 100
                : 0;

        flightModalTitle.textContent = `Détails du vol ${flightCode}`;
        flightModalBody.innerHTML = `
            <dl class="space-y-2">
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Trajet</dt>
                    <dd class="text-sm font-medium text-right">
                        ${depart.code || ""} (${depart.name || ""})
                        <span class="mx-1 material-icons-outlined text-xs align-middle text-slate-400">east</span>
                        ${arrivee.code || ""} (${arrivee.name || ""})
                    </dd>
                </div>
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Horaire départ</dt>
                    <dd class="text-sm font-medium text-right">
                        ${formatDate(flight.date_depart)} à ${formatTime(flight.heure_depart)}
                    </dd>
                </div>
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Avion</dt>
                    <dd class="text-sm text-right">
                        ${flight.aircraft_model || "Type d'avion inconnu"}<br>
                        <span class="text-xs text-slate-500">Capacité: ${capacity || "N/A"} sièges</span>
                    </dd>
                </div>
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Remplissage</dt>
                    <dd class="text-sm text-right">
                        ${seatsBooked}/${capacity || "N/A"} sièges (${Math.round(loadFactor)}%)
                    </dd>
                </div>
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Tarif</dt>
                    <dd class="text-sm font-semibold text-right">
                        ${formatCurrency(flight.price)}
                    </dd>
                </div>
                <div class="flex justify-between gap-4">
                    <dt class="text-xs uppercase tracking-wide text-slate-500">Statut</dt>
                    <dd class="text-sm text-right">
                        ${mapStatusToLabel(flight.status)}
                    </dd>
                </div>
            </dl>
            <p class="mt-4 text-xs text-slate-500">
                Les actions de modification / annulation seront bientôt disponibles depuis cette vue détaillée.
            </p>
        `;

        flightModal.classList.remove("hidden");
        flightModal.classList.add("flex");
    }

    if (flightModalClose && flightModal) {
        flightModalClose.addEventListener("click", () => {
            flightModal.classList.add("hidden");
            flightModal.classList.remove("flex");
        });
    }

    if (flightModal) {
        flightModal.addEventListener("click", (e) => {
            if (e.target === flightModal) {
                flightModal.classList.add("hidden");
                flightModal.classList.remove("flex");
            }
        });
    }

    // Export des vols (Excel + PDF) à partir de la liste filtrée
    function getFlightsForExport() {
        if (filteredFlights && filteredFlights.length) {
            return filteredFlights;
        }
        return allFlights || [];
    }

    function exportFlightsToExcel(flights) {
        if (!window.XLSX || !flights.length) return;

        const rows = flights.map((f) => {
            const depart = buildRouteSegment(f.depart_city);
            const arrivee = buildRouteSegment(f.arrivee_city);
            const capacity = f.aircraft_capacity || 0;
            const seatsBooked = f.seats_booked || 0;
            const loadFactor =
                typeof f.load_factor === "number"
                    ? f.load_factor
                    : capacity > 0
                    ? (seatsBooked / capacity) * 100
                    : 0;

            return {
                "Code vol": f.flight_code || `JC-${String(f.id || 0).padStart(3, "0")}`,
                "Ville départ": depart.name || "",
                "Ville arrivée": arrivee.name || "",
                "Date départ": formatDate(f.date_depart),
                "Heure départ": formatTime(f.heure_depart),
                "Avion": f.aircraft_model || "",
                "Capacité": capacity,
                "Places réservées": seatsBooked,
                "Taux de remplissage (%)": Math.round(loadFactor),
                "Tarif (USD)": Number(f.price || 0),
                "Statut": mapStatusToLabel(f.status),
            };
        });

        const worksheet = window.XLSX.utils.json_to_sheet(rows);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Vols");

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        const filename = `vols_agent_${dateStr}.xlsx`;
        window.XLSX.writeFile(workbook, filename);
    }

    function exportFlightsToPdf(flights) {
        if (!window.jspdf || !flights.length) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");

        const today = new Date();
        const dateStr = today.toLocaleString("fr-FR");

        doc.setFontSize(16);
        doc.text("Rapport des vols - Vue Agent", 40, 40);
        doc.setFontSize(10);
        doc.text(`Généré le ${dateStr}`, 40, 58);

        const head = [
            [
                "Code vol",
                "Départ",
                "Arrivée",
                "Date départ",
                "Heure départ",
                "Avion",
                "Capacité",
                "Réservées",
                "Remplissage",
                "Tarif (USD)",
                "Statut",
            ],
        ];

        const body = flights.map((f) => {
            const depart = buildRouteSegment(f.depart_city);
            const arrivee = buildRouteSegment(f.arrivee_city);
            const capacity = f.aircraft_capacity || 0;
            const seatsBooked = f.seats_booked || 0;
            const loadFactor =
                typeof f.load_factor === "number"
                    ? f.load_factor
                    : capacity > 0
                    ? (seatsBooked / capacity) * 100
                    : 0;

            return [
                f.flight_code || `JC-${String(f.id || 0).padStart(3, "0")}`,
                depart.name || "",
                arrivee.name || "",
                formatDate(f.date_depart),
                formatTime(f.heure_depart),
                f.aircraft_model || "",
                capacity,
                seatsBooked,
                `${Math.round(loadFactor)}%`,
                Number(f.price || 0).toFixed(2),
                mapStatusToLabel(f.status),
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
        const filename = `vols_agent_${filenameSafeDate}.pdf`;
        doc.save(filename);
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const flights = getFlightsForExport();
            if (!flights.length) {
                if (typeof showNotification === "function") {
                    showNotification("Aucun vol à exporter pour les filtres actuels.", "info");
                }
                return;
            }

            // Export Excel + PDF en respectant les filtres appliqués
            try {
                exportFlightsToExcel(flights);
                exportFlightsToPdf(flights);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Export des vols effectué en Excel et PDF (filtres actuels).",
                        "success"
                    );
                }
            } catch (e) {
                console.error("Erreur lors de l'export des vols", e);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Une erreur est survenue lors de l'export des vols.",
                        "error"
                    );
                }
            }
        });
    }

    if (addFlightBtn) {
        addFlightBtn.addEventListener("click", () => {
            if (typeof showNotification === "function") {
                showNotification(
                    "La création de nouveaux vols via cette interface sera activée une fois la connexion Supabase stabilisée.",
                    "info"
                );
            }
        });
    }

    // Pas de pagination côté serveur pour l'instant : les boutons restent désactivés.
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    await Promise.all([loadSummary(), loadFlights()]);
})();

