/* ============================================================
   TrazaControl — Authentication Module
   User registration, login, session management
   ============================================================ */

const Auth = (function() {
    'use strict';

    const SESSION_KEY = 'trazacontrol_session';
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    let currentUser = null;
    let inactivityTimer = null;
    let isDemo = false;

    // Initialize auth
    async function init() {
        await TrazaDB.init();
        checkSession();
        setupInactivityMonitor();
    }

    // Register a new user
    async function register(data) {
        const { email, password, businessName, businessType, ownerName } = data;

        // Check if email exists
        const users = await TrazaDB.getAll('users');
        const existing = users.find(u => u.email === email.toLowerCase());
        if (existing) {
            throw new Error('email_exists');
        }

        // Hash password
        const salt = Utils.generateSalt();
        const hashedPassword = await Utils.hashPassword(password, salt);

        // Create user
        const user = await TrazaDB.create('users', {
            email: email.toLowerCase(),
            password: hashedPassword,
            salt: salt,
            businessName: businessName,
            businessType: businessType,
            ownerName: ownerName,
            lang: I18n.getLang(),
            createdAt: Utils.nowISO()
        });

        // Start session
        startSession(user);
        return user;
    }

    // Login
    async function login(email, password) {
        // Rate limiting
        if (!Security.rateLimiter.check(email)) {
            const remaining = Security.rateLimiter.getRemainingTime(email);
            throw new Error(`rate_limited:${remaining}`);
        }

        // Find user
        const users = await TrazaDB.getAll('users');
        const user = users.find(u => u.email === email.toLowerCase());
        if (!user) {
            throw new Error('invalid_credentials');
        }

        // Verify password
        const hashedPassword = await Utils.hashPassword(password, user.salt);
        if (hashedPassword !== user.password) {
            throw new Error('invalid_credentials');
        }

        // Reset rate limiter on success
        Security.rateLimiter.reset(email);

        // Start session
        startSession(user);
        return user;
    }

    // Demo mode
    async function startDemo() {
        isDemo = true;

        // Create or get demo user
        const users = await TrazaDB.getAll('users');
        let demoUser = users.find(u => u.email === 'demo@trazacontrol.com');

        if (!demoUser) {
            demoUser = await TrazaDB.create('users', {
                email: 'demo@trazacontrol.com',
                password: 'demo',
                salt: '',
                businessName: 'Panadería Artesanal Demo',
                businessType: 'bakery',
                ownerName: 'Usuario Demo',
                isDemo: true,
                lang: I18n.getLang()
            });
        }

        // Load demo data
        await DemoData.load(demoUser.id);

        startSession(demoUser);
        return demoUser;
    }

    // Start a session
    function startSession(user) {
        currentUser = {
            id: user.id,
            email: user.email,
            businessName: user.businessName,
            businessType: user.businessType,
            ownerName: user.ownerName,
            isDemo: user.isDemo || false
        };

        isDemo = user.isDemo || false;

        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            userId: user.id,
            loginTime: Date.now(),
            isDemo: isDemo
        }));

        resetInactivityTimer();
    }

    // Check for existing session
    function checkSession() {
        try {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (!session) return false;

            const sessionData = JSON.parse(session);
            isDemo = sessionData.isDemo || false;

            // Load user data async
            TrazaDB.read('users', sessionData.userId).then(user => {
                if (user) {
                    currentUser = {
                        id: user.id,
                        email: user.email,
                        businessName: user.businessName,
                        businessType: user.businessType,
                        ownerName: user.ownerName,
                        isDemo: user.isDemo || false
                    };
                } else {
                    logout();
                }
            });

            return true;
        } catch {
            return false;
        }
    }

    // Logout
    async function logout() {
        // If demo, clean up demo data
        if (isDemo && currentUser) {
            try {
                await TrazaDB.deleteUserData(currentUser.id);
                await TrazaDB.remove('users', currentUser.id);
            } catch(e) {
                console.error('Demo cleanup error:', e);
            }
        }

        currentUser = null;
        isDemo = false;
        sessionStorage.removeItem(SESSION_KEY);
        clearInactivityTimer();
    }

    // Get current user
    function getUser() {
        return currentUser;
    }

    // Get current user ID
    function getUserId() {
        return currentUser ? currentUser.id : null;
    }

    // Check if logged in
    function isLoggedIn() {
        return currentUser !== null;
    }

    // Check if demo mode
    function isDemoMode() {
        return isDemo;
    }

    // Update user profile
    async function updateProfile(data) {
        if (!currentUser) return null;

        const user = await TrazaDB.read('users', currentUser.id);
        if (!user) return null;

        const updated = {
            ...user,
            businessName: data.businessName || user.businessName,
            businessType: data.businessType || user.businessType,
            ownerName: data.ownerName || user.ownerName,
            phone: data.phone || user.phone,
            address: data.address || user.address
        };

        await TrazaDB.update('users', updated);

        currentUser = {
            ...currentUser,
            businessName: updated.businessName,
            businessType: updated.businessType,
            ownerName: updated.ownerName
        };

        return currentUser;
    }

    // Change password
    async function changePassword(currentPassword, newPassword) {
        if (!currentUser) return false;

        const user = await TrazaDB.read('users', currentUser.id);
        if (!user) return false;

        // Verify current password
        const hashedCurrent = await Utils.hashPassword(currentPassword, user.salt);
        if (hashedCurrent !== user.password) {
            throw new Error('invalid_current_password');
        }

        // Set new password
        const newSalt = Utils.generateSalt();
        const hashedNew = await Utils.hashPassword(newPassword, newSalt);

        user.password = hashedNew;
        user.salt = newSalt;
        await TrazaDB.update('users', user);

        return true;
    }

    // Inactivity monitoring
    function setupInactivityMonitor() {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetInactivityTimer, { passive: true });
        });
    }

    function resetInactivityTimer() {
        clearInactivityTimer();
        if (!currentUser) return;

        inactivityTimer = setTimeout(() => {
            if (currentUser) {
                logout();
                if (typeof App !== 'undefined') {
                    App.showAuth();
                    Utils.showToast('warning', I18n.t('auth.auto_logout'));
                }
            }
        }, INACTIVITY_TIMEOUT);
    }

    function clearInactivityTimer() {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    return {
        init,
        register,
        login,
        startDemo,
        logout,
        getUser,
        getUserId,
        isLoggedIn,
        isDemoMode,
        updateProfile,
        changePassword,
        checkSession
    };
})();
