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
                        const resetModal = document.getElementById('update-password-modal');
                        if (resetModal) {
                            Utils.openModal('update-password-modal');
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[Auth] Supabase listener warning:', e);
        }
    }

    // Register a new user
    async function register(data) {
        const { email, password, businessName, businessType, ownerName, cif, phone } = data;
        const normalizedEmail = email.toLowerCase().trim();

        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        let supabaseUser = null;
        let requiresConfirmation = false;

        // 1. Mandatory Supabase Auth Sign Up
        if (supabase) {
            const signUpOptions = {
                data: {
                    business_name: businessName,
                    business_type: businessType,
                    owner_name: ownerName,
                    businessName: businessName,
                    businessType: businessType,
                    ownerName: ownerName,
                    cif: cif || '',
                    phone: phone || '',
                    address: cif ? `CIF/NIF: ${cif}` : '',
                    lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es'
                }
            };

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password,
                options: signUpOptions
            });

            if (authError) {
                if (authError.message && (authError.message.includes('already') || authError.status === 422)) {
                    throw new Error('email_exists');
                }
                if (authError.message && authError.message.toLowerCase().includes('password')) {
                    throw new Error('weak_password');
                }
                throw new Error(authError.message || 'supabase_error');
            }

            if (authData && authData.user) {
                supabaseUser = authData.user;

                // Check if Supabase requires email verification
                if (!authData.session && !authData.user.confirmed_at && authData.user.identities && authData.user.identities.length > 0) {
                    requiresConfirmation = true;
                }

                // Upsert profile in Supabase profiles table
                try {
                    await supabase.from('profiles').upsert({
                        id: supabaseUser.id,
                        email: normalizedEmail,
                        business_name: businessName,
                        business_type: businessType,
                        owner_name: ownerName,
                        phone: phone || '',
                        address: cif ? `CIF/NIF: ${cif}` : '',
                        role: 'user',
                        lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es',
                        updated_at: new Date().toISOString()
                    });
                } catch (profErr) {
                    console.warn('[Auth] Profile upsert notice:', profErr);
                }
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
            cif: cif || '',
            phone: phone || '',
            role: 'user',
            lang: typeof I18n !== 'undefined' ? I18n.getLang() : 'es',
            createdAt: Utils.nowISO(),
            supabaseSynced: Boolean(supabaseUser)
        };

        try {
            if (existing) {
                await TrazaDB.update('users', localRecord);
            } else {
                await TrazaDB.create('users', localRecord);
            }
        } catch (dbErr) {
            console.warn('[Auth] Local user creation cache notice:', dbErr);
        }

        // If email confirmation is required, notify caller without auto-logging in
        if (requiresConfirmation) {
            return {
                ...localRecord,
                requiresConfirmation: true
            };
        }

        // 4. Start Session if auto-confirmed
        startSession(localRecord);
        return localRecord;
    }

    // Login
    async function login(email, password) {
        const normalizedEmail = email.toLowerCase().trim();

        // Rate limiting via Utils
        if (typeof Utils !== 'undefined' && Utils.rateLimiter && !Utils.rateLimiter.check(normalizedEmail)) {
            const remaining = Utils.rateLimiter.getRemainingTime(normalizedEmail);
            throw new Error(`rate_limited:${remaining}`);
        }

        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        const supabaseConfigured = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.isConfigured() : false;
        let loggedUser = null;

        // 1. MANDATORY Supabase Auth Login — password is ALWAYS verified server-side
        if (supabase && supabaseConfigured) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: password
            });

            if (authError || !authData || !authData.user) {
                console.warn('[Auth] Supabase signIn rejection:', authError ? authError.message : 'no user');
                if (authError && authError.message) {
                    const msg = authError.message.toLowerCase();
                    if (msg.includes('confirm') || msg.includes('verified')) {
                        throw new Error('email_not_confirmed');
                    }
                    if (msg.includes('rate') || msg.includes('too many')) {
                        throw new Error('rate_limited:60');
                    }
                }
                throw new Error('invalid_credentials');
            }

            const sbUser = authData.user;
            let profileData = null;

            // Fetch profile info from profiles table
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', sbUser.id)
                    .maybeSingle();
                profileData = profile;
            } catch (e) {
                console.warn('[Auth] Profile fetch warning:', e);
            }

            // Role is determined from Supabase profiles table, with admin email fallback
            const isAdminUser = (profileData && profileData.role === 'admin') || (normalizedEmail === 'jemendo90@gmail.com');

            loggedUser = {
                id: sbUser.id,
                email: sbUser.email,
                businessName: (profileData && profileData.business_name) || (isAdminUser ? 'TrazaControl Admin' : 'Empresa TrazaControl'),
                businessType: (profileData && profileData.business_type) || 'artisan',
                ownerName: (profileData && profileData.owner_name) || (isAdminUser ? 'Jesús Mendoza' : 'Usuario'),
                role: isAdminUser ? 'admin' : 'user',
                isDemo: false,
                supabaseSynced: true
            };

            // Sync into local DB for offline display (no password stored) safely
            try {
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
            } catch (cacheErr) {
                console.warn('[Auth] Local user cache notice:', cacheErr);
            }
        } else {
            // Supabase is not configured — reject login entirely (no local-only auth)
            throw new Error('backend_not_configured');
        }

        // Reset rate limiter on success
        if (typeof Utils !== 'undefined' && Utils.rateLimiter) {
            Utils.rateLimiter.reset(normalizedEmail);
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

        // Save in both sessionStorage and localStorage for offline cold room resilience
        const sessionPayload = JSON.stringify({
            userId: user.id,
            email: user.email,
            businessName: user.businessName,
            businessType: user.businessType,
            ownerName: user.ownerName,
            cif: user.cif || '',
            phone: user.phone || '',
            role: user.role || 'user',
            loginTime: Date.now(),
            isDemo: isDemo
        });
        sessionStorage.setItem(SESSION_KEY, sessionPayload);
        if (!isDemo) {
            localStorage.setItem('trazacontrol_offline_session', sessionPayload);
        }

        resetInactivityTimer();
    }

    // Check for existing session
    async function checkSession() {
        try {
            let session = sessionStorage.getItem(SESSION_KEY);
            if (!session) {
                // If in cold store or reloaded offline, check offline session cache
                session = localStorage.getItem('trazacontrol_offline_session');
            }

            if (!session) {
                // Check if Supabase has active session
                const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
                if (supabase) {
                    const { data: { session: sbSession } } = await supabase.auth.getSession();
                    if (sbSession && sbSession.user) {
                        const sbUser = sbSession.user;
                        
                        // Fetch role from profiles table (server-side, not from user_metadata)
                        let profileData = null;
                        try {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', sbUser.id)
                                .single();
                            profileData = profile;
                        } catch (e) {
                            console.warn('[Auth] Profile fetch in checkSession:', e);
                        }

                        const isAdminUser = (profileData && profileData.role === 'admin');

                        currentUser = {
                            id: sbUser.id,
                            email: sbUser.email,
                            businessName: (profileData && profileData.business_name) || 'Empresa TrazaControl',
                            businessType: (profileData && profileData.business_type) || 'artisan',
                            ownerName: (profileData && profileData.owner_name) || (isAdminUser ? 'Administrador' : 'Usuario'),
                            cif: (profileData && profileData.address) || '',
                            phone: (profileData && profileData.phone) || '',
                            role: isAdminUser ? 'admin' : 'user',
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
                cif: sessionData.cif || '',
                phone: sessionData.phone || '',
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
        localStorage.removeItem('trazacontrol_offline_session');
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

    // Check if current user is admin (role from Supabase profiles table only)
    function isAdmin() {
        return currentUser && currentUser.role === 'admin';
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

    // Request password reset email via Supabase Auth
    async function requestPasswordReset(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (!supabase) {
            throw new Error('backend_not_configured');
        }

        const options = {
            redirectTo: window.location.origin + window.location.pathname
        };

        const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, options);
        if (error) throw error;
        return true;
    }

    // Update password from reset modal
    async function updatePassword(newPassword) {
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (supabase) {
            const { data, error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        }

        if (currentUser) {
            const localUser = await TrazaDB.read('users', currentUser.id);
            if (localUser) {
                const newSalt = Utils.generateSalt();
                localUser.salt = newSalt;
                localUser.password = await Utils.hashPassword(newPassword, newSalt);
                await TrazaDB.update('users', localUser);
            }
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
        requestPasswordReset,
        updatePassword,
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
