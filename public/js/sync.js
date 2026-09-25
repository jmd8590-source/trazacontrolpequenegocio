/* ============================================================
   TrazaControl — Offline Synchronization Engine (TrazaSync)
   Provides automatic queueing and bidirectional synchronization
   between IndexedDB and Supabase Cloud.
   Designed specifically for environments with zero signal (cold stores,
   drying rooms, cellars, slaughterhouses, and production plants).
   ============================================================ */

const TrazaSync = (function() {
    'use strict';

    let online = navigator.onLine;
    let isSyncing = false;
    let syncIntervalId = null;
    let pendingCount = 0;
    const listeners = [];

    // Initialize synchronization engine
    async function init() {
        console.log('[TrazaSync] Initializing offline synchronization engine...');
        
        // Listen to browser network changes
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Immediate check
        await updatePendingCount();
        updateUI();

        // Run background ping check periodically (every 25s) to detect silent drops in cold rooms
        syncIntervalId = setInterval(checkHeartbeat, 25000);

        // If online, attempt to process any leftover queue immediately
        if (online) {
            setTimeout(processQueue, 3000);
        }
    }

    // Ping check: in cold rooms, Wi-Fi might show connected but no internet routing exists
    async function checkHeartbeat() {
        if (!navigator.onLine) {
            setOnlineStatus(false);
            return;
        }

        try {
            // Very lightweight HEAD ping to check true cloud connectivity
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const supabaseUrl = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getUrl() : null;
            const pingUrl = supabaseUrl ? `${supabaseUrl}/rest/v1/` : 'index.html';

            const resp = await fetch(pingUrl, {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (resp && (resp.status >= 200 && resp.status < 500)) {
                setOnlineStatus(true);
            } else {
                setOnlineStatus(false);
            }
        } catch (e) {
            setOnlineStatus(false);
        }
    }

    // Set online status and notify
    function setOnlineStatus(newStatus) {
        const changed = online !== newStatus;
        online = newStatus;
        if (changed) {
            console.log(`[TrazaSync] Connection state changed: ${online ? 'ONLINE (Conectado)' : 'OFFLINE (Sin Cobertura)'}`);
            notifyListeners('statusChange', { online, pendingCount });
            updateUI();

            if (online) {
                // User just stepped out of cold storage! Auto-sync all pending records
                processQueue();
            }
        }
    }

    function handleOnline() {
        console.log('[TrazaSync] Network event: browser reports ONLINE');
        setOnlineStatus(true);
    }

    function handleOffline() {
        console.log('[TrazaSync] Network event: browser reports OFFLINE (Cámara / Secadero)');
        setOnlineStatus(false);
    }

    // Register event listener
    function on(event, callback) {
        listeners.push({ event, callback });
    }

    function notifyListeners(event, data) {
        listeners.filter(l => l.event === event).forEach(l => {
            try {
                l.callback(data);
            } catch (err) {
                console.error('[TrazaSync] Listener callback error:', err);
            }
        });
    }

    // Add operation to offline sync queue
    async function enqueue(action, storeName, record, id) {
        // Do not sync demo records
        if (typeof Auth !== 'undefined' && Auth.isDemoMode()) return;

        try {
            const queueId = `${storeName}_${id || record.id}_${Date.now()}`;
            const queueItem = {
                id: queueId,
                action: action, // 'insert', 'update', 'delete'
                storeName: storeName,
                recordId: id || (record && record.id),
                record: record || null,
                timestamp: new Date().toISOString(),
                attempts: 0
            };

            await TrazaDB.create('sync_queue', queueItem);
            await updatePendingCount();
            updateUI();

            console.log(`[TrazaSync] Enqueued offline mutation: [${action}] in [${storeName}] (Pending: ${pendingCount})`);

            // If we are online, trigger queue processing
            if (online && !isSyncing) {
                setTimeout(processQueue, 500);
            }
        } catch (err) {
            console.error('[TrazaSync] Failed to enqueue sync item:', err);
        }
    }

    // Update pending items count from IndexedDB
    async function updatePendingCount() {
        try {
            const items = await TrazaDB.getAll('sync_queue');
            pendingCount = items.length;
            return pendingCount;
        } catch (e) {
            return 0;
        }
    }

    // Process all pending items in sync_queue and send to Supabase
    async function processQueue() {
        if (isSyncing) return;
        if (!online) {
            console.log('[TrazaSync] Cannot process queue: App is currently OFFLINE.');
            return;
        }
        if (typeof Auth !== 'undefined' && Auth.isDemoMode()) return;

        const supabase = typeof SupabaseConfig !== 'undefined' ? SupabaseConfig.getClient() : null;
        if (!supabase) return;

        let queueItems = [];
        try {
            queueItems = await TrazaDB.getAll('sync_queue');
        } catch (e) {
            console.warn('[TrazaSync] Could not read sync_queue:', e);
            return;
        }

        if (queueItems.length === 0) {
            pendingCount = 0;
            updateUI();
            return;
        }

        isSyncing = true;
        updateUI();
        console.log(`[TrazaSync] Processing ${queueItems.length} pending offline records to Supabase...`);

        let syncedCount = 0;
        let failCount = 0;

        // Sort items chronologically
        queueItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        for (const item of queueItems) {
            try {
                const tableName = item.storeName;

                if (item.action === 'insert' || item.action === 'update') {
                    if (item.record) {
                        const snakeRecord = TrazaDB.toSnakeCase(item.record);
                        const { error } = await supabase.from(tableName).upsert(snakeRecord);
                        if (error) throw error;
                    }
                } else if (item.action === 'delete') {
                    const { error } = await supabase.from(tableName).delete().eq('id', item.recordId);
                    if (error) throw error;
                }

                // Success: remove from sync_queue
                await TrazaDB.remove('sync_queue', item.id);
                syncedCount++;
            } catch (err) {
                console.warn(`[TrazaSync] Failed to sync item ${item.id}:`, err.message);
                failCount++;
                // If network failed completely, stop loop
                if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                    setOnlineStatus(false);
                    break;
                }
            }
        }

        isSyncing = false;
        await updatePendingCount();
        updateUI();

        if (syncedCount > 0) {
            console.log(`[TrazaSync] Successfully synced ${syncedCount} records to cloud!`);
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                const msg = syncedCount === 1 
                    ? '1 registro sincronizado con la nube de Supabase' 
                    : `${syncedCount} registros sincronizados con la nube de Supabase`;
                Utils.showToast('success', `☁️ ${msg}`);
            }
            notifyListeners('syncComplete', { syncedCount, pendingCount });
        }
    }

    // Manual sync triggered by user
    async function syncNow() {
        if (!online) {
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('warning', '📡 Estás en modo sin cobertura. Al salir a zona con red se sincronizará automáticamente.');
            }
            return;
        }
        if (isSyncing) return;

        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('info', '🔄 Sincronizando con Supabase...');
        }
        await processQueue();
    }

    // Update DOM UI elements based on connection state
    function updateUI() {
        const badge = document.getElementById('connection-status-badge');
        const text = document.getElementById('connection-status-text');
        const manualBtn = document.getElementById('manual-sync-btn');
        const banner = document.getElementById('offline-notification-bar');
        const pendingBadge = document.getElementById('offline-pending-badge');

        if (!badge) return;

        if (isSyncing) {
            badge.className = 'connection-status-badge syncing';
            if (text) text.textContent = 'Sincronizando...';
            if (manualBtn) manualBtn.classList.remove('hidden');
        } else if (online) {
            badge.className = 'connection-status-badge online';
            if (text) text.textContent = pendingCount > 0 ? `${pendingCount} pendientes` : 'En línea';
            if (manualBtn) {
                if (pendingCount > 0) {
                    manualBtn.classList.remove('hidden');
                } else {
                    manualBtn.classList.add('hidden');
                }
            }
            if (banner) banner.classList.add('hidden');
        } else {
            // OFFLINE
            badge.className = 'connection-status-badge offline';
            if (text) text.textContent = pendingCount > 0 ? `Sin red (${pendingCount})` : 'Sin cobertura';
            if (manualBtn) manualBtn.classList.add('hidden');
            if (banner) banner.classList.remove('hidden');
        }

        if (pendingBadge) {
            pendingBadge.textContent = `${pendingCount} pendientes`;
        }
    }

    return {
        init,
        isOnline: () => online,
        isSyncing: () => isSyncing,
        getPendingCount: () => pendingCount,
        enqueue,
        processQueue,
        syncNow,
        on,
        updateUI
    };
})();
