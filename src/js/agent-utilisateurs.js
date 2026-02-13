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

    const tbody = document.getElementById("user-table-body");
    const countLabel = document.getElementById("user-table-count");
    const searchInput = document.getElementById("user-search-input");
    const roleFilter = document.getElementById("user-role-filter");
    const statusFilter = document.getElementById("user-status-filter");
    const exportBtn = document.getElementById("user-export-btn");

    const modal = document.getElementById("user-modal");
    const modalTitle = document.getElementById("user-modal-title");
    const modalClose = document.getElementById("user-modal-close");
    const modalCancel = document.getElementById("user-modal-cancel");
    const modalSave = document.getElementById("user-modal-save");
    const openModalBtn = document.getElementById("open-user-modal-btn");

    const idInput = document.getElementById("user-id");
    const nameInput = document.getElementById("user-name");
    const emailInput = document.getElementById("user-email");
    const roleInput = document.getElementById("user-role");
    const statusInput = document.getElementById("user-status");

    let users = [];

    function openModal(user) {
        if (user) {
            modalTitle.textContent = "Modifier un utilisateur";
            idInput.value = user.id;
            nameInput.value = user.nom || "";
            emailInput.value = user.email || "";
            roleInput.value = (user.role || "client").toLowerCase();
            statusInput.value = user.status || "";
        } else {
            modalTitle.textContent = "Nouvel utilisateur";
            idInput.value = "";
            nameInput.value = "";
            emailInput.value = "";
            roleInput.value = "client";
            statusInput.value = "";
        }
        modal.classList.remove("hidden");
        modal.classList.add("flex");
    }

    function closeModal() {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }

    async function loadUsers() {
        try {
            const params = new URLSearchParams();
            if (roleFilter && roleFilter.value) params.append("role", roleFilter.value);
            if (statusFilter && statusFilter.value) params.append("status", statusFilter.value);

            const res = await fetch(
                `${API_BASE_URL}/admin/users?${params.toString()}`,
                { headers }
            );

            if (res.status === 401) {
                localStorage.removeItem("jetcongo_token");
                window.location.href = "login.html";
                return;
            }

            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }
            const data = await res.json();
            users = data.items || [];
            renderUsers();
        } catch (e) {
            console.error("Erreur chargement utilisateurs", e);
            if (typeof showNotification === "function") {
                showNotification("Erreur lors du chargement des utilisateurs.", "error");
            }
        }
    }

    function getFilteredUsers() {
        const query = (searchInput?.value || "").toLowerCase();

        return users.filter((u) => {
            const text = `${u.nom || ""} ${u.email || ""}`.toLowerCase();
            if (!query) return true;
            return text.includes(query);
        });
    }

    function renderUsers() {
        if (!tbody) return;

        const filtered = getFilteredUsers();

        if (countLabel) {
            countLabel.textContent =
                filtered.length === 0
                    ? "Aucun utilisateur"
                    : `${filtered.length} utilisateur(s) affiché(s)`;
        }

        if (!filtered.length) {
            tbody.innerHTML =
                '<tr><td colspan="4" class="px-6 py-4 text-sm text-slate-500">Aucun utilisateur trouvé.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered
            .map((u) => {
                const role = (u.role || "").toLowerCase();
                const status = (u.status || "").toUpperCase();
                let roleBadge =
                    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                if (role === "admin") {
                    roleBadge = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
                } else if (role === "agent") {
                    roleBadge = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
                }

                const isActive = status === "ACTIVE" || status === "";

                return `
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="text-xs font-bold text-primary">
                                    ${(u.nom || "?").split(" ").map(p => p[0] || "").join("").slice(0, 2).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <div class="text-sm font-semibold">${u.nom || "Sans nom"}</div>
                                <div class="text-xs text-slate-400">${u.email || ""}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge}">
                            ${u.role || "client"}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${isActive ? "checked" : ""}
                                   data-user-id="${u.id}" data-user-toggle-status="1" />
                            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-500"></div>
                            <span class="ml-3 text-xs font-medium ${isActive ? "text-slate-400" : "text-red-500"} uppercase">
                                ${isActive ? "Actif" : "Suspendu"}
                            </span>
                        </label>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors"
                                    data-user-id="${u.id}" data-user-edit="1">
                                <span class="material-icons text-lg">edit</span>
                            </button>
                            <button class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition-colors"
                                    data-user-id="${u.id}" data-user-delete="1">
                                <span class="material-icons text-lg">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            })
            .join("");
    }

    async function saveUser() {
        const payload = {
            nom: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: "TempPass123!", // mot de passe temporaire pour la création; l'utilisateur pourra le changer
            role: roleInput.value,
        };
        const id = idInput.value;

        const isEdit = Boolean(id);
        const url = isEdit
            ? `${API_BASE_URL}/admin/users/${id}`
            : `${API_BASE_URL}/admin/users`;
        const method = isEdit ? "PUT" : "POST";

        try {
            const body = isEdit
                ? JSON.stringify({
                    nom: payload.nom,
                    email: payload.email,
                    role: roleInput.value,
                    status: statusInput.value || null,
                })
                : JSON.stringify(payload);

            const res = await fetch(url, {
                method,
                headers,
                body,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || `Erreur ${res.status}`);
            }

            // Si modification, on doit éventuellement faire un appel séparé pour le statut
            if (isEdit && statusInput.value) {
                // déjà pris en compte dans le payload
            }

            await loadUsers();
            closeModal();
            if (typeof showNotification === "function") {
                showNotification(
                    isEdit
                        ? "Utilisateur mis à jour avec succès."
                        : "Utilisateur créé avec succès.",
                    "success"
                );
            }
        } catch (e) {
            console.error("Erreur sauvegarde utilisateur", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message || "Erreur lors de l'enregistrement de l'utilisateur.",
                    "error"
                );
            }
        }
    }

    async function deleteUser(id) {
        if (!id) return;
        if (!confirm("Supprimer cet utilisateur ? Il ne doit pas avoir de réservations.")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
                method: "DELETE",
                headers,
            });
            if (res.status !== 204 && !res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `Erreur ${res.status}`);
            }
            await loadUsers();
            if (typeof showNotification === "function") {
                showNotification("Utilisateur supprimé.", "success");
            }
        } catch (e) {
            console.error("Erreur suppression utilisateur", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message ||
                    "Impossible de supprimer l'utilisateur (probablement lié à des réservations).",
                    "error"
                );
            }
        }
    }

    async function toggleUserStatus(id, active) {
        const user = users.find((u) => u.id === id);
        if (!user) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    status: active ? "ACTIVE" : "SUSPENDED",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.detail || `Erreur ${res.status}`);
            }
            await loadUsers();
        } catch (e) {
            console.error("Erreur changement statut utilisateur", e);
            if (typeof showNotification === "function") {
                showNotification(
                    e.message || "Erreur lors du changement de statut.",
                    "error"
                );
            }
        }
    }

    function exportUsersToExcel(list) {
        if (!window.XLSX || !list.length) return;

        const rows = list.map((u) => ({
            "Nom": u.nom || "",
            "Email": u.email || "",
            "Rôle": u.role || "",
            "Statut": u.status || "",
        }));

        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Utilisateurs");

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        window.XLSX.writeFile(wb, `utilisateurs_agent_${dateStr}.xlsx`);
    }

    function exportUsersToPdf(list) {
        if (!window.jspdf || !list.length) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "pt", "a4");

        const today = new Date();
        const dateStr = today.toLocaleString("fr-FR");

        doc.setFontSize(16);
        doc.text("Rapport Utilisateurs - Vue Agent", 40, 40);
        doc.setFontSize(10);
        doc.text(`Généré le ${dateStr}`, 40, 58);

        const head = [["Nom", "Email", "Rôle", "Statut"]];
        const body = list.map((u) => [
            u.nom || "",
            u.email || "",
            u.role || "",
            u.status || "",
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
        doc.save(`utilisateurs_agent_${filenameSafeDate}.pdf`);
    }

    // Events
    if (openModalBtn) openModalBtn.addEventListener("click", () => openModal(null));
    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalCancel) modalCancel.addEventListener("click", closeModal);
    if (modalSave) modalSave.addEventListener("click", (e) => {
        e.preventDefault();
        saveUser();
    });

    if (searchInput) searchInput.addEventListener("input", () => renderUsers());
    if (roleFilter) roleFilter.addEventListener("change", () => loadUsers());
    if (statusFilter) statusFilter.addEventListener("change", () => loadUsers());

    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            const filtered = getFilteredUsers();
            if (!filtered.length) {
                if (typeof showNotification === "function") {
                    showNotification("Aucun utilisateur à exporter pour les filtres actuels.", "info");
                }
                return;
            }

            try {
                exportUsersToExcel(filtered);
                exportUsersToPdf(filtered);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Export des utilisateurs effectué en Excel et PDF (filtres actuels).",
                        "success"
                    );
                }
            } catch (e) {
                console.error("Erreur export utilisateurs", e);
                if (typeof showNotification === "function") {
                    showNotification(
                        "Une erreur est survenue lors de l'export des utilisateurs.",
                        "error"
                    );
                }
            }
        });
    }

    if (tbody) {
        tbody.addEventListener("click", (e) => {
            const editBtn = e.target.closest("[data-user-edit]");
            if (editBtn) {
                const id = Number(editBtn.getAttribute("data-user-id"));
                const u = users.find((x) => x.id === id);
                if (u) openModal(u);
                return;
            }
            const deleteBtn = e.target.closest("[data-user-delete]");
            if (deleteBtn) {
                const id = Number(deleteBtn.getAttribute("data-user-id"));
                deleteUser(id);
                return;
            }
        });

        tbody.addEventListener("change", (e) => {
            const toggle = e.target.closest("[data-user-toggle-status]");
            if (toggle) {
                const id = Number(toggle.getAttribute("data-user-id"));
                const checked = toggle.checked;
                toggleUserStatus(id, checked);
            }
        });
    }

    // Init
    loadUsers();
})();

