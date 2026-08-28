/* ============================================================
   TrazaControl — Internationalization (i18n)
   Real-time language switching for ES / PT / EN
   ============================================================ */

const I18n = (function() {
    'use strict';

    let currentLang = 'es';
    let translations = {};
    let loaded = {};
    const listeners = [];

    // Load a language JSON file
    async function loadLanguage(lang) {
        if (loaded[lang]) return loaded[lang];

        try {
            const response = await fetch(`lang/${lang}.json?v=${Date.now()}`);
            if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
            const data = await response.json();
            loaded[lang] = data;
            return data;
        } catch (error) {
            console.error(`[i18n] Error loading language "${lang}":`, error);
            return null;
        }
    }

    // Initialize with default language
    async function init(lang) {
        currentLang = lang || localStorage.getItem('trazacontrol_lang') || 'es';

        // Load all three languages in parallel
        await Promise.all([
            loadLanguage('es'),
            loadLanguage('pt'),
            loadLanguage('en')
        ]);

        translations = loaded[currentLang] || loaded['es'] || {};
        translatePage();
        updateLangButtons();

        return currentLang;
    }

    // Get nested translation by dot-notation key
    function t(key, params) {
        if (!key) return '';
        const keys = key.split('.');
        let value = translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to Spanish
                value = getFallback(key);
                break;
            }
        }

        if (typeof value !== 'string') return key;

        // Replace {param} placeholders
        if (params) {
            Object.entries(params).forEach(([paramKey, paramValue]) => {
                value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
            });
        }

        return value;
    }

    // Get fallback from Spanish
    function getFallback(key) {
        const keys = key.split('.');
        let value = loaded['es'];
        if (!value) return key;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }

        return typeof value === 'string' ? value : key;
    }

    // Change language
    async function setLanguage(lang) {
        if (!['es', 'pt', 'en'].includes(lang)) return;

        if (!loaded[lang]) {
            await loadLanguage(lang);
        }

        currentLang = lang;
        translations = loaded[lang] || loaded['es'] || {};

        localStorage.setItem('trazacontrol_lang', lang);
        document.documentElement.lang = lang;

        translatePage();
        updateLangButtons();

        // Notify all registered listeners
        listeners.forEach(fn => {
            try { fn(lang); } catch(e) { console.error(e); }
        });
    }

    // Get current language
    function getLang() {
        return currentLang;
    }

    // Translate all elements with data-i18n attribute
    function translatePage() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            if (el.children.length > 0) return; // Protect parent containers with child icons/spans
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });

        // Placeholder translations
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation && translation !== key) {
                el.placeholder = translation;
            }
        });

        // Title/tooltip translations
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation && translation !== key) {
                el.title = translation;
            }
        });

        // Aria-label translations
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = t(key);
            if (translation && translation !== key) {
                el.setAttribute('aria-label', translation);
            }
        });

        // HTML content
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const translation = t(key);
            if (translation && translation !== key) {
                el.innerHTML = translation;
            }
        });

        // Update document title
        document.title = t('app.name') + ' — ' + t('app.tagline');
    }

    // Update language selector buttons
    function updateLangButtons() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === currentLang);
        });
    }

    // Register a callback for language changes
    function onChange(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    }

    // Remove a callback
    function offChange(callback) {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    }

    // Get available languages
    function getAvailableLanguages() {
        return [
            { code: 'es', name: 'Español', flag: '🇪🇸' },
            { code: 'pt', name: 'Português', flag: '🇵🇹' },
            { code: 'en', name: 'English', flag: '🇬🇧' }
        ];
    }

    return {
        init,
        t,
        setLanguage,
        getLang,
        translatePage,
        onChange,
        offChange,
        getAvailableLanguages
    };
})();
