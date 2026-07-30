import { api } from './api';

export interface PendingSyncItem {
  id: string;
  type: 'REGISTRATION' | 'UTR_SUBMIT';
  endpoint: string;
  payload: any;
  createdAt: string;
  attempts: number;
}

const STORAGE_KEY = 'envision_offline_sync_queue';

export function getOfflineQueue(): PendingSyncItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveOfflineQueue(queue: PendingSyncItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {}
}

export function enqueueOfflineItem(type: 'REGISTRATION' | 'UTR_SUBMIT', endpoint: string, payload: any): PendingSyncItem {
  const queue = getOfflineQueue();
  
  // Deduplicate existing item with same UTR number or event payload
  const isDuplicate = queue.some(item => {
    if (type === 'UTR_SUBMIT' && item.type === 'UTR_SUBMIT') {
      return item.payload.utr_number === payload.utr_number;
    }
    if (type === 'REGISTRATION' && item.type === 'REGISTRATION') {
      return item.payload.event_name === payload.event_name && item.payload.email === payload.email;
    }
    return false;
  });

  if (isDuplicate) {
    console.log(`[OfflineQueue] Duplicate item detected in queue, skipping enqueue.`);
    return queue.find(i => i.payload.utr_number === payload.utr_number || i.payload.event_name === payload.event_name)!;
  }

  const newItem: PendingSyncItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    endpoint,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  queue.push(newItem);
  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Enqueued ${type} item for background sync:`, newItem);
  
  // Attempt immediate background sync
  setTimeout(() => {
    processOfflineQueue();
  }, 500);

  return newItem;
}

let isSyncing = false;

export async function processOfflineQueue() {
  if (isSyncing) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`[OfflineQueue] Processing ${queue.length} pending offline items...`);
  
  const remaining: PendingSyncItem[] = [];

  for (const item of queue) {
    try {
      console.log(`[OfflineQueue] Attempting sync for item ${item.id} (${item.endpoint})...`);
      await api.post(item.endpoint, item.payload);
      console.log(`[OfflineQueue] Successfully synced item ${item.id} to PostgreSQL database!`);
    } catch (err: any) {
      console.warn(`[OfflineQueue] Sync attempt failed for ${item.id}:`, err?.message || err);
      // If server returned 400 Bad Request (e.g., duplicate UTR or already paid), discard from queue
      if (err?.response?.status === 400 || item.attempts >= 10) {
        console.warn(`[OfflineQueue] Removing completed/rejected item ${item.id} (Status: ${err?.response?.status})`);
      } else {
        item.attempts += 1;
        remaining.push(item);
      }
    }
  }

  saveOfflineQueue(remaining);
  isSyncing = false;
}

// Auto-start sync queue processing on window load and network online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[OfflineQueue] Network online event detected. Auto-syncing queue...');
    processOfflineQueue();
  });

  // Background timer: sync queue every 15 seconds if items exist
  setInterval(() => {
    if (getOfflineQueue().length > 0) {
      processOfflineQueue();
    }
  }, 15000);
}
