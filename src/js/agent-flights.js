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

    // Modal détails vol (Lecture seule)
    const flightModal = document.getElementById("flight-details-modal");
    const flightModalTitle = document.getElementById("flight-modal-title");
    const flightModalBody = document.getElementById("flight-modal-body");
    const flightModalClose = document.getElementById("flight-modal-close");

    // Modal Formulaire Vol (Ajout/Modif)
    const flightFormModal = document.getElementById("flight-form-modal");
    const flightForm = document.getElementById("flight-form");
    const flightFormTitle = document.getElementById("flight-form-title");
    const flightFormClose = document.getElementById("flight-form-close");
    const flightFormCancel = document.getElementById("flight-form-cancel");

    // Inputs Formulaire
    const inputId = document.getElementById("flight-id"); // Hidden
    const inputCode = document.getElementById("flight-code");
    const selectAircraft = document.getElementById("flight-aircraft");
    const inputDepart = document.getElementById("flight-depart");
    const inputArrivee = document.getElementById("flight-arrivee");
    const inputDate = document.getElementById("flight-date");
    const inputTime = document.getElementById("flight-time");
    const inputPrice = document.getElementById("flight-price");
    const selectStatus = document.getElementById("flight-status");

    let allFlights = [];
    let filteredFlights = [];
    let aircraftList = []; // Stocker la liste des avions pour le formulaire

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
            minimumFractionDigits: 2,
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
            tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all reveal";

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
                        ${mapStatusToLabel(f.status) === "Annulé"
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
                                data-flight-id="${f.id}"
                                title="Modifier">
                            <span class="material-icons-outlined text-xl pointer-events-none">edit</span>
                        </button>
                        <button class="flight-delete-btn p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                type="button"
                                data-flight-id="${f.id}"
                                title="Supprimer">
                            <span class="material-icons-outlined text-xl pointer-events-none">delete</span>
                        </button>
                        <button class="flight-more-btn p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                type="button"
                                data-flight-id="${f.id}"
                                title="Détails / Plus">
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

        if (typeof setupScrollAnimations === 'function') setupScrollAnimations();
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

            if (res.status === 401) {
                localStorage.removeItem("jetcongo_token");
                window.location.href = "login.html";
                return;
            }

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

            if (res.status === 401) {
                localStorage.removeItem("jetcongo_token");
                window.location.href = "login.html";
                return;
            }

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

    // --- GESTION FORMULAIRE VOL (AJOUT / MODIF) ---

    async function loadAircraftsForForm() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/aircrafts`, { headers: authHeaders });
            if (res.ok) {
                const data = await res.json();
                aircraftList = data.items || [];
                populateAircraftSelect(aircraftList);
            }
        } catch (e) {
            console.error("Erreur chargement avions pour formulaire", e);
        }
    }

    function populateAircraftSelect(list) {
        if (!selectAircraft) return;
        selectAircraft.innerHTML = '<option value="">Sélectionner un avion</option>';
        list.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.id;
            opt.textContent = `${a.modele} (${a.compagnie || 'JetCongo'}) - Cap: ${a.capacite}`;
            selectAircraft.appendChild(opt);
        });
    }

    function openFlightForm(flight) {
        if (!flightFormModal) return;

        // Reset form
        if (flightForm) flightForm.reset();
        if (inputId) inputId.value = "";

        // S'assurer que les avions sont chargés
        if (aircraftList.length === 0) loadAircraftsForForm();

        if (flight) {
            // Mode Edition
            if (flightFormTitle) flightFormTitle.textContent = "Modifier le Vol";
            if (inputId) inputId.value = flight.id;
            if (inputCode) inputCode.value = flight.flight_code || "";
            if (inputDepart) inputDepart.value = flight.depart_city || "";
            if (inputArrivee) inputArrivee.value = flight.arrivee_city || "";

            if (flight.date_depart && inputDate) {
                // S'assurer d'avoir YYYY-MM-DD
                const d = new Date(flight.date_depart);
                inputDate.value = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : flight.date_depart;
            }

            if (inputTime) inputTime.value = flight.heure_depart || "";
            if (inputPrice) inputPrice.value = flight.price || "";
            if (selectStatus) selectStatus.value = (flight.status || "actif").toLowerCase();

            // Sélection avion
            if (selectAircraft) {
                if (flight.aircraft_id) {
                    selectAircraft.value = flight.aircraft_id;
                } else {
                    // Fallback par modèle
                    const match = aircraftList.find(a => a.modele === flight.aircraft_model);
                    if (match) selectAircraft.value = match.id;
                }
            }

        } else {
            // Mode Création
            if (flightFormTitle) flightFormTitle.textContent = "Nouveau Vol";
            if (selectStatus) selectStatus.value = "actif";
        }

        // Afficher Modal
        flightFormModal.classList.remove("hidden");
        requestAnimationFrame(() => {
            flightFormModal.classList.remove("opacity-0");
            const inner = flightFormModal.querySelector("div");
            if (inner) inner.classList.replace("scale-95", "scale-100");
        });
    }

    function closeFlightForm() {
        if (!flightFormModal) return;

        flightFormModal.classList.add("opacity-0");
        const inner = flightFormModal.querySelector("div");
        if (inner) inner.classList.replace("scale-100", "scale-95");

        setTimeout(() => {
            flightFormModal.classList.add("hidden");
        }, 300);
    }

    async function saveFlight(e) {
        e.preventDefault();

        if (!flightForm.checkValidity()) {
            flightForm.reportValidity();
            return;
        }

        const id = inputId.value;
        const isEdit = Boolean(id);

        const payload = {
            flight_code: inputCode.value.trim(),
            aircraft_id: Number(selectAircraft.value),
            depart_city: inputDepart.value.trim(),
            arrivee_city: inputArrivee.value.trim(),
            date_depart: inputDate.value,
            heure_depart: inputTime.value,
            price: Number(inputPrice.value),
            status: selectStatus.value
        };

        const url = isEdit
            ? `${API_BASE_URL}/admin/flights/${id}`
            : `${API_BASE_URL}/admin/flights`;

        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || `Erreur ${res.status}`);
            }

            showNotification(isEdit ? "Vol mis à jour avec succès." : "Vol créé avec succès.", "success");
            closeFlightForm();
            loadFlights(); // Rafraîchir
            loadSummary();

        } catch (error) {
            console.error("Erreur sauvegarde vol", error);
            showNotification(error.message || "Impossible d'enregistrer le vol.", "error");
        }
    }

    // --- EVENTS ET BINDINGS ---

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

    // Clics dans le tableau (Edit / Détails)
    if (tbody) {
        tbody.addEventListener("click", (event) => {
            const editBtn = event.target.closest(".flight-edit-btn");
            const deleteBtn = event.target.closest(".flight-delete-btn");
            const moreBtn = event.target.closest(".flight-more-btn");

            if (editBtn) {
                const id = Number(editBtn.dataset.flightId);
                const flight = allFlights.find(f => f.id === id);
                if (flight) {
                    openFlightForm(flight);
                }
                return;
            }

            if (deleteBtn) {
                const id = Number(deleteBtn.dataset.flightId);
                deleteFlight(id);
                return;
            }

            if (moreBtn) {
                const id = Number(moreBtn.dataset.flightId);
                const flight = allFlights.find(f => f.id === id);
                if (flight) {
                    openFlightDetailsModal(flight);
                }
            }
        });
    }

    async function deleteFlight(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flights/${id}`, {
                method: "DELETE",
                headers: authHeaders
            });

            if (res.status === 204) {
                showNotification("Vol supprimé avec succès.", "success");
                loadFlights();
                loadSummary();
            } else {
                const data = await res.json();
                throw new Error(data.detail || "Erreur lors de la suppression.");
            }
        } catch (error) {
            console.error("Erreur suppression vol", error);
            showNotification(error.message, "error");
        }
    }

    function openFlightDetailsModal(flight) {
        if (!flightModal || !flightModalBody || !flightModalTitle) return;

        const flightCode = flight.flight_code || `JC-${String(flight.id || 0).padStart(3, "0")}`;
        const depart = buildRouteSegment(flight.depart_city);
        const arrivee = buildRouteSegment(flight.arrivee_city);
        const capacity = flight.aircraft_capacity || 0;
        const seatsBooked = flight.seats_booked || 0;

        flightModalTitle.textContent = `Détails du vol ${flightCode}`;

        // Contenu read-only
        flightModalBody.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                     <div class="text-center">
                        <div class="text-2xl font-bold">${depart.code}</div>
                        <div class="text-xs text-slate-500">${depart.name}</div>
                     </div>
                     <span class="material-icons text-slate-300">flight_takeoff</span>
                     <div class="text-center">
                        <div class="text-2xl font-bold">${arrivee.code}</div>
                        <div class="text-xs text-slate-500">${arrivee.name}</div>
                     </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                        <div class="text-xs text-slate-500 uppercase">Départ</div>
                        <div class="font-semibold">${formatDate(flight.date_depart)}</div>
                        <div class="text-sm">${formatTime(flight.heure_depart)}</div>
                    </div>
                    <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                         <div class="text-xs text-slate-500 uppercase">Avion</div>
                         <div class="font-semibold truncate">${flight.aircraft_model || 'N/A'}</div>
                         <div class="text-sm text-slate-500">${capacity} places</div>
                    </div>
                    <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                         <div class="text-xs text-slate-500 uppercase">Prix</div>
                         <div class="font-bold text-lg text-primary">${formatCurrency(flight.price)}</div>
                    </div>
                    <div class="p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                         <div class="text-xs text-slate-500 uppercase">Statut</div>
                         <div class="font-medium capitalize">${(flight.status || 'Actif').toLowerCase()}</div>
                    </div>
                </div>
            </div>
        `;

        flightModal.classList.remove("hidden");
        flightModal.classList.add("flex");
    }

    if (flightModalClose) {
        flightModalClose.addEventListener("click", () => {
            flightModal.classList.add("hidden");
            flightModal.classList.remove("flex");
        });
    }

    // Bouton Ajouter
    if (addFlightBtn) {
        // Supprimer éventuels anciens listeners en clonant (simple trick)
        const newBtn = addFlightBtn.cloneNode(true);
        addFlightBtn.parentNode.replaceChild(newBtn, addFlightBtn);
        newBtn.addEventListener("click", () => openFlightForm(null));
    }

    // Modal Form events
    if (flightFormClose) flightFormClose.addEventListener("click", closeFlightForm);
    if (flightFormCancel) flightFormCancel.addEventListener("click", closeFlightForm);
    if (flightForm) flightForm.addEventListener("submit", saveFlight);


    // Export
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const flights = (filteredFlights && filteredFlights.length) ? filteredFlights : allFlights;
            if (!flights || !flights.length) {
                if (typeof showNotification === "function") showNotification("Aucun vol à exporter", "info");
                return;
            }
            try {
                // Utiliser les fonctions déjà définies exportFlightsToExcel/Pdf si elles existent, 
                // ou réimplémenter ici brièvement. Pour la lisibilité, je les avais incluses.
                // Je vais appeler une fonction unique qui fait les deux si dispo.
                exportFlightsInternal(flights);
            } catch (e) { console.error(e); }
        });
    }

    // Fonction Helper Export INTERNE au scope
    function exportFlightsInternal(flights) {
        if (!window.XLSX || !window.jspdf) return;
        // Excel
        const rows = flights.map(f => ({
            "Code": f.flight_code || `JC-${f.id}`,
            "Départ": f.depart_city,
            "Arrivée": f.arrivee_city,
            "Date": f.date_depart,
            "Heure": f.heure_depart,
            "Prix": f.price,
            "Statut": f.status
        }));
        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Vols");
        window.XLSX.writeFile(wb, `vols_agent_${new Date().toISOString().slice(0, 10)}.xlsx`);

        if (typeof showNotification === 'function') showNotification("Export réussi (Excel)", "success");
    }


    // Initialisation
    loadAircraftsForForm();
    await Promise.all([loadSummary(), loadFlights()]);

})();

