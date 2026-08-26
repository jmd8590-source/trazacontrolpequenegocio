/* ============================================================
   TrazaControl — Temperature Control Module (Enhanced)
   With Dynamic Selectors, Detail View & Easy Reading Entry
   ============================================================ */

const TemperatureModule = (function() {
    'use strict';

    let editingPointId = null;
    let selectedPointForDetail = null;

    function init() {
        App.registerModule('temperature', { render });
    }

    async function render() {
        const container = document.getElementById('module-temperature');
        if (!container) return;

        const userId = Auth.getUserId();
        const [points, readings] = await Promise.all([
            TrazaDB.getByUser('temperature_points', userId),
            TrazaDB.getByUser('temperature_readings', userId)
        ]);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('temperature.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-secondary" id="temp-add-point-btn">
                        ${App.getIcon('plus')} <span>${I18n.t('temperature.new_point')}</span>
                    </button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="temp-add-reading-btn">
                        ${App.getIcon('plus')} <span>${I18n.t('temperature.new_reading')}</span>
                    </button>
                </div>
            </div>

            <!-- Temperature Control Points Grid -->
            ${points.length > 0 ? `
                <div class="temp-points-grid stagger-grid mb-8">
                    ${points.map(point => {
                        const pointReadings = readings
                            .filter(r => r.pointId === point.id)
                            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
                        const latest = pointReadings[0];
                        const inRange = latest ? (latest.temperature >= point.minTemp && latest.temperature <= point.maxTemp) : null;
                        const statusClass = latest ? (inRange ? 'in-range' : 'out-of-range') : 'no-reading';

                        return `
                            <div class="card card-interactive temp-point-card ${statusClass} hover-lift" data-point-id="${point.id}">
                                <div class="card-body">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 style="font-size: var(--text-lg);">${Utils.sanitize(point.name)}</h4>
                                        <span class="badge badge-${inRange === null ? 'neutral' : inRange ? 'success' : 'danger'} badge-dot">
                                            ${inRange === null ? 'Sin datos' : inRange ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}
                                        </span>
                                    </div>

                                    <div class="temp-current" style="color: ${inRange === null ? 'var(--gray-500)' : inRange ? 'var(--success)' : 'var(--danger)'}; margin: 8px 0;">
                                        ${latest ? latest.temperature + '°C' : '--'}
                                    </div>

                                    <div class="temp-range mb-2">
                                        <span class="temp-range-indicator ${inRange === null ? 'neutral' : inRange ? 'ok' : 'warn'}"></span>
                                        <strong>Rango Permitido:</strong> ${point.minTemp}°C a ${point.maxTemp}°C
                                    </div>

                                    <div class="text-sm text-secondary mb-4">
                                        ${latest ? 'Último registro: ' + Utils.formatDateTime(latest.date || latest.createdAt, I18n.getLang()) : 'No hay lecturas registradas'}
                                    </div>

                                    <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--border-light);">
                                        <button class="btn btn-primary btn-sm quick-add-temp-btn" data-point-id="${point.id}" title="Registrar lectura ahora">
                                            ➕ Registrar °C
                                        </button>
                                        <div class="flex gap-2">
                                            <button class="btn btn-ghost btn-sm temp-point-view" data-id="${point.id}" title="Ver historial completo en grande">
                                                🔍 Ver Detalle
                                            </button>
                                            <button class="btn btn-ghost btn-sm temp-point-edit" data-id="${point.id}" title="Editar punto">
                                                ✏️
                                            </button>
                                            <button class="btn btn-ghost btn-sm temp-point-delete" data-id="${point.id}" title="Eliminar punto">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- History Table Section with Scrolling -->
                <div class="card">
                    <div class="card-header">
                        <h4>${I18n.t('temperature.history')} (${readings.length})</h4>
                    </div>
                    <div class="card-body">
                        ${readings.length > 0 ? `
                            <div class="table-container">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>${I18n.t('app.date')}</th>
                                            <th>${I18n.t('temperature.control_point')}</th>
                                            <th>Temperatura</th>
                                            <th>Límites</th>
                                            <th>${I18n.t('app.status')}</th>
                                            <th>${I18n.t('app.responsible')}</th>
                                            <th>Acción Correctora</th>
                                            <th>${I18n.t('app.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${readings.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 30).map(r => {
                                            const point = points.find(p => p.id === r.pointId);
                                            const inRange = point ? (r.temperature >= point.minTemp && r.temperature <= point.maxTemp) : true;
                                            return `
                                                <tr>
                                                    <td>${Utils.formatDateTime(r.date || r.createdAt, I18n.getLang())}</td>
                                                    <td><strong>${point ? Utils.sanitize(point.name) : '-'}</strong></td>
                                                    <td>
                                                        <span style="font-size: 1.15em; font-weight: 800; color: ${inRange ? 'var(--success)' : 'var(--danger)'};">
                                                            ${r.temperature}°C
                                                        </span>
                                                    </td>
                                                    <td><small class="text-secondary">${point ? point.minTemp + '°C / ' + point.maxTemp + '°C' : '-'}</small></td>
                                                    <td>
                                                        <span class="badge badge-${inRange ? 'success' : 'danger'} badge-dot">
                                                            ${inRange ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}
                                                        </span>
                                                    </td>
                                                    <td>${Utils.sanitize(r.responsible || '-')}</td>
                                                    <td>${Utils.sanitize(r.correctiveAction || '-')}</td>
                                                    <td>
                                                        <button class="btn btn-ghost btn-sm temp-reading-delete" data-id="${r.id}" title="Eliminar registro">🗑️</button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : `
                            <div class="empty-state" style="padding: 30px;">
                                <div class="text-secondary">${I18n.t('app.no_data')}</div>
                            </div>
                        `}
                    </div>
                </div>
            ` : `
                <div class="card">
                    <div class="empty-state" style="padding: 48px 24px;">
                        <div class="empty-state-icon" style="font-size: 48px; margin-bottom: 16px;">🌡️</div>
                        <h3 class="empty-state-title" style="font-size: var(--text-2xl); margin-bottom: 8px;">No hay Puntos de Control de Temperatura</h3>
                        <p class="empty-state-desc" style="max-width: 480px; margin-bottom: 24px;">
                            Para registrar lecturas de temperatura, primero añade las cámaras frigoríficas, congeladores o vitrinas de tu negocio.
                        </p>
                        <button class="btn btn-primary btn-lg ripple-container" id="temp-add-point-empty">
                            ${App.getIcon('plus')} <span>Crear Primer Punto de Control</span>
                        </button>
                    </div>
                </div>
            `}

            <!-- Modal: Nuevo / Editar Punto de Control -->
            <div id="temp-point-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3 id="temp-point-modal-title">${I18n.t('temperature.new_point')}</h3>
                        <button class="modal-close temp-point-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="temp-point-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.point_name')} <span class="required">*</span></label>
                                <input type="text" class="form-input" name="name" placeholder="Ej: Cámara Frigorífica 1" required>
                                <div class="form-error"></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.point_type')}</label>
                                <select class="form-select" name="type">
                                    <option value="cold_room">Cámara Frigorífica (0°C a 4°C)</option>
                                    <option value="freezer">Congelador (-22°C a -18°C)</option>
                                    <option value="display_fridge">Vitrina Expositora (2°C a 6°C)</option>
                                    <option value="workspace">Zona de Obrador / Fermentación (14°C a 18°C)</option>
                                    <option value="storage">Almacén a Temperatura Ambiente</option>
                                    <option value="transport">Vehículo Isotermo / Transporte</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.min_temp')} <span class="required">*</span></label>
                                    <input type="number" step="0.1" class="form-input" name="minTemp" value="0.0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.max_temp')} <span class="required">*</span></label>
                                    <input type="number" step="0.1" class="form-input" name="maxTemp" value="4.0" required>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary temp-point-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="temp-point-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Nuevo Registro de Temperatura -->
            <div id="temp-reading-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${I18n.t('temperature.new_reading')}</h3>
                        <button class="modal-close temp-reading-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="temp-reading-form">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.control_point')} <span class="required">*</span></label>
                                <select class="form-select" name="pointId" id="temp-reading-point-select" required>
                                    <option value="">${I18n.t('app.select_option')}</option>
                                </select>
                                <div id="temp-reading-point-info" class="text-sm mt-2 text-secondary"></div>
                            </div>

                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.current_temp')} (°C) <span class="required">*</span></label>
                                    <input type="number" step="0.1" class="form-input" name="temperature" id="temp-reading-val" placeholder="Ej: 3.5" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.responsible')}</label>
                                <input type="text" class="form-input" name="responsible" placeholder="Nombre de la persona que mide" value="${(Auth.getUser() && Auth.getUser().ownerName) || ''}">
                            </div>

                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.corrective_action')} (Si hubo desviación)</label>
                                <textarea class="form-textarea" name="correctiveAction" rows="2" placeholder="Ej: Se ajustó el termostato y se revisó el cierre de la puerta"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary temp-reading-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="temp-reading-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Ver Detalle en Grande del Punto de Control -->
            <div id="temp-detail-modal" class="modal-overlay hidden">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 id="temp-detail-title">Detalle de Punto de Control</h3>
                        <button class="modal-close temp-detail-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body" id="temp-detail-body"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary temp-detail-close">${I18n.t('app.close')}</button>
                        <button class="btn btn-primary ripple-container" id="temp-detail-add-btn">➕ Registrar Temperatura Aquí</button>
                    </div>
                </div>
            </div>
        `;

        setupEvents();
    }

    // Load available points into the modal select box
    async function populatePointSelect(preselectedPointId) {
        const userId = Auth.getUserId();
        const points = await TrazaDB.getByUser('temperature_points', userId);
        const select = document.getElementById('temp-reading-point-select');
        if (!select) return points;

        if (points.length === 0) {
            select.innerHTML = '<option value="">No hay puntos configurados</option>';
            return points;
        }

        select.innerHTML = `<option value="">-- ${I18n.t('app.select_option')} --</option>` +
            points.map(p => `
                <option value="${p.id}" data-min="${p.minTemp}" data-max="${p.maxTemp}" ${p.id === preselectedPointId ? 'selected' : ''}>
                    ${Utils.sanitize(p.name)} (Rango: ${p.minTemp}°C a ${p.maxTemp}°C)
                </option>
            `).join('');

        if (preselectedPointId) {
            select.value = preselectedPointId;
        }

        return points;
    }

    function setupEvents() {
        // Open New Point Modal
        Utils.delegate(document.body, '#temp-add-point-btn, #temp-add-point-empty', 'click', () => {
            editingPointId = null;
            document.getElementById('temp-point-modal-title').textContent = I18n.t('temperature.new_point');
            Utils.clearForm('temp-point-form');
            Utils.openModal('temp-point-modal');
        });

        // Close Point Modal
        Utils.delegate(document.body, '.temp-point-close', 'click', () => Utils.closeModal('temp-point-modal'));

        // Save Point
        Utils.delegate(document.body, '#temp-point-save', 'click', async () => {
            const data = Utils.getFormData('temp-point-form');
            if (!data.name || data.minTemp === null || data.maxTemp === null) {
                Utils.showToast('error', I18n.t('app.error_required'));
                return;
            }

            data.userId = Auth.getUserId();

            try {
                if (editingPointId) {
                    data.id = editingPointId;
                    await TrazaDB.update('temperature_points', data);
                    Utils.showToast('success', I18n.t('app.success_update'));
                } else {
                    await TrazaDB.create('temperature_points', data);
                    Utils.showToast('success', I18n.t('app.success_save'));
                }
                Utils.closeModal('temp-point-modal');
                render();
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        // Edit Point
        Utils.delegate(document.body, '.temp-point-edit', 'click', async function(e) {
            e.stopPropagation();
            const point = await TrazaDB.read('temperature_points', this.dataset.id);
            if (point) {
                editingPointId = point.id;
                document.getElementById('temp-point-modal-title').textContent = I18n.t('app.edit');
                Utils.setFormData('temp-point-form', point);
                Utils.openModal('temp-point-modal');
            }
        });

        // Delete Point
        Utils.delegate(document.body, '.temp-point-delete', 'click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('temperature_points', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        // Open Reading Modal (Global button)
        Utils.delegate(document.body, '#temp-add-reading-btn', 'click', async () => {
            const points = await populatePointSelect();
            if (points.length === 0) {
                Utils.showToast('warning', 'Primero debes crear al menos un punto de control de temperatura');
                Utils.openModal('temp-point-modal');
                return;
            }
            Utils.clearForm('temp-reading-form');
            document.querySelector('#temp-reading-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#temp-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('temp-reading-modal');
        });

        // Quick add temperature from Point Card
        Utils.delegate(document.body, '.quick-add-temp-btn', 'click', async function(e) {
            e.stopPropagation();
            const pointId = this.dataset.pointId;
            await populatePointSelect(pointId);
            Utils.clearForm('temp-reading-form');
            document.querySelector('#temp-reading-form [name="pointId"]').value = pointId;
            document.querySelector('#temp-reading-form [name="date"]').value = Utils.todayISO();
            document.querySelector('#temp-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('temp-reading-modal');
        });

        // Close Reading Modal
        Utils.delegate(document.body, '.temp-reading-close', 'click', () => Utils.closeModal('temp-reading-modal'));

        // Save Reading
        Utils.delegate(document.body, '#temp-reading-save', 'click', async () => {
            const data = Utils.getFormData('temp-reading-form');
            if (!data.pointId || data.temperature === null || data.temperature === undefined || isNaN(data.temperature)) {
                Utils.showToast('error', I18n.t('app.error_required') + ' (Punto y Temperatura)');
                return;
            }

            data.userId = Auth.getUserId();
            data.date = data.date ? new Date(data.date).toISOString() : Utils.nowISO();

            try {
                await TrazaDB.create('temperature_readings', data);
                Utils.closeModal('temp-reading-modal');
                Utils.showToast('success', I18n.t('app.success_save'));
                render();
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        // Delete Reading
        Utils.delegate(document.body, '.temp-reading-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('temperature_readings', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        // View Point Detail in Large Modal
        Utils.delegate(document.body, '.temp-point-view', 'click', async function(e) {
            e.stopPropagation();
            const pointId = this.dataset.id;
            openPointDetail(pointId);
        });

        Utils.delegate(document.body, '.temp-detail-close', 'click', () => Utils.closeModal('temp-detail-modal'));

        Utils.delegate(document.body, '#temp-detail-add-btn', 'click', async () => {
            if (selectedPointForDetail) {
                Utils.closeModal('temp-detail-modal');
                await populatePointSelect(selectedPointForDetail.id);
                Utils.clearForm('temp-reading-form');
                document.querySelector('#temp-reading-form [name="pointId"]').value = selectedPointForDetail.id;
                document.querySelector('#temp-reading-form [name="date"]').value = Utils.todayISO();
                document.querySelector('#temp-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
                Utils.openModal('temp-reading-modal');
            }
        });
    }

    // Render Large Detail View of a Point
    async function openPointDetail(pointId) {
        const userId = Auth.getUserId();
        const [point, allReadings] = await Promise.all([
            TrazaDB.read('temperature_points', pointId),
            TrazaDB.getByUser('temperature_readings', userId)
        ]);

        if (!point) return;
        selectedPointForDetail = point;

        const pointReadings = allReadings
            .filter(r => r.pointId === point.id)
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        const titleEl = document.getElementById('temp-detail-title');
        const bodyEl = document.getElementById('temp-detail-body');
        if (titleEl) titleEl.textContent = `Punto de Control: ${point.name}`;

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="grid-2 mb-6">
                    <div class="card card-body" style="background: var(--gray-50);">
                        <h5 class="mb-2">Especificaciones Sanitarias</h5>
                        <p><strong>Tipo:</strong> ${point.type ? I18n.t('temperature.point_types.' + point.type) : 'Estándar'}</p>
                        <p><strong>Rango Permitido:</strong> <span class="badge badge-primary">${point.minTemp}°C a ${point.maxTemp}°C</span></p>
                        <p><strong>Total de Registros:</strong> ${pointReadings.length}</p>
                    </div>
                    <div class="card card-body text-center" style="background: var(--gray-50);">
                        <h5 class="mb-2">Último Estado</h5>
                        ${pointReadings.length > 0 ? `
                            <div style="font-size: 36px; font-weight: 800; color: ${pointReadings[0].temperature >= point.minTemp && pointReadings[0].temperature <= point.maxTemp ? 'var(--success)' : 'var(--danger)'};">
                                ${pointReadings[0].temperature}°C
                            </div>
                            <span class="badge badge-${pointReadings[0].temperature >= point.minTemp && pointReadings[0].temperature <= point.maxTemp ? 'success' : 'danger'} mt-2">
                                ${pointReadings[0].temperature >= point.minTemp && pointReadings[0].temperature <= point.maxTemp ? 'CONFORME' : 'DESVIACIÓN'}
                            </span>
                        ` : '<div class="text-secondary mt-4">Sin lecturas registradas</div>'}
                    </div>
                </div>

                <h4 class="mb-4">Historial de Lecturas para este Punto</h4>
                ${pointReadings.length > 0 ? `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Fecha y Hora</th>
                                    <th>Temperatura</th>
                                    <th>Estado</th>
                                    <th>Responsable</th>
                                    <th>Acción Correctora</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pointReadings.map(r => {
                                    const ok = r.temperature >= point.minTemp && r.temperature <= point.maxTemp;
                                    return `
                                        <tr>
                                            <td>${Utils.formatDateTime(r.date || r.createdAt, I18n.getLang())}</td>
                                            <td><strong style="color: ${ok ? 'var(--success)' : 'var(--danger)'};">${r.temperature}°C</strong></td>
                                            <td><span class="badge badge-${ok ? 'success' : 'danger'}">${ok ? 'En rango' : 'Desviación'}</span></td>
                                            <td>${Utils.sanitize(r.responsible || '-')}</td>
                                            <td>${Utils.sanitize(r.correctiveAction || '-')}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="text-secondary">No hay lecturas registradas para este punto aún.</p>'}
            `;
        }

        Utils.openModal('temp-detail-modal');
    }

    return { init, render };
})();
