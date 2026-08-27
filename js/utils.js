/* ============================================================
   TrazaControl — Utility Functions
   Common helpers for dates, formatting, validation, etc.
   ============================================================ */

const Utils = (function() {
    'use strict';

    // ---- Date Formatting ----
    function formatDate(dateStr, locale) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const loc = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-ES';
        return d.toLocaleDateString(loc, { year: 'numeric', month: '2-digit', day: '2-digit' });
    }

    function formatDateTime(dateStr, locale) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const loc = locale === 'pt' ? 'pt-BR' : locale === 'en' ? 'en-US' : 'es-ES';
        return d.toLocaleDateString(loc, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function formatTime(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatISO(date) {
        return date ? new Date(date).toISOString() : new Date().toISOString();
    }

    function toDateInputValue(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    }

    function toTimeInputValue(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toTimeString().slice(0, 5);
    }

    function todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    function nowISO() {
        return new Date().toISOString();
    }

    function daysUntil(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const now = new Date();
        const diff = d.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function timeAgo(dateStr, t) {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return (t ? t('dashboard.time_ago_days') : '{n} days ago').replace('{n}', days);
        if (hours > 0) return (t ? t('dashboard.time_ago_hours') : '{n} h ago').replace('{n}', hours);
        return (t ? t('dashboard.time_ago_minutes') : '{n} min ago').replace('{n}', Math.max(1, minutes));
    }

    function isInDateRange(dateStr, fromDate, toDate) {
        if (!dateStr) return false;
        const d = new Date(dateStr).getTime();
        if (fromDate && d < new Date(fromDate).getTime()) return false;
        if (toDate && d > new Date(toDate + 'T23:59:59').getTime()) return false;
        return true;
    }

    // ---- Number Formatting ----
    function formatNumber(num, decimals) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return Number(num).toFixed(decimals !== undefined ? decimals : 0);
    }

    function formatCurrency(num, currency) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency || 'EUR'
        }).format(num);
    }

    function formatPercent(num) {
        if (num === null || num === undefined || isNaN(num)) return '-';
        return Math.round(num) + '%';
    }

    // ---- String Helpers ----
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function truncate(str, maxLen) {
        if (!str) return '';
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen) + '...';
    }

    function slugify(str) {
        return str.toLowerCase().trim()
            .replace(/[áàâã]/g, 'a')
            .replace(/[éèê]/g, 'e')
            .replace(/[íìî]/g, 'i')
            .replace(/[óòôõ]/g, 'o')
            .replace(/[úùû]/g, 'u')
            .replace(/ñ/g, 'n')
            .replace(/ç/g, 'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    function getInitials(name) {
        if (!name) return '?';
        return name.split(' ')
            .filter(w => w.length > 0)
            .map(w => w[0].toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // ---- Input Sanitization (XSS prevention) ----
    function sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function sanitizeHTML(html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    // ---- Validation ----
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPassword(password) {
        // Min 8 chars, 1 uppercase, 1 number
        return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
    }

    function isRequired(value) {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    }

    function isInRange(value, min, max) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        return num >= min && num <= max;
    }

    // ---- SHA-256 Hash ----
    async function hashPassword(password, salt) {
        const data = new TextEncoder().encode(password + (salt || ''));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // ---- Ripple Effect ----
    function createRipple(event, targetBtn) {
        try {
            const button = targetBtn || (event && event.target && event.target.closest('.ripple-container, .btn-primary, .btn-success, .btn-danger, .demo-btn'));
            if (!button || !button.classList || !button.getBoundingClientRect) return;

            const circle = document.createElement('span');
            const diameter = Math.max(button.clientWidth || 30, button.clientHeight || 30);
            const radius = diameter / 2;

            const rect = button.getBoundingClientRect();
            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${(event.clientX || rect.left + radius) - rect.left - radius}px`;
            circle.style.top = `${(event.clientY || rect.top + radius) - rect.top - radius}px`;
            circle.classList.add('ripple');

            const existingRipple = button.querySelector('.ripple');
            if (existingRipple) existingRipple.remove();

            button.appendChild(circle);

            setTimeout(() => circle.remove(), 600);
        } catch (e) {
            // Ripple is purely decorative
        }
    }

    // ---- Toast Notifications ----
    let toastContainer = null;

    function showToast(type, title, message, duration) {
        if (!toastContainer) {
            toastContainer = document.getElementById('toast-container');
            if (!toastContainer) return;
        }

        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${sanitize(title)}</div>
                ${message ? `<div class="toast-message">${sanitize(message)}</div>` : ''}
            </div>
            <button class="toast-close" onclick="this.closest('.toast').remove()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration || 4000);
    }

    // ---- Confirm Dialog ----
    function showConfirm(title, description, onConfirm, t) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay modal-overlay-enter';
        overlay.innerHTML = `
            <div class="modal modal-content-enter" style="max-width: 420px;">
                <div class="modal-body">
                    <div class="confirm-dialog">
                        <div class="confirm-dialog-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                        </div>
                        <h4>${sanitize(title)}</h4>
                        <p>${sanitize(description)}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">${t ? t('app.cancel') : 'Cancelar'}</button>
                    <button class="btn btn-danger confirm-btn">${t ? t('app.delete') : 'Eliminar'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.confirm-btn').addEventListener('click', () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ---- Modal Helper ----
    function openModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.classList.add('modal-overlay-enter');
        const modal = overlay.querySelector('.modal');
        if (modal) modal.classList.add('modal-content-enter');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalId) {
        const overlay = document.getElementById(modalId);
        if (!overlay) return;
        const modal = overlay.querySelector('.modal');
        if (modal) {
            modal.classList.remove('modal-content-enter');
            modal.classList.add('modal-content-exit');
        }
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('modal-overlay-enter');
            if (modal) modal.classList.remove('modal-content-exit');
            document.body.style.overflow = '';
        }, 200);
    }

    // ---- Form Helpers ----
    function getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        const data = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.name) return;
            if (input.type === 'checkbox') {
                data[input.name] = input.checked;
            } else if (input.type === 'number') {
                data[input.name] = input.value ? parseFloat(input.value) : null;
            } else {
                data[input.name] = input.value;
            }
        });
        return data;
    }

    function setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form || !data) return;
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (!input.name || data[input.name] === undefined) return;
            if (input.type === 'checkbox') {
                input.checked = !!data[input.name];
            } else if (input.type === 'date') {
                input.value = toDateInputValue(data[input.name]);
            } else if (input.type === 'time') {
                input.value = toTimeInputValue(data[input.name]);
            } else {
                input.value = data[input.name] || '';
            }
        });
    }

    function clearForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
            input.classList.remove('error', 'success');
        });
        form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    }

    function validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return false;
        let valid = true;

        rules.forEach(rule => {
            const input = form.querySelector(`[name="${rule.field}"]`);
            if (!input) return;
            const errorEl = input.parentElement.querySelector('.form-error');

            input.classList.remove('error');
            if (errorEl) errorEl.textContent = '';

            if (rule.required && !isRequired(input.value)) {
                input.classList.add('error');
                if (errorEl) errorEl.textContent = I18n.t('app.required_field');
                valid = false;
            } else if (rule.email && input.value && !isValidEmail(input.value)) {
                input.classList.add('error');
                if (errorEl) errorEl.textContent = 'Email inválido';
                valid = false;
            } else if (rule.min !== undefined && parseFloat(input.value) < rule.min) {
                input.classList.add('error');
                valid = false;
            } else if (rule.max !== undefined && parseFloat(input.value) > rule.max) {
                input.classList.add('error');
                valid = false;
            }
        });

        return valid;
    }

    // ---- Debounce ----
    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay || 300);
        };
    }

    // ---- Event delegation helper ----
    function delegate(parent, selector, event, handler) {
        const el = typeof parent === 'string' ? document.querySelector(parent) : parent;
        if (!el) return;
        el.addEventListener(event, (e) => {
            const target = e.target.closest(selector);
            if (target && el.contains(target)) {
                handler.call(target, e, target);
            }
        });
    }

    return {
        // Date
        formatDate,
        formatDateTime,
        formatTime,
        formatISO,
        toDateInputValue,
        toTimeInputValue,
        todayISO,
        nowISO,
        daysUntil,
        timeAgo,
        isInDateRange,
        // Numbers
        formatNumber,
        formatCurrency,
        formatPercent,
        // Strings
        capitalize,
        truncate,
        slugify,
        getInitials,
        // Security
        sanitize,
        sanitizeHTML,
        hashPassword,
        generateSalt,
        // Validation
        isValidEmail,
        isValidPassword,
        isRequired,
        isInRange,
        // UI
        createRipple,
        showToast,
        showConfirm,
        openModal,
        closeModal,
        // Forms
        getFormData,
        setFormData,
        clearForm,
        validateForm,
        // Helpers
        debounce,
        delegate
    };
})();
