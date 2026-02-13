// Dashboard Agent - chargement des statistiques depuis l'API
(async function () {
    const token = localStorage.getItem("jetcongo_token");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    const exportBtn = document.getElementById("dashboard-export-btn");

    // Données mises en cache pour l'export
    let overviewData = null;
    let weeklyData = [];
    let recentReservations = [];

    try {
        const responses = await Promise.all([
            fetch(`${API_BASE_URL}/admin/stats/overview`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
            fetch(`${API_BASE_URL}/admin/stats/weekly-bookings`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
            fetch(`${API_BASE_URL}/admin/reservations/recent?limit=5`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }),
        ]);

        // Check for 401 Unauthorized in any response
        if (responses.some(r => r.status === 401)) {
            console.warn("Session expired or unauthorized. Redirecting to login.");
            localStorage.removeItem("jetcongo_token");
            window.location.href = "login.html";
            return;
        }

        const [overviewRes, weeklyRes, recentRes] = responses;

        if (overviewRes.ok) {
            overviewData = await overviewRes.json();
            const activeFlightsEl = document.getElementById("stat-active-flights");
            const pendingResEl = document.getElementById("stat-pending-reservations");
            const totalRevenueEl = document.getElementById("stat-total-revenue");

            if (activeFlightsEl) activeFlightsEl.textContent = overviewData.active_flights ?? 0;
            if (pendingResEl) pendingResEl.textContent = overviewData.pending_reservations ?? 0;
            if (totalRevenueEl) {
                const value = overviewData.total_revenue ?? 0;
                totalRevenueEl.textContent = new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                }).format(value);
            }
        }

        if (weeklyRes.ok) {
            const weekly = await weeklyRes.json();
            weeklyData = weekly.data || [];
            // Met à jour les étiquettes et éventuellement les hauteurs de barres si souhaité
            weeklyData.forEach((item) => {
                const labelEl = document.querySelector(`[data-weekday-label="${item.day}"]`);
                const barEl = document.querySelector(`[data-weekday-bar="${item.day}"]`);
                if (labelEl) {
                    // On peut afficher le nombre de réservations dans le tooltip titre par exemple
                    labelEl.title = `${item.count} réservations`;
                }
                if (barEl) {
                    // Hauteur relative simple : min 10%, max 100%
                    const maxHeight = 100;
                    const percent = Math.max(10, Math.min(maxHeight, item.count * 10));
                    barEl.style.height = `${percent}%`;
                }
            });
        }

        if (recentRes.ok) {
            const recent = await recentRes.json();
            recentReservations = recent.items || [];
            const tbody = document.getElementById("recent-reservations-body");
            if (tbody) {
                tbody.innerHTML = "";
                recentReservations.forEach((r) => {
                    const tr = document.createElement("tr");
                    tr.className =
                        "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors";
                    tr.innerHTML = `
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                    ${r.initials || "NA"}
                                </div>
                                <span class="text-sm font-medium dark:text-slate-200">${r.passenger_name || "Inconnu"}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            ${r.flight_code || "-"}
                        </td>
                        <td class="px-6 py-4">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${(r.status || "").toUpperCase() === "PAYE"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }">
                                ${(r.status || "").toUpperCase() === "PAYE"
                            ? "Confirmée"
                            : "En attente"
                        }
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm font-bold text-right dark:text-slate-200">
                            ${new Intl.NumberFormat("fr-FR", {
                            style: "currency",
                            currency: "USD",
                        }).format(r.amount || 0)}
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (error) {
        console.error("Erreur lors du chargement du tableau de bord agent", error);
    }

    function exportDashboardToExcel() {
        if (!window.XLSX) return;

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);

        const kpiSheetData = [
            ["Indicateur", "Valeur"],
            ["Vols actifs", overviewData?.active_flights ?? 0],
            ["Réservations en attente", overviewData?.pending_reservations ?? 0],
            ["Revenus totaux (USD)", overviewData?.total_revenue ?? 0],
        ];

        const weeklySheetData = [
            ["Jour", "Nombre de réservations"],
            ...weeklyData.map((w) => [w.day, w.count]),
        ];

        const reservationsSheetData = [
            ["Passager", "Code vol", "Statut", "Montant (USD)"],
            ...recentReservations.map((r) => [
                r.passenger_name || "Inconnu",
                r.flight_code || "-",
                (r.status || "").toUpperCase() === "PAYE" ? "Confirmée" : "En attente",
                Number(r.amount || 0),
            ]),
        ];

        const wb = window.XLSX.utils.book_new();
        const wsKpi = window.XLSX.utils.aoa_to_sheet(kpiSheetData);
        const wsWeekly = window.XLSX.utils.aoa_to_sheet(weeklySheetData);
        const wsRecent = window.XLSX.utils.aoa_to_sheet(reservationsSheetData);

        window.XLSX.utils.book_append_sheet(wb, wsKpi, "KPI");
        window.XLSX.utils.book_append_sheet(wb, wsWeekly, "Semaine");
        window.XLSX.utils.book_append_sheet(wb, wsRecent, "Réservations");

        window.XLSX.writeFile(wb, `dashboard_agent_${dateStr}.xlsx`);
    }

    function exportDashboardToPdf() {
        if (!window.jspdf) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "pt", "a4");

        const today = new Date();
        const dateStr = today.toLocaleString("fr-FR");

        doc.setFontSize(16);
        doc.text("Rapport Tableau de bord - Agent", 40, 40);
        doc.setFontSize(10);
        doc.text(`Généré le ${dateStr}`, 40, 58);

        // Section KPI
        const kpiRows = [
            ["Vols actifs", String(overviewData?.active_flights ?? 0)],
            ["Réservations en attente", String(overviewData?.pending_reservations ?? 0)],
            ["Revenus totaux (USD)", String(overviewData?.total_revenue ?? 0)],
        ];

        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: 80,
                head: [["Indicateur", "Valeur"]],
                body: kpiRows,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [19, 127, 236] },
            });

            // Section réservations récentes
            const resBody = recentReservations.map((r) => [
                r.passenger_name || "Inconnu",
                r.flight_code || "-",
                (r.status || "").toUpperCase() === "PAYE" ? "Confirmée" : "En attente",
                Number(r.amount || 0).toFixed(2),
            ]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 30,
                head: [["Passager", "Vol", "Statut", "Montant (USD)"]],
                body: resBody,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [19, 127, 236] },
            });
        }

        const filenameSafeDate = today.toISOString().slice(0, 10);
        doc.save(`dashboard_agent_${filenameSafeDate}.pdf`);
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            try {
                exportDashboardToExcel();
                exportDashboardToPdf();
                if (typeof showNotification === "function") {
                    showNotification(
                        "Rapport du tableau de bord exporté en Excel et PDF.",
                        "success"
                    );
                }
            } catch (e) {
                console.error("Erreur export dashboard", e);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Une erreur est survenue lors de l'export du rapport.",
                        "error"
                    );
                }
            }
        });
    }
})();

