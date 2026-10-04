/* ============================================================
   TrazaControl — Tour Interactivo Completo
   Recorrido detallado paso a paso por todas las funcionalidades
   del menú principal y gestión sanitaria APPCC.
   ============================================================ */
const Tour = (function () {
    const FLAG_PENDING = 'trazacontrol_tour_pending';
    const FLAG_DONE_PREFIX = 'trazacontrol_tour_done_';

    const TEXTS = {
        es: {
            next: 'Siguiente',
            prev: 'Atrás',
            skip: 'Saltar tour',
            done: '¡Entendido, empezar!',
            stepOf: 'Paso',
            of: 'de',
            steps: [
                {
                    title: '¡Bienvenido a TrazaControl! 👋',
                    text: 'Te damos la bienvenida a tu sistema integral de Trazabilidad y APPCC. En este recorrido interactivo te explicaremos detalladamente cada una de las secciones del menú para que domines todas las funcionalidades y tu negocio cumpla con la normativa sanitaria sin esfuerzo.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="dashboard"]',
                    nav: 'dashboard',
                    title: '📊 1. Panel Principal (Dashboard)',
                    text: 'Es el centro de control de tu negocio. Aquí ves de un vistazo tus indicadores clave (KPIs): productos en trazabilidad, incidencias abiertas, porcentaje de temperaturas correctas y la puntuación de cumplimiento APPCC global. Incluye alertas de seguridad alimentaria en tiempo real y botones de acción rápida.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="traceability"]',
                    nav: 'traceability',
                    title: '🏷️ 2. Trazabilidad y Lotes',
                    text: 'Gestiona la trazabilidad completa hacia adelante y hacia atrás. Crea productos elaborados o materias primas con lote interno, fecha de elaboración y caducidad. Asocia ingredientes, proveedores y marca automáticamente los alérgenos obligatorios de la UE. ¡Además puedes imprimir etiquetas con código para tus envases!'
                },
                {
                    sel: '.sidebar .nav-item[data-module="temperature"]',
                    nav: 'temperature',
                    title: '🌡️ 3. Temperatura y Humedad',
                    text: 'Supervisa los Puntos de Control Crítico (PCC) de conservación. Da de alta tus cámaras frigoríficas, congeladores, vitrinas o secaderos definiendo sus límites máximos de temperatura y humedad. Registra las lecturas periódicas con un solo clic; el sistema detecta desviaciones y avisa de roturas de la cadena de frío.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="pest_control"]',
                    nav: 'pest_control',
                    title: '🐜 4. Control de Plagas (D+D)',
                    text: 'Cumple con el Plan de Desratización y Desinsectación exigido por Sanidad. Registra los datos de la empresa autorizada (número ROESB y certificado de tratamiento), ubica los puntos de cebado, trampas de luz o feromonas en tu instalación y anota los resultados de cada inspección periódica.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="cleaning"]',
                    nav: 'cleaning',
                    title: '✨ 5. Plan de Limpieza y Desinfección (L+D)',
                    text: 'Garantiza la máxima higiene en tus instalaciones. Define zonas de trabajo (cocina, cámaras, almacén, aseos) y cataloga los productos químicos homologados con sus dosis y fichas. Planifica frecuencias diarias, semanales o mensuales y registra las limpiezas realizadas con firma del operario.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="water"]',
                    nav: 'water',
                    title: '💧 6. Control del Agua Potable',
                    text: 'Verifica la potabilidad del agua utilizada en la elaboración y limpieza. Registra los puntos de toma de muestras (grifos de red, depósitos) y apunta los controles rutinarios de cloro libre residual y pH según el Real Decreto técnico-sanitario, con aviso automático ante valores no aptos.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="incidents"]',
                    nav: 'incidents',
                    title: '⚠️ 7. Incidencias y Medidas Correctoras',
                    text: 'Registra cualquier no conformidad sanitaria detectada: rotura de cadena de frío, fallos de etiquetado, alérgenos no identificados o envases deteriorados. Asigna gravedad, describe la medida correctora aplicada de inmediato y las acciones preventivas para justificar diligencia ante inspectores.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="stock"]',
                    nav: 'stock',
                    title: '📦 8. Control de Stock e Inventario',
                    text: 'Monitorea las existencias de materias primas, envases y consumibles en tiempo real. Configura stocks mínimos para recibir avisos antes de quedarte sin producto y controla automáticamente las entradas y salidas para optimizar compras y evitar caducidades en almacén.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="recipes"]',
                    nav: 'recipes',
                    title: '📋 9. Fichas Técnicas y Escandallos',
                    text: 'Estandariza tus recetas y elaboraciones. Detalla los ingredientes exactos, cantidades, mermas y modo de preparación. La app calcula de forma automática la presencia de los 14 alérgenos de declaración obligatoria según los ingredientes seleccionados, asegurando información legal perfecta.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="suppliers"]',
                    nav: 'suppliers',
                    title: '🚚 10. Homologación de Proveedores',
                    text: 'Mantén un fichero completo y auditado de todos tus proveedores de materias primas y servicios. Guarda su razón social, NIF/CIF, número de Registro Sanitario Oficial (RGSEAA), teléfonos de contacto rápido y su documentación o certificados de calidad.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="goods_entry"]',
                    nav: 'goods_entry',
                    title: '📥 11. Recepción de Mercancías',
                    text: 'Controla la entrada de materias primas en el momento de la descarga: verifica albarán, proveedor, lote del fabricante y fecha de caducidad. Comprueba la temperatura del producto al llegar (refrigerado/congelado), la higiene del vehículo y la integridad de los embalajes.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="reports"]',
                    nav: 'reports',
                    title: '📑 12. Informes y Dossier para Inspecciones',
                    text: 'Genera el dossier sanitario oficial con un solo clic. Filtra por fechas y módulos para obtener informes completos listos para imprimir o presentar ante inspectores de Sanidad. También puedes realizar copias de seguridad de todos tus registros descargándolos en formato JSON.'
                },
                {
                    sel: '#connection-status-badge',
                    title: '☁️ Sincronización y Modo 100% Offline',
                    text: 'TrazaControl está diseñado como una PWA Offline-First. Puedes registrar temperaturas o lotes dentro de cámaras frigoríficas, sótanos o zonas sin cobertura móvil ni WiFi. Los datos se guardan en el dispositivo y se sincronizan automáticamente con la nube al recuperar conexión.'
                },
                {
                    title: '🚀 ¡Todo listo para comenzar!',
                    text: 'Has recorrido todas las herramientas sanitarias de TrazaControl. Si en algún momento tienes dudas, pulsa el botón con icono de interrogación (?) en la barra superior para volver a iniciar esta guía. ¡Mucho éxito en la gestión de tu negocio!'
                }
            ]
        },
        en: {
            next: 'Next',
            prev: 'Back',
            skip: 'Skip tour',
            done: 'Got it, let\'s start!',
            stepOf: 'Step',
            of: 'of',
            steps: [
                {
                    title: 'Welcome to TrazaControl! 👋',
                    text: 'Welcome to your complete Traceability and HACCP management system. This interactive tour will walk you through each menu section step-by-step so you can master every feature and ensure food safety compliance effortlessly.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="dashboard"]',
                    nav: 'dashboard',
                    title: '📊 1. Main Dashboard',
                    text: 'Your business mission control. View your key KPIs at a glance: active products, open incidents, temperature reading success rate, and overall HACCP compliance score. Includes real-time safety alerts and quick-action shortcuts.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="traceability"]',
                    nav: 'traceability',
                    title: '🏷️ 2. Product Traceability & Batches',
                    text: 'Manage end-to-end One-Up / One-Down traceability. Record finished products or raw materials with internal batch numbers, production and expiry dates. Link ingredients, suppliers, and EU allergens, and print compliant product labels!'
                },
                {
                    sel: '.sidebar .nav-item[data-module="temperature"]',
                    nav: 'temperature',
                    title: '🌡️ 3. Temperature & Humidity',
                    text: 'Control critical preservation points (CCPs). Set up fridges, freezers, displays, and drying rooms with custom temperature and humidity limits. Log routine readings in one click, and receive alerts if cold chain thresholds are exceeded.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="pest_control"]',
                    nav: 'pest_control',
                    title: '🐜 4. Pest Control Plan (D+D)',
                    text: 'Keep compliant pest prevention records. Save authorized pest control company details (registration and treatment certificates), mark bait stations or light traps, and log periodic inspection results and corrective actions.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="cleaning"]',
                    nav: 'cleaning',
                    title: '✨ 5. Cleaning & Disinfection (C&D)',
                    text: 'Ensure optimal facility hygiene. Define areas (kitchen, cold rooms, restrooms, machinery) and catalog approved cleaning chemicals with dosage guidelines. Schedule daily, weekly, or monthly cleaning tasks with staff sign-offs.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="water"]',
                    nav: 'water',
                    title: '💧 6. Water Quality Control',
                    text: 'Ensure drinking water safety across processing and cleaning areas. Track sampling taps and tanks, and log periodic free residual chlorine and pH tests according to sanitary regulations, with instant warnings for out-of-spec values.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="incidents"]',
                    nav: 'incidents',
                    title: '⚠️ 7. Incidents & Corrective Actions',
                    text: 'Log any hygiene non-conformities: cold chain breaches, packaging defects, unlabeled allergens, or equipment failures. Assign severity, record immediate corrective measures, and establish preventive actions for health inspections.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="stock"]',
                    nav: 'stock',
                    title: '📦 8. Inventory & Stock Control',
                    text: 'Track raw materials, packaging, and consumables in real time. Configure safety stock thresholds to trigger low-stock alerts, and trace inbound/outbound movements linked to production to avoid wastage and expiration.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="recipes"]',
                    nav: 'recipes',
                    title: '📋 9. Recipe Cards & Costing',
                    text: 'Standardize recipes and production sheets. Enter weights, shrinkage, and preparation instructions. The app automatically calculates the 14 mandatory EU allergens from your selected ingredients, guaranteeing compliant customer disclosures.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="suppliers"]',
                    nav: 'suppliers',
                    title: '🚚 10. Approved Supplier Directory',
                    text: 'Maintain an audited directory of all food and service suppliers. Record tax IDs, official sanitary registry numbers (RGSEAA), emergency contacts, and quality certificates or technical product sheets.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="goods_entry"]',
                    nav: 'goods_entry',
                    title: '📥 11. Goods Inbound Reception',
                    text: 'Verify raw materials upon delivery: inspect delivery notes, supplier, manufacturer lot, and expiry date. Check and record arrival temperatures (chilled/frozen), delivery vehicle hygiene, and packaging integrity.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="reports"]',
                    nav: 'reports',
                    title: '📑 12. Inspection Dossier & Reports',
                    text: 'Generate official inspection-ready dossiers in one click. Filter by date and module to print or export comprehensive PDF records for health auditors. Export complete JSON backups of all your records anytime.'
                },
                {
                    sel: '#connection-status-badge',
                    title: '☁️ Cloud Sync & 100% Offline Mode',
                    text: 'TrazaControl is built as an Offline-First PWA. You can record data inside walk-in freezers, basements, or areas without network connectivity. Your data is stored locally and securely synced to the cloud once you reconnect.'
                },
                {
                    title: '🚀 All set to get started!',
                    text: 'You have completed the full walkthrough of TrazaControl! If you ever need a refresher, click the question mark (?) help button in the top header to launch this tour again. Wishing you great success with your business!'
                }
            ]
        },
        pt: {
            next: 'Seguinte',
            prev: 'Voltar',
            skip: 'Saltar tour',
            done: 'Entendido, começar!',
            stepOf: 'Passo',
            of: 'de',
            steps: [
                {
                    title: 'Bem-vindo ao TrazaControl! 👋',
                    text: 'Damos-lhe as boas-vindas ao seu sistema integrado de Rastreabilidade e HACCP. Neste tour detalhado, explicaremos cada secção do menu lateral para que domine todas as funcionalidades e cumpra a legislação sanitária facilmente.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="dashboard"]',
                    nav: 'dashboard',
                    title: '📊 1. Painel Principal (Dashboard)',
                    text: 'O centro de controlo do seu negócio. Veja os seus indicadores chave (KPIs): produtos em rastreabilidade, ocorrências abertas, percentagem de temperaturas conformes e pontuação global HACCP, com alertas em tempo real e atalhos rápidos.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="traceability"]',
                    nav: 'traceability',
                    title: '🏷️ 2. Rastreabilidade e Lotes',
                    text: 'Gestão completa de rastreabilidade a montante e a jusante. Crie produtos elaborados ou matérias-primas com lote, data de fabrico e validade. Associe ingredientes, fornecedores e alergénios obrigatórios da UE, e imprima etiquetas!'
                },
                {
                    sel: '.sidebar .nav-item[data-module="temperature"]',
                    nav: 'temperature',
                    title: '🌡️ 3. Temperatura e Humidade',
                    text: 'Monitorize os Pontos Críticos de Controlo (PCC) de frio e calor. Registe câmaras frigoríficas, arcas e vitrinas com limites máximos de temperatura e humidade. Anote leituras periódicas com deteção automática de quebras na cadeia de frio.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="pest_control"]',
                    nav: 'pest_control',
                    title: '🐜 4. Controlo de Pragas (D+D)',
                    text: 'Registo do plano de desratização e desinsetização. Guarde os dados da empresa autorizada e certificado de tratamento, mapeie pontos de isco ou armadilhas luminosas e registe as inspeções periódicas.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="cleaning"]',
                    nav: 'cleaning',
                    title: '✨ 5. Plano de Limpeza e Desinfeção (L+D)',
                    text: 'Garante a higiene ideal nas instalações. Defina zonas de trabalho (cozinha, câmaras, sanitários) e produtos químicos homologados com dosagens. Agende frequências diárias, semanais ou mensais com assinatura do operador.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="water"]',
                    nav: 'water',
                    title: '💧 6. Controlo de Água Potável',
                    text: 'Assegura a potabilidade da água utilizada nas instalações. Registe pontos de amostragem (torneiras, depósitos) e anote os controlos periódicos de cloro residual livre e pH de acordo com a legislação sanitária.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="incidents"]',
                    nav: 'incidents',
                    title: '⚠️ 7. Não Conformidades e Ações Corretivas',
                    text: 'Registe desvios detetados: quebra de frio, falhas de rotulagem ou embalagens danificadas. Atribua gravidade, descreva medidas corretivas imediatas e ações preventivas para comprovar diligência perante auditorias.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="stock"]',
                    nav: 'stock',
                    title: '📦 8. Controlo de Stock e Inventário',
                    text: 'Supervisione existências de matérias-primas e embalagens em tempo real. Configure stock mínimo para avisos de reposição e controle movimentos de entrada/saída vinculados às suas produções.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="recipes"]',
                    nav: 'recipes',
                    title: '📋 9. Fichas Técnicas e Escorço',
                    text: 'Padronize as receitas e produções. Indique pesos, quebras e modo de confeção. A aplicação deteta automaticamente os 14 alergénios de declaração obrigatória com base nos ingredientes selecionados.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="suppliers"]',
                    nav: 'suppliers',
                    title: '🚚 10. Qualificação de Fornecedores',
                    text: 'Registo auditado de todos os fornecedores. Guarde NIF, número de Registo Sanitário, contactos e certificados de qualidade ou fichas técnicas de cada distribuidor.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="goods_entry"]',
                    nav: 'goods_entry',
                    title: '📥 11. Receção de Mercadorias',
                    text: 'Controle a receção de matérias-primas na entrega: guias, lote do fabricante e validade. Verifique a temperatura dos produtos refrigerados/congelados, higiene da viatura e integridade das embalagens.'
                },
                {
                    sel: '.sidebar .nav-item[data-module="reports"]',
                    nav: 'reports',
                    title: '📑 12. Relatórios e Dossier Sanitário',
                    text: 'Crie dossiers sanitários oficiais com um clique. Filtre por datas e módulos para obter relatórios prontos a imprimir para inspetores de saúde. Exporte cópias de segurança integrais em formato JSON.'
                },
                {
                    sel: '#connection-status-badge',
                    title: '☁️ Sincronização e Modo 100% Offline',
                    text: 'O TrazaControl é uma PWA Offline-First. Pode trabalhar no interior de câmaras frigoríficas ou locais sem rede. Os dados são guardados no dispositivo e sincronizados com a nuvem assim que recupera ligação.'
                },
                {
                    title: '🚀 Tudo pronto para começar!',
                    text: 'Completou o tour por todas as funcionalidades do TrazaControl! Caso tenha dúvidas, clique no ícone de interrogação (?) no cabeçalho para rever este guia a qualquer momento. Sucesso no seu negócio!'
                }
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
        try {
            if (typeof Auth !== 'undefined' && Auth.isDemoMode && Auth.isDemoMode()) {
                return FLAG_DONE_PREFIX + 'demo';
            }
            const uid = (typeof Auth !== 'undefined' && Auth.getUserId && Auth.getUserId()) || 'anon';
            return FLAG_DONE_PREFIX + uid;
        } catch (e) {
            return FLAG_DONE_PREFIX + 'anon';
        }
    }

    function markPending() { try { localStorage.setItem(FLAG_PENDING, '1'); } catch (e) {} }

    function maybeStart() {
        try {
            const key = userKey();
            if (localStorage.getItem(key) === '1') return;
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
        if (overlay) finish();
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

        // Navigate to the module so the user actually sees the page
        if (s.nav && typeof App !== 'undefined' && App.navigateTo) {
            try {
                App.navigateTo(s.nav);
            } catch (err) {}
        }

        const target = visibleTarget(s.sel);
        const last = idx === steps.length - 1;
        const total = steps.length;
        const progressPct = Math.round(((idx + 1) / total) * 100);

        overlay.classList.toggle('tour-dim', !target);

        pop.innerHTML =
            '<div class="tour-progress-bar"><div class="tour-progress-fill" style="width:' + progressPct + '%"></div></div>' +
            '<div class="tour-header-row">' +
            '  <span class="tour-step">' + (t.stepOf || 'Paso') + ' ' + (idx + 1) + ' ' + t.of + ' ' + total + '</span>' +
            '  <span style="font-size:11px;font-weight:600;opacity:0.7;">' + progressPct + '%</span>' +
            '</div>' +
            '<h4 class="tour-title"></h4>' +
            '<p class="tour-text"></p>' +
            '<div class="tour-actions">' +
            (last ? '' : '<button type="button" class="tour-skip">' + t.skip + '</button>') +
            '<span class="tour-spacer"></span>' +
            (idx > 0 ? '<button type="button" class="tour-prev">' + t.prev + '</button>' : '') +
            '<button type="button" class="tour-next">' + (last ? t.done : t.next) + '</button>' +
            '</div>';

        pop.querySelector('.tour-title').textContent = s.title;
        pop.querySelector('.tour-text').textContent = s.text;
        pop.querySelector('.tour-next').onclick = () => (last ? finish() : go(1));
        const prev = pop.querySelector('.tour-prev'); if (prev) prev.onclick = () => go(-1);
        const skip = pop.querySelector('.tour-skip'); if (skip) skip.onclick = finish;

        if (target) {
            try {
                target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            } catch (e) {}

            const r = target.getBoundingClientRect();
            const pad = 6;
            spot.style.cssText =
                'display:block;' +
                'top:' + (r.top - pad) + 'px;' +
                'left:' + (r.left - pad) + 'px;' +
                'width:' + (r.width + pad * 2) + 'px;' +
                'height:' + (r.height + pad * 2) + 'px;';

            const pw = Math.min(420, window.innerWidth - 32);
            pop.style.width = pw + 'px';

            let left = r.right + 18;
            let top = r.top - 8;

            // If no room at the right (e.g. mobile or small window), position below/above target
            if (left + pw > window.innerWidth - 16) {
                left = Math.max(16, Math.min(r.left, window.innerWidth - pw - 16));
                top = r.bottom + 14;
            }

            const ph = pop.offsetHeight || 220;
            if (top + ph > window.innerHeight - 16) {
                top = Math.max(16, window.innerHeight - ph - 16);
            }
            if (top < 16) top = 16;

            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
            pop.style.transform = 'none';
        } else {
            spot.style.display = 'none';
            pop.style.width = Math.min(440, window.innerWidth - 32) + 'px';
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

    function replay() {
        if (overlay) finish();
        start();
    }

    return { markPending, maybeStart, start: replay, finish };
})();
