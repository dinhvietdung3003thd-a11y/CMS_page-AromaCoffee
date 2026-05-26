let allOrders = [];
let allProducts = [];
let allCategories = [];
let currentTab = "active";
let selectedOrders = [];


let revenueChartInstance = null;
let categoryChartInstance = null;

let allInventoryItems = [];
let inventoryData = [];
let inventoryTransactions = [];
let inventorySuppliers = [];
let suppliersData = [];
let supplierTransactions = [];
let currentSupplierEditId = null;
let supplierBalanceAdjustId = null;
let lowStockFilterActive = false;

let recipeProducts = [];
let currentRecipeProduct = null;
let currentRecipeRows = [];
let deletedRecipeIds = [];

let createOrderTables = [];
let createOrderProducts = [];
let createOrderItems = {};
let selectedCreateOrderTableId = null;

let employees = [];
let filteredEmployees = [];
let hrmCurrentMode = "add";
let hrmEditId = null;

window.currentUser = null;

function loadUserProfile() {
    const userJson = localStorage.getItem("user");
    if (!userJson) return;

    let parsed;
    try {
        parsed = JSON.parse(userJson);
    } catch {
        return;
    }

    const source = parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
    if (!source || typeof source !== "object") return;

    const fullName = source.fullName || source.FullName || source.name || source.username || source.email || "User";
    const role = source.role || source.Role || "user";
    const username = source.username || source.Username || "";
    const email = source.email || source.Email || "";
    const phoneNumber = source.phoneNumber || source.PhoneNumber || "";
    const avatarUrl = source.avatar || source.Avatar || null;

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) {
        if (avatarUrl) {
            profileAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
        } else {
            profileAvatar.textContent = String(fullName).charAt(0).toUpperCase();
        }
    }

    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = fullName;

    const profileRole = document.getElementById("profileRole");
    if (profileRole) profileRole.textContent = role;

    window.currentUser = { fullName, role, username, email, phoneNumber, avatar: avatarUrl };
}

function handleAccountAvatarChange(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        if (typeof reader.result !== "string") return;

        const preview = document.getElementById("accountAvatarPreview");
        if (preview) preview.innerHTML = `<img src="${reader.result}" alt="Avatar">`;

        if (!window.currentUser) window.currentUser = {};
        window.currentUser.avatar = reader.result;

        const profileAvatar = document.getElementById("profileAvatar");
        if (profileAvatar) profileAvatar.innerHTML = `<img src="${reader.result}" alt="Avatar">`;
    };
    reader.readAsDataURL(file);
}

window.addEventListener("DOMContentLoaded", () => {
    if (!window.Auth.requireAdmin()) return;

    try {
        loadUserProfile();
    } catch (error) {
        console.error("loadUserProfile init error:", error);
    }

    bindGlobalEvents();
    showDashboard();
});

function bindGlobalEvents() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.remove("active");
        }
    });

    const avatarInput = document.getElementById("accountAvatarInput");
    if (avatarInput) {
        avatarInput.addEventListener("change", handleAccountAvatarChange);
    }

    const maintenanceToggle = document.getElementById("maintenanceModeToggle");
    if (maintenanceToggle) {
        maintenanceToggle.addEventListener("change", updateMaintenanceStatus);
    }
}

function updateMaintenanceStatus(event) {
    const isEnabled = Boolean(event?.target?.checked);
    try {
        localStorage.setItem("maintenanceMode", isEnabled ? "true" : "false");
    } catch (error) {
        console.error("Cannot save maintenance mode:", error);
    }
}

/* =========================
   COMMON HELPERS
========================= */

function getToken() {
    return window.Auth.getToken();
}

async function parseJsonSafe(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function showToast(message, type = "success") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatCurrency(value) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("vi-VN")} ₫`;
}

function formatDateTime(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleString("vi-VN");
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
}

function logout() {
    window.Auth.logout();
}

function toggleSubmenu(element) {
    const submenu = element.querySelector(".submenu");
    const icon = element.querySelector(".icon");
    if (!submenu) return;

    if (submenu.style.display === "block") {
        submenu.style.display = "none";
        if (icon) icon.style.transform = "rotate(0deg)";
    } else {
        submenu.style.display = "block";
        if (icon) icon.style.transform = "rotate(90deg)";
    }
}

function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
        section.classList.remove("active");
    });

    const target = document.getElementById(sectionId);
    if (target) target.classList.add("active");
}

async function apiFetch(path, options = {}) {
    const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}${path}`, {
        ...options,
        headers: window.Auth.buildHeaders(options.headers || {})
    });

    if (response.status === 401 || response.status === 403) {
        showToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
        setTimeout(() => window.Auth.logout(), 1200);
        throw new Error("Unauthorized");
    }

    return response;
}

function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* =========================
   NAVIGATION
========================= */

function showDashboard() {
    showSection("dashboardSection");
    loadDashboardData();
}

function showOrdersPage() {
    showSection("ordersSection");
    loadOrders();
}

function showSalesPage() {
    showSection("salesSection");
    loadSales();
}

function showProductsPage() {
    showSection("productsSection");
    if (typeof loadProducts === "function") loadProducts();
}

function showCategoriesPage() {
    showSection("categoriesSection");
    if (typeof loadCategories === "function") loadCategories();
}

function showRecipesPage() {
    showSection("recipesSection");
    if (typeof loadRecipesPage === "function") loadRecipesPage();
}

function showTablesPage() {
    showSection("tablesSection");
    if (typeof loadTablesPage === "function") loadTablesPage();
}

function showInventoryPage() {
    showSection("inventorySection");
    if (typeof loadInventoryPage === "function") loadInventoryPage();
}

function showSuppliersPage() {
    showSection("suppliersSection");
    if (typeof loadSuppliersPage === "function") loadSuppliersPage();
}

function showHRMPage() {
    showSection("hrmSection");
    if (typeof loadHRMPage === "function") loadHRMPage();
}

function showSettingsPage() {
    showSection("settingsSection");
    if (typeof loadSettings === "function") loadSettings();
}

/* =========================
   DASHBOARD DATA
========================= */

function normalizeApiArray(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

function setDashboardLoadingState() {
    const loading = '<span class="loading-text">Đang tải...</span>';
    const revenueEl = document.getElementById("dashKpiRevenue");
    const ordersEl = document.getElementById("dashKpiOrders");
    const stockEl = document.getElementById("dashKpiLowStock");
    const tablesEl = document.getElementById("dashKpiTables");
    if (revenueEl) revenueEl.innerHTML = loading;
    if (ordersEl) ordersEl.innerHTML = loading;
    if (stockEl) stockEl.innerHTML = loading;
    if (tablesEl) tablesEl.innerHTML = loading;
}

function formatVnd(value) {
    const numberValue = Number(value);
    const safeValue = Number.isFinite(numberValue) ? numberValue : 0;
    return `${new Intl.NumberFormat("vi-VN").format(safeValue)} ₫`;
}

async function loadDashboardOrders() {
    try {
        const response = await apiFetch("/orders");
        if (!response.ok) throw new Error("Không thể tải danh sách đơn hàng");
        const payload = await parseJsonSafe(response);
        return normalizeApiArray(payload);
    } catch (error) {
        console.error("loadDashboardOrders error:", error);
        return [];
    }
}

async function loadDashboardInventoryTransactions() {
    try {
        const response = await apiFetch("/InventoryTransaction");
        if (!response.ok) throw new Error("Không thể tải giao dịch kho");
        const payload = await parseJsonSafe(response);
        return normalizeApiArray(payload);
    } catch (error) {
        console.error("loadDashboardInventoryTransactions error:", error);
        return [];
    }
}

async function loadDashboardTables() {
    try {
        const response = await apiFetch("/Tables");
        if (!response.ok) throw new Error("Không thể tải danh sách bàn");
        const payload = await parseJsonSafe(response);
        return normalizeApiArray(payload);
    } catch (error) {
        console.error("loadDashboardTables error:", error);
        return [];
    }
}

function renderDashboardKpis(orders, inventoryTransactions, tables) {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeTransactions = Array.isArray(inventoryTransactions) ? inventoryTransactions : [];
    const safeTables = Array.isArray(tables) ? tables : [];

    const totalRevenue = safeOrders
        .filter(order => {
            const status = String(order?.status || "").toLowerCase();
            const date = new Date(order?.orderDate);

            if (status !== "completed") return false;
            if (Number.isNaN(date.getTime())) return false;

            const today = new Date();
            return (
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate()
            );
        })
        .reduce((sum, order) => {
            const amount = Number(order?.totalAmount);
            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

    const revenueEl = document.getElementById("dashKpiRevenue");
    const ordersEl = document.getElementById("dashKpiOrders");
    const stockEl = document.getElementById("dashKpiLowStock");
    const tablesEl = document.getElementById("dashKpiTables");

    if (revenueEl) revenueEl.innerHTML = `<strong>${formatVnd(totalRevenue)}</strong>`;
    if (ordersEl) ordersEl.innerHTML = `<strong>${safeOrders.length}</strong>`;
    if (stockEl) stockEl.innerHTML = `<strong>${safeTransactions.length}</strong>`;
    if (tablesEl) tablesEl.innerHTML = `<strong>${safeTables.length}</strong>`;
}

function renderDashboardRecentOrders(orders, hasError = false) {
    const container = document.getElementById("recentOrdersContainer");
    if (!container) return;

    if (hasError) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i> Không thể tải đơn hàng</div>';
        return;
    }

    const safeOrders = Array.isArray(orders) ? orders : [];
    if (!safeOrders.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Chưa có đơn hàng</div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Mã đơn</th>
                    <th>Ngày đặt</th>
                    <th>Tổng tiền</th>
                    <th>Bàn</th>
                    <th>Trạng thái</th>
                    <th>Người tạo</th>
                    <th>Khách hàng</th>
                </tr>
            </thead>
            <tbody>
                ${safeOrders.map(order => `
                    <tr>
                        <td>${order?.id ?? "-"}</td>
                        <td>${formatDateTime(order?.orderDate)}</td>
                        <td>${formatVnd(Number(order?.totalAmount))}</td>
                        <td>${order?.tableId ?? "-"}</td>
                        <td>${order?.status ?? "-"}</td>
                        <td>${order?.creatorFullName ?? "-"}</td>
                        <td>${order?.customerId ?? "-"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}


function getLast7DaysRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    const end = new Date(today);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

function isOrderInLast7DaysAndCompleted(order, range) {
    if (!order) return false;
    const status = String(order.status || "").toLowerCase();
    if (status !== "completed") return false;

    const date = new Date(order.orderDate);
    if (Number.isNaN(date.getTime())) return false;

    return date >= range.start && date < range.end;
}

async function loadOrderDetailsById(orderId) {
    const response = await apiFetch(`/Orders/${orderId}`);
    if (!response.ok) throw new Error(`Không thể tải chi tiết order #${orderId}`);
    return parseJsonSafe(response);
}

async function loadProductById(productId) {
    const response = await apiFetch(`/Product/${productId}`);
    if (!response.ok) throw new Error(`Không thể tải product #${productId}`);
    return parseJsonSafe(response);
}

function ensureDashboardMessage(canvasId, message, legendId = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Chart container not found: ${canvasId}`);
        return;
    }

    const parent = canvas.parentElement || canvas;
    let messageEl = parent.querySelector(".chart-message");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.className = "empty-state chart-message";
        parent.appendChild(messageEl);
    }

    messageEl.textContent = message;
    canvas.style.display = "none";

    if (legendId) {
        const legendContainer = document.getElementById(legendId);
        if (legendContainer) legendContainer.innerHTML = "";
    }
}

function clearDashboardMessage(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const parent = canvas.parentElement || canvas;
    const messageEl = parent.querySelector(".chart-message");
    if (messageEl) messageEl.remove();
    canvas.style.display = "";
}

function renderRevenue7DaysChart(orders) {
    const canvas = document.getElementById("revenueChart");
    if (!canvas) {
        console.error("Chart container not found: revenueChart");
        return;
    }

    clearDashboardMessage("revenueChart");

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
        revenueChartInstance = null;
    }

    const range = getLast7DaysRange();
    const labels = [];
    const values = [];
    for (let i = 0; i < 7; i += 1) {
        const day = new Date(range.start);
        day.setDate(range.start.getDate() + i);
        const label = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
        labels.push(label);
        values.push(0);
    }

    (Array.isArray(orders) ? orders : []).forEach(order => {
        if (!isOrderInLast7DaysAndCompleted(order, range)) return;
        const date = new Date(order.orderDate);
        date.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((date - range.start) / 86400000);
        if (diffDays < 0 || diffDays > 6) return;
        const amount = Number(order.totalAmount);
        values[diffDays] += Number.isFinite(amount) ? amount : 0;
    });

    const hasRevenueData = values.some(value => value > 0);
    if (!hasRevenueData) {
        ensureDashboardMessage("revenueChart", "Chưa có dữ liệu doanh thu trong 7 ngày gần nhất");
        return;
    }

    const maxRevenue = Math.max(...values);

    try {
        revenueChartInstance = new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Doanh thu (VND)",
                    data: values,
                    borderColor: "#4f46e5",
                    backgroundColor: "rgba(79, 70, 229, 0.15)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMax: maxRevenue > 0 ? maxRevenue : 1,
                        ticks: {
                            callback: (value) => new Intl.NumberFormat("vi-VN").format(value)
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Render revenue chart failed:", error);
        ensureDashboardMessage("revenueChart", "Không thể tải dữ liệu biểu đồ");
    }
}

async function renderCategoryDistributionChart(orders) {
    const chartCanvas = document.getElementById("categoriesChart");
    if (!chartCanvas) {
        console.error("Chart container not found: categoriesChart");
        return;
    }

    clearDashboardMessage("categoriesChart");

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
    }

    const wrapper = chartCanvas.parentElement;
    if (!wrapper) {
        console.error("Chart wrapper not found for categoriesChart");
        return;
    }

    let legendContainer = document.getElementById("categoriesChartLegend");
    if (!legendContainer) {
        legendContainer = document.createElement("div");
        legendContainer.id = "categoriesChartLegend";
        legendContainer.className = "chart-legend";
        wrapper.insertAdjacentElement("afterend", legendContainer);
    }
    legendContainer.innerHTML = "";

    const range = getLast7DaysRange();
    const completedRecentOrders = (Array.isArray(orders) ? orders : []).filter(order => isOrderInLast7DaysAndCompleted(order, range));

    const detailPromises = completedRecentOrders.map(async (order) => {
        const details = Array.isArray(order?.details) ? order.details.filter(Boolean) : [];
        if (details.length > 0) return details;
        try {
            const orderDetailPayload = await loadOrderDetailsById(order.id);
            return Array.isArray(orderDetailPayload?.details) ? orderDetailPayload.details : [];
        } catch (error) {
            console.error(`Cannot load order details for order #${order?.id}:`, error);
            return [];
        }
    });

    const allDetails = (await Promise.all(detailPromises)).flat();
    if (!allDetails.length) {
        ensureDashboardMessage("categoriesChart", "Chưa có dữ liệu danh mục", "categoriesChartLegend");
        return;
    }

    const uniqueProductIds = [...new Set(allDetails.map(detail => Number(detail?.productId)).filter(Number.isFinite))];
    const productCache = new Map();

    await Promise.all(uniqueProductIds.map(async (productId) => {
        if (productCache.has(productId)) return;
        try {
            const product = await loadProductById(productId);
            if (product) productCache.set(productId, product);
        } catch (error) {
            console.error(`Cannot load product #${productId}:`, error);
        }
    }));

    const categoryMap = new Map();
    allDetails.forEach((detail) => {
        const productId = Number(detail?.productId);
        if (!Number.isFinite(productId)) return;

        const product = productCache.get(productId);
        if (!product) return;

        const categoryId = Number(product?.categoryId);
        if (!Number.isFinite(categoryId)) return;

        const categoryName = product?.categoryName ? String(product.categoryName).trim() : "";
        const label = categoryName || `Danh mục #${categoryId}`;

        const rawQuantity = Number(detail?.quantity);
        const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

        if (!categoryMap.has(categoryId)) {
            categoryMap.set(categoryId, { label, quantity: 0 });
        }

        categoryMap.get(categoryId).quantity += quantity;
    });

    if (categoryMap.size === 0) {
        ensureDashboardMessage("categoriesChart", "Chưa có dữ liệu danh mục", "categoriesChartLegend");
        return;
    }

    const categoryEntries = [...categoryMap.entries()];
    const labels = categoryEntries.map(([, value]) => value.label);
    const values = categoryEntries.map(([, value]) => value.quantity);
    const totalQuantity = values.reduce((sum, val) => sum + val, 0);

    try {
        categoryChartInstance = new Chart(chartCanvas.getContext("2d"), {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: ["#4f46e5", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#8b5cf6", "#84cc16", "#f97316"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });

        legendContainer.innerHTML = labels.map((label, index) => {
            const percent = totalQuantity > 0 ? ((values[index] / totalQuantity) * 100) : 0;
            return `<div class="legend-item">${label}: ${percent.toFixed(1)}%</div>`;
        }).join("");
    } catch (error) {
        console.error("Render category chart failed:", error);
        ensureDashboardMessage("categoriesChart", "Không thể tải dữ liệu biểu đồ", "categoriesChartLegend");
    }
}

async function loadDashboardData() {
    setDashboardLoadingState();

    const recentContainer = document.getElementById("recentOrdersContainer");
    if (recentContainer) {
        recentContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải đơn hàng...</div>';
    }

    let orders = [];
    let inventoryTransactions = [];
    let tables = [];
    let ordersError = false;

    try {
        [orders, inventoryTransactions, tables] = await Promise.all([
            loadDashboardOrders(),
            loadDashboardInventoryTransactions(),
            loadDashboardTables()
        ]);
    } catch (error) {
        console.error("loadDashboardData error:", error);
    }

    if (!Array.isArray(orders)) {
        ordersError = true;
        orders = [];
    }

    renderDashboardKpis(orders, inventoryTransactions, tables);
    renderDashboardRecentOrders(orders, ordersError);
    renderRevenue7DaysChart(orders);
    await renderCategoryDistributionChart(orders);
}

window.loadDashboardData = loadDashboardData;
window.showDashboard = showDashboard;

/* =========================
   HTML COMPATIBILITY ALIASES
========================= */
window.addEventListener("load", () => {
    if (typeof window.filterSuppliers === "function" && typeof window.filterSupplierList !== "function") {
        window.filterSupplierList = window.filterSuppliers;
    }

    if (typeof window.saveSupplier === "function" && typeof window.submitSupplierForm !== "function") {
        window.submitSupplierForm = window.saveSupplier;
    }

    if (typeof window.saveInventoryTransaction === "function" && typeof window.submitInventoryTransaction !== "function") {
        window.submitInventoryTransaction = window.saveInventoryTransaction;
    }

    if (typeof window.saveAccountInfo === "function" && typeof window.updateProfileInfo !== "function") {
        window.updateProfileInfo = window.saveAccountInfo;
    }

    if (typeof window.syncSystemSettings === "function" && typeof window.syncElasticSearch !== "function") {
        window.syncElasticSearch = window.syncSystemSettings;
    }

    if (typeof window.updateMaintenanceStatus === "function" && typeof window.toggleMaintenanceMode !== "function") {
        window.toggleMaintenanceMode = window.updateMaintenanceStatus;
    }

    if (typeof window.openModal === "function" && typeof window.openSupplierModal !== "function") {
        window.openSupplierModal = () => {
            window.currentSupplierEditId = null;
            window.openModal("supplierModal");
        };
    }

    const missingFeatureToast = (message) => () => {
        if (typeof window.showToast === "function") {
            window.showToast(message, "success");
        }
    };

    if (typeof window.closeCreateOrderModal !== "function") {
        window.closeCreateOrderModal = () => window.closeModal?.("createOrderModal");
    }
    if (typeof window.submitCreateOrder !== "function") {
        window.submitCreateOrder = missingFeatureToast("Create order nâng cao đang ở trạng thái demo.");
    }
    if (typeof window.handleCreateOrderTableChange !== "function") {
        window.handleCreateOrderTableChange = () => {};
    }

    if (typeof window.closeCategoryModal !== "function") {
        window.closeCategoryModal = () => window.closeModal?.("categoryModal");
    }
    if (typeof window.saveCategoryModal !== "function") {
        window.saveCategoryModal = missingFeatureToast("Category modal nâng cao đang ở trạng thái demo.");
    }

    if (typeof window.closeStockAdjustmentModal !== "function") {
        window.closeStockAdjustmentModal = () => window.closeModal?.("stockAdjustmentModal");
    }
    if (typeof window.submitStockAdjustment !== "function") {
        window.submitStockAdjustment = missingFeatureToast("Stock adjustment nâng cao đang ở trạng thái demo.");
    }

    if (typeof window.closeSupplierHistoryModal !== "function") {
        window.closeSupplierHistoryModal = () => window.closeModal?.("supplierHistoryModal");
    }
    if (typeof window.closeSupplierSettleModal !== "function") {
        window.closeSupplierSettleModal = () => window.closeModal?.("supplierSettleModal");
    }
    if (typeof window.submitSupplierSettlement !== "function") {
        window.submitSupplierSettlement = missingFeatureToast("Supplier settlement nâng cao đang ở trạng thái demo.");
    }

    if (typeof window.closeInventoryHistoryModal !== "function") {
        window.closeInventoryHistoryModal = () => window.closeModal?.("inventoryHistoryModal");
    }
});
