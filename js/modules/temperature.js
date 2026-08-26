/* ============================================================
   TrazaControl — Temperature Control Module
   ============================================================ */
const TemperatureModule = (function() {
    'use strict';
    let editingId = null;
    let editingPointId = null;

    function init() { App.registerModule('temperature', { render }); }

    async function render() {
        const container = document.getElementById('module-temperature');
        if (!container) return;
        const userId = Auth.getUserId();
        const [points, readings] = await Promise.all([
            TrazaDB.getByUser('temperature_points', userId),
            TrazaDB.getByUser('temperature_readings', userId)
        ]);

        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('temperature.title')}</h2></div>
            <div class="toolbar">
                <div class="toolbar-left">
                    <button class="btn btn-secondary" id="temp-add-point-btn">${App.getIcon('plus')} ${I18n.t('temperature.new_point')}</button>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="temp-add-reading-btn">${App.getIcon('plus')} ${I18n.t('temperature.new_reading')}</button>
                </div>
            </div>

            ${points.length > 0 ? `
                <div class="temp-points-grid stagger-grid">
                    ${points.map(point => {
                        const pointReadings = readings.filter(r => r.pointId === point.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                        const latest = pointReadings[0];
                        const inRange = latest ? (latest.temperature >= point.minTemp && latest.temperature <= point.maxTemp) : null;
                        const statusClass = latest ? (inRange ? 'in-range' : 'out-of-range') : 'no-reading';
                        return `
                        <div class="card card-interactive temp-point-card ${statusClass} hover-lift" data-point-id="${point.id}">
                            <div class="card-body">
                                <div class="flex items-center justify-between mb-4">
                                    <h4>${Utils.sanitize(point.name)}</h4>
                                    <span class="badge badge-${inRange === null ? 'neutral' : inRange ? 'success' : 'danger'} badge-dot">
                                        ${inRange === null ? '-' : inRange ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}
                                    </span>
                                </div>
                                <div class="temp-current" style="color: ${inRange === null ? 'var(--gray-400)' : inRange ? 'var(--success)' : 'var(--danger)'}">
                                    ${latest ? latest.temperature + '°C' : '--'}
                                </div>
                                <div class="temp-range">
                                    <span class="temp-range-indicator ${inRange === null ? 'neutral' : inRange ? 'ok' : 'warn'}"></span>
                                    <span>${I18n.t('temperature.min_temp').replace(' (°C)','')}:${point.minTemp}°C / ${I18n.t('temperature.max_temp').replace(' (°C)','')}:${point.maxTemp}°C</span>
                                </div>
                                <small class="text-secondary">${latest ? Utils.formatDateTime(latest.date, I18n.getLang()) : I18n.t('app.no_data')}</small>
                                <div class="flex gap-2 mt-4">
                                    <button class="btn btn-ghost btn-sm temp-point-edit" data-id="${point.id}">✏️</button>
                                    <button class="btn btn-ghost btn-sm temp-point-delete" data-id="${point.id}">🗑️</button>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <div class="card mt-8">
                    <div class="card-header"><h4>${I18n.t('temperature.history')}</h4></div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="table">
                                <thead><tr>
                                    <th>${I18n.t('app.date')}</th>
                                    <th>${I18n.t('temperature.control_point')}</th>
                                    <th>°C</th>
                                    <th>${I18n.t('app.status')}</th>
                                    <th>${I18n.t('app.responsible')}</th>
                                    <th>${I18n.t('app.actions')}</th>
                                </tr></thead>
                                <tbody>
                                    ${readings.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(r => {
                                        const point = points.find(p => p.id === r.pointId);
                                        const inRange = point ? (r.temperature >= point.minTemp && r.temperature <= point.maxTemp) : true;
                                        return `<tr>
                                            <td>${Utils.formatDateTime(r.date, I18n.getLang())}</td>
                                            <td>${point ? Utils.sanitize(point.name) : '-'}</td>
                                            <td><strong style="color:${inRange ? 'var(--success)' : 'var(--danger)'}">${r.temperature}°C</strong></td>
                                            <td><span class="badge badge-${inRange ? 'success' : 'danger'}">${inRange ? I18n.t('temperature.in_range') : I18n.t('temperature.out_of_range')}</span></td>
                                            <td>${Utils.sanitize(r.responsible || '-')}</td>
                                            <td><button class="btn btn-ghost btn-sm temp-reading-delete" data-id="${r.id}">🗑️</button></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="card"><div class="empty-state">
                    <div class="empty-state-icon">${App.getIcon('temperature')}</div>
                    <div class="empty-state-title">${I18n.t('app.no_data')}</div>
                    <div class="empty-state-desc">${I18n.t('temperature.title')}</div>
                    <button class="btn btn-primary" id="temp-add-point-empty">${I18n.t('temperature.new_point')}</button>
                </div></div>
            `}

            <!-- Point Modal -->
            <div id="temp-point-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header"><h3 id="temp-point-modal-title">${I18n.t('temperature.new_point')}</h3><button class="modal-close temp-modal-close">${App.getIcon('close')}</button></div>
                    <div class="modal-body"><form id="temp-point-form">
                        <div class="form-group"><label class="form-label">${I18n.t('temperature.point_name')} <span class="required">*</span></label><input type="text" class="form-input" name="name" required><div class="form-error"></div></div>
                        <div class="form-group"><label class="form-label">${I18n.t('temperature.point_type')}</label><select class="form-select" name="type">
                            <option value="">${I18n.t('app.select_option')}</option>
                            ${['cold_room','freezer','display_fridge','workspace','storage','transport','other'].map(t => `<option value="${t}">${I18n.t('temperature.point_types.'+t)}</option>`).join('')}
                        </select></div>
                        <div class="grid-2">
                            <div class="form-group"><label class="form-label">${I18n.t('temperature.min_temp')} <span class="required">*</span></label><input type="number" step="0.1" class="form-input" name="minTemp" required><div class="form-error"></div></div>
                            <div class="form-group"><label class="form-label">${I18n.t('temperature.max_temp')} <span class="required">*</span></label><input type="number" step="0.1" class="form-input" name="maxTemp" required><div class="form-error"></div></div>
                        </div>
                    </form></div>
                    <div class="modal-footer"><button class="btn btn-secondary temp-modal-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="temp-point-save">${I18n.t('app.save')}</button></div>
                </div>
            </div>

            <!-- Reading Modal -->
            <div id="temp-reading-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header"><h3>${I18n.t('temperature.new_reading')}</h3><button class="modal-close temp-reading-modal-close">${App.getIcon('close')}</button></div>
                    <div class="modal-body"><form id="temp-reading-form">
                        <div class="form-group"><label class="form-label">${I18n.t('temperature.control_point')} <span class="required">*</span></label><select class="form-select" name="pointId" id="temp-reading-point" required>
                            <option value="">${I18n.t('app.select_option')}</option>
                            ${points.map(p => `<option value="${p.id}">${Utils.sanitize(p.name)}</option>`).join('')}
                        </select><div class="form-error"></div></div>
                        <div class="grid-2">
                            <div class="form-group"><label class="form-label">${I18n.t('temperature.current_temp')} <span class="required">*</span></label><input type="number" step="0.1" class="form-input" name="temperature" required><div class="form-error"></div></div>
                            <div class="form-group"><label class="form-label">${I18n.t('app.date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                        </div>
                        <div class="form-group"><label class="form-label">${I18n.t('app.responsible')}</label><input type="text" class="form-input" name="responsible"></div>
                        <div class="form-group"><label class="form-label">${I18n.t('temperature.corrective_action')}</label><textarea class="form-textarea" name="correctiveAction" rows="2"></textarea></div>
                    </form></div>
                    <div class="modal-footer"><button class="btn btn-secondary temp-reading-modal-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="temp-reading-save">${I18n.t('app.save')}</button></div>
                </div>
            </div>
        `;

        setupEvents(points);
    }

    function setupEvents(points) {
        Utils.delegate(document.body, '#temp-add-point-btn, #temp-add-point-empty', 'click', () => { editingPointId = null; Utils.clearForm('temp-point-form'); Utils.openModal('temp-point-modal'); });
        Utils.delegate(document.body, '#temp-add-reading-btn', 'click', () => { Utils.clearForm('temp-reading-form'); document.querySelector('[name="date"]')&&(document.getElementById('temp-reading-form').querySelector('[name="date"]').value=Utils.todayISO()); Utils.openModal('temp-reading-modal'); });
        Utils.delegate(document.body, '.temp-modal-close', 'click', () => Utils.closeModal('temp-point-modal'));
        Utils.delegate(document.body, '.temp-reading-modal-close', 'click', () => Utils.closeModal('temp-reading-modal'));
        Utils.delegate(document.body, '#temp-point-save', 'click', savePoint);
        Utils.delegate(document.body, '#temp-reading-save', 'click', saveReading);
        Utils.delegate(document.body, '.temp-point-edit', 'click', async function() {
            const point = await TrazaDB.read('temperature_points', this.dataset.id);
            if (point) { editingPointId = point.id; Utils.setFormData('temp-point-form', point); Utils.openModal('temp-point-modal'); }
        });
        Utils.delegate(document.body, '.temp-point-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(I18n.t('app.confirm_delete'), I18n.t('app.confirm_delete_desc'), async () => { await TrazaDB.remove('temperature_points', id); Utils.showToast('success', I18n.t('app.success_delete')); render(); }, I18n.t.bind(I18n));
        });
        Utils.delegate(document.body, '.temp-reading-delete', 'click', function() {
            const id = this.dataset.id;
            Utils.showConfirm(I18n.t('app.confirm_delete'), I18n.t('app.confirm_delete_desc'), async () => { await TrazaDB.remove('temperature_readings', id); Utils.showToast('success', I18n.t('app.success_delete')); render(); }, I18n.t.bind(I18n));
        });
    }

    async function savePoint() {
        const data = Utils.getFormData('temp-point-form');
        if (!data.name || data.minTemp === null || data.maxTemp === null) { Utils.showToast('error', I18n.t('app.error_required')); return; }
        data.userId = Auth.getUserId();
        if (editingPointId) { data.id = editingPointId; await TrazaDB.update('temperature_points', data); } else { await TrazaDB.create('temperature_points', data); }
        Utils.closeModal('temp-point-modal'); Utils.showToast('success', I18n.t('app.success_save')); render();
    }

    async function saveReading() {
        const data = Utils.getFormData('temp-reading-form');
        if (!data.pointId || data.temperature === null) { Utils.showToast('error', I18n.t('app.error_required')); return; }
        data.userId = Auth.getUserId();
        data.date = data.date || Utils.todayISO();
        await TrazaDB.create('temperature_readings', data);
        Utils.closeModal('temp-reading-modal'); Utils.showToast('success', I18n.t('app.success_save')); render();
    }

    return { init, render };
})();
