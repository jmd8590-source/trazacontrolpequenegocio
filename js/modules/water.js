/* TrazaControl — Water Measurements Module */
const WaterModule = (function() {
    'use strict';
    function init() { App.registerModule('water', { render }); }
    async function render() {
        const container = document.getElementById('module-water'); if (!container) return;
        const userId = Auth.getUserId();
        const [points, readings] = await Promise.all([TrazaDB.getByUser('water_points', userId), TrazaDB.getByUser('water_readings', userId)]);
        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('water.title')}</h2></div>
            <div class="toolbar"><div class="toolbar-left"><button class="btn btn-secondary" id="water-add-point">${App.getIcon('plus')} ${I18n.t('water.new_point')}</button></div>
            <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="water-add-reading">${App.getIcon('plus')} ${I18n.t('water.new_reading')}</button></div></div>
            ${points.length > 0 ? `<div class="grid-auto mb-8 stagger-grid">${points.map(p => {
                const pr = readings.filter(r => r.pointId === p.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                const last = pr[0];
                const chlorineOk = last ? (last.chlorine >= 0.2 && last.chlorine <= 1.0) : null;
                return `<div class="card hover-lift"><div class="card-body text-center">
                    <h4 class="mb-2">${Utils.sanitize(p.name)}</h4>
                    <p class="text-xs text-secondary mb-4">${Utils.sanitize(p.location || '')}</p>
                    <div class="water-gauge-circle ${chlorineOk === null ? '' : chlorineOk ? 'ok' : 'warn'}" style="margin:0 auto;">
                        ${last ? last.chlorine + '' : '--'}
                    </div>
                    <div class="water-gauge-label">${I18n.t('water.residual_chlorine')}</div>
                    ${last ? `<span class="badge badge-${chlorineOk ? 'success' : 'danger'} mt-2">${chlorineOk ? I18n.t('water.in_range') : I18n.t('water.out_of_range')}</span>` : ''}
                    <div class="flex gap-2 mt-4 justify-center"><button class="btn btn-ghost btn-sm water-point-delete" data-id="${p.id}">🗑️</button></div>
                </div></div>`;
            }).join('')}</div>` : ''}
            <div class="card"><div class="card-header"><h4>${I18n.t('water.history')}</h4></div><div class="card-body">
                ${readings.length > 0 ? `<div class="table-container"><table class="table"><thead><tr><th>${I18n.t('app.date')}</th><th>${I18n.t('water.sampling_point')}</th><th>${I18n.t('water.residual_chlorine')}</th><th>pH</th><th>${I18n.t('app.status')}</th><th>${I18n.t('app.responsible')}</th><th>${I18n.t('app.actions')}</th></tr></thead><tbody>
                    ${readings.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map(r=>{const p=points.find(p=>p.id===r.pointId);const ok=r.chlorine>=0.2&&r.chlorine<=1.0;return`<tr><td>${Utils.formatDate(r.date,I18n.getLang())}</td><td>${p?Utils.sanitize(p.name):'-'}</td><td><strong style="color:${ok?'var(--success)':'var(--danger)'}">${r.chlorine} mg/L</strong></td><td>${r.ph||'-'}</td><td><span class="badge badge-${ok?'success':'danger'}">${ok?I18n.t('water.in_range'):I18n.t('water.out_of_range')}</span></td><td>${Utils.sanitize(r.responsible||'-')}</td><td><button class="btn btn-ghost btn-sm water-reading-delete" data-id="${r.id}">🗑️</button></td></tr>`;}).join('')}
                </tbody></table></div>` : `<div class="empty-state" style="padding:24px;"><div class="text-sm text-secondary">${I18n.t('app.no_data')}</div></div>`}
            </div></div>
            <div id="water-point-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('water.new_point')}</h3><button class="modal-close wp-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="water-point-form">
                <div class="form-group"><label class="form-label">${I18n.t('water.point_name')} *</label><input type="text" class="form-input" name="name" required></div>
                <div class="form-group"><label class="form-label">${I18n.t('water.point_location')}</label><input type="text" class="form-input" name="location"></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary wp-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="water-point-save">${I18n.t('app.save')}</button></div></div></div>
            <div id="water-reading-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('water.new_reading')}</h3><button class="modal-close wr-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="water-reading-form">
                <div class="form-group"><label class="form-label">${I18n.t('water.sampling_point')} *</label><select class="form-select" name="pointId" required><option value="">${I18n.t('app.select_option')}</option>${points.map(p=>`<option value="${p.id}">${Utils.sanitize(p.name)}</option>`).join('')}</select></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('water.residual_chlorine')} *</label><input type="number" step="0.01" class="form-input" name="chlorine" required></div>
                <div class="form-group"><label class="form-label">${I18n.t('water.ph_level')}</label><input type="number" step="0.1" class="form-input" name="ph"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('app.date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.responsible')}</label><input type="text" class="form-input" name="responsible"></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('water.corrective_action')}</label><textarea class="form-textarea" name="correctiveAction" rows="2"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary wr-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="water-reading-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        Utils.delegate(document.body,'#water-add-point','click',()=>{Utils.clearForm('water-point-form');Utils.openModal('water-point-modal');});
        Utils.delegate(document.body,'.wp-close','click',()=>Utils.closeModal('water-point-modal'));
        Utils.delegate(document.body,'#water-point-save','click',async()=>{const d=Utils.getFormData('water-point-form');if(!d.name){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();await TrazaDB.create('water_points',d);Utils.closeModal('water-point-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.water-point-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('water_points',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        Utils.delegate(document.body,'#water-add-reading','click',()=>{Utils.clearForm('water-reading-form');Utils.openModal('water-reading-modal');});
        Utils.delegate(document.body,'.wr-close','click',()=>Utils.closeModal('water-reading-modal'));
        Utils.delegate(document.body,'#water-reading-save','click',async()=>{const d=Utils.getFormData('water-reading-form');if(!d.pointId||d.chlorine===null){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();await TrazaDB.create('water_readings',d);Utils.closeModal('water-reading-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.water-reading-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('water_readings',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
    }
    return { init, render };
})();
