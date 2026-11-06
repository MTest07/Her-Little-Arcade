export type GameCategory = 'single' | 'competitive' | 'cooperative' | 'party';

export interface ArcadeGameDef {
  id: string;
  number: number;
  title: string;
  collection: 'single' | 'multiplayer';
  category: GameCategory;
  shortDesc: string;
  rulesSummary: string;
  controlsHint: string;
  xpReward: number;
  coinReward: number;
  supports2v2?: boolean;
  supportsPersonalization?: boolean;
  personalizationType?: 'memory_photo' | 'guess_picture' | 'quiz_question' | 'truth_or_dare';
  defaultDifficulty?: 'Easy' | 'Medium' | 'Hard';
  accentColor: string;
}

export const HERO_BANNER_IMAGE = '/src/assets/images/arcade_hero_banner_1793883798298.jpg';
export const VIRTUAL_PET_IMAGE = '/src/assets/images/virtual_pet_companion_1793883796994.jpg';
export const KEEPSAKE_PICNIC_IMAGE = '/src/assets/images/memory_couple_keepsake_1793883798624.jpg';
export const TREASURE_MAP_IMAGE = '/src/assets/images/treasure_island_map_1793883798202.jpg';

export const SINGLE_PLAYER_GAMES: ArcadeGameDef[] = [
  {
    id: 'virtual-pet',
    number: 1,
    title: 'Virtual Pet',
    collection: 'single',
    category: 'single',
    shortDesc: 'Adopt, feed, play with, and customize a virtual pet.',
    rulesSummary: 'Keep Mochi nourished, joyful, and rested. Earn affection XP to evolve stages and equip collar keepsakes.',
    controlsHint: 'Click Care Actions · 1 Feed · 2 Play · 3 Rest · Esc Pause',
    xpReward: 15,
    coinReward: 0,
    defaultDifficulty: 'Easy',
    accentColor: '#F4A261',
  },
  {
    id: 'memory-match',
    number: 2,
    title: 'Memory Match',
    collection: 'single',
    category: 'single',
    shortDesc: 'Flip cards and match pairs. Support personalized photos.',
    rulesSummary: 'Reveal two keepsake cards per turn. Match all pairs in the fewest moves using classic icons or your shared photo album.',
    controlsHint: 'Click Cards to Flip · Space Restart · Esc Pause',
    xpReward: 18,
    coinReward: 0,
    supportsPersonalization: true,
    personalizationType: 'memory_photo',
    defaultDifficulty: 'Medium',
    accentColor: '#E76F51',
  },
  {
    id: 'bubble-shooter',
    number: 3,
    title: 'Bubble Shooter',
    collection: 'single',
    category: 'single',
    shortDesc: 'Match colored bubbles and clear the board.',
    rulesSummary: 'Aim the launcher and pop clusters of 3 or more matching pastel bubbles before the ceiling drops.',
    controlsHint: 'Mouse Aim & Click to Launch · Left/Right Aim · Space Fire',
    xpReward: 20,
    coinReward: 0,
    defaultDifficulty: 'Medium',
    accentColor: '#2A9D8F',
  },
  {
    id: '2048-puzzle',
    number: 4,
    title: '2048 Puzzle',
    collection: 'single',
    category: 'single',
    shortDesc: 'Combine matching numbers to reach 2048.',
    rulesSummary: 'Slide numbered tiles across the 4x4 grid. Matching numbers merge into their sum until you craft the 2048 tile.',
    controlsHint: 'WASD or Arrow Keys Slide · R New Board · Esc Pause',
    xpReward: 22,
    coinReward: 0,
    defaultDifficulty: 'Medium',
    accentColor: '#E9C46A',
  },
  {
    id: 'guess-the-picture',
    number: 5,
    title: 'Guess the Picture',
    collection: 'single',
    category: 'single',
    shortDesc: 'Reveal parts of an image and guess what it represents.',
    rulesSummary: 'Uncover shutter tiles one by one and identify the hidden illustration as early as possible for maximum bonus points.',
    controlsHint: 'Click Tiles to Reveal · Select Answer Choice · Esc Pause',
    xpReward: 18,
    coinReward: 0,
    supportsPersonalization: true,
    personalizationType: 'guess_picture',
    defaultDifficulty: 'Easy',
    accentColor: '#F4A261',
  },
  {
    id: 'endless-runner',
    number: 6,
    title: 'Endless Runner',
    collection: 'single',
    category: 'single',
    shortDesc: 'Avoid obstacles, collect coins, and beat high scores.',
    rulesSummary: 'Sprint across twilight rooftops, leap over lantern hurdles, and gather starlight tokens as speed ramps up.',
    controlsHint: 'Space / W / Up Arrow Jump · Hold for Higher Arc · Esc Pause',
    xpReward: 20,
    coinReward: 0,
    defaultDifficulty: 'Medium',
    accentColor: '#2A9D8F',
  },
  {
    id: 'sudoku-daily',
    number: 7,
    title: 'Sudoku & Daily Puzzles',
    collection: 'single',
    category: 'single',
    shortDesc: 'Sudoku with rotating daily challenges.',
    rulesSummary: 'Fill every row, column, and box without repeating numerals. Complete the rotating daily grid for streak multipliers.',
    controlsHint: 'Click Cell · 1-9 Enter Number · H Hint · Esc Pause',
    xpReward: 25,
    coinReward: 0,
    defaultDifficulty: 'Medium',
    accentColor: '#E76F51',
  },
];

export const MULTIPLAYER_GAMES: ArcadeGameDef[] = [
  {
    id: 'tic-tac-toe',
    number: 1,
    title: 'Tic-Tac-Toe',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Classic two-player game.',
    rulesSummary: 'Take turns placing Sun (X) and Moon (O) emblems on the 3x3 grid. Align three in a row horizontally, vertically, or diagonally.',
    controlsHint: 'Click Square to Place Mark · R Rematch · Esc Pause',
    xpReward: 20,
    coinReward: 0,
    supports2v2: false,
    accentColor: '#F4A261',
  },
  {
    id: 'connect-four',
    number: 2,
    title: 'Connect Four',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Connect four pieces in a row.',
    rulesSummary: 'Drop coral and teal discs into the 7-column vertical frame. First player to link 4 discs in any direction wins.',
    controlsHint: 'Click Column or Press 1-7 to Drop Disc · Esc Pause',
    xpReward: 22,
    coinReward: 0,
    supports2v2: false,
    accentColor: '#E76F51',
  },
  {
    id: 'battleship',
    number: 3,
    title: 'Battleship',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: "Strategically locate the opponent's ships.",
    rulesSummary: 'Call coordinates on the radar grid to uncover and sink all 5 hidden fleet vessels before your fleet is found.',
    controlsHint: 'Click Radar Coordinate to Fire · R Rotate/Reset · Esc Pause',
    xpReward: 28,
    coinReward: 0,
    supports2v2: false,
    accentColor: '#2A9D8F',
  },
  {
    id: 'chess',
    number: 4,
    title: 'Chess',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Real-time chess with configurable time controls.',
    rulesSummary: 'Full FIDE chess rules with Bullet, Blitz, Rapid, Casual, and custom increment clocks, legal move highlights, and captured piece tray.',
    controlsHint: 'Click Piece then Target Square · Resign / Draw / Rematch in Dock',
    xpReward: 30,
    coinReward: 0,
    supports2v2: false,
    accentColor: '#E9C46A',
  },
  {
    id: 'draw-and-guess',
    number: 5,
    title: 'Draw & Guess',
    collection: 'multiplayer',
    category: 'party',
    shortDesc: 'One player draws while others guess.',
    rulesSummary: 'Sketch the secret prompt on the shared canvas using brush colors while your partner or rival couple races the clock to guess the word.',
    controlsHint: 'Mouse Drag to Sketch · Type Guess Below · Clear Canvas',
    xpReward: 35,
    coinReward: 25,
    supports2v2: true,
    accentColor: '#F4A261',
  },
  {
    id: 'quiz-battle',
    number: 6,
    title: 'Quiz Battle',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Answer timed questions across different categories.',
    rulesSummary: 'Compete head-to-head in 1v1 or 2v2 Couple Mode across trivia and your own personalized couple memory questions.',
    controlsHint: 'Click Option 1-4 · Next Round · Esc Pause',
    xpReward: 35,
    coinReward: 25,
    supports2v2: true,
    supportsPersonalization: true,
    personalizationType: 'quiz_question',
    accentColor: '#E76F51',
  },
  {
    id: 'word-battle',
    number: 7,
    title: 'Word Battle',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Compete using vocabulary and word challenges.',
    rulesSummary: 'Forge high-scoring words from the 7-letter crystal rack that include the center anchor letter before time runs out.',
    controlsHint: 'Click Letters or Type Word · Enter Submit · Backspace Clear',
    xpReward: 38,
    coinReward: 25,
    supports2v2: true,
    accentColor: '#2A9D8F',
  },
  {
    id: 'reaction-race',
    number: 8,
    title: 'Reaction Race',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Test reaction speed through quick challenges.',
    rulesSummary: 'Wait for the signal lantern to flash emerald, then strike as fast as humanly possible across 5 sprint rounds.',
    controlsHint: 'Click Arena or Press Space When Signal Turns Green',
    xpReward: 30,
    coinReward: 20,
    supports2v2: true,
    accentColor: '#E9C46A',
  },
  {
    id: 'truth-or-dare',
    number: 9,
    title: 'Truth or Dare',
    collection: 'multiplayer',
    category: 'party',
    shortDesc: 'Play using customizable question and challenge decks.',
    rulesSummary: 'Draw from Cozy Late Night, Playful Spark, or your custom shared prompts for heartfelt truths and hilarious dares.',
    controlsHint: 'Choose Truth or Dare · Complete Prompt · Next Turn',
    xpReward: 30,
    coinReward: 20,
    supports2v2: true,
    supportsPersonalization: true,
    personalizationType: 'truth_or_dare',
    accentColor: '#E76F51',
  },
  {
    id: 'higher-or-lower',
    number: 10,
    title: 'Higher or Lower',
    collection: 'multiplayer',
    category: 'competitive',
    shortDesc: 'Predict whether the next value will be higher or lower.',
    rulesSummary: 'Build a prediction streak by calling whether the next drawn tarot/number card is strictly higher or lower than the current card.',
    controlsHint: 'Up Arrow / Click Higher · Down Arrow / Click Lower',
    xpReward: 32,
    coinReward: 22,
    supports2v2: true,
    accentColor: '#F4A261',
  },
  {
    id: 'escape-the-maze',
    number: 11,
    title: 'Escape the Maze',
    collection: 'multiplayer',
    category: 'cooperative',
    shortDesc: 'Work together to solve and escape a maze.',
    rulesSummary: 'Coordinate Explorers to step on pressure plates, unlock ancient gates, and reach the sanctuary exit portal together.',
    controlsHint: 'WASD / Arrows Move Explorer · Tab Switch Partner · Esc Pause',
    xpReward: 42,
    coinReward: 28,
    supports2v2: true,
    accentColor: '#2A9D8F',
  },
  {
    id: 'cooking-together',
    number: 12,
    title: 'Cooking Together',
    collection: 'multiplayer',
    category: 'cooperative',
    shortDesc: 'Complete cooking challenges as a team.',
    rulesSummary: 'Prep ingredients in exact recipe order and serve steaming orders from your cozy bistro counter before guests lose patience.',
    controlsHint: 'Click Ingredients to Assemble · Serve Dish Button · Clear Plate',
    xpReward: 42,
    coinReward: 28,
    supports2v2: true,
    accentColor: '#E76F51',
  },
  {
    id: 'jigsaw-puzzle',
    number: 13,
    title: 'Jigsaw Puzzle Together',
    collection: 'multiplayer',
    category: 'cooperative',
    shortDesc: 'Solve image-based puzzles together.',
    rulesSummary: 'Swap and lock illustrated keepsake tiles into their true coordinates on the shared framing board.',
    controlsHint: 'Click First Tile then Second Tile to Swap · Esc Pause',
    xpReward: 38,
    coinReward: 25,
    supports2v2: true,
    accentColor: '#E9C46A',
  },
  {
    id: 'treasure-hunt',
    number: 14,
    title: 'Treasure Hunt',
    collection: 'multiplayer',
    category: 'cooperative',
    shortDesc: 'Discover clues and solve puzzles to find hidden treasure.',
    rulesSummary: 'Follow compass distance triangulation clues across the enchanted archipelago to unearth the 3 sunken relics.',
    controlsHint: 'Click Map Sector to Excavate · Read Compass Clue · Esc Pause',
    xpReward: 40,
    coinReward: 28,
    supports2v2: true,
    accentColor: '#F4A261',
  },
];

export const MULTIPLAYER_1V1_EXCLUSIVE_GAMES: ArcadeGameDef[] = MULTIPLAYER_GAMES.filter(
  (g) => !g.supports2v2
);

export const MULTIPLAYER_2V2_COUPLE_GAMES: ArcadeGameDef[] = MULTIPLAYER_GAMES.filter(
  (g) => Boolean(g.supports2v2)
);

export const MULTIPLAYER_1V1_GAMES: ArcadeGameDef[] = [...MULTIPLAYER_GAMES];

export const ALL_ARCADE_GAMES: ArcadeGameDef[] = [
  ...SINGLE_PLAYER_GAMES,
  ...MULTIPLAYER_GAMES,
];

export interface ChessTimePreset {
  id: string;
  label: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Casual' | 'Custom';
  minutes: number;
  extraSeconds: number;
  incrementSeconds: number;
}

export const CHESS_TIME_PRESETS: ChessTimePreset[] = [
  { id: '1+0', label: '1 min · Bullet', category: 'Bullet', minutes: 1, extraSeconds: 0, incrementSeconds: 0 },
  { id: '3+0', label: '3 min · Blitz', category: 'Blitz', minutes: 3, extraSeconds: 0, incrementSeconds: 0 },
  { id: '5+0', label: '5 min · Blitz', category: 'Blitz', minutes: 5, extraSeconds: 0, incrementSeconds: 0 },
  { id: '10+0', label: '10 min · Rapid', category: 'Rapid', minutes: 10, extraSeconds: 0, incrementSeconds: 0 },
  { id: 'unlimited', label: 'Unlimited · Casual', category: 'Casual', minutes: 0, extraSeconds: 0, incrementSeconds: 0 },
];

export interface RewardShopItem {
  id: string;
  name: string;
  category: 'utility' | 'avatar' | 'pet' | 'decoration' | 'theme';
  costCoins: number;
  description: string;
  previewCode: string;
  consumable?: boolean;
}

export const RENAME_CARD_COST_COINS = 10000;

export const REWARD_SHOP_ITEMS: RewardShopItem[] = [
  {
    id: 'rename-card',
    name: 'Official Rename Card',
    category: 'utility',
    costCoins: RENAME_CARD_COST_COINS,
    description: 'Single-use notarized pass allowing you to change your unique arcade username once. Consumed only after availability is verified.',
    previewCode: 'rename-card',
    consumable: true,
  },
  { id: 'avatar-kitsune', name: 'Kitsune Fox Avatar', category: 'avatar', costCoins: 0, description: 'Warm cream kitsune spirit portrait.', previewCode: 'kitsune' },
  { id: 'avatar-star-cat', name: 'Astral Cat Avatar', category: 'avatar', costCoins: 0, description: 'Constellation-gazing midnight kitten.', previewCode: 'star-cat' },
  { id: 'avatar-bunny', name: 'Matcha Bunny Avatar', category: 'avatar', costCoins: 120, description: 'Soft lop-eared bunny with clover leaf.', previewCode: 'bunny' },
  { id: 'avatar-otter', name: 'River Otter Avatar', category: 'avatar', costCoins: 150, description: 'Playful sea otter holding a glowing shell.', previewCode: 'otter' },
  { id: 'pet-bell-collar', name: 'Golden Bell Collar', category: 'pet', costCoins: 0, description: 'Chimes softly whenever Mochi plays.', previewCode: 'bell-collar' },
  { id: 'pet-star-crown', name: 'Celestial Star Crown', category: 'pet', costCoins: 140, description: 'A tiny floating diadem of twilight stars.', previewCode: 'star-crown' },
  { id: 'pet-cozy-scarf', name: 'Knitted Berry Scarf', category: 'pet', costCoins: 110, description: 'Hand-knitted woolen scarf for chilly evenings.', previewCode: 'cozy-scarf' },
  { id: 'deco-lantern-frame', name: 'Paper Lantern Frame', category: 'decoration', costCoins: 160, description: 'Warm festival lantern border for your profile.', previewCode: 'lantern-frame' },
  { id: 'deco-starlight-halo', name: 'Constellation Crest', category: 'decoration', costCoins: 200, description: 'Golden astrolabe emblem around your avatar.', previewCode: 'starlight-halo' },
  { id: 'theme-twilight-cocoa', name: 'Twilight Cocoa Theme', category: 'theme', costCoins: 0, description: 'Deep dusk slate with warm amber & peach glow.', previewCode: 'twilight-cocoa' },
  { id: 'theme-strawberry-milk', name: 'Rosewood Parlor Theme', category: 'theme', costCoins: 180, description: 'Cozy rosewood mahogany with soft coral highlights.', previewCode: 'strawberry-milk' },
  { id: 'theme-matcha-garden', name: 'Matcha Conservatory Theme', category: 'theme', costCoins: 180, description: 'Botanical forest felt with warm botanical gold.', previewCode: 'matcha-garden' },
];

export interface TrophyRoadMilestone {
  id: string;
  tier: number;
  trophiesRequired: number;
  title: string;
  rewardName: string;
  rewardType: 'badge' | 'title' | 'banner' | 'avatar' | 'decoration' | 'theme';
  rewardCode: string;
  description: string;
  accentColor: string;
}

export const TROPHY_ROAD_MILESTONES: TrophyRoadMilestone[] = [
  {
    id: 'milestone-100',
    tier: 1,
    trophiesRequired: 100,
    title: 'Paper Plane Duo',
    rewardName: 'Origami Heart Couple Badge & Title',
    rewardType: 'title',
    rewardCode: 'Paper Plane Duo',
    description: 'Awarded to couples reaching 100 shared 2v2 Trophies. Unlocks the "Paper Plane Duo" title and Origami Heart badge.',
    accentColor: '#3B82F6',
  },
  {
    id: 'milestone-250',
    tier: 2,
    trophiesRequired: 250,
    title: 'Sketchbook Sweethearts',
    rewardName: 'Golden Compass Couple Banner',
    rewardType: 'banner',
    rewardCode: 'compass-rose-banner',
    description: 'Unlocks the hand-inked Golden Compass Banner for your shared Couple Profile header.',
    accentColor: '#10B981',
  },
  {
    id: 'milestone-500',
    tier: 3,
    trophiesRequired: 500,
    title: 'Lantern Festival Pair',
    rewardName: 'Twin Swan Avatar Emblem',
    rewardType: 'avatar',
    rewardCode: 'twin-swans',
    description: 'Reach 500 Couple Trophies in 2v2 matches to unlock the exclusive Twin Swan couple portrait emblem.',
    accentColor: '#F59E0B',
  },
  {
    id: 'milestone-1000',
    tier: 4,
    trophiesRequired: 1000,
    title: 'Starlight Tacticians',
    rewardName: 'Celestial Dual-Crown Frame',
    rewardType: 'decoration',
    rewardCode: 'celestial-dual-crown',
    description: '1,000 Couple Trophies milestone. Emblazons your Couple Profile and 2v2 matchmaking banner with a gilded crown.',
    accentColor: '#EC4899',
  },
  {
    id: 'milestone-1500',
    tier: 5,
    trophiesRequired: 1500,
    title: 'Archipelago Voyagers',
    rewardName: 'Velvet Observatory Theme',
    rewardType: 'theme',
    rewardCode: 'velvet-observatory',
    description: 'Unlocks the Velvet Observatory couple room theme and "Archipelago Voyagers" title.',
    accentColor: '#8B5CF6',
  },
  {
    id: 'milestone-2000',
    tier: 6,
    trophiesRequired: 2000,
    title: 'Grandmaster Soulmates',
    rewardName: 'Astral Phoenix Couple Crest',
    rewardType: 'badge',
    rewardCode: 'astral-phoenix-crest',
    description: '2,000 Couple Trophies milestone. Unlocks the radiant Astral Phoenix Crest on the Couple Leaderboard.',
    accentColor: '#E11D48',
  },
  {
    id: 'milestone-3000',
    tier: 7,
    trophiesRequired: 3000,
    title: 'Eternal Arcade Legends',
    rewardName: 'Sovereign Keepsake Halo & Title',
    rewardType: 'title',
    rewardCode: 'Eternal Arcade Legends',
    description: 'Pinnacle of the Couple Trophy Road. Marks your partnership as Eternal Arcade Legends across all 2v2 arenas.',
    accentColor: '#D97706',
  },
];

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
  coinBonus: number;
  conditionType: 'games_played' | 'chess_win' | 'score_2048' | 'custom_content' | 'voice_joined' | 'coop_win' | 'couple_paired';
  target: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-arcade-step', title: 'First Token Dropped', description: 'Complete your first game in Her Little Arcade.', xpBonus: 25, coinBonus: 0, conditionType: 'games_played', target: 1 },
  { id: 'partner-bound', title: 'Paired in Starlight', description: 'Confirm an active Couple Account Pairing with your partner.', xpBonus: 45, coinBonus: 0, conditionType: 'couple_paired', target: 1 },
  { id: 'clockwork-tactician', title: 'Clockwork Tactician', description: 'Play or win a Chess match with custom or preset time controls.', xpBonus: 35, coinBonus: 0, conditionType: 'chess_win', target: 1 },
  { id: 'memory-architect', title: 'Keepsake Curator', description: 'Add a personalized photo, question, or prompt to the arcade.', xpBonus: 30, coinBonus: 0, conditionType: 'custom_content', target: 1 },
  { id: 'duo-harmony', title: 'Better Together', description: 'Complete a cooperative or 2v2 Couple multiplayer match.', xpBonus: 40, coinBonus: 0, conditionType: 'coop_win', target: 1 },
  { id: 'puzzle-virtuoso', title: 'Number Alchemist', description: 'Reach a high score of 500+ in 2048 Puzzle or Sudoku.', xpBonus: 35, coinBonus: 0, conditionType: 'score_2048', target: 500 },
  { id: 'cozy-wavelength', title: 'On the Same Wavelength', description: 'Connect to optional Voice Chat in a multiplayer room.', xpBonus: 25, coinBonus: 0, conditionType: 'voice_joined', target: 1 },
];

export interface DailyChallengeTemplate {
  key: string;
  title: string;
  gameId: string;
  description: string;
  target: number;
  xpReward: number;
  coinReward: number;
}

export const DAILY_CHALLENGE_TEMPLATES: DailyChallengeTemplate[] = [
  {
    key: 'daily-chess-blitz',
    title: 'Twilight Chess Duel',
    gameId: 'chess',
    description: 'Play 1 match of Chess (any preset or custom increment time control).',
    target: 1,
    xpReward: 30,
    coinReward: 0,
  },
  {
    key: 'daily-pet-care',
    title: 'Mochi Morning Routine',
    gameId: 'virtual-pet',
    description: 'Feed, play with, or rest your Virtual Pet 3 times.',
    target: 3,
    xpReward: 20,
    coinReward: 0,
  },
  {
    key: 'daily-memory-match',
    title: 'Shared Keepsake Flip',
    gameId: 'memory-match',
    description: 'Clear a board in Memory Match or 2048 Puzzle.',
    target: 1,
    xpReward: 25,
    coinReward: 0,
  },
  {
    key: 'daily-coop-team',
    title: 'Co-Op Kitchen & Maze',
    gameId: 'cooking-together',
    description: 'Complete 1 round of Cooking Together, Escape the Maze, or Treasure Hunt.',
    target: 1,
    xpReward: 35,
    coinReward: 0,
  },
];

