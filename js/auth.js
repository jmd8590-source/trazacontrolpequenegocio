/* ============================================================
   TrazaControl — Authentication Module
   User registration, login, session management & Supabase Cloud Sync
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
        await checkSession();
        setupInactivityMonitor();
        setupSupabaseAuthListener();
    }

    // Set up real-time listener for Supabase auth events
    function setupSupabaseAuthListener() {
        try {
            const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
            if (supabase && supabase.auth) {
                supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_OUT') {
                        if (!isDemo && currentUser) {
                            currentUser = null;
                            sessionStorage.removeItem(SESSION_KEY);
                        }
                    } else if (event === 'PASSWORD_RECOVERY') {
                        Utils.showToast('info', 'Por favor, introduce tu nueva contraseña.');
                    }
                });
            }
        } catch (e) {
            console.warn('[Auth] Supabase listener warning:', e);
        }
    }

    // Register a new user
    async function register(data) {
        const { email, password, businessName, businessType, ownerName } = data;
        const normalizedEmail = email.toLowerCase().trim();

        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        let supabaseUser = null;

        // 1. Attempt Supabase Auth Sign Up if online & configured
        if (supabase) {
            try {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password: password,
                    options: {
                        data: {
                            businessName: businessName,
                            businessType: businessType,
                            ownerName: ownerName,
                            role: 'user',
                            lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es'
                        }
                    }
                });

                if (authError) {
                    // If error is user already registered
                    if (authError.message && (authError.message.includes('already') || authError.status === 422)) {
                        throw new Error('email_exists');
                    }
                    console.warn('[Auth] Supabase sign up notice:', authError.message);
                } else if (authData && authData.user) {
                    supabaseUser = authData.user;

                    // Upsert profile in Supabase profiles table
                    try {
                        await supabase.from('profiles').upsert({
                            id: supabaseUser.id,
                            email: normalizedEmail,
                            business_name: businessName,
                            business_type: businessType,
                            owner_name: ownerName,
                            role: 'user',
                            lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es',
                            updated_at: new Date().toISOString()
                        });
                    } catch (profErr) {
                        console.warn('[Auth] Profile upsert warning:', profErr);
                    }
                }
            } catch (err) {
                if (err.message === 'email_exists') throw err;
                console.warn('[Auth] Supabase sign up error fallback to local:', err.message);
            }
        }

        // 2. Check Local DB if email exists
        const users = await TrazaDB.getAll('users');
        const existing = users.find(u => u.email === normalizedEmail);
        if (existing && !supabaseUser) {
            throw new Error('email_exists');
        }

        // 3. Local Hash & Cache
        const salt = Utils.generateSalt();
        const hashedPassword = await Utils.hashPassword(password, salt);

        const localRecord = {
            id: supabaseUser ? supabaseUser.id : (existing ? existing.id : TrazaDB.generateId()),
            email: normalizedEmail,
            password: hashedPassword,
            salt: salt,
            businessName: businessName,
            businessType: businessType,
            ownerName: ownerName,
            role: 'user',
            lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es',
            createdAt: Utils.nowISO(),
            supabaseSynced: Boolean(supabaseUser)
        };

        if (existing) {
            await TrazaDB.update('users', localRecord);
        } else {
            await TrazaDB.create('users', localRecord);
        }

        // 4. Start Session
        startSession(localRecord);
        return localRecord;
    }

    // Login
    async function login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();

        // Rate limiting
        if (typeof Security !== 'undefined' && Security.rateLimiter && !Security.rateLimiter.check(normalizedEmail)) {
            const remaining = Security.rateLimiter.getRemainingTime(normalizedEmail);
            throw new Error(`rate_limited:${remaining}`);
        }

        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        let loggedUser = null;

        // 1. Attempt Supabase Auth Login
        if (supabase) {
            try {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: password
                });

                if (!authError && authData && authData.user) {
                    const sbUser = authData.user;
                    let profileData = null;

                    // Fetch profile info from profiles table
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', sbUser.id)
                            .single();
                        profileData = profile;
                    } catch (e) {
                        console.warn('[Auth] Profile fetch warning:', e);
                    }

                    const meta = sbUser.user_metadata || {};
                    const isAdmin = (profileData && profileData.role === 'admin') || 
                                    (meta.role === 'admin') || 
                                    normalizedEmail.includes('admin');

                    loggedUser = {
                        id: sbUser.id,
                        email: sbUser.email,
                        businessName: (profileData && profileData.business_name) || meta.businessName || 'Empresa TrazaControl',
                        businessType: (profileData && profileData.business_type) || meta.businessType || 'artisan',
                        ownerName: (profileData && profileData.owner_name) || meta.ownerName || (isAdmin ? 'Administrador' : 'Usuario'),
                        role: isAdmin ? 'admin' : 'user',
                        isDemo: false,
                        supabaseSynced: true
                    };

                    // Sync into local DB for offline caching
                    const existingLocal = await TrazaDB.read('users', sbUser.id);
                    if (existingLocal) {
                        await TrazaDB.update('users', { ...existingLocal, ...loggedUser });
                    } else {
                        await TrazaDB.create('users', {
                            ...loggedUser,
                            salt: '',
                            password: '',
                            createdAt: Utils.nowISO()
                        });
                    }
                }
            } catch (err) {
                console.warn('[Auth] Supabase login error, checking local fallback:', err.message);
            }
        }

        // 2. If not logged in via Supabase, fallback to local DB credentials
        if (!loggedUser) {
            const users = await TrazaDB.getAll('users');
            const localUser = users.find(u => u.email === normalizedEmail);
            if (!localUser) {
                throw new Error('invalid_credentials');
            }

            // Verify password locally
            if (localUser.salt) {
                const hashedPassword = await Utils.hashPassword(password, localUser.salt);
                if (hashedPassword !== localUser.password) {
                    throw new Error('invalid_credentials');
                }
            }

            loggedUser = {
                id: localUser.id,
                email: localUser.email,
                businessName: localUser.businessName,
                businessType: localUser.businessType,
                ownerName: localUser.ownerName,
                role: localUser.role || 'user',
                isDemo: localUser.isDemo || false
            };
        }

        // Reset rate limiter on success
        if (typeof Security !== 'undefined' && Security.rateLimiter) {
            Security.rateLimiter.reset(normalizedEmail);
        }

        // Start session
        startSession(loggedUser);
        return loggedUser;
    }

    // Demo mode
    async function startDemo() {
        isDemo = true;

        // Create or get demo user in local IndexedDB only
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
                role: 'demo',
                isDemo: true,
                lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es'
            });
        }

        // Load demo data
        if (typeof DemoData !== 'undefined' && DemoData.load) {
            await DemoData.load(demoUser.id);
        }

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
            role: user.role || 'user',
            isDemo: Boolean(user.isDemo)
        };

        isDemo = Boolean(user.isDemo);

        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            userId: user.id,
            email: user.email,
            businessName: user.businessName,
            businessType: user.businessType,
            ownerName: user.ownerName,
            role: user.role || 'user',
            loginTime: Date.now(),
            isDemo: isDemo
        }));

        resetInactivityTimer();
    }

    // Check for existing session
    async function checkSession() {
        try {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (!session) {
                // Check if Supabase has active session
                const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
                if (supabase) {
                    const { data: { session: sbSession } } = await supabase.auth.getSession();
                    if (sbSession && sbSession.user) {
                        const sbUser = sbSession.user;
                        const meta = sbUser.user_metadata || {};
                        currentUser = {
                            id: sbUser.id,
                            email: sbUser.email,
                            businessName: meta.businessName || 'Empresa TrazaControl',
                            businessType: meta.businessType || 'artisan',
                            ownerName: meta.ownerName || 'Administrador',
                            role: meta.role || 'user',
                            isDemo: false
                        };
                        startSession(currentUser);
                        return true;
                    }
                }
                return false;
            }

            const sessionData = JSON.parse(session);
            isDemo = Boolean(sessionData.isDemo);
            currentUser = {
                id: sessionData.userId,
                email: sessionData.email,
                businessName: sessionData.businessName,
                businessType: sessionData.businessType,
                ownerName: sessionData.ownerName,
                role: sessionData.role || 'user',
                isDemo: isDemo
            };

            return true;
        } catch (e) {
            console.warn('[Auth] checkSession warning:', e);
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

        // Supabase sign out
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (supabase && !isDemo) {
            try {
                await supabase.auth.signOut();
            } catch (e) {
                console.warn('[Auth] Supabase sign out error:', e);
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

    // Check if current user is admin
    function isAdmin() {
        return currentUser && (currentUser.role === 'admin' || (currentUser.email && currentUser.email.includes('admin')));
    }

    // Update user profile
    async function updateProfile(data) {
        if (!currentUser) return null;

        const updated = {
            ...currentUser,
            businessName: data.businessName || currentUser.businessName,
            businessType: data.businessType || currentUser.businessType,
            ownerName: data.ownerName || currentUser.ownerName,
            phone: data.phone || '',
            address: data.address || ''
        };

        // 1. Supabase Profile Update
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (supabase && !isDemo) {
            try {
                await supabase.from('profiles').upsert({
                    id: currentUser.id,
                    business_name: updated.businessName,
                    business_type: updated.businessType,
                    owner_name: updated.ownerName,
                    phone: updated.phone,
                    address: updated.address,
                    updated_at: new Date().toISOString()
                });
            } catch (e) {
                console.warn('[Auth] Supabase updateProfile error:', e);
            }
        }

        // 2. Local DB Update
        try {
            const localUser = await TrazaDB.read('users', currentUser.id);
            if (localUser) {
                await TrazaDB.update('users', { ...localUser, ...updated });
            }
        } catch (e) {
            console.warn('[Auth] Local updateProfile error:', e);
        }

        currentUser = updated;
        startSession(currentUser);
        return currentUser;
    }

    // Change password
    async function changePassword(currentPassword, newPassword) {
        if (!currentUser) return false;

        // 1. Supabase Auth password update
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (supabase && !isDemo) {
            try {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
            } catch (e) {
                console.warn('[Auth] Supabase password update warning:', e.message);
            }
        }

        // 2. Local DB password update
        const user = await TrazaDB.read('users', currentUser.id);
        if (user && user.salt) {
            if (currentPassword) {
                const hashedCurrent = await Utils.hashPassword(currentPassword, user.salt);
                if (hashedCurrent !== user.password) {
                    throw new Error('invalid_current_password');
                }
            }
            const newSalt = Utils.generateSalt();
            const hashedNew = await Utils.hashPassword(newPassword, newSalt);
            user.password = hashedNew;
            user.salt = newSalt;
            await TrazaDB.update('users', user);
        }

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
                    Utils.showToast('warning', typeof I18n !== 'undefined' ? I18n.t('auth.auto_logout') : 'Sesión cerrada por inactividad');
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
        isAdmin,
        updateProfile,
        changePassword,
        checkSession
    };
})();
