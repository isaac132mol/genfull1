import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cardHistory, InsertCardHistory, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Card History Functions
export async function getUserCardHistory(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get card history: database not available");
    return [];
  }

  const result = await db
    .select()
    .from(cardHistory)
    .where(eq(cardHistory.userId, userId))
    .orderBy(desc(cardHistory.createdAt))
    .limit(50);

  return result;
}

export async function createCardHistory(entry: InsertCardHistory) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create card history: database not available");
    return null;
  }

  const result = await db.insert(cardHistory).values(entry);
  return result;
}

export async function toggleCardHistoryFavorite(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot toggle favorite: database not available");
    return null;
  }

  // Get current value
  const entry = await db
    .select()
    .from(cardHistory)
    .where(eq(cardHistory.id, id))
    .limit(1);

  if (entry.length === 0 || entry[0].userId !== userId) {
    return null;
  }

  const newValue = entry[0].isFavorite === 1 ? 0 : 1;

  await db
    .update(cardHistory)
    .set({ isFavorite: newValue })
    .where(eq(cardHistory.id, id));

  return { id, isFavorite: newValue };
}

export async function deleteCardHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete card history: database not available");
    return null;
  }

  await db
    .delete(cardHistory)
    .where(eq(cardHistory.id, id));

  return { id };
}

export async function clearUserCardHistory(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot clear card history: database not available");
    return null;
  }

  await db
    .delete(cardHistory)
    .where(eq(cardHistory.userId, userId));

  return { success: true };
}
