/* ============================================================
   TrazaControl — Temperature & Humidity Control Module (Enhanced)
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
                        const tempInRange = latest ? (latest.temperature >= point.minTemp && latest.temperature <= point.maxTemp) : null;
                        const hasHumidity = point.trackHumidity && latest && latest.humidity !== null && latest.humidity !== undefined && latest.humidity !== '';
                        const humInRange = hasHumidity ? (latest.humidity >= point.minHumidity && latest.humidity <= point.maxHumidity) : null;
                        const allOk = tempInRange === null ? null : (humInRange === null ? tempInRange : tempInRange && humInRange);
                        const statusClass = latest ? (allOk ? 'in-range' : 'out-of-range') : 'no-reading';

                        return `
                            <div class="card card-interactive temp-point-card ${statusClass} hover-lift" data-point-id="${point.id}">
                                <div class="card-body">
                                    <div class="flex items-center justify-between mb-3">
                                        <h4 style="font-size: var(--text-lg);">${Utils.sanitize(point.name)}</h4>
                                        <span class="badge badge-${allOk === null ? 'neutral' : allOk ? 'success' : 'danger'} badge-dot">
                                            ${allOk === null ? I18n.t('temperature.no_data') : allOk ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}
                                        </span>
                                    </div>

                                    <div class="temp-current" style="color: ${tempInRange === null ? 'var(--gray-500)' : tempInRange ? 'var(--success)' : 'var(--danger)'}; margin: 8px 0;">
                                        ${latest ? latest.temperature + '°C' : '--'}
                                        ${hasHumidity ? `<span style="margin-left: 12px; color: ${humInRange ? 'var(--success)' : 'var(--danger)'};">💧 ${latest.humidity}%</span>` : ''}
                                    </div>

                                    <div class="temp-range mb-2">
                                        <span class="temp-range-indicator ${tempInRange === null ? 'neutral' : tempInRange ? 'ok' : 'warn'}"></span>
                                        <strong>${I18n.t('temperature.allowed_range')}:</strong> ${point.minTemp}°C ${I18n.t('temperature.range_to')} ${point.maxTemp}°C
                                    </div>

                                    ${point.trackHumidity ? `
                                        <div class="temp-range mb-2">
                                            <span class="temp-range-indicator ${humInRange === null ? 'neutral' : humInRange ? 'ok' : 'warn'}"></span>
                                            <strong>${I18n.t('temperature.humidity_range')}:</strong> ${point.minHumidity}% ${I18n.t('temperature.range_to')} ${point.maxHumidity}%
                                        </div>
                                    ` : ''}

                                    <div class="text-sm text-secondary mb-4">
                                        ${latest ? I18n.t('temperature.last_reading_at') + ' ' + Utils.formatDateTime(latest.date || latest.createdAt, I18n.getLang()) : I18n.t('temperature.no_readings_yet')}
                                    </div>

                                    <div class="flex items-center justify-between pt-2" style="border-top: 1px solid var(--border-light);">
                                        <button class="btn btn-primary btn-sm quick-add-temp-btn" data-point-id="${point.id}" title="${I18n.t('temperature.register_now')}">
                                            ➕ ${I18n.t('temperature.register_short')}
                                        </button>
                                        <div class="flex gap-2">
                                            <button class="btn btn-ghost btn-sm temp-point-view" data-id="${point.id}" title="${I18n.t('temperature.view_full_history')}">
                                                🔍 ${I18n.t('temperature.view_detail')}
                                            </button>
                                            <button class="btn btn-ghost btn-sm temp-point-edit" data-id="${point.id}" title="${I18n.t('app.edit')}">
                                                ✏️
                                            </button>
                                            <button class="btn btn-ghost btn-sm temp-point-delete" data-id="${point.id}" title="${I18n.t('app.delete')}">
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
                                            <th>${I18n.t('temperature.temperature')}</th>
                                            <th>${I18n.t('temperature.humidity')}</th>
                                            <th>${I18n.t('temperature.limits')}</th>
                                            <th>${I18n.t('app.status')}</th>
                                            <th>${I18n.t('app.responsible')}</th>
                                            <th>${I18n.t('temperature.corrective_action')}</th>
                                            <th>${I18n.t('app.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${readings.sort((a,b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).slice(0, 30).map(r => {
                                            const point = points.find(p => p.id === r.pointId);
                                            const tempInRange = point ? (r.temperature >= point.minTemp && r.temperature <= point.maxTemp) : true;
                                            const hasHum = r.humidity !== null && r.humidity !== undefined && r.humidity !== '';
                                            const humInRange = (hasHum && point && point.trackHumidity) ? (r.humidity >= point.minHumidity && r.humidity <= point.maxHumidity) : true;
                                            const allOk = tempInRange && humInRange;
                                            return `
                                                <tr>
                                                    <td>${Utils.formatDateTime(r.date || r.createdAt, I18n.getLang())}</td>
                                                    <td><strong>${point ? Utils.sanitize(point.name) : '-'}</strong></td>
                                                    <td>
                                                        <span style="font-size: 1.15em; font-weight: 800; color: ${tempInRange ? 'var(--success)' : 'var(--danger)'};">
                                                            ${r.temperature}°C
                                                        </span>
                                                    </td>
                                                    <td>
                                                        ${hasHum ? `<span style="font-size: 1.1em; font-weight: 700; color: ${humInRange ? 'var(--success)' : 'var(--danger)'};">💧 ${r.humidity}%</span>` : '<span class="text-secondary">—</span>'}
                                                    </td>
                                                    <td>
                                                        <small class="text-secondary">
                                                            ${point ? point.minTemp + '°C / ' + point.maxTemp + '°C' : '-'}
                                                            ${point && point.trackHumidity ? '<br>' + point.minHumidity + '% / ' + point.maxHumidity + '%' : ''}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span class="badge badge-${allOk ? 'success' : 'danger'} badge-dot">
                                                            ${allOk ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}
                                                        </span>
                                                    </td>
                                                    <td>${Utils.sanitize(r.responsible || '-')}</td>
                                                    <td>${Utils.sanitize(r.correctiveAction || '-')}</td>
                                                    <td>
                                                        <button class="btn btn-ghost btn-sm temp-reading-delete" data-id="${r.id}" title="${I18n.t('app.delete')}">🗑️</button>
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
                        <h3 class="empty-state-title" style="font-size: var(--text-2xl); margin-bottom: 8px;">${I18n.t('temperature.no_points_title')}</h3>
                        <p class="empty-state-desc" style="max-width: 480px; margin-bottom: 24px;">
                            ${I18n.t('temperature.no_points_desc')}
                        </p>
                        <button class="btn btn-primary btn-lg ripple-container" id="temp-add-point-empty">
                            ${App.getIcon('plus')} <span>${I18n.t('temperature.create_first_point')}</span>
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
                                <input type="text" class="form-input" name="name" placeholder="${I18n.t('temperature.point_name_placeholder')}" required>
                                <div class="form-error"></div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.point_type')}</label>
                                <select class="form-select" name="type">
                                    <option value="cold_room">${I18n.t('temperature.point_types.cold_room')} (0°C a 4°C)</option>
                                    <option value="freezer">${I18n.t('temperature.point_types.freezer')} (-22°C a -18°C)</option>
                                    <option value="display_fridge">${I18n.t('temperature.point_types.display_fridge')} (2°C a 6°C)</option>
                                    <option value="workspace">${I18n.t('temperature.point_types.workspace')} (14°C a 18°C)</option>
                                    <option value="storage">${I18n.t('temperature.point_types.storage')}</option>
                                    <option value="transport">${I18n.t('temperature.point_types.transport')}</option>
                                    <option value="production_area">${I18n.t('temperature.point_types.production_area')}</option>
                                    <option value="other">${I18n.t('temperature.point_types.other')}</option>
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

                            <!-- Humidity tracking toggle -->
                            <div class="form-group" style="margin-top: 8px;">
                                <label class="form-label" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" name="trackHumidity" id="temp-point-track-humidity" style="width: 18px; height: 18px; accent-color: var(--primary);">
                                    <span>💧 ${I18n.t('temperature.track_humidity')}</span>
                                </label>
                                <small class="text-secondary">${I18n.t('temperature.track_humidity_desc')}</small>
                            </div>

                            <div class="grid-2" id="temp-humidity-range-fields" style="display: none;">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.min_humidity')} <span class="required">*</span></label>
                                    <input type="number" step="1" class="form-input" name="minHumidity" value="40" min="0" max="100">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.max_humidity')} <span class="required">*</span></label>
                                    <input type="number" step="1" class="form-input" name="maxHumidity" value="70" min="0" max="100">
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

            <!-- Modal: Nuevo Registro de Temperatura y Humedad -->
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
                                    <label class="form-label">🌡️ ${I18n.t('temperature.current_temp')} <span class="required">*</span></label>
                                    <input type="number" step="0.1" class="form-input" name="temperature" id="temp-reading-val" placeholder="${I18n.t('temperature.temp_placeholder')}" required>
                                </div>
                                <div class="form-group" id="temp-reading-humidity-group">
                                    <label class="form-label">💧 ${I18n.t('temperature.humidity_value')}</label>
                                    <input type="number" step="1" class="form-input" name="humidity" id="temp-reading-humidity" placeholder="${I18n.t('temperature.humidity_placeholder')}" min="0" max="100">
                                </div>
                            </div>

                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('temperature.reading_time')}</label>
                                    <input type="time" class="form-input" name="time" id="temp-reading-time" value="${new Date().toTimeString().slice(0,5)}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.responsible')}</label>
                                <input type="text" class="form-input" name="responsible" placeholder="${I18n.t('temperature.responsible_placeholder')}" value="${(Auth.getUser() && Auth.getUser().ownerName) || ''}">
                            </div>

                            <div class="form-group">
                                <label class="form-label">${I18n.t('temperature.corrective_action')} (${I18n.t('temperature.if_deviation')})</label>
                                <textarea class="form-textarea" name="correctiveAction" rows="2" placeholder="${I18n.t('temperature.corrective_placeholder')}"></textarea>
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
                        <h3 id="temp-detail-title">${I18n.t('temperature.point_detail')}</h3>
                        <button class="modal-close temp-detail-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body" id="temp-detail-body"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary temp-detail-close">${I18n.t('app.close')}</button>
                        <button class="btn btn-primary ripple-container" id="temp-detail-add-btn">➕ ${I18n.t('temperature.register_here')}</button>
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
            select.innerHTML = `<option value="">${I18n.t('temperature.no_points_configured')}</option>`;
            return points;
        }

        select.innerHTML = `<option value="">-- ${I18n.t('app.select_option')} --</option>` +
            points.map(p => `
                <option value="${p.id}" data-min="${p.minTemp}" data-max="${p.maxTemp}" data-track-humidity="${p.trackHumidity ? '1' : '0'}" ${p.id === preselectedPointId ? 'selected' : ''}>
                    ${Utils.sanitize(p.name)} (${I18n.t('temperature.range_label')}: ${p.minTemp}°C ${I18n.t('temperature.range_to')} ${p.maxTemp}°C${p.trackHumidity ? ' | 💧' + p.minHumidity + '-' + p.maxHumidity + '%' : ''})
                </option>
            `).join('');

        if (preselectedPointId) {
            select.value = preselectedPointId;
        }

        // Update humidity field visibility based on selected point
        updateHumidityFieldVisibility(select);

        return points;
    }

    // Show/hide the humidity field in the reading form based on selected point
    function updateHumidityFieldVisibility(selectElement) {
        const humidityGroup = document.getElementById('temp-reading-humidity-group');
        if (!humidityGroup || !selectElement) return;

        const selected = selectElement.options[selectElement.selectedIndex];
        if (selected && selected.dataset.trackHumidity === '1') {
            humidityGroup.style.display = '';
            humidityGroup.querySelector('input').removeAttribute('disabled');
        } else {
            // Always show humidity field but mark as optional — some users may still want to record it
            humidityGroup.style.display = '';
            humidityGroup.querySelector('input').removeAttribute('disabled');
        }
    }

    function setupEvents() {
        // Open New Point Modal
        Utils.delegate(document.body, '#temp-add-point-btn, #temp-add-point-empty', 'click', () => {
            editingPointId = null;
            document.getElementById('temp-point-modal-title').textContent = I18n.t('temperature.new_point');
            Utils.clearForm('temp-point-form');
            const humFields = document.getElementById('temp-humidity-range-fields');
            if (humFields) humFields.style.display = 'none';
            Utils.openModal('temp-point-modal');
        });

        // Track humidity checkbox toggle
        Utils.delegate(document.body, '#temp-point-track-humidity', 'change', function() {
            const humFields = document.getElementById('temp-humidity-range-fields');
            if (humFields) {
                humFields.style.display = this.checked ? '' : 'none';
            }
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

            // Handle the trackHumidity checkbox - getFormData may return 'on' or boolean
            data.trackHumidity = !!(data.trackHumidity && data.trackHumidity !== 'false' && data.trackHumidity !== '0');

            if (data.trackHumidity) {
                if (data.minHumidity === null || data.maxHumidity === null || data.minHumidity === '' || data.maxHumidity === '') {
                    Utils.showToast('error', I18n.t('app.error_required') + ' (' + I18n.t('temperature.humidity') + ')');
                    return;
                }
                data.minHumidity = parseFloat(data.minHumidity);
                data.maxHumidity = parseFloat(data.maxHumidity);
            } else {
                data.minHumidity = null;
                data.maxHumidity = null;
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

                // Handle trackHumidity checkbox
                const checkbox = document.getElementById('temp-point-track-humidity');
                if (checkbox) {
                    checkbox.checked = !!point.trackHumidity;
                }
                const humFields = document.getElementById('temp-humidity-range-fields');
                if (humFields) {
                    humFields.style.display = point.trackHumidity ? '' : 'none';
                }

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
                Utils.showToast('warning', I18n.t('temperature.must_create_point_first'));
                Utils.openModal('temp-point-modal');
                return;
            }
            Utils.clearForm('temp-reading-form');
            document.querySelector('#temp-reading-form [name="date"]').value = Utils.todayISO();
            const timeInput = document.getElementById('temp-reading-time');
            if (timeInput) timeInput.value = new Date().toTimeString().slice(0,5);
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
            const timeInput = document.getElementById('temp-reading-time');
            if (timeInput) timeInput.value = new Date().toTimeString().slice(0,5);
            document.querySelector('#temp-reading-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';
            Utils.openModal('temp-reading-modal');
        });

        // Point select change - update info area
        Utils.delegate(document.body, '#temp-reading-point-select', 'change', function() {
            updateHumidityFieldVisibility(this);
            const infoDiv = document.getElementById('temp-reading-point-info');
            const selected = this.options[this.selectedIndex];
            if (infoDiv && selected && selected.value) {
                const trackHum = selected.dataset.trackHumidity === '1';
                infoDiv.innerHTML = trackHum
                    ? `<span style="color: var(--primary);">💧 ${I18n.t('temperature.point_tracks_humidity')}</span>`
                    : '';
            } else if (infoDiv) {
                infoDiv.innerHTML = '';
            }
        });

        // Close Reading Modal
        Utils.delegate(document.body, '.temp-reading-close', 'click', () => Utils.closeModal('temp-reading-modal'));

        // Save Reading
        Utils.delegate(document.body, '#temp-reading-save', 'click', async () => {
            const data = Utils.getFormData('temp-reading-form');
            if (!data.pointId || data.temperature === null || data.temperature === undefined || isNaN(data.temperature)) {
                Utils.showToast('error', I18n.t('app.error_required') + ' (' + I18n.t('temperature.point_and_temp') + ')');
                return;
            }

            // Parse humidity if provided
            if (data.humidity !== null && data.humidity !== undefined && data.humidity !== '') {
                data.humidity = parseFloat(data.humidity);
            } else {
                data.humidity = null;
            }

            // Combine date and time to accurately preserve multiple readings per day
            const timeVal = data.time || new Date().toTimeString().slice(0, 5);
            data.time = timeVal;
            if (data.date && timeVal) {
                const combined = new Date(`${data.date}T${timeVal}`);
                data.date = !isNaN(combined.getTime()) ? combined.toISOString() : new Date(data.date).toISOString();
            } else if (data.date) {
                data.date = new Date(data.date).toISOString();
            } else {
                data.date = Utils.nowISO();
            }

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
                const timeInput = document.getElementById('temp-reading-time');
                if (timeInput) timeInput.value = new Date().toTimeString().slice(0,5);
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
        if (titleEl) titleEl.textContent = `${I18n.t('temperature.point_detail')}: ${point.name}`;

        if (bodyEl) {
            const latestReading = pointReadings[0];
            const latestTempOk = latestReading ? (latestReading.temperature >= point.minTemp && latestReading.temperature <= point.maxTemp) : null;
            const latestHasHum = latestReading && latestReading.humidity !== null && latestReading.humidity !== undefined && latestReading.humidity !== '';
            const latestHumOk = latestHasHum && point.trackHumidity ? (latestReading.humidity >= point.minHumidity && latestReading.humidity <= point.maxHumidity) : null;

            bodyEl.innerHTML = `
                <div class="grid-2 mb-6">
                    <div class="card card-body" style="background: var(--gray-50);">
                        <h5 class="mb-2">${I18n.t('temperature.sanitary_specs')}</h5>
                        <p><strong>${I18n.t('temperature.point_type')}:</strong> ${point.type ? I18n.t('temperature.point_types.' + point.type) : I18n.t('temperature.point_types.other')}</p>
                        <p><strong>${I18n.t('temperature.allowed_range')}:</strong> <span class="badge badge-primary">${point.minTemp}°C ${I18n.t('temperature.range_to')} ${point.maxTemp}°C</span></p>
                        ${point.trackHumidity ? `<p><strong>${I18n.t('temperature.humidity_range')}:</strong> <span class="badge badge-info">${point.minHumidity}% ${I18n.t('temperature.range_to')} ${point.maxHumidity}%</span></p>` : ''}
                        <p><strong>${I18n.t('temperature.total_readings')}:</strong> ${pointReadings.length}</p>
                    </div>
                    <div class="card card-body text-center" style="background: var(--gray-50);">
                        <h5 class="mb-2">${I18n.t('temperature.last_status')}</h5>
                        ${pointReadings.length > 0 ? `
                            <div style="font-size: 36px; font-weight: 800; color: ${latestTempOk ? 'var(--success)' : 'var(--danger)'};">
                                ${latestReading.temperature}°C
                            </div>
                            ${latestHasHum ? `
                                <div style="font-size: 24px; font-weight: 700; color: ${latestHumOk ? 'var(--success)' : 'var(--danger)'}; margin-top: 4px;">
                                    💧 ${latestReading.humidity}%
                                </div>
                            ` : ''}
                            <span class="badge badge-${latestTempOk && (latestHumOk !== false) ? 'success' : 'danger'} mt-2">
                                ${latestTempOk && (latestHumOk !== false) ? I18n.t('temperature.conforming') : I18n.t('temperature.deviation')}
                            </span>
                        ` : `<div class="text-secondary mt-4">${I18n.t('temperature.no_readings_registered')}</div>`}
                    </div>
                </div>

                <h4 class="mb-4">${I18n.t('temperature.history_for_point')}</h4>
                ${pointReadings.length > 0 ? `
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>${I18n.t('temperature.date_time')}</th>
                                    <th>${I18n.t('temperature.temperature')}</th>
                                    ${point.trackHumidity ? `<th>${I18n.t('temperature.humidity')}</th>` : ''}
                                    <th>${I18n.t('app.status')}</th>
                                    <th>${I18n.t('app.responsible')}</th>
                                    <th>${I18n.t('temperature.corrective_action')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pointReadings.map(r => {
                                    const tempOk = r.temperature >= point.minTemp && r.temperature <= point.maxTemp;
                                    const rHasHum = r.humidity !== null && r.humidity !== undefined && r.humidity !== '';
                                    const rHumOk = rHasHum && point.trackHumidity ? (r.humidity >= point.minHumidity && r.humidity <= point.maxHumidity) : true;
                                    const allOk = tempOk && rHumOk;
                                    return `
                                        <tr>
                                            <td>${Utils.formatDateTime(r.date || r.createdAt, I18n.getLang())}</td>
                                            <td><strong style="color: ${tempOk ? 'var(--success)' : 'var(--danger)'};">${r.temperature}°C</strong></td>
                                            ${point.trackHumidity ? `<td>${rHasHum ? `<strong style="color: ${rHumOk ? 'var(--success)' : 'var(--danger)'};">💧 ${r.humidity}%</strong>` : '—'}</td>` : ''}
                                            <td><span class="badge badge-${allOk ? 'success' : 'danger'}">${allOk ? I18n.t('temperature.in_range') : I18n.t('temperature.deviation')}</span></td>
                                            <td>${Utils.sanitize(r.responsible || '-')}</td>
                                            <td>${Utils.sanitize(r.correctiveAction || '-')}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `<p class="text-secondary">${I18n.t('temperature.no_readings_for_point')}</p>`}
            `;
        }

        Utils.openModal('temp-detail-modal');
    }

    return { init, render };
})();
