(function () {
    let orderHubConnection = null;
    let isOrderHubListenerRegistered = false;
    let isOrderHubStarting = false;

    function getOrderHubUrl() {
        const apiBaseUrl = window?.APP_CONFIG?.API_BASE_URL || "";
        if (!apiBaseUrl) return "http://localhost:5035/orderHub";

        const normalized = String(apiBaseUrl).replace(/\/+$/, "");
        const base = normalized.replace(/\/api$/i, "");
        return `${base}/orderHub`;
    }

    function isSectionActive(sectionId) {
        const section = document.getElementById(sectionId);
        return Boolean(section && section.classList.contains("active"));
    }

    function handleReceiveNewOrder(payload) {
        console.log("[SignalR][ReceiveNewOrder]", payload);

        try {
            if (typeof window.showToast === "function") {
                window.showToast(payload?.Message || "Có đơn hàng mới", "success");
            }
        } catch (error) {
            console.error("[SignalR] showToast error:", error);
        }

        try {
            if (isSectionActive("ordersSection") && typeof window.loadOrders === "function") {
                window.loadOrders(false);
            }
        } catch (error) {
            console.error("[SignalR] loadOrders realtime refresh error:", error);
        }

        try {
            if (isSectionActive("dashboardSection") && typeof window.loadDashboardData === "function") {
                window.loadDashboardData();
            }
        } catch (error) {
            console.error("[SignalR] loadDashboardData realtime refresh error:", error);
        }
    }

    async function startOrderHubConnection() {
        if (!orderHubConnection || isOrderHubStarting) return;

        isOrderHubStarting = true;
        try {
            await orderHubConnection.start();
            console.log("[SignalR] Connected to order hub:", getOrderHubUrl());
        } catch (error) {
            console.error("[SignalR] Failed to start order hub connection:", error);
        } finally {
            isOrderHubStarting = false;
        }
    }

    function initAdminSignalR() {
        if (orderHubConnection) {
            return orderHubConnection;
        }

        if (!window.signalR || !window.signalR.HubConnectionBuilder) {
            console.error("[SignalR] signalR client is not available. Please ensure CDN is loaded before AdminSignalR.js.");
            return null;
        }

        const hubUrl = getOrderHubUrl();

        orderHubConnection = new window.signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
            .withAutomaticReconnect()
            .build();

        if (!isOrderHubListenerRegistered) {
            orderHubConnection.on("ReceiveNewOrder", handleReceiveNewOrder);
            isOrderHubListenerRegistered = true;
        }

        orderHubConnection.onreconnecting((error) => {
            console.log("[SignalR] Reconnecting to order hub...", error || "");
        });

        orderHubConnection.onreconnected((connectionId) => {
            console.log("[SignalR] Reconnected to order hub. ConnectionId:", connectionId);
        });

        orderHubConnection.onclose((error) => {
            console.log("[SignalR] Order hub connection closed.", error || "");
        });

        startOrderHubConnection();
        return orderHubConnection;
    }

    window.initAdminSignalR = initAdminSignalR;
})();
