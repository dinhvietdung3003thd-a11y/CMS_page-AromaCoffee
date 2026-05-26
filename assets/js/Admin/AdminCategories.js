async function loadCategories(showToastOnSuccess = true) {
    const container = document.getElementById("categoriesTableContainer");
    if (container) {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    }

    try {
        const response = await apiFetch("/Categories");
        if (!response.ok) throw new Error("Không tải được danh mục.");

        const data = await response.json();
        allCategories = Array.isArray(data) ? data : (data.data || []);

        renderCategoriesTable(allCategories);
        populateCategorySelect();

        if (showToastOnSuccess) {
            showToast("Đã tải danh mục thành công", "success");
        }
    } catch (error) {
        console.error("Load categories error:", error);

        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i> Không thể tải danh mục.</div>';
        }

        showToast("Không thể tải danh mục", "error");
    }
}

function renderCategoriesTable(categories) {
    const container = document.getElementById("categoriesTableContainer");
    if (!container) return;

    if (!categories.length) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i> Không có danh mục nào.</div>';
        return;
    }

    container.innerHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên danh mục</th>
                    <th>Mô tả</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${categories.map(cat => `
                    <tr>
                        <td>${cat.categoryId ?? cat.id ?? "-"}</td>
                        <td>${cat.name ?? cat.categoryName ?? "-"}</td>
                        <td>${cat.description ?? "-"}</td>
                        <td>
                            <button class="btn-sm" onclick='openCategoryModal(${JSON.stringify(cat)})'>Edit</button>
                            <button class="btn-sm btn-danger" onclick="deleteCategory(${cat.categoryId ?? cat.id ?? 0})">Delete</button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    const totalCategoriesCount = document.getElementById("totalCategoriesCount");
    if (totalCategoriesCount) {
        totalCategoriesCount.textContent = String(categories.length);
    }
}

function populateCategorySelect() {
    const select = document.getElementById("productTypeInput");
    if (!select) return;

    select.innerHTML = `
        <option value="">Chọn loại sản phẩm</option>
        ${allCategories.map(cat => `
            <option value="${cat.categoryId ?? cat.id ?? ""}">
                ${cat.name ?? cat.categoryName ?? "Unknown"}
            </option>
        `).join("")}
    `;
}

function filterCategories() {
    const keyword = (document.getElementById("categoriesSearchInput")?.value || "")
        .toLowerCase()
        .trim();

    const filtered = allCategories.filter(cat => {
        const name = String(cat.name ?? cat.categoryName ?? "").toLowerCase();
        const desc = String(cat.description ?? "").toLowerCase();
        return name.includes(keyword) || desc.includes(keyword);
    });

    renderCategoriesTable(filtered);
}

function openCategoryModal() {
    const category = arguments[0] || null;
    window.currentCategoryEditId = category ? Number(category.categoryId ?? category.id) : null;
    const title = document.getElementById("categoryModalTitle");
    if (title) title.textContent = window.currentCategoryEditId ? "Edit Category" : "Add New Category";
    const nameInput = document.getElementById("categoryNameInputModal");
    const descInput = document.getElementById("categoryDescriptionInputModal");
    if (nameInput) nameInput.value = category?.name ?? category?.categoryName ?? "";
    if (descInput) descInput.value = category?.description ?? "";
    openModal("categoryModal");
}

function closeCategoryModal() {
    closeModal("categoryModal");
}

async function saveCategoryModal() {
    const name = document.getElementById("categoryNameInputModal")?.value.trim() || "";
    const description = document.getElementById("categoryDescriptionInputModal")?.value.trim() || "";
    if (!name) return showToast("Vui lòng nhập tên danh mục", "error");

    try {
        let response;
        if (window.currentCategoryEditId) {
            response = await apiFetch(`/Categories/${window.currentCategoryEditId}`, {
                method: "PUT",
                body: JSON.stringify({
                    categoryId: window.currentCategoryEditId,
                    name,
                    description
                })
            });
        } else {
            response = await apiFetch("/Categories", {
                method: "POST",
                body: JSON.stringify({ name, description })
            });
        }
        if (!response.ok) throw new Error(await response.text() || "Lưu danh mục thất bại");
        closeCategoryModal();
        await loadCategories(false);
        showToast("Lưu danh mục thành công", "success");
    } catch (error) {
        showToast(error.message || "Lưu danh mục thất bại", "error");
    }
}

async function deleteCategory(categoryId) {
    if (!categoryId) return;
    if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    try {
        const response = await apiFetch(`/Categories/${categoryId}`, { method: "DELETE" });
        if (!response.ok) throw new Error(await response.text() || "Xóa danh mục thất bại");
        await loadCategories(false);
        showToast("Xóa danh mục thành công", "success");
    } catch (error) {
        showToast(error.message || "Xóa danh mục thất bại", "error");
    }
}
