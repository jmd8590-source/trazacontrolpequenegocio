/* ============================================================
   TrazaControl — Main Application Controller
   SPA Router, Module Loader, Event Orchestrator
   ============================================================ */

const App = (function() {
    'use strict';

    // Module registry
    const modules = {};
    let currentModule = null;
    let sidebarCollapsed = false;
    let mobileMenuOpen = false;

    // Theme Management
    let currentTheme = localStorage.getItem('trazacontrol_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // SVG Icons (inline for performance)
    const ICONS = {
        dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
        traceability: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 5H2v7l6.29 6.29a1 1 0 001.42 0l5.58-5.58a1 1 0 000-1.42L9 5z"/><circle cx="6" cy="9" r="1.2"/><path d="M15 5l6.29 6.29a1 1 0 010 1.42L18 16"/></svg>',
        temperature: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/></svg>',
        pest_control: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22c-4.97 0-9-2.24-9-5v-1c0-.34.04-.67.12-1M21 16v1c0 2.76-4.03 5-9 5"/><path d="M3.12 15A6.5 6.5 0 0112 8.5 6.5 6.5 0 0120.88 15"/><circle cx="12" cy="6" r="2"/><path d="M10 4L7 2M14 4l3-2M12 8v3"/></svg>',
        cleaning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
        incidents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        stock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        recipes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        suppliers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        goods_entry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4a2 2 0 012 2v6a2 2 0 01-2 2h-4"/><polyline points="8 12 8 7 12 9.5 8 12"/><line x1="16" y1="12" x2="22" y2="12"/></svg>',
        water: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z"/></svg>',
        reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
        logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
        chevron_left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 5H2v7l6.29 6.29a1 1 0 001.42 0l5.58-5.58a1 1 0 000-1.42L9 5z"/><circle cx="6" cy="9" r="1"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>',
        sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
        moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
    };

    // Navigation items configuration
    const NAV_ITEMS = [
        { id: 'dashboard', icon: 'dashboard', labelKey: 'nav.dashboard', section: 'main' },
        { id: 'traceability', icon: 'traceability', labelKey: 'nav.traceability', section: 'control' },
        { id: 'temperature', icon: 'temperature', labelKey: 'nav.temperature', section: 'control' },
        { id: 'pest_control', icon: 'pest_control', labelKey: 'nav.pest_control', section: 'control' },
        { id: 'cleaning', icon: 'cleaning', labelKey: 'nav.cleaning', section: 'control' },
        { id: 'water', icon: 'water', labelKey: 'nav.water', section: 'control' },
        { id: 'incidents', icon: 'incidents', labelKey: 'nav.incidents', section: 'control' },
        { id: 'stock', icon: 'stock', labelKey: 'nav.stock', section: 'management' },
        { id: 'recipes', icon: 'recipes', labelKey: 'nav.recipes', section: 'management' },
        { id: 'suppliers', icon: 'suppliers', labelKey: 'nav.suppliers', section: 'management' },
        { id: 'goods_entry', icon: 'goods_entry', labelKey: 'nav.goods_entry', section: 'management' },
        { id: 'reports', icon: 'reports', labelKey: 'nav.reports', section: 'reports' }
    ];

    // Bottom nav items (mobile - most important 5)
    const BOTTOM_NAV_ITEMS = ['dashboard', 'traceability', 'temperature', 'stock', 'more'];

    // Initialize the application
    async function init() {
        try {
            // Apply theme
            applyTheme(currentTheme);

            // Init database
            await TrazaDB.init();

            // Init i18n
            await I18n.init();

            // Init security
            Security.init();

            // Init auth
            await Auth.init();

            // Build UI structures
            buildSidebar();
            buildBottomNav();
            buildModuleContainers();

            // Initialize all registered modules
            if (typeof DashboardModule !== 'undefined') DashboardModule.init();
            if (typeof TraceabilityModule !== 'undefined') TraceabilityModule.init();
            if (typeof TemperatureModule !== 'undefined') TemperatureModule.init();
            if (typeof PestControlModule !== 'undefined') PestControlModule.init();
            if (typeof CleaningModule !== 'undefined') CleaningModule.init();
            if (typeof WaterModule !== 'undefined') WaterModule.init();
            if (typeof IncidentsModule !== 'undefined') IncidentsModule.init();
            if (typeof StockModule !== 'undefined') StockModule.init();
            if (typeof RecipesModule !== 'undefined') RecipesModule.init();
            if (typeof SuppliersModule !== 'undefined') SuppliersModule.init();
            if (typeof GoodsEntryModule !== 'undefined') GoodsEntryModule.init();
            if (typeof ReportsModule !== 'undefined') ReportsModule.init();

            // Setup event listeners
            setupEventListeners();

            // Check auth and show appropriate screen
            if (Auth.isLoggedIn()) {
                showApp();
            } else {
                showAuth();
            }
        } catch (error) {
            console.error('[App] Initialization error:', error);
        }
    }

    // Show auth screen
    function showAuth(view) {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-container').classList.remove('active');

        if (view === 'register') {
            document.getElementById('login-form-container').classList.add('hidden');
            document.getElementById('register-form-container').classList.remove('hidden');
        } else {
            document.getElementById('login-form-container').classList.remove('hidden');
            document.getElementById('register-form-container').classList.add('hidden');
        }

        // Live translate auth screen elements
        I18n.translatePage();
    }

    // Show main app
    function showApp() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('app-container').classList.add('active');

        // Update user info in sidebar
        updateUserInfo();

        // Background cloud sync from Supabase for real accounts
        if (typeof Auth !== 'undefined' && !Auth.isDemoMode() && Auth.getUserId()) {
            TrazaDB.syncFromCloud(Auth.getUserId()).catch(() => {});
        }

        // Navigate to dashboard
        navigateTo('dashboard');
    }

    // Update user info in UI
    function updateUserInfo() {
        const user = Auth.getUser();
        if (!user) return;

        const nameEl = document.getElementById('sidebar-user-name');
        const emailEl = document.getElementById('sidebar-user-email');
        const avatarEl = document.getElementById('sidebar-user-avatar');
        const welcomeEl = document.getElementById('dashboard-welcome');

        if (nameEl) nameEl.textContent = user.businessName || user.ownerName || '';
        if (emailEl) emailEl.textContent = user.email || '';
        if (avatarEl) avatarEl.textContent = Utils.getInitials(user.businessName || user.ownerName || '');
        if (welcomeEl) welcomeEl.textContent = I18n.t('dashboard.welcome', { name: user.ownerName || '' });
    }

    // Navigate to a module
    function navigateTo(moduleId) {
        if (!moduleId) moduleId = 'dashboard';

        // Update active nav items across sidebar and mobile bottom nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.module === moduleId);
        });
        document.querySelectorAll('.bottom-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.module === moduleId);
        });

        // Update top page title
        const navItem = NAV_ITEMS.find(n => n.id === moduleId);
        if (navItem) {
            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.textContent = I18n.t(navItem.labelKey);
        }

        // Strictly isolate central screen: Hide ALL other module pages
        document.querySelectorAll('.module-page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });

        // Show ONLY the requested module page
        const targetPage = document.getElementById(`module-${moduleId}`);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
        }

        // Scroll central content container to top
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // Load module data
        if (modules[moduleId] && typeof modules[moduleId].render === 'function') {
            modules[moduleId].render();
        }

        currentModule = moduleId;

        // Update URL hash
        window.location.hash = moduleId;

        // Close mobile menu if open
        closeMobileMenu();
    }

    // Register a module
    function registerModule(id, module) {
        modules[id] = module;
        if (typeof module.init === 'function') {
            module.init();
        }
    }

    // Build sidebar navigation (Dynamic & Animated Sections)
    function buildSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        let currentSection = '';
        let html = '';

        NAV_ITEMS.forEach(item => {
            if (item.section !== currentSection) {
                currentSection = item.section;
                if (currentSection && currentSection !== 'main') {
                    const sectionKey = `nav.sections.${currentSection}`;
                    html += `
                        <div class="sidebar-section-header">
                            <span class="sidebar-section-accent"></span>
                            <span class="sidebar-section-label" data-i18n="${sectionKey}">${I18n.t(sectionKey)}</span>
                        </div>
                    `;
                }
            }

            html += `
                <button type="button" class="nav-item ${item.id === currentModule ? 'active' : ''}" data-module="${item.id}" onclick="App.navigateTo('${item.id}')">
                    <span class="nav-item-icon">${ICONS[item.icon] || ''}</span>
                    <span class="nav-item-text" data-i18n="${item.labelKey}">${I18n.t(item.labelKey)}</span>
                </button>
            `;
        });

        nav.innerHTML = html;
    }

    // Build bottom navigation (mobile)
    function buildBottomNav() {
        const bottomNav = document.getElementById('bottom-nav-items');
        if (!bottomNav) return;

        let html = '';

        BOTTOM_NAV_ITEMS.forEach(itemId => {
            if (itemId === 'more') {
                html += `
                    <button type="button" class="bottom-nav-item bottom-nav-item-more" data-module="more" id="bottom-nav-more" onclick="App.toggleMobileMenu()">
                        ${ICONS.more}
                        <span data-i18n="nav.more">${I18n.t('nav.more') || 'Más'}</span>
                    </button>
                `;
            } else {
                const navItem = NAV_ITEMS.find(n => n.id === itemId);
                if (navItem) {
                    html += `
                        <button type="button" class="bottom-nav-item ${itemId === currentModule ? 'active' : ''}" data-module="${itemId}" onclick="App.navigateTo('${itemId}')">
                            ${ICONS[navItem.icon] || ''}
                            <span data-i18n="${navItem.labelKey}">${I18n.t(navItem.labelKey)}</span>
                        </button>
                    `;
                }
            }
        });

        bottomNav.innerHTML = html;
    }

    // Build module containers
    function buildModuleContainers() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        let html = '';
        NAV_ITEMS.forEach(item => {
            html += `<div id="module-${item.id}" class="module-page"></div>`;
        });
        contentArea.innerHTML = html;
    }

    // Setup all event listeners
    function setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }

        // Show register
        Utils.delegate(document.body, '#show-register', 'click', () => showAuth('register'));
        Utils.delegate(document.body, '#show-login', 'click', () => showAuth('login'));

        // Demo button
        Utils.delegate(document.body, '#demo-btn', 'click', handleDemo);

        // Mobile menu & sidebar overlay
        Utils.delegate(document.body, '#mobile-menu-btn', 'click', toggleMobileMenu);
        Utils.delegate(document.body, '#sidebar-overlay', 'click', closeMobileMenu);
        Utils.delegate(document.body, '#sidebar-toggle', 'click', toggleSidebar);

        // Theme toggle (Dark / Light Mode)
        Utils.delegate(document.body, '#theme-toggle-btn, #auth-theme-toggle-btn', 'click', toggleTheme);

        // Logout
        Utils.delegate(document.body, '#logout-btn, #header-logout-btn', 'click', async () => {
            Utils.showConfirm(
                I18n.t('auth.logout') || 'Cerrar sesión',
                '¿Estás seguro de que deseas salir y cerrar tu sesión?',
                async () => {
                    await Auth.logout();
                    showAuth();
                    Utils.showToast('info', 'Sesión cerrada correctamente');
                },
                I18n.t.bind(I18n),
                {
                    confirmText: I18n.t('app.exit') || 'Salir',
                    cancelText: I18n.t('app.cancel') || 'Cancelar',
                    confirmClass: 'btn-danger'
                }
            );
        });

        // Hash change
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && NAV_ITEMS.find(n => n.id === hash)) {
                navigateTo(hash);
            }
        });
    }

    // Change Language directly (Instant & Global)
    async function changeLanguage(lang) {
        if (!lang) return;
        await I18n.setLanguage(lang);
        buildSidebar();
        buildBottomNav();
        updateUserInfo();
        I18n.translatePage();

        // Re-render current module if in app
        if (currentModule && modules[currentModule]) {
            const navItem = NAV_ITEMS.find(n => n.id === currentModule);
            if (navItem) {
                const titleEl = document.getElementById('page-title');
                if (titleEl) titleEl.textContent = I18n.t(navItem.labelKey);
            }
            if (typeof modules[currentModule].render === 'function') {
                await modules[currentModule].render();
            }
        }
    }

    // Toggle Theme (Dark / Light)
    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        localStorage.setItem('trazacontrol_theme', currentTheme);
    }

    // Apply Theme to DOM
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const iconSvg = theme === 'dark' ? ICONS.sun : ICONS.moon;
        const titleText = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';

        document.querySelectorAll('#theme-toggle-btn, #auth-theme-toggle-btn').forEach(btn => {
            btn.innerHTML = iconSvg;
            btn.setAttribute('title', titleText);
            btn.setAttribute('aria-label', titleText);
        });
    }

    // Handle login
    async function handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (!email || !password) {
            if (errorEl) errorEl.textContent = I18n.t('app.error_required');
            return;
        }

        try {
            await Auth.login(email, password);
            if (errorEl) errorEl.textContent = '';
            showApp();
            Utils.showToast('success', I18n.t('auth.welcome_back'));
        } catch (error) {
            if (errorEl) {
                if (error.message === 'invalid_credentials') {
                    errorEl.textContent = I18n.t('auth.invalid_credentials');
                } else if (error.message.startsWith('rate_limited')) {
                    const seconds = error.message.split(':')[1];
                    errorEl.textContent = `Demasiados intentos. Espera ${seconds}s`;
                } else {
                    errorEl.textContent = I18n.t('app.error_generic');
                }
            }
        }
    }

    // Handle register
    async function handleRegister(e) {
        e.preventDefault();

        const data = {
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            businessName: document.getElementById('register-business').value,
            businessType: document.getElementById('register-type').value,
            ownerName: document.getElementById('register-name').value
        };

        const confirmPassword = document.getElementById('register-confirm-password').value;
        const errorEl = document.getElementById('register-error');

        if (!data.email || !data.password || !data.businessName || !data.ownerName) {
            if (errorEl) errorEl.textContent = I18n.t('app.error_required');
            return;
        }

        if (!Utils.isValidPassword(data.password)) {
            if (errorEl) errorEl.textContent = I18n.t('auth.password_requirements');
            return;
        }

        if (data.password !== confirmPassword) {
            if (errorEl) errorEl.textContent = I18n.t('auth.password_mismatch');
            return;
        }

        try {
            await Auth.register(data);
            if (errorEl) errorEl.textContent = '';
            showApp();
            Utils.showToast('success', I18n.t('auth.welcome_new'));
        } catch (error) {
            if (errorEl) {
                if (error.message === 'email_exists') {
                    errorEl.textContent = I18n.t('auth.email_exists');
                } else {
                    errorEl.textContent = I18n.t('app.error_generic');
                }
            }
        }
    }

    // Handle demo
    async function handleDemo() {
        try {
            await Auth.startDemo();
            showApp();
            Utils.showToast('info', I18n.t('app.demo_banner'));
        } catch (error) {
            console.error('[App] Demo error:', error);
            Utils.showToast('error', I18n.t('app.error_generic'));
        }
    }

    // Toggle mobile menu
    function toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar || !overlay) return;

        mobileMenuOpen = !mobileMenuOpen;

        if (mobileMenuOpen) {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('mobile-open');
            overlay.style.display = 'block';
        } else {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('mobile-open');
            overlay.style.display = 'none';
        }
    }

    // Close mobile menu
    function closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (!sidebar || !overlay) return;

        mobileMenuOpen = false;
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('mobile-open');
        overlay.style.display = 'none';
    }

    // Toggle sidebar collapse (desktop)
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebarCollapsed = !sidebarCollapsed;
        sidebar.classList.toggle('collapsed', sidebarCollapsed);
        localStorage.setItem('trazacontrol_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
    }

    // Get icon SVG
    function getIcon(name) {
        return ICONS[name] || '';
    }

    return {
        init,
        showAuth,
        showApp,
        navigateTo,
        registerModule,
        changeLanguage,
        toggleMobileMenu,
        closeMobileMenu,
        getIcon,
        buildSidebar,
        buildBottomNav,
        buildModuleContainers,
        toggleTheme,
        applyTheme,
        ICONS,
        NAV_ITEMS
    };
})();

// Boot the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
