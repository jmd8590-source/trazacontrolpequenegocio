/* TrazaControl — Suppliers Module */
const SuppliersModule = (function() {
    'use strict';
    let editingId = null;
    function init() { App.registerModule('suppliers', { render }); }
    async function render() {
        const container = document.getElementById('module-suppliers'); if (!container) return;
        const userId = Auth.getUserId();
        const suppliers = await TrazaDB.getByUser('suppliers', userId);
        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('suppliers.title')}</h2></div>
            <div class="toolbar"><div class="toolbar-left"><div class="search-bar"><span class="search-icon">${App.getIcon('search')}</span><input type="text" class="form-input" id="supplier-search" placeholder="${I18n.t('app.search')}"></div></div>
            <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="supplier-add">${App.getIcon('plus')} ${I18n.t('suppliers.new_supplier')}</button></div></div>
            ${suppliers.length > 0 ? `<div class="grid-auto stagger-grid">${suppliers.map(s => `
                <div class="card supplier-card hover-lift">
                    <div class="supplier-avatar">${Utils.getInitials(s.name)}</div>
                    <div class="supplier-info">
                        <h4>${Utils.sanitize(s.name)}</h4>
                        <p class="text-sm text-secondary">${Utils.sanitize(s.contact||'')} ${s.phone?'| '+Utils.sanitize(s.phone):''}</p>
                        <p class="text-xs text-secondary mb-2">${Utils.sanitize(s.email||'')} ${s.address?'| '+Utils.sanitize(s.address):''}</p>
                        <div class="flex gap-2 items-center mb-2">${s.status?`<span class="badge badge-${s.status==='approved'?'success':s.status==='pending'?'warning':'danger'} badge-dot">${I18n.t('suppliers.statuses.'+s.status)}</span>`:''}</div>
                        <p class="text-xs text-secondary">${I18n.t('suppliers.registration_number')}: ${Utils.sanitize(s.registrationNumber||'-')} | ${I18n.t('suppliers.certifications')}: ${Utils.sanitize(s.certifications||'-')}</p>
                        <div class="flex gap-2 mt-4"><button class="btn btn-ghost btn-sm supplier-edit" data-id="${s.id}">✏️</button><button class="btn btn-ghost btn-sm supplier-delete" data-id="${s.id}">🗑️</button></div>
                    </div>
                </div>
            `).join('')}</div>` : `<div class="card"><div class="empty-state"><div class="empty-state-icon">${App.getIcon('suppliers')}</div><div class="empty-state-title">${I18n.t('app.no_data')}</div><button class="btn btn-primary" id="supplier-add-empty">${I18n.t('suppliers.new_supplier')}</button></div></div>`}

            <div id="supplier-modal" class="modal-overlay hidden"><div class="modal modal-lg"><div class="modal-header"><h3 id="supplier-modal-title">${I18n.t('suppliers.new_supplier')}</h3><button class="modal-close sup-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="supplier-form">
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.supplier_name')} *</label><input type="text" class="form-input" name="name" required></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('suppliers.contact_person')}</label><input type="text" class="form-input" name="contact"></div>
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.phone')}</label><input type="tel" class="form-input" name="phone"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('suppliers.email')}</label><input type="email" class="form-input" name="email"></div>
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.address')}</label><input type="text" class="form-input" name="address"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('suppliers.registration_number')}</label><input type="text" class="form-input" name="registrationNumber"></div>
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.status')}</label><select class="form-select" name="status"><option value="approved">${I18n.t('suppliers.statuses.approved')}</option><option value="pending">${I18n.t('suppliers.statuses.pending')}</option><option value="rejected">${I18n.t('suppliers.statuses.rejected')}</option></select></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.certifications')}</label><input type="text" class="form-input" name="certifications"></div>
                <div class="form-group"><label class="form-label">${I18n.t('suppliers.products_supplied')}</label><input type="text" class="form-input" name="productsSupplied"></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.notes')}</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary sup-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="supplier-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        Utils.delegate(document.body,'#supplier-add, #supplier-add-empty','click',()=>{editingId=null;Utils.clearForm('supplier-form');Utils.openModal('supplier-modal');});
        Utils.delegate(document.body,'.sup-close','click',()=>Utils.closeModal('supplier-modal'));
        Utils.delegate(document.body,'#supplier-save','click',async()=>{const d=Utils.getFormData('supplier-form');if(!d.name){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();if(editingId){d.id=editingId;await TrazaDB.update('suppliers',d);}else{await TrazaDB.create('suppliers',d);}Utils.closeModal('supplier-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.supplier-edit','click',async function(){const s=await TrazaDB.read('suppliers',this.dataset.id);if(s){editingId=s.id;Utils.setFormData('supplier-form',s);Utils.openModal('supplier-modal');}});
        Utils.delegate(document.body,'.supplier-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('suppliers',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        const searchInput=document.getElementById('supplier-search');if(searchInput){searchInput.addEventListener('input',Utils.debounce(e=>{const t=e.target.value.toLowerCase();document.querySelectorAll('.supplier-card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(t)?'':'none';});},300));}
    }
    return { init, render };
})();
