/* ============================================================
   TrazaControl — Recipes & Production Module (Ultra-Reliable)
   Instant Label Printing, Batch Management & Multi-Language
   ============================================================ */
const RecipesModule = (function() {
    'use strict';

    let editingId = null;
    let currentLabelData = null;
    let currentRecipes = [];
    let eventsInitialized = false;

    function init() {
        App.registerModule('recipes', { render });
        setupEvents();
    }

    async function render() {
        const container = document.getElementById('module-recipes');
        if (!container) return;

        const userId = Auth.getUserId();
        const [recipes, productions] = await Promise.all([
            TrazaDB.getByUser('recipes', userId),
            TrazaDB.getByUser('productions', userId)
        ]);

        currentRecipes = recipes || [];

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('recipes.title')}</h2>
            </div>

            <div class="toolbar">
                <div class="toolbar-left">
                    <div class="search-bar">
                        <span class="search-icon">${App.getIcon('search')}</span>
                        <input type="text" class="form-input" id="recipe-search" placeholder="${I18n.t('app.search')}">
                    </div>
                </div>
                <div class="toolbar-right">
                    <button class="btn btn-primary ripple-container" id="recipe-add">
                        ${App.getIcon('plus')} <span>${I18n.t('recipes.new_recipe')}</span>
                    </button>
                </div>
            </div>

            ${currentRecipes.length > 0 ? `
                <div class="grid-auto stagger-grid">
                    ${currentRecipes.map(r => {
                        const allergens = (r.allergens || []).map(a => I18n.t('traceability.allergen_list.' + a) || a);
                        const prodCount = (productions || []).filter(p => String(p.recipeId) === String(r.id)).length;

                        return `
                            <div class="card recipe-card hover-lift" data-id="${r.id}">
                                <div class="recipe-card-image">${r.emoji || '🍞'}</div>
                                <div class="card-body">
                                    <h4 style="font-size: var(--text-lg); margin-bottom: 4px;">${Utils.sanitize(r.name)}</h4>
                                    <p class="text-sm text-secondary mb-2">${Utils.sanitize(r.category || 'Elaboración artesanal')}</p>
                                    <p class="text-xs text-secondary mb-2">
                                        <strong>${I18n.t('recipes.servings')}:</strong> ${r.servings || r.yield || '-'} | 
                                        <strong>${I18n.t('recipes.prep_time')}:</strong> ${r.prepTime || '-'}
                                    </p>
                                    ${allergens.length > 0 ? `
                                        <div class="recipe-allergen-auto text-xs mb-2">
                                            ⚠️ <strong>${I18n.t('traceability.allergens')}:</strong> ${allergens.join(', ')}
                                        </div>
                                    ` : ''}
                                    <p class="text-xs text-secondary mb-3">
                                        <strong>${prodCount}</strong> ${I18n.t('recipes.productions')} registradas
                                    </p>
                                    
                                    <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-light);">
                                        <button class="btn btn-primary btn-block recipe-print-label-btn mb-2 ripple-container" data-id="${r.id}" style="font-weight: 700;">
                                            🏷️ ${I18n.t('recipes.print_label')}
                                        </button>
                                        <div class="flex items-center justify-between gap-1">
                                            <button class="btn btn-secondary btn-sm recipe-prod" data-id="${r.id}" title="${I18n.t('recipes.new_production')}">
                                                🏭 ${I18n.t('recipes.new_production')}
                                            </button>
                                            <div class="flex gap-1">
                                                <button class="btn btn-ghost btn-sm recipe-edit" data-id="${r.id}" title="${I18n.t('app.edit')}">✏️</button>
                                                <button class="btn btn-ghost btn-sm recipe-delete" data-id="${r.id}" title="${I18n.t('app.delete')}">🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : `
                <div class="card">
                    <div class="empty-state" style="padding: 40px 24px;">
                        <div class="empty-state-icon" style="font-size: 40px; margin-bottom: 12px;">🍞</div>
                        <div class="empty-state-title">${I18n.t('app.no_data')}</div>
                        <p class="text-secondary mb-4">Crea tu primera receta artesana con ingredientes, aliños, condimentos y alérgenos para emitir etiquetas sanitarias.</p>
                        <button class="btn btn-primary" id="recipe-add-empty">${I18n.t('recipes.new_recipe')}</button>
                    </div>
                </div>
            `}

            <!-- Modal: Receta -->
            <div id="recipe-modal" class="modal-overlay hidden">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 id="recipe-modal-title">${I18n.t('recipes.new_recipe')}</h3>
                        <button class="modal-close recipe-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="recipe-form">
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.recipe_name')} <span class="required">*</span></label>
                                    <input type="text" class="form-input" name="name" placeholder="Ej: Pan de Masa Madre / Embutido Artesanal" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.category')}</label>
                                    <input type="text" class="form-input" name="category" placeholder="Ej: Panadería, Cárnicos, Conservas">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.servings')} / Rendimiento</label>
                                    <input type="text" class="form-input" name="servings" placeholder="Ej: 20 barras / 10 kg">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.prep_time')}</label>
                                    <input type="text" class="form-input" name="prepTime" placeholder="Ej: 45 min / 24 horas">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Icono Emoji</label>
                                    <input type="text" class="form-input" name="emoji" maxlength="4" placeholder="🍞">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.storage_conditions')}</label>
                                    <input type="text" class="form-input" name="storageConditions" placeholder="Ej: Conservar en lugar fresco y seco (15-20°C)">
                                </div>
                            </div>

                            <div class="divider"></div>
                            <div class="module-section-title">
                                🥗 ${I18n.t('traceability.ingredients')} & ${I18n.t('recipes.condiments')}
                            </div>
                            <p class="text-xs text-secondary mb-3">Introduce todos los ingredientes, materias primas, aliños, condimentos y especias de la receta.</p>
                            <div id="recipe-ingredients" class="ingredient-list mb-4"></div>
                            <button type="button" class="btn btn-ghost btn-sm" id="recipe-add-ingredient">
                                ${App.getIcon('plus')} ${I18n.t('traceability.add_ingredient')} / Condimento
                            </button>

                            <div class="divider"></div>
                            <div class="module-section-title">📝 ${I18n.t('recipes.steps')}</div>
                            <div id="recipe-steps" class="mb-4"></div>
                            <button type="button" class="btn btn-ghost btn-sm" id="recipe-add-step">
                                ${App.getIcon('plus')} ${I18n.t('recipes.add_step')}
                            </button>

                            <div class="divider"></div>
                            <div class="module-section-title">⚠️ ${I18n.t('traceability.allergens')}</div>
                            <div class="allergen-grid" id="recipe-allergen-grid">${renderAllergenGrid()}</div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary recipe-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="recipe-save">${I18n.t('app.save')}</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Nueva Producción / Elaboración -->
            <div id="recipe-prod-modal" class="modal-overlay hidden">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${I18n.t('recipes.new_production')}</h3>
                        <button class="modal-close recipe-prod-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <form id="recipe-prod-form">
                            <input type="hidden" name="recipeId">
                            <div class="form-group">
                                <label class="form-label">${I18n.t('recipes.batch_number')} <span class="required">*</span></label>
                                <input type="text" class="form-input" name="batchNumber" required>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.units_produced')}</label>
                                    <input type="number" class="form-input" name="unitsProduced" placeholder="Ej: 50" value="1">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.date')}</label>
                                    <input type="date" class="form-input" name="date" value="${Utils.todayISO()}">
                                </div>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('recipes.expiry_date')}</label>
                                    <input type="date" class="form-input" name="expiryDate" value="${getCalculatedExpiryISO(30)}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">${I18n.t('app.responsible')}</label>
                                    <input type="text" class="form-input" name="responsible" value="${(Auth.getUser() && Auth.getUser().ownerName) || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">${I18n.t('app.notes')}</label>
                                <textarea class="form-textarea" name="notes" rows="2" placeholder="Observaciones de la hornada o tanda..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary recipe-prod-close">${I18n.t('app.cancel')}</button>
                        <button class="btn btn-primary ripple-container" id="recipe-prod-save">${I18n.t('app.save')} y Generar Etiqueta</button>
                    </div>
                </div>
            </div>

            <!-- Modal: Imprimir Etiqueta Sanitaria de Producto -->
            <div id="recipe-label-modal" class="modal-overlay hidden">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>🏷️ ${I18n.t('recipes.label_preview')}</h3>
                        <button class="modal-close recipe-label-close">${App.getIcon('close')}</button>
                    </div>
                    <div class="modal-body">
                        <div class="label-customizer-controls mb-4">
                            <div class="grid-3">
                                <div class="form-group">
                                    <label class="form-label">Lote para Etiqueta</label>
                                    <input type="text" class="form-input" id="label-ctrl-batch">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fecha Producción</label>
                                    <input type="date" class="form-input" id="label-ctrl-mfg" value="${Utils.todayISO()}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Fecha Caducidad / Consumo Pref.</label>
                                    <input type="date" class="form-input" id="label-ctrl-exp" value="${getCalculatedExpiryISO(30)}">
                                </div>
                            </div>
                        </div>

                        <!-- Printable Label Card -->
                        <div class="sanitary-label-container" id="printable-sanitary-label">
                            <div class="sanitary-label-inner">
                                <div class="label-header-row">
                                    <div>
                                        <div class="label-business-name" id="label-business-name">Obrador Artesano</div>
                                        <div class="label-product-title" id="label-product-title">Nombre del Producto</div>
                                    </div>
                                    <div class="label-sanitary-badge">RGSEAA / REG. SANITARIO<br><span id="label-sanitary-code">ES-ART-001</span></div>
                                </div>

                                <div class="label-divider"></div>

                                <div class="label-grid-row">
                                    <div class="label-box">
                                        <span class="label-box-tag">Nº DE LOTE</span>
                                        <div class="label-box-val" id="label-disp-batch">LOT-2026-001</div>
                                    </div>
                                    <div class="label-box">
                                        <span class="label-box-tag">F. ELABORACIÓN</span>
                                        <div class="label-box-val" id="label-disp-mfg">27/08/2026</div>
                                    </div>
                                    <div class="label-box">
                                        <span class="label-box-tag">F. CADUCIDAD / CONSUMO</span>
                                        <div class="label-box-val" id="label-disp-exp">27/09/2026</div>
                                    </div>
                                </div>

                                <div class="label-section">
                                    <strong class="label-subtitle">INGREDIENTES, CONDIMENTOS Y ALIÑOS:</strong>
                                    <div class="label-ingredients-text" id="label-disp-ingredients">
                                        Harina de trigo, agua, masa madre, sal marina, aceite de oliva virgen extra.
                                    </div>
                                </div>

                                <div class="label-section" id="label-allergens-section">
                                    <strong class="label-subtitle">INFORMACIÓN DE ALÉRGENOS:</strong>
                                    <div class="label-allergens-text" id="label-disp-allergens">
                                        CONTIENE: <strong>GLUTEN</strong>. Puede contener trazas de sésamo y frutos secos.
                                    </div>
                                </div>

                                <div class="label-section">
                                    <strong class="label-subtitle">CONSERVACIÓN:</strong>
                                    <div class="label-storage-text" id="label-disp-storage">
                                        Conservar en lugar fresco, seco y protegido de la luz solar directa.
                                    </div>
                                </div>

                                <div class="label-footer-row">
                                    <div class="label-barcode-mock">||| |||| || | ||||| ||| |||||||</div>
                                    <div class="label-traceability-guarantee">🛡️ Trazabilidad Garantizada — TrazaControl</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary recipe-label-close">${I18n.t('app.close')}</button>
                        <button class="btn btn-secondary" id="label-copy-text-btn">📋 Copiar Texto</button>
                        <button class="btn btn-primary ripple-container" id="label-print-btn">🖨️ ${I18n.t('recipes.print_label')}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function getCalculatedExpiryISO(daysAhead) {
        const d = new Date();
        d.setDate(d.getDate() + (daysAhead || 30));
        return d.toISOString().split('T')[0];
    }

    function renderAllergenGrid() {
        const allergens = ['gluten','crustaceans','eggs','fish','peanuts','soy','milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs'];
        return allergens.map(a => `
            <label class="allergen-item" data-allergen="${a}">
                <input type="checkbox" name="allergen_${a}" value="${a}">
                <span>${I18n.t('traceability.allergen_list.'+a) || a}</span>
            </label>
        `).join('');
    }

    function addIngredientRow(d) {
        const list = document.getElementById('recipe-ingredients');
        if (!list) return;
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_name')} (ej: Harina, Aceite, Pimentón, Sal)" value="${Utils.sanitize((d && d.name) || '')}">
            <input type="text" class="form-input" placeholder="${I18n.t('traceability.ingredient_qty')} (ej: 1 kg / 50g / 5%)" value="${Utils.sanitize((d && d.qty) || '')}">
            <button type="button" class="ingredient-remove" title="Eliminar">${App.getIcon('close')}</button>
        `;
        list.appendChild(row);
        row.querySelector('.ingredient-remove').addEventListener('click', () => row.remove());
    }

    function addStepRow(text) {
        const list = document.getElementById('recipe-steps');
        if (!list) return;
        const idx = list.children.length + 1;
        const row = document.createElement('div');
        row.className = 'recipe-step';
        row.innerHTML = `
            <div class="recipe-step-number">${idx}</div>
            <div class="recipe-step-content">
                <textarea class="form-textarea" rows="2" placeholder="${I18n.t('recipes.step_description')}">${Utils.sanitize(text || '')}</textarea>
                <button type="button" class="btn btn-ghost btn-sm mt-2" style="color:var(--danger)">🗑️ Eliminar</button>
            </div>
        `;
        list.appendChild(row);
        row.querySelector('button').addEventListener('click', () => row.remove());
    }

    async function findRecipe(id) {
        if (!id) return null;
        let r = currentRecipes.find(x => String(x.id) === String(id));
        if (!r) {
            r = await TrazaDB.read('recipes', id);
        }
        return r;
    }

    function openLabelModalForRecipe(recipe, production) {
        if (!recipe) return;
        currentLabelData = { recipe, production };
        const user = Auth.getUser() || {};
        const today = Utils.todayISO();
        const expDate = (production && production.expiryDate) || getCalculatedExpiryISO(30);
        const recipeNameSanitized = (recipe.name || 'ART').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
        const batchNo = (production && production.batchNumber) || `LOT-${recipeNameSanitized}-${today.replace(/-/g,'').substring(2)}`;

        const batchInput = document.getElementById('label-ctrl-batch');
        const mfgInput = document.getElementById('label-ctrl-mfg');
        const expInput = document.getElementById('label-ctrl-exp');

        if (batchInput) batchInput.value = batchNo;
        if (mfgInput) mfgInput.value = (production && production.date) ? production.date.split('T')[0] : today;
        if (expInput) expInput.value = expDate;

        updateLabelPreviewDOM(recipe, batchNo, today, expDate, user);
        Utils.openModal('recipe-label-modal');
    }

    function updateLabelPreviewDOM(recipe, batchNo, mfgDate, expDate, user) {
        const busEl = document.getElementById('label-business-name');
        const titleEl = document.getElementById('label-product-title');
        const sanEl = document.getElementById('label-sanitary-code');
        const batchEl = document.getElementById('label-disp-batch');
        const mfgEl = document.getElementById('label-disp-mfg');
        const expEl = document.getElementById('label-disp-exp');
        const ingEl = document.getElementById('label-disp-ingredients');
        const allSec = document.getElementById('label-allergens-section');
        const allEl = document.getElementById('label-disp-allergens');
        const stgEl = document.getElementById('label-disp-storage');

        if (busEl) busEl.textContent = user.businessName || user.ownerName || 'Obrador Artesanal';
        if (titleEl) titleEl.textContent = (recipe.emoji ? recipe.emoji + ' ' : '') + recipe.name;
        if (sanEl) sanEl.textContent = user.businessType ? 'TIPO: ' + user.businessType.toUpperCase() : 'REG. SANITARIO ARTESANO';

        if (batchEl) batchEl.textContent = batchNo || '-';
        if (mfgEl) mfgEl.textContent = Utils.formatDate(mfgDate, I18n.getLang());
        if (expEl) expEl.textContent = Utils.formatDate(expDate, I18n.getLang());

        // Ingredients & Condiments string
        const ingList = (recipe.ingredients || []).map(i => `${i.name}${i.qty ? ' (' + i.qty + ')' : ''}`);
        if (ingEl) ingEl.textContent = ingList.length > 0 ? ingList.join(', ') + '.' : 'Ingredientes propios de elaboración artesana.';

        // Allergens
        const allergensList = (recipe.allergens || []).map(a => (I18n.t('traceability.allergen_list.' + a) || a).toUpperCase());
        if (allSec && allEl) {
            if (allergensList.length > 0) {
                allSec.style.display = 'block';
                allEl.innerHTML = `CONTIENE: <strong>${allergensList.join(', ')}</strong>.`;
            } else {
                allSec.style.display = 'block';
                allEl.textContent = 'No contiene alérgenos declarados de declaración obligatoria.';
            }
        }

        // Storage
        if (stgEl) stgEl.textContent = recipe.storageConditions || 'Conservar en lugar fresco, seco y protegido de la luz directa.';
    }

    function setupEvents() {
        if (eventsInitialized) return;
        eventsInitialized = true;

        Utils.delegate(document.body, '#recipe-add, #recipe-add-empty', 'click', () => {
            editingId = null;
            document.getElementById('recipe-modal-title').textContent = I18n.t('recipes.new_recipe');
            Utils.clearForm('recipe-form');
            document.getElementById('recipe-ingredients').innerHTML = '';
            document.getElementById('recipe-steps').innerHTML = '';
            addIngredientRow({ name: '', qty: '' });
            addIngredientRow({ name: '', qty: '' });
            document.querySelectorAll('#recipe-allergen-grid .allergen-item').forEach(i => {
                i.classList.remove('selected');
                const cb = i.querySelector('input');
                if (cb) cb.checked = false;
            });
            Utils.openModal('recipe-modal');
        });

        Utils.delegate(document.body, '.recipe-close', 'click', () => Utils.closeModal('recipe-modal'));

        Utils.delegate(document.body, '#recipe-add-ingredient', 'click', () => addIngredientRow());
        Utils.delegate(document.body, '#recipe-add-step', 'click', () => addStepRow());

        Utils.delegate(document.body, '.allergen-item', 'click', function(e) {
            if (e.target.tagName === 'INPUT') return;
            const cb = this.querySelector('input[type="checkbox"]');
            if (cb) {
                cb.checked = !cb.checked;
                this.classList.toggle('selected', cb.checked);
            }
        });

        Utils.delegate(document.body, '#recipe-save', 'click', async () => {
            const d = Utils.getFormData('recipe-form');
            if (!d.name) {
                Utils.showToast('error', I18n.t('app.error_required'));
                return;
            }

            d.ingredients = Array.from(document.querySelectorAll('#recipe-ingredients .ingredient-row'))
                .map(r => {
                    const inputs = r.querySelectorAll('input');
                    return { name: inputs[0].value.trim(), qty: inputs[1].value.trim() };
                })
                .filter(i => i.name);

            d.steps = Array.from(document.querySelectorAll('#recipe-steps textarea'))
                .map(t => t.value.trim())
                .filter(s => s);

            d.allergens = Array.from(document.querySelectorAll('#recipe-allergen-grid input:checked'))
                .map(cb => cb.value);

            d.userId = Auth.getUserId();

            if (editingId) {
                d.id = editingId;
                await TrazaDB.update('recipes', d);
                Utils.showToast('success', I18n.t('app.success_update'));
            } else {
                await TrazaDB.create('recipes', d);
                Utils.showToast('success', I18n.t('app.success_save'));
            }

            Utils.closeModal('recipe-modal');
            render();
        });

        Utils.delegate(document.body, '.recipe-edit', 'click', async function(e) {
            e.stopPropagation();
            const r = await findRecipe(this.dataset.id);
            if (!r) return;
            editingId = r.id;
            document.getElementById('recipe-modal-title').textContent = I18n.t('app.edit') + ': ' + r.name;
            Utils.setFormData('recipe-form', r);

            document.getElementById('recipe-ingredients').innerHTML = '';
            (r.ingredients || []).forEach(i => addIngredientRow(i));
            if (!r.ingredients || r.ingredients.length === 0) addIngredientRow();

            document.getElementById('recipe-steps').innerHTML = '';
            (r.steps || []).forEach(s => addStepRow(s));

            document.querySelectorAll('#recipe-allergen-grid .allergen-item').forEach(i => {
                i.classList.remove('selected');
                const cb = i.querySelector('input');
                if (cb) cb.checked = false;
            });
            (r.allergens || []).forEach(a => {
                const cb = document.querySelector(`#recipe-allergen-grid input[value="${a}"]`);
                if (cb) {
                    cb.checked = true;
                    cb.closest('.allergen-item').classList.add('selected');
                }
            });

            Utils.openModal('recipe-modal');
        });

        Utils.delegate(document.body, '.recipe-delete', 'click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            Utils.showConfirm(
                I18n.t('app.confirm_delete'),
                I18n.t('app.confirm_delete_desc'),
                async () => {
                    await TrazaDB.remove('recipes', id);
                    Utils.showToast('success', I18n.t('app.success_delete'));
                    render();
                },
                I18n.t.bind(I18n)
            );
        });

        // Open Production Modal
        Utils.delegate(document.body, '.recipe-prod', async function(e) {
            e.stopPropagation();
            const recipeId = this.dataset.id;
            const r = await findRecipe(recipeId);
            if (!r) return;

            Utils.clearForm('recipe-prod-form');
            document.querySelector('#recipe-prod-form [name="recipeId"]').value = recipeId;
            const today = Utils.todayISO();
            const recipeNameSanitized = (r.name || 'ART').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
            const batchNo = `LOT-${recipeNameSanitized}-${today.replace(/-/g,'').substring(2)}`;
            document.querySelector('#recipe-prod-form [name="batchNumber"]').value = batchNo;
            document.querySelector('#recipe-prod-form [name="date"]').value = today;
            document.querySelector('#recipe-prod-form [name="expiryDate"]').value = getCalculatedExpiryISO(30);
            document.querySelector('#recipe-prod-form [name="responsible"]').value = (Auth.getUser() && Auth.getUser().ownerName) || '';

            Utils.openModal('recipe-prod-modal');
        });

        Utils.delegate(document.body, '.recipe-prod-close', () => Utils.closeModal('recipe-prod-modal'));

        Utils.delegate(document.body, '#recipe-prod-save', async () => {
            const d = Utils.getFormData('recipe-prod-form');
            if (!d.batchNumber) {
                Utils.showToast('error', I18n.t('app.error_required') + ' (Lote)');
                return;
            }
            d.userId = Auth.getUserId();
            const recipe = await findRecipe(d.recipeId);
            d.recipeName = recipe ? recipe.name : '';
            d.date = d.date ? new Date(d.date).toISOString() : Utils.nowISO();

            await TrazaDB.create('productions', d);
            Utils.closeModal('recipe-prod-modal');
            Utils.showToast('success', 'Producción registrada con éxito');

            // Automatically open printable label
            if (recipe) {
                openLabelModalForRecipe(recipe, d);
            }
            render();
        });

        // Open Direct Label Modal
        Utils.delegate(document.body, '.recipe-print-label-btn', async function(e) {
            e.stopPropagation();
            const r = await findRecipe(this.dataset.id);
            if (!r) return;
            openLabelModalForRecipe(r, null);
        });

        Utils.delegate(document.body, '.recipe-label-close', () => Utils.closeModal('recipe-label-modal'));

        // Dynamic update of label preview from controls
        ['label-ctrl-batch', 'label-ctrl-mfg', 'label-ctrl-exp'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    if (!currentLabelData || !currentLabelData.recipe) return;
                    const b = document.getElementById('label-ctrl-batch').value;
                    const m = document.getElementById('label-ctrl-mfg').value;
                    const ex = document.getElementById('label-ctrl-exp').value;
                    const u = Auth.getUser() || {};
                    updateLabelPreviewDOM(currentLabelData.recipe, b, m, ex, u);
                });
            }
        });

        // Print Action
        Utils.delegate(document.body, '#label-print-btn', 'click', () => {
            window.print();
        });

        // Copy Text for Thermal Printers
        Utils.delegate(document.body, '#label-copy-text-btn', 'click', () => {
            const labelText = `
PRODUCTO: ${document.getElementById('label-product-title').textContent}
OBRADOR: ${document.getElementById('label-business-name').textContent}
LOTE: ${document.getElementById('label-disp-batch').textContent}
F. ELABORACIÓN: ${document.getElementById('label-disp-mfg').textContent}
F. CADUCIDAD: ${document.getElementById('label-disp-exp').textContent}
INGREDIENTES Y CONDIMENTOS: ${document.getElementById('label-disp-ingredients').textContent}
ALÉRGENOS: ${document.getElementById('label-disp-allergens').textContent}
CONSERVACIÓN: ${document.getElementById('label-disp-storage').textContent}
            `.trim();

            navigator.clipboard.writeText(labelText).then(() => {
                Utils.showToast('success', 'Texto de la etiqueta copiado al portapapeles');
            }).catch(() => {
                Utils.showToast('info', 'Texto listo para copiar');
            });
        });

        // Search Filter
        const searchInput = document.getElementById('recipe-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(e => {
                const t = e.target.value.toLowerCase();
                document.querySelectorAll('.recipe-card').forEach(c => {
                    c.style.display = c.textContent.toLowerCase().includes(t) ? '' : 'none';
                });
            }, 300));
        }
    }

    return { init, render };
})();
