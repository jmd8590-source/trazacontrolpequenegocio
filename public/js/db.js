/* ============================================================
   TrazaControl — Hybrid Database Layer (IndexedDB + Supabase Cloud Sync)
   Persistent local storage with background cloud synchronization
   ============================================================ */

const TrazaDB = (function() {
    'use strict';

    const DB_NAME = 'TrazaControlDB';
    const DB_VERSION = 1;
    let db = null;

    const STORES = {
        users: { keyPath: 'id', indexes: ['email'] },
        products: { keyPath: 'id', indexes: ['userId', 'name', 'batchNumber', 'category'] },
        temperature_points: { keyPath: 'id', indexes: ['userId'] },
        temperature_readings: { keyPath: 'id', indexes: ['userId', 'pointId', 'date'] },
        pest_company: { keyPath: 'id', indexes: ['userId'] },
        pest_points: { keyPath: 'id', indexes: ['userId'] },
        pest_inspections: { keyPath: 'id', indexes: ['userId', 'date'] },
        cleaning_zones: { keyPath: 'id', indexes: ['userId'] },
        cleaning_logs: { keyPath: 'id', indexes: ['userId', 'zoneId', 'date'] },
        cleaning_products: { keyPath: 'id', indexes: ['userId'] },
        incidents: { keyPath: 'id', indexes: ['userId', 'status', 'severity', 'date'] },
        corrective_actions: { keyPath: 'id', indexes: ['userId', 'incidentId'] },
        stock_items: { keyPath: 'id', indexes: ['userId', 'category', 'name'] },
        stock_movements: { keyPath: 'id', indexes: ['userId', 'itemId', 'date', 'type'] },
        recipes: { keyPath: 'id', indexes: ['userId', 'category'] },
        productions: { keyPath: 'id', indexes: ['userId', 'recipeId', 'date'] },
        suppliers: { keyPath: 'id', indexes: ['userId', 'status'] },
        goods_entries: { keyPath: 'id', indexes: ['userId', 'supplierId', 'date'] },
        water_points: { keyPath: 'id', indexes: ['userId'] },
        water_readings: { keyPath: 'id', indexes: ['userId', 'pointId', 'date'] },
        settings: { keyPath: 'id', indexes: ['userId'] }
    };

    // Helper: Convert object keys from camelCase to snake_case for Supabase SQL
    function toSnakeCase(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const n = {};
        for (const [k, v] of Object.entries(obj)) {
            const sk = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            n[sk] = v;
        }
        return n;
    }

    // Helper: Convert object keys from snake_case to camelCase
    function toCamelCase(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
        const n = {};
        for (const [k, v] of Object.entries(obj)) {
            const ck = k.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            n[ck] = v;
        }
        return n;
    }

    // Supabase Cloud Sync helper
    async function syncToSupabase(action, storeName, record, id) {
        try {
            if (typeof Auth === 'undefined' || Auth.isDemoMode()) return;
            const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
            if (!supabase) return;

            // Map storeName to Supabase table if needed
            const tableName = storeName;
            const snakeRecord = toSnakeCase(record);

            if (action === 'insert' || action === 'update') {
                await supabase.from(tableName).upsert(snakeRecord);
            } else if (action === 'delete') {
                await supabase.from(tableName).delete().eq('id', id);
            }
        } catch (err) {
            console.warn(`[TrazaDB] Background Supabase sync (${action} ${storeName}) notice:`, err.message);
        }
    }

    // Generate unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    }

    // Initialize database
    function init() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                Object.entries(STORES).forEach(([storeName, config]) => {
                    if (!database.objectStoreNames.contains(storeName)) {
                        const store = database.createObjectStore(storeName, {
                            keyPath: config.keyPath
                        });

                        if (config.indexes) {
                            config.indexes.forEach(indexName => {
                                store.createIndex(indexName, indexName, { unique: false });
                            });
                        }
                    }
                });
            };
        });
    }

    // Get a transaction and store
    function getStore(storeName, mode) {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    // Create (add a record)
    function create(storeName, data) {
        return new Promise((resolve, reject) => {
            const record = {
                ...data,
                id: data.id || generateId(),
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const store = getStore(storeName, 'readwrite');
            const request = store.add(record);

            request.onsuccess = () => {
                // Trigger async background sync to Supabase
                syncToSupabase('insert', storeName, record, record.id);
                resolve(record);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Read (get a single record by ID)
    function read(storeName, id) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    // Update a record
    function update(storeName, data) {
        return new Promise((resolve, reject) => {
            const record = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            const store = getStore(storeName, 'readwrite');
            const request = store.put(record);

            request.onsuccess = () => {
                // Trigger async background sync to Supabase
                syncToSupabase('update', storeName, record, record.id);
                resolve(record);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Delete a record
    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const request = store.delete(id);

            request.onsuccess = () => {
                // Trigger async background sync to Supabase
                syncToSupabase('delete', storeName, null, id);
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Get all records from a store
    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Get records by index value
    function getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all records for a specific user
    function getByUser(storeName, userId) {
        return getByIndex(storeName, 'userId', userId);
    }

    // Clear all records from a store
    function clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readwrite');
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // Count records in a store
    function count(storeName) {
        return new Promise((resolve, reject) => {
            const store = getStore(storeName, 'readonly');
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Pull and synchronize all cloud data from Supabase for a given user
    async function syncFromCloud(userId) {
        if (!userId || (typeof Auth !== 'undefined' && Auth.isDemoMode())) return false;
        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (!supabase) return false;

        try {
            const storesToSync = Object.keys(STORES).filter(s => s !== 'users');
            for (const storeName of storesToSync) {
                const { data, error } = await supabase
                    .from(storeName)
                    .select('*')
                    .eq('user_id', userId);

                if (!error && data && data.length > 0) {
                    for (const row of data) {
                        const camelRow = toCamelCase(row);
                        const existing = await read(storeName, camelRow.id);
                        if (existing) {
                            await update(storeName, camelRow);
                        } else {
                            await create(storeName, camelRow);
                        }
                    }
                }
            }
            return true;
        } catch (e) {
            console.warn('[TrazaDB] syncFromCloud warning:', e.message);
            return false;
        }
    }

    // Export all data for a user
    function exportUserData(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const data = {};
                const storeNames = Object.keys(STORES).filter(s => s !== 'users');

                for (const storeName of storeNames) {
                    const records = await getByUser(storeName, userId);
                    if (records.length > 0) {
                        data[storeName] = records;
                    }
                }

                const exportObj = {
                    version: DB_VERSION,
                    exportDate: new Date().toISOString(),
                    appName: 'TrazaControl',
                    data: data
                };

                resolve(exportObj);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Import data for a user
    function importUserData(userId, importData) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!importData || !importData.data) {
                    throw new Error('Invalid import data format');
                }

                let imported = 0;

                for (const [storeName, records] of Object.entries(importData.data)) {
                    if (STORES[storeName]) {
                        for (const record of records) {
                            record.userId = userId;
                            record.id = generateId();
                            record.importedAt = new Date().toISOString();
                            await create(storeName, record);
                            imported++;
                        }
                    }
                }

                resolve({ imported });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Export all data as JSON blob
    function exportToJSON(userId) {
        return exportUserData(userId).then(data => {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `trazacontrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        });
    }

    // Export data as CSV
    function exportToCSV(storeName, userId) {
        return getByUser(storeName, userId).then(records => {
            if (records.length === 0) return false;

            const headers = Object.keys(records[0]);
            const csvRows = [
                headers.join(','),
                ...records.map(record =>
                    headers.map(h => {
                        let val = record[h];
                        if (val === null || val === undefined) val = '';
                        if (typeof val === 'object') val = JSON.stringify(val);
                        val = String(val).replace(/"/g, '""');
                        return `"${val}"`;
                    }).join(',')
                )
            ];

            const csv = csvRows.join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `trazacontrol-${storeName}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        });
    }

    // Delete all user data (for demo cleanup)
    function deleteUserData(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                const storeNames = Object.keys(STORES).filter(s => s !== 'users');

                for (const storeName of storeNames) {
                    const records = await getByUser(storeName, userId);
                    for (const record of records) {
                        await remove(storeName, record.id);
                    }
                }

                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    return {
        init,
        generateId,
        create,
        read,
        update,
        remove,
        getAll,
        getByIndex,
        getByUser,
        clearStore,
        count,
        syncFromCloud,
        exportUserData,
        importUserData,
        exportToJSON,
        exportToCSV,
        deleteUserData,
        STORES
    };
})();
