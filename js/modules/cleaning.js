/* ============================================================
   TrazaControl — Cleaning Module
   ============================================================ */
const CleaningModule = (function() {
    'use strict';
    function init() { App.registerModule('cleaning', { render }); }
    async function render() {
        const container = document.getElementById('module-cleaning'); if (!container) return;
        const userId = Auth.getUserId();
        const [zones, logs, products] = await Promise.all([TrazaDB.getByUser('cleaning_zones', userId), TrazaDB.getByUser('cleaning_logs', userId), TrazaDB.getByUser('cleaning_products', userId)]);

        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('cleaning.title')}</h2></div>
            <div class="toolbar">
                <div class="toolbar-left"><button class="btn btn-secondary" id="clean-add-zone">${App.getIcon('plus')} ${I18n.t('cleaning.new_zone')}</button></div>
                <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="clean-add-log">${App.getIcon('plus')} ${I18n.t('cleaning.new_log')}</button></div>
            </div>
            ${zones.length > 0 ? `<div class="cleaning-schedule-grid stagger-grid mb-8">${zones.map(z => {
                const zoneLogs = logs.filter(l => l.zoneId === z.id).sort((a,b) => new Date(b.date) - new Date(a.date));
                const lastLog = zoneLogs[0];
                const status = lastLog ? (lastLog.conformity === 'non_conform' ? 'non_conform' : 'conform') : 'pending';
                return `<div class="card cleaning-zone-card hover-lift"><div class="card-body">
                    <div class="cleaning-zone-status"><span class="badge badge-${status==='conform'?'success':status==='non_conform'?'danger':'neutral'} badge-dot">${status==='conform'?I18n.t('cleaning.conform'):status==='non_conform'?I18n.t('cleaning.non_conform'):I18n.t('app.pending')}</span></div>
                    <h4>${Utils.sanitize(z.name)}</h4>
                    <p class="text-sm text-secondary">${I18n.t('cleaning.frequency')}: ${z.frequency?I18n.t('cleaning.frequencies.'+z.frequency):'-'}</p>
                    <p class="text-sm text-secondary">${I18n.t('cleaning.product_used')}: ${Utils.sanitize(z.product||'-')}</p>
                    <small class="text-secondary">${lastLog?Utils.formatDateTime(lastLog.date,I18n.getLang()):I18n.t('app.no_data')}</small>
                    <div class="flex gap-2 mt-4"><button class="btn btn-ghost btn-sm clean-zone-edit" data-id="${z.id}">✏️</button><button class="btn btn-ghost btn-sm clean-zone-delete" data-id="${z.id}">🗑️</button></div>
                </div></div>`;
            }).join('')}</div>` : ''}
            <div class="card"><div class="card-header"><h4>${I18n.t('temperature.history')}</h4></div><div class="card-body">
                ${logs.length > 0 ? `<div class="table-container"><table class="table"><thead><tr><th>${I18n.t('app.date')}</th><th>${I18n.t('cleaning.zone_name')}</th><th>${I18n.t('cleaning.cleaned_by')}</th><th>${I18n.t('cleaning.product_used')}</th><th>${I18n.t('cleaning.conformity')}</th><th>${I18n.t('app.actions')}</th></tr></thead><tbody>
                    ${logs.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,20).map(l=>{const z=zones.find(z=>z.id===l.zoneId);return`<tr><td>${Utils.formatDateTime(l.date,I18n.getLang())}</td><td>${z?Utils.sanitize(z.name):Utils.sanitize(l.zoneName||'-')}</td><td>${Utils.sanitize(l.cleanedBy||'-')}</td><td>${Utils.sanitize(l.product||'-')}</td><td><span class="badge badge-${l.conformity==='non_conform'?'danger':'success'}">${l.conformity==='non_conform'?I18n.t('cleaning.non_conform'):I18n.t('cleaning.conform')}</span></td><td><button class="btn btn-ghost btn-sm clean-log-delete" data-id="${l.id}">🗑️</button></td></tr>`;}).join('')}
                </tbody></table></div>` : `<div class="empty-state" style="padding:24px;"><div class="text-sm text-secondary">${I18n.t('app.no_data')}</div></div>`}
            </div></div>

            <div id="clean-zone-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('cleaning.new_zone')}</h3><button class="modal-close clean-z-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="clean-zone-form">
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.zone_name')} <span class="required">*</span></label><input type="text" class="form-input" name="name" required></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.frequency')}</label><select class="form-select" name="frequency">${['daily','weekly','biweekly','monthly','quarterly','annual','after_use'].map(f=>`<option value="${f}">${I18n.t('cleaning.frequencies.'+f)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.product_used')}</label><input type="text" class="form-input" name="product"></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.method')}</label><textarea class="form-textarea" name="method" rows="2"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary clean-z-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="clean-zone-save">${I18n.t('app.save')}</button></div></div></div>

            <div id="clean-log-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('cleaning.new_log')}</h3><button class="modal-close clean-l-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="clean-log-form">
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.zone_name')} <span class="required">*</span></label><select class="form-select" name="zoneId" required><option value="">${I18n.t('app.select_option')}</option>${zones.map(z=>`<option value="${z.id}">${Utils.sanitize(z.name)}</option>`).join('')}</select></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('app.date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.cleaned_by')}</label><input type="text" class="form-input" name="cleanedBy"></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.product_used')}</label><input type="text" class="form-input" name="product"></div>
                <div class="form-group"><label class="form-label">${I18n.t('cleaning.conformity')}</label><select class="form-select" name="conformity"><option value="conform">${I18n.t('cleaning.conform')}</option><option value="non_conform">${I18n.t('cleaning.non_conform')}</option></select></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.notes')}</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary clean-l-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="clean-log-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        setupEvents();
    }
    function setupEvents() {
        let editingZoneId = null;
        Utils.delegate(document.body,'#clean-add-zone',  'click', ()=>{editingZoneId=null;Utils.clearForm('clean-zone-form');Utils.openModal('clean-zone-modal');});
        Utils.delegate(document.body,'.clean-z-close','click',()=>Utils.closeModal('clean-zone-modal'));
        Utils.delegate(document.body,'#clean-zone-save','click',async()=>{const d=Utils.getFormData('clean-zone-form');if(!d.name){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();if(editingZoneId){d.id=editingZoneId;await TrazaDB.update('cleaning_zones',d);}else{await TrazaDB.create('cleaning_zones',d);}Utils.closeModal('clean-zone-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.clean-zone-edit','click',async function(){const z=await TrazaDB.read('cleaning_zones',this.dataset.id);if(z){editingZoneId=z.id;Utils.setFormData('clean-zone-form',z);Utils.openModal('clean-zone-modal');}});
        Utils.delegate(document.body,'.clean-zone-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('cleaning_zones',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        Utils.delegate(document.body,'#clean-add-log','click',()=>{Utils.clearForm('clean-log-form');Utils.openModal('clean-log-modal');});
        Utils.delegate(document.body,'.clean-l-close','click',()=>Utils.closeModal('clean-log-modal'));
        Utils.delegate(document.body,'#clean-log-save','click',async()=>{const d=Utils.getFormData('clean-log-form');if(!d.zoneId){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();const zone=await TrazaDB.read('cleaning_zones',d.zoneId);d.zoneName=zone?zone.name:'';await TrazaDB.create('cleaning_logs',d);Utils.closeModal('clean-log-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.clean-log-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('cleaning_logs',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
    }
    return { init, render };
})();
