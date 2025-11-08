"use server";

import { connectToDatabase } from "@/database/mongoose";
import { Watchlist } from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Get current user's ID from session
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get watchlist symbols by email
 */
export async function getWatchlistSymbolsByEmail(
  email: string
): Promise<string[]> {
  if (!email) return [];

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    // Better Auth stores users in the "user" collection
    const user = await db
      .collection("user")
      .findOne<{ _id?: unknown; id?: string; email?: string }>({ email });

    if (!user) return [];

    const userId = (user.id as string) || String(user._id || "");
    if (!userId) return [];

    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    console.error("getWatchlistSymbolsByEmail error:", err);
    return [];
  }
}

/**
 * Get all watchlist items for current user
 */
export async function getWatchlist() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    await connectToDatabase();
    
    const items = await Watchlist.find({ userId })
      .sort({ addedAt: -1 })
      .lean();

    return items.map((item) => ({
      symbol: String(item.symbol),
      company: String(item.company),
      addedAt: item.addedAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error getting watchlist:", error);
    return [];
  }
}

/**
 * Add stock to watchlist
 */
export async function addToWatchlist(symbol: string, company: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await connectToDatabase();

    // Check if already in watchlist
    const existing = await Watchlist.findOne({ userId, symbol });
    if (existing) {
      return { success: false, error: "Already in watchlist" };
    }

    await Watchlist.create({
      userId,
      symbol: symbol.toUpperCase(),
      company,
      addedAt: new Date(),
    });

    revalidatePath("/watchlist");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Error adding to watchlist:", error);
    return { success: false, error: error.message || "Failed to add to watchlist" };
  }
}

/**
 * Remove stock from watchlist
 */
export async function removeFromWatchlist(symbol: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    await connectToDatabase();

    await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });

    revalidatePath("/watchlist");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Error removing from watchlist:", error);
    return { success: false, error: error.message || "Failed to remove from watchlist" };
  }
}

/**
 * Toggle watchlist status
 */
export async function toggleWatchlist(symbol: string, company: string) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated", inWatchlist: false };
    }

    await connectToDatabase();

    const existing = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });

    if (existing) {
      await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });
      revalidatePath("/watchlist");
      revalidatePath("/");
      return { success: true, inWatchlist: false, message: "Removed from watchlist" };
    } else {
      await Watchlist.create({
        userId,
        symbol: symbol.toUpperCase(),
        company,
        addedAt: new Date(),
      });
      revalidatePath("/watchlist");
      revalidatePath("/");
      return { success: true, inWatchlist: true, message: "Added to watchlist" };
    }
  } catch (error: any) {
    console.error("Error toggling watchlist:", error);
    return { success: false, error: error.message || "Failed to toggle watchlist", inWatchlist: false };
  }
}

/**
 * Check if stock is in watchlist
 */
export async function isInWatchlist(symbol: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    await connectToDatabase();

    const item = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
    return !!item;
  } catch (error) {
    console.error("Error checking watchlist:", error);
    return false;
  }
}

/**
 * Get watchlist with user details (for multi-user systems)
 */
export async function getAllUsersWatchlists() {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not found");

    const watchlists = await Watchlist.find({}).lean();
    
    // Get unique user IDs
    const userIds = [...new Set(watchlists.map((w) => w.userId))];
    
    // Fetch user emails
    const users = await db
      .collection("user")
      .find({ id: { $in: userIds } })
      .project({ id: 1, email: 1, name: 1 })
      .toArray();

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    return watchlists.map((item) => ({
      symbol: String(item.symbol),
      company: String(item.company),
      addedAt: item.addedAt.toISOString(),
      user: userMap.get(item.userId) || { id: item.userId },
    }));
  } catch (error) {
    console.error("Error getting all watchlists:", error);
    return [];
  }
}
