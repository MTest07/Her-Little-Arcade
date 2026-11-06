import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  usernameSetupCompleted: boolean('username_setup_completed').notNull().default(true),
  renameCards: integer('rename_cards').notNull().default(0),
  passwordHash: text('password_hash').notNull().default(''),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationCode: text('verification_code').notNull().default(''),
  resetToken: text('reset_token').notNull().default(''),
  avatar: text('avatar').notNull().default('kitsune'),
  xp: integer('xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  coins: integer('coins').notNull().default(0),
  streak: integer('streak').notNull().default(1),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  theme: text('theme').notNull().default('twilight-cocoa'),
  favoriteGames: text('favorite_games').notNull().default('[]'),
  unlockedItems: text('unlocked_items').notNull().default('["avatar-kitsune","avatar-star-cat","theme-twilight-cocoa","pet-bell-collar"]'),
  petState: text('pet_state').notNull().default('{"name":"Mochi","hunger":85,"happiness":90,"energy":90,"accessory":"bell-collar","stage":1}'),
  presenceStatus: text('presence_status').notNull().default('online'), // 'online' | 'in_queue' | 'in_match' | 'offline'
  activeRoomCode: text('active_room_code').notNull().default(''),
  lastSeenAt: timestamp('last_seen_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const couplePairings = pgTable('couple_pairings', {
  id: serial('id').primaryKey(),
  pairingCode: text('pairing_code').notNull().unique(),
  requesterUid: text('requester_uid').notNull(),
  partnerUid: text('partner_uid').notNull().default(''),
  requesterConfirmed: boolean('requester_confirmed').notNull().default(true),
  partnerConfirmed: boolean('partner_confirmed').notNull().default(false),
  status: text('status').notNull().default('pending_partner'), // 'pending_partner' | 'pending_requester_confirm' | 'active' | 'unpaired'
  coupleName: text('couple_name').notNull().default(''),
  anniversaryDate: text('anniversary_date').notNull().default(''),
  coupleBio: text('couple_bio').notNull().default(''),
  coupleBanner: text('couple_banner').notNull().default('twilight-lanterns'),
  coupleTitle: text('couple_title').notNull().default('Newborn Duo'),
  coupleTrophies: integer('couple_trophies').notNull().default(0),
  highestTrophies: integer('highest_trophies').notNull().default(0),
  claimedTrophyMilestones: text('claimed_trophy_milestones').notNull().default('[]'),
  coupleXp: integer('couple_xp').notNull().default(0),
  coupleLevel: integer('couple_level').notNull().default(1),
  coupleWins: integer('couple_wins').notNull().default(0),
  coupleLosses: integer('couple_losses').notNull().default(0),
  coupleDraws: integer('couple_draws').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gameRecords = pgTable('game_records', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  username: text('username').notNull(),
  coupleId: integer('couple_id').notNull().default(0),
  opponentLabel: text('opponent_label').notNull().default(''),
  gameId: text('game_id').notNull(),
  mode: text('mode').notNull(), // 'single' | '1v1' | '2v2' | 'coop'
  result: text('result').notNull(), // 'win' | 'loss' | 'draw' | 'completed'
  score: integer('score').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(20),
  coinsEarned: integer('coins_earned').notNull().default(0),
  trophiesDelta: integer('trophies_delta').notNull().default(0),
  matchKey: text('match_key').notNull().default(''),
  durationSeconds: integer('duration_seconds').notNull().default(60),
  details: text('details').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  roomCode: text('room_code').notNull().unique(),
  gameId: text('game_id').notNull(),
  mode: text('mode').notNull().default('1v1'), // '1v1' | '2v2'
  maxPlayers: integer('max_players').notNull().default(2),
  hostUid: text('host_uid').notNull(),
  hostName: text('host_name').notNull(),
  status: text('status').notNull().default('lobby'), // 'lobby' | 'playing' | 'finished' | 'expired'
  settingsJson: text('settings_json').notNull().default('{}'),
  playersJson: text('players_json').notNull().default('[]'),
  teamsJson: text('teams_json').notNull().default('[]'),
  gameStateJson: text('game_state_json').notNull().default('{}'),
  chatJson: text('chat_json').notNull().default('[]'),
  voiceParticipantsJson: text('voice_participants_json').notNull().default('[]'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const personalizedContent = pgTable('personalized_content', {
  id: serial('id').primaryKey(),
  creatorUid: text('creator_uid').notNull(),
  coupleId: integer('couple_id').notNull().default(0),
  category: text('category').notNull(),
  title: text('title').notNull(),
  payloadJson: text('payload_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dailyChallenges = pgTable('daily_challenges', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  challengeKey: text('challenge_key').notNull(),
  progress: integer('progress').notNull().default(0),
  target: integer('target').notNull().default(1),
  completed: integer('completed').notNull().default(0),
  claimed: integer('claimed').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const matchmakingQueue = pgTable('matchmaking_queue', {
  id: serial('id').primaryKey(),
  queueMode: text('queue_mode').notNull().default('2v2'), // '1v1' | '2v2'
  gameId: text('game_id').notNull().default('quiz-battle'),
  coupleId: integer('couple_id').notNull(),
  coupleName: text('couple_name').notNull().default(''),
  coupleTrophies: integer('couple_trophies').notNull().default(0),
  requesterUid: text('requester_uid').notNull(),
  requesterUsername: text('requester_username').notNull(),
  requesterAvatar: text('requester_avatar').notNull().default('kitsune'),
  partnerUid: text('partner_uid').notNull(),
  partnerUsername: text('partner_username').notNull(),
  partnerAvatar: text('partner_avatar').notNull().default('star-cat'),
  status: text('status').notNull().default('searching'), // 'searching' | 'match_found' | 'match_starting' | 'cancelled' | 'expired'
  matchedRoomCode: text('matched_room_code').notNull().default(''),
  opponentCoupleId: integer('opponent_couple_id').notNull().default(0),
  opponentCoupleName: text('opponent_couple_name').notNull().default(''),
  opponentProfilesJson: text('opponent_profiles_json').notNull().default('[]'),
  heartbeatAt: timestamp('heartbeat_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const coinTransactions = pgTable('coin_transactions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  coupleId: integer('couple_id').notNull().default(0),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  txType: text('tx_type').notNull(), // '2v2_match_reward' | 'shop_purchase' | 'rename_card_purchase'
  referenceId: text('reference_id').notNull().default(''),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gameInvitations = pgTable('game_invitations', {
  id: serial('id').primaryKey(),
  inviteType: text('invite_type').notNull().default('1v1'), // '1v1' | '2v2'
  senderUid: text('sender_uid').notNull(),
  senderUsername: text('sender_username').notNull(),
  senderAvatar: text('sender_avatar').notNull().default('kitsune'),
  senderCoupleId: integer('sender_couple_id').notNull().default(0),
  senderCoupleName: text('sender_couple_name').notNull().default(''),
  targetUid: text('target_uid').notNull(),
  targetUsername: text('target_username').notNull(),
  targetCoupleId: integer('target_couple_id').notNull().default(0),
  targetCoupleName: text('target_couple_name').notNull().default(''),
  gameId: text('game_id').notNull().default('chess'),
  roomCode: text('room_code').notNull().default(''),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'declined' | 'expired'
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  gameRecords: many(gameRecords),
}));

export const gameRecordsRelations = relations(gameRecords, ({ one }) => ({
  player: one(users, {
    fields: [gameRecords.userUid],
    references: [users.uid],
  }),
}));


