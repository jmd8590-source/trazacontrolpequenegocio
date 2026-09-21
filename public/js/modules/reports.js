/* ============================================================
   TrazaControl — Inspection Reports & Compliance Module
   Inspection dossiers, APPCC verification, and data export
   ============================================================ */

const ReportsModule = (function() {
    'use strict';

    function init() {
        App.registerModule('reports', { render });
    }

    async function render() {
        const container = document.getElementById('module-reports');
        if (!container) return;

        const userId = Auth.getUserId();
        const user = Auth.getUser();

        const [
            products, tempReadings, tempPoints,
            pestInspections, cleaningLogs, cleaningZones,
            waterReadings, incidents, stockItems,
            suppliers, goodsEntries
        ] = await Promise.all([
            TrazaDB.getByUser('products', userId),
            TrazaDB.getByUser('temperature_readings', userId),
            TrazaDB.getByUser('temperature_points', userId),
            TrazaDB.getByUser('pest_inspections', userId),
            TrazaDB.getByUser('cleaning_logs', userId),
            TrazaDB.getByUser('cleaning_zones', userId),
            TrazaDB.getByUser('water_readings', userId),
            TrazaDB.getByUser('incidents', userId),
            TrazaDB.getByUser('stock_items', userId),
            TrazaDB.getByUser('suppliers', userId),
            TrazaDB.getByUser('goods_entries', userId)
        ]);

        // Compliance evaluation
        const checklist = [
            { id: 'trace', title: I18n.t('reports.traceability_report'), done: products.length > 0, count: products.length },
            { id: 'temp', title: I18n.t('reports.temperature_report'), done: tempReadings.length > 0, count: tempReadings.length },
            { id: 'clean', title: I18n.t('reports.cleaning_report'), done: cleaningLogs.length > 0, count: cleaningLogs.length },
            { id: 'pest', title: I18n.t('reports.pest_report'), done: pestInspections.length > 0, count: pestInspections.length },
            { id: 'water', title: I18n.t('reports.water_report'), done: waterReadings.length > 0, count: waterReadings.length },
            { id: 'incidents', title: I18n.t('reports.incidents_report'), done: !incidents.some(i => i.status === 'open'), count: incidents.length },
            { id: 'suppliers', title: I18n.t('nav.suppliers'), done: suppliers.length > 0, count: suppliers.length },
            { id: 'entries', title: I18n.t('nav.goods_entry'), done: goodsEntries.length > 0, count: goodsEntries.length }
        ];

        const completedCount = checklist.filter(c => c.done).length;
        const complianceRate = Math.round((completedCount / checklist.length) * 100);

        container.innerHTML = `
            <div class="module-header">
                <h2>${I18n.t('reports.title')}</h2>
            </div>

            <!-- Inspection Ready Score Card -->
            <div class="card mb-8">
                <div class="card-body">
                    <div class="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h3>${I18n.t('reports.inspection_dossier')}</h3>
                            <p class="text-secondary mt-1">${I18n.t('reports.inspection_dossier_desc')}</p>
                            <div class="mt-3">
                                <span class="badge badge-${complianceRate >= 80 ? 'success' : complianceRate >= 50 ? 'warning' : 'danger'} badge-dot">
                                    ${complianceRate >= 80 ? I18n.t('dashboard.inspection_ready') : I18n.t('dashboard.inspection_not_ready')} (${complianceRate}%)
                                </span>
                            </div>
                        </div>
                        <div class="flex gap-3 flex-wrap">
                            <button class="btn btn-primary ripple-container" id="report-print-dossier">
                                🖨️ ${I18n.t('reports.print_report')}
                            </button>
                            <button class="btn btn-secondary" id="report-export-json">
                                💾 ${I18n.t('reports.export_data')} (JSON)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section: Report Types -->
            <div class="module-section-title">${I18n.t('reports.types_title')}</div>
            <div class="reports-grid stagger-grid mb-8">
                <div class="card report-card hover-lift" data-report-type="traceability">
                    <div class="card-body">
                        <div class="report-card-icon blue">${App.getIcon('traceability')}</div>
                        <div class="report-card-title">${I18n.t('reports.traceability_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.traceability_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="traceability">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>

                <div class="card report-card hover-lift" data-report-type="temperature">
                    <div class="card-body">
                        <div class="report-card-icon green">${App.getIcon('temperature')}</div>
                        <div class="report-card-title">${I18n.t('reports.temperature_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.temperature_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="temperature">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>

                <div class="card report-card hover-lift" data-report-type="cleaning">
                    <div class="card-body">
                        <div class="report-card-icon orange">${App.getIcon('cleaning')}</div>
                        <div class="report-card-title">${I18n.t('reports.cleaning_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.cleaning_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="cleaning">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>

                <div class="card report-card hover-lift" data-report-type="incidents">
                    <div class="card-body">
                        <div class="report-card-icon red">${App.getIcon('incidents')}</div>
                        <div class="report-card-title">${I18n.t('reports.incidents_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.incidents_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="incidents">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>

                <div class="card report-card hover-lift" data-report-type="pest">
                    <div class="card-body">
                        <div class="report-card-icon green">${App.getIcon('pest_control')}</div>
                        <div class="report-card-title">${I18n.t('reports.pest_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.pest_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="pest">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>

                <div class="card report-card hover-lift" data-report-type="water">
                    <div class="card-body">
                        <div class="report-card-icon purple">${App.getIcon('water')}</div>
                        <div class="report-card-title">${I18n.t('reports.water_report')}</div>
                        <div class="report-card-desc">${I18n.t('reports.water_report_desc')}</div>
                        <button class="btn btn-ghost btn-sm mt-4 report-view-btn" data-type="water">📄 ${I18n.t('reports.generate')}</button>
                    </div>
                </div>
            </div>

            <!-- Compliance Checklist -->
            <div class="card">
                <div class="card-header">
                    <h4>${I18n.t('reports.compliance_checklist')}</h4>
                    <span class="badge badge-${complianceRate >= 80 ? 'success' : 'warning'}">${completedCount} / ${checklist.length}</span>
                </div>
                <div class="card-body">
                    <div class="compliance-checklist">
                        ${checklist.map(item => `
                            <div class="checklist-item ${item.done ? 'done' : 'pending'}">
                                <div class="checklist-icon ${item.done ? 'done' : 'pending'}">
                                    ${item.done ? '✓' : '•'}
                                </div>
                                <div style="flex:1;">
                                    <strong>${Utils.sanitize(item.title)}</strong>
                                    <div class="text-xs text-secondary">${item.count} ${I18n.t('reports.records_found')}</div>
                                </div>
                                <span class="badge badge-${item.done ? 'success' : 'warning'}">
                                    ${item.done ? I18n.t('cleaning.conform') : I18n.t('app.pending')}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Print Dossier Sheet Container (populated on print) -->
            <div class="print-sheet" id="reports-print-container"></div>
        `;

        setupEvents(user, {
            products, tempReadings, tempPoints,
            pestInspections, cleaningLogs, cleaningZones,
            waterReadings, incidents, stockItems,
            suppliers, goodsEntries
        });
    }

    function setupEvents(user, data) {
        // Export JSON
        Utils.delegate(document.body, '#report-export-json', 'click', async () => {
            try {
                await TrazaDB.exportToJSON(Auth.getUserId());
                Utils.showToast('success', I18n.t('reports.export_success'));
            } catch (err) {
                Utils.showToast('error', I18n.t('app.error_generic'));
            }
        });

        // Print Complete Dossier
        Utils.delegate(document.body, '#report-print-dossier', 'click', () => {
            printDossier(user, data);
        });

        // Individual Report Generation
        Utils.delegate(document.body, '.report-view-btn', 'click', function() {
            const type = this.dataset.type;
            printSingleReport(type, user, data);
        });
    }

    function printDossier(user, data) {
        const printContainer = document.getElementById('reports-print-container');
        if (!printContainer) return;

        const lang = I18n.getLang();
        const nowFormatted = Utils.formatDateTime(Utils.nowISO(), lang);

        printContainer.innerHTML = `
            <div class="print-sheet-header">
                <div>
                    <h1>${I18n.t('reports.inspection_dossier')} — APPCC</h1>
                    <p><strong>${Utils.sanitize((user && user.businessName) || 'Negocio Artesano')}</strong></p>
                    <p>${I18n.t('auth.owner_name')}: ${Utils.sanitize((user && user.ownerName) || '')} | ${nowFormatted}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 14pt; font-weight: bold; color: #0071e3;">TrazaControl</p>
                    <small>Dossier Sanitario Oficial</small>
                </div>
            </div>

            <!-- 1. Traceability Section -->
            <div class="print-sheet-section">
                <h3>1. ${I18n.t('reports.traceability_report')} (${data.products.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('traceability.product_name')}</th><th>${I18n.t('traceability.batch_number')}</th><th>${I18n.t('traceability.manufacturing_date')}</th><th>${I18n.t('traceability.expiry_date')}</th><th>${I18n.t('traceability.allergens')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.products.map(p => `
                            <tr>
                                <td>${Utils.sanitize(p.name)}</td>
                                <td>${Utils.sanitize(p.batchNumber || '-')}</td>
                                <td>${Utils.formatDate(p.manufacturingDate, lang)}</td>
                                <td>${Utils.formatDate(p.expiryDate, lang)}</td>
                                <td>${(p.allergens || []).map(a => I18n.t('traceability.allergen_list.' + a)).join(', ') || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- 2. Temperature Section -->
            <div class="print-sheet-section">
                <h3>2. ${I18n.t('reports.temperature_report')} (${data.tempReadings.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('temperature.control_point')}</th><th>°C</th><th>${I18n.t('app.status')}</th><th>${I18n.t('app.responsible')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.tempReadings.slice(0, 15).map(r => {
                            const pt = data.tempPoints.find(p => p.id === r.pointId);
                            const ok = pt ? (r.temperature >= pt.minTemp && r.temperature <= pt.maxTemp) : true;
                            return `
                                <tr>
                                    <td>${Utils.formatDateTime(r.date, lang)}</td>
                                    <td>${pt ? Utils.sanitize(pt.name) : '-'}</td>
                                    <td><strong>${r.temperature}°C</strong></td>
                                    <td>${ok ? 'CONFORME' : 'NO CONFORME'}</td>
                                    <td>${Utils.sanitize(r.responsible || '-')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- 3. Cleaning Section -->
            <div class="print-sheet-section">
                <h3>3. ${I18n.t('reports.cleaning_report')} (${data.cleaningLogs.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('cleaning.zone_name')}</th><th>${I18n.t('cleaning.cleaned_by')}</th><th>${I18n.t('cleaning.product_used')}</th><th>${I18n.t('cleaning.conformity')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.cleaningLogs.slice(0, 15).map(l => `
                            <tr>
                                <td>${Utils.formatDateTime(l.date, lang)}</td>
                                <td>${Utils.sanitize(l.zoneName || '-')}</td>
                                <td>${Utils.sanitize(l.cleanedBy || '-')}</td>
                                <td>${Utils.sanitize(l.product || '-')}</td>
                                <td>${l.conformity === 'non_conform' ? 'NO CONFORME' : 'CONFORME'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- 4. Water Section -->
            <div class="print-sheet-section">
                <h3>4. ${I18n.t('reports.water_report')} (${data.waterReadings.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('water.sampling_point')}</th><th>Cloro (0.2 - 1.0 mg/L)</th><th>pH</th><th>${I18n.t('app.responsible')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.waterReadings.slice(0, 10).map(w => `
                            <tr>
                                <td>${Utils.formatDate(w.date, lang)}</td>
                                <td>${Utils.sanitize(w.pointName || '-')}</td>
                                <td>${w.chlorine} mg/L</td>
                                <td>${w.ph || '-'}</td>
                                <td>${Utils.sanitize(w.responsible || '-')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- 5. Pest Control -->
            <div class="print-sheet-section">
                <h3>5. ${I18n.t('reports.pest_report')} (${data.pestInspections.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('pest_control.inspector')}</th><th>${I18n.t('pest_control.findings')}</th><th>${I18n.t('pest_control.severity')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.pestInspections.map(pi => `
                            <tr>
                                <td>${Utils.formatDate(pi.date, lang)}</td>
                                <td>${Utils.sanitize(pi.inspector || '-')}</td>
                                <td>${Utils.sanitize(pi.findings || 'Sin actividad')}</td>
                                <td>${I18n.t('pest_control.severity_levels.' + (pi.severity || 'none'))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- 6. Incidents -->
            <div class="print-sheet-section">
                <h3>6. ${I18n.t('reports.incidents_report')} (${data.incidents.length})</h3>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('incidents.incident_title')}</th><th>${I18n.t('incidents.severity')}</th><th>${I18n.t('app.status')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.incidents.map(inc => `
                            <tr>
                                <td>${Utils.formatDate(inc.date, lang)}</td>
                                <td>${Utils.sanitize(inc.title)}</td>
                                <td>${I18n.t('incidents.severity_levels.' + (inc.severity || 'low'))}</td>
                                <td>${I18n.t('incidents.statuses.' + (inc.status || 'open'))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        window.print();
    }

    function printSingleReport(type, user, data) {
        const printContainer = document.getElementById('reports-print-container');
        if (!printContainer) return;
        const lang = I18n.getLang();

        if (type === 'traceability') {
            printContainer.innerHTML = `
                <div class="print-sheet-header">
                    <div>
                        <h1>${I18n.t('reports.traceability_report')}</h1>
                        <p>${Utils.sanitize((user && user.businessName) || '')} — ${Utils.formatDate(Utils.nowISO(), lang)}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr><th>${I18n.t('traceability.product_name')}</th><th>${I18n.t('traceability.batch_number')}</th><th>${I18n.t('traceability.category')}</th><th>${I18n.t('traceability.manufacturing_date')}</th><th>${I18n.t('traceability.expiry_date')}</th><th>${I18n.t('traceability.allergens')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.products.map(p => `
                            <tr>
                                <td><strong>${Utils.sanitize(p.name)}</strong></td>
                                <td>${Utils.sanitize(p.batchNumber || '-')}</td>
                                <td>${p.category ? I18n.t('traceability.categories.' + p.category) : '-'}</td>
                                <td>${Utils.formatDate(p.manufacturingDate, lang)}</td>
                                <td>${Utils.formatDate(p.expiryDate, lang)}</td>
                                <td>${(p.allergens || []).map(a => I18n.t('traceability.allergen_list.' + a)).join(', ') || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (type === 'temperature') {
            printContainer.innerHTML = `
                <div class="print-sheet-header">
                    <div>
                        <h1>${I18n.t('reports.temperature_report')}</h1>
                        <p>${Utils.sanitize((user && user.businessName) || '')} — ${Utils.formatDate(Utils.nowISO(), lang)}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr><th>${I18n.t('app.date')}</th><th>${I18n.t('temperature.control_point')}</th><th>°C</th><th>${I18n.t('app.status')}</th><th>${I18n.t('app.responsible')}</th></tr>
                    </thead>
                    <tbody>
                        ${data.tempReadings.map(r => {
                            const pt = data.tempPoints.find(p => p.id === r.pointId);
                            const ok = pt ? (r.temperature >= pt.minTemp && r.temperature <= pt.maxTemp) : true;
                            return `<tr><td>${Utils.formatDateTime(r.date, lang)}</td><td>${pt ? Utils.sanitize(pt.name) : '-'}</td><td><strong>${r.temperature}°C</strong></td><td>${ok ? 'OK' : 'DESVIACIÓN'}</td><td>${Utils.sanitize(r.responsible || '-')}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            // General print
            printDossier(user, data);
            return;
        }

        window.print();
    }

    return { init, render };
})();
