/* ============================================================
   TrazaControl - Onboarding Tour
   Guided tour shown the first time a newly registered user enters.
   ============================================================ */
const Tour = (function () {
    const FLAG_PENDING = 'trazacontrol_tour_pending';
    const FLAG_DONE_PREFIX = 'trazacontrol_tour_done_';

    const TEXTS = {
        es: {
            next: 'Siguiente', prev: 'Atrás', skip: 'Saltar', done: 'Empezar', of: 'de',
            steps: [
                { title: '¡Bienvenido a TrazaControl! 👋', text: 'Te enseñamos en 1 minuto cómo registrar tu trazabilidad y tus controles APPCC.' },
                { sel: '[data-module="dashboard"]', title: 'Panel de control', text: 'Aquí ves de un vistazo tu cumplimiento, alertas y actividad reciente. Empieza en 0% hasta que registres datos.' },
                { sel: '[data-module="traceability"]', title: 'Trazabilidad', text: 'Registra tus productos y lotes con ingredientes y alérgenos. Imprime etiquetas cuando lo necesites.' },
                { sel: '[data-module="temperature"]', title: 'Temperatura y humedad', text: 'Crea tus puntos de control (cámaras, vitrinas...) y anota las lecturas diarias.' },
                { sel: '#connection-status-badge', title: 'Sincronización', text: 'Funciona sin conexión. Tus datos se guardan en el dispositivo y se sincronizan con la nube cuando hay internet.' },
                { title: '¡Todo listo! ✅', text: '¡Empieza registrando tu primer producto o tu primera lectura de temperatura!' }
            ]
        },
        en: {
            next: 'Next', prev: 'Back', skip: 'Skip', done: 'Get started', of: 'of',
            steps: [
                { title: 'Welcome to TrazaControl! 👋', text: 'A quick 1-minute tour of how to record traceability and HACCP checks.' },
                { sel: '[data-module="dashboard"]', title: 'Dashboard', text: 'See compliance, alerts and recent activity at a glance. It starts at 0% until you log data.' },
                { sel: '[data-module="traceability"]', title: 'Traceability', text: 'Record products and batches with ingredients and allergens. Print labels when needed.' },
                { sel: '[data-module="temperature"]', title: 'Temperature & humidity', text: 'Create control points (fridges, displays...) and log daily readings.' },
                { sel: '#connection-status-badge', title: 'Sync', text: 'Works offline. Your data is stored on the device and synced to the cloud when online.' },
                { title: 'All set! ✅', text: 'Start by adding your first product or temperature reading!' }
            ]
        },
        pt: {
            next: 'Seguinte', prev: 'Voltar', skip: 'Saltar', done: 'Começar', of: 'de',
            steps: [
                { title: 'Bem-vindo ao TrazaControl! 👋', text: 'Um tour rápido de 1 minuto para registar rastreabilidade e controlos HACCP.' },
                { sel: '[data-module="dashboard"]', title: 'Painel', text: 'Veja cumprimento, alertas e atividade recente. Começa a 0% até registar dados.' },
                { sel: '[data-module="traceability"]', title: 'Rastreabilidade', text: 'Registe produtos e lotes com ingredientes e alergénios. Imprima etiquetas quando precisar.' },
                { sel: '[data-module="temperature"]', title: 'Temperatura e humidade', text: 'Crie pontos de controlo (frigoríficos, vitrinas...) e registe leituras diárias.' },
                { sel: '#connection-status-badge', title: 'Sincronização', text: 'Funciona offline. Os dados ficam no dispositivo e sincronizam com a nuvem quando há internet.' },
                { title: 'Tudo pronto! ✅', text: 'Comece por registar o seu primeiro produto ou leitura de temperatura!' }
            ]
        }
    };

    let idx = 0;
    let steps = [];
    let t = TEXTS.es;
    let overlay, spot, pop;

    function lang() {
        try { return (typeof I18n !== 'undefined' && I18n.getLang && I18n.getLang()) || 'es'; } catch (e) { return 'es'; }
    }

    function userKey() {
        try { return FLAG_DONE_PREFIX + (Auth.getUserId() || 'anon'); } catch (e) { return FLAG_DONE_PREFIX + 'anon'; }
    }

    function markPending() { try { localStorage.setItem(FLAG_PENDING, '1'); } catch (e) {} }

    function maybeStart() {
        try {
            if (typeof Auth !== 'undefined' && Auth.isDemoMode && Auth.isDemoMode()) return;
            if (localStorage.getItem(FLAG_PENDING) !== '1') return;
            if (localStorage.getItem(userKey())) { localStorage.removeItem(FLAG_PENDING); return; }
            setTimeout(start, 700);
        } catch (e) {}
    }

    function visibleTarget(sel) {
        if (!sel) return null;
        const els = document.querySelectorAll(sel);
        for (const el of els) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return el;
        }
        return null;
    }

    function start() {
        if (overlay) return;
        t = TEXTS[lang()] || TEXTS.es;
        steps = t.steps;
        idx = 0;
        overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        spot = document.createElement('div');
        spot.className = 'tour-spot';
        pop = document.createElement('div');
        pop.className = 'tour-pop';
        pop.setAttribute('role', 'dialog');
        overlay.appendChild(spot);
        document.body.appendChild(overlay);
        document.body.appendChild(pop);
        window.addEventListener('resize', render);
        render();
    }

    function render() {
        if (!overlay) return;
        const s = steps[idx];
        const target = visibleTarget(s.sel);
        const last = idx === steps.length - 1;
        overlay.classList.toggle('tour-dim', !target);

        pop.innerHTML =
            '<div class="tour-step">' + (idx + 1) + ' ' + t.of + ' ' + steps.length + '</div>' +
            '<h4 class="tour-title"></h4><p class="tour-text"></p>' +
            '<div class="tour-actions">' +
            (last ? '' : '<button type="button" class="tour-skip">' + t.skip + '</button>') +
            '<span class="tour-spacer"></span>' +
            (idx > 0 ? '<button type="button" class="tour-prev">' + t.prev + '</button>' : '') +
            '<button type="button" class="tour-next">' + (last ? t.done : t.next) + '</button></div>';
        pop.querySelector('.tour-title').textContent = s.title;
        pop.querySelector('.tour-text').textContent = s.text;
        pop.querySelector('.tour-next').onclick = () => (last ? finish() : go(1));
        const prev = pop.querySelector('.tour-prev'); if (prev) prev.onclick = () => go(-1);
        const skip = pop.querySelector('.tour-skip'); if (skip) skip.onclick = finish;

        if (target) {
            const r = target.getBoundingClientRect();
            const pad = 6;
            spot.style.cssText = 'display:block;top:' + (r.top - pad) + 'px;left:' + (r.left - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px;';
            const pw = Math.min(320, window.innerWidth - 24);
            pop.style.width = pw + 'px';
            let left = r.right + 16;
            let top = r.top;
            if (left + pw > window.innerWidth - 12) { // no room at the right: place below/above
                left = Math.max(12, Math.min(r.left, window.innerWidth - pw - 12));
                top = r.bottom + 14;
            }
            const ph = pop.offsetHeight || 190;
            if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 14);
            if (top + ph > window.innerHeight - 12) top = Math.max(12, window.innerHeight - ph - 12);
            pop.style.left = left + 'px';
            pop.style.top = Math.max(12, top) + 'px';
            pop.style.transform = 'none';
        } else {
            spot.style.display = 'none';
            pop.style.width = Math.min(360, window.innerWidth - 24) + 'px';
            pop.style.left = '50%';
            pop.style.top = '50%';
            pop.style.transform = 'translate(-50%, -50%)';
        }
    }

    function go(d) {
        idx = Math.max(0, Math.min(steps.length - 1, idx + d));
        render();
    }

    function finish() {
        try {
            localStorage.setItem(userKey(), '1');
            localStorage.removeItem(FLAG_PENDING);
        } catch (e) {}
        window.removeEventListener('resize', render);
        if (overlay) overlay.remove();
        if (pop) pop.remove();
        overlay = spot = pop = null;
    }

    function replay() { if (!overlay) start(); }

    return { markPending, maybeStart, start: replay, finish };
})();
