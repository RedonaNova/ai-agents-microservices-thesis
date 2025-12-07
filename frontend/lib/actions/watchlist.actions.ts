"use server";

import { getAuthToken } from "@/lib/actions/auth.actions";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

type WatchlistItem = { symbol: string; company: string; addedAt: string; isMse?: boolean };

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  if (!token) {
    return { ok: false, status: 401, json: async () => ({ error: "Not authenticated" }) } as any;
  }
  const res = await fetch(`${API_GATEWAY_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

async function ensureDefaultWatchlist(): Promise<string | null> {
  const res = await authFetch("/api/watchlist");
  if (!res.ok) return null;
  const data = await res.json();
  const existing = data.watchlists?.[0];
  if (existing) return existing.id;

  const createRes = await authFetch("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ name: "Default" }),
  });
  if (!createRes.ok) return null;
  const created = await createRes.json();
  return created.watchlist?.id || null;
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  try {
    const watchlistId = await ensureDefaultWatchlist();
    if (!watchlistId) return [];

    const res = await authFetch(`/api/watchlist/${watchlistId}/items`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      symbol: item.symbol,
      company: item.symbol,
      addedAt: item.added_at || item.addedAt || new Date().toISOString(),
      isMse: item.is_mse,
    }));
  } catch (error) {
    console.error("Error getting watchlist:", error);
    return [];
  }
}

export async function addToWatchlist(symbol: string, company: string, isMse = false) {
  try {
    const watchlistId = await ensureDefaultWatchlist();
    if (!watchlistId) {
      return { success: false, error: "Watchlist not available" };
    }

    const res = await authFetch(`/api/watchlist/${watchlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ symbol, isMse }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Алдаа гарлаа" };
    }
    return { success: true, item: data.item, inWatchlist: true, message: "Хяналтад нэмсэн" };
  } catch (error: any) {
    console.error("Error adding to watchlist:", error);
    return { success: false, error: error.message || "Failed to add to watchlist" };
  }
}

export async function removeFromWatchlist(symbol: string) {
  try {
    const watchlistId = await ensureDefaultWatchlist();
    if (!watchlistId) {
      return { success: false, error: "Watchlist not available" };
    }

    const res = await authFetch(`/api/watchlist/${watchlistId}/items/${symbol}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Алдаа гарлаа" };
    }
    return { success: true, message: "Хяналтаас хассан" };
  } catch (error: any) {
    console.error("Error removing from watchlist:", error);
    return { success: false, error: error.message || "Failed to remove from watchlist" };
  }
}

export async function toggleWatchlist(symbol: string, company: string, isMse = false) {
  const inList = await isInWatchlist(symbol);
  if (inList) {
    const res = await removeFromWatchlist(symbol);
    return { ...res, inWatchlist: !res.success ? true : false };
  } else {
    const res = await addToWatchlist(symbol, company, isMse);
    return { ...res, inWatchlist: res.success ? true : false };
  }
}

export async function isInWatchlist(symbol: string): Promise<boolean> {
  try {
    const res = await authFetch("/api/watchlist/all/symbols");
    if (!res.ok) return false;
    const data = await res.json();
    const symbols: string[] = data.symbols || [];
    return symbols.includes(symbol.toUpperCase());
  } catch (error) {
    console.error("Error checking watchlist:", error);
    return false;
  }
}
