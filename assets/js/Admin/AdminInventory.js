async function loadInventoryPage(showToastOnSuccess = true) {
    const container = document.getElementById("inventoryTableContainer");
    const reportContainer = document.getElementById("inventoryReportContainer");

    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu kho...</div>';
    }

    if (reportContainer) {
        reportContainer.innerHTML = "";
    }

    try {
        const [inventoryResponse, transactionResponse] = await Promise.all([
            apiFetch("/Inventory"),
            apiFetch("/inventorytransaction")
        ]);

        if (!inventoryResponse.ok || !transactionResponse.ok) {
            throw new Error("Không thể tải dữ liệu kho.");
        }

        const inventoryResult = await inventoryResponse.json();
        const transactionResult = await transactionResponse.json();

        inventoryData = Array.isArray(inventoryResult) ? inventoryResult : (inventoryResult.data || []);
        inventoryTransactions = Array.isArray(transactionResult) ? transactionResult : (transactionResult.data || []);
        allInventoryItems = [...inventoryData];

        renderInventorySummary(inventoryData);
        renderInventoryTable(getFilteredInventoryData());

        if (showToastOnSuccess) {
            showToast("Đã tải dữ liệu kho thành công", "success");
        }
    } catch (error) {
        console.error("Load inventory error:", error);

        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes-stacked"></i> Không thể tải dữ liệu kho.</div>';
        }

        showToast("Không thể tải dữ liệu kho", "error");
    }
}

function normalizeInventoryStatus(item) {
    const quantity = Number(item.quantityInStock ?? item.quantity ?? item.stockQuantity ?? item.currentStock ?? 0);
    const minStock = Number(item.minThreshold ?? item.minStock ?? item.minimumStock ?? 10);

    if (quantity <= 0) return "out";
    if (quantity <= minStock) return "low";
    return "in";
}

function getInventoryBadge(status) {
    if (status === "out") {
        return `<span class="badge out-of-stock">Out of stock</span>`;
    }
    if (status === "low") {
        return `<span class="badge low-stock">Low stock</span>`;
    }
    return `<span class="badge in-stock">In stock</span>`;
}

function renderInventorySummary(data) {
    const totalItemsEl = document.getElementById("inventoryTotalItems");
    const lowStockEl = document.getElementById("inventoryLowStockCount");
    const outOfStockEl = document.getElementById("inventoryOutOfStockCount");

    const totalItems = data.length;
    const lowStockCount = data.filter(item => normalizeInventoryStatus(item) === "low").length;
    const outOfStockCount = data.filter(item => normalizeInventoryStatus(item) === "out").length;

    if (totalItemsEl) totalItemsEl.textContent = String(totalItems);
    if (lowStockEl) lowStockEl.textContent = String(lowStockCount);
    if (outOfStockEl) outOfStockEl.textContent = String(outOfStockCount);
}

function getFilteredInventoryData() {
    if (!lowStockFilterActive) return [...inventoryData];

    return inventoryData.filter(item => {
        const status = normalizeInventoryStatus(item);
        return status === "low" || status === "out";
    });
}

function renderInventoryTable(data) {
    const container = document.getElementById("inventoryTableContainer");
    if (!container) return;

    if (!data.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes-stacked"></i> Không có dữ liệu kho.</div>';
        return;
    }

    container.innerHTML = `
        <div class="inventory-table-wrap">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nguyên liệu</th>
                        <th>Số lượng</th>
                        <th>Đơn vị</th>
                        <th>Tồn tối thiểu</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const id = item.inventoryId ?? item.id ?? "-";
                        const name = item.name ?? item.inventoryName ?? "-";
                        const quantity = Number(item.quantityInStock ?? item.quantity ?? item.stockQuantity ?? item.currentStock ?? 0);
                        const unit = item.unit ?? item.unitName ?? "-";
                        const minStock = Number(item.minThreshold ?? item.minStock ?? item.minimumStock ?? 10);
                        const status = normalizeInventoryStatus(item);

                        return `
                            <tr>
                                <td>${id}</td>
                                <td>${name}</td>
                                <td>${quantity}</td>
                                <td>${unit}</td>
                                <td>${minStock}</td>
                                <td>${getInventoryBadge(status)}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function toggleLowStockFilter() {
    lowStockFilterActive = !lowStockFilterActive;

    const button = document.getElementById("lowStockFilterButton");
    if (button) {
        button.classList.toggle("pay-btn", lowStockFilterActive);
    }

    renderInventoryTable(getFilteredInventoryData());

    showToast(
        lowStockFilterActive
            ? "Đã bật bộ lọc low stock"
            : "Đã tắt bộ lọc low stock",
        "success"
    );
}

function loadInventoryReport() {
    const reportContainer = document.getElementById("inventoryReportContainer");
    if (!reportContainer) return;

    if (!inventoryData.length) {
        reportContainer.innerHTML = '<div class="empty-state">Chưa có dữ liệu để tạo báo cáo kho.</div>';
        return;
    }

    const totalItems = inventoryData.length;
    const lowStockItems = inventoryData.filter(item => normalizeInventoryStatus(item) === "low");
    const outOfStockItems = inventoryData.filter(item => normalizeInventoryStatus(item) === "out");

    reportContainer.innerHTML = `
        <div class="inventory-info-panel">
            <h3>Báo cáo kho hàng</h3>
            <p>Tổng mặt hàng: <strong>${totalItems}</strong></p>
            <p>Sắp hết: <strong>${lowStockItems.length}</strong></p>
            <p>Hết hàng: <strong>${outOfStockItems.length}</strong></p>

            <div class="section" style="margin-top:20px;">
                <h3>Danh sách cần chú ý</h3>
                ${
                    (lowStockItems.length || outOfStockItems.length)
                        ? `
                            <ul>
                                ${[...outOfStockItems, ...lowStockItems].map(item => `
                                    <li>
                                        ${item.name ?? item.inventoryName ?? "-"} -
                                        SL: ${item.quantity ?? item.stockQuantity ?? item.currentStock ?? 0}
                                    </li>
                                `).join("")}
                            </ul>
                        `
                        : `<p>Không có mặt hàng nào cần chú ý.</p>`
                }
            </div>
        </div>
    `;
}

function openInventoryTransactionModal(type) {
    const title = document.getElementById("inventoryTransactionModalTitle");
    const actionInput = document.getElementById("inventoryTransactionTypeInput");
    const amountInput = document.getElementById("inventoryTransactionQuantityInput");
    const noteInput = document.getElementById("inventoryTransactionNoteInput");
    const select = document.getElementById("inventoryTransactionItemSelect");
    const priceInput = document.getElementById("inventoryTransactionPriceInput");

    if (title) {
        title.textContent = type === "Import" ? "Stock In" : "Stock Out";
    }

    if (actionInput) {
        actionInput.value = type;
    }

    if (amountInput) amountInput.value = "";
    if (noteInput) noteInput.value = "";
    if (priceInput) priceInput.value = "";

    if (select) {
        select.innerHTML = `
            <option value="">Chọn nguyên liệu</option>
            ${inventoryData.map(item => `
                <option value="${item.inventoryId ?? item.id ?? ""}">
                    ${item.name ?? item.inventoryName ?? "-"}
                </option>
            `).join("")}
        `;
    }

    openModal("inventoryTransactionModal");
}

function closeInventoryTransactionModal() {
    closeModal("inventoryTransactionModal");
}

async function saveInventoryTransaction() {
    const type = document.getElementById("inventoryTransactionTypeInput")?.value || "";
    const itemId = document.getElementById("inventoryTransactionItemSelect")?.value || "";
    const quantity = Number(document.getElementById("inventoryTransactionQuantityInput")?.value || 0);
    const note = document.getElementById("inventoryTransactionNoteInput")?.value.trim() || "";
    const price = Number(document.getElementById("inventoryTransactionPriceInput")?.value || 0);

    if (!type || !itemId || quantity <= 0) {
        showToast("Vui lòng nhập đầy đủ thông tin giao dịch kho", "error");
        return;
    }

    const matchedItem = inventoryData.find(item =>
        String(item.inventoryId ?? item.id) === String(itemId)
    );

    if (!matchedItem) {
        showToast("Không tìm thấy nguyên liệu", "error");
        return;
    }

    const response = await apiFetch("/Inventory/transaction", {
        method: "POST",
        body: JSON.stringify({
            inventoryId: Number(itemId),
            transactionType: type,
            quantity,
            note,
            price
        })
    });
    if (!response.ok) throw new Error(await response.text() || "Không thể tạo giao dịch kho");
    await loadInventoryPage(false);
    closeInventoryTransactionModal();
    showToast(type === "Import" ? "Stock in thành công" : "Stock out thành công", "success");
}

function openInventoryHistoryModal() {
    const body = document.getElementById("inventoryHistoryBody");
    if (!body) return;

    if (!inventoryTransactions.length) {
        body.innerHTML = `<div class="empty-state">Chưa có lịch sử giao dịch kho.</div>`;
        openModal("inventoryHistoryModal");
        return;
    }

    body.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Thời gian</th>
                    <th>ID nguyên liệu</th>
                    <th>Loại</th>
                    <th>Số lượng</th>
                    <th>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                ${inventoryTransactions.map(tx => `
                    <tr>
                        <td>${formatDateTime(tx.createdAt)}</td>
                        <td>${tx.inventoryId ?? "-"}</td>
                        <td>${tx.type ?? "-"}</td>
                        <td>${tx.quantity ?? 0}</td>
                        <td>${tx.note ?? "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    openModal("inventoryHistoryModal");
}

function closeInventoryHistoryModal() {
    closeModal("inventoryHistoryModal");
}
