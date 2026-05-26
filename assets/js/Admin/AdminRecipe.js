async function loadRecipesPage(showToastOnSuccess = true) {
    const productListContainer = document.getElementById("recipeProductListContainer");
    const categoryFilter = document.getElementById("recipeCategoryFilter");
    const searchInput = document.getElementById("recipeSearchInput");

    if (productListContainer) {
        productListContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách sản phẩm...</div>';
    }
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>';
    }
    if (searchInput) {
        searchInput.value = "";
    }

    currentRecipeProduct = null;
    currentRecipeRows = [];
    deletedRecipeIds = [];
    renderRecipeEditorPlaceholder();

    try {
        const [productsResponse, categoriesResponse, inventoryResponse] = await Promise.all([
            apiFetch("/product"),
            apiFetch("/categories"),
            apiFetch("/Inventory")
        ]);

        if (!productsResponse.ok || !categoriesResponse.ok || !inventoryResponse.ok) {
            throw new Error("Không tải được dữ liệu Recipes");
        }

        recipeProducts = await productsResponse.json();
        allCategories = await categoriesResponse.json();
        allInventoryItems = await inventoryResponse.json();

        populateRecipeCategoryFilter();
        renderRecipeProductList(recipeProducts);

        if (showToastOnSuccess) {
            showToast("Đã tải dữ liệu Recipes thành công", "success");
        }
    } catch (error) {
        console.error("Error loading recipes page:", error);
        if (productListContainer) {
            productListContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Lỗi khi tải dữ liệu Recipes. Vui lòng thử lại.</p></div>';
        }
        showToast("Lỗi khi tải dữ liệu Recipes: " + (error.message || error), "error");
    }
}

function populateRecipeCategoryFilter() {
    const categoryFilter = document.getElementById("recipeCategoryFilter");
    if (!categoryFilter) return;

    const options = allCategories.map(category => {
        const id = category.categoryId || category.CategoryId || category.id;
        const name = category.name || category.Name || category.categoryName || category.CategoryName;
        return `<option value="${id}">${name}</option>`;
    }).join("");

    categoryFilter.innerHTML = '<option value="">Tất cả danh mục</option>' + options;
}

function filterRecipeProducts() {
    const searchValue = document.getElementById("recipeSearchInput")?.value.trim().toLowerCase() || "";
    const categoryValue = document.getElementById("recipeCategoryFilter")?.value || "";

    const filtered = recipeProducts.filter(product => {
        const productName = (product.name || product.Name || product.productName || product.ProductName || "").toString().toLowerCase();
        const matchesSearch = !searchValue || productName.includes(searchValue);
        const matchesCategory = !categoryValue || (product.categoryId || product.CategoryId || product.category_id || "").toString() === categoryValue.toString();
        return matchesSearch && matchesCategory;
    });

    renderRecipeProductList(filtered);
}

function getRecipeCategoryName(categoryId) {
    const found = allCategories.find(c => String(c.categoryId || c.CategoryId || c.id) === String(categoryId));
    return found ? (found.name || found.Name || found.categoryName || found.CategoryName || "-") : "-";
}

function renderRecipeProductList(products) {
    const productListContainer = document.getElementById("recipeProductListContainer");
    if (!productListContainer) return;

    if (!products || products.length === 0) {
        productListContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Không tìm thấy sản phẩm.</p></div>';
        return;
    }

    let html = `
        <table class="product-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>`;

    products.forEach(product => {
        const productId = product.productId || product.ProductId || product.id || "";
        const name = product.name || product.Name || product.productName || product.ProductName || "";
        const categoryId = product.categoryId || product.CategoryId || product.category_id || "";
        const categoryName = getRecipeCategoryName(categoryId);

        html += `
                <tr>
                    <td>${productId}</td>
                    <td>${name}</td>
                    <td>${categoryName}</td>
                    <td><button class="action-btn" onclick="selectRecipeProduct(${productId})">Xem Công thức</button></td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>`;

    productListContainer.innerHTML = html;
}

async function selectRecipeProduct(productId) {
    currentRecipeProduct = recipeProducts.find(p => Number(p.productId || p.ProductId || p.id) === Number(productId)) || null;
    currentRecipeRows = [];
    deletedRecipeIds = [];
    await loadRecipeDetailsForProduct(productId);
}

async function loadRecipeDetailsForProduct(productId) {
    const editorContainer = document.getElementById("recipeEditorContainer");
    if (editorContainer) {
        editorContainer.style.display = "block";
    }

    try {
        const response = await apiFetch(`/Recipe/product/${productId}`);

        if (!response.ok) {
            throw new Error("Không tải được công thức cho sản phẩm này");
        }

        const recipeRows = await response.json();
        currentRecipeRows = (recipeRows || []).map(item => ({
            recipeId: item.recipeId || item.RecipeId || 0,
            inventoryId: item.inventoryId || item.InventoryId || 0,
            inventoryName: item.inventoryName || item.InventoryName || "",
            quantityNeeded: item.quantityNeeded || item.QuantityNeeded || 0,
            unit: item.unit || item.Unit || ""
        }));

        renderRecipeEditor();
    } catch (error) {
        console.error("Error loading recipe details:", error);
        showToast("Lỗi khi tải công thức: " + (error.message || error), "error");
        renderRecipeEditorPlaceholder();
    }
}

function renderRecipeEditorPlaceholder() {
    const placeholder = document.getElementById("recipeDetailPlaceholder");
    const editorContainer = document.getElementById("recipeEditorContainer");
    if (placeholder) {
        placeholder.style.display = "grid";
    }
    if (editorContainer) {
        editorContainer.style.display = "none";
        editorContainer.innerHTML = "";
    }
}

function renderRecipeEditor() {
    const placeholder = document.getElementById("recipeDetailPlaceholder");
    const editorContainer = document.getElementById("recipeEditorContainer");
    if (!editorContainer) return;
    if (placeholder) placeholder.style.display = "none";
    if (!currentRecipeProduct) {
        renderRecipeEditorPlaceholder();
        return;
    }

    const productName = currentRecipeProduct.name || currentRecipeProduct.Name || currentRecipeProduct.productName || currentRecipeProduct.ProductName || "Sản phẩm";
    const categoryId = currentRecipeProduct.categoryId || currentRecipeProduct.CategoryId || currentRecipeProduct.category_id || "";
    const categoryName = getRecipeCategoryName(categoryId);

    const inventoryOptions = allInventoryItems.map(inventory => {
        const id = inventory.inventoryId || inventory.InventoryId || inventory.id || "";
        const name = inventory.name || inventory.Name || "";
        const unit = inventory.unit || inventory.Unit || "";
        return `<option value="${id}" data-unit="${unit}">${name} (${unit})</option>`;
    }).join("");

    let rowsHtml = "";
    if (!currentRecipeRows || currentRecipeRows.length === 0) {
        rowsHtml = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Chưa có nguyên liệu nào trong công thức.</p></div>';
    } else {
        rowsHtml = `
            <table class="recipe-table">
                <thead>
                    <tr><th>Nguyên liệu</th><th>Định mức</th><th>Đơn vị</th><th></th></tr>
                </thead><tbody>`;
        currentRecipeRows.forEach((row, index) => {
            rowsHtml += `<tr>
                <td>${row.inventoryName}</td>
                <td><input class="quantity-input" type="number" min="0.001" step="0.01" value="${row.quantityNeeded || ""}" onchange="updateRecipeRowQuantity(${index}, this.value)"></td>
                <td>${row.unit || ""}</td>
                <td><button class="action-btn btn-danger remove-btn" type="button" onclick="removeRecipeRow(${index})">Xóa</button></td>
            </tr>`;
        });
        rowsHtml += "</tbody></table>";
    }

    editorContainer.innerHTML = `
        <div class="recipe-panel">
            <div class="recipe-detail-header">
                <div><h3>Công thức: ${productName}</h3><p>Danh mục: ${categoryName}</p></div>
                <button class="action-btn" type="button" onclick="renderRecipeEditorPlaceholder()">Chọn sản phẩm khác</button>
            </div>
            <div class="recipe-actions">
                <select id="recipeIngredientSelect"><option value="">Chọn nguyên liệu</option>${inventoryOptions}</select>
                <button class="action-btn pay-btn" type="button" onclick="addRecipeIngredient()">+ Thêm Nguyên liệu</button>
            </div>
            <div id="recipeIngredientsTableContainer">${rowsHtml}</div>
            <div class="recipe-save-actions">
                <button class="action-btn pay-btn" type="button" onclick="saveRecipe()">Lưu Công thức</button>
            </div>
        </div>`;
}

function addRecipeIngredient() {
    const select = document.getElementById("recipeIngredientSelect");
    if (!select) return;
    const inventoryId = parseInt(select.value, 10);
    if (!inventoryId) return showToast("Vui lòng chọn nguyên liệu trước khi thêm", "error");
    if (!currentRecipeProduct) return showToast("Vui lòng chọn sản phẩm trước khi thêm nguyên liệu", "error");
    if (currentRecipeRows.some(row => Number(row.inventoryId) === inventoryId)) {
        return showToast("Nguyên liệu đã tồn tại trong công thức", "error");
    }

    const inventory = allInventoryItems.find(item => Number(item.inventoryId || item.InventoryId || item.id) === inventoryId);
    currentRecipeRows.push({
        recipeId: null,
        inventoryId,
        inventoryName: inventory?.name || inventory?.Name || "Nguyên liệu",
        quantityNeeded: 0,
        unit: inventory?.unit || inventory?.Unit || ""
    });
    renderRecipeEditor();
}

function updateRecipeRowQuantity(index, value) {
    const quantity = parseFloat(value);
    currentRecipeRows[index].quantityNeeded = Number.isNaN(quantity) ? 0 : quantity;
}

function removeRecipeRow(index) {
    const row = currentRecipeRows[index];
    if (row && row.recipeId) deletedRecipeIds.push(row.recipeId);
    currentRecipeRows.splice(index, 1);
    renderRecipeEditor();
}

async function saveRecipe() {
    if (!currentRecipeProduct) return showToast("Vui lòng chọn một sản phẩm trước khi lưu công thức", "error");
    if (!currentRecipeRows || currentRecipeRows.length === 0) return showToast("Công thức phải có ít nhất một nguyên liệu", "error");
    const invalidRow = currentRecipeRows.find(row => !row.quantityNeeded || Number(row.quantityNeeded) <= 0);
    if (invalidRow) return showToast("Vui lòng nhập định mức lớn hơn 0 cho tất cả nguyên liệu", "error");

    const productId = currentRecipeProduct.productId || currentRecipeProduct.ProductId || currentRecipeProduct.id;
    try {
        const requests = [];

        deletedRecipeIds.forEach(recipeId => {
            requests.push(apiFetch(`/Recipe/${recipeId}`, { method: "DELETE" }));
        });

        currentRecipeRows.forEach(row => {
            const payload = {
                productId: Number(productId),
                inventoryId: Number(row.inventoryId),
                quantityNeeded: Number(row.quantityNeeded)
            };
            if (row.recipeId) {
                requests.push(apiFetch(`/Recipe/${row.recipeId}`, {
                    method: "PUT",
                    body: JSON.stringify({ recipeId: Number(row.recipeId), ...payload })
                }));
            } else {
                requests.push(apiFetch("/Recipe", {
                    method: "POST",
                    body: JSON.stringify(payload)
                }));
            }
        });

        const responses = await Promise.all(requests);
        for (const response of responses) {
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Lỗi khi lưu công thức");
            }
        }

        deletedRecipeIds = [];
        await loadRecipeDetailsForProduct(productId);
        showToast("Lưu công thức thành công", "success");
    } catch (error) {
        console.error("Error saving recipe:", error);
        showToast("Lỗi lưu công thức: " + (error.message || error), "error");
    }
}
