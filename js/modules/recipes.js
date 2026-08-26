/* TrazaControl — Recipes & Productions Module */
const RecipesModule = (function() {
    'use strict';
    let editingId = null;
    function init() { App.registerModule('recipes', { render }); }
    async function render() {
        const container = document.getElementById('module-recipes'); if (!container) return;
        const userId = Auth.getUserId();
        const [recipes, productions] = await Promise.all([TrazaDB.getByUser('recipes', userId), TrazaDB.getByUser('productions', userId)]);
        container.innerHTML = `
            <div class="module-header"><h2>${I18n.t('recipes.title')}</h2></div>
            <div class="toolbar"><div class="toolbar-left"><div class="search-bar"><span class="search-icon">${App.getIcon('search')}</span><input type="text" class="form-input" id="recipe-search" placeholder="${I18n.t('app.search')}"></div></div>
            <div class="toolbar-right"><button class="btn btn-primary ripple-container" id="recipe-add">${App.getIcon('plus')} ${I18n.t('recipes.new_recipe')}</button></div></div>
            ${recipes.length > 0 ? `<div class="grid-auto stagger-grid">${recipes.map(r => {
                const allergens = (r.allergens||[]).map(a=>I18n.t('traceability.allergen_list.'+a));
                const prodCount = productions.filter(p=>p.recipeId===r.id).length;
                return `<div class="card recipe-card hover-lift">
                    <div class="recipe-card-image">${r.emoji||'🍞'}</div>
                    <div class="card-body"><h4>${Utils.sanitize(r.name)}</h4>
                    <p class="text-sm text-secondary mb-2">${Utils.sanitize(r.category||'')}</p>
                    <p class="text-xs text-secondary mb-2">${I18n.t('recipes.servings')}: ${r.servings||'-'} | ${I18n.t('recipes.prep_time')}: ${r.prepTime||'-'}</p>
                    ${allergens.length > 0 ? `<div class="recipe-allergen-auto text-xs mb-2">⚠️ ${allergens.join(', ')}</div>` : ''}
                    <p class="text-xs text-secondary">${prodCount} ${I18n.t('recipes.productions')}</p>
                    <div class="flex gap-2 mt-4">
                        <button class="btn btn-ghost btn-sm recipe-prod" data-id="${r.id}" title="${I18n.t('recipes.new_production')}">🏭</button>
                        <button class="btn btn-ghost btn-sm recipe-edit" data-id="${r.id}">✏️</button>
                        <button class="btn btn-ghost btn-sm recipe-delete" data-id="${r.id}">🗑️</button>
                    </div></div></div>`;
            }).join('')}</div>` : `<div class="card"><div class="empty-state"><div class="empty-state-icon">${App.getIcon('recipes')}</div><div class="empty-state-title">${I18n.t('app.no_data')}</div><button class="btn btn-primary" id="recipe-add-empty">${I18n.t('recipes.new_recipe')}</button></div></div>`}

            <div id="recipe-modal" class="modal-overlay hidden"><div class="modal modal-lg"><div class="modal-header"><h3 id="recipe-modal-title">${I18n.t('recipes.new_recipe')}</h3><button class="modal-close recipe-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="recipe-form">
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('recipes.recipe_name')} *</label><input type="text" class="form-input" name="name" required></div>
                <div class="form-group"><label class="form-label">${I18n.t('recipes.category')}</label><input type="text" class="form-input" name="category"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('recipes.servings')}</label><input type="number" class="form-input" name="servings"></div>
                <div class="form-group"><label class="form-label">${I18n.t('recipes.prep_time')}</label><input type="text" class="form-input" name="prepTime"></div></div>
                <div class="form-group"><label class="form-label">Emoji</label><input type="text" class="form-input" name="emoji" maxlength="4" placeholder="🍞"></div>
                <div class="divider"></div>
                <div class="module-section-title">${I18n.t('traceability.ingredients')}</div>
                <div id="recipe-ingredients" class="ingredient-list mb-4"></div>
                <button type="button" class="btn btn-ghost btn-sm" id="recipe-add-ingredient">${App.getIcon('plus')} ${I18n.t('traceability.add_ingredient')}</button>
                <div class="divider"></div>
                <div class="module-section-title">${I18n.t('recipes.steps')}</div>
                <div id="recipe-steps" class="mb-4"></div>
                <button type="button" class="btn btn-ghost btn-sm" id="recipe-add-step">${App.getIcon('plus')} ${I18n.t('recipes.add_step')}</button>
                <div class="divider"></div>
                <div class="module-section-title">${I18n.t('traceability.allergens')}</div>
                <div class="allergen-grid" id="recipe-allergen-grid">${renderAllergenGrid()}</div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary recipe-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="recipe-save">${I18n.t('app.save')}</button></div></div></div>

            <div id="recipe-prod-modal" class="modal-overlay hidden"><div class="modal"><div class="modal-header"><h3>${I18n.t('recipes.new_production')}</h3><button class="modal-close recipe-prod-close">${App.getIcon('close')}</button></div><div class="modal-body"><form id="recipe-prod-form">
                <input type="hidden" name="recipeId">
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('recipes.batch_number')}</label><input type="text" class="form-input" name="batchNumber"></div>
                <div class="form-group"><label class="form-label">${I18n.t('recipes.units_produced')}</label><input type="number" class="form-input" name="unitsProduced"></div></div>
                <div class="grid-2"><div class="form-group"><label class="form-label">${I18n.t('app.date')}</label><input type="date" class="form-input" name="date" value="${Utils.todayISO()}"></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.responsible')}</label><input type="text" class="form-input" name="responsible"></div></div>
                <div class="form-group"><label class="form-label">${I18n.t('app.notes')}</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
            </form></div><div class="modal-footer"><button class="btn btn-secondary recipe-prod-close">${I18n.t('app.cancel')}</button><button class="btn btn-primary" id="recipe-prod-save">${I18n.t('app.save')}</button></div></div></div>
        `;
        setupEvents();
    }
    function renderAllergenGrid() {
        const allergens = ['gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'];
        return allergens.map(a=>`<label class="allergen-item" data-allergen="${a}"><input type="checkbox" name="allergen_${a}" value="${a}"><span>${I18n.t('traceability.allergen_list.'+a)}</span></label>`).join('');
    }
    function addIngredientRow(d) {
        const list=document.getElementById('recipe-ingredients');if(!list)return;
        const row=document.createElement('div');row.className='ingredient-row';
        row.innerHTML=`<input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_name')}" value="${Utils.sanitize((d&&d.name)||'')}"><input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_qty')}" value="${Utils.sanitize((d&&d.qty)||'')}"><button type="button" class="ingredient-remove">${App.getIcon('close')}</button>`;
        list.appendChild(row);row.querySelector('.ingredient-remove').addEventListener('click',()=>row.remove());
    }
    function addStepRow(text) {
        const list=document.getElementById('recipe-steps');if(!list)return;const idx=list.children.length+1;
        const row=document.createElement('div');row.className='recipe-step';
        row.innerHTML=`<div class="recipe-step-number">${idx}</div><div class="recipe-step-content"><textarea class="form-textarea" rows="2" placeholder="${I18n.t('recipes.step_description')}">${Utils.sanitize(text||'')}</textarea><button type="button" class="btn btn-ghost btn-sm mt-2" style="color:var(--danger)">🗑️</button></div>`;
        list.appendChild(row);row.querySelector('button').addEventListener('click',()=>row.remove());
    }
    function setupEvents() {
        Utils.delegate(document.body,'#recipe-add, #recipe-add-empty','click',()=>{editingId=null;Utils.clearForm('recipe-form');document.getElementById('recipe-ingredients').innerHTML='';document.getElementById('recipe-steps').innerHTML='';document.querySelectorAll('#recipe-allergen-grid .allergen-item').forEach(i=>{i.classList.remove('selected');const cb=i.querySelector('input');if(cb)cb.checked=false;});Utils.openModal('recipe-modal');});
        Utils.delegate(document.body,'.recipe-close','click',()=>Utils.closeModal('recipe-modal'));
        Utils.delegate(document.body,'#recipe-add-ingredient','click',()=>addIngredientRow());
        Utils.delegate(document.body,'#recipe-add-step','click',()=>addStepRow());
        Utils.delegate(document.body,'.allergen-item','click',function(e){if(e.target.tagName==='INPUT')return;const cb=this.querySelector('input[type="checkbox"]');if(cb){cb.checked=!cb.checked;this.classList.toggle('selected',cb.checked);}});
        Utils.delegate(document.body,'#recipe-save','click',async()=>{const d=Utils.getFormData('recipe-form');if(!d.name){Utils.showToast('error',I18n.t('app.error_required'));return;}
            d.ingredients=Array.from(document.querySelectorAll('#recipe-ingredients .ingredient-row')).map(r=>{const inputs=r.querySelectorAll('input');return{name:inputs[0].value,qty:inputs[1].value};}).filter(i=>i.name);
            d.steps=Array.from(document.querySelectorAll('#recipe-steps textarea')).map(t=>t.value).filter(s=>s);
            d.allergens=Array.from(document.querySelectorAll('#recipe-allergen-grid input:checked')).map(cb=>cb.value);
            d.userId=Auth.getUserId();if(editingId){d.id=editingId;await TrazaDB.update('recipes',d);}else{await TrazaDB.create('recipes',d);}Utils.closeModal('recipe-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        Utils.delegate(document.body,'.recipe-edit','click',async function(){const r=await TrazaDB.read('recipes',this.dataset.id);if(!r)return;editingId=r.id;Utils.setFormData('recipe-form',r);document.getElementById('recipe-ingredients').innerHTML='';(r.ingredients||[]).forEach(i=>addIngredientRow(i));document.getElementById('recipe-steps').innerHTML='';(r.steps||[]).forEach(s=>addStepRow(s));document.querySelectorAll('#recipe-allergen-grid .allergen-item').forEach(i=>{i.classList.remove('selected');const cb=i.querySelector('input');if(cb)cb.checked=false;});(r.allergens||[]).forEach(a=>{const cb=document.querySelector(`#recipe-allergen-grid input[value="${a}"]`);if(cb){cb.checked=true;cb.closest('.allergen-item').classList.add('selected');}});Utils.openModal('recipe-modal');});
        Utils.delegate(document.body,'.recipe-delete','click',function(){const id=this.dataset.id;Utils.showConfirm(I18n.t('app.confirm_delete'),I18n.t('app.confirm_delete_desc'),async()=>{await TrazaDB.remove('recipes',id);Utils.showToast('success',I18n.t('app.success_delete'));render();},I18n.t.bind(I18n));});
        Utils.delegate(document.body,'.recipe-prod','click',function(){Utils.clearForm('recipe-prod-form');document.querySelector('#recipe-prod-form [name="recipeId"]').value=this.dataset.id;Utils.openModal('recipe-prod-modal');});
        Utils.delegate(document.body,'.recipe-prod-close','click',()=>Utils.closeModal('recipe-prod-modal'));
        Utils.delegate(document.body,'#recipe-prod-save','click',async()=>{const d=Utils.getFormData('recipe-prod-form');d.userId=Auth.getUserId();await TrazaDB.create('productions',d);Utils.closeModal('recipe-prod-modal');Utils.showToast('success',I18n.t('app.success_save'));render();});
        const searchInput=document.getElementById('recipe-search');if(searchInput){searchInput.addEventListener('input',Utils.debounce(e=>{const t=e.target.value.toLowerCase();document.querySelectorAll('.recipe-card').forEach(c=>{c.style.display=c.textContent.toLowerCase().includes(t)?'':'none';});},300));}
    }
    return { init, render };
})();
