async function loadOrders(showToastOnSuccess = true) {
    const container = document.getElementById("ordersTableContainer");
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';

    try {
        const response = await apiFetch("/Orders");
        if (!response.ok) throw new Error("Không tải được danh sách đơn hàng.");

        const data = await response.json();
        allOrders = Array.isArray(data) ? data : (data.data || []);
        renderOrdersByTab();

        if (showToastOnSuccess) {
            showToast("Đã tải đơn hàng thành công", "success");
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không thể tải đơn hàng.</div>';
        showToast("Không thể tải đơn hàng", "error");
    }
}

function switchOrderTab(tab) {
    selectedOrders = [];
    currentTab = tab;

    document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
    const tabMap = { active: 0, history: 1, online: 2 };
    const activeBtn = document.querySelectorAll(".tab-button")[tabMap[tab] ?? 0];
    if (activeBtn) activeBtn.classList.add("active");

    renderOrdersByTab();
}

function renderOrdersByTab() {
    let filtered = [...allOrders];

    if (currentTab === "active") {
        filtered = filtered.filter(order => {
            const status = String(order.status || "").toLowerCase();
            return !status.includes("completed") && !status.includes("cancel");
        });
    } else if (currentTab === "history") {
        filtered = filtered.filter(order => {
            const status = String(order.status || "").toLowerCase();
            return status.includes("completed") || status.includes("cancel");
        });
    } else if (currentTab === "online") {
        filtered = filtered.filter(order =>
            order.orderType === "Online" ||
            order.type === "Online" ||
            order.isOnline === true
        );
    }

    renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
    const container = document.getElementById("ordersTableContainer");
    if (!container) return;

    if (!orders.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không có đơn hàng nào.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th><input type="checkbox" onchange="toggleSelectAllOrders(this)"></th>
                    <th>ID</th>
                    <th>Khách hàng</th>
                    <th>Bàn</th>
                    <th>Trạng thái</th>
                    <th>Tổng tiền</th>
                    <th>Ghi chú</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>
                            <input
                                type="checkbox"
                                value="${order.id ?? order.orderId ?? ""}"
                                onchange="toggleOrderSelection(this)"
                            >
                        </td>
                        <td>${order.id ?? order.orderId ?? "-"}</td>
                        <td>${order.customerName ?? order.fullName ?? "-"}</td>
                        <td>${order.tableName ?? order.tableNumber ?? "-"}</td>
                        <td>${order.status ?? "-"}</td>
                        <td>${formatCurrency(order.totalAmount ?? order.total ?? 0)}</td>
                        <td>${order.note ?? "-"}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-sm btn-info" onclick='viewOrder(${JSON.stringify(order)})'>View</button>
                                <button class="btn-sm" onclick="promptUpdateOrderStatus(${order.id ?? order.orderId ?? 0})">Status</button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function toggleOrderSelection(checkbox) {
    const id = checkbox.value;
    if (checkbox.checked) {
        if (!selectedOrders.includes(id)) selectedOrders.push(id);
    } else {
        selectedOrders = selectedOrders.filter(item => item !== id);
    }
}

function toggleSelectAllOrders(source) {
    const checkboxes = document.querySelectorAll("#ordersTableContainer tbody input[type='checkbox']");
    if (!source.checked) {
        selectedOrders = [];
    }

    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        const id = cb.value;

        if (source.checked) {
            if (!selectedOrders.includes(id)) selectedOrders.push(id);
        }
    });
}

function viewOrder(order) {
    alert(
        `Order ID: ${order.id ?? order.orderId ?? "-"}\n` +
        `Khách hàng: ${order.customerName ?? order.fullName ?? "-"}\n` +
        `Bàn: ${order.tableName ?? order.tableNumber ?? "-"}\n` +
        `Trạng thái: ${order.status ?? "-"}\n` +
        `Tổng tiền: ${formatCurrency(order.totalAmount ?? order.total ?? 0)}`
    );
}

function exportToCSV() {
    if (!allOrders.length) {
        showToast("Không có đơn hàng để xuất CSV", "error");
        return;
    }

    const rows = allOrders.map(order => [
        order.id ?? order.orderId ?? "",
        order.customerName ?? order.fullName ?? "",
        order.tableName ?? order.tableNumber ?? "",
        order.status ?? "",
        order.totalAmount ?? order.total ?? 0
    ].join(","));

    const csv = ["OrderId,Customer,Table,Status,Total", ...rows].join("\n");
    downloadCSV(csv, "orders.csv");
    showToast("Đã xuất file orders.csv", "success");
}

async function deleteSelectedOrders() {
    if (!selectedOrders.length) {
        showToast("Vui lòng chọn ít nhất 1 đơn hàng", "error");
        return;
    }

    if (!confirm(`Xóa ${selectedOrders.length} đơn hàng đã chọn?`)) return;
    try {
        for (const id of selectedOrders) {
            const response = await apiFetch(`/Orders/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error(`Xóa đơn #${id} thất bại`);
        }
        selectedOrders = [];
        await loadOrders(false);
        showToast("Đã xóa đơn hàng thành công", "success");
    } catch (error) {
        console.error(error);
        showToast(error.message || "Không thể xóa đơn hàng", "error");
    }
}

function openFilterModal() {
    showToast("Bạn có thể nối filter modal theo UI gốc ở bước sau.", "success");
}

function openSearchModal() {
    showToast("Bạn có thể nối search modal theo UI gốc ở bước sau.", "success");
}

function openCreateOrderModal() {
    openModal("createOrderModal");
    initializeCreateOrderModal();
}

async function initializeCreateOrderModal() {
    try {
        const [tablesRes, productsRes] = await Promise.all([apiFetch("/Tables"), apiFetch("/product")]);
        if (!tablesRes.ok || !productsRes.ok) throw new Error("Không tải được dữ liệu tạo đơn");
        const tables = await tablesRes.json();
        const products = await productsRes.json();
        createOrderTables = Array.isArray(tables) ? tables : (tables.data || []);
        createOrderProducts = Array.isArray(products) ? products : (products.data || []);
        createOrderItems = {};
        selectedCreateOrderTableId = null;

        const tableSelect = document.getElementById("createOrderTableSelect");
        if (tableSelect) {
            tableSelect.innerHTML = `<option value="">Chọn bàn</option>${createOrderTables.map(t => `<option value="${t.tableId ?? t.id}">${t.tableName ?? `Bàn ${t.tableId ?? t.id}`}</option>`).join("")}`;
        }

        const productsList = document.getElementById("createOrderProductsList");
        if (productsList) {
            productsList.innerHTML = createOrderProducts.map(p => `<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;"><span>${p.name ?? p.productName}</span><button type="button" class="action-btn" onclick="addProductToCreateOrder(${p.productId ?? p.id})">+</button></div>`).join("");
        }
        renderCreateOrderCart();
    } catch (error) {
        showToast(error.message || "Không thể khởi tạo tạo đơn", "error");
    }
}

function addProductToCreateOrder(productId) {
    const id = Number(productId);
    createOrderItems[id] = (createOrderItems[id] || 0) + 1;
    renderCreateOrderCart();
}

function removeProductFromCreateOrder(productId) {
    const id = Number(productId);
    if (!createOrderItems[id]) return;
    createOrderItems[id] -= 1;
    if (createOrderItems[id] <= 0) delete createOrderItems[id];
    renderCreateOrderCart();
}

function renderCreateOrderCart() {
    const cart = document.getElementById("createOrderCart");
    const totalEl = document.getElementById("createOrderTotal");
    if (!cart || !totalEl) return;

    const entries = Object.entries(createOrderItems);
    let total = 0;
    cart.innerHTML = entries.length
        ? entries.map(([pid, qty]) => {
            const product = createOrderProducts.find(item => Number(item.productId ?? item.id) === Number(pid));
            const price = Number(product?.price || 0);
            total += price * qty;
            return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>${product?.name ?? product?.productName ?? pid} x${qty}</span><button type="button" class="btn-sm btn-danger" onclick="removeProductFromCreateOrder(${pid})">-</button></div>`;
        }).join("")
        : "<p>Chưa có món</p>";
    totalEl.textContent = formatCurrency(total);
}

async function submitCreateOrder() {
    const tableId = Number(document.getElementById("createOrderTableSelect")?.value || 0) || null;
    const details = Object.entries(createOrderItems).map(([productId, quantity]) => ({ productId: Number(productId), quantity: Number(quantity) }));
    if (!details.length) return showToast("Vui lòng chọn ít nhất 1 món", "error");

    const payload = {
        orderDate: new Date().toISOString(),
        tableId,
        status: "Pending",
        customerId: null,
        note: "",
        details
    };

    try {
        const response = await apiFetch("/Orders", { method: "POST", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(await response.text() || "Tạo đơn thất bại");
        closeCreateOrderModal();
        await loadOrders(false);
        showToast("Tạo đơn hàng thành công", "success");
    } catch (error) {
        showToast(error.message || "Tạo đơn thất bại", "error");
    }
}

function closeCreateOrderModal() {
    closeModal("createOrderModal");
}

function handleCreateOrderTableChange(value) {
    selectedCreateOrderTableId = value ? Number(value) : null;
}

async function promptUpdateOrderStatus(orderId) {
    const status = prompt("Nhập trạng thái mới (Pending/Completed/Cancelled):");
    if (!status) return;
    try {
        const response = await apiFetch(`/Orders/${orderId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(status)
        });
        if (!response.ok) throw new Error(await response.text() || "Cập nhật trạng thái thất bại");
        await loadOrders(false);
        showToast("Cập nhật trạng thái thành công", "success");
    } catch (error) {
        showToast(error.message || "Cập nhật trạng thái thất bại", "error");
    }
}

function loadSales() {
    const container = document.getElementById("salesTableContainer");
    if (!container) return;

    if (!allOrders.length) {
        container.innerHTML = '<div class="empty-state">Chưa có dữ liệu doanh thu.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID đơn</th>
                    <th>Khách hàng</th>
                    <th>Ngày</th>
                    <th>Doanh thu</th>
                </tr>
            </thead>
            <tbody>
                ${allOrders.map(order => `
                    <tr>
                        <td>${order.id ?? order.orderId ?? "-"}</td>
                        <td>${order.customerName ?? order.fullName ?? "-"}</td>
                        <td>${formatDateTime(order.createdAt ?? order.orderDate ?? "")}</td>
                        <td>${formatCurrency(order.totalAmount ?? order.total ?? 0)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function exportSalesToCSV() {
    if (!allOrders.length) {
        showToast("Không có dữ liệu sales để xuất", "error");
        return;
    }

    const rows = allOrders.map(order => [
        order.id ?? order.orderId ?? "",
        order.customerName ?? order.fullName ?? "",
        formatDateTime(order.createdAt ?? order.orderDate ?? ""),
        order.totalAmount ?? order.total ?? 0
    ].join(","));

    const csv = ["OrderId,Customer,Date,Revenue", ...rows].join("\n");
    downloadCSV(csv, "sales.csv");
    showToast("Đã xuất file sales.csv", "success");
}
