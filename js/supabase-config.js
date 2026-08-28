/* ============================================================
   TrazaControl — Supabase Configuration & Client Provider
   Cloud Backend Integration (Organization: jmd8590-source's Org / trazacontrol)
   ============================================================ */

const SupabaseConfig = (function() {
    'use strict';

    // Storage keys for dynamic config
    const STORAGE_URL_KEY = 'trazacontrol_supabase_url';
    const STORAGE_KEY_KEY = 'trazacontrol_supabase_anon_key';

    // Default configuration (Fallback / Preset)
    // Note: Can be overridden at runtime via Settings or localStorage
    const DEFAULT_URL = window.TRAZACONTROL_SUPABASE_URL || 'https://hllehaidwdhmoqkaegoy.supabase.co';
    const DEFAULT_KEY = window.TRAZACONTROL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbGVoYWlkd2RobW9xa2FlZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkzNDU2MDAsImV4cCI6MjAyNDkyMTYwMH0.public_placeholder';

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
        clientInstance = null; // Re-initialize client
        initClient();
    }

    function initClient() {
        const url = getUrl();
        const key = getAnonKey();

        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            try {
                if (url && key && url.startsWith('http')) {
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
                console.warn('[Supabase] Init warning:', err.message);
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
        return Boolean(url && key && url.startsWith('http') && !key.includes('placeholder'));
    }

    async function testConnection() {
        const client = getClient();
        if (!client) return { ok: false, error: 'Supabase client not initialized' };

        try {
            const { data, error } = await client.from('profiles').select('count', { count: 'exact', head: true });
            if (error && error.code !== 'PGRST116') {
                // Auth error or connection error
                if (error.message && error.message.includes('FetchError')) {
                    isConnected = false;
                    return { ok: false, error: error.message };
                }
            }
            isConnected = true;
            return { ok: true };
        } catch (e) {
            isConnected = false;
            return { ok: false, error: e.message };
        }
    }

    return {
        getClient,
        getUrl,
        getAnonKey,
        setCredentials,
        isConfigured,
        testConnection
    };
})();
