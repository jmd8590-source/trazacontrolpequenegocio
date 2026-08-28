/* ============================================================
   TrazaControl — Stock / Inventory Module (Responsive & Robust)
   ============================================================ */
const StockModule = (function() {
    'use strict';

    let editingId = null;

    function init() {
        App.registerModule('stock', { render });
    }

    async function render() {
        const container = document.getElementById('module-stock');
        if (!container) return;

        const userId = Auth.getUserId();
        const [items, movements] = await Promise.all([
            TrazaDB.getByUser('stock_items', userId),
            TrazaDB.getByUser('stock_movements', userId)
        ]);

        const currentItems = items || [];
        const totalItems = currentItems.length;
        const lowStock = currentItems.filter(i => i.currentStock !== undefined && i.minStock !== undefined && Number(i.currentStock) <= Number(i.minStock)).length;

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('stock.title')}</h2>
            </div>

            <div class="stock-summary-bar">
                <div class="stock-summary-item">
                    <div class="text-2xl font-bold">${totalItems}</div>
                    <div class="text-sm text-secondary">${I18n.t('stock.total_items')}</div>
                </div>
                <div class="stock-summary-item">
                    <div class="text-2xl font-bold" style="color:var(--warning)">${lowStock}</div>
                    <div class="text-sm text-secondary">${I18n.t('stock.low_stock')}</div>
                </div>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-bar">
                        <span class="search-icon">${App.getIcon('search')}</span>
                        <input type="text" class="form-input" id="stock-search" placeholder="${I18n.t('app.search')}">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button type="button" class="btn btn-primary ripple-container" onclick="StockModule.newItem()">
                        ${App.getIcon('plus')} <span>${I18n.t('stock.new_item')}</span>
                    </button>
                </div>
            </div>

            ${currentItems.length > 0 ? `
                <div class="table-container">
                    <table class="table" id="stock-table">
                        <thead>
                            <tr>
                                <th>${I18n.t('stock.product_name')}</th>
                                <th>${I18n.t('stock.category')}</th>
                                <th>${I18n.t('stock.current_stock')}</th>
                                <th>${I18n.t('stock.min_stock')}</th>
                                <th>${I18n.t('stock.unit')}</th>
                                <th>${I18n.t('stock.expiry_date')}</th>
                                <th>${I18n.t('app.status')}</th>
                                <th>${I18n.t('app.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${currentItems.map(item => {
                                const isLow = item.currentStock !== undefined && item.minStock !== undefined && Number(item.currentStock) <= Number(item.minStock);
                                const expDays = Utils.daysUntil(item.expiry);
                                const expClass = expDays !== null && expDays <= 3 ? 'text-danger' : '';

                                return `
                                    <tr data-id="${item.id}">
                                        <td><strong>${Utils.sanitize(item.name)}</strong></td>
                                        <td>${item.category ? `<span class="badge badge-primary">${Utils.sanitize(item.category)}</span>` : '-'}</td>
                                        <td><strong style="color:${isLow ? 'var(--danger)' : 'var(--text-primary)'}">${item.currentStock !== undefined ? item.currentStock : '-'}</strong></td>
                                        <td>${item.minStock !== undefined ? item.minStock : '-'}</td>
                                        <td>${Utils.sanitize(item.unit || '-')}</td>
                                        <td class="${expClass}">${Utils.formatDate(item.expiry, I18n.getLang())}</td>
                                        <td>${isLow ? `<span class="badge badge-danger badge-dot">${I18n.t('stock.low_stock')}</span>` : `<span class="badge badge-success badge-dot">OK</span>`}</td>
                                        <td>
                                            <div class="table-actions">
                                                <button type="button" class="btn btn-ghost btn-sm" onclick="StockModule.stockMove('${item.id}', 'in')" title="${I18n.t('stock.entry')}">📥</button>
                                                <button type="button" class="btn btn-ghost btn-sm" onclick="StockModule.stockMove('${item.id}', 'out')" title="${I18n.t('stock.exit')}">📤</button>
                                                <button type="button" class="btn btn-ghost btn-sm" onclick="StockModule.editItem('${item.id}')" title="${I18n.t('app.edit')}">✏️</button>
                                                <button type="button" class="btn btn-ghost btn-sm" onclick="StockModule.deleteItem('${item.id}')" title="${I18n.t('app.delete')}">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="card">
                    <div class="empty-state" style="padding: 40px 24px;">
                        <div class="empty-state-icon" style="font-size: 40px; margin-bottom: 12px;">📦</div>
                        <div class="empty-state-title">${I18n.t('app.no_data')}</div>
                        <p class="text-secondary mb-4">No hay artículos de stock o ingredientes registrados aún.</p>
                        <button type="button" class="btn btn-primary" onclick="StockModule.newItem()">${I18n.t('stock.new_item')}</button>
                    </div>
                </div>
            `}

            <!-- Modal: Nuevo / Editar Artículo de Stock -->
            <div id="stock-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="stock-modal-title">${I18n.t('stock.new_item')}</h3>
                        <button type="button" class="modal-close" onclick="Utils.closeModal('stock-modal')">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="stock-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('stock.product_name')} <span class="required">*</span></label>
                                <input type="text" class="form-input" name="name" required placeholder="Ej: Harina de Trigo Eco">
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.category')}</label>
                                    <input type="text" class="form-input" name="category" placeholder="Ej: Materias Primas / Especias">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.unit')}</label>
                                    <select class="form-select" name="unit">
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="L">L</option>
                                        <option value="mL">mL</option>
                                        <option value="ud">ud</option>
                                    </select>
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.current_stock')}</label>
                                    <input type="number" step="0.01" class="form-input" name="currentStock" placeholder="0">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.min_stock')}</label>
                                    <input type="number" step="0.01" class="form-input" name="minStock" placeholder="0">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.expiry_date')}</label>
                                    <input type="date" class="form-input" name="expiry">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('stock.batch_number')}</label>
                                    <input type="text" class="form-input" name="batch" placeholder="LOT-...">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('stock.storage_location')}</label>
                                <input type="text" class="form-input" name="location" placeholder="Ej: Estantería A3 / Cámara 1">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('stock-modal')">${I18n.t('app.cancel')}</button>
                        <button type="button" class="btn btn-primary ripple-container" onclick="StockModule.saveItem()">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Movimiento de Entrada / Salida -->
            <div id="stock-move-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="stock-move-title">${I18n.t('stock.entry')}</h3>
                        <button type="button" class="modal-close" onclick="Utils.closeModal('stock-move-modal')">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="stock-move-form">
                            <input type="hidden" name="itemId">
                            <input type="hidden" name="type">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('stock.quantity')} <span class="required">*</span></label>
                                <input type="number" step="0.01" class="form-input" name="quantity" required placeholder="0.00">
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.notes')}</label>
                                <input type="text" class="form-input" name="notes" placeholder="Motivo o referencia...">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Utils.closeModal('stock-move-modal')">${I18n.t('app.cancel')}</button>
                        <button type="button" class="btn btn-primary ripple-container" onclick="StockModule.saveMove()">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>
        `;

        const searchInput = document.getElementById('stock-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(e => {
                const t = e.target.value.toLowerCase();
                document.querySelectorAll('#stock-table tbody tr').forEach(r => {
                    r.style.display = r.textContent.toLowerCase().includes(t) ? '' : 'none';
                });
            }, 300));
        }
    }

    function newItem() {
        editingId = null;
        const titleEl = document.getElementById('stock-modal-title');
        if (titleEl) titleEl.textContent = I18n.t('stock.new_item');
        Utils.clearForm('stock-form');
        Utils.openModal('stock-modal');
    }

    async function editItem(id) {
        const item = await TrazaDB.read('stock_items', id);
        if (!item) return;
        editingId = item.id;
        const titleEl = document.getElementById('stock-modal-title');
        if (titleEl) titleEl.textContent = I18n.t('app.edit') + ': ' + item.name;
        Utils.setFormData('stock-form', item);
        Utils.openModal('stock-modal');
    }

    async function deleteItem(id) {
        Utils.showConfirm(
            I18n.t('app.confirm_delete'),
            I18n.t('app.confirm_delete_desc'),
            async () => {
                await TrazaDB.remove('stock_items', id);
                Utils.showToast('success', I18n.t('app.success_delete'));
                render();
            },
            I18n.t.bind(I18n)
        );
    }

    async function saveItem() {
        const d = Utils.getFormData('stock-form');
        if (!d.name) {
            Utils.showToast('error', I18n.t('app.error_required'));
            return;
        }
        d.userId = Auth.getUserId();
        if (editingId) {
            d.id = editingId;
            await TrazaDB.update('stock_items', d);
            Utils.showToast('success', I18n.t('app.success_update'));
        } else {
            await TrazaDB.create('stock_items', d);
            Utils.showToast('success', I18n.t('app.success_save'));
        }
        Utils.closeModal('stock-modal');
        render();
    }

    function stockMove(id, type) {
        Utils.clearForm('stock-move-form');
        document.querySelector('#stock-move-form [name="itemId"]').value = id;
        document.querySelector('#stock-move-form [name="type"]').value = type;
        const titleEl = document.getElementById('stock-move-title');
        if (titleEl) titleEl.textContent = type === 'in' ? I18n.t('stock.entry') : I18n.t('stock.exit');
        Utils.openModal('stock-move-modal');
    }

    async function saveMove() {
        const d = Utils.getFormData('stock-move-form');
        if (!d.quantity || Number(d.quantity) <= 0) {
            Utils.showToast('error', I18n.t('app.error_required') + ' (Cantidad > 0)');
            return;
        }
        d.userId = Auth.getUserId();
        d.date = Utils.nowISO();
        await TrazaDB.create('stock_movements', d);

        const item = await TrazaDB.read('stock_items', d.itemId);
        if (item) {
            const qtyNum = Number(d.quantity);
            const cur = Number(item.currentStock || 0);
            item.currentStock = d.type === 'in' ? cur + qtyNum : Math.max(0, cur - qtyNum);
            await TrazaDB.update('stock_items', item);
        }

        Utils.closeModal('stock-move-modal');
        Utils.showToast('success', I18n.t('app.success_save'));
        render();
    }

    return {
        init,
        render,
        newItem,
        editItem,
        deleteItem,
        saveItem,
        stockMove,
        saveMove
    };
})();
