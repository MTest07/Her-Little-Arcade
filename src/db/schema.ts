import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  usernameSetupCompleted: boolean('username_setup_completed').notNull().default(true),
  renameCards: integer('rename_cards').notNull().default(0),
  shieldCards: integer('shield_cards').notNull().default(0),
  shieldCardArmed: boolean('shield_card_armed').notNull().default(false),
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
  equippedSkin: text('equipped_skin').notNull().default('skin-classic-notebook'),
  customPhotoUrl: text('custom_photo_url').notNull().default(''),
  equippedBanner: text('equipped_banner').notNull().default('banner-warm-sketchbook'),
  unlockedBannersJson: text('unlocked_banners_json')
    .notNull()
    .default('["banner-warm-sketchbook"]'),
  chestInventoryJson: text('chest_inventory_json')
    .notNull()
    .default('{"Common":0,"Uncommon":0,"Rare":0,"Epic":0,"Legendary":0}'),
  keyInventoryJson: text('key_inventory_json')
    .notNull()
    .default('{"Common":0,"Uncommon":0,"Rare":0,"Epic":0,"Legendary":0}'),
  favoriteGames: text('favorite_games').notNull().default('[]'),
  unlockedItems: text('unlocked_items').notNull().default('["avatar-kitsune","avatar-star-cat","theme-twilight-cocoa","pet-bell-collar","skin-classic-notebook"]'),
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
  equippedCoupleSkin: text('equipped_couple_skin').notNull().default('skin-classic-notebook'),
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
  visibility: text('visibility').notNull().default('public'), // 'public' | 'private'
  joinPolicy: text('join_policy').notNull().default('immediate'), // 'immediate' | 'approval_required'
  maxPlayers: integer('max_players').notNull().default(2),
  hostUid: text('host_uid').notNull(),
  hostName: text('host_name').notNull(),
  hostAvatar: text('host_avatar').notNull().default('kitsune'),
  status: text('status').notNull().default('lobby'), // 'lobby' | 'playing' | 'finished' | 'expired'
  settingsJson: text('settings_json').notNull().default('{}'),
  playersJson: text('players_json').notNull().default('[]'),
  teamsJson: text('teams_json').notNull().default('[]'),
  pendingRequestsJson: text('pending_requests_json').notNull().default('[]'),
  invitedUidsJson: text('invited_uids_json').notNull().default('[]'),
  gameStateJson: text('game_state_json').notNull().default('{}'),
  chatJson: text('chat_json').notNull().default('[]'),
  voiceParticipantsJson: text('voice_participants_json').notNull().default('[]'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const coupleTeamLobbies = pgTable('couple_team_lobbies', {
  id: serial('id').primaryKey(),
  coupleId: integer('couple_id').notNull().unique(),
  gameId: text('game_id').notNull().default('quiz-battle'),
  hostUid: text('host_uid').notNull(),
  partnerUid: text('partner_uid').notNull(),
  partnerInviteStatus: text('partner_invite_status').notNull().default('none'), // 'none' | 'pending' | 'accepted' | 'declined'
  hostReady: boolean('host_ready').notNull().default(false),
  partnerReady: boolean('partner_ready').notNull().default(false),
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
  periodType: text('period_type').notNull().default('daily'), // 'daily' | 'weekly' | 'monthly'
  periodKey: text('period_key').notNull().default(''),
  progress: integer('progress').notNull().default(0),
  target: integer('target').notNull().default(1),
  completed: integer('completed').notNull().default(0),
  claimed: integer('claimed').notNull().default(0),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  keyRewardTier: text('key_reward_tier').notNull().default('Common'),
  keyAwardedCount: integer('key_awarded_count').notNull().default(0),
  claimedAt: timestamp('claimed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const seasons = pgTable('seasons', {
  id: serial('id').primaryKey(),
  seasonNumber: integer('season_number').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('active'), // 'active' | 'completed'
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  bracketConfigJson: text('bracket_config_json').notNull().default('{}'),
  isTransitioning: boolean('is_transitioning').notNull().default(false),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const seasonStandings = pgTable('season_standings', {
  id: serial('id').primaryKey(),
  seasonId: integer('season_id').notNull(),
  seasonNumber: integer('season_number').notNull(),
  rank: integer('rank').notNull(),
  coupleId: integer('couple_id').notNull(),
  coupleName: text('couple_name').notNull(),
  requesterUid: text('requester_uid').notNull(),
  requesterUsername: text('requester_username').notNull(),
  partnerUid: text('partner_uid').notNull(),
  partnerUsername: text('partner_username').notNull(),
  finalTrophies: integer('final_trophies').notNull().default(0),
  coupleWins: integer('couple_wins').notNull().default(0),
  coupleLosses: integer('couple_losses').notNull().default(0),
  coupleDraws: integer('couple_draws').notNull().default(0),
  skinRewardId: text('skin_reward_id').notNull().default(''),
  skinRarity: text('skin_rarity').notNull().default(''),
  coinReward: integer('coin_reward').notNull().default(0),
  rewardKey: text('reward_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
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
  txType: text('tx_type').notNull(), // '2v2_match_reward' | 'shop_purchase' | 'rename_card_purchase' | 'seasonal_leaderboard_reward'
  referenceId: text('reference_id').notNull().default(''),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gameInvitations = pgTable('game_invitations', {
  id: serial('id').primaryKey(),
  inviteType: text('invite_type').notNull().default('1v1'), // '1v1' | '2v2' | '2v2_partner_team' | '2v2_room' | 'party' | 'room_invite' | 'couple_request' | 'other'
  senderUid: text('sender_uid').notNull(),
  senderUsername: text('sender_username').notNull(),
  senderAvatar: text('sender_avatar').notNull().default('kitsune'),
  senderEquippedSkin: text('sender_equipped_skin').notNull().default('skin-classic-notebook'),
  senderCustomPhotoUrl: text('sender_custom_photo_url').notNull().default(''),
  senderCoupleId: integer('sender_couple_id').notNull().default(0),
  senderCoupleName: text('sender_couple_name').notNull().default(''),
  targetUid: text('target_uid').notNull(),
  targetUsername: text('target_username').notNull(),
  targetCoupleId: integer('target_couple_id').notNull().default(0),
  targetCoupleName: text('target_couple_name').notNull().default(''),
  gameId: text('game_id').notNull().default('chess'),
  roomCode: text('room_code').notNull().default(''),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  isRead: boolean('is_read').notNull().default(false),
  isDismissed: boolean('is_dismissed').notNull().default(false),
  metadataJson: text('metadata_json').notNull().default('{}'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const coupleVoiceCalls = pgTable('couple_voice_calls', {
  id: serial('id').primaryKey(),
  callId: text('call_id').notNull().unique(),
  coupleId: integer('couple_id').notNull(),
  roomName: text('room_name').notNull(),
  callerUid: text('caller_uid').notNull(),
  callerUsername: text('caller_username').notNull(),
  callerAvatar: text('caller_avatar').notNull().default('kitsune'),
  calleeUid: text('callee_uid').notNull(),
  calleeUsername: text('callee_username').notNull(),
  calleeAvatar: text('callee_avatar').notNull().default('star-cat'),
  status: text('status').notNull().default('ringing'), // 'ringing' | 'connecting' | 'connected' | 'declined' | 'missed' | 'ended'
  signalingJson: text('signaling_json').notNull().default('{}'),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  connectedAt: timestamp('connected_at'),
  endedAt: timestamp('ended_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chestOpenings = pgTable('chest_openings', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  chestTier: text('chest_tier').notNull(), // 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  openMethod: text('open_method').notNull(), // 'coins' | 'key' | 'inventory'
  rewardCategory: text('reward_category').notNull(), // 'skin' | 'banner' | 'consumable'
  rewardId: text('reward_id').notNull(),
  rewardName: text('reward_name').notNull(),
  rewardRarity: text('reward_rarity').notNull(), // 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  wasDuplicate: boolean('was_duplicate').notNull().default(false),
  duplicateCoinsAwarded: integer('duplicate_coins_awarded').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const itemTransactions = pgTable('item_transactions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  txType: text('tx_type').notNull(), // 'direct_coin_purchase' | 'chest_reward' | 'duplicate_conversion' | 'shield_card_drop' | 'shield_card_armed' | 'shield_card_consumed' | 'challenge_key_reward'
  itemCategory: text('item_category').notNull(), // 'skin' | 'banner' | 'chest' | 'key' | 'consumable' | 'utility'
  itemId: text('item_id').notNull(),
  itemName: text('item_name').notNull(),
  rarity: text('rarity').notNull().default('Common'),
  quantityDelta: integer('quantity_delta').notNull().default(1),
  coinsDelta: integer('coins_delta').notNull().default(0),
  wasDuplicate: boolean('was_duplicate').notNull().default(false),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const xpTransactions = pgTable('xp_transactions', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  amount: integer('amount').notNull(),
  xpBefore: integer('xp_before').notNull().default(0),
  xpAfter: integer('xp_after').notNull().default(0),
  levelBefore: integer('level_before').notNull().default(1),
  levelAfter: integer('level_after').notNull().default(1),
  txType: text('tx_type').notNull(), // 'match_reward' | '2v2_loss_penalty' | '2v2_shield_protected' | 'challenge_reward' | 'party_match_reward'
  referenceId: text('reference_id').notNull().default(''),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const partyMatches = pgTable('party_matches', {
  id: serial('id').primaryKey(),
  roomCode: text('room_code').notNull(),
  gameId: text('game_id').notNull(),
  hostUid: text('host_uid').notNull(),
  totalCouples: integer('total_couples').notNull().default(3),
  totalPlayers: integer('total_players').notNull().default(6),
  winningCoupleId: integer('winning_couple_id').notNull().default(0),
  winningCoupleName: text('winning_couple_name').notNull().default(''),
  standingsJson: text('standings_json').notNull().default('[]'),
  durationSeconds: integer('duration_seconds').notNull().default(180),
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


