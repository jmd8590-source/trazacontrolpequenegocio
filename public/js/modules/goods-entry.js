/* ============================================================
   TrazaControl — Goods Entry / Reception Module
   Control and verification of incoming raw materials & products
   ============================================================ */

const GoodsEntryModule = (function() {
    'use strict';

    let editingId = null;

    function init() {
        App.registerModule('goods_entry', { render });
    }

    async function render() {
        const container = document.getElementById('module-goods_entry');
        if (!container) return;

        const userId = Auth.getUserId();
        const [entries, suppliers] = await Promise.all([
            TrazaDB.getByUser('goods_entries', userId),
            TrazaDB.getByUser('suppliers', userId)
        ]);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('goods_entry.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-bar">
                        <span class="search-icon">${App.getIcon('search')}</span>
                        <input type="text" class="form-input" id="entry-search" placeholder="${I18n.t('app.search')}">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="entry-add-btn">
                        ${App.getIcon('plus')}
                        <span>${I18n.t('goods_entry.new_entry')}</span>
                    </button>
                </div>
            </div>

            ${entries.length > 0 ? `
                <div class="table-container">
                    <table class="table" id="entry-table">
                        <thead>
                            <tr>
                                <th>${I18n.t('goods_entry.entry_date')}</th>
                                <th>${I18n.t('goods_entry.product_name')}</th>
                                <th>${I18n.t('goods_entry.supplier')}</th>
                                <th>${I18n.t('goods_entry.batch_number')}</th>
                                <th>${I18n.t('goods_entry.quantity')}</th>
                                <th>${I18n.t('goods_entry.temperature_at_reception')}</th>
                                <th>${I18n.t('goods_entry.conformity')}</th>
                                <th>${I18n.t('app.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map(entry => {
                                const supplier = suppliers.find(s => s.id === entry.supplierId);
                                const isConform = entry.conformity === 'conform';
                                return `
                                    <tr data-id="${entry.id}">
                                        <td>${Utils.formatDate(entry.date, I18n.getLang())}</td>
                                        <td><strong>${Utils.sanitize(entry.productName)}</strong></td>
                                        <td>${supplier ? Utils.sanitize(supplier.name) : Utils.sanitize(entry.supplierName || '-')}</td>
                                        <td><code>${Utils.sanitize(entry.batchNumber || '-')}</code></td>
                                        <td>${Utils.sanitize(entry.quantity || '-')} ${Utils.sanitize(entry.unit || '')}</td>
                                        <td>${entry.tempReception !== null && entry.tempReception !== undefined ? entry.tempReception + '°C' : '-'}</td>
                                        <td>
                                            <span class="badge badge-${isConform ? 'success' : 'danger'} badge-dot">
                                                ${isConform ? I18n.t('goods_entry.conform') : I18n.t('goods_entry.non_conform')}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="table-actions">
                                                <button class="btn btn-ghost btn-sm entry-edit-btn" data-id="${entry.id}">✏️</button>
                                                <button class="btn btn-ghost btn-sm entry-delete-btn" data-id="${entry.id}">🗑️</button>
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
                    <div class="empty-state">
                        <div class="empty-state-icon">${App.getIcon('goods_entry')}</div>
                        <div class="empty-state-title">${I18n.t('app.no_data')}</div>
                        <div class="empty-state-desc">${I18n.t('goods_entry.title')}</div>
                        <button class="btn btn-primary" id="entry-add-empty">${I18n.t('goods_entry.new_entry')}</button>
                    </div>
                </div>
            `}

            <!-- Entry Modal -->
            <div id="entry-modal" class="modal-overlay hidden">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 id="entry-modal-title">${I18n.t('goods_entry.new_entry')}</h3>
                        <button class="modal-close entry-close-btn">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="entry-form">
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.product_name')} <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="productName" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.supplier')} <span class="required">*</span></label>
                                    <select class="form-select" name="supplierId" required>
                                        <option value="">${I18n.t('app.select_option')}</option>
                                        ${suppliers.map(s => `<option value="${s.id}">${Utils.sanitize(s.name)}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="grid-3">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.batch_number')} <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="batchNumber" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.quantity')} <span class="required">*</span></label>
                                    <input type="number" step="0.01" class="form-input" name="quantity" required>
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
                                    <label class="form-label">${I18n.t('goods_entry.entry_date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.expiry_date')}</label>
                                    <input type="date" class="form-input" name="expiryDate">
                                </div>
                            </div>

                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.delivery_note_number')}</label>
                                    <input type="text" class="form-input" name="deliveryNote">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.temperature_at_reception')}</label>
                                    <input type="number" step="0.1" class="form-input" name="tempReception">
                                </div>
                            </div>

                            <div class="divider"></div>
                            <div class="module-section-title">${I18n.t('goods_entry.verification_checklist')}</div>

                            <div class="entry-verification-grid mb-4">
                                <label class="verification-check" id="chk-package-label">
                                    <input type="checkbox" name="chkPackaging" id="chk-packaging">
                                    <span>${I18n.t('goods_entry.packaging_condition')}</span>
                                </label>
                                <label class="verification-check" id="chk-label-label">
                                    <input type="checkbox" name="chkLabeling" id="chk-labeling">
                                    <span>${I18n.t('goods_entry.labeling_correct')}</span>
                                </label>
                                <label class="verification-check" id="chk-vehicle-label">
                                    <input type="checkbox" name="chkVehicle" id="chk-vehicle">
                                    <span>${I18n.t('goods_entry.transport_hygiene')}</span>
                                </label>
                                <label class="verification-check" id="chk-organoleptic-label">
                                    <input type="checkbox" name="chkOrganoleptic" id="chk-organoleptic">
                                    <span>${I18n.t('goods_entry.organoleptic_condition')}</span>
                                </label>
                            </div>

                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.conformity')}</label>
                                    <select class="form-select" name="conformity">
                                        <option value="conform">${I18n.t('goods_entry.conform')}</option>
                                        <option value="non_conform">${I18n.t('goods_entry.non_conform')}</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('goods_entry.received_by')}</label>
                                    <input type="text" class="form-input" name="receivedBy">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.notes')}</label>
                                <textarea class="form-textarea" name="notes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary entry-close-btn">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="entry-save-btn">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>
        `;

        setupEvents(suppliers);
    }

    async function populateSupplierSelect(preselectedSupplierId) {
        const userId = Auth.getUserId();
        const suppliers = await TrazaDB.getByUser('suppliers', userId);
        const select = document.querySelector('#entry-form select[name="supplierId"]');
        if (!select) return suppliers;

        if (suppliers.length === 0) {
            select.innerHTML = '<option value="">No hay proveedores dados de alta</option>';
            return suppliers;
        }

        select.innerHTML = `<option value="">-- ${I18n.t('app.select_option')} --</option>` +
            suppliers.map(s => `<option value="${s.id}" ${s.id === preselectedSupplierId ? 'selected' : ''}>${Utils.sanitize(s.name)}</option>`).join('');

        if (preselectedSupplierId) select.value = preselectedSupplierId;
        return suppliers;
    }

    function setupEvents(suppliers) {
        Utils.delegate(document.body, '#entry-add-btn, #entry-add-empty', 'click', async () => {
            editingId = null;
            const currentSuppliers = await populateSupplierSelect();
            if (currentSuppliers.length === 0) {
                Utils.showToast('warning', 'Primero debes añadir al menos un proveedor');
                App.navigateTo('suppliers');
                return;
            }
            Utils.clearForm('entry-form');
            document.querySelector('#entry-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#entry-form [name="receivedBy"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            document.getElementById('entry-modal-title').textContent = I18n.t('goods_entry.new_entry');
            Utils.openModal('entry-modal');
        });

        Utils.delegate(document.body, '.entry-close-btn', 'click', () => Utils.closeModal('entry-modal'));

        Utils.delegate(document.body, '#entry-save-btn', 'click', async () => {
            const data = Utils.getFormData('entry-form');
            if (!data.productName || !data.supplierId || !data.batchNumber || data.quantity === null) {
                Utils.showToast('error', I18n.t('app.error_required'));
                return;
            }

            data.userId = Auth.getUserId();
            const supplier = suppliers.find(s => s.id === data.supplierId);
            data.supplierName = supplier ? supplier.name : '';

            try {
                if (editingId) {
                    data.id = editingId;
                    await TrazaDB.update('goods_entries', data);
                    Utils.showToast('success', I18n.t('app.success_update'));
                } else {
                    await TrazaDB.create('goods_entries', data);

                    // Automatic stock update / create
                    const stockItems = await TrazaDB.getByUser('stock_items', data.userId);
                    let item = stockItems.find(i => i.name.toLowerCase() === data.productName.toLowerCase());
                    if (item) {
                        item.currentStock = (item.currentStock || 0) + data.quantity;
                        item.expiry = data.expiryDate || item.expiry;
                        item.batch = data.batchNumber || item.batch;
                        await TrazaDB.update('stock_items', item);
                    } else {
                        await TrazaDB.create('stock_items', {
                            userId: data.userId,
                            name: data.productName,
                            category: 'Materia Prima',
                            unit: data.unit || 'kg',
                            currentStock: data.quantity,
                            minStock: 5,
                            expiry: data.expiryDate,
                            batch: data.batchNumber
                        });
                    }

                    Utils.showToast('success', I18n.t('app.success_save'));
                }

                Utils.closeModal('entry-modal');
                render();
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        Utils.delegate(document.body, '.entry-edit-btn', 'click', async function() {
            const entry = await TrazaDB.read('goods_entries', this.dataset.id);
            if (!entry) return;
            editingId = entry.id;
            document.getElementById('entry-modal-title').textContent = I18n.t('app.edit');
            Utils.setFormData('entry-form', entry);
            Utils.openModal('entry-modal');
        });

        Utils.delegate(document.body, '.entry-delete-btn', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('goods_entries', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        // Search
        const searchInput = document.getElementById('entry-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(e => {
                const val = e.target.value.toLowerCase();
                document.querySelectorAll('#entry-table tbody tr').forEach(tr => {
                    tr.style.display = tr.textContent.toLowerCase().includes(val) ? '' : 'none';
                });
            }, 300));
        }
    }

    return { init, render };
})();
