/* ============================================================
   TrazaControl — Traceability Module
   Complete product traceability with ingredients, allergens, and printable sheets
   ============================================================ */

const TraceabilityModule = (function() {
    'use strict';

    let editingId = null;

    function init() {
        App.registerModule('traceability', { render });
    }

    async function render() {
        const container = document.getElementById('module-traceability');
        if (!container) return;

        const userId = Auth.getUserId();
        const products = await TrazaDB.getByUser('products', userId);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('traceability.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-bar">
                        <span class="search-icon">${App.getIcon('search')}</span>
                        <input type="text" class="form-input" id="trace-search" placeholder="${I18n.t('app.search')}" data-i18n-placeholder="app.search">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="trace-add-btn">
                        ${App.getIcon('plus')}
                        <span>${I18n.t('traceability.new_product')}</span>
                    </button>
                </div>
            </div>

            ${products.length > 0 ? `
                <div class="table-container">
                    <table class="table" id="trace-table">
                        <thead>
                            <tr>
                                <th>${I18n.t('traceability.product_name')}</th>
                                <th>${I18n.t('traceability.batch_number')}</th>
                                <th>${I18n.t('traceability.category')}</th>
                                <th>${I18n.t('traceability.manufacturing_date')}</th>
                                <th>${I18n.t('traceability.expiry_date')}</th>
                                <th>${I18n.t('traceability.allergens')}</th>
                                <th>${I18n.t('app.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => renderRow(p)).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="card">
                    <div class="empty-state">
                        <div class="empty-state-icon">${App.getIcon('traceability')}</div>
                        <div class="empty-state-title">${I18n.t('app.no_data')}</div>
                        <div class="empty-state-desc">${I18n.t('traceability.title')}</div>
                        <button class="btn btn-primary" id="trace-add-empty">${I18n.t('traceability.new_product')}</button>
                    </div>
                </div>
            `}

            <!-- Product Modal -->
            <div id="trace-modal" class="modal-overlay hidden">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 id="trace-modal-title">${I18n.t('traceability.new_product')}</h3>
                        <button class="modal-close" id="trace-modal-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="trace-form">
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.product_name')} <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="name" required>
                                    <div class="form-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.product_code')}</label>
                                    <input type="text" class="form-input" name="code">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.batch_number')} <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="batchNumber" required>
                                    <div class="form-error"></div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.category')}</label>
                                    <select class="form-select" name="category">
                                        <option value="">${I18n.t('app.select_option')}</option>
                                        <option value="raw_material">${I18n.t('traceability.categories.raw_material')}</option>
                                        <option value="semi_finished">${I18n.t('traceability.categories.semi_finished')}</option>
                                        <option value="finished">${I18n.t('traceability.categories.finished')}</option>
                                        <option value="packaging">${I18n.t('traceability.categories.packaging')}</option>
                                    </select>
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.manufacturing_date')}</label>
                                    <input type="date" class="form-input" name="manufacturingDate">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.expiry_date')}</label>
                                    <input type="date" class="form-input" name="expiryDate">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.weight')}</label>
                                    <input type="text" class="form-input" name="weight">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('traceability.storage_conditions')}</label>
                                    <input type="text" class="form-input" name="storageConditions">
                                </div>
                            </div>

                            <div class="divider"></div>

                            <!-- Ingredients -->
                            <div class="module-section-title">${I18n.t('traceability.ingredients')}</div>
                            <div id="ingredients-list" class="ingredient-list mb-4"></div>
                            <button type="button" class="btn btn-ghost btn-sm" id="add-ingredient-btn">
                                ${App.getIcon('plus')} ${I18n.t('traceability.add_ingredient')}
                            </button>

                            <div class="divider"></div>

                            <!-- Additives -->
                            <div class="module-section-title">${I18n.t('traceability.additives')}</div>
                            <div id="additives-list" class="ingredient-list mb-4"></div>
                            <button type="button" class="btn btn-ghost btn-sm" id="add-additive-btn">
                                ${App.getIcon('plus')} ${I18n.t('traceability.add_additive')}
                            </button>

                            <div class="divider"></div>

                            <!-- Allergens -->
                            <div class="module-section-title">${I18n.t('traceability.allergens')}</div>
                            <div class="allergen-grid" id="allergen-grid">
                                ${renderAllergenGrid()}
                            </div>

                            <div class="divider"></div>

                            <!-- Notes -->
                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.notes')}</label>
                                <textarea class="form-textarea" name="notes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="trace-cancel-btn">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="trace-save-btn">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Print Sheet (hidden, shown only on print) -->
            <div class="print-sheet" id="trace-print-sheet"></div>
        `;

        setupEvents();
    }

    function renderRow(product) {
        const allergens = (product.allergens || []).map(a => I18n.t(`traceability.allergen_list.${a}`)).join(', ');
        const days = Utils.daysUntil(product.expiryDate);
        const expiryClass = days !== null && days <= 3 ? 'text-danger' : '';

        return `
            <tr data-id="${product.id}">
                <td><strong>${Utils.sanitize(product.name)}</strong></td>
                <td><code>${Utils.sanitize(product.batchNumber || '-')}</code></td>
                <td>${product.category ? `<span class="badge badge-primary">${I18n.t('traceability.categories.' + product.category)}</span>` : '-'}</td>
                <td>${Utils.formatDate(product.manufacturingDate, I18n.getLang())}</td>
                <td class="${expiryClass}">${Utils.formatDate(product.expiryDate, I18n.getLang())}</td>
                <td>${allergens ? `<span class="badge badge-warning">${Utils.truncate(allergens, 30)}</span>` : '-'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-ghost btn-sm trace-print-btn" data-id="${product.id}" title="${I18n.t('traceability.print_sheet')}">🖨️</button>
                        <button class="btn btn-ghost btn-sm trace-edit-btn" data-id="${product.id}" title="${I18n.t('app.edit')}">✏️</button>
                        <button class="btn btn-ghost btn-sm trace-delete-btn" data-id="${product.id}" title="${I18n.t('app.delete')}">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderAllergenGrid() {
        const allergens = ['gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'];
        return allergens.map(a => `
            <label class="allergen-item" data-allergen="${a}">
                <input type="checkbox" name="allergen_${a}" value="${a}">
                <span>${I18n.t('traceability.allergen_list.' + a)}</span>
            </label>
        `).join('');
    }

    function addIngredientRow(data) {
        const list = document.getElementById('ingredients-list');
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_name')}" value="${Utils.sanitize((data && data.name) || '')}">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_batch')}" value="${Utils.sanitize((data && data.batch) || '')}">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_qty')}" value="${Utils.sanitize((data && data.qty) || '')}">
            <button type="button" class="ingredient-remove">${App.getIcon('close')}</button>
        `;
        list.appendChild(row);

        row.querySelector('.ingredient-remove').addEventListener('click', () => row.remove());
    }

    function addAdditiveRow(data) {
        const list = document.getElementById('additives-list');
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.additive_code')}" value="${Utils.sanitize((data && data.code) || '')}" style="max-width:100px;">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.additive_name')}" value="${Utils.sanitize((data && data.name) || '')}">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.additive_function')}" value="${Utils.sanitize((data && data.func) || '')}">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.additive_dosage')}" value="${Utils.sanitize((data && data.dosage) || '')}" style="max-width:120px;">
            <button type="button" class="ingredient-remove">${App.getIcon('close')}</button>
        `;
        list.appendChild(row);

        row.querySelector('.ingredient-remove').addEventListener('click', () => row.remove());
    }

    function getIngredients() {
        const rows = document.querySelectorAll('#ingredients-list .ingredient-row');
        return Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input');
            return { name: inputs[0].value, batch: inputs[1].value, qty: inputs[2].value };
        }).filter(i => i.name);
    }

    function getAdditives() {
        const rows = document.querySelectorAll('#additives-list .ingredient-row');
        return Array.from(rows).map(row => {
            const inputs = row.querySelectorAll('input');
            return { code: inputs[0].value, name: inputs[1].value, func: inputs[2].value, dosage: inputs[3].value };
        }).filter(a => a.name || a.code);
    }

    function getAllergens() {
        const checkboxes = document.querySelectorAll('#allergen-grid input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    function setupEvents() {
        // Add button
        Utils.delegate(document.body, '#trace-add-btn, #trace-add-empty', 'click', () => openForm());
        // Close modal
        Utils.delegate(document.body, '#trace-modal-close, #trace-cancel-btn', 'click', () => closeForm());
        // Save
        Utils.delegate(document.body, '#trace-save-btn', 'click', handleSave);
        // Edit
        Utils.delegate(document.body, '.trace-edit-btn', 'click', function() { handleEdit(this.dataset.id); });
        // Delete
        Utils.delegate(document.body, '.trace-delete-btn', 'click', function() { handleDelete(this.dataset.id); });
        // Print
        Utils.delegate(document.body, '.trace-print-btn', 'click', function() { handlePrint(this.dataset.id); });
        // Add ingredient/additive
        Utils.delegate(document.body, '#add-ingredient-btn', 'click', () => addIngredientRow());
        Utils.delegate(document.body, '#add-additive-btn', 'click', () => addAdditiveRow());
        // Allergen toggle
        Utils.delegate(document.body, '.allergen-item', 'click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const cb = this.querySelector('input[type="checkbox"]');
            if (cb) {
                cb.checked = !cb.checked;
                this.classList.toggle('selected', cb.checked);
            }
        });
        // Search
        const searchInput = document.getElementById('trace-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(handleSearch, 300));
        }
    }

    function openForm(product) {
        editingId = product ? product.id : null;
        const title = document.getElementById('trace-modal-title');
        if (title) title.textContent = product ? I18n.t('traceability.edit_product') : I18n.t('traceability.new_product');

        Utils.clearForm('trace-form');

        // Clear dynamic lists
        document.getElementById('ingredients-list').innerHTML = '';
        document.getElementById('additives-list').innerHTML = '';
        document.querySelectorAll('#allergen-grid .allergen-item').forEach(item => {
            item.classList.remove('selected');
            const cb = item.querySelector('input');
            if (cb) cb.checked = false;
        });

        if (product) {
            Utils.setFormData('trace-form', product);
            (product.ingredients || []).forEach(i => addIngredientRow(i));
            (product.additives || []).forEach(a => addAdditiveRow(a));
            (product.allergens || []).forEach(a => {
                const cb = document.querySelector(`#allergen-grid input[value="${a}"]`);
                if (cb) {
                    cb.checked = true;
                    cb.closest('.allergen-item').classList.add('selected');
                }
            });
        }

        Utils.openModal('trace-modal');
    }

    function closeForm() {
        editingId = null;
        Utils.closeModal('trace-modal');
    }

    async function handleSave() {
        const formData = Utils.getFormData('trace-form');
        if (!formData.name || !formData.batchNumber) {
            Utils.showToast('error', I18n.t('app.error_required'));
            return;
        }

        formData.ingredients = getIngredients();
        formData.additives = getAdditives();
        formData.allergens = getAllergens();
        formData.userId = Auth.getUserId();

        try {
            if (editingId) {
                formData.id = editingId;
                await TrazaDB.update('products', formData);
                Utils.showToast('success', I18n.t('app.success_update'));
            } else {
                await TrazaDB.create('products', formData);
                Utils.showToast('success', I18n.t('app.success_save'));
            }
            closeForm();
            render();
        } catch (error) {
            Utils.showToast('error', I18n.t('app.error_generic'));
        }
    }

    async function handleEdit(id) {
        const product = await TrazaDB.read('products', id);
        if (product) openForm(product);
    }

    async function handleDelete(id) {
        Utils.showConfirm(
            I18n.t('app.confirm_delete'),
            I18n.t('app.confirm_delete_desc'),
            async () => {
                await TrazaDB.remove('products', id);
                Utils.showToast('success', I18n.t('app.success_delete'));
                render();
            },
            I18n.t.bind(I18n)
        );
    }

    async function handlePrint(id) {
        const product = await TrazaDB.read('products', id);
        if (!product) return;

        const printSheet = document.getElementById('trace-print-sheet');
        if (!printSheet) return;

        const allergenText = (product.allergens || []).map(a => I18n.t(`traceability.allergen_list.${a}`)).join(', ');

        printSheet.innerHTML = `
            <div class="print-sheet-header">
                <div>
                    <h1>${I18n.t('traceability.product_sheet')}</h1>
                    <p>TrazaControl — ${Utils.formatDate(Utils.nowISO(), I18n.getLang())}</p>
                </div>
                <div style="text-align: right;">
                    <strong>${Auth.getUser().businessName || ''}</strong><br>
                    <small>${I18n.t('traceability.batch_number')}: ${Utils.sanitize(product.batchNumber || '')}</small>
                </div>
            </div>

            <div class="print-sheet-section">
                <h3>${I18n.t('traceability.product_name')}</h3>
                <table>
                    <tr><th>${I18n.t('traceability.product_name')}</th><td>${Utils.sanitize(product.name)}</td></tr>
                    <tr><th>${I18n.t('traceability.product_code')}</th><td>${Utils.sanitize(product.code || '-')}</td></tr>
                    <tr><th>${I18n.t('traceability.batch_number')}</th><td>${Utils.sanitize(product.batchNumber)}</td></tr>
                    <tr><th>${I18n.t('traceability.category')}</th><td>${product.category ? I18n.t('traceability.categories.' + product.category) : '-'}</td></tr>
                    <tr><th>${I18n.t('traceability.manufacturing_date')}</th><td>${Utils.formatDate(product.manufacturingDate, I18n.getLang())}</td></tr>
                    <tr><th>${I18n.t('traceability.expiry_date')}</th><td>${Utils.formatDate(product.expiryDate, I18n.getLang())}</td></tr>
                    <tr><th>${I18n.t('traceability.weight')}</th><td>${Utils.sanitize(product.weight || '-')}</td></tr>
                    <tr><th>${I18n.t('traceability.storage_conditions')}</th><td>${Utils.sanitize(product.storageConditions || '-')}</td></tr>
                </table>
            </div>

            ${(product.ingredients || []).length > 0 ? `
                <div class="print-sheet-section">
                    <h3>${I18n.t('traceability.ingredients')}</h3>
                    <table>
                        <tr><th>${I18n.t('traceability.ingredient_name')}</th><th>${I18n.t('traceability.ingredient_batch')}</th><th>${I18n.t('traceability.ingredient_qty')}</th></tr>
                        ${product.ingredients.map(i => `
                            <tr><td>${Utils.sanitize(i.name)}</td><td>${Utils.sanitize(i.batch || '-')}</td><td>${Utils.sanitize(i.qty || '-')}</td></tr>
                        `).join('')}
                    </table>
                </div>
            ` : ''}

            ${(product.additives || []).length > 0 ? `
                <div class="print-sheet-section">
                    <h3>${I18n.t('traceability.additives')}</h3>
                    <table>
                        <tr><th>${I18n.t('traceability.additive_code')}</th><th>${I18n.t('traceability.additive_name')}</th><th>${I18n.t('traceability.additive_function')}</th><th>${I18n.t('traceability.additive_dosage')}</th></tr>
                        ${product.additives.map(a => `
                            <tr><td>${Utils.sanitize(a.code || '-')}</td><td>${Utils.sanitize(a.name)}</td><td>${Utils.sanitize(a.func || '-')}</td><td>${Utils.sanitize(a.dosage || '-')}</td></tr>
                        `).join('')}
                    </table>
                </div>
            ` : ''}

            <div class="print-sheet-section">
                <h3>${I18n.t('traceability.allergens')}</h3>
                <p><strong>${I18n.t('traceability.contains')}:</strong> ${allergenText || '-'}</p>
            </div>

            ${product.notes ? `
                <div class="print-sheet-section">
                    <h3>${I18n.t('app.notes')}</h3>
                    <p>${Utils.sanitize(product.notes)}</p>
                </div>
            ` : ''}
        `;

        window.print();
    }

    function handleSearch(e) {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#trace-table tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    return { init, render };
})();
