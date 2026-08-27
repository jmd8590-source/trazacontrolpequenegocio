/* ============================================================
   TrazaControl — Security Module
   Anti-inspection, anti-debugging, and input protection
   ============================================================ */

const Security = (function() {
    'use strict';

    let devToolsOpen = false;
    let warningShown = false;

    function init() {
        disableContextMenu();
        disableKeyboardShortcuts();
        disableTextSelection();
        detectDevTools();
        preventDragDrop();
    }

    // Disable right-click context menu
    function disableContextMenu() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
        });
    }

    // Disable common dev tool keyboard shortcuts
    function disableKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+I (Dev Tools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                return false;
            }
            // Ctrl+Shift+C (Inspect Element)
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                return false;
            }
            // Ctrl+S (Save page)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                return false;
            }
        });
    }

    // Disable text selection on non-input elements
    function disableTextSelection() {
        document.addEventListener('selectstart', function(e) {
            const tag = e.target.tagName.toLowerCase();
            if (['input', 'textarea', 'select'].includes(tag)) return true;
            if (e.target.isContentEditable) return true;
            // Allow selection in print mode
            if (window.matchMedia && window.matchMedia('print').matches) return true;
            e.preventDefault();
            return false;
        });
    }

    // Detect DevTools opening
    function detectDevTools() {
        // Method 1: Window size detection
        const threshold = 160;

        function checkDevTools() {
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            if (widthDiff || heightDiff) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    onDevToolsOpen();
                }
            } else {
                devToolsOpen = false;
            }
        }

        // Passive DevTools check
        setInterval(checkDevTools, 2000);
    }

    // Action when DevTools are detected
    function onDevToolsOpen() {
        if (warningShown) return;
        warningShown = true;

        console.clear();
        console.log(
            '%c⚠️ TrazaControl — Área Protegida',
            'color: red; font-size: 24px; font-weight: bold;'
        );
        console.log(
            '%cEl código de esta aplicación está protegido. Cualquier intento de copia o inspección no autorizada está prohibido.',
            'color: red; font-size: 14px;'
        );

        // Reset after some time to allow re-detection
        setTimeout(() => { warningShown = false; }, 30000);
    }

    // Prevent drag and drop of elements
    function preventDragDrop() {
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });

        document.addEventListener('drop', function(e) {
            // Allow drop only on file input elements
            if (e.target.type !== 'file') {
                e.preventDefault();
                return false;
            }
        });
    }

    // Rate limiting for login attempts
    const rateLimiter = {
        attempts: {},
        maxAttempts: 5,
        windowMs: 300000, // 5 minutes

        check: function(key) {
            const now = Date.now();
            if (!this.attempts[key]) {
                this.attempts[key] = [];
            }

            // Clean old attempts
            this.attempts[key] = this.attempts[key].filter(t => now - t < this.windowMs);

            if (this.attempts[key].length >= this.maxAttempts) {
                return false; // Rate limited
            }

            this.attempts[key].push(now);
            return true;
        },

        getRemainingTime: function(key) {
            if (!this.attempts[key] || this.attempts[key].length < this.maxAttempts) {
                return 0;
            }
            const oldest = this.attempts[key][0];
            const remaining = this.windowMs - (Date.now() - oldest);
            return Math.max(0, Math.ceil(remaining / 1000));
        },

        reset: function(key) {
            delete this.attempts[key];
        }
    };

    // CSP meta tag injection
    function injectCSP() {
        const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        if (existingMeta) return;

        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';";
        document.head.appendChild(meta);
    }

    return {
        init,
        rateLimiter,
        injectCSP
    };
})();
