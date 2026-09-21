/* ============================================================
   TrazaControl — Cleaning & Disinfection Module (Enhanced)
   ============================================================ */
const CleaningModule = (function() {
    'use strict';

    let editingZoneId = null;

    function init() {
        App.registerModule('cleaning', { render });
    }

    async function render() {
        const container = document.getElementById('module-cleaning');
        if (!container) return;

        const userId = Auth.getUserId();
        const [zones, logs] = await Promise.all([
            TrazaDB.getByUser('cleaning_zones', userId),
            TrazaDB.getByUser('cleaning_logs', userId)
        ]);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('cleaning.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-secondary" id="clean-add-zone">
                        ${App.getIcon('plus')} <span>${I18n.t('cleaning.new_zone')}</span>
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="clean-add-log">
                        ${App.getIcon('plus')} <span>${I18n.t('cleaning.new_log')}</span>
                    </button>
                </div>
            </div>

            ${zones.length > 0 ? `
                <div class="cleaning-schedule-grid stagger-grid mb-8">
                    ${zones.map(z => {
                        const zoneLogs = logs
                            .filter(l => l.zoneId === z.id)
                            .sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                        const lastLog = zoneLogs[0];
                        const status = lastLog ? (lastLog.conformity === 'non_conform' ? 'non_conform' : 'conform') : 'pending';

                        return `
                            <div class="card cleaning-zone-card hover-lift" data-zone-id="${z.id}">
                                <div class="card-body">
                                    <div class="cleaning-zone-status">
                                        <span class="badge badge-${status==='conform'?'success':status==='non_conform'?'danger':'neutral'} badge-dot">
                                            ${status==='conform'?I18n.t('cleaning.conform'):status==='non_conform'?I18n.t('cleaning.non_conform'):I18n.t('app.pending')}
                                        </span>
                                    </div>
                                    <h4 style="font-size: var(--text-lg);">${Utils.sanitize(z.name)}</h4>
                                    <p class="text-sm text-secondary mb-1"><strong>Frecuencia:</strong> ${z.frequency ? I18n.t('cleaning.frequencies.'+z.frequency) : 'Diaria'}</p>
                                    <p class="text-sm text-secondary mb-2"><strong>Producto:</strong> ${Utils.sanitize(z.product || '-')}</p>
                                    <div class="text-xs text-secondary mb-4">
                                        ${lastLog ? 'Última limpieza: ' + Utils.formatDateTime(lastLog.date || lastLog.createdAt, I18n.getLang()) : 'Pendiente de registrar'}
                                    </div>
                                    <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--border-light);">
                                        <button class="btn btn-primary btn-sm quick-add-clean-btn" data-zone-id="${z.id}">
                                            🧹 Registrar Limpieza
                                        </button>
                                        <div class="flex gap-2">
                                            <button class="btn btn-ghost btn-sm clean-zone-edit" data-id="${z.id}">✏️</button>
                                            <button class="btn btn-ghost btn-sm clean-zone-delete" data-id="${z.id}">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="card mb-8">
                    <div class="empty-state" style="padding: 40px 24px;">
                        <div class="empty-state-icon" style="font-size: 40px; margin-bottom: 12px;">🧹</div>
                        <h3 class="empty-state-title">No hay Zonas de Limpieza Configuradas</h3>
                        <p class="empty-state-desc" style="max-width: 480px; margin-bottom: 20px;">
                            Define las mesas de trabajo, amasadoras, suelos o cámaras de tu obrador para llevar el control higiénico-sanitario.
                        </p>
                        <button class="btn btn-primary" id="clean-add-zone-empty">${App.getIcon('plus')} Crear Primera Zona</button>
                    </div>
                </div>
            `}

            <!-- Logs History Table -->
            <div class="card">
                <div class="card-header">
                    <h4>Registro Histórico de Limpieza y Desinfección (${logs.length})</h4>
                </div>
                <div class="card-body">
                    ${logs.length > 0 ? `
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>${I18n.t('app.date')}</th>
                                        <th>${I18n.t('cleaning.zone_name')}</th>
                                        <th>${I18n.t('cleaning.cleaned_by')}</th>
                                        <th>${I18n.t('cleaning.product_used')}</th>
                                        <th>${I18n.t('cleaning.conformity')}</th>
                                        <th>Notas</th>
                                        <th>${I18n.t('app.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${logs.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 30).map(l => {
                                        const z = zones.find(z => z.id === l.zoneId);
                                        return `
                                            <tr>
                                                <td>${Utils.formatDateTime(l.date || l.createdAt, I18n.getLang())}</td>
                                                <td><strong>${z ? Utils.sanitize(z.name) : Utils.sanitize(l.zoneName || '-')}</strong></td>
                                                <td>${Utils.sanitize(l.cleanedBy || '-')}</td>
                                                <td>${Utils.sanitize(l.product || (z && z.product) || '-')}</td>
                                                <td>
                                                    <span class="badge badge-${l.conformity === 'non_conform' ? 'danger' : 'success'} badge-dot">
                                                        ${l.conformity === 'non_conform' ? I18n.t('cleaning.non_conform') : I18n.t('cleaning.conform')}
                                                    </span>
                                                </td>
                                                <td>${Utils.sanitize(l.notes || '-')}</td>
                                                <td><button class="btn btn-ghost btn-sm clean-log-delete" data-id="${l.id}">🗑️</button></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state" style="padding: 24px;">
                            <div class="text-secondary">${I18n.t('app.no_data')}</div>
                        </div>
                    `}
                </div>
            </div>

            <!-- Modal: Zona de Limpieza -->
            <div id="clean-zone-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="clean-zone-title">${I18n.t('cleaning.new_zone')}</h3>
                        <button class="modal-close clean-z-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="clean-zone-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.zone_name')} <span class="required">*</span></label>
                                <input type="text" class="form-input" name="name" placeholder="Ej: Mesas de Acero Inoxidable" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.frequency')}</label>
                                <select class="form-select" name="frequency">
                                    ${['daily','weekly','biweekly','monthly','quarterly','annual','after_use'].map(f=>`<option value="${f}">${I18n.t('cleaning.frequencies.'+f)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.product_used')}</label>
                                <input type="text" class="form-input" name="product" placeholder="Ej: Desinfectante Alimentario Homologado">
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.method')}</label>
                                <textarea class="form-textarea" name="method" rows="2" placeholder="Ej: Enjuague con agua, aplicación de producto 10 min y aclarado"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary clean-z-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="clean-zone-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Registro de Limpieza -->
            <div id="clean-log-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${I18n.t('cleaning.new_log')}</h3>
                        <button class="modal-close clean-l-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="clean-log-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.zone_name')} <span class="required">*</span></label>
                                <select class="form-select" name="zoneId" id="clean-log-zone-select" required>
                                    <option value="">${I18n.t('app.select_option')}</option>
                                </select>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('cleaning.cleaned_by')}</label>
                                    <input type="text" class="form-input" name="cleanedBy" value="${(Auth.getUser() && Auth.getUser().ownerName) || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.product_used')}</label>
                                <input type="text" class="form-input" name="product" placeholder="Dejar en blanco para usar el producto asignado a la zona">
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('cleaning.conformity')}</label>
                                <select class="form-select" name="conformity">
                                    <option value="conform">✅ ${I18n.t('cleaning.conform')}</option>
                                    <option value="non_conform">❌ ${I18n.t('cleaning.non_conform')}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.notes')}</label>
                                <textarea class="form-textarea" name="notes" rows="2" placeholder="Observaciones higiénicas..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary clean-l-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="clean-log-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>
        `;

        setupEvents();
    }

    async function populateZoneSelect(preselectedZoneId) {
        const userId = Auth.getUserId();
        const zones = await TrazaDB.getByUser('cleaning_zones', userId);
        const select = document.getElementById('clean-log-zone-select');
        if (!select) return zones;

        if (zones.length === 0) {
            select.innerHTML = '<option value="">No hay zonas configuradas</option>';
            return zones;
        }

        select.innerHTML = `<option value="">-- ${I18n.t('app.select_option')} --</option>` +
            zones.map(z => `<option value="${z.id}" ${z.id === preselectedZoneId ? 'selected' : ''}>${Utils.sanitize(z.name)}</option>`).join('');

        if (preselectedZoneId) select.value = preselectedZoneId;
        return zones;
    }

    function setupEvents() {
        Utils.delegate(document.body, '#clean-add-zone, #clean-add-zone-empty', 'click', () => {
            editingZoneId = null;
            document.getElementById('clean-zone-title').textContent = I18n.t('cleaning.new_zone');
            Utils.clearForm('clean-zone-form');
            Utils.openModal('clean-zone-modal');
        });

        Utils.delegate(document.body, '.clean-z-close', 'click', () => Utils.closeModal('clean-zone-modal'));

        Utils.delegate(document.body, '#clean-zone-save', 'click', async () => {
            const data = Utils.getFormData('clean-zone-form');
            if (!data.name) {
                Utils.showToast('error', I18n.t('app.error_required'));
                return;
            }
            data.userId = Auth.getUserId();
            if (editingZoneId) {
                data.id = editingZoneId;
                await TrazaDB.update('cleaning_zones', data);
                Utils.showToast('success', I18n.t('app.success_update'));
            } else {
                await TrazaDB.create('cleaning_zones', data);
                Utils.showToast('success', I18n.t('app.success_save'));
            }
            Utils.closeModal('clean-zone-modal');
            render();
        });

        Utils.delegate(document.body, '.clean-zone-edit', 'click', async function(e) {
            e.stopPropagation();
            const z = await TrazaDB.read('cleaning_zones', this.dataset.id);
            if (z) {
                editingZoneId = z.id;
                document.getElementById('clean-zone-title').textContent = I18n.t('app.edit');
                Utils.setFormData('clean-zone-form', z);
                Utils.openModal('clean-zone-modal');
            }
        });

        Utils.delegate(document.body, '.clean-zone-delete', 'click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('cleaning_zones', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        // Open Log Modal (Global)
        Utils.delegate(document.body, '#clean-add-log', 'click', async () => {
            const zones = await populateZoneSelect();
            if (zones.length === 0) {
                Utils.showToast('warning', 'Primero debes añadir al menos una zona de limpieza');
                Utils.openModal('clean-zone-modal');
                return;
            }
            Utils.clearForm('clean-log-form');
            document.querySelector('#clean-log-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#clean-log-form [name="cleanedBy"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('clean-log-modal');
        });

        // Quick add from Zone card
        Utils.delegate(document.body, '.quick-add-clean-btn', 'click', async function(e) {
            e.stopPropagation();
            const zoneId = this.dataset.zoneId;
            await populateZoneSelect(zoneId);
            Utils.clearForm('clean-log-form');
            document.querySelector('#clean-log-form [name="zoneId"]').value = zoneId;
            document.querySelector('#clean-log-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#clean-log-form [name="cleanedBy"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('clean-log-modal');
        });

        Utils.delegate(document.body, '.clean-l-close', 'click', () => Utils.closeModal('clean-log-modal'));

        Utils.delegate(document.body, '#clean-log-save', 'click', async () => {
            const data = Utils.getFormData('clean-log-form');
            if (!data.zoneId) {
                Utils.showToast('error', I18n.t('app.error_required') + ' (Zona de limpieza)');
                return;
            }
            data.userId = Auth.getUserId();
            const zone = await TrazaDB.read('cleaning_zones', data.zoneId);
            data.zoneName = zone ? zone.name : '';
            if (!data.product && zone) data.product = zone.product;
            data.date = data.date ? new Date(data.date).toISOString() : Utils.nowISO();

            try {
                await TrazaDB.create('cleaning_logs', data);
                Utils.closeModal('clean-log-modal');
                Utils.showToast('success', I18n.t('app.success_save'));
                render();
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        Utils.delegate(document.body, '.clean-log-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('cleaning_logs', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });
    }

    return { init, render };
})();
