const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;

let allOrders = [];
let allProducts = [];
let allCategories = [];
let currentTab = "active";
let selectedOrders = [];

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

window.addEventListener("DOMContentLoaded", () => {
    if (!window.Auth.requireAdmin()) return;

    loadUserProfile();
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
    const response = await fetch(`${API_BASE_URL}${path}`, {
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

    const totalRevenue = safeOrders.reduce((sum, order) => {
        const raw = order?.totalAmount;
        const amount = Number(raw);
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
}

window.loadDashboardData = loadDashboardData;
window.showDashboard = showDashboard;
