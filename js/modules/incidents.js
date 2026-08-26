/* TrazaControl — Incidents & Corrective Actions Module */
const IncidentsModule = (function() {
    'use strict';
    function init() { App.registerModule('incidents', { render }); }
    async function render() {
        const container = document.getElementById('module-incidents'); if (!container) return;
        const userId = Auth.getUserId();
        const [incidents, actions] = await Promise.all([TrazaDB.getByUser('incidents', userId), TrazaDB.getByUser('corrective_actions', userId)]);
        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('incidents.title')}</h2></div>
            <div class="toolbar"><div class="toolbar-left">
                <div class="pills"><button class="pill active" data-filter="all">${I18n.t('app.all')}</button><button class="pill" data-filter="open">${I18n.t('incidents.statuses.open')}</button><button class="pill" data-filter="in_progress">${I18n.t('incidents.statuses.in_progress')}</button><button class="pill" data-filter="resolved">${I18n.t('incidents.statuses.resolved')}</button></div>
            </div><div class="toolbar-right"><button class="btn btn-primary ripple-container" id="inc-add">${App.getIcon('plus')} ${I18n.t('incidents.new_incident')}</button></div></div>
            ${incidents.length > 0 ? `<div class="stagger-list">${incidents.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(inc => {
                const incActions = actions.filter(a => a.incidentId === inc.id);
                return `<div class="card mb-4 hover-lift inc-card" data-status="${inc.status||'open'}">
                    <div class="card-body">
                        <div class="flex items-center justify-between mb-2">
                            <h4>${Utils.sanitize(inc.title||'')}</h4>
                            <div class="flex gap-2"><span class="severity-indicator ${inc.severity||'low'}">${I18n.t('incidents.severity_levels.'+(inc.severity||'low'))}</span>
                            <span class="badge badge-${inc.status==='open'?'danger':inc.status==='in_progress'?'warning':inc.status==='resolved'?'success':'primary'} badge-dot">${I18n.t('incidents.statuses.'+(inc.status||'open'))}</span></div>
                        </div>
                        <p class="text-sm text-secondary mb-2">${Utils.sanitize(inc.description||'')}</p>
                        <div class="flex gap-4 text-xs text-secondary mb-4"><span>📅 ${Utils.formatDate(inc.date,I18n.getLang())}</span><span>👤 ${Utils.sanitize(inc.detectedBy||'-')}</span><span>📍 ${Utils.sanitize(inc.zone||'-')}</span>${inc.type?`<span>🏷️ ${I18n.t('incidents.types.'+inc.type)}</span>`:''}</div>
                        ${incActions.length > 0 ? `<div class="mt-4"><div class="text-sm font-semibold mb-2">${I18n.t('incidents.corrective_action')}:</div>${incActions.map(a=>`<div class="alert alert-${a.effective==='yes'?'success':'info'} mb-2"><div><strong>${Utils.sanitize(a.description||'')}</strong><br><small>${Utils.sanitize(a.responsible||'')} — ${Utils.formatDate(a.actionDate,I18n.getLang())}</small></div></div>`).join('')}</div>` : ''}
                        <div class="flex gap-2 mt-4">
                            <button class="btn btn-ghost btn-sm inc-action-btn" data-id="${inc.id}">➕ ${I18n.t('incidents.new_action')}</button>
                            <button class="btn btn-ghost btn-sm inc-status-btn" data-id="${inc.id}" data-status="${inc.status}">${inc.status==='open'?'▶️':'✅'}</button>
                            <button class="btn btn-ghost btn-sm inc-delete" data-id="${inc.id}">🗑️</button>
                        </div>
                    </div></div>`;
            }).join('')}</div>` : `<div class="card"><div class="empty-state"><div class="empty-state-icon">${App.getIcon('incidents')}</div><div class="empty-state-title">${I18n.t('app.no_data')}</div><button class="btn btn-primary" id="inc-add-empty">${I18n.t('incidents.new_incident')}</button></div></div>`}

            <div id="inc-modal" class="modal-overlay hidden"><div class="modal modal-lg"><div class="modal-header"><h3>${I18n.t('incidents.new_incident')}</h3><button class="modal-close inc-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="inc-form">
                <div class="form-group"><label class="form-label">${I18n.t('incidents.incident_title')} *</label><input type="text" class="form-input" name="title" required></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('incidents.incident_date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                <div class="form-group"><label class="form-label">${I18n.t('incidents.detected_by')}</label><input type="text" class="form-input" name="detectedBy"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('incidents.severity')}</label><select class="form-select" name="severity">${['low','medium','high','critical'].map(s=>`<option value="${s}">${I18n.t('incidents.severity_levels.'+s)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">${I18n.t('incidents.type')}</label><select class="form-select" name="type"><option value="">${I18n.t('app.select_option')}</option>${['temperature','pest','cleaning','contamination','labeling','expiry','equipment','supplier','process','other'].map(t=>`<option value="${t}">${I18n.t('incidents.types.'+t)}</option>`).join('')}</select></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('incidents.affected_zone')}</label><input type="text" class="form-input" name="zone"></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.description')}</label><textarea class="form-textarea" name="description" rows="3"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary inc-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="inc-save">${I18n.t('app.save')}</button></div></div></div>

            <div id="inc-action-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('incidents.new_action')}</h3><button class="modal-close inc-act-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="inc-action-form">
                <input type="hidden" name="incidentId">
                <div class="form-group"><label class="form-label">${I18n.t('incidents.action_description')} *</label><textarea class="form-textarea" name="description" rows="3" required></textarea></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('incidents.action_responsible')}</label><input type="text" class="form-input" name="responsible"></div>
                <div class="form-group"><label class="form-label">${I18n.t('incidents.action_date')}</label><input type="date" class="form-input" name="actionDate" value="${Utils.todayISO()}"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('incidents.verification_date')}</label><input type="date" class="form-input" name="verificationDate"></div>
                <div class="form-group"><label class="form-label">${I18n.t('incidents.verification_result')}</label><select class="form-select" name="effective"><option value="">${I18n.t('app.select_option')}</option><option value="yes">${I18n.t('incidents.effective')}</option><option value="no">${I18n.t('incidents.not_effective')}</option></select></div></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary inc-act-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="inc-action-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        Utils.delegate(document.body,'#inc-add, #inc-add-empty','click',()=>{Utils.clearForm('inc-form');Utils.openModal('inc-modal');});
        Utils.delegate(document.body,'.inc-close','click',()=>Utils.closeModal('inc-modal'));
        Utils.delegate(document.body,'#inc-save','click',async()=>{const d=Utils.getFormData('inc-form');if(!d.title){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();d.status='open';await TrazaDB.create('incidents',d);Utils.closeModal('inc-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.inc-action-btn','click',function(){Utils.clearForm('inc-action-form');document.querySelector('#inc-action-form [name="incidentId"]').value=this.dataset.id;Utils.openModal('inc-action-modal');});
        Utils.delegate(document.body,'.inc-act-close','click',()=>Utils.closeModal('inc-action-modal'));
        Utils.delegate(document.body,'#inc-action-save','click',async()=>{const d=Utils.getFormData('inc-action-form');if(!d.description){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();await TrazaDB.create('corrective_actions',d);Utils.closeModal('inc-action-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.inc-status-btn','click',async function(){const inc=await TrazaDB.read('incidents',this.dataset.id);if(!inc)return;const next={open:'in_progress',in_progress:'resolved',resolved:'verified',verified:'closed'};inc.status=next[inc.status]||'closed';await TrazaDB.update('incidents',inc);Utils.showToast('success',I18n.t('app.success_update'));render();});
        Utils.delegate(document.body,'.inc-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('incidents',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        Utils.delegate(document.body,'.pill[data-filter]','click',function(){document.querySelectorAll('.pill[data-filter]').forEach(p=>p.classList.remove('active'));this.classList.add('active');const f=this.dataset.filter;document.querySelectorAll('.inc-card').forEach(c=>{c.style.display=(f==='all'||c.dataset.status===f)?'':'none';});});
    }
    return { init, render };
})();
