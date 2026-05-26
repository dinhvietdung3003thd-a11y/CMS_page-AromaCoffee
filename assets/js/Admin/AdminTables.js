let allTables = [];
let filteredTables = [];
let tableModalMode = "add";
let currentEditingTableId = null;

const TABLE_STATUS_OPTIONS = ["Available", "Occupied"];

function isValidTableStatus(status) {
    return TABLE_STATUS_OPTIONS.includes(status);
}

function normalizeTableItem(item) {
    return {
        tableId: Number(item?.tableId ?? 0),
        name: String(item?.name ?? ""),
        status: isValidTableStatus(item?.status) ? item.status : "Available"
    };
}

async function loadTablesPage() {
    await loadTables();
}

async function loadTables() {
    const container = document.getElementById("tablesTableContainer");
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu bàn...</div>';
    }

    try {
        const response = await apiFetch("/Tables");
        if (!response.ok) throw new Error("Không thể tải danh sách bàn");

        const payload = await parseJsonSafe(response);
        const normalized = Array.isArray(payload) ? payload : normalizeApiArray(payload);

        allTables = normalized.map(normalizeTableItem);
        applyTablesFilter();
    } catch (error) {
        console.error("loadTables error:", error);
        showToast("Không thể tải danh sách bàn", "error");
        allTables = [];
        filteredTables = [];
        renderTablesSummary();
        renderTablesTable();
    }
}

function renderTablesSummary() {
    const total = allTables.length;
    const available = allTables.filter(t => t.status === "Available").length;
    const occupied = allTables.filter(t => t.status === "Occupied").length;

    const totalEl = document.getElementById("totalTablesCount");
    const availableEl = document.getElementById("availableTablesCount");
    const occupiedEl = document.getElementById("occupiedTablesCount");

    if (totalEl) totalEl.textContent = String(total);
    if (availableEl) availableEl.textContent = String(available);
    if (occupiedEl) occupiedEl.textContent = String(occupied);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderTablesTable() {
    const container = document.getElementById("tablesTableContainer");
    if (!container) return;

    if (!filteredTables.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không có bàn nào phù hợp.</div>';
        return;
    }

    const rowsHtml = filteredTables.map((table) => `
        <tr>
            <td>${table.tableId}</td>
            <td>${escapeHtml(table.name)}</td>
            <td><span class="status-badge">${table.status}</span></td>
            <td>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <button class="action-btn" onclick="openTableModal('edit', ${table.tableId})">Edit</button>
                    <button class="action-btn btn-danger" onclick="confirmDeleteTable(${table.tableId})">Delete</button>
                    <select onchange="handleTableStatusChange(${table.tableId}, this.value)">
                        <option value="Available" ${table.status === "Available" ? "selected" : ""}>Available</option>
                        <option value="Occupied" ${table.status === "Occupied" ? "selected" : ""}>Occupied</option>
                    </select>
                </div>
            </td>
        </tr>
    `).join("");

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên bàn</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

function applyTablesFilter() {
    const keyword = (document.getElementById("tablesSearchInput")?.value || "").trim().toLowerCase();
    filteredTables = allTables.filter(item => item.name.toLowerCase().includes(keyword));
    renderTablesSummary();
    renderTablesTable();
}

function filterTables() {
    applyTablesFilter();
}

function openTableModal(mode, tableId = null) {
    tableModalMode = mode;
    currentEditingTableId = mode === "edit" ? Number(tableId) : null;

    const modalTitle = document.getElementById("tableModalTitle");
    const nameInput = document.getElementById("tableNameInput");
    const statusInput = document.getElementById("tableStatusInput");

    if (!nameInput || !statusInput) return;

    if (mode === "edit") {
        const table = allTables.find(t => t.tableId === currentEditingTableId);
        if (!table) {
            showToast("Không tìm thấy bàn để chỉnh sửa", "error");
            return;
        }
        if (modalTitle) modalTitle.textContent = "Sửa bàn";
        nameInput.value = table.name;
        statusInput.value = isValidTableStatus(table.status) ? table.status : "Available";
    } else {
        if (modalTitle) modalTitle.textContent = "Thêm bàn";
        nameInput.value = "";
        statusInput.value = "Available";
    }

    openModal("tableModal");
}

function closeTableModal() {
    closeModal("tableModal");
}

async function submitTableForm() {
    const nameInput = document.getElementById("tableNameInput");
    const statusInput = document.getElementById("tableStatusInput");
    if (!nameInput || !statusInput) return;

    const name = nameInput.value.trim();
    const status = statusInput.value;

    if (!name) {
        showToast("Vui lòng nhập tên bàn", "error");
        return;
    }

    if (!isValidTableStatus(status)) {
        showToast("Trạng thái không hợp lệ", "error");
        return;
    }

    try {
        if (tableModalMode === "edit" && currentEditingTableId) {
            const response = await apiFetch(`/Tables/${currentEditingTableId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableId: currentEditingTableId, name, status })
            });
            if (!response.ok) throw new Error("Cập nhật bàn thất bại");
            showToast("Cập nhật bàn thành công");
        } else {
            const response = await apiFetch("/Tables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, status })
            });
            if (!response.ok) throw new Error("Thêm bàn thất bại");
            showToast("Thêm bàn thành công");
        }

        closeTableModal();
        await loadTables();
    } catch (error) {
        console.error("submitTableForm error:", error);
        showToast("Không thể lưu bàn", "error");
    }
}

async function confirmDeleteTable(tableId) {
    const id = Number(tableId);
    if (!id) return;

    const confirmed = window.confirm("Bạn có chắc muốn xóa bàn này?");
    if (!confirmed) return;

    try {
        const response = await apiFetch(`/Tables/${id}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Xóa bàn thất bại");

        showToast("Đã xóa bàn");
        await loadTables();
    } catch (error) {
        console.error("confirmDeleteTable error:", error);
        showToast("Không thể xóa bàn", "error");
    }
}

async function handleTableStatusChange(tableId, nextStatus) {
    const id = Number(tableId);
    if (!id) return;

    if (!isValidTableStatus(nextStatus)) {
        showToast("Trạng thái không hợp lệ", "error");
        await loadTables();
        return;
    }

    try {
        const response = await apiFetch(`/Tables/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextStatus)
        });

        if (!response.ok) throw new Error("Cập nhật trạng thái thất bại");

        showToast("Cập nhật trạng thái bàn thành công");
        await loadTables();
    } catch (error) {
        console.error("handleTableStatusChange error:", error);
        showToast("Không thể cập nhật trạng thái", "error");
        await loadTables();
    }
}
