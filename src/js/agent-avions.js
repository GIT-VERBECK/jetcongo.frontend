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

    const gridEl = document.getElementById("aircraft-grid");
    const searchInput = document.getElementById("aircraft-search-input");
    const statusFilter = document.getElementById("aircraft-status-filter");
    const countLabel = document.getElementById("aircraft-count-label");
    const exportBtn = document.getElementById("aircraft-export-btn");

    const panel = document.getElementById("aircraft-panel");
    const openPanelBtn = document.getElementById("open-aircraft-modal-btn");
    const panelTitle = document.getElementById("aircraft-panel-title");
    const panelClose = document.getElementById("aircraft-panel-close");
    const panelCancel = document.getElementById("aircraft-panel-cancel");
    const panelSave = document.getElementById("aircraft-panel-save");

    const form = document.getElementById("aircraft-form");
    const idInput = document.getElementById("aircraft-id");
    const modeleInput = document.getElementById("aircraft-modele");
    const compagnieInput = document.getElementById("aircraft-compagnie");
    const capaciteInput = document.getElementById("aircraft-capacite");
    const statutInput = document.getElementById("aircraft-statut");

    const alertBox = document.getElementById("aircraft-alert");
    const alertText = document.getElementById("aircraft-alert-text");
    const alertClose = document.getElementById("aircraft-alert-close");

    let aircrafts = [];

    function openPanel(editAircraft) {
        if (editAircraft) {
            panelTitle.textContent = "Modifier un avion";
            idInput.value = editAircraft.id;
            modeleInput.value = editAircraft.modele || "";
            compagnieInput.value = editAircraft.compagnie || "";
            capaciteInput.value = editAircraft.capacite || "";
            statutInput.value = (editAircraft.statut || "disponible").toLowerCase();
        } else {
            panelTitle.textContent = "Ajouter un avion";
            idInput.value = "";
            form.reset();
            statutInput.value = "disponible";
        }
        panel.classList.remove("translate-x-full");
    }

    function closePanel() {
        panel.classList.add("translate-x-full");
    }

    function showAlert(message) {
        if (!alertBox || !alertText) return;
        alertText.textContent = message;
        alertBox.classList.remove("hidden");
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.classList.add("hidden");
    }

    async function loadAircrafts() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/aircrafts`, {
                headers,
            });
            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }
            const data = await res.json();
            aircrafts = data.items || [];
            renderAircrafts();
        } catch (e) {
            console.error("Erreur chargement avions", e);
            if (typeof showNotification === "function") {
                showNotification("Erreur lors du chargement des avions.", "error");
            }
        }
    }

    function getFilteredAircrafts() {
        const query = (searchInput?.value || "").toLowerCase();
        const status = (statusFilter?.value || "all").toLowerCase();

        return aircrafts.filter((a) => {
            const text = `${a.modele || ""} ${a.compagnie || ""}`.toLowerCase();
            const statut = (a.statut || "").toLowerCase();
            let ok = true;
            if (query) ok = text.includes(query);
            if (ok && status !== "all") {
                ok = statut === status;
            }
            return ok;
        });
    }

    function renderAircrafts() {
        if (!gridEl) return;

        const filtered = getFilteredAircrafts();

        if (countLabel) {
            countLabel.textContent =
                filtered.length === 0
                    ? "Aucun avion"
                    : `${filtered.length} avion(s) affiché(s)`;
        }

        if (!filtered.length) {
            gridEl.innerHTML =
                '<div class="col-span-full text-sm text-slate-500">Aucun avion trouvé.</div>';
            return;
        }

        gridEl.innerHTML = filtered
            .map((a) => {
                const statutLower = (a.statut || "").toLowerCase();
                let badgeClass =
                    "px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                let badgeLabel = "Disponible";
                if (statutLower.includes("maint")) {
                    badgeClass =
                        "px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                    badgeLabel = "Maintenance";
                } else if (statutLower && statutLower !== "disponible") {
                    badgeClass =
                        "px-3 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
                    badgeLabel = "Indisponible";
                }

                const volsCount = a.vols_count || 0;
                const hasUsage = volsCount > 0;

                return `
                <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden group hover:shadow-lg transition-shadow">
                    <div class="h-32 bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                        <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                            ${(a.modele || "A").charAt(0)}
                        </div>
                        <div class="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-white shadow-sm uppercase tracking-wide">
                            ID-${a.id}
                        </div>
                    </div>
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="font-bold text-lg text-slate-900 dark:text-white">${a.modele || "Modèle inconnu"}</h3>
                                <p class="text-slate-500 text-sm">${a.compagnie || "Compagnie non spécifiée"}</p>
                            </div>
                            <span class="${badgeClass} text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full ${statutLower === "disponible" ? "bg-green-500" : "bg-amber-500"}"></span>
                                ${badgeLabel}
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p class="text-[10px] uppercase text-slate-500 font-bold mb-1">Capacité</p>
                                <p class="text-sm font-bold text-primary">${a.capacite || 0} sièges</p>
                            </div>
                            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <p class="text-[10px] uppercase text-slate-500 font-bold mb-1">Vols associés</p>
                                <p class="text-sm font-bold text-primary">${volsCount}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button data-aircraft-id="${a.id}"
                                    class="js-aircraft-edit flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg font-semibold text-sm transition-colors">
                                Modifier
                            </button>
                            <button data-aircraft-id="${a.id}"
                                    class="js-aircraft-delete w-10 h-10 border border-slate-200 dark:border-slate-700 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 transition-colors ${hasUsage ? "opacity-40 cursor-not-allowed" : ""}"
                                    ${hasUsage ? "disabled" : ""}>
                                <span class="material-icons text-lg">delete_outline</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");
    }

    async function saveAircraft() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const payload = {
            modele: modeleInput.value.trim(),
            capacite: Number(capaciteInput.value),
            statut: statutInput.value,
            compagnie: compagnieInput.value.trim() || null,
        };
        const id = idInput.value;

        const isEdit = Boolean(id);
        const url = isEdit
            ? `${API_BASE_URL}/admin/aircrafts/${id}`
            : `${API_BASE_URL}/admin/aircrafts`;
        const method = isEdit ? "PUT" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Erreur ${res.status}`);
            }
            await loadAircrafts();
            closePanel();
            if (typeof showNotification === "function") {
                showNotification(
                    isEdit ? "Avion mis à jour avec succès." : "Avion créé avec succès.",
                    "success"
                );
            }
        } catch (e) {
            console.error("Erreur sauvegarde avion", e);
            if (typeof showNotification === "function") {
                showNotification(e.message || "Erreur lors de l'enregistrement de l'avion.", "error");
            }
        }
    }

    async function deleteAircraft(id) {
        if (!id) return;
        if (!confirm("Supprimer cet avion ? Il doit ne pas être utilisé par un vol.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/aircrafts/${id}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok && res.status !== 204) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `Erreur ${res.status}`);
            }
            await loadAircrafts();
            if (typeof showNotification === "function") {
                showNotification("Avion supprimé.", "success");
            }
        } catch (e) {
            console.error("Erreur suppression avion", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message ||
                        "Impossible de supprimer cet avion (peut-être lié à des vols existants).",
                    "error"
                );
            }
        }
    }

    function exportAircraftsToExcel(list) {
        if (!window.XLSX || !list.length) return;

        const rows = list.map((a) => ({
            "ID": a.id,
            "Modèle": a.modele || "",
            "Compagnie": a.compagnie || "",
            "Capacité": a.capacite || 0,
            "Statut": a.statut || "",
            "Vols associés": a.vols_count || 0,
        }));

        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Avions");

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        window.XLSX.writeFile(wb, `flotte_agent_${dateStr}.xlsx`);
    }

    function exportAircraftsToPdf(list) {
        if (!window.jspdf || !list.length) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");

        const today = new Date();
        const dateStr = today.toLocaleString("fr-FR");

        doc.setFontSize(16);
        doc.text("Rapport Flotte - Vue Agent", 40, 40);
        doc.setFontSize(10);
        doc.text(`Généré le ${dateStr}`, 40, 58);

        const head = [["ID", "Modèle", "Compagnie", "Capacité", "Statut", "Vols associés"]];
        const body = list.map((a) => [
            a.id,
            a.modele || "",
            a.compagnie || "",
            a.capacite || 0,
            a.statut || "",
            a.vols_count || 0,
        ]);

        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: 80,
                head,
                body,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [19, 127, 236] },
            });
        }

        const filenameSafeDate = today.toISOString().slice(0, 10);
        doc.save(`flotte_agent_${filenameSafeDate}.pdf`);
    }

    // Events
    if (openPanelBtn) openPanelBtn.addEventListener("click", () => openPanel(null));
    if (panelClose) panelClose.addEventListener("click", closePanel);
    if (panelCancel) panelCancel.addEventListener("click", closePanel);
    if (panelSave) panelSave.addEventListener("click", (e) => {
        e.preventDefault();
        saveAircraft();
    });

    if (alertClose) alertClose.addEventListener("click", hideAlert);

    if (searchInput) searchInput.addEventListener("input", () => renderAircrafts());
    if (statusFilter) statusFilter.addEventListener("change", () => renderAircrafts());

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const filtered = getFilteredAircrafts();
            if (!filtered.length) {
                if (typeof showNotification === "function") {
                    showNotification("Aucun avion à exporter pour les filtres actuels.", "info");
                }
                return;
            }

            try {
                exportAircraftsToExcel(filtered);
                exportAircraftsToPdf(filtered);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Export de la flotte effectué en Excel et PDF (filtres actuels).",
                        "success"
                    );
                }
            } catch (e) {
                console.error("Erreur export flotte", e);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Une erreur est survenue lors de l'export de la flotte.",
                        "error"
                    );
                }
            }
        });
    }

    if (gridEl) {
        gridEl.addEventListener("click", (e) => {
            const editBtn = e.target.closest(".js-aircraft-edit");
            if (editBtn) {
                const id = Number(editBtn.getAttribute("data-aircraft-id"));
                const a = aircrafts.find((x) => x.id === id);
                if (a) openPanel(a);
                return;
            }
            const deleteBtn = e.target.closest(".js-aircraft-delete");
            if (deleteBtn && !deleteBtn.disabled) {
                const id = Number(deleteBtn.getAttribute("data-aircraft-id"));
                deleteAircraft(id);
            }
        });
    }

    // Chargement initial
    loadAircrafts().then(() => {
        const needMaintenance = aircrafts.filter(
            (a) => (a.statut || "").toLowerCase().includes("maint")
        );
        if (needMaintenance.length > 0) {
            showAlert(
                `Attention : ${needMaintenance.length} avion(s) sont en maintenance ou en anomalie.`
            );
        }
    });
})(); 

