/* ============================================================
   TrazaControl — Supabase Configuration & Client Provider
   Cloud Backend Integration (Organization: jmd8590-source's Org / trazacontrol)
   ============================================================ */

const SupabaseConfig = (function() {
    'use strict';

    // Storage keys for dynamic config
    const STORAGE_URL_KEY = 'trazacontrol_supabase_url';
    const STORAGE_KEY_KEY = 'trazacontrol_supabase_anon_key';

    // Preset Project Credentials (Organization: jmd8590-source's Org / Project: trazacontrol)
    const DEFAULT_URL = window.TRAZACONTROL_SUPABASE_URL || 'https://hllehaidwdhmoqkaegoy.supabase.co';
    const DEFAULT_KEY = window.TRAZACONTROL_SUPABASE_ANON_KEY || '';

    let clientInstance = null;
    let isConnected = false;

    function getUrl() {
        return localStorage.getItem(STORAGE_URL_KEY) || DEFAULT_URL;
    }

    function getAnonKey() {
        return localStorage.getItem(STORAGE_KEY_KEY) || DEFAULT_KEY;
    }

    function setCredentials(url, key) {
        if (url) localStorage.setItem(STORAGE_URL_KEY, url.trim());
        if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
        clientInstance = null;
        return initClient();
    }

    function initClient() {
        const url = getUrl();
        const key = getAnonKey();

        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            try {
                if (url && key && url.startsWith('http') && !key.includes('placeholder')) {
                    clientInstance = window.supabase.createClient(url, key, {
                        auth: {
                            persistSession: true,
                            autoRefreshToken: true,
                            detectSessionInUrl: true
                        }
                    });
                    return clientInstance;
                }
            } catch (err) {
                console.warn('[Supabase] Init notice:', err.message);
            }
        }
        return null;
    }

    function getClient() {
        if (!clientInstance) {
            clientInstance = initClient();
        }
        return clientInstance;
    }

    function isConfigured() {
        const url = getUrl();
        const key = getAnonKey();
        return Boolean(url && key && url.startsWith('http') && !key.includes('placeholder') && key.length > 20);
    }

    async function testConnection() {
        const client = getClient();
        if (!client) return { ok: false, error: 'Cliente de Supabase no configurado' };

        try {
            const { data, error } = await client.from('profiles').select('count', { count: 'exact', head: true });
            if (error && error.code !== 'PGRST116') {
                if (error.message && error.message.includes('FetchError')) {
                    isConnected = false;
                    return { ok: false, error: 'Error de red al conectar con Supabase' };
                }
            }
            isConnected = true;
            return { ok: true };
        } catch (e) {
            isConnected = false;
            return { ok: false, error: e.message };
        }
    }

    function openConfigModal() {
        const modal = document.getElementById('supabase-modal');
        if (!modal) return;
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        if (urlInput) urlInput.value = getUrl() || '';
        if (keyInput) keyInput.value = getAnonKey() || '';
        if (typeof Utils !== 'undefined') {
            Utils.openModal('supabase-modal');
        } else {
            modal.classList.remove('hidden');
        }
    }

    async function saveConfigFromModal() {
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        const url = urlInput ? urlInput.value.trim() : '';
        const key = keyInput ? keyInput.value.trim() : '';

        if (!url || !key) {
            if (typeof Utils !== 'undefined') Utils.showToast('error', 'Debes rellenar URL y Clave Anon');
            return;
        }

        setCredentials(url, key);
        const res = await testConnection();

        if (typeof Utils !== 'undefined') {
            if (res.ok) {
                Utils.showToast('success', 'Conexión con Supabase verificada correctamente');
            } else {
                Utils.showToast('info', 'Credenciales guardadas. Verificación: ' + (res.error || 'Listo'));
            }
            Utils.closeModal('supabase-modal');
        }
    }

    return {
        getClient,
        getUrl,
        getAnonKey,
        setCredentials,
        isConfigured,
        testConnection,
        openConfigModal,
        saveConfigFromModal
    };
})();
