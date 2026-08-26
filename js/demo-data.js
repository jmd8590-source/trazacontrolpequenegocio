/* ============================================================
   TrazaControl — Demo Data Generator
   Populates complete realistic artisan data for instant evaluation
   ============================================================ */

const DemoData = (function() {
    'use strict';

    async function load(userId) {
        // 1. Control Points - Temperature
        const p1 = await TrazaDB.create('temperature_points', {
            userId,
            name: 'Cámara Frigorífica Principal (Lácteos y Masas)',
            type: 'cold_room',
            minTemp: 0.0,
            maxTemp: 4.0
        });

        const p2 = await TrazaDB.create('temperature_points', {
            userId,
            name: 'Congelador de Materias Primas',
            type: 'freezer',
            minTemp: -22.0,
            maxTemp: -18.0
        });

        const p3 = await TrazaDB.create('temperature_points', {
            userId,
            name: 'Vitrina Expositora Pastelería',
            type: 'display_fridge',
            minTemp: 2.0,
            maxTemp: 6.0
        });

        const p4 = await TrazaDB.create('temperature_points', {
            userId,
            name: 'Cámara de Fermentación Controlada',
            type: 'workspace',
            minTemp: 14.0,
            maxTemp: 18.0
        });

        // 2. Temperature Readings
        const now = Date.now();
        const hour = 3600 * 1000;
        const day = 24 * hour;

        await TrazaDB.create('temperature_readings', {
            userId, pointId: p1.id, temperature: 3.2,
            date: new Date(now - hour).toISOString(), responsible: 'Carlos Maestro'
        });
        await TrazaDB.create('temperature_readings', {
            userId, pointId: p1.id, temperature: 2.8,
            date: new Date(now - day).toISOString(), responsible: 'María Ayudante'
        });

        await TrazaDB.create('temperature_readings', {
            userId, pointId: p2.id, temperature: -19.5,
            date: new Date(now - hour * 2).toISOString(), responsible: 'Carlos Maestro'
        });

        await TrazaDB.create('temperature_readings', {
            userId, pointId: p3.id, temperature: 4.5,
            date: new Date(now - hour * 3).toISOString(), responsible: 'Ana Venta'
        });

        await TrazaDB.create('temperature_readings', {
            userId, pointId: p4.id, temperature: 16.0,
            date: new Date(now - hour * 4).toISOString(), responsible: 'Carlos Maestro'
        });

        // 3. Pest Control
        await TrazaDB.create('pest_company', {
            userId,
            name: 'BioControl Sanidad Ambiental S.L.',
            phone: '912 345 678',
            email: 'contacto@biocontrolsanidad.es',
            contractNumber: 'BC-2026-8849',
            contractExpiry: new Date(now + 180 * day).toISOString().split('T')[0]
        });

        await TrazaDB.create('pest_points', { userId, name: 'Cebo 1', code: 'CB-01', type: 'bait_station', location: 'Puerta trasera muelle' });
        await TrazaDB.create('pest_points', { userId, name: 'Cebo 2', code: 'CB-02', type: 'bait_station', location: 'Almacén harinas' });
        await TrazaDB.create('pest_points', { userId, name: 'Electrocutor 1', code: 'EL-01', type: 'insect_trap', location: 'Entrada obrador' });

        await TrazaDB.create('pest_inspections', {
            userId,
            date: new Date(now - 14 * day).toISOString().split('T')[0],
            inspector: 'Javier Morales (Técnico Cualificado)',
            findings: 'Sin presencia de roedores ni insectos rastreros. Trampas y cebos en perfecto estado.',
            severity: 'none',
            treatment: 'Revisión y recambio de atrayentes.',
            nextInspection: new Date(now + 76 * day).toISOString().split('T')[0]
        });

        // 4. Cleaning Zones & Logs
        const z1 = await TrazaDB.create('cleaning_zones', {
            userId, name: 'Mesas de Trabajo de Acero Inoxidable', frequency: 'daily',
            product: 'Diversey Suma Bac D10 (Desinfectante Grado Alimentario)'
        });
        const z2 = await TrazaDB.create('cleaning_zones', {
            userId, name: 'Amasadoras y Batidoras Planetarias', frequency: 'after_use',
            product: 'Detergente Neutro Espumante + Solución Clorada 200ppm'
        });
        const z3 = await TrazaDB.create('cleaning_zones', {
            userId, name: 'Suelo de Obrador y Rejillas de Desagüe', frequency: 'daily',
            product: 'Desengrasante Alcalino Sanitario'
        });
        const z4 = await TrazaDB.create('cleaning_zones', {
            userId, name: 'Cámaras Frigoríficas (Paredes y Baldas)', frequency: 'weekly',
            product: 'Sanitizante hidroalcohólico sin aclarado'
        });

        await TrazaDB.create('cleaning_logs', {
            userId, zoneId: z1.id, zoneName: z1.name,
            date: new Date(now - hour * 5).toISOString(), cleanedBy: 'Carlos Maestro',
            product: 'Diversey Suma Bac D10', conformity: 'conform'
        });
        await TrazaDB.create('cleaning_logs', {
            userId, zoneId: z2.id, zoneName: z2.name,
            date: new Date(now - hour * 8).toISOString(), cleanedBy: 'María Ayudante',
            product: 'Detergente Neutro', conformity: 'conform'
        });
        await TrazaDB.create('cleaning_logs', {
            userId, zoneId: z3.id, zoneName: z3.name,
            date: new Date(now - day).toISOString(), cleanedBy: 'Carlos Maestro',
            product: 'Desengrasante Alcalino', conformity: 'conform'
        });

        // 5. Water Control
        const wp = await TrazaDB.create('water_points', {
            userId, name: 'Grifo Obrador Principal (Filtro Osmosis)', location: 'Fregadero central'
        });
        await TrazaDB.create('water_readings', {
            userId, pointId: wp.id, pointName: wp.name,
            chlorine: 0.45, ph: 7.2,
            date: new Date(now - 2 * day).toISOString().split('T')[0],
            responsible: 'Carlos Maestro'
        });

        // 6. Suppliers
        const s1 = await TrazaDB.create('suppliers', {
            userId, name: 'Harinera del Valle Tradicional S.A.',
            contact: 'Esteban Martínez', phone: '987 654 321', email: 'pedidos@harineradelvalle.es',
            address: 'Polígono Ind. Los Llanos, Parc. 4, Zamora',
            registrationNumber: 'RS-ESP-20.04981/ZA',
            status: 'approved', certifications: 'IFS Food, Certificado Ecológico ES-ECO-016-CL',
            productsSupplied: 'Harina de Trigo W300, Harina Centeno Integral, Harina Espelta'
        });

        const s2 = await TrazaDB.create('suppliers', {
            userId, name: 'Lácteos Artesanos de la Sierra',
            contact: 'Lucía Fernández', phone: '942 112 233', email: 'info@lacteossierra.com',
            address: 'Carretera del Puerto s/n, Cantabria',
            registrationNumber: 'RS-ESP-15.01234/S',
            status: 'approved', certifications: 'Denominación de Origen Protegida',
            productsSupplied: 'Mantequilla 84% M.G., Leche Entera Fresca, Nata Pura 38%'
        });

        // 7. Traceability Products
        await TrazaDB.create('products', {
            userId,
            name: 'Pan de Masa Madre de Centeno y Trigo (750g)',
            code: 'PAN-MM-01',
            batchNumber: 'LOT-2026-0826-A',
            category: 'finished',
            manufacturingDate: new Date(now - 6 * hour).toISOString().split('T')[0],
            expiryDate: new Date(now + 4 * day).toISOString().split('T')[0],
            weight: '750g',
            storageConditions: 'Lugar fresco y seco, temperatura ambiente (18-22°C)',
            allergens: ['gluten'],
            ingredients: [
                { name: 'Harina de Trigo Ecológica W300', batch: 'HAR-2026-0412', qty: '450g' },
                { name: 'Harina de Centeno Integral', batch: 'CEN-2026-0399', qty: '150g' },
                { name: 'Masa Madre Viva de Cultivo Propio', batch: 'MM-NAT-0825', qty: '120g' },
                { name: 'Agua de Red Descalcificada', batch: 'AGUA-0826', qty: '420ml' },
                { name: 'Sal Marina Virgen', batch: 'SAL-2026-010', qty: '12g' }
            ],
            additives: [],
            notes: 'Fermentación lenta de 24 horas a 16°C. Horneado en solera de piedra refractaria.'
        });

        await TrazaDB.create('products', {
            userId,
            name: 'Croissant Francés de Mantequilla Pura (85g)',
            code: 'BOL-CRO-02',
            batchNumber: 'LOT-2026-0826-B',
            category: 'finished',
            manufacturingDate: new Date(now - 4 * hour).toISOString().split('T')[0],
            expiryDate: new Date(now + 2 * day).toISOString().split('T')[0],
            weight: '85g',
            storageConditions: 'Conservar en vitrina protegida o consumir en 48h',
            allergens: ['gluten', 'milk', 'eggs'],
            ingredients: [
                { name: 'Harina Gran Fuerza W360', batch: 'HAR-2026-0412', qty: '50g' },
                { name: 'Mantequilla Artesana 84% MG', batch: 'MAN-2026-0818', qty: '28g' },
                { name: 'Leche Fresca Entera', batch: 'LEC-2026-0824', qty: '20ml' },
                { name: 'Huevos Camperos Categoría A', batch: 'HUE-2026-0822', qty: '10g' },
                { name: 'Levadura Fresca Prensada', batch: 'LEV-2026-0820', qty: '2g' }
            ],
            additives: [
                { code: 'E-300', name: 'Ácido Ascórbico', func: 'Mejorante de masa / Antioxidante', dosage: '20 ppm' }
            ],
            notes: 'Hojaldrado manual de 3 pliegues simples. Reposo en frío 12 horas.'
        });

        // 8. Goods Entries
        await TrazaDB.create('goods_entries', {
            userId,
            productName: 'Harina de Trigo Ecológica W300',
            supplierId: s1.id,
            supplierName: s1.name,
            batchNumber: 'HAR-2026-0412',
            quantity: 500,
            unit: 'kg',
            date: new Date(now - 3 * day).toISOString().split('T')[0],
            expiryDate: new Date(now + 180 * day).toISOString().split('T')[0],
            deliveryNote: 'ALB-88902',
            tempReception: 19.5,
            conformity: 'conform',
            receivedBy: 'Carlos Maestro',
            notes: 'Sacos intactos, vehículo de transporte limpio, sin presencia de humedad.'
        });

        await TrazaDB.create('goods_entries', {
            userId,
            productName: 'Mantequilla Artesana 84% MG',
            supplierId: s2.id,
            supplierName: s2.name,
            batchNumber: 'MAN-2026-0818',
            quantity: 80,
            unit: 'kg',
            date: new Date(now - 2 * day).toISOString().split('T')[0],
            expiryDate: new Date(now + 45 * day).toISOString().split('T')[0],
            deliveryNote: 'ALB-33419',
            tempReception: 3.8,
            conformity: 'conform',
            receivedBy: 'Carlos Maestro',
            notes: 'Vehículo isotermo a 3.5°C. Bloques de mantequilla firmes sin deformaciones.'
        });

        // 9. Stock Items
        await TrazaDB.create('stock_items', {
            userId, name: 'Harina de Trigo Ecológica W300', category: 'Harinas', unit: 'kg',
            currentStock: 420, minStock: 100, expiry: new Date(now + 180 * day).toISOString().split('T')[0],
            batch: 'HAR-2026-0412', location: 'Palet A1'
        });

        await TrazaDB.create('stock_items', {
            userId, name: 'Mantequilla Artesana 84% MG', category: 'Lácteos', unit: 'kg',
            currentStock: 65, minStock: 20, expiry: new Date(now + 45 * day).toISOString().split('T')[0],
            batch: 'MAN-2026-0818', location: 'Cámara 1 - Estante 2'
        });

        await TrazaDB.create('stock_items', {
            userId, name: 'Levadura Fresca Prensada', category: 'Levaduras', unit: 'kg',
            currentStock: 3.5, minStock: 5.0, expiry: new Date(now + 8 * day).toISOString().split('T')[0],
            batch: 'LEV-2026-0820', location: 'Cámara 1 - Estante 1'
        });

        await TrazaDB.create('stock_items', {
            userId, name: 'Huevos Camperos Categoría A', category: 'Huevos', unit: 'ud',
            currentStock: 180, minStock: 60, expiry: new Date(now + 15 * day).toISOString().split('T')[0],
            batch: 'HUE-2026-0822', location: 'Cámara 1 - Zona Huevos'
        });

        // 10. Recipes
        await TrazaDB.create('recipes', {
            userId,
            name: 'Pan de Masa Madre Rústico',
            category: 'Panadería',
            servings: 20,
            prepTime: '24 horas',
            emoji: '🥖',
            allergens: ['gluten'],
            ingredients: [
                { name: 'Harina de Trigo W300', qty: '10 kg' },
                { name: 'Masa Madre Natural', qty: '2.5 kg' },
                { name: 'Agua', qty: '7.5 L' },
                { name: 'Sal Marina', qty: '200 g' }
            ],
            steps: [
                'Autólisis de harina y agua durante 45 minutos a 20°C.',
                'Incorporación de masa madre y sal. Amasado en primera velocidad durante 8 minutos.',
                'Fermentación en bloque durante 3 horas con 3 plegados cada 45 minutos.',
                'División en piezas de 750g y boleado suave.',
                'Reposo y formado en bannetons. Fermentación retardada a 14°C durante 16 horas.',
                'Horneado con vapor a 240°C solera / 220°C techo durante 45 minutos.'
            ]
        });

        await TrazaDB.create('recipes', {
            userId,
            name: 'Croissants de Mantequilla de Hojaldre',
            category: 'Bollería',
            servings: 60,
            prepTime: '18 horas',
            emoji: '🥐',
            allergens: ['gluten', 'milk', 'eggs'],
            ingredients: [
                { name: 'Harina Gran Fuerza W360', qty: '3 kg' },
                { name: 'Mantequilla Bloque 84% MG (Empaste)', qty: '1.5 kg' },
                { name: 'Leche Fresca Entera', qty: '1.2 L' },
                { name: 'Azúcar Blanco', qty: '350 g' },
                { name: 'Sal Fina', qty: '60 g' },
                { name: 'Levadura Fresca', qty: '100 g' }
            ],
            steps: [
                'Amasado del plastón hasta conseguir masa elástica sin calentar (máx 22°C).',
                'Reposo en cámara frigorífica a 2°C durante 2 horas.',
                'Laminado del bloque de mantequilla e inserción en el centro del plastón.',
                'Dar 3 pliegues simples con reposos de 30 minutos en frío entre cada uno.',
                'Estirado final a 3.5mm de grosor y corte en triángulos de 9x21cm.',
                'Formado de piezas y fermentación a 26°C (humedad 75%) durante 2h 30m.',
                'Pintado con huevo y horneado a 180°C durante 17 minutos.'
            ]
        });

        // 11. Incidents & Corrective Actions
        const inc1 = await TrazaDB.create('incidents', {
            userId,
            title: 'Desviación de temperatura en Vitrina Expositora (+7.2°C)',
            date: new Date(now - 5 * day).toISOString().split('T')[0],
            detectedBy: 'Ana Venta',
            severity: 'medium',
            type: 'temperature',
            zone: 'Vitrina Pastelería Tienda',
            description: 'En el control matutino rutinario se detectó que la vitrina marcaba 7.2°C (límite máx. 6.0°C) debido a condensador obstruido por polvo.',
            status: 'resolved'
        });

        await TrazaDB.create('corrective_actions', {
            userId,
            incidentId: inc1.id,
            description: 'Limpieza inmediata del filtro y condensador por parte del servicio de mantenimiento. Traslado provisional del producto perecedero a la cámara central.',
            responsible: 'Carlos Maestro (Gerente)',
            actionDate: new Date(now - 5 * day).toISOString().split('T')[0],
            verificationDate: new Date(now - 4 * day).toISOString().split('T')[0],
            effective: 'yes'
        });

        return true;
    }

    return { load };
})();
