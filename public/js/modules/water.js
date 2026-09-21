/* ============================================================
   TrazaControl — Water Measurements Module (Enhanced)
   ============================================================ */
const WaterModule = (function() {
    'use strict';

    function init() { App.registerModule('water', { render }); }

    async function render() {
        const container = document.getElementById('module-water');
        if (!container) return;

        const userId = Auth.getUserId();
        const [points, readings] = await Promise.all([
            TrazaDB.getByUser('water_points', userId),
            TrazaDB.getByUser('water_readings', userId)
        ]);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('water.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-secondary" id="water-add-point">
                        ${App.getIcon('plus')} <span>${I18n.t('water.new_point')}</span>
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="water-add-reading">
                        ${App.getIcon('plus')} <span>${I18n.t('water.new_reading')}</span>
                    </button>
                </div>
            </div>

            ${points.length > 0 ? `
                <div class="grid-auto mb-8 stagger-grid">
                    ${points.map(p => {
                        const pr = readings
                            .filter(r => r.pointId === p.id)
                            .sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                        const last = pr[0];
                        const chlorineOk = last ? (last.chlorine >= 0.2 && last.chlorine <= 1.0) : null;

                        return `
                            <div class="card hover-lift" data-point-id="${p.id}">
                                <div class="card-body text-center">
                                    <h4 class="mb-1" style="font-size: var(--text-lg);">${Utils.sanitize(p.name)}</h4>
                                    <p class="text-sm text-secondary mb-3">${Utils.sanitize(p.location || 'Ubicación estándar')}</p>

                                    <div class="water-gauge-circle ${chlorineOk === null ? '' : chlorineOk ? 'ok' : 'warn'}" style="margin: 0 auto;">
                                        ${last ? last.chlorine : '--'}
                                    </div>
                                    <div class="water-gauge-label" style="font-weight: 700; margin-top: 8px;">
                                        Cloro Libre Residual (mg/L)
                                    </div>

                                    ${last ? `
                                        <div class="mt-2">
                                            <span class="badge badge-${chlorineOk ? 'success' : 'danger'} badge-dot">
                                                ${chlorineOk ? 'En Rango (0.2 - 1.0 mg/L)' : 'Desviación'}
                                            </span>
                                        </div>
                                        <div class="text-xs text-secondary mt-2">
                                            pH: ${last.ph || '-'} | ${Utils.formatDate(last.date, I18n.getLang())}
                                        </div>
                                    ` : `
                                        <div class="text-xs text-secondary mt-2">Sin mediciones registradas</div>
                                    `}

                                    <div class="flex gap-2 mt-4 justify-center pt-2" style="border-top: 1px solid var(--border-light);">
                                        <button class="btn btn-primary btn-sm quick-add-water-btn" data-point-id="${p.id}">
                                            💧 Medir
                                        </button>
                                        <button class="btn btn-ghost btn-sm water-point-delete" data-id="${p.id}">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="card mb-8">
                    <div class="empty-state" style="padding: 40px 24px;">
                        <div class="empty-state-icon" style="font-size: 40px; margin-bottom: 12px;">💧</div>
                        <h3 class="empty-state-title">No hay Puntos de Muestreo de Agua</h3>
                        <p class="empty-state-desc" style="max-width: 480px; margin-bottom: 20px;">
                            Registra los grifos del obrador o fuentes de agua potable para medir cloro residual y pH.
                        </p>
                        <button class="btn btn-primary" id="water-add-point-empty">${App.getIcon('plus')} Crear Primer Grifo/Punto</button>
                    </div>
                </div>
            `}

            <!-- Water History Table -->
            <div class="card">
                <div class="card-header">
                    <h4>${I18n.t('water.history')} (${readings.length})</h4>
                </div>
                <div class="card-body">
                    ${readings.length > 0 ? `
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>${I18n.t('app.date')}</th>
                                        <th>${I18n.t('water.sampling_point')}</th>
                                        <th>${I18n.t('water.residual_chlorine')}</th>
                                        <th>pH (6.5 - 8.5)</th>
                                        <th>${I18n.t('app.status')}</th>
                                        <th>${I18n.t('app.responsible')}</th>
                                        <th>${I18n.t('app.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${readings.sort((a,b)=>new Date(b.date || b.createdAt)-new Date(a.date || a.createdAt)).slice(0,30).map(r=>{
                                        const p = points.find(p=>p.id===r.pointId);
                                        const ok = r.chlorine >= 0.2 && r.chlorine <= 1.0;
                                        return `
                                            <tr>
                                                <td>${Utils.formatDate(r.date || r.createdAt, I18n.getLang())}</td>
                                                <td><strong>${p ? Utils.sanitize(p.name) : Utils.sanitize(r.pointName || '-')}</strong></td>
                                                <td><strong style="font-size: 1.1em; color:${ok?'var(--success)':'var(--danger)'}">${r.chlorine} mg/L</strong></td>
                                                <td>${r.ph || '-'}</td>
                                                <td><span class="badge badge-${ok?'success':'danger'} badge-dot">${ok?I18n.t('water.in_range'):I18n.t('water.out_of_range')}</span></td>
                                                <td>${Utils.sanitize(r.responsible || '-')}</td>
                                                <td><button class="btn btn-ghost btn-sm water-reading-delete" data-id="${r.id}">🗑️</button></td>
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

            <!-- Modal: Punto de Agua -->
            <div id="water-point-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${I18n.t('water.new_point')}</h3>
                        <button class="modal-close wp-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="water-point-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('water.point_name')} <span class="required">*</span></label>
                                <input type="text" class="form-input" name="name" placeholder="Ej: Grifo Principal Obrador" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('water.point_location')}</label>
                                <input type="text" class="form-input" name="location" placeholder="Ej: Fregadero central">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary wp-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="water-point-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Medición de Agua -->
            <div id="water-reading-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${I18n.t('water.new_reading')}</h3>
                        <button class="modal-close wr-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="water-reading-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('water.sampling_point')} <span class="required">*</span></label>
                                <select class="form-select" name="pointId" id="water-reading-point-select" required>
                                    <option value="">${I18n.t('app.select_option')}</option>
                                </select>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('water.residual_chlorine')} (mg/L) <span class="required">*</span></label>
                                    <input type="number" step="0.01" class="form-input" name="chlorine" placeholder="0.2 a 1.0 mg/L" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('water.ph_level')} (pH)</label>
                                    <input type="number" step="0.1" class="form-input" name="ph" placeholder="6.5 a 8.5" value="7.2">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.responsible')}</label>
                                    <input type="text" class="form-input" name="responsible" value="${(Auth.getUser() && Auth.getUser().ownerName) || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('water.corrective_action')}</label>
                                <textarea class="form-textarea" name="correctiveAction" rows="2" placeholder="Medidas en caso de no conformidad..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary wr-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="water-reading-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>
        `;

        setupEvents();
    }

    async function populateWaterPointSelect(preselectedId) {
        const userId = Auth.getUserId();
        const points = await TrazaDB.getByUser('water_points', userId);
        const select = document.getElementById('water-reading-point-select');
        if (!select) return points;

        if (points.length === 0) {
            select.innerHTML = '<option value="">No hay puntos configurados</option>';
            return points;
        }

        select.innerHTML = `<option value="">-- ${I18n.t('app.select_option')} --</option>` +
            points.map(p => `<option value="${p.id}" ${p.id === preselectedId ? 'selected' : ''}>${Utils.sanitize(p.name)}</option>`).join('');

        if (preselectedId) select.value = preselectedId;
        return points;
    }

    function setupEvents() {
        Utils.delegate(document.body, '#water-add-point, #water-add-point-empty', 'click', () => {
            Utils.clearForm('water-point-form');
            Utils.openModal('water-point-modal');
        });

        Utils.delegate(document.body, '.wp-close', 'click', () => Utils.closeModal('water-point-modal'));

        Utils.delegate(document.body, '#water-point-save', 'click', async () => {
            const data = Utils.getFormData('water-point-form');
            if (!data.name) {
                Utils.showToast('error', I18n.t('app.error_required'));
                return;
            }
            data.userId = Auth.getUserId();
            await TrazaDB.create('water_points', data);
            Utils.closeModal('water-point-modal');
            Utils.showToast('success', I18n.t('app.success_save'));
            render();
        });

        Utils.delegate(document.body, '.water-point-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('water_points', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        Utils.delegate(document.body, '#water-add-reading', 'click', async () => {
            const points = await populateWaterPointSelect();
            if (points.length === 0) {
                Utils.showToast('warning', 'Primero añade un punto de toma de agua');
                Utils.openModal('water-point-modal');
                return;
            }
            Utils.clearForm('water-reading-form');
            document.querySelector('#water-reading-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#water-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('water-reading-modal');
        });

        Utils.delegate(document.body, '.quick-add-water-btn', 'click', async function(e) {
            e.stopPropagation();
            const pointId = this.dataset.pointId;
            await populateWaterPointSelect(pointId);
            Utils.clearForm('water-reading-form');
            document.querySelector('#water-reading-form [name="pointId"]').value = pointId;
            document.querySelector('#water-reading-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#water-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('water-reading-modal');
        });

        Utils.delegate(document.body, '.wr-close', 'click', () => Utils.closeModal('water-reading-modal'));

        Utils.delegate(document.body, '#water-reading-save', 'click', async () => {
            const data = Utils.getFormData('water-reading-form');
            if (!data.pointId || data.chlorine === null || isNaN(data.chlorine)) {
                Utils.showToast('error', I18n.t('app.error_required') + ' (Punto y Cloro)');
                return;
            }
            data.userId = Auth.getUserId();
            const point = await TrazaDB.read('water_points', data.pointId);
            data.pointName = point ? point.name : '';
            data.date = data.date ? new Date(data.date).toISOString() : Utils.nowISO();

            try {
                await TrazaDB.create('water_readings', data);
                Utils.closeModal('water-reading-modal');
                Utils.showToast('success', I18n.t('app.success_save'));
                render();
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        Utils.delegate(document.body, '.water-reading-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('water_readings', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });
    }

    return { init, render };
})();
