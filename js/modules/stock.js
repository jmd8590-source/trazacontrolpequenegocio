/* TrazaControl — Stock/Inventory Module */
const StockModule = (function() {
    'use strict';
    let editingId = null;
    function init() { App.registerModule('stock', { render }); }
    async function render() {
        const container = document.getElementById('module-stock'); if (!container) return;
        const userId = Auth.getUserId();
        const [items, movements] = await Promise.all([TrazaDB.getByUser('stock_items', userId), TrazaDB.getByUser('stock_movements', userId)]);
        const totalItems = items.length;
        const lowStock = items.filter(i => i.currentStock !== undefined && i.minStock !== undefined && i.currentStock <= i.minStock).length;
        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('stock.title')}</h2></div>
            <div class="stock-summary-bar">
                <div class="stock-summary-item"><div class="text-2xl font-bold">${totalItems}</div><div class="text-sm text-secondary">${I18n.t('stock.total_items')}</div></div>
                <div class="stock-summary-item"><div class="text-2xl font-bold" style="color:var(--warning)">${lowStock}</div><div class="text-sm text-secondary">${I18n.t('stock.low_stock')}</div></div>
            </div>
            <div class="toolbar"><div class="toolbar-left"><div class="search-bar"><span class="search-icon">${App.getIcon('search')}</span><input type="text" class="form-input" id="stock-search" placeholder="${I18n.t('app.search')}"></div></div>
            <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="stock-add">${App.getIcon('plus')} ${I18n.t('stock.new_item')}</button></div></div>
            ${items.length > 0 ? `<div class="table-container"><table class="table" id="stock-table"><thead><tr><th>${I18n.t('stock.product_name')}</th><th>${I18n.t('stock.category')}</th><th>${I18n.t('stock.current_stock')}</th><th>${I18n.t('stock.min_stock')}</th><th>${I18n.t('stock.unit')}</th><th>${I18n.t('stock.expiry_date')}</th><th>${I18n.t('app.status')}</th><th>${I18n.t('app.actions')}</th></tr></thead><tbody>
                ${items.map(item => {
                    const isLow = item.currentStock !== undefined && item.minStock !== undefined && item.currentStock <= item.minStock;
                    const expDays = Utils.daysUntil(item.expiry);
                    const expClass = expDays !== null && expDays <= 3 ? 'text-danger' : '';
                    return `<tr data-id="${item.id}"><td><strong>${Utils.sanitize(item.name)}</strong></td><td>${item.category ? `<span class="badge badge-primary">${Utils.sanitize(item.category)}</span>` : '-'}</td>
                    <td><strong style="color:${isLow?'var(--danger)':'var(--text-primary)'}">${item.currentStock !== undefined ? item.currentStock : '-'}</strong></td>
                    <td>${item.minStock !== undefined ? item.minStock : '-'}</td><td>${Utils.sanitize(item.unit||'-')}</td>
                    <td class="${expClass}">${Utils.formatDate(item.expiry,I18n.getLang())}</td>
                    <td>${isLow ? `<span class="badge badge-danger badge-dot">${I18n.t('stock.low_stock')}</span>` : `<span class="badge badge-success badge-dot">OK</span>`}</td>
                    <td><div class="table-actions"><button class="btn btn-ghost btn-sm stock-in" data-id="${item.id}" title="${I18n.t('stock.entry')}">📥</button><button class="btn btn-ghost btn-sm stock-out" data-id="${item.id}" title="${I18n.t('stock.exit')}">📤</button><button class="btn btn-ghost btn-sm stock-edit" data-id="${item.id}">✏️</button><button class="btn btn-ghost btn-sm stock-delete" data-id="${item.id}">🗑️</button></div></td></tr>`;
                }).join('')}</tbody></table></div>
            ` : `<div class="card"><div class="empty-state"><div class="empty-state-icon">${App.getIcon('stock')}</div><div class="empty-state-title">${I18n.t('app.no_data')}</div><button class="btn btn-primary" id="stock-add-empty">${I18n.t('stock.new_item')}</button></div></div>`}

            <div id="stock-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3 id="stock-modal-title">${I18n.t('stock.new_item')}</h3><button class="modal-close stock-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="stock-form">
                <div class="form-group"><label class="form-label">${I18n.t('stock.product_name')} *</label><input type="text" class="form-input" name="name" required></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('stock.category')}</label><input type="text" class="form-input" name="category"></div>
                <div class="form-group"><label class="form-label">${I18n.t('stock.unit')}</label><select class="form-select" name="unit"><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="mL">mL</option><option value="ud">ud</option></select></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('stock.current_stock')}</label><input type="number" step="0.01" class="form-input" name="currentStock"></div>
                <div class="form-group"><label class="form-label">${I18n.t('stock.min_stock')}</label><input type="number" step="0.01" class="form-input" name="minStock"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('stock.expiry_date')}</label><input type="date" class="form-input" name="expiry"></div>
                <div class="form-group"><label class="form-label">${I18n.t('stock.batch_number')}</label><input type="text" class="form-input" name="batch"></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('stock.storage_location')}</label><input type="text" class="form-input" name="location"></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary stock-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="stock-save">${I18n.t('app.save')}</button></div></div></div>

            <div id="stock-move-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3 id="stock-move-title">${I18n.t('stock.entry')}</h3><button class="modal-close stock-move-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="stock-move-form">
                <input type="hidden" name="itemId"><input type="hidden" name="type">
                <div class="form-group"><label class="form-label">${I18n.t('stock.quantity')} *</label><input type="number" step="0.01" class="form-input" name="quantity" required></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.notes')}</label><input type="text" class="form-input" name="notes"></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary stock-move-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="stock-move-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        Utils.delegate(document.body,'#stock-add, #stock-add-empty','click',()=>{editingId=null;Utils.clearForm('stock-form');Utils.openModal('stock-modal');});
        Utils.delegate(document.body,'.stock-close','click',()=>Utils.closeModal('stock-modal'));
        Utils.delegate(document.body,'#stock-save','click',async()=>{const d=Utils.getFormData('stock-form');if(!d.name){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();if(editingId){d.id=editingId;await TrazaDB.update('stock_items',d);}else{await TrazaDB.create('stock_items',d);}Utils.closeModal('stock-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.stock-edit','click',async function(){const item=await TrazaDB.read('stock_items',this.dataset.id);if(item){editingId=item.id;Utils.setFormData('stock-form',item);Utils.openModal('stock-modal');}});
        Utils.delegate(document.body,'.stock-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('stock_items',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        Utils.delegate(document.body,'.stock-in','click',function(){document.querySelector('#stock-move-form [name="itemId"]').value=this.dataset.id;document.querySelector('#stock-move-form [name="type"]').value='in';document.getElementById('stock-move-title').textContent=I18n.t('stock.entry');Utils.openModal('stock-move-modal');});
        Utils.delegate(document.body,'.stock-out','click',function(){document.querySelector('#stock-move-form [name="itemId"]').value=this.dataset.id;document.querySelector('#stock-move-form [name="type"]').value='out';document.getElementById('stock-move-title').textContent=I18n.t('stock.exit');Utils.openModal('stock-move-modal');});
        Utils.delegate(document.body,'.stock-move-close','click',()=>Utils.closeModal('stock-move-modal'));
        Utils.delegate(document.body,'#stock-move-save','click',async()=>{const d=Utils.getFormData('stock-move-form');if(!d.quantity){Utils.showToast('error',I18n.t('app.error_required'));return;}d.userId=Auth.getUserId();d.date=Utils.nowISO();await TrazaDB.create('stock_movements',d);
            const item=await TrazaDB.read('stock_items',d.itemId);if(item){item.currentStock=(item.currentStock||0)+(d.type==='in'?d.quantity:-d.quantity);await TrazaDB.update('stock_items',item);}
            Utils.closeModal('stock-move-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        const searchInput=document.getElementById('stock-search');if(searchInput){searchInput.addEventListener('input',Utils.debounce(e=>{const t=e.target.value.toLowerCase();document.querySelectorAll('#stock-table tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(t)?'':'none';});},300));}
    }
    return { init, render };
})();
