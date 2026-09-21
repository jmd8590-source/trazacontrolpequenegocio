/* ============================================================
   TrazaControl — Dashboard Module
   Main panel with KPIs, charts, alerts, and quick actions
   ============================================================ */

const DashboardModule = (function() {
    'use strict';

    function init() {
        App.registerModule('dashboard', { render });
    }

    async function render() {
        const container = document.getElementById('module-dashboard');
        if (!container) return;

        const userId = Auth.getUserId();
        if (!userId) return;

        // Gather data for KPIs
        const [products, tempReadings, incidents, stockItems, cleaningLogs, waterReadings, tempPoints] = await Promise.all([
            TrazaDB.getByUser('products', userId),
            TrazaDB.getByUser('temperature_readings', userId),
            TrazaDB.getByUser('incidents', userId),
            TrazaDB.getByUser('stock_items', userId),
            TrazaDB.getByUser('cleaning_logs', userId),
            TrazaDB.getByUser('water_readings', userId),
            TrazaDB.getByUser('temperature_points', userId)
        ]);

        // Calculate KPIs
        const activeProducts = products.length;
        const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress').length;
        const lowStockItems = stockItems.filter(i => i.currentStock !== undefined && i.minStock !== undefined && i.currentStock <= i.minStock).length;

        // Temperature check: last readings in range?
        const tempOk = calculateTempOk(tempReadings, tempPoints);

        // Compliance score
        const compliance = calculateCompliance(tempReadings, cleaningLogs, waterReadings, incidents);

        // Alerts
        const alerts = generateAlerts(tempReadings, tempPoints, stockItems, incidents, cleaningLogs);

        // Recent activity
        const recentActivity = generateRecentActivity(tempReadings, cleaningLogs, incidents, products);

        const user = Auth.getUser();

        container.innerHTML = `
            <div class="module-header">
                <h2 id="dashboard-welcome">${I18n.t('dashboard.welcome', { name: user ? user.ownerName || '' : '' })}</h2>
                <p>${I18n.t('dashboard.subtitle')}</p>
            </div>

            <!-- KPI Cards -->
            <div class="dashboard-kpis stagger-grid">
                <div class="card card-kpi kpi-blue hover-lift">
                    <div class="kpi-icon">${App.getIcon('traceability')}</div>
                    <div class="kpi-value">${activeProducts}</div>
                    <div class="kpi-label">${I18n.t('dashboard.kpi_products')}</div>
                </div>
                <div class="card card-kpi kpi-red hover-lift">
                    <div class="kpi-icon">${App.getIcon('incidents')}</div>
                    <div class="kpi-value">${openIncidents}</div>
                    <div class="kpi-label">${I18n.t('dashboard.kpi_incidents_open')}</div>
                </div>
                <div class="card card-kpi kpi-green hover-lift">
                    <div class="kpi-icon">${App.getIcon('temperature')}</div>
                    <div class="kpi-value">${tempOk}%</div>
                    <div class="kpi-label">${I18n.t('dashboard.kpi_temp_ok')}</div>
                </div>
                <div class="card card-kpi kpi-orange hover-lift">
                    <div class="kpi-icon">${App.getIcon('stock')}</div>
                    <div class="kpi-value">${lowStockItems}</div>
                    <div class="kpi-label">${I18n.t('dashboard.kpi_stock_low')}</div>
                </div>
                <div class="card card-kpi kpi-purple hover-lift">
                    <div class="kpi-icon">${App.getIcon('reports')}</div>
                    <div class="kpi-value">${compliance}%</div>
                    <div class="kpi-label">${I18n.t('dashboard.kpi_compliance')}</div>
                </div>
            </div>

            <!-- Main Grid -->
            <div class="dashboard-grid">
                <!-- Left Column -->
                <div>
                    <!-- Alerts -->
                    <div class="card mb-6">
                        <div class="card-header">
                            <h4>${I18n.t('dashboard.active_alerts')}</h4>
                            <span class="badge badge-${alerts.length > 0 ? 'danger' : 'success'} badge-dot">${alerts.length}</span>
                        </div>
                        <div class="card-body">
                            ${alerts.length > 0 ? `
                                <div class="alert-list">
                                    ${alerts.slice(0, 5).map(a => `
                                        <div class="alert-item alert-${a.type}">
                                            <span>${a.icon}</span>
                                            <span>${Utils.sanitize(a.text)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="empty-state" style="padding: 24px;">
                                    <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                                    <div class="text-sm text-secondary">${I18n.t('dashboard.no_alerts')}</div>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="card">
                        <div class="card-header">
                            <h4>${I18n.t('dashboard.recent_activity')}</h4>
                        </div>
                        <div class="card-body">
                            ${recentActivity.length > 0 ? `
                                <div class="activity-list">
                                    ${recentActivity.slice(0, 8).map(a => `
                                        <div class="activity-item">
                                            <div class="activity-icon ${a.iconClass}">${a.icon}</div>
                                            <div class="activity-content">
                                                <div class="activity-text">${Utils.sanitize(a.text)}</div>
                                                <div class="activity-time">${Utils.timeAgo(a.date, I18n.t.bind(I18n))}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="empty-state" style="padding: 24px;">
                                    <div class="text-sm text-secondary">${I18n.t('app.no_data')}</div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <!-- Right Column -->
                <div>
                    <!-- Compliance Score -->
                    <div class="card mb-6">
                        <div class="card-header">
                            <h4>${I18n.t('dashboard.compliance_title')}</h4>
                        </div>
                        <div class="card-body text-center">
                            <div style="font-size: 48px; font-weight: 800; color: ${compliance >= 80 ? 'var(--success)' : compliance >= 50 ? 'var(--warning)' : 'var(--danger)'};">${compliance}%</div>
                            <p class="text-sm mt-2">${I18n.t('dashboard.compliance_desc')}</p>
                            <div class="progress progress-lg mt-4">
                                <div class="progress-fill ${compliance >= 80 ? 'success' : compliance >= 50 ? 'warning' : 'danger'}" style="width: ${compliance}%;"></div>
                            </div>
                            <div class="mt-4">
                                <span class="badge ${compliance >= 80 ? 'badge-success' : 'badge-warning'}">
                                    ${compliance >= 80 ? I18n.t('dashboard.inspection_ready') : I18n.t('dashboard.inspection_not_ready')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Actions -->
                    <div class="card">
                        <div class="card-header">
                            <h4>${I18n.t('dashboard.quick_actions')}</h4>
                        </div>
                        <div class="card-body">
                            <div class="quick-action-grid">
                                <button class="quick-action-btn" onclick="App.navigateTo('temperature')">
                                    ${App.getIcon('temperature')}
                                    <span>${I18n.t('dashboard.quick_add_temp')}</span>
                                </button>
                                <button class="quick-action-btn" onclick="App.navigateTo('goods_entry')">
                                    ${App.getIcon('goods_entry')}
                                    <span>${I18n.t('dashboard.quick_add_entry')}</span>
                                </button>
                                <button class="quick-action-btn" onclick="App.navigateTo('cleaning')">
                                    ${App.getIcon('cleaning')}
                                    <span>${I18n.t('dashboard.quick_add_cleaning')}</span>
                                </button>
                                <button class="quick-action-btn" onclick="App.navigateTo('incidents')">
                                    ${App.getIcon('incidents')}
                                    <span>${I18n.t('dashboard.quick_add_incident')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function calculateTempOk(readings, points) {
        if (readings.length === 0) return 100;

        // Get most recent reading for each point
        const latestByPoint = {};
        readings.forEach(r => {
            if (!latestByPoint[r.pointId] || new Date(r.date) > new Date(latestByPoint[r.pointId].date)) {
                latestByPoint[r.pointId] = r;
            }
        });

        let ok = 0;
        let total = 0;

        Object.values(latestByPoint).forEach(reading => {
            const point = points.find(p => p.id === reading.pointId);
            if (point) {
                total++;
                if (reading.temperature >= point.minTemp && reading.temperature <= point.maxTemp) {
                    ok++;
                }
            }
        });

        return total === 0 ? 100 : Math.round((ok / total) * 100);
    }

    function calculateCompliance(tempReadings, cleaningLogs, waterReadings, incidents) {
        let score = 0;
        let total = 0;

        // Temperature: at least 1 reading today
        total++;
        const today = Utils.todayISO();
        if (tempReadings.some(r => r.date && r.date.startsWith(today))) score++;

        // Cleaning: at least 1 log today
        total++;
        if (cleaningLogs.some(l => l.date && l.date.startsWith(today))) score++;

        // Water: at least 1 reading this week
        total++;
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        if (waterReadings.some(r => r.date && r.date > weekAgo)) score++;

        // Incidents: no open critical incidents
        total++;
        if (!incidents.some(i => i.severity === 'critical' && (i.status === 'open' || i.status === 'in_progress'))) score++;

        // Incidents: all resolved
        total++;
        const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'in_progress');
        if (openIncidents.length === 0) score++;

        return total === 0 ? 100 : Math.round((score / total) * 100);
    }

    function generateAlerts(tempReadings, tempPoints, stockItems, incidents, cleaningLogs) {
        const alerts = [];

        // Temperature alerts
        tempPoints.forEach(point => {
            const readings = tempReadings.filter(r => r.pointId === point.id);
            if (readings.length > 0) {
                const latest = readings.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                if (latest.temperature > point.maxTemp) {
                    alerts.push({
                        type: 'danger',
                        icon: '🌡️',
                        text: I18n.t('dashboard.alert_temp_high', { location: point.name })
                    });
                } else if (latest.temperature < point.minTemp) {
                    alerts.push({
                        type: 'warning',
                        icon: '🌡️',
                        text: I18n.t('dashboard.alert_temp_low', { location: point.name })
                    });
                }
            }
        });

        // Stock alerts
        stockItems.forEach(item => {
            if (item.currentStock !== undefined && item.minStock !== undefined && item.currentStock <= item.minStock) {
                alerts.push({
                    type: 'warning',
                    icon: '📦',
                    text: I18n.t('dashboard.alert_stock_low', { product: item.name })
                });
            }
            // Expiry alerts
            if (item.expiry) {
                const days = Utils.daysUntil(item.expiry);
                if (days !== null && days <= 3 && days >= 0) {
                    alerts.push({
                        type: 'danger',
                        icon: '⏰',
                        text: I18n.t('dashboard.alert_expiry', { product: item.name })
                    });
                }
            }
        });

        // Incident alerts
        incidents.filter(i => i.status === 'open').forEach(inc => {
            alerts.push({
                type: 'danger',
                icon: '⚠️',
                text: I18n.t('dashboard.alert_incident', { title: inc.title || '' })
            });
        });

        return alerts;
    }

    function generateRecentActivity(tempReadings, cleaningLogs, incidents, products) {
        const activities = [];

        tempReadings.slice(-3).forEach(r => {
            activities.push({
                text: `${I18n.t('temperature.new_reading')}: ${r.temperature}°C`,
                date: r.createdAt || r.date,
                icon: '🌡️',
                iconClass: 'temp'
            });
        });

        cleaningLogs.slice(-3).forEach(l => {
            activities.push({
                text: `${I18n.t('cleaning.new_log')}: ${l.zoneName || ''}`,
                date: l.createdAt || l.date,
                icon: '🧹',
                iconClass: 'cleaning'
            });
        });

        incidents.slice(-2).forEach(i => {
            activities.push({
                text: `${I18n.t('incidents.new_incident')}: ${i.title || ''}`,
                date: i.createdAt || i.date,
                icon: '⚠️',
                iconClass: 'incident'
            });
        });

        products.slice(-2).forEach(p => {
            activities.push({
                text: `${I18n.t('traceability.new_product')}: ${p.name || ''}`,
                date: p.createdAt,
                icon: '📦',
                iconClass: 'stock'
            });
        });

        return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return { init, render };
})();
