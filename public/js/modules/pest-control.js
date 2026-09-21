/* ============================================================
   TrazaControl — Pest Control Module
   ============================================================ */
const PestControlModule = (function() {
    'use strict';
    function init() { App.registerModule('pest_control', { render }); }

    async function render() {
        const container = document.getElementById('module-pest_control');
        if (!container) return;
        const userId = Auth.getUserId();
        const [inspections, points, companies] = await Promise.all([
            TrazaDB.getByUser('pest_inspections', userId),
            TrazaDB.getByUser('pest_points', userId),
            TrazaDB.getByUser('pest_company', userId)
        ]);
        const company = companies[0] || null;

        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('pest_control.title')}</h2></div>

            <!-- Company Info -->
            <div class="card mb-6 ${company ? 'pest-company-card' : ''}">
                ${company ? `
                    <div class="pest-company-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                    <div>
                        <h4>${Utils.sanitize(company.name)}</h4>
                        <p class="text-sm text-secondary">${Utils.sanitize(company.phone || '')} ${company.email ? '| ' + Utils.sanitize(company.email) : ''}</p>
                        <p class="text-sm">${I18n.t('pest_control.contract_number')}: ${Utils.sanitize(company.contractNumber || '-')} | ${I18n.t('pest_control.contract_expiry')}: ${Utils.formatDate(company.contractExpiry, I18n.getLang())}</p>
                    </div>
                    <button class="btn btn-ghost btn-sm ml-auto" id="pest-edit-company">✏️</button>
                ` : `
                    <div class="card-body text-center">
                        <p class="text-secondary mb-4">${I18n.t('pest_control.company')}</p>
                        <button class="btn btn-primary" id="pest-add-company">${App.getIcon('plus')} ${I18n.t('app.add')}</button>
                    </div>
                `}
            </div>

            <div class="toolbar">
                <div class="toolbar-left"><button class="btn btn-secondary" id="pest-add-point-btn">${App.getIcon('plus')} ${I18n.t('pest_control.new_control_point')}</button></div>
                <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="pest-add-inspection-btn">${App.getIcon('plus')} ${I18n.t('pest_control.new_inspection')}</button></div>
            </div>

            ${points.length > 0 ? `
                <div class="module-section-title mb-4">${I18n.t('pest_control.control_points')} (${points.length})</div>
                <div class="grid-auto mb-8">
                    ${points.map(p => `
                        <div class="card card-body hover-lift">
                            <div class="flex items-center justify-between">
                                <div>
                                    <strong>${Utils.sanitize(p.name || p.code)}</strong>
                                    <p class="text-sm text-secondary">${p.type ? I18n.t('pest_control.point_types.'+p.type) : ''} ${p.location ? '— '+Utils.sanitize(p.location) : ''}</p>
                                </div>
                                <button class="btn btn-ghost btn-sm pest-point-delete" data-id="${p.id}">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="card">
                <div class="card-header"><h4>${I18n.t('pest_control.title')} — ${I18n.t('temperature.history')}</h4></div>
                <div class="card-body">
                    ${inspections.length > 0 ? `
                        <div class="table-container"><table class="table"><thead><tr>
                            <th>${I18n.t('app.date')}</th><th>${I18n.t('pest_control.inspector')}</th><th>${I18n.t('pest_control.findings')}</th><th>${I18n.t('pest_control.severity')}</th><th>${I18n.t('app.actions')}</th>
                        </tr></thead><tbody>
                            ${inspections.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(ins => `<tr>
                                <td>${Utils.formatDate(ins.date, I18n.getLang())}</td>
                                <td>${Utils.sanitize(ins.inspector||'-')}</td>
                                <td>${Utils.sanitize(ins.findings||I18n.t('pest_control.no_findings'))}</td>
                                <td><span class="severity-indicator ${ins.severity||'none'}">${I18n.t('pest_control.severity_levels.'+(ins.severity||'none'))}</span></td>
                                <td><button class="btn btn-ghost btn-sm pest-insp-delete" data-id="${ins.id}">🗑️</button></td>
                            </tr>`).join('')}
                        </tbody></table></div>
                    ` : `<div class="empty-state" style="padding:24px;"><div class="text-sm text-secondary">${I18n.t('app.no_data')}</div></div>`}
                </div>
            </div>

            <!-- Company Modal -->
            <div id="pest-company-modal" class="modal-overlay hidden"><div class="modal">
                <div class="modal-header"><h3>${I18n.t('pest_control.company')}</h3><button class="modal-close pest-company-close">${App.getIcon('close')}</button></div>
                <div class="modal-body"><form id="pest-company-form">
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.company_name')}</label><input type="text" class="form-input" name="name"></div>
                    <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('pest_control.company_phone')}</label><input type="tel" class="form-input" name="phone"></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.company_email')}</label><input type="email" class="form-input" name="email"></div></div>
                    <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('pest_control.contract_number')}</label><input type="text" class="form-input" name="contractNumber"></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.contract_expiry')}</label><input type="date" class="form-input" name="contractExpiry"></div></div>
                </form></div>
                <div class="modal-footer"><button class="btn btn-secondary pest-company-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="pest-company-save">${I18n.t('app.save')}</button></div>
            </div></div>

            <!-- Point Modal -->
            <div id="pest-point-modal" class="modal-overlay hidden"><div class="modal">
                <div class="modal-header"><h3>${I18n.t('pest_control.new_control_point')}</h3><button class="modal-close pest-point-close">${App.getIcon('close')}</button></div>
                <div class="modal-body"><form id="pest-point-form">
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.point_code')}</label><input type="text" class="form-input" name="code"></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.point_type')}</label><select class="form-select" name="type"><option value="">${I18n.t('app.select_option')}</option>
                        ${['bait_station','trap','insect_trap','pheromone','other'].map(t=>`<option value="${t}">${I18n.t('pest_control.point_types.'+t)}</option>`).join('')}</select></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.point_location')}</label><input type="text" class="form-input" name="location"></div>
                </form></div>
                <div class="modal-footer"><button class="btn btn-secondary pest-point-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="pest-point-save">${I18n.t('app.save')}</button></div>
            </div></div>

            <!-- Inspection Modal -->
            <div id="pest-insp-modal" class="modal-overlay hidden"><div class="modal">
                <div class="modal-header"><h3>${I18n.t('pest_control.new_inspection')}</h3><button class="modal-close pest-insp-close">${App.getIcon('close')}</button></div>
                <div class="modal-body"><form id="pest-insp-form">
                    <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('pest_control.inspection_date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.inspector')}</label><input type="text" class="form-input" name="inspector"></div></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.findings')}</label><textarea class="form-textarea" name="findings" rows="3"></textarea></div>
                    <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('pest_control.severity')}</label><select class="form-select" name="severity">
                        ${['none','low','medium','high','critical'].map(s=>`<option value="${s}">${I18n.t('pest_control.severity_levels.'+s)}</option>`).join('')}</select></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.treatment_applied')}</label><input type="text" class="form-input" name="treatment"></div></div>
                    <div class="form-group"><label class="form-label">${I18n.t('pest_control.next_inspection')}</label><input type="date" class="form-input" name="nextInspection"></div>
                </form></div>
                <div class="modal-footer"><button class="btn btn-secondary pest-insp-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="pest-insp-save">${I18n.t('app.save')}</button></div>
            </div></div>
        `;
        setupEvents(company);
    }

    function setupEvents(company) {
        Utils.delegate(document.body, '#pest-add-company, #pest-edit-company', 'click', () => { if(company) Utils.setFormData('pest-company-form', company); Utils.openModal('pest-company-modal'); });
        Utils.delegate(document.body, '.pest-company-close', 'click', () => Utils.closeModal('pest-company-modal'));
        Utils.delegate(document.body, '#pest-company-save', 'click', async () => {
            const data = Utils.getFormData('pest-company-form'); data.userId = Auth.getUserId();
            if(company) { data.id = company.id; await TrazaDB.update('pest_company', data); } else { await TrazaDB.create('pest_company', data); }
            Utils.closeModal('pest-company-modal'); Utils.showToast('success', I18n.t('app.success_save')); render();
        });
        Utils.delegate(document.body, '#pest-add-point-btn', 'click', () => { Utils.clearForm('pest-point-form'); Utils.openModal('pest-point-modal'); });
        Utils.delegate(document.body, '.pest-point-close', 'click', () => Utils.closeModal('pest-point-modal'));
        Utils.delegate(document.body, '#pest-point-save', 'click', async () => {
            const data = Utils.getFormData('pest-point-form'); data.userId = Auth.getUserId(); data.name = data.code || data.type || 'Punto';
            await TrazaDB.create('pest_points', data); Utils.closeModal('pest-point-modal'); Utils.showToast('success', I18n.t('app.success_save')); render();
        });
        Utils.delegate(document.body, '.pest-point-delete', 'click', function() { const id=this.dataset.id; Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('pest_points',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n)); });
        Utils.delegate(document.body, '#pest-add-inspection-btn', 'click', () => { Utils.clearForm('pest-insp-form'); Utils.openModal('pest-insp-modal'); });
        Utils.delegate(document.body, '.pest-insp-close', 'click', () => Utils.closeModal('pest-insp-modal'));
        Utils.delegate(document.body, '#pest-insp-save', 'click', async () => {
            const data = Utils.getFormData('pest-insp-form'); data.userId = Auth.getUserId();
            await TrazaDB.create('pest_inspections', data); Utils.closeModal('pest-insp-modal'); Utils.showToast('success', I18n.t('app.success_save')); render();
        });
        Utils.delegate(document.body, '.pest-insp-delete', 'click', function() { const id=this.dataset.id; Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('pest_inspections',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n)); });
    }

    return { init, render };
})();
