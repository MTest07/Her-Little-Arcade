import crypto from 'crypto';
import { db } from './index.ts';
import {
  users,
  couplePairings,
  gameRecords,
  rooms,
  personalizedContent,
  dailyChallenges,
  seasons,
  seasonStandings,
  matchmakingQueue,
  coinTransactions,
  gameInvitations,
} from './schema.ts';
import { eq, desc, or, and, ne } from 'drizzle-orm';
import { calculateLevelFromXp } from '../lib/game-rules.ts';
import {
  ALL_ARCADE_GAMES,
  MULTIPLAYER_GAMES,
  REWARD_SHOP_ITEMS,
  RENAME_CARD_COST_COINS,
  TROPHY_ROAD_MILESTONES,
  ARCADE_SKINS,
  ARCADE_CHALLENGE_CATALOG,
  getChallengePeriodWindow,
  DEFAULT_SEASONAL_BRACKET_CONFIG,
  computeDynamicSeasonalBracket,
  SeasonalBracketConfig,
} from '../lib/arcade-data.ts';
import { generateFreshGameSeed } from '../lib/game-randomizer.ts';

const ONLINE_HEARTBEAT_WINDOW_MS = 60_000;

export function isTimestampOnline(
  lastSeenAt: Date | string | null | undefined,
  presenceStatus?: string
): boolean {
  if (presenceStatus === 'offline') return false;
  if (!lastSeenAt) return false;
  const ts = typeof lastSeenAt === 'string' ? new Date(lastSeenAt).getTime() : lastSeenAt.getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= ONLINE_HEARTBEAT_WINDOW_MS;
}

const PASSWORD_SALT = 'her-little-arcade-v2-salt';

export function hashPassword(rawPassword: string): string {
  return crypto
    .pbkdf2Sync(rawPassword, PASSWORD_SALT, 1000, 32, 'sha256')
    .toString('hex');
}

export function createSignedSessionToken(uid: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, email, iat: Date.now() })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', PASSWORD_SALT)
    .update(payload)
    .digest('base64url');
  return `hla.${payload}.${sig}`;
}

export function verifySignedSessionToken(
  token: string
): { uid: string; email: string } | null {
  if (!token || !token.startsWith('hla.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', PASSWORD_SALT)
    .update(payload)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed && typeof parsed.uid === 'string' && typeof parsed.email === 'string') {
      return { uid: parsed.uid, email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

export function sanitizeUserRow(row: typeof users.$inferSelect) {
  const online = isTimestampOnline(row.lastSeenAt, row.presenceStatus);
  const hasCompletedUsername = Boolean(
    row.usernameSetupCompleted &&
      row.username &&
      row.username.trim().length >= 3
  );
  let unlockedParsed: string[] = [];
  try {
    unlockedParsed = JSON.parse(row.unlockedItems || '[]');
  } catch {
    unlockedParsed = [];
  }
  if (!unlockedParsed.includes('skin-classic-notebook')) {
    unlockedParsed.push('skin-classic-notebook');
  }
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    username: hasCompletedUsername ? row.username.trim() : '',
    usernameSetupCompleted: hasCompletedUsername,
    renameCards: row.renameCards ?? 0,
    emailVerified: row.emailVerified,
    avatar: row.avatar,
    xp: row.xp,
    level: row.level,
    coins: row.coins,
    streak: row.streak,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    theme: row.theme,
    equippedSkin: row.equippedSkin || 'skin-classic-notebook',
    favoriteGames: row.favoriteGames,
    unlockedItems: JSON.stringify(unlockedParsed),
    petState: row.petState,
    presenceStatus: online ? row.presenceStatus || 'online' : 'offline',
    activeRoomCode: row.activeRoomCode || '',
    isOnline: online,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

function generateRandomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/* ============================================================================
   UNIQUE USERNAME VALIDATION, INITIAL SETUP & RENAME CARD SYSTEM
   ============================================================================ */

export function validateUsernameFormat(rawUsername: string): {
  valid: boolean;
  cleanUsername: string;
  reason: string;
} {
  const cleanUsername = (rawUsername || '').trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 20) {
    return {
      valid: false,
      cleanUsername,
      reason: 'Username must be between 3 and 20 characters long.',
    };
  }
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
    return {
      valid: false,
      cleanUsername,
      reason: 'Username may only contain letters, numbers, underscores (_), and hyphens (-).',
    };
  }
  return {
    valid: true,
    cleanUsername,
    reason: 'Valid format.',
  };
}

export async function checkUsernameAvailability(
  rawUsername: string,
  excludeUid?: string
): Promise<{
  available: boolean;
  valid: boolean;
  cleanUsername: string;
  reason: string;
}> {
  const fmt = validateUsernameFormat(rawUsername);
  if (!fmt.valid) {
    return {
      available: false,
      valid: false,
      cleanUsername: fmt.cleanUsername,
      reason: fmt.reason,
    };
  }

  const allUsers = await db.select().from(users);
  const lowerTarget = fmt.cleanUsername.toLowerCase();
  const conflict = allUsers.find(
    (u) =>
      u.usernameSetupCompleted &&
      u.username.trim().length > 0 &&
      u.username.trim().toLowerCase() === lowerTarget &&
      u.uid !== excludeUid
  );

  if (conflict) {
    return {
      available: false,
      valid: true,
      cleanUsername: fmt.cleanUsername,
      reason: `Username "${fmt.cleanUsername}" is already taken by another player. Please choose a different username.`,
    };
  }

  return {
    available: true,
    valid: true,
    cleanUsername: fmt.cleanUsername,
    reason: `Username "${fmt.cleanUsername}" is available!`,
  };
}

async function cascadeUsernameChangeAcrossPlatform(uid: string, newUsername: string) {
  // Update game records
  await db
    .update(gameRecords)
    .set({ username: newUsername })
    .where(eq(gameRecords.userUid, uid));

  // Update active searching matchmaking queue entries
  await db
    .update(matchmakingQueue)
    .set({ requesterUsername: newUsername, updatedAt: new Date() })
    .where(eq(matchmakingQueue.requesterUid, uid));

  await db
    .update(matchmakingQueue)
    .set({ partnerUsername: newUsername, updatedAt: new Date() })
    .where(eq(matchmakingQueue.partnerUid, uid));

  // Update pending invitations
  await db
    .update(gameInvitations)
    .set({ senderUsername: newUsername, updatedAt: new Date() })
    .where(eq(gameInvitations.senderUid, uid));

  await db
    .update(gameInvitations)
    .set({ targetUsername: newUsername, updatedAt: new Date() })
    .where(eq(gameInvitations.targetUid, uid));
}

export async function completeInitialUsernameSetup(uid: string, desiredUsername: string) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows.length) {
      throw new Error('Account not found.');
    }
    const user = userRows[0];
    if (user.usernameSetupCompleted && user.username && user.username.trim().length >= 3) {
      throw new Error(
        'Initial username setup has already been completed. Changing your username now requires an Official Rename Card (10,000 Coins).'
      );
    }

    const check = await checkUsernameAvailability(desiredUsername, uid);
    if (!check.valid || !check.available) {
      throw new Error(check.reason);
    }

    const updated = await db
      .update(users)
      .set({
        username: check.cleanUsername,
        usernameSetupCompleted: true,
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    await cascadeUsernameChangeAcrossPlatform(uid, check.cleanUsername);

    return sanitizeUserRow(updated[0]);
  } catch (error) {
    console.error('Database completeInitialUsernameSetup failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to set initial username.';
    throw new Error(msg, { cause: error });
  }
}

export async function redeemRenameCardForUsername(uid: string, desiredUsername: string) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows.length) {
      throw new Error('Account not found.');
    }
    const user = userRows[0];
    if ((user.renameCards || 0) < 1) {
      throw new Error(
        `You need 1 Official Rename Card to change your username. Purchase a Rename Card in the Rewards Shop for ${RENAME_CARD_COST_COINS.toLocaleString()} Coins.`
      );
    }

    if (user.username.trim().toLowerCase() === desiredUsername.trim().toLowerCase()) {
      throw new Error('New username must be different from your current username.');
    }

    const check = await checkUsernameAvailability(desiredUsername, uid);
    if (!check.valid || !check.available) {
      throw new Error(check.reason);
    }

    const nextRenameCards = Math.max(0, (user.renameCards || 0) - 1);
    const updated = await db
      .update(users)
      .set({
        username: check.cleanUsername,
        renameCards: nextRenameCards,
        usernameSetupCompleted: true,
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    await cascadeUsernameChangeAcrossPlatform(uid, check.cleanUsername);

    return sanitizeUserRow(updated[0]);
  } catch (error) {
    console.error('Database useRenameCardForUsername failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to change username.';
    throw new Error(msg, { cause: error });
  }
}

export async function purchaseRewardShopItem(uid: string, itemId: string) {
  try {
    const seasonalSkin = ARCADE_SKINS.find(
      (s) => s.id === itemId && s.acquisitionSource === 'seasonal_exclusive'
    );
    if (seasonalSkin) {
      throw new Error(
        `"${seasonalSkin.name}" is an Exclusive Seasonal Championship Skin (${seasonalSkin.rarity}) awarded only to Top 3 Couples at the end of a season.`
      );
    }

    const shopItem = REWARD_SHOP_ITEMS.find((item) => item.id === itemId);
    if (!shopItem) {
      throw new Error('Reward item not found in the official shop catalog.');
    }

    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows.length) {
      throw new Error('Player account not found.');
    }
    const user = userRows[0];

    const unlockedList: string[] = (() => {
      try {
        return JSON.parse(user.unlockedItems || '[]');
      } catch {
        return [];
      }
    })();

    if (!shopItem.consumable && unlockedList.includes(shopItem.id)) {
      throw new Error(`You have already unlocked ${shopItem.name}.`);
    }

    if (user.coins < shopItem.costCoins) {
      throw new Error(
        `Insufficient coins! You need ${shopItem.costCoins.toLocaleString()} Coins (current balance: ${user.coins.toLocaleString()} Coins). Play 2v2 Couple Matches to earn coins.`
      );
    }

    const nextCoins = user.coins - shopItem.costCoins;
    const nextRenameCards =
      shopItem.id === 'rename-card' ? (user.renameCards || 0) + 1 : user.renameCards || 0;
    const nextUnlocked = shopItem.consumable
      ? unlockedList
      : Array.from(new Set([...unlockedList, shopItem.id]));
    const nextEquippedSkin =
      shopItem.category === 'skin' ? shopItem.id : user.equippedSkin || 'skin-classic-notebook';

    const updated = await db
      .update(users)
      .set({
        coins: nextCoins,
        renameCards: nextRenameCards,
        unlockedItems: JSON.stringify(nextUnlocked),
        equippedSkin: nextEquippedSkin,
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    const coupleCtx = await getCoupleContextForUser(uid);

    if (shopItem.costCoins > 0) {
      await db.insert(coinTransactions).values({
        userUid: uid,
        coupleId: coupleCtx.activeCouple?.id || 0,
        amount: -shopItem.costCoins,
        balanceAfter: nextCoins,
        txType: shopItem.id === 'rename-card' ? 'rename_card_purchase' : 'shop_purchase',
        referenceId: `shop-${shopItem.id}-${Date.now()}`,
        description: `Purchased ${shopItem.name}`,
      });
    }

    return sanitizeUserRow(updated[0]);
  } catch (error) {
    console.error('Database purchaseRewardShopItem failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to purchase item.';
    throw new Error(msg, { cause: error });
  }
}

export async function equipOrUnequipSkin(
  uid: string,
  skinId: string,
  applyToCouple?: boolean
) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows.length) {
      throw new Error('Player account not found.');
    }
    const user = userRows[0];

    const targetSkinId = (skinId || '').trim() || 'skin-classic-notebook';
    const skinDef = ARCADE_SKINS.find(
      (s) => s.id === targetSkinId || s.previewCode === targetSkinId
    );
    if (!skinDef) {
      throw new Error('Selected skin does not exist in the arcade catalog.');
    }

    const unlockedList: string[] = (() => {
      try {
        return JSON.parse(user.unlockedItems || '[]');
      } catch {
        return [];
      }
    })();

    const isStarter = skinDef.acquisitionSource === 'starter' || skinDef.id === 'skin-classic-notebook';
    if (!isStarter && !unlockedList.includes(skinDef.id)) {
      throw new Error(
        `You cannot equip "${skinDef.name}" (${skinDef.rarity}) because you do not own it yet.`
      );
    }

    const nextUnlocked = isStarter
      ? Array.from(new Set([...unlockedList, skinDef.id]))
      : unlockedList;

    const updated = await db
      .update(users)
      .set({
        equippedSkin: skinDef.id,
        unlockedItems: JSON.stringify(nextUnlocked),
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    if (applyToCouple) {
      const coupleCtx = await getCoupleContextForUser(uid);
      if (coupleCtx.activeCouple) {
        await db
          .update(couplePairings)
          .set({
            equippedCoupleSkin: skinDef.id,
            updatedAt: new Date(),
          })
          .where(eq(couplePairings.id, coupleCtx.activeCouple.id));
      }
    }

    return sanitizeUserRow(updated[0]);
  } catch (error) {
    console.error('Database equipOrUnequipSkin failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to equip skin.';
    throw new Error(msg, { cause: error });
  }
}

export async function registerUserWithEmail(input: {
  email: string;
  password: string;
  username?: string;
  firebaseUid?: string;
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existing.length > 0 && existing[0].passwordHash) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const passwordHash = hashPassword(input.password);
    const verificationCode = generateRandomCode(6);
    const uid =
      existing[0]?.uid ||
      input.firebaseUid ||
      `usr_${crypto.randomBytes(8).toString('hex')}`;

    if (existing.length > 0) {
      const hasCompletedUsername = Boolean(
        existing[0].usernameSetupCompleted &&
          existing[0].username &&
          existing[0].username.trim().length >= 3
      );
      const updated = await db
        .update(users)
        .set({
          username: hasCompletedUsername ? existing[0].username.trim() : '',
          usernameSetupCompleted: hasCompletedUsername,
          passwordHash,
          verificationCode,
          lastSeenAt: new Date(),
        })
        .where(eq(users.uid, existing[0].uid))
        .returning();

      return {
        profile: sanitizeUserRow(updated[0]),
        verificationCode,
        sessionToken: createSignedSessionToken(updated[0].uid, cleanEmail),
      };
    }

    // Every newly registered user starts with 0 coins and usernameSetupCompleted: false
    // so they are always redirected to the dedicated Choose Your Username screen before entering the arcade.
    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        username: '',
        usernameSetupCompleted: false,
        renameCards: 0,
        passwordHash,
        emailVerified: false,
        verificationCode,
        avatar: 'kitsune',
        xp: 0,
        level: 1,
        coins: 0,
        streak: 1,
        wins: 0,
        losses: 0,
        draws: 0,
      })
      .returning();

    return {
      profile: sanitizeUserRow(inserted[0]),
      verificationCode,
      sessionToken: createSignedSessionToken(inserted[0].uid, cleanEmail),
    };
  } catch (error) {
    console.error('Database registerUserWithEmail failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to register account.';
    throw new Error(msg, { cause: error });
  }
}

export async function signInUserWithEmail(input: {
  email: string;
  password: string;
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existing.length === 0) {
      throw new Error('No account found with this email address. Please sign up first.');
    }

    const user = existing[0];
    const computedHash = hashPassword(input.password);
    if (!user.passwordHash || user.passwordHash !== computedHash) {
      throw new Error('Invalid email or password. Please check your credentials.');
    }

    const updated = await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.uid, user.uid))
      .returning();

    return {
      profile: sanitizeUserRow(updated[0]),
      sessionToken: createSignedSessionToken(updated[0].uid, updated[0].email),
    };
  } catch (error) {
    console.error('Database signInUserWithEmail failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to sign in.';
    throw new Error(msg, { cause: error });
  }
}

export async function verifyUserEmailCode(uid: string, code: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    if (!rows.length) {
      throw new Error('Account not found.');
    }
    const user = rows[0];
    if (user.emailVerified) {
      return sanitizeUserRow(user);
    }
    const cleanCode = code.trim().toUpperCase();
    if (user.verificationCode && cleanCode !== user.verificationCode.toUpperCase()) {
      throw new Error('Invalid verification code. Please check the 6-character code.');
    }

    const nextXp = user.xp + 15;
    const { level } = calculateLevelFromXp(nextXp);
    const updated = await db
      .update(users)
      .set({
        emailVerified: true,
        verificationCode: '',
        xp: nextXp,
        level,
      })
      .where(eq(users.uid, uid))
      .returning();

    return sanitizeUserRow(updated[0]);
  } catch (error) {
    console.error('Database verifyUserEmailCode failed:', error);
    const msg = error instanceof Error ? error.message : 'Email verification failed.';
    throw new Error(msg, { cause: error });
  }
}

export async function createPasswordResetRequest(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const rows = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!rows.length) {
      throw new Error('No registered account found for that email address.');
    }
    const resetToken = generateRandomCode(6);
    await db
      .update(users)
      .set({ resetToken })
      .where(eq(users.uid, rows[0].uid));
    return { email: cleanEmail, resetToken };
  } catch (error) {
    console.error('Database createPasswordResetRequest failed:', error);
    const msg = error instanceof Error ? error.message : 'Could not initiate password reset.';
    throw new Error(msg, { cause: error });
  }
}

export async function completePasswordResetWithToken(input: {
  email: string;
  resetToken: string;
  newPassword: string;
}) {
  try {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanToken = input.resetToken.trim().toUpperCase();
    if (!input.newPassword || input.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }
    const rows = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (!rows.length) {
      throw new Error('Account not found.');
    }
    const user = rows[0];
    if (!user.resetToken || user.resetToken.toUpperCase() !== cleanToken) {
      throw new Error('Invalid or expired password reset code.');
    }
    const passwordHash = hashPassword(input.newPassword);
    const updated = await db
      .update(users)
      .set({
        passwordHash,
        resetToken: '',
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, user.uid))
      .returning();

    return {
      profile: sanitizeUserRow(updated[0]),
      sessionToken: createSignedSessionToken(updated[0].uid, updated[0].email),
    };
  } catch (error) {
    console.error('Database completePasswordResetWithToken failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to reset password.';
    throw new Error(msg, { cause: error });
  }
}

export async function getOrCreateOAuthPlayerProfile(
  uid: string,
  email: string,
  googleDisplayName?: string
) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existingByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail));

    if (existingByEmail.length > 0) {
      let nextPetState = existingByEmail[0].petState;
      if (googleDisplayName && googleDisplayName.trim()) {
        try {
          const parsed = JSON.parse(existingByEmail[0].petState || '{}');
          nextPetState = JSON.stringify({
            ...parsed,
            googleDisplayName: googleDisplayName.trim(),
          });
        } catch {
          // keep existing petState
        }
      }

      const updated = await db
        .update(users)
        .set({
          emailVerified: true,
          petState: nextPetState,
          lastSeenAt: new Date(),
        })
        .where(eq(users.uid, existingByEmail[0].uid))
        .returning();
      return {
        profile: sanitizeUserRow(updated[0]),
        sessionToken: createSignedSessionToken(updated[0].uid, updated[0].email),
      };
    }

    const defaultPetState = {
      name: 'Mochi',
      hunger: 85,
      happiness: 90,
      energy: 90,
      accessory: 'bell-collar',
      stage: 1,
      ...(googleDisplayName && googleDisplayName.trim()
        ? { googleDisplayName: googleDisplayName.trim() }
        : {}),
    };

    // Never automatically use the user's Google account name as their arcade username.
    // Always set username: '' and usernameSetupCompleted: false so new users are redirected
    // to the dedicated Choose Your Username screen.
    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        username: '',
        usernameSetupCompleted: false,
        renameCards: 0,
        emailVerified: true,
        xp: 0,
        level: 1,
        coins: 0,
        streak: 1,
        petState: JSON.stringify(defaultPetState),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          emailVerified: true,
          lastSeenAt: new Date(),
        },
      })
      .returning();

    return {
      profile: sanitizeUserRow(result[0]),
      sessionToken: createSignedSessionToken(result[0].uid, result[0].email),
    };
  } catch (error) {
    console.error('Database getOrCreateOAuthPlayerProfile failed:', error);
    throw new Error('Failed to load or create player profile.', { cause: error });
  }
}

/* ============================================================================
   COUPLE ACCOUNT PAIRING, TROPHY ROAD & SHARED COUPLE PROFILE
   ============================================================================ */

export async function getCoupleContextForUser(uid: string) {
  try {
    if (!uid) {
      return { activeCouple: null, pendingOutgoing: null, pendingIncoming: null };
    }
    const rows = await db
      .select()
      .from(couplePairings)
      .where(
        or(
          eq(couplePairings.requesterUid, uid),
          eq(couplePairings.partnerUid, uid)
        )
      )
      .orderBy(desc(couplePairings.updatedAt));

    const activeRow = rows.find((r) => r.status === 'active') || null;
    const pendingOutgoing =
      rows.find(
        (r) =>
          r.requesterUid === uid &&
          (r.status === 'pending_partner' || r.status === 'pending_requester_confirm')
      ) || null;
    const pendingIncoming =
      rows.find(
        (r) =>
          r.partnerUid === uid && r.status === 'pending_requester_confirm'
      ) || null;

    async function enrichPairing(row: typeof couplePairings.$inferSelect | null) {
      if (!row) return null;
      const reqUserRows = await db
        .select()
        .from(users)
        .where(eq(users.uid, row.requesterUid));
      const partUserRows = row.partnerUid
        ? await db.select().from(users).where(eq(users.uid, row.partnerUid))
        : [];
      const reqProfile = reqUserRows[0] ? sanitizeUserRow(reqUserRows[0]) : null;
      const partProfile = partUserRows[0] ? sanitizeUserRow(partUserRows[0]) : null;

      const combinedXp =
        row.coupleXp + (reqProfile?.xp || 0) + (partProfile?.xp || 0);
      const { level: combinedLevel } = calculateLevelFromXp(combinedXp);

      return {
        ...row,
        requesterProfile: reqProfile,
        partnerProfile: partProfile,
        combinedXp,
        combinedLevel,
      };
    }

    return {
      activeCouple: await enrichPairing(activeRow),
      pendingOutgoing: await enrichPairing(pendingOutgoing),
      pendingIncoming: await enrichPairing(pendingIncoming),
    };
  } catch (error) {
    console.error('Database getCoupleContextForUser failed:', error);
    throw new Error('Failed to load couple pairing status.', { cause: error });
  }
}

export async function createCouplePairingInvite(requesterUid: string) {
  try {
    const currentCtx = await getCoupleContextForUser(requesterUid);
    if (currentCtx.activeCouple) {
      throw new Error('You already have an active couple pairing. Unpair first to create a new invite.');
    }

    if (currentCtx.pendingOutgoing) {
      await db
        .update(couplePairings)
        .set({ status: 'unpaired', updatedAt: new Date() })
        .where(eq(couplePairings.id, currentCtx.pendingOutgoing.id));
    }

    let code = generateRandomCode(6);
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db
        .select()
        .from(couplePairings)
        .where(eq(couplePairings.pairingCode, code));
      if (existing.length === 0) break;
      code = generateRandomCode(6);
    }

    const inserted = await db
      .insert(couplePairings)
      .values({
        pairingCode: code,
        requesterUid,
        partnerUid: '',
        requesterConfirmed: true,
        partnerConfirmed: false,
        status: 'pending_partner',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database createCouplePairingInvite failed:', error);
    const msg = error instanceof Error ? error.message : 'Could not generate pairing code.';
    throw new Error(msg, { cause: error });
  }
}

export async function inspectCouplePairingInvite(actorUid: string, pairingCode: string) {
  try {
    const cleanCode = pairingCode.trim().toUpperCase();
    const rows = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.pairingCode, cleanCode));

    if (!rows.length) {
      throw new Error('No pairing invitation found with that code.');
    }
    const invite = rows[0];
    if (invite.status !== 'pending_partner') {
      throw new Error('This pairing code has already been used or cancelled.');
    }
    if (invite.requesterUid === actorUid) {
      throw new Error('This is your own pairing code. Share it with your partner so they can enter it on their account.');
    }

    const reqRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, invite.requesterUid));
    if (!reqRows.length) {
      throw new Error('The inviting player account no longer exists.');
    }

    return {
      pairingCode: invite.pairingCode,
      requesterProfile: sanitizeUserRow(reqRows[0]),
      status: invite.status,
    };
  } catch (error) {
    console.error('Database inspectCouplePairingInvite failed:', error);
    const msg = error instanceof Error ? error.message : 'Invalid pairing code.';
    throw new Error(msg, { cause: error });
  }
}

export async function acceptCouplePairingInvite(partnerUid: string, pairingCode: string) {
  try {
    const cleanCode = pairingCode.trim().toUpperCase();
    const partnerCtx = await getCoupleContextForUser(partnerUid);
    if (partnerCtx.activeCouple) {
      throw new Error('Your account is already in an active couple pairing.');
    }

    const rows = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.pairingCode, cleanCode));

    if (!rows.length) {
      throw new Error('No pairing invitation found with that code.');
    }
    const invite = rows[0];
    if (invite.status !== 'pending_partner') {
      throw new Error('This pairing code is no longer open for acceptance.');
    }
    if (invite.requesterUid === partnerUid) {
      throw new Error('You cannot pair with your own account.');
    }

    const requesterCtx = await getCoupleContextForUser(invite.requesterUid);
    if (requesterCtx.activeCouple) {
      throw new Error('The inviting player is already in an active couple pairing.');
    }

    const updated = await db
      .update(couplePairings)
      .set({
        partnerUid,
        partnerConfirmed: true,
        status: 'pending_requester_confirm',
        updatedAt: new Date(),
      })
      .where(eq(couplePairings.id, invite.id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database acceptCouplePairingInvite failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to accept pairing invitation.';
    throw new Error(msg, { cause: error });
  }
}

export async function confirmCouplePairingFinal(requesterUid: string, pairingCode: string) {
  try {
    const cleanCode = pairingCode.trim().toUpperCase();
    const rows = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.pairingCode, cleanCode));

    if (!rows.length) {
      throw new Error('Pairing record not found.');
    }
    const invite = rows[0];
    if (invite.requesterUid !== requesterUid) {
      throw new Error('Only the player who generated the invite can perform the final confirmation.');
    }
    if (!invite.partnerUid || !invite.partnerConfirmed || invite.status !== 'pending_requester_confirm') {
      throw new Error('Your partner must accept the pairing code before final confirmation.');
    }

    const reqCtx = await getCoupleContextForUser(invite.requesterUid);
    const partCtx = await getCoupleContextForUser(invite.partnerUid);
    if (reqCtx.activeCouple || partCtx.activeCouple) {
      throw new Error('One of the accounts is already in an active couple pairing.');
    }

    const reqRows = await db.select().from(users).where(eq(users.uid, invite.requesterUid));
    const partRows = await db.select().from(users).where(eq(users.uid, invite.partnerUid));
    const reqName = reqRows[0]?.username || 'Partner A';
    const partName = partRows[0]?.username || 'Partner B';

    // Anti-duplication check: if these two exact partners previously had an unpaired record,
    // restore their prior coupleTrophies/milestones instead of creating duplicate bonus trophies
    const allPairings = await db.select().from(couplePairings);
    const priorSameDuo = allPairings.find(
      (p) =>
        p.id !== invite.id &&
        p.status === 'unpaired' &&
        ((p.requesterUid === invite.requesterUid && p.partnerUid === invite.partnerUid) ||
          (p.requesterUid === invite.partnerUid && p.partnerUid === invite.requesterUid))
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const updated = await db
      .update(couplePairings)
      .set({
        requesterConfirmed: true,
        partnerConfirmed: true,
        status: 'active',
        coupleName: priorSameDuo?.coupleName || `${reqName} & ${partName}`,
        anniversaryDate: invite.anniversaryDate || priorSameDuo?.anniversaryDate || todayStr,
        coupleBio:
          invite.coupleBio ||
          priorSameDuo?.coupleBio ||
          'Playing side by side in Her Little Arcade.',
        coupleTitle: priorSameDuo?.coupleTitle || 'Newborn Duo',
        coupleTrophies: priorSameDuo?.coupleTrophies || 0,
        highestTrophies: priorSameDuo?.highestTrophies || 0,
        claimedTrophyMilestones: priorSameDuo?.claimedTrophyMilestones || '[]',
        coupleXp: priorSameDuo ? priorSameDuo.coupleXp : 45,
        coupleLevel: priorSameDuo ? priorSameDuo.coupleLevel : 1,
        coupleWins: priorSameDuo?.coupleWins || 0,
        coupleLosses: priorSameDuo?.coupleLosses || 0,
        coupleDraws: priorSameDuo?.coupleDraws || 0,
        updatedAt: new Date(),
      })
      .where(eq(couplePairings.id, invite.id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database confirmCouplePairingFinal failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to confirm couple pairing.';
    throw new Error(msg, { cause: error });
  }
}

export async function updateSharedCoupleProfile(
  actorUid: string,
  updates: {
    coupleName?: string;
    anniversaryDate?: string;
    coupleBio?: string;
    coupleBanner?: string;
    coupleTitle?: string;
  }
) {
  try {
    const ctx = await getCoupleContextForUser(actorUid);
    if (!ctx.activeCouple) {
      throw new Error('You do not have an active couple pairing to update.');
    }
    const c = ctx.activeCouple;
    const rows = await db
      .update(couplePairings)
      .set({
        coupleName: updates.coupleName !== undefined ? updates.coupleName.trim() : c.coupleName,
        anniversaryDate: updates.anniversaryDate !== undefined ? updates.anniversaryDate.trim() : c.anniversaryDate,
        coupleBio: updates.coupleBio !== undefined ? updates.coupleBio.trim() : c.coupleBio,
        coupleBanner: updates.coupleBanner !== undefined ? updates.coupleBanner : c.coupleBanner,
        coupleTitle: updates.coupleTitle !== undefined ? updates.coupleTitle : c.coupleTitle,
        updatedAt: new Date(),
      })
      .where(eq(couplePairings.id, c.id))
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database updateSharedCoupleProfile failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update couple profile.';
    throw new Error(msg, { cause: error });
  }
}

export async function claimCoupleTrophyMilestone(actorUid: string, milestoneId: string) {
  try {
    const ctx = await getCoupleContextForUser(actorUid);
    if (!ctx.activeCouple || ctx.activeCouple.status !== 'active') {
      throw new Error('You must have an active Couple Pairing to claim Trophy Road milestones.');
    }
    const c = ctx.activeCouple;
    const milestone = TROPHY_ROAD_MILESTONES.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Trophy Road milestone not found.');
    }

    const bestTrophies = Math.max(c.coupleTrophies || 0, c.highestTrophies || 0);
    if (bestTrophies < milestone.trophiesRequired) {
      throw new Error(
        `Your couple needs ${milestone.trophiesRequired} Trophies in 2v2 matches to unlock ${milestone.rewardName} (current: ${bestTrophies} Trophies).`
      );
    }

    const claimedList: string[] = (() => {
      try {
        return JSON.parse(c.claimedTrophyMilestones || '[]');
      } catch {
        return [];
      }
    })();

    if (claimedList.includes(milestone.id)) {
      throw new Error('This Trophy Road milestone reward has already been claimed by your couple.');
    }

    const nextClaimed = Array.from(new Set([...claimedList, milestone.id]));
    const nextTitle =
      milestone.rewardType === 'title' ? milestone.rewardCode : c.coupleTitle || milestone.title;
    const nextBanner =
      milestone.rewardType === 'banner' ? milestone.rewardCode : c.coupleBanner;

    const updatedCouple = await db
      .update(couplePairings)
      .set({
        claimedTrophyMilestones: JSON.stringify(nextClaimed),
        coupleTitle: nextTitle,
        coupleBanner: nextBanner,
        updatedAt: new Date(),
      })
      .where(eq(couplePairings.id, c.id))
      .returning();

    // Unlock the reward code on both partners' individual accounts
    for (const memberUid of [c.requesterUid, c.partnerUid]) {
      if (!memberUid) continue;
      const uRows = await db.select().from(users).where(eq(users.uid, memberUid));
      if (uRows[0]) {
        const currentUnlocked: string[] = (() => {
          try {
            return JSON.parse(uRows[0].unlockedItems || '[]');
          } catch {
            return [];
          }
        })();
        const updatedUnlocked = Array.from(
          new Set([...currentUnlocked, milestone.id, milestone.rewardCode])
        );
        await db
          .update(users)
          .set({ unlockedItems: JSON.stringify(updatedUnlocked) })
          .where(eq(users.uid, memberUid));
      }
    }

    return updatedCouple[0];
  } catch (error) {
    console.error('Database claimCoupleTrophyMilestone failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to claim Trophy Road reward.';
    throw new Error(msg, { cause: error });
  }
}

export async function unpairCoupleAccounts(actorUid: string) {
  try {
    const rows = await db
      .select()
      .from(couplePairings)
      .where(
        and(
          or(
            eq(couplePairings.requesterUid, actorUid),
            eq(couplePairings.partnerUid, actorUid)
          ),
          or(
            eq(couplePairings.status, 'active'),
            eq(couplePairings.status, 'pending_partner'),
            eq(couplePairings.status, 'pending_requester_confirm')
          )
        )
      );

    for (const r of rows) {
      await db
        .update(couplePairings)
        .set({ status: 'unpaired', updatedAt: new Date() })
        .where(eq(couplePairings.id, r.id));
    }

    return { unpaired: true };
  } catch (error) {
    console.error('Database unpairCoupleAccounts failed:', error);
    throw new Error('Failed to unpair couple accounts.', { cause: error });
  }
}

/* ============================================================================
   DAILY (24H), WEEKLY (7D) & MONTHLY (1M) CHALLENGES + SEASONAL LEADERBOARD
   ============================================================================ */

export async function syncAndEvaluatePlayerChallenges(uid: string) {
  if (!uid) {
    return {
      activeChallenges: [],
      challengeHistory: [],
      periodWindows: {
        daily: getChallengePeriodWindow('daily'),
        weekly: getChallengePeriodWindow('weekly'),
        monthly: getChallengePeriodWindow('monthly'),
      },
    };
  }

  const now = new Date();
  const periodWindows = {
    daily: getChallengePeriodWindow('daily', now),
    weekly: getChallengePeriodWindow('weekly', now),
    monthly: getChallengePeriodWindow('monthly', now),
  };

  const userRecords = await db
    .select()
    .from(gameRecords)
    .where(eq(gameRecords.userUid, uid))
    .orderBy(desc(gameRecords.createdAt));

  let existingRows = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.userUid, uid))
    .orderBy(desc(dailyChallenges.updatedAt));

  const activeChallengesOut = [];

  for (const ch of ARCADE_CHALLENGE_CATALOG) {
    const winInfo = periodWindows[ch.periodType];
    const startMs = new Date(winInfo.startsAtIso).getTime();
    const endMs = new Date(winInfo.endsAtIso).getTime();

    // Filter verified gameRecords within this challenge's active period window
    const periodRecords = userRecords.filter((r) => {
      const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      return ts >= startMs && ts < endMs;
    });

    let verifiedCount = 0;
    if (ch.metricType === 'specific_games') {
      const allowed = ch.eligibleGameIds || [ch.gameId];
      verifiedCount = periodRecords.filter((r) => allowed.includes(r.gameId)).length;
    } else if (ch.metricType === 'any_matches_played') {
      verifiedCount = periodRecords.length;
    } else if (ch.metricType === 'any_wins') {
      verifiedCount = periodRecords.filter(
        (r) => r.result === 'win' || r.result === 'completed'
      ).length;
    } else if (ch.metricType === 'single_matches') {
      verifiedCount = periodRecords.filter((r) => r.mode === 'single').length;
    } else if (ch.metricType === 'multiplayer_1v1_matches') {
      verifiedCount = periodRecords.filter((r) => r.mode === '1v1').length;
    } else if (ch.metricType === 'multiplayer_2v2_matches') {
      verifiedCount = periodRecords.filter(
        (r) => r.mode === '2v2' || r.mode === '2v2_couple'
      ).length;
    } else if (ch.metricType === 'multiplayer_2v2_wins') {
      verifiedCount = periodRecords.filter(
        (r) =>
          (r.mode === '2v2' || r.mode === '2v2_couple') &&
          (r.result === 'win' || r.result === 'completed')
      ).length;
    } else if (ch.metricType === 'high_score_200') {
      verifiedCount = periodRecords.filter((r) => (r.score || 0) >= 200).length;
    }

    let currentRow = existingRows.find(
      (r) => r.challengeKey === ch.key && r.periodKey === winInfo.periodKey
    );

    if (!currentRow) {
      const initialProgress = Math.min(ch.target, verifiedCount);
      const isCompleted = initialProgress >= ch.target ? 1 : 0;
      const inserted = await db
        .insert(dailyChallenges)
        .values({
          userUid: uid,
          challengeKey: ch.key,
          periodType: ch.periodType,
          periodKey: winInfo.periodKey,
          progress: initialProgress,
          target: ch.target,
          completed: isCompleted,
          claimed: 0,
          xpAwarded: 0,
          updatedAt: now,
        })
        .returning();
      currentRow = inserted[0];
      existingRows = [currentRow, ...existingRows];
    } else {
      const nextProgress = Math.min(
        ch.target,
        Math.max(currentRow.progress || 0, verifiedCount)
      );
      const nextCompleted = nextProgress >= ch.target ? 1 : currentRow.completed || 0;
      if (
        nextProgress !== currentRow.progress ||
        nextCompleted !== currentRow.completed
      ) {
        const updated = await db
          .update(dailyChallenges)
          .set({
            progress: nextProgress,
            target: ch.target,
            completed: nextCompleted,
            updatedAt: now,
          })
          .where(eq(dailyChallenges.id, currentRow.id))
          .returning();
        currentRow = updated[0] || currentRow;
      }
    }

    activeChallengesOut.push({
      ...ch,
      id: currentRow.id,
      dbId: currentRow.id,
      challengeKey: ch.key,
      periodKey: winInfo.periodKey,
      progress: currentRow.progress,
      target: ch.target,
      completed: Boolean(currentRow.claimed),
      objectiveCompleted: Boolean(currentRow.completed || currentRow.progress >= ch.target),
      claimed: Boolean(currentRow.claimed),
      xpAwarded: currentRow.xpAwarded || 0,
      claimedAt: currentRow.claimedAt ? new Date(currentRow.claimedAt).toISOString() : null,
      startsAtIso: winInfo.startsAtIso,
      endsAtIso: winInfo.endsAtIso,
      expiresAtIso: winInfo.endsAtIso,
      remainingMs: winInfo.remainingMs,
      remainingLabel: winInfo.remainingLabel,
      scheduleLabel: winInfo.scheduleLabel,
    });
  }

  const catalogByKey = new Map(ARCADE_CHALLENGE_CATALOG.map((c) => [c.key, c]));
  const challengeHistory = existingRows
    .filter((r) => r.completed === 1 || r.claimed === 1)
    .slice(0, 40)
    .map((r) => {
      const def = catalogByKey.get(r.challengeKey);
      return {
        id: r.id,
        challengeKey: r.challengeKey,
        title: def?.title || r.challengeKey,
        periodType: (r.periodType || def?.periodType || 'daily') as 'daily' | 'weekly' | 'monthly',
        difficulty: def?.difficulty || 'Easy',
        periodKey: r.periodKey || 'legacy',
        progress: r.progress,
        target: r.target,
        completed: Boolean(r.completed),
        claimed: Boolean(r.claimed),
        xpAwarded: r.xpAwarded || def?.xpReward || 25,
        claimedAt: r.claimedAt || r.updatedAt,
      };
    });

  return {
    activeChallenges: activeChallengesOut,
    challengeHistory,
    periodWindows,
  };
}

export async function recordPetCareChallengeIncrement(uid: string) {
  if (!uid) return;
  const now = new Date();
  const dailyWin = getChallengePeriodWindow('daily', now);
  const rows = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.userUid, uid));
  const petRow = rows.find(
    (r) => r.challengeKey === 'daily-pet-care' && r.periodKey === dailyWin.periodKey
  );
  if (!petRow) {
    await db.insert(dailyChallenges).values({
      userUid: uid,
      challengeKey: 'daily-pet-care',
      periodType: 'daily',
      periodKey: dailyWin.periodKey,
      progress: 1,
      target: 3,
      completed: 0,
      claimed: 0,
      xpAwarded: 0,
      updatedAt: now,
    });
  } else if (petRow.progress < petRow.target) {
    const nextProg = Math.min(petRow.target, petRow.progress + 1);
    await db
      .update(dailyChallenges)
      .set({
        progress: nextProg,
        completed: nextProg >= petRow.target ? 1 : petRow.completed,
        updatedAt: now,
      })
      .where(eq(dailyChallenges.id, petRow.id));
  }
}

export async function claimChallengeReward(uid: string, challengeKey: string) {
  try {
    const def = ARCADE_CHALLENGE_CATALOG.find((c) => c.key === challengeKey);
    if (!def) {
      throw new Error('Challenge definition not found.');
    }

    await syncAndEvaluatePlayerChallenges(uid);
    const winInfo = getChallengePeriodWindow(def.periodType);

    const rows = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.userUid, uid));

    const targetRow = rows.find(
      (r) => r.challengeKey === challengeKey && r.periodKey === winInfo.periodKey
    );

    if (!targetRow || (targetRow.progress < def.target && !targetRow.completed)) {
      throw new Error(
        `Challenge "${def.title}" is not yet complete (${targetRow?.progress || 0}/${def.target}). Complete the objective before claiming.`
      );
    }

    if (targetRow.claimed === 1) {
      throw new Error(
        `You have already claimed the reward for "${def.title}" in the current ${def.periodType} period (${winInfo.periodKey}).`
      );
    }

    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows.length) {
      throw new Error('Player account not found.');
    }
    const user = userRows[0];

    const now = new Date();
    await db
      .update(dailyChallenges)
      .set({
        completed: 1,
        claimed: 1,
        xpAwarded: def.xpReward,
        claimedAt: now,
        updatedAt: now,
      })
      .where(eq(dailyChallenges.id, targetRow.id));

    // Strictly award XP only (0 Coins) to preserve 2v2 coin economy rules
    const nextXp = user.xp + def.xpReward;
    const { level: nextLevel } = calculateLevelFromXp(nextXp);

    const updatedUserRows = await db
      .update(users)
      .set({
        xp: nextXp,
        level: nextLevel,
        lastSeenAt: now,
      })
      .where(eq(users.uid, uid))
      .returning();

    const synced = await syncAndEvaluatePlayerChallenges(uid);

    return {
      profile: sanitizeUserRow(updatedUserRows[0]),
      xpAwarded: def.xpReward,
      challengeKey: def.key,
      periodKey: winInfo.periodKey,
      ...synced,
    };
  } catch (error) {
    console.error('Database claimChallengeReward failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to claim challenge reward.';
    throw new Error(msg, { cause: error });
  }
}

export function parseSeasonalBracketConfig(rawJson: string | undefined | null): SeasonalBracketConfig {
  try {
    const parsed = JSON.parse(rawJson || '{}');
    return {
      seasonDurationDays: Number(parsed.seasonDurationDays || DEFAULT_SEASONAL_BRACKET_CONFIG.seasonDurationDays),
      rank4BaseCoins: Number(parsed.rank4BaseCoins || DEFAULT_SEASONAL_BRACKET_CONFIG.rank4BaseCoins),
      minEligibleCoins: Number(parsed.minEligibleCoins || DEFAULT_SEASONAL_BRACKET_CONFIG.minEligibleCoins),
      curveExponent: Number(parsed.curveExponent || DEFAULT_SEASONAL_BRACKET_CONFIG.curveExponent),
    };
  } catch {
    return { ...DEFAULT_SEASONAL_BRACKET_CONFIG };
  }
}

export async function ensureActiveSeasonAndCheckRollover() {
  const allSeasons = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.seasonNumber));

  const now = new Date();
  let activeSeason = allSeasons.find((s) => s.status === 'active') || null;

  if (!activeSeason) {
    const nextSeasonNumber = (allSeasons[0]?.seasonNumber || 0) + 1;
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const startsAt =
      nextSeasonNumber === 1
        ? new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
        : now;
    const endsAt =
      nextSeasonNumber === 1
        ? new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))
        : new Date(now.getTime() + DEFAULT_SEASONAL_BRACKET_CONFIG.seasonDurationDays * 86400000);

    const inserted = await db
      .insert(seasons)
      .values({
        seasonNumber: nextSeasonNumber,
        title: `Season ${nextSeasonNumber} · Starlight Sketchbook Cup`,
        status: 'active',
        startsAt,
        endsAt,
        bracketConfigJson: JSON.stringify(DEFAULT_SEASONAL_BRACKET_CONFIG),
        isTransitioning: false,
      })
      .returning();
    activeSeason = inserted[0];
  }

  // Automatic season-end check: if the active season's endsAt has passed, execute rollover atomically
  if (
    activeSeason &&
    activeSeason.status === 'active' &&
    !activeSeason.isTransitioning &&
    now.getTime() >= new Date(activeSeason.endsAt).getTime()
  ) {
    const rolled = await executeSeasonEndRollover(activeSeason.id);
    if (rolled?.newSeason) {
      activeSeason = rolled.newSeason;
    }
  }

  return activeSeason;
}

export async function executeSeasonEndRollover(seasonId: number) {
  const seasonRows = await db.select().from(seasons).where(eq(seasons.id, seasonId));
  if (!seasonRows.length) {
    throw new Error('Season record not found.');
  }
  const targetSeason = seasonRows[0];
  if (targetSeason.status !== 'active' || targetSeason.isTransitioning) {
    return null;
  }

  // Acquire atomic transition lock
  await db
    .update(seasons)
    .set({ isTransitioning: true })
    .where(eq(seasons.id, targetSeason.id));

  try {
    const config = parseSeasonalBracketConfig(targetSeason.bracketConfigJson);
    const allUsers = await db.select().from(users);
    const userByUid = new Map(allUsers.map((u) => [u.uid, u]));

    const allActiveCouples = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.status, 'active'))
      .orderBy(desc(couplePairings.coupleTrophies), desc(couplePairings.coupleWins));

    // Eligible couples have > 0 active seasonal trophies
    const eligibleCouples = allActiveCouples.filter((c) => (c.coupleTrophies || 0) > 0);
    const bracket = computeDynamicSeasonalBracket(
      eligibleCouples.map((c) => ({
        id: c.id,
        coupleName: c.coupleName || `Couple #${c.pairingCode}`,
        coupleTrophies: c.coupleTrophies || 0,
      })),
      config
    );

    const existingStandings = await db
      .select()
      .from(seasonStandings)
      .where(eq(seasonStandings.seasonId, targetSeason.id));
    const existingKeys = new Set(existingStandings.map((s) => s.rewardKey));

    const top1Skin = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 1)!;
    const top2Skin = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 2)!;
    const top3Skin = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 3)!;

    const savedStandings = [];

    for (let idx = 0; idx < eligibleCouples.length; idx++) {
      const couple = eligibleCouples[idx];
      const rank = idx + 1;
      const rewardKey = `season-${targetSeason.seasonNumber}-couple-${couple.id}`;
      if (existingKeys.has(rewardKey)) continue;

      let skinRewardId = '';
      let skinRarity = '';
      let coinReward = 0;

      if (rank === 1) {
        skinRewardId = top1Skin.id;
        skinRarity = top1Skin.rarity;
      } else if (rank === 2) {
        skinRewardId = top2Skin.id;
        skinRarity = top2Skin.rarity;
      } else if (rank === 3) {
        skinRewardId = top3Skin.id;
        skinRarity = top3Skin.rarity;
      } else {
        coinReward = bracket.perRankCoinMap[rank] || 0;
      }

      const reqUser = userByUid.get(couple.requesterUid);
      const partUser = couple.partnerUid ? userByUid.get(couple.partnerUid) : undefined;

      const insertedStanding = await db
        .insert(seasonStandings)
        .values({
          seasonId: targetSeason.id,
          seasonNumber: targetSeason.seasonNumber,
          rank,
          coupleId: couple.id,
          coupleName:
            couple.coupleName ||
            `${reqUser?.username || 'Partner 1'} & ${partUser?.username || 'Partner 2'}`,
          requesterUid: couple.requesterUid,
          requesterUsername: reqUser?.username || 'Partner 1',
          partnerUid: couple.partnerUid || '',
          partnerUsername: partUser?.username || 'Partner 2',
          finalTrophies: couple.coupleTrophies || 0,
          coupleWins: couple.coupleWins || 0,
          coupleLosses: couple.coupleLosses || 0,
          coupleDraws: couple.coupleDraws || 0,
          skinRewardId,
          skinRarity,
          coinReward,
          rewardKey,
        })
        .returning();

      savedStandings.push(insertedStanding[0]);

      // Distribute seasonal reward to both partners idempotently
      for (const partnerUid of [couple.requesterUid, couple.partnerUid]) {
        if (!partnerUid) continue;
        const freshRows = await db.select().from(users).where(eq(users.uid, partnerUid));
        if (!freshRows.length) continue;
        const pUser = freshRows[0];

        if (skinRewardId) {
          let unlockedList: string[] = [];
          try {
            unlockedList = JSON.parse(pUser.unlockedItems || '[]');
          } catch {
            unlockedList = [];
          }
          const seasonBadgeCode = `season-${targetSeason.seasonNumber}-rank-${rank}-${skinRewardId}`;
          const nextUnlocked = Array.from(
            new Set([...unlockedList, skinRewardId, seasonBadgeCode])
          );
          const nextEquipped =
            !pUser.equippedSkin || pUser.equippedSkin === 'skin-classic-notebook'
              ? skinRewardId
              : pUser.equippedSkin;

          await db
            .update(users)
            .set({
              unlockedItems: JSON.stringify(nextUnlocked),
              equippedSkin: nextEquipped,
            })
            .where(eq(users.uid, partnerUid));
        }

        if (coinReward > 0) {
          const nextCoins = (pUser.coins || 0) + coinReward;
          await db
            .update(users)
            .set({
              coins: nextCoins,
            })
            .where(eq(users.uid, partnerUid));

          await db.insert(coinTransactions).values({
            userUid: partnerUid,
            coupleId: couple.id,
            amount: coinReward,
            balanceAfter: nextCoins,
            txType: 'seasonal_leaderboard_reward',
            referenceId: `${rewardKey}-${partnerUid}`,
            description: `Season ${targetSeason.seasonNumber} Rank #${rank} Couple Leaderboard Reward (${couple.coupleName})`,
          });
        }
      }

      if (skinRewardId) {
        await db
          .update(couplePairings)
          .set({
            equippedCoupleSkin: skinRewardId,
            updatedAt: new Date(),
          })
          .where(eq(couplePairings.id, couple.id));
      }
    }

    // Reset EVERY active couple's seasonal coupleTrophies to 0 while preserving highestTrophies and lifetime stats
    for (const c of allActiveCouples) {
      await db
        .update(couplePairings)
        .set({
          highestTrophies: Math.max(c.highestTrophies || 0, c.coupleTrophies || 0),
          coupleTrophies: 0,
          updatedAt: new Date(),
        })
        .where(eq(couplePairings.id, c.id));
    }

    const now = new Date();
    await db
      .update(seasons)
      .set({
        status: 'completed',
        isTransitioning: false,
        completedAt: now,
      })
      .where(eq(seasons.id, targetSeason.id));

    const nextSeasonNumber = targetSeason.seasonNumber + 1;
    const seasonThemes = [
      'Starlight Sketchbook Cup',
      'Clockwork Constellation Cup',
      'Moonlit Lantern Regatta',
      'Velvet Observatory Championship',
    ];
    const nextTitle = `Season ${nextSeasonNumber} · ${
      seasonThemes[(nextSeasonNumber - 1) % seasonThemes.length]
    }`;
    const nextEndsAt = new Date(
      now.getTime() + Math.max(1, config.seasonDurationDays) * 86400000
    );

    const newSeasonRows = await db
      .insert(seasons)
      .values({
        seasonNumber: nextSeasonNumber,
        title: nextTitle,
        status: 'active',
        startsAt: now,
        endsAt: nextEndsAt,
        bracketConfigJson: JSON.stringify(config),
        isTransitioning: false,
      })
      .returning();

    return {
      completedSeason: targetSeason,
      newSeason: newSeasonRows[0],
      standingsSaved: savedStandings.length,
    };
  } catch (error) {
    await db
      .update(seasons)
      .set({ isTransitioning: false })
      .where(eq(seasons.id, targetSeason.id));
    throw error;
  }
}

export async function updateSeasonalBracketConfig(
  actorUid: string,
  updates: Partial<SeasonalBracketConfig>
) {
  const activeSeason = await ensureActiveSeasonAndCheckRollover();
  if (!activeSeason) {
    throw new Error('No active season found.');
  }
  const currentConfig = parseSeasonalBracketConfig(activeSeason.bracketConfigJson);
  const nextConfig: SeasonalBracketConfig = {
    seasonDurationDays: Math.max(
      1,
      Math.min(90, Number(updates.seasonDurationDays ?? currentConfig.seasonDurationDays))
    ),
    rank4BaseCoins: Math.max(
      50,
      Math.min(5000, Number(updates.rank4BaseCoins ?? currentConfig.rank4BaseCoins))
    ),
    minEligibleCoins: Math.max(
      10,
      Math.min(2000, Number(updates.minEligibleCoins ?? currentConfig.minEligibleCoins))
    ),
    curveExponent: Math.max(
      0.5,
      Math.min(3, Number(updates.curveExponent ?? currentConfig.curveExponent))
    ),
  };
  if (nextConfig.minEligibleCoins > nextConfig.rank4BaseCoins) {
    nextConfig.minEligibleCoins = nextConfig.rank4BaseCoins;
  }

  const updated = await db
    .update(seasons)
    .set({
      bracketConfigJson: JSON.stringify(nextConfig),
    })
    .where(eq(seasons.id, activeSeason.id))
    .returning();

  return {
    season: updated[0],
    bracketConfig: nextConfig,
  };
}

export async function concludeActiveSeasonNow(actorUid: string) {
  const activeSeason = await ensureActiveSeasonAndCheckRollover();
  if (!activeSeason) {
    throw new Error('No active season to conclude.');
  }
  const result = await executeSeasonEndRollover(activeSeason.id);
  return result;
}

/* ============================================================================
   BOOTSTRAP & LEADERBOARD DATA (STRICT ZERO-MOCK + COUPLE TROPHY LEADERBOARD)
   ============================================================================ */

export async function getArcadeBootstrapData(activeUid?: string) {
  try {
    // 1. Ensure active competitive season exists & automatically process rollover if season timer expired
    const activeSeason = await ensureActiveSeasonAndCheckRollover();
    const bracketConfig = parseSeasonalBracketConfig(activeSeason?.bracketConfigJson);

    const allUserRows = await db.select().from(users).orderBy(desc(users.xp));
    const sanitizedPlayers = allUserRows.map(sanitizeUserRow);
    const userByUid = new Map(sanitizedPlayers.map((p) => [p.uid, p]));

    const activeCouplesRaw = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.status, 'active'))
      .orderBy(desc(couplePairings.coupleTrophies), desc(couplePairings.coupleWins))
      .limit(50);

    const recentRecords = await db
      .select()
      .from(gameRecords)
      .orderBy(desc(gameRecords.createdAt))
      .limit(120);

    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Enrich couples with both partners' usernames, avatars, equipped skins, and period trophy deltas
    const enrichedCouplesLeaderboard = activeCouplesRaw.map((c) => {
      const partnerA = userByUid.get(c.requesterUid) || null;
      const partnerB = c.partnerUid ? userByUid.get(c.partnerUid) || null : null;

      // Deduplicate 2v2 match records by matchKey or timestamp bucket for weekly/monthly trophy sums
      const seenMatchKeys = new Set<string>();
      let weeklyTrophies = 0;
      let monthlyTrophies = 0;

      for (const rec of recentRecords) {
        if (rec.coupleId !== c.id || (rec.mode !== '2v2' && rec.mode !== '2v2_couple')) continue;
        const dedupKey = rec.matchKey || `${rec.gameId}-${rec.createdAt ? new Date(rec.createdAt).toISOString().slice(0, 16) : rec.id}`;
        if (seenMatchKeys.has(dedupKey)) continue;
        seenMatchKeys.add(dedupKey);

        const recTime = rec.createdAt ? new Date(rec.createdAt).getTime() : 0;
        const delta = Math.max(0, rec.trophiesDelta || 0);
        if (nowMs - recTime <= sevenDaysMs) {
          weeklyTrophies += delta;
        }
        if (nowMs - recTime <= thirtyDaysMs) {
          monthlyTrophies += delta;
        }
      }

      return {
        ...c,
        equippedCoupleSkin: c.equippedCoupleSkin || 'skin-classic-notebook',
        requesterProfile: partnerA,
        partnerProfile: partnerB,
        weeklyTrophies: weeklyTrophies || c.coupleTrophies,
        monthlyTrophies: monthlyTrophies || c.coupleTrophies,
      };
    });

    // Compute live Dynamic Seasonal Bracket based on actual eligible couples (coupleTrophies > 0)
    const eligibleSeasonalCouples = enrichedCouplesLeaderboard
      .filter((c) => (c.coupleTrophies || 0) > 0)
      .map((c) => ({
        id: c.id,
        coupleName:
          c.coupleName ||
          `${c.requesterProfile?.username || 'Partner 1'} & ${c.partnerProfile?.username || 'Partner 2'}`,
        coupleTrophies: c.coupleTrophies || 0,
      }));

    const dynamicBracket = computeDynamicSeasonalBracket(
      eligibleSeasonalCouples,
      bracketConfig
    );

    const allSeasons = await db
      .select()
      .from(seasons)
      .orderBy(desc(seasons.seasonNumber))
      .limit(12);

    const pastStandings = await db
      .select()
      .from(seasonStandings)
      .orderBy(desc(seasonStandings.seasonNumber), seasonStandings.rank)
      .limit(100);

    const seasonEndsAtMs = activeSeason?.endsAt
      ? new Date(activeSeason.endsAt).getTime()
      : nowMs + 30 * 86400000;
    const seasonRemainingMs = Math.max(0, seasonEndsAtMs - nowMs);
    const totalSec = Math.floor(seasonRemainingMs / 1000);
    const sDays = Math.floor(totalSec / 86400);
    const sHours = Math.floor((totalSec % 86400) / 3600);
    const sMins = Math.floor((totalSec % 3600) / 60);
    const seasonRemainingLabel =
      sDays > 0
        ? `${sDays}d ${sHours}h ${sMins}m`
        : sHours > 0
        ? `${sHours}h ${sMins}m`
        : `${sMins}m`;

    const activeRooms = await db
      .select()
      .from(rooms)
      .orderBy(desc(rooms.updatedAt))
      .limit(20);

    const coupleCtx = activeUid
      ? await getCoupleContextForUser(activeUid)
      : { activeCouple: null, pendingOutgoing: null, pendingIncoming: null };

    const partnerUid =
      coupleCtx.activeCouple?.requesterUid === activeUid
        ? coupleCtx.activeCouple?.partnerUid
        : coupleCtx.activeCouple?.requesterUid;

    const allCustomItems = await db
      .select()
      .from(personalizedContent)
      .orderBy(desc(personalizedContent.createdAt))
      .limit(60);

    const scopedCustomItems = activeUid
      ? allCustomItems.filter(
          (item) =>
            item.creatorUid === activeUid ||
            (partnerUid && item.creatorUid === partnerUid) ||
            (coupleCtx.activeCouple && item.coupleId === coupleCtx.activeCouple.id)
        )
      : [];

    const challengeBundle = activeUid
      ? await syncAndEvaluatePlayerChallenges(activeUid)
      : {
          activeChallenges: [],
          challengeHistory: [],
          periodWindows: {
            daily: getChallengePeriodWindow('daily'),
            weekly: getChallengePeriodWindow('weekly'),
            monthly: getChallengePeriodWindow('monthly'),
          },
        };

    const userCoinLedger = activeUid
      ? await db
          .select()
          .from(coinTransactions)
          .where(eq(coinTransactions.userUid, activeUid))
          .orderBy(desc(coinTransactions.createdAt))
          .limit(30)
      : [];

    const activeCoupleId = coupleCtx.activeCouple?.id || 0;
    const allPendingInvites = activeUid
      ? await db
          .select()
          .from(gameInvitations)
          .where(eq(gameInvitations.status, 'pending'))
          .orderBy(desc(gameInvitations.createdAt))
          .limit(30)
      : [];

    const incomingInvitations = activeUid
      ? allPendingInvites.filter(
          (inv) =>
            inv.targetUid === activeUid ||
            (activeCoupleId > 0 && inv.inviteType === '2v2' && inv.targetCoupleId === activeCoupleId)
        )
      : [];

    const outgoingInvitations = activeUid
      ? allPendingInvites.filter(
          (inv) =>
            inv.senderUid === activeUid ||
            (activeCoupleId > 0 && inv.inviteType === '2v2' && inv.senderCoupleId === activeCoupleId)
        )
      : [];

    return {
      players: sanitizedPlayers,
      couplesLeaderboard: enrichedCouplesLeaderboard,
      records: recentRecords.slice(0, 50),
      rooms: activeRooms,
      personalizedContent: scopedCustomItems,
      challenges: challengeBundle.activeChallenges,
      challengeHistory: challengeBundle.challengeHistory,
      challengePeriodWindows: challengeBundle.periodWindows,
      seasonState: {
        activeSeason: activeSeason
          ? {
              ...activeSeason,
              remainingMs: seasonRemainingMs,
              remainingLabel: seasonRemainingLabel,
              bracketConfig,
            }
          : null,
        dynamicBracket,
        pastSeasons: allSeasons.filter((s) => s.status === 'completed'),
        pastStandings,
      },
      coupleContext: coupleCtx,
      coinTransactions: userCoinLedger,
      incomingInvitations,
      outgoingInvitations,
    };
  } catch (error) {
    console.error('Database getArcadeBootstrapData failed:', error);
    throw new Error('Failed to load arcade state from database.', { cause: error });
  }
}


/* ============================================================================
   MULTIPLAYER ROOMS: CREATE ROOM & JOIN GROUP VALIDATION
   ============================================================================ */

export interface RoomParticipantPayload {
  uid: string;
  username: string;
  avatar: string;
  coupleId?: number;
  coupleName?: string;
  teamSlot?: 1 | 2;
  ready: boolean;
  online: boolean;
}

export interface RoomCoupleTeamPayload {
  teamSlot: 1 | 2;
  coupleId: number;
  coupleName: string;
  coupleTrophies?: number;
  score: number;
  members: { uid: string; username: string; avatar: string }[];
}

export async function createValidatedMultiplayerRoom(input: {
  hostUid: string;
  gameId: string;
  mode: '1v1' | '2v2';
  settings?: Record<string, unknown>;
  includePairedPartner?: boolean;
}) {
  try {
    const hostRows = await db.select().from(users).where(eq(users.uid, input.hostUid));
    if (!hostRows.length) {
      throw new Error('Authenticated host profile not found.');
    }
    const host = sanitizeUserRow(hostRows[0]);
    const coupleCtx = await getCoupleContextForUser(host.uid);

    // Mandatory Backend Validation: Both 1v1 and 2v2 require an active Couple Pairing
    if (!coupleCtx.activeCouple || coupleCtx.activeCouple.status !== 'active') {
      if (input.mode === '1v1') {
        throw new Error(
          'Couple pairing is mandatory for 1v1 multiplayer. Both partners must have registered individual accounts and an active Couple Pairing before creating a 1v1 match.'
        );
      }
      throw new Error(
        '2v2 Couple Mode requires an active Couple Pairing. Pair with your partner first in Profile & Couple.'
      );
    }

    const partnerProfile =
      coupleCtx.activeCouple.requesterUid === host.uid
        ? coupleCtx.activeCouple.partnerProfile
        : coupleCtx.activeCouple.requesterProfile;

    if (!partnerProfile) {
      throw new Error(
        'Both partners must have registered individual accounts in the database to create a multiplayer match.'
      );
    }

    let roomCode = generateRandomCode(6);
    for (let i = 0; i < 6; i++) {
      const existing = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode));
      if (existing.length === 0) break;
      roomCode = generateRandomCode(6);
    }

    const maxPlayers = input.mode === '2v2' ? 4 : 2;
    const players: RoomParticipantPayload[] = [
      {
        uid: host.uid,
        username: host.username,
        avatar: host.avatar,
        coupleId: coupleCtx.activeCouple.id,
        coupleName: coupleCtx.activeCouple.coupleName,
        teamSlot: 1,
        ready: true,
        online: true,
      },
    ];

    const teams: RoomCoupleTeamPayload[] = [];

    if (input.mode === '1v1') {
      if (input.includePairedPartner !== false) {
        players.push({
          uid: partnerProfile.uid,
          username: partnerProfile.username,
          avatar: partnerProfile.avatar,
          coupleId: coupleCtx.activeCouple.id,
          coupleName: coupleCtx.activeCouple.coupleName,
          teamSlot: 2,
          ready: true,
          online: Boolean(partnerProfile.isOnline),
        });
      }
    } else if (input.mode === '2v2') {
      if (input.includePairedPartner !== false) {
        players.push({
          uid: partnerProfile.uid,
          username: partnerProfile.username,
          avatar: partnerProfile.avatar,
          coupleId: coupleCtx.activeCouple.id,
          coupleName: coupleCtx.activeCouple.coupleName,
          teamSlot: 1,
          ready: true,
          online: Boolean(partnerProfile.isOnline),
        });
      }

      teams.push({
        teamSlot: 1,
        coupleId: coupleCtx.activeCouple.id,
        coupleName:
          coupleCtx.activeCouple.coupleName ||
          `${host.username} & ${partnerProfile.username}`,
        coupleTrophies: coupleCtx.activeCouple.coupleTrophies || 0,
        score: 0,
        members: players.map((p) => ({
          uid: p.uid,
          username: p.username,
          avatar: p.avatar,
        })),
      });
    }

    const sessionSeed = generateFreshGameSeed();

    const systemChat = [
      {
        id: `sys-${Date.now()}`,
        sender: host.username,
        text: `Created ${input.mode.toUpperCase()} room #${roomCode} (${maxPlayers} player slots).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    const inserted = await db
      .insert(rooms)
      .values({
        roomCode,
        gameId: input.gameId,
        mode: input.mode,
        maxPlayers,
        hostUid: host.uid,
        hostName: host.username,
        status: 'lobby',
        settingsJson: JSON.stringify(input.settings || {}),
        playersJson: JSON.stringify(players),
        teamsJson: JSON.stringify(teams),
        gameStateJson: JSON.stringify({ sessionSeed, roundNumber: 1 }),
        chatJson: JSON.stringify(systemChat),
        voiceParticipantsJson: JSON.stringify([]),
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database createValidatedMultiplayerRoom failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create multiplayer room.';
    throw new Error(msg, { cause: error });
  }
}

export async function inspectRoomForJoin(roomCode: string, actorUid?: string) {
  try {
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      return {
        valid: false,
        reason: 'invalid_code',
        message: 'Please enter a valid room number.',
        room: null,
      };
    }

    const rows = await db.select().from(rooms).where(eq(rooms.roomCode, cleanCode));
    if (!rows.length) {
      return {
        valid: false,
        reason: 'not_found',
        message: `Room #${cleanCode} does not exist. Check the room number and try again.`,
        room: null,
      };
    }

    const room = rows[0];
    const players: RoomParticipantPayload[] = JSON.parse(room.playersJson || '[]');
    const teams: RoomCoupleTeamPayload[] = JSON.parse(room.teamsJson || '[]');
    const isAlreadyParticipant = actorUid
      ? players.some((p) => p.uid === actorUid)
      : false;

    if (room.status === 'finished' || room.status === 'expired') {
      return {
        valid: false,
        reason: 'expired',
        message: `Room #${cleanCode} has already finished or expired.`,
        room: { ...room, players, teams },
      };
    }

    if (!isAlreadyParticipant && players.length >= room.maxPlayers) {
      return {
        valid: false,
        reason: 'full',
        message: `Room #${cleanCode} is full (${players.length}/${room.maxPlayers} players).`,
        room: { ...room, players, teams },
      };
    }

    return {
      valid: true,
      reason: 'ok',
      message: isAlreadyParticipant
        ? `You are already a member of Room #${cleanCode}.`
        : `Room #${cleanCode} is open (${players.length}/${room.maxPlayers} players).`,
      room: { ...room, players, teams },
    };
  } catch (error) {
    console.error('Database inspectRoomForJoin failed:', error);
    throw new Error('Failed to validate room number.', { cause: error });
  }
}

export async function joinValidatedMultiplayerRoom(input: {
  actorUid: string;
  roomCode: string;
  includePairedPartner?: boolean;
}) {
  try {
    const inspection = await inspectRoomForJoin(input.roomCode, input.actorUid);
    if (!inspection.valid || !inspection.room) {
      throw new Error(inspection.message);
    }

    const userRows = await db.select().from(users).where(eq(users.uid, input.actorUid));
    if (!userRows.length) {
      throw new Error('Authenticated user profile not found.');
    }
    const actor = sanitizeUserRow(userRows[0]);
    const coupleCtx = await getCoupleContextForUser(actor.uid);

    // Mandatory Backend Validation: Both 1v1 and 2v2 require an active Couple Pairing
    if (!coupleCtx.activeCouple || coupleCtx.activeCouple.status !== 'active') {
      throw new Error(
        `Couple pairing is mandatory for ${inspection.room.mode.toUpperCase()} multiplayer. Please pair with your partner in Profile & Couple first.`
      );
    }

    const room = inspection.room;
    const players: RoomParticipantPayload[] = [...room.players];
    const teams: RoomCoupleTeamPayload[] = [...room.teams];
    const chat = JSON.parse(room.chatJson || '[]');

    const existingIdx = players.findIndex((p) => p.uid === actor.uid);
    if (existingIdx >= 0) {
      players[existingIdx] = { ...players[existingIdx], online: true };
    } else {
      if (room.mode === '2v2') {
        const assignedTeamSlot: 1 | 2 = teams.some((t) => t.coupleId === coupleCtx.activeCouple!.id)
          ? (teams.find((t) => t.coupleId === coupleCtx.activeCouple!.id)?.teamSlot || 1)
          : teams.length === 0
          ? 1
          : 2;

        players.push({
          uid: actor.uid,
          username: actor.username,
          avatar: actor.avatar,
          coupleId: coupleCtx.activeCouple.id,
          coupleName: coupleCtx.activeCouple.coupleName,
          teamSlot: assignedTeamSlot,
          ready: true,
          online: true,
        });

        const partnerProfile =
          coupleCtx.activeCouple.requesterUid === actor.uid
            ? coupleCtx.activeCouple.partnerProfile
            : coupleCtx.activeCouple.requesterProfile;

        if (
          input.includePairedPartner !== false &&
          partnerProfile &&
          players.length < room.maxPlayers &&
          !players.some((p) => p.uid === partnerProfile.uid)
        ) {
          players.push({
            uid: partnerProfile.uid,
            username: partnerProfile.username,
            avatar: partnerProfile.avatar,
            coupleId: coupleCtx.activeCouple.id,
            coupleName: coupleCtx.activeCouple.coupleName,
            teamSlot: assignedTeamSlot,
            ready: true,
            online: true,
          });
        }

        const teamIdx = teams.findIndex((t) => t.coupleId === coupleCtx.activeCouple!.id);
        const coupleMembers = players
          .filter((p) => p.coupleId === coupleCtx.activeCouple!.id)
          .map((p) => ({ uid: p.uid, username: p.username, avatar: p.avatar }));

        if (teamIdx >= 0) {
          teams[teamIdx].members = coupleMembers;
        } else {
          teams.push({
            teamSlot: assignedTeamSlot,
            coupleId: coupleCtx.activeCouple.id,
            coupleName:
              coupleCtx.activeCouple.coupleName ||
              `${actor.username} & ${partnerProfile?.username || 'Partner'}`,
            coupleTrophies: coupleCtx.activeCouple.coupleTrophies || 0,
            score: 0,
            members: coupleMembers,
          });
        }
      } else {
        if (players.length >= room.maxPlayers) {
          throw new Error(`Room #${room.roomCode} is already full.`);
        }
        players.push({
          uid: actor.uid,
          username: actor.username,
          avatar: actor.avatar,
          coupleId: coupleCtx.activeCouple?.id || 0,
          coupleName: coupleCtx.activeCouple?.coupleName || '',
          teamSlot: 2,
          ready: true,
          online: true,
        });
      }

      chat.push({
        id: `join-${Date.now()}`,
        sender: actor.username,
        text:
          room.mode === '2v2' && coupleCtx.activeCouple
            ? `${coupleCtx.activeCouple.coupleName} joined the 2v2 Couple lobby!`
            : `${actor.username} joined the room!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    const updated = await db
      .update(rooms)
      .set({
        playersJson: JSON.stringify(players),
        teamsJson: JSON.stringify(teams),
        chatJson: JSON.stringify(chat),
        updatedAt: new Date(),
      })
      .where(eq(rooms.roomCode, room.roomCode))
      .returning();

    return updated[0];
  } catch (error) {
    console.error('Database joinValidatedMultiplayerRoom failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to join room.';
    throw new Error(msg, { cause: error });
  }
}

export async function upsertMultiplayerRoom(input: {
  roomCode: string;
  gameId: string;
  mode?: '1v1' | '2v2';
  maxPlayers?: number;
  hostUid: string;
  hostName: string;
  status: string;
  settings?: Record<string, unknown>;
  players: unknown[];
  teams?: unknown[];
  gameState: Record<string, unknown>;
  chat: unknown[];
  voiceParticipants: unknown[];
}) {
  try {
    const cleanCode = input.roomCode.trim().toUpperCase();
    // Ensure gameState always preserves or initializes a valid sessionSeed
    const gameStateWithSeed = {
      ...input.gameState,
      sessionSeed:
        typeof input.gameState?.sessionSeed === 'number' && input.gameState.sessionSeed > 0
          ? input.gameState.sessionSeed
          : generateFreshGameSeed(),
    };

    const rows = await db
      .insert(rooms)
      .values({
        roomCode: cleanCode,
        gameId: input.gameId,
        mode: input.mode || '1v1',
        maxPlayers: input.maxPlayers || (input.mode === '2v2' ? 4 : 2),
        hostUid: input.hostUid,
        hostName: input.hostName,
        status: input.status,
        settingsJson: JSON.stringify(input.settings || {}),
        playersJson: JSON.stringify(input.players),
        teamsJson: JSON.stringify(input.teams || []),
        gameStateJson: JSON.stringify(gameStateWithSeed),
        chatJson: JSON.stringify(input.chat),
        voiceParticipantsJson: JSON.stringify(input.voiceParticipants),
      })
      .onConflictDoUpdate({
        target: rooms.roomCode,
        set: {
          gameId: input.gameId,
          mode: input.mode || '1v1',
          maxPlayers: input.maxPlayers || (input.mode === '2v2' ? 4 : 2),
          status: input.status,
          settingsJson: JSON.stringify(input.settings || {}),
          playersJson: JSON.stringify(input.players),
          teamsJson: JSON.stringify(input.teams || []),
          gameStateJson: JSON.stringify(gameStateWithSeed),
          chatJson: JSON.stringify(input.chat),
          voiceParticipantsJson: JSON.stringify(input.voiceParticipants),
          updatedAt: new Date(),
        },
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database upsertMultiplayerRoom failed:', error);
    throw new Error('Failed to synchronize multiplayer room.', { cause: error });
  }
}

export async function getRoomByCode(roomCode: string) {
  try {
    const cleanCode = roomCode.trim().toUpperCase();
    const rows = await db.select().from(rooms).where(eq(rooms.roomCode, cleanCode));
    return rows[0] || null;
  } catch (error) {
    console.error('Database getRoomByCode failed:', error);
    throw new Error('Failed to fetch room by code.', { cause: error });
  }
}

/* ============================================================================
   MATCH RESULTS (2V2-EXCLUSIVE COINS & COUPLE TROPHIES) & PROFILE UPDATES
   ============================================================================ */

export async function recordGameMatchResult(input: {
  userUid: string;
  username: string;
  coupleId?: number;
  opponentLabel?: string;
  gameId: string;
  mode: string;
  result: string;
  score: number;
  xpEarned?: number;
  coinsEarned?: number;
  matchKey?: string;
  durationSeconds?: number;
  details?: Record<string, unknown>;
}) {
  try {
    const coupleCtx = await getCoupleContextForUser(input.userUid);
    const normalizedMode =
      input.mode === '2v2_couple' || input.mode === '2v2'
        ? '2v2'
        : input.mode === '1v1'
        ? '1v1'
        : input.mode === 'cooperative' || input.mode === 'coop'
        ? 'coop'
        : 'single';

    if ((normalizedMode === '1v1' || normalizedMode === '2v2') && !coupleCtx.activeCouple) {
      throw new Error(
        'Couple pairing is mandatory to record 1v1 or 2v2 multiplayer matches.'
      );
    }

    const activeCoupleId =
      normalizedMode === 'single' ? 0 : input.coupleId || coupleCtx.activeCouple?.id || 0;

    const gameDef = ALL_ARCADE_GAMES.find((g) => g.id === input.gameId);
    const isWin = input.result === 'win' || input.result === 'completed';
    const isLoss = input.result === 'loss';
    const isDraw = input.result === 'draw';

    // Server-Authoritative Economy Enforcement (Section 8):
    // - Single Player: 15-25 XP, 0 Coins, 0 Trophies
    // - 1v1 / Co-op (non-2v2): 20-30 XP, 0 Coins, 0 Trophies
    // - 2v2 Couple Mode: 30-45 XP, Balanced Coins (Win: 25, Draw: 12, Loss: 8), Couple Trophies (Win: +30, Draw: +6, Loss: -15)
    let authoritativeXp = 20;
    let authoritativeCoins = 0;
    let authoritativeTrophiesDelta = 0;

    if (normalizedMode === 'single') {
      const baseXp = gameDef?.xpReward || 18;
      authoritativeXp = Math.min(25, Math.max(15, isWin ? baseXp : Math.floor(baseXp * 0.7)));
      authoritativeCoins = 0;
      authoritativeTrophiesDelta = 0;
    } else if (normalizedMode === '1v1' || normalizedMode === 'coop') {
      const baseXp = gameDef?.xpReward || 24;
      authoritativeXp = Math.min(30, Math.max(18, isWin ? baseXp : isDraw ? 20 : 16));
      authoritativeCoins = 0;
      authoritativeTrophiesDelta = 0;
    } else if (normalizedMode === '2v2') {
      authoritativeXp = isWin ? 42 : isDraw ? 34 : 28;
      authoritativeCoins = isWin ? 25 : isDraw ? 12 : 8;
      authoritativeTrophiesDelta = isWin ? 30 : isDraw ? 6 : -15;
    }

    const cleanMatchKey =
      (input.matchKey || (input.details?.matchKey as string) || '').trim();

    // Anti-duplication check for 2v2 matches: if this couple already recorded this exact matchKey,
    // return existing state so both partners' browsers reporting completion never double-credits coins or trophies!
    if (normalizedMode === '2v2' && cleanMatchKey && activeCoupleId > 0) {
      const existingMatchRows = await db
        .select()
        .from(gameRecords)
        .where(
          and(
            eq(gameRecords.coupleId, activeCoupleId),
            eq(gameRecords.matchKey, cleanMatchKey)
          )
        );
      if (existingMatchRows.length > 0) {
        const currentUserRows = await db
          .select()
          .from(users)
          .where(eq(users.uid, input.userUid));
        return {
          record: existingMatchRows[0],
          user: currentUserRows[0] ? sanitizeUserRow(currentUserRows[0]) : null,
          deduplicated: true,
        };
      }
    }

    const inserted = await db
      .insert(gameRecords)
      .values({
        userUid: input.userUid,
        username: input.username,
        coupleId: activeCoupleId,
        opponentLabel: input.opponentLabel || '',
        gameId: input.gameId,
        mode: normalizedMode,
        result: input.result,
        score: input.score,
        xpEarned: authoritativeXp,
        coinsEarned: authoritativeCoins,
        trophiesDelta: authoritativeTrophiesDelta,
        matchKey: cleanMatchKey,
        durationSeconds: input.durationSeconds ?? 60,
        details: JSON.stringify(input.details ?? {}),
      })
      .returning();

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.uid, input.userUid));

    let updatedUser = existingUsers[0] || null;
    if (updatedUser) {
      const nextXp = updatedUser.xp + authoritativeXp;
      const nextCoins = updatedUser.coins + authoritativeCoins;
      const { level } = calculateLevelFromXp(nextXp);

      const updatedRows = await db
        .update(users)
        .set({
          xp: nextXp,
          level,
          coins: nextCoins,
          wins: updatedUser.wins + (isWin ? 1 : 0),
          losses: updatedUser.losses + (isLoss ? 1 : 0),
          draws: updatedUser.draws + (isDraw ? 1 : 0),
          presenceStatus: 'online',
          lastSeenAt: new Date(),
        })
        .where(eq(users.uid, input.userUid))
        .returning();
      updatedUser = updatedRows[0] || updatedUser;

      if (authoritativeCoins > 0) {
        await db.insert(coinTransactions).values({
          userUid: input.userUid,
          coupleId: activeCoupleId,
          amount: authoritativeCoins,
          balanceAfter: nextCoins,
          txType: '2v2_match_reward',
          referenceId: cleanMatchKey || `rec-${inserted[0].id}`,
          description: `2v2 Couple Match (${gameDef?.title || input.gameId} · ${input.result.toUpperCase()})`,
        });
      }
    }

    const partnerProfile =
      coupleCtx.activeCouple?.requesterUid === input.userUid
        ? coupleCtx.activeCouple?.partnerProfile
        : coupleCtx.activeCouple?.requesterProfile;

    // In 1v1 mode between paired partners, also record the respective individual result (0 coins, 0 trophies)
    if (normalizedMode === '1v1' && partnerProfile) {
      const partnerResult =
        input.result === 'win'
          ? 'loss'
          : input.result === 'loss'
          ? 'win'
          : input.result === 'draw'
          ? 'draw'
          : 'completed';
      const partnerXpGain = Math.max(15, Math.floor(authoritativeXp * 0.75));

      await db.insert(gameRecords).values({
        userUid: partnerProfile.uid,
        username: partnerProfile.username,
        coupleId: activeCoupleId,
        opponentLabel: input.username,
        gameId: input.gameId,
        mode: '1v1',
        result: partnerResult,
        score: Number((input.details as Record<string, unknown>)?.team2Score || 0),
        xpEarned: partnerXpGain,
        coinsEarned: 0,
        trophiesDelta: 0,
        matchKey: cleanMatchKey,
        durationSeconds: input.durationSeconds ?? 60,
        details: JSON.stringify({
          ...(input.details ?? {}),
          pairedDuelWith: input.username,
        }),
      });

      const partRows = await db
        .select()
        .from(users)
        .where(eq(users.uid, partnerProfile.uid));
      if (partRows[0]) {
        const pRow = partRows[0];
        const nextPXp = pRow.xp + partnerXpGain;
        const { level: nextPLevel } = calculateLevelFromXp(nextPXp);
        await db
          .update(users)
          .set({
            xp: nextPXp,
            level: nextPLevel,
            wins: pRow.wins + (partnerResult === 'win' ? 1 : 0),
            losses: pRow.losses + (partnerResult === 'loss' ? 1 : 0),
            draws: pRow.draws + (partnerResult === 'draw' ? 1 : 0),
          })
          .where(eq(users.uid, partnerProfile.uid));
      }
    }

    // In 2v2 Couple Mode, credit both partners' coins/XP AND update Couple Trophies on couple_pairings
    if (coupleCtx.activeCouple && normalizedMode === '2v2') {
      const c = coupleCtx.activeCouple;

      if (partnerProfile) {
        const partRows = await db
          .select()
          .from(users)
          .where(eq(users.uid, partnerProfile.uid));
        if (partRows[0]) {
          const pRow = partRows[0];
          const nextPXp = pRow.xp + authoritativeXp;
          const nextPCoins = pRow.coins + authoritativeCoins;
          const { level: nextPLevel } = calculateLevelFromXp(nextPXp);
          await db
            .update(users)
            .set({
              xp: nextPXp,
              level: nextPLevel,
              coins: nextPCoins,
              wins: pRow.wins + (isWin ? 1 : 0),
              losses: pRow.losses + (isLoss ? 1 : 0),
              draws: pRow.draws + (isDraw ? 1 : 0),
            })
            .where(eq(users.uid, partnerProfile.uid));

          if (authoritativeCoins > 0) {
            await db.insert(coinTransactions).values({
              userUid: partnerProfile.uid,
              coupleId: c.id,
              amount: authoritativeCoins,
              balanceAfter: nextPCoins,
              txType: '2v2_match_reward',
              referenceId: cleanMatchKey || `rec-${inserted[0].id}-partner`,
              description: `2v2 Couple Match (${gameDef?.title || input.gameId} · ${input.result.toUpperCase()})`,
            });
          }
        }
      }

      const nextCoupleXp = c.coupleXp + authoritativeXp;
      const { level: nextCoupleLevel } = calculateLevelFromXp(nextCoupleXp);
      const nextCoupleTrophies = Math.max(0, (c.coupleTrophies || 0) + authoritativeTrophiesDelta);
      const nextHighestTrophies = Math.max(c.highestTrophies || 0, nextCoupleTrophies);

      // Automatically promote coupleTitle if a new milestone threshold is reached
      let nextCoupleTitle = c.coupleTitle || 'Newborn Duo';
      for (const m of TROPHY_ROAD_MILESTONES) {
        if (nextHighestTrophies >= m.trophiesRequired && m.rewardType === 'title') {
          nextCoupleTitle = m.rewardCode;
        }
      }

      await db
        .update(couplePairings)
        .set({
          coupleXp: nextCoupleXp,
          coupleLevel: nextCoupleLevel,
          coupleTrophies: nextCoupleTrophies,
          highestTrophies: nextHighestTrophies,
          coupleTitle: nextCoupleTitle,
          coupleWins: c.coupleWins + (isWin ? 1 : 0),
          coupleLosses: c.coupleLosses + (isLoss ? 1 : 0),
          coupleDraws: c.coupleDraws + (isDraw ? 1 : 0),
          updatedAt: new Date(),
        })
        .where(eq(couplePairings.id, c.id));
    }

    // Automatically evaluate Daily, Weekly, and Monthly challenge progress for the player (and partner if multiplayer)
    await syncAndEvaluatePlayerChallenges(input.userUid);
    if (partnerProfile?.uid) {
      await syncAndEvaluatePlayerChallenges(partnerProfile.uid);
    }

    return {
      record: inserted[0],
      user: updatedUser ? sanitizeUserRow(updatedUser) : null,
      authoritativeRewards: {
        xpEarned: authoritativeXp,
        coinsEarned: authoritativeCoins,
        trophiesDelta: authoritativeTrophiesDelta,
      },
    };
  } catch (error) {
    console.error('Database recordGameMatchResult failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to record game result.';
    throw new Error(msg, { cause: error });
  }
}

export async function updatePlayerProfileFields(
  uid: string,
  updates: {
    avatar?: string;
    theme?: string;
    equippedSkin?: string;
    xp?: number;
    favoriteGames?: string[];
    unlockedItems?: string[];
    petState?: Record<string, unknown>;
  }
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid));
    if (!existing.length) {
      throw new Error('Player profile not found.');
    }
    const current = existing[0];
    // Cap any pet-care XP increments so XP cannot be exploited
    const requestedXp = updates.xp !== undefined ? updates.xp : current.xp;
    const safeXp =
      requestedXp > current.xp ? Math.min(current.xp + 25, requestedXp) : current.xp;
    const { level } = calculateLevelFromXp(safeXp);

    let nextEquippedSkin = current.equippedSkin || 'skin-classic-notebook';
    if (updates.equippedSkin) {
      const unlockedList: string[] = (() => {
        try {
          return JSON.parse(current.unlockedItems || '[]');
        } catch {
          return [];
        }
      })();
      if (
        updates.equippedSkin === 'skin-classic-notebook' ||
        unlockedList.includes(updates.equippedSkin)
      ) {
        nextEquippedSkin = updates.equippedSkin;
      }
    }

    // Note: `coins` and `username` are strictly omitted here so clients cannot modify coins or bypass Rename Cards.
    const rows = await db
      .update(users)
      .set({
        avatar: updates.avatar ?? current.avatar,
        theme: updates.theme ?? current.theme,
        equippedSkin: nextEquippedSkin,
        xp: safeXp,
        level,
        favoriteGames: updates.favoriteGames
          ? JSON.stringify(updates.favoriteGames)
          : current.favoriteGames,
        unlockedItems: updates.unlockedItems
          ? JSON.stringify(updates.unlockedItems)
          : current.unlockedItems,
        petState: updates.petState
          ? JSON.stringify(updates.petState)
          : current.petState,
        lastSeenAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    if (updates.petState) {
      await recordPetCareChallengeIncrement(uid);
    }

    return sanitizeUserRow(rows[0]);
  } catch (error) {
    console.error('Database updatePlayerProfileFields failed:', error);
    throw new Error('Failed to update player profile.', { cause: error });
  }
}

export async function addPersonalizedItem(input: {
  creatorUid: string;
  category: string;
  title: string;
  payload: Record<string, unknown>;
}) {
  try {
    const coupleCtx = await getCoupleContextForUser(input.creatorUid);
    const rows = await db
      .insert(personalizedContent)
      .values({
        creatorUid: input.creatorUid,
        coupleId: coupleCtx.activeCouple?.id || 0,
        category: input.category,
        title: input.title,
        payloadJson: JSON.stringify(input.payload),
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database addPersonalizedItem failed:', error);
    throw new Error('Failed to save personalized arcade item.', { cause: error });
  }
}

/* ============================================================================
   REAL ONLINE PRESENCE, TROPHY-BASED 2v2 MATCHMAKING & USERNAME INVITATIONS
   ============================================================================ */

export async function isCoupleCurrentlyInActiveMatch(
  uidA: string,
  uidB: string,
  excludeRoomCode?: string
): Promise<{ inMatch: boolean; roomCode: string }> {
  const recentRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.status, 'playing'))
    .orderBy(desc(rooms.updatedAt))
    .limit(25);

  const fifteenMinsAgo = Date.now() - 15 * 60_000;

  for (const r of recentRooms) {
    if (excludeRoomCode && r.roomCode === excludeRoomCode) continue;
    const updatedTs = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    if (updatedTs < fifteenMinsAgo) continue;
    try {
      const players: RoomParticipantPayload[] = JSON.parse(r.playersJson || '[]');
      const hasMember = players.some(
        (p) => (uidA && p.uid === uidA) || (uidB && p.uid === uidB)
      );
      if (hasMember) {
        return { inMatch: true, roomCode: r.roomCode };
      }
    } catch {
      // ignore malformed json
    }
  }
  return { inMatch: false, roomCode: '' };
}

export async function updateUserPresenceHeartbeat(input: {
  uid: string;
  presenceStatus?: 'online' | 'in_queue' | 'in_match' | 'offline';
  activeRoomCode?: string;
}) {
  try {
    const now = new Date();
    const existing = await db.select().from(users).where(eq(users.uid, input.uid));
    if (!existing.length) return null;

    const nextStatus = input.presenceStatus || existing[0].presenceStatus || 'online';
    const nextRoomCode =
      input.activeRoomCode !== undefined ? input.activeRoomCode : existing[0].activeRoomCode;

    const updated = await db
      .update(users)
      .set({
        lastSeenAt: now,
        presenceStatus: nextStatus === 'offline' ? 'offline' : nextStatus,
        activeRoomCode: nextRoomCode,
      })
      .where(eq(users.uid, input.uid))
      .returning();

    const coupleCtx = await getCoupleContextForUser(input.uid);

    if (input.presenceStatus === 'offline' && coupleCtx.activeCouple) {
      await db
        .update(matchmakingQueue)
        .set({ status: 'cancelled', updatedAt: now })
        .where(
          and(
            eq(matchmakingQueue.coupleId, coupleCtx.activeCouple.id),
            eq(matchmakingQueue.status, 'searching')
          )
        );
    } else if (coupleCtx.activeCouple) {
      await db
        .update(matchmakingQueue)
        .set({ heartbeatAt: now, updatedAt: now })
        .where(
          and(
            eq(matchmakingQueue.coupleId, coupleCtx.activeCouple.id),
            eq(matchmakingQueue.status, 'searching')
          )
        );
    }

    return {
      profile: sanitizeUserRow(updated[0]),
      coupleContext: coupleCtx,
    };
  } catch (error) {
    console.error('Database updateUserPresenceHeartbeat failed:', error);
    return null;
  }
}

async function expireStaleMatchmakingEntries() {
  const allSearching = await db
    .select()
    .from(matchmakingQueue)
    .where(eq(matchmakingQueue.status, 'searching'));

  const now = Date.now();
  for (const entry of allSearching) {
    const hb = entry.heartbeatAt ? new Date(entry.heartbeatAt).getTime() : 0;
    if (now - hb > ONLINE_HEARTBEAT_WINDOW_MS) {
      await db
        .update(matchmakingQueue)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(matchmakingQueue.id, entry.id));
    }
  }
}

export async function getMatchmakingStateForUser(actorUid: string) {
  try {
    await expireStaleMatchmakingEntries();
    const coupleCtx = await getCoupleContextForUser(actorUid);

    const activeQueues = await db
      .select()
      .from(matchmakingQueue)
      .where(eq(matchmakingQueue.status, 'searching'))
      .orderBy(desc(matchmakingQueue.createdAt));

    const queue1v1Count = activeQueues.filter((q) => q.queueMode === '1v1').length;
    const queue2v2Count = activeQueues.filter((q) => q.queueMode === '2v2').length;

    if (!coupleCtx.activeCouple) {
      return {
        myQueueEntry: null,
        matchedRoom: null,
        queueCounts: { queue1v1Count, queue2v2Count },
        partnerOnline: false,
        coupleAvailable: false,
      };
    }

    const c = coupleCtx.activeCouple;
    const partnerProfile =
      c.requesterUid === actorUid ? c.partnerProfile : c.requesterProfile;
    const requesterOnline = Boolean(c.requesterProfile?.isOnline);
    const partnerOnline = Boolean(partnerProfile?.isOnline);
    const activeMatchCheck = await isCoupleCurrentlyInActiveMatch(
      c.requesterUid,
      c.partnerUid
    );

    const myEntries = await db
      .select()
      .from(matchmakingQueue)
      .where(eq(matchmakingQueue.coupleId, c.id))
      .orderBy(desc(matchmakingQueue.updatedAt))
      .limit(5);

    const activeEntry =
      myEntries.find(
        (e) =>
          e.status === 'searching' ||
          e.status === 'match_found' ||
          e.status === 'match_starting'
      ) || null;

    if (activeEntry && activeEntry.status === 'searching' && activeEntry.queueMode === '2v2') {
      if (!requesterOnline || !partnerOnline) {
        await db
          .update(matchmakingQueue)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(matchmakingQueue.id, activeEntry.id));
        return {
          myQueueEntry: { ...activeEntry, status: 'cancelled' },
          matchedRoom: null,
          queueCounts: { queue1v1Count, queue2v2Count },
          partnerOnline,
          coupleAvailable: false,
        };
      }
      await tryMatch2v2Couples(activeEntry.id);
    } else if (activeEntry && activeEntry.status === 'searching' && activeEntry.queueMode === '1v1') {
      if (requesterOnline && partnerOnline && !activeMatchCheck.inMatch) {
        await matchPairedPartnersFor1v1(activeEntry.id);
      }
    }

    const refreshedEntries = activeEntry
      ? await db
          .select()
          .from(matchmakingQueue)
          .where(eq(matchmakingQueue.id, activeEntry.id))
      : [];
    const latestEntry = refreshedEntries[0] || activeEntry;

    let matchedRoom = null;
    if (latestEntry && latestEntry.matchedRoomCode) {
      matchedRoom = await getRoomByCode(latestEntry.matchedRoomCode);
    }

    const waitSeconds =
      latestEntry && latestEntry.createdAt
        ? Math.max(0, Math.floor((Date.now() - new Date(latestEntry.createdAt).getTime()) / 1000))
        : 0;
    const allowedTrophyRange = 150 + Math.floor(waitSeconds / 10) * 100;

    return {
      myQueueEntry: latestEntry
        ? {
            ...latestEntry,
            allowedTrophyRange,
            waitSeconds,
            opponentProfiles: JSON.parse(latestEntry.opponentProfilesJson || '[]'),
          }
        : null,
      matchedRoom,
      queueCounts: { queue1v1Count, queue2v2Count },
      partnerOnline,
      bothPartnersOnline: requesterOnline && partnerOnline,
      coupleInActiveMatch: activeMatchCheck.inMatch,
      activeMatchRoomCode: activeMatchCheck.roomCode,
      coupleAvailable: requesterOnline && partnerOnline && !activeMatchCheck.inMatch,
    };
  } catch (error) {
    console.error('Database getMatchmakingStateForUser failed:', error);
    throw new Error('Failed to poll matchmaking status.', { cause: error });
  }
}

async function matchPairedPartnersFor1v1(queueId: number) {
  const rows = await db
    .select()
    .from(matchmakingQueue)
    .where(eq(matchmakingQueue.id, queueId));
  if (!rows.length || rows[0].status !== 'searching') return null;
  const entry = rows[0];

  const createdRoom = await createValidatedMultiplayerRoom({
    hostUid: entry.requesterUid,
    gameId: entry.gameId,
    mode: '1v1',
    settings: { matchmaking: '1v1_paired_couple', format: 'Standard Match (Best of 3)' },
    includePairedPartner: true,
  });

  await db
    .update(rooms)
    .set({ status: 'playing', updatedAt: new Date() })
    .where(eq(rooms.roomCode, createdRoom.roomCode));

  const opponentProfiles = [
    {
      uid: entry.partnerUid,
      username: entry.partnerUsername,
      avatar: entry.partnerAvatar,
    },
  ];

  const updated = await db
    .update(matchmakingQueue)
    .set({
      status: 'match_found',
      matchedRoomCode: createdRoom.roomCode,
      opponentCoupleId: entry.coupleId,
      opponentCoupleName: `${entry.partnerUsername} (Paired Partner)`,
      opponentProfilesJson: JSON.stringify(opponentProfiles),
      updatedAt: new Date(),
    })
    .where(eq(matchmakingQueue.id, entry.id))
    .returning();

  return updated[0];
}

async function tryMatch2v2Couples(queueId: number) {
  const myRows = await db
    .select()
    .from(matchmakingQueue)
    .where(eq(matchmakingQueue.id, queueId));
  if (!myRows.length || myRows[0].status !== 'searching') return null;
  const myEntry = myRows[0];

  const myCreatedMs = myEntry.createdAt ? new Date(myEntry.createdAt).getTime() : Date.now();
  const waitSeconds = Math.max(0, Math.floor((Date.now() - myCreatedMs) / 1000));
  // Trophy matchmaking range starts at ±150 trophies and expands by +100 every 10 seconds in queue
  const myAllowedRange = 150 + Math.floor(waitSeconds / 10) * 100;

  const candidates = await db
    .select()
    .from(matchmakingQueue)
    .where(
      and(
        eq(matchmakingQueue.queueMode, '2v2'),
        eq(matchmakingQueue.status, 'searching'),
        ne(matchmakingQueue.coupleId, myEntry.coupleId)
      )
    );

  // Sort candidates by closest trophy count first (Trophy-Based 2v2 Matchmaking)
  const sortedCandidates = [...candidates].sort((a, b) => {
    const diffA = Math.abs((a.coupleTrophies || 0) - (myEntry.coupleTrophies || 0));
    const diffB = Math.abs((b.coupleTrophies || 0) - (myEntry.coupleTrophies || 0));
    return diffA - diffB;
  });

  for (const candidate of sortedCandidates) {
    if (candidate.gameId !== myEntry.gameId) continue;

    const candCreatedMs = candidate.createdAt
      ? new Date(candidate.createdAt).getTime()
      : Date.now();
    const candWaitSec = Math.max(0, Math.floor((Date.now() - candCreatedMs) / 1000));
    const candAllowedRange = 150 + Math.floor(candWaitSec / 10) * 100;
    const effectiveRange = Math.max(myAllowedRange, candAllowedRange);

    const trophyDiff = Math.abs(
      (candidate.coupleTrophies || 0) - (myEntry.coupleTrophies || 0)
    );
    if (trophyDiff > effectiveRange) {
      continue;
    }

    // Verify both partners of candidate couple are online and not in an active match
    const candCoupleCtx = await getCoupleContextForUser(candidate.requesterUid);
    if (!candCoupleCtx.activeCouple || candCoupleCtx.activeCouple.id !== candidate.coupleId) {
      continue;
    }
    const candReqOnline = Boolean(candCoupleCtx.activeCouple.requesterProfile?.isOnline);
    const candPartOnline = Boolean(candCoupleCtx.activeCouple.partnerProfile?.isOnline);
    if (!candReqOnline || !candPartOnline) {
      continue;
    }

    const candInMatch = await isCoupleCurrentlyInActiveMatch(
      candidate.requesterUid,
      candidate.partnerUid
    );
    if (candInMatch.inMatch) {
      continue;
    }

    let roomCode = generateRandomCode(6);
    for (let i = 0; i < 6; i++) {
      const existing = await db.select().from(rooms).where(eq(rooms.roomCode, roomCode));
      if (existing.length === 0) break;
      roomCode = generateRandomCode(6);
    }

    const team1Members = [
      {
        uid: candidate.requesterUid,
        username: candidate.requesterUsername,
        avatar: candidate.requesterAvatar,
      },
      {
        uid: candidate.partnerUid,
        username: candidate.partnerUsername,
        avatar: candidate.partnerAvatar,
      },
    ];

    const team2Members = [
      {
        uid: myEntry.requesterUid,
        username: myEntry.requesterUsername,
        avatar: myEntry.requesterAvatar,
      },
      {
        uid: myEntry.partnerUid,
        username: myEntry.partnerUsername,
        avatar: myEntry.partnerAvatar,
      },
    ];

    const players: RoomParticipantPayload[] = [
      ...team1Members.map((m) => ({
        ...m,
        coupleId: candidate.coupleId,
        coupleName: candidate.coupleName,
        teamSlot: 1 as const,
        ready: true,
        online: true,
      })),
      ...team2Members.map((m) => ({
        ...m,
        coupleId: myEntry.coupleId,
        coupleName: myEntry.coupleName,
        teamSlot: 2 as const,
        ready: true,
        online: true,
      })),
    ];

    const teams: RoomCoupleTeamPayload[] = [
      {
        teamSlot: 1,
        coupleId: candidate.coupleId,
        coupleName: candidate.coupleName,
        coupleTrophies: candidate.coupleTrophies || 0,
        score: 0,
        members: team1Members,
      },
      {
        teamSlot: 2,
        coupleId: myEntry.coupleId,
        coupleName: myEntry.coupleName,
        coupleTrophies: myEntry.coupleTrophies || 0,
        score: 0,
        members: team2Members,
      },
    ];

    const sessionSeed = generateFreshGameSeed();

    const systemChat = [
      {
        id: `mm-${Date.now()}`,
        sender: 'Matchmaking',
        text: `2v2 Trophy Match Found! Team 1 (${candidate.coupleName} · ${candidate.coupleTrophies || 0} Trophies) vs Team 2 (${myEntry.coupleName} · ${myEntry.coupleTrophies || 0} Trophies).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    await db.insert(rooms).values({
      roomCode,
      gameId: myEntry.gameId,
      mode: '2v2',
      maxPlayers: 4,
      hostUid: candidate.requesterUid,
      hostName: candidate.requesterUsername,
      status: 'playing',
      settingsJson: JSON.stringify({
        matchmaking: '2v2_couple_queue',
        format: 'Standard Match (Best of 3)',
        trophyDiff,
      }),
      playersJson: JSON.stringify(players),
      teamsJson: JSON.stringify(teams),
      gameStateJson: JSON.stringify({ sessionSeed, roundNumber: 1 }),
      chatJson: JSON.stringify(systemChat),
      voiceParticipantsJson: JSON.stringify([]),
    });

    const now = new Date();
    await db
      .update(matchmakingQueue)
      .set({
        status: 'match_found',
        matchedRoomCode: roomCode,
        opponentCoupleId: myEntry.coupleId,
        opponentCoupleName: `${myEntry.coupleName} (${myEntry.coupleTrophies || 0} 🏆)`,
        opponentProfilesJson: JSON.stringify(team2Members),
        updatedAt: now,
      })
      .where(eq(matchmakingQueue.id, candidate.id));

    const updatedMy = await db
      .update(matchmakingQueue)
      .set({
        status: 'match_found',
        matchedRoomCode: roomCode,
        opponentCoupleId: candidate.coupleId,
        opponentCoupleName: `${candidate.coupleName} (${candidate.coupleTrophies || 0} 🏆)`,
        opponentProfilesJson: JSON.stringify(team1Members),
        updatedAt: now,
      })
      .where(eq(matchmakingQueue.id, myEntry.id))
      .returning();

    return updatedMy[0];
  }

  return null;
}

export async function enqueueMatchmaking(input: {
  actorUid: string;
  queueMode: '1v1' | '2v2';
  gameId: string;
}) {
  try {
    if (input.queueMode !== '2v2') {
      throw new Error(
        'Automatic couple matchmaking is exclusive to 2v2 Couple Mode. For 1v1 matches, invite a player by username, create a 1v1 room, or join a 1v1 group.'
      );
    }

    const gameDef = MULTIPLAYER_GAMES.find((g) => g.id === input.gameId);
    if (!gameDef || !gameDef.supports2v2) {
      throw new Error(
        'Selected game is a 1v1 duel and does not support 2v2 Automatic Couple Matchmaking. Please choose a 2v2 Couple Mode game.'
      );
    }

    await updateUserPresenceHeartbeat({
      uid: input.actorUid,
      presenceStatus: 'in_queue',
    });

    await expireStaleMatchmakingEntries();

    const coupleCtx = await getCoupleContextForUser(input.actorUid);
    if (!coupleCtx.activeCouple || coupleCtx.activeCouple.status !== 'active') {
      throw new Error(
        'Only actively paired couples with two registered accounts can enter 2v2 automatic couple matchmaking.'
      );
    }

    const c = coupleCtx.activeCouple;
    const reqProfile = c.requesterProfile;
    const partProfile = c.partnerProfile;

    if (!reqProfile || !partProfile) {
      throw new Error(
        'Both partners must have registered individual accounts to enter multiplayer matchmaking.'
      );
    }

    const actorIsRequester = c.requesterUid === input.actorUid;
    const actorProfile = actorIsRequester ? reqProfile : partProfile;
    const otherPartnerProfile = actorIsRequester ? partProfile : reqProfile;

    if (!otherPartnerProfile.isOnline) {
      throw new Error(
        `Both partners must be online and available to enter ${input.queueMode.toUpperCase()} matchmaking. Your paired partner (${otherPartnerProfile.username}) is currently offline.`
      );
    }

    const activeMatchCheck = await isCoupleCurrentlyInActiveMatch(
      reqProfile.uid,
      partProfile.uid
    );
    if (activeMatchCheck.inMatch) {
      throw new Error(
        `Your couple is already playing an active match in Room #${activeMatchCheck.roomCode}. Finish or leave that match before entering matchmaking.`
      );
    }

    await db
      .update(matchmakingQueue)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(matchmakingQueue.coupleId, c.id),
          eq(matchmakingQueue.status, 'searching')
        )
      );

    const inserted = await db
      .insert(matchmakingQueue)
      .values({
        queueMode: input.queueMode,
        gameId: input.gameId,
        coupleId: c.id,
        coupleName: c.coupleName || `${reqProfile.username} & ${partProfile.username}`,
        coupleTrophies: c.coupleTrophies || 0,
        requesterUid: actorProfile.uid,
        requesterUsername: actorProfile.username,
        requesterAvatar: actorProfile.avatar,
        partnerUid: otherPartnerProfile.uid,
        partnerUsername: otherPartnerProfile.username,
        partnerAvatar: otherPartnerProfile.avatar,
        status: 'searching',
        heartbeatAt: new Date(),
      })
      .returning();

    const entry = inserted[0];

    await tryMatch2v2Couples(entry.id);

    return await getMatchmakingStateForUser(input.actorUid);
  } catch (error) {
    console.error('Database enqueueMatchmaking failed:', error);
    const msg =
      error instanceof Error ? error.message : 'Failed to enter matchmaking queue.';
    throw new Error(msg, { cause: error });
  }
}

export async function cancelMatchmaking(input: {
  actorUid: string;
  queueId?: number;
}) {
  try {
    const coupleCtx = await getCoupleContextForUser(input.actorUid);
    if (coupleCtx.activeCouple) {
      await db
        .update(matchmakingQueue)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(
          and(
            eq(matchmakingQueue.coupleId, coupleCtx.activeCouple.id),
            or(
              eq(matchmakingQueue.status, 'searching'),
              eq(matchmakingQueue.status, 'match_found')
            )
          )
        );
    }

    await updateUserPresenceHeartbeat({
      uid: input.actorUid,
      presenceStatus: 'online',
    });

    return await getMatchmakingStateForUser(input.actorUid);
  } catch (error) {
    console.error('Database cancelMatchmaking failed:', error);
    throw new Error('Failed to cancel matchmaking.', { cause: error });
  }
}

export async function acknowledgeMatchStarting(input: {
  actorUid: string;
  queueId: number;
}) {
  try {
    const rows = await db
      .select()
      .from(matchmakingQueue)
      .where(eq(matchmakingQueue.id, input.queueId));
    if (!rows.length) {
      throw new Error('Matchmaking entry not found.');
    }
    const updated = await db
      .update(matchmakingQueue)
      .set({ status: 'match_starting', updatedAt: new Date() })
      .where(eq(matchmakingQueue.id, input.queueId))
      .returning();

    if (updated[0]?.matchedRoomCode) {
      await updateUserPresenceHeartbeat({
        uid: input.actorUid,
        presenceStatus: 'in_match',
        activeRoomCode: updated[0].matchedRoomCode,
      });
    }

    return await getMatchmakingStateForUser(input.actorUid);
  } catch (error) {
    console.error('Database acknowledgeMatchStarting failed:', error);
    throw new Error('Failed to transition match status.', { cause: error });
  }
}

/* ============================================================================
   USERNAME-BASED 1V1 PLAYER INVITATIONS & 2V2 COUPLE INVITATIONS
   ============================================================================ */

export async function searchUsersAndCouplesForInvite(input: {
  actorUid: string;
  query: string;
  inviteType: '1v1' | '2v2';
}) {
  try {
    const cleanQuery = (input.query || '')
      .trim()
      .replace(/^@+/, '')
      .toLowerCase();

    const allUsers = await db.select().from(users).orderBy(desc(users.lastSeenAt));
    // Only include registered accounts that have completed unique arcade username setup
    const sanitizedUsers = allUsers
      .map(sanitizeUserRow)
      .filter((u) => u.usernameSetupCompleted && u.username.trim().length >= 3);
    const userMap = new Map(sanitizedUsers.map((u) => [u.uid, u]));

    const activeCouples = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.status, 'active'))
      .orderBy(desc(couplePairings.coupleTrophies));

    const coupleByUserUid = new Map<string, typeof couplePairings.$inferSelect>();
    for (const c of activeCouples) {
      coupleByUserUid.set(c.requesterUid, c);
      if (c.partnerUid) coupleByUserUid.set(c.partnerUid, c);
    }

    const actorCouple = coupleByUserUid.get(input.actorUid);
    const actorPartnerUid = actorCouple
      ? actorCouple.requesterUid === input.actorUid
        ? actorCouple.partnerUid
        : actorCouple.requesterUid
      : '';

    // Check pending invitations sent by this actor or actor's couple to prevent duplicates
    const pendingInvites = await db
      .select()
      .from(gameInvitations)
      .where(eq(gameInvitations.status, 'pending'));

    const pending1v1ByTargetUid = new Map<string, typeof gameInvitations.$inferSelect>();
    const pending2v2ByTargetCoupleId = new Map<number, typeof gameInvitations.$inferSelect>();
    for (const inv of pendingInvites) {
      if (inv.inviteType === '1v1' && inv.senderUid === input.actorUid) {
        pending1v1ByTargetUid.set(inv.targetUid, inv);
      }
      if (
        inv.inviteType === '2v2' &&
        (inv.senderUid === input.actorUid ||
          (actorCouple && inv.senderCoupleId === actorCouple.id))
      ) {
        pending2v2ByTargetCoupleId.set(inv.targetCoupleId, inv);
      }
    }

    const meUser = userMap.get(input.actorUid);
    const selfMatched = Boolean(
      cleanQuery &&
        meUser &&
        meUser.username.toLowerCase().includes(cleanQuery)
    );

    if (input.inviteType === '1v1') {
      const matchedPlayers = sanitizedUsers
        .filter((u) => {
          if (u.uid === input.actorUid) return false;
          if (!cleanQuery) return true;
          // Strictly search the user's unique arcade username (case-insensitive partial match), never email or Google display name
          return u.username.toLowerCase().includes(cleanQuery);
        })
        .sort((a, b) => {
          const aLower = a.username.toLowerCase();
          const bLower = b.username.toLowerCase();
          if (cleanQuery) {
            const aExact = aLower === cleanQuery ? 1 : 0;
            const bExact = bLower === cleanQuery ? 1 : 0;
            if (bExact !== aExact) return bExact - aExact;
            const aStarts = aLower.startsWith(cleanQuery) ? 1 : 0;
            const bStarts = bLower.startsWith(cleanQuery) ? 1 : 0;
            if (bStarts !== aStarts) return bStarts - aStarts;
          }
          const aPartner = a.uid === actorPartnerUid ? 1 : 0;
          const bPartner = b.uid === actorPartnerUid ? 1 : 0;
          if (bPartner !== aPartner) return bPartner - aPartner;
          const aOnline = a.isOnline ? 1 : 0;
          const bOnline = b.isOnline ? 1 : 0;
          if (bOnline !== aOnline) return bOnline - aOnline;
          return aLower.localeCompare(bLower);
        })
        .slice(0, 20)
        .map((u) => {
          const c = coupleByUserUid.get(u.uid);
          const pendingInv = pending1v1ByTargetUid.get(u.uid);
          return {
            uid: u.uid,
            username: u.username,
            avatar: u.avatar,
            equippedSkin: u.equippedSkin || 'skin-classic-notebook',
            level: u.level,
            isOnline: u.isOnline,
            presenceStatus: u.presenceStatus || (u.isOnline ? 'online' : 'offline'),
            isPairedPartner: u.uid === actorPartnerUid,
            hasActiveCouple: Boolean(c),
            coupleName: c?.coupleName || '',
            coupleTrophies: c?.coupleTrophies || 0,
            alreadyInvited: Boolean(pendingInv),
            pendingRoomCode: pendingInv?.roomCode || '',
          };
        });

      return {
        players: matchedPlayers,
        couples: [],
        selfMatchedUsername: selfMatched && meUser ? meUser.username : null,
      };
    }

    const matchedCouples = activeCouples
      .filter((c) => {
        if (actorCouple && c.id === actorCouple.id) return false;
        const pA = userMap.get(c.requesterUid);
        const pB = c.partnerUid ? userMap.get(c.partnerUid) : null;
        if (!pA || !pB) return false;
        if (!cleanQuery) return true;
        return (
          c.coupleName.toLowerCase().includes(cleanQuery) ||
          pA.username.toLowerCase().includes(cleanQuery) ||
          pB.username.toLowerCase().includes(cleanQuery)
        );
      })
      .slice(0, 20)
      .map((c) => {
        const pA = userMap.get(c.requesterUid)!;
        const pB = userMap.get(c.partnerUid)!;
        const pendingInv = pending2v2ByTargetCoupleId.get(c.id);
        return {
          coupleId: c.id,
          coupleName: c.coupleName || `${pA.username} & ${pB.username}`,
          coupleTitle: c.coupleTitle || 'Newborn Duo',
          equippedCoupleSkin: c.equippedCoupleSkin || 'skin-classic-notebook',
          coupleTrophies: c.coupleTrophies || 0,
          bothOnline: Boolean(pA.isOnline && pB.isOnline),
          alreadyInvited: Boolean(pendingInv),
          pendingRoomCode: pendingInv?.roomCode || '',
          partnerA: { uid: pA.uid, username: pA.username, avatar: pA.avatar, isOnline: pA.isOnline },
          partnerB: { uid: pB.uid, username: pB.username, avatar: pB.avatar, isOnline: pB.isOnline },
        };
      });

    return {
      players: [],
      couples: matchedCouples,
      selfMatchedUsername: selfMatched && meUser ? meUser.username : null,
    };
  } catch (error) {
    console.error('Database searchUsersAndCouplesForInvite failed:', error);
    throw new Error('Failed to search usernames.', { cause: error });
  }
}

export async function sendGameInvitationByUsername(input: {
  senderUid: string;
  inviteType: '1v1' | '2v2';
  targetUsername?: string;
  targetCoupleId?: number;
  gameId: string;
}) {
  try {
    const senderRows = await db.select().from(users).where(eq(users.uid, input.senderUid));
    if (!senderRows.length) {
      throw new Error('Sender account not found.');
    }
    const sender = sanitizeUserRow(senderRows[0]);
    const senderCoupleCtx = await getCoupleContextForUser(sender.uid);

    if (!senderCoupleCtx.activeCouple || senderCoupleCtx.activeCouple.status !== 'active') {
      throw new Error(
        `Couple pairing is mandatory before sending a ${input.inviteType.toUpperCase()} invitation. Pair with your partner first in Profile & Couple.`
      );
    }

    const senderCouple = senderCoupleCtx.activeCouple;

    if (input.inviteType === '1v1') {
      const cleanTargetName = (input.targetUsername || '')
        .trim()
        .replace(/^@+/, '')
        .toLowerCase();
      if (!cleanTargetName) {
        throw new Error('Please enter a player username to invite.');
      }

      const allUsers = await db.select().from(users);
      const targetRow = allUsers.find(
        (u) =>
          u.usernameSetupCompleted &&
          u.username.trim().toLowerCase() === cleanTargetName
      );
      if (!targetRow) {
        throw new Error(`No registered player found with username "@${input.targetUsername}".`);
      }
      if (targetRow.uid === sender.uid) {
        throw new Error('You cannot send a 1v1 invitation to yourself.');
      }

      const targetCoupleCtx = await getCoupleContextForUser(targetRow.uid);
      if (!targetCoupleCtx.activeCouple || targetCoupleCtx.activeCouple.status !== 'active') {
        throw new Error(
          `Player "@${targetRow.username}" does not have an active Couple Pairing yet. Both players in 1v1 must be paired with a partner.`
        );
      }

      // Prevent duplicate pending 1v1 invitations
      const existingPending = await db
        .select()
        .from(gameInvitations)
        .where(
          and(
            eq(gameInvitations.senderUid, sender.uid),
            eq(gameInvitations.targetUid, targetRow.uid),
            eq(gameInvitations.status, 'pending')
          )
        );
      if (existingPending.length > 0) {
        throw new Error(
          `You already have a pending 1v1 invitation sent to @${targetRow.username} (Room #${existingPending[0].roomCode}).`
        );
      }

      // Create a private 1v1 room with only the sender seated in Slot 1 so the invited target can accept & join Slot 2
      const room = await createValidatedMultiplayerRoom({
        hostUid: sender.uid,
        gameId: input.gameId,
        mode: '1v1',
        settings: { inviteMode: 'username_1v1', invitedUsername: targetRow.username },
        includePairedPartner: false,
      });

      const inserted = await db
        .insert(gameInvitations)
        .values({
          inviteType: '1v1',
          senderUid: sender.uid,
          senderUsername: sender.username,
          senderAvatar: sender.avatar,
          senderCoupleId: senderCouple.id,
          senderCoupleName: senderCouple.coupleName,
          targetUid: targetRow.uid,
          targetUsername: targetRow.username,
          targetCoupleId: targetCoupleCtx.activeCouple.id,
          targetCoupleName: targetCoupleCtx.activeCouple.coupleName,
          gameId: input.gameId,
          roomCode: room.roomCode,
          status: 'pending',
        })
        .returning();

      return { invitation: inserted[0], room };
    }

    // 2v2 Couple Invitation: find target couple by targetCoupleId or by partner username/couple name
    const activeCouples = await db
      .select()
      .from(couplePairings)
      .where(eq(couplePairings.status, 'active'));

    const allUsers = await db.select().from(users);
    const userByUid = new Map(allUsers.map((u) => [u.uid, u]));

    let targetCouple = input.targetCoupleId
      ? activeCouples.find((c) => c.id === input.targetCoupleId)
      : undefined;

    if (!targetCouple && input.targetUsername) {
      const q = input.targetUsername.trim().replace(/^@+/, '').toLowerCase();
      targetCouple = activeCouples.find((c) => {
        const pA = userByUid.get(c.requesterUid);
        const pB = userByUid.get(c.partnerUid);
        return (
          c.coupleName.trim().toLowerCase() === q ||
          pA?.username.trim().toLowerCase() === q ||
          pB?.username.trim().toLowerCase() === q
        );
      });
    }

    if (!targetCouple) {
      throw new Error('Target active couple not found. Search by couple name or partner username.');
    }
    if (targetCouple.id === senderCouple.id) {
      throw new Error('You cannot send a 2v2 couple challenge to your own couple.');
    }

    // Prevent duplicate pending 2v2 invitations between the same couples
    const existingPending2v2 = await db
      .select()
      .from(gameInvitations)
      .where(
        and(
          eq(gameInvitations.senderCoupleId, senderCouple.id),
          eq(gameInvitations.targetCoupleId, targetCouple.id),
          eq(gameInvitations.status, 'pending')
        )
      );
    if (existingPending2v2.length > 0) {
      throw new Error(
        `Your couple already has a pending 2v2 invitation sent to ${targetCouple.coupleName} (Room #${existingPending2v2[0].roomCode}).`
      );
    }

    const targetPartnerA = userByUid.get(targetCouple.requesterUid);
    const targetPartnerB = userByUid.get(targetCouple.partnerUid);
    if (!targetPartnerA || !targetPartnerB) {
      throw new Error('Target couple must have two registered accounts.');
    }

    // Create 2v2 room with Sender Couple seated on Team 1
    const room = await createValidatedMultiplayerRoom({
      hostUid: sender.uid,
      gameId: input.gameId,
      mode: '2v2',
      settings: {
        inviteMode: 'couple_2v2',
        invitedCoupleId: targetCouple.id,
        invitedCoupleName: targetCouple.coupleName,
      },
      includePairedPartner: true,
    });

    const inserted = await db
      .insert(gameInvitations)
      .values({
        inviteType: '2v2',
        senderUid: sender.uid,
        senderUsername: sender.username,
        senderAvatar: sender.avatar,
        senderCoupleId: senderCouple.id,
        senderCoupleName: senderCouple.coupleName,
        targetUid: targetPartnerA.uid,
        targetUsername: `${targetPartnerA.username} & ${targetPartnerB.username}`,
        targetCoupleId: targetCouple.id,
        targetCoupleName: targetCouple.coupleName,
        gameId: input.gameId,
        roomCode: room.roomCode,
        status: 'pending',
      })
      .returning();

    return { invitation: inserted[0], room };
  } catch (error) {
    console.error('Database sendGameInvitationByUsername failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send invitation.';
    throw new Error(msg, { cause: error });
  }
}

export async function respondToGameInvitation(input: {
  actorUid: string;
  invitationId: number;
  accept: boolean;
}) {
  try {
    const rows = await db
      .select()
      .from(gameInvitations)
      .where(eq(gameInvitations.id, input.invitationId));
    if (!rows.length) {
      throw new Error('Invitation not found.');
    }
    const inv = rows[0];
    if (inv.status !== 'pending') {
      throw new Error(`This invitation has already been ${inv.status}.`);
    }

    if (!input.accept) {
      const declined = await db
        .update(gameInvitations)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(eq(gameInvitations.id, inv.id))
        .returning();
      return { invitation: declined[0], room: null };
    }

    // Accept: join the actor (and their paired partner if 2v2) into the invitation room
    const joinedRoom = await joinValidatedMultiplayerRoom({
      actorUid: input.actorUid,
      roomCode: inv.roomCode,
      includePairedPartner: inv.inviteType === '2v2',
    });

    // Transition room to playing with a fresh synchronized sessionSeed
    const existingState = (() => {
      try {
        return JSON.parse(joinedRoom.gameStateJson || '{}');
      } catch {
        return {};
      }
    })();

    const playingRoomRows = await db
      .update(rooms)
      .set({
        status: 'playing',
        gameStateJson: JSON.stringify({
          ...existingState,
          sessionSeed: existingState.sessionSeed || generateFreshGameSeed(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(rooms.roomCode, inv.roomCode))
      .returning();

    const accepted = await db
      .update(gameInvitations)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(gameInvitations.id, inv.id))
      .returning();

    return {
      invitation: accepted[0],
      room: playingRoomRows[0] || joinedRoom,
    };
  } catch (error) {
    console.error('Database respondToGameInvitation failed:', error);
    const msg = error instanceof Error ? error.message : 'Failed to respond to invitation.';
    throw new Error(msg, { cause: error });
  }
}


