// utils/actionsQueue.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../api/config";

const KEY = "pendingActions:v1";

/**
 * Coalesce actions to avoid duplicates and keep only latest state
 */
function coalesce(actions) {
  const last = new Map();
  for (const a of actions) {
    const k = `${a.type}:${a.id}`;
    // For reaction/save we keep the latest op; for view we just dedupe to one record
    if (a.type === "view") {
      last.set(k, { type: "view", id: a.id });
    } else {
      last.set(k, a);
    }
  }
  return Array.from(last.values());
}

/**
 * Add an action to the queue
 */
export async function enqueue(action) {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || "[]";
    const arr = JSON.parse(raw);
    arr.push({ ...action, ts: Date.now() });
    await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  } catch (e) {
    console.error("[QUEUE] Failed to enqueue:", e);
  }
}

/**
 * Get all pending actions (coalesced)
 */
export async function peekAll() {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) || "[]";
    return coalesce(JSON.parse(raw));
  } catch (e) {
    console.error("[QUEUE] Failed to peek:", e);
    return [];
  }
}

/**
 * Clear all pending actions
 */
export async function clearAll() {
  try {
    await AsyncStorage.setItem(KEY, "[]");
  } catch (e) {
    console.error("[QUEUE] Failed to clear:", e);
  }
}

/**
 * Flush all pending actions to the server
 */
export async function flush({ token, debugSource } = {}) {
  try {
    const actions = await peekAll();
    if (!actions.length) {
      return { sent: 0 };
    }

    const hasViews = actions.some(a => a.type === "view");
    
    console.log(`[QUEUE] Flushing ${actions.length} actions (views: ${hasViews})`);

    const res = await fetch(`${API_BASE_URL}/api/posts/batch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Debug-Source": debugSource || "queue.flush",
        ...(hasViews ? { "X-Commit-Seen": "1" } : {}), // CRITICAL: Commit views
      },
      body: JSON.stringify({ 
        actions, 
        ...(hasViews ? { commit_seen: true } : {}) // Also in body for redundancy
      }),
    });

    if (!res.ok) {
      throw new Error(`Flush failed: ${res.status}`);
    }

    await clearAll();
    console.log(`[QUEUE] Successfully flushed ${actions.length} actions`);
    return { sent: actions.length, status: res.status };
  } catch (e) {
    console.error("[QUEUE] Flush error:", e);
    throw e;
  }
}

/**
 * Get pending action count
 */
export async function getPendingCount() {
  try {
    const actions = await peekAll();
    return actions.length;
  } catch (e) {
    return 0;
  }
}