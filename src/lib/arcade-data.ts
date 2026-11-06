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

export type SkinRarity = 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';

export const SKIN_RARITY_ORDER: SkinRarity[] = [
  'Legendary',
  'Epic',
  'Rare',
  'Uncommon',
  'Common',
];

export const SKIN_RARITY_META: Record<
  SkinRarity,
  {
    rank: number;
    label: string;
    tierNote: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    badgeClass: string;
    borderClass: string;
    rankOrder: number;
    accentHex: string;
  }
> = {
  Legendary: {
    rank: 1,
    rankOrder: 1,
    label: 'Legendary',
    tierNote: 'Highest Rarity · Tier I',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-400/70',
    badgeClass: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
    borderClass: 'border-amber-400/70',
    accentHex: '#F59E0B',
  },
  Epic: {
    rank: 2,
    rankOrder: 2,
    label: 'Epic',
    tierNote: 'High Rarity · Tier II',
    badgeBg: 'bg-fuchsia-500/20',
    badgeText: 'text-fuchsia-200',
    badgeBorder: 'border-fuchsia-400/70',
    badgeClass: 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200',
    borderClass: 'border-fuchsia-400/70',
    accentHex: '#D946EF',
  },
  Rare: {
    rank: 3,
    rankOrder: 3,
    label: 'Rare',
    tierNote: 'Medium Rarity · Tier III',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-200',
    badgeBorder: 'border-sky-400/70',
    badgeClass: 'border-sky-400/70 bg-sky-500/20 text-sky-200',
    borderClass: 'border-sky-400/70',
    accentHex: '#0EA5E9',
  },
  Uncommon: {
    rank: 4,
    rankOrder: 4,
    label: 'Uncommon',
    tierNote: 'Low Rarity · Tier IV',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-200',
    badgeBorder: 'border-emerald-400/70',
    badgeClass: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200',
    borderClass: 'border-emerald-400/70',
    accentHex: '#10B981',
  },
  Common: {
    rank: 5,
    rankOrder: 5,
    label: 'Common',
    tierNote: 'Basic Rarity · Tier V',
    badgeBg: 'bg-stone-500/20',
    badgeText: 'text-stone-200',
    badgeBorder: 'border-stone-500/60',
    badgeClass: 'border-stone-500/60 bg-stone-500/20 text-stone-200',
    borderClass: 'border-stone-500/60',
    accentHex: '#A8A29E',
  },
};

export interface ArcadeSkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  rarityOrder: number;
  description: string;
  emblem: string;
  icon?: string;
  scope: 'individual_and_couple' | 'couple_crest';
  acquisitionSource: 'starter' | 'shop' | 'seasonal_exclusive';
  seasonExclusiveRank?: 1 | 2 | 3;
  seasonalRank?: 1 | 2 | 3;
  costCoins: number;
  previewCode: string;
  bannerGradient: string;
  frameClass: string;
  tagColorClass: string;
  badgeClass?: string;
  patternMotif: string;
}

export const ARCADE_SKINS: ArcadeSkinDef[] = [
  // === SEASONAL TOP-3 EXCLUSIVE REWARD SKINS (Awarded at Season End to Top 3 Couples) ===
  {
    id: 'skin-season-sovereign-eclipse',
    name: 'Sovereign Eclipse Crown',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Exclusive 1st Place Seasonal Championship Skin. Gilded celestial astrolabe frame with twin solar-eclipse halos and crimson-gold foil.',
    emblem: '👑✨',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    seasonExclusiveRank: 1,
    costCoins: 0,
    previewCode: 'skin-season-sovereign-eclipse',
    bannerGradient: 'from-amber-500/35 via-rose-500/25 to-yellow-500/30',
    frameClass: 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.28)]',
    tagColorClass: 'text-amber-200 border-amber-400/60 bg-amber-500/20',
    patternMotif: 'Solar Astrolabe & Twin Gilded Halos',
  },
  {
    id: 'skin-season-celestial-waltz',
    name: 'Astral Nocturne Serenade',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Exclusive 2nd Place Seasonal Championship Skin. Velvet constellation tapestry with silver-violet starlight ribbons.',
    emblem: '🦢🌙',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    seasonExclusiveRank: 2,
    costCoins: 0,
    previewCode: 'skin-season-celestial-waltz',
    bannerGradient: 'from-fuchsia-500/30 via-purple-500/25 to-indigo-500/30',
    frameClass: 'border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.24)]',
    tagColorClass: 'text-fuchsia-200 border-fuchsia-400/60 bg-fuchsia-500/20',
    patternMotif: 'Velvet Starlight & Silver Swans',
  },
  {
    id: 'skin-season-paper-lantern-harmony',
    name: 'Festival Lantern Regalia',
    rarity: 'Rare',
    rarityOrder: 3,
    description:
      'Exclusive 3rd Place Seasonal Championship Skin. Azure river lanterns drifting across warm twilight ink wash.',
    emblem: '🏮🌊',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    seasonExclusiveRank: 3,
    costCoins: 0,
    previewCode: 'skin-season-paper-lantern-harmony',
    bannerGradient: 'from-sky-500/30 via-teal-500/20 to-amber-500/25',
    frameClass: 'border-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.22)]',
    tagColorClass: 'text-sky-200 border-sky-400/60 bg-sky-500/20',
    patternMotif: 'Drifting River Lanterns & Ink Wash',
  },

  // === SHOP & STARTER SKINS ACROSS ALL 5 RARITY LEVELS ===
  {
    id: 'skin-imperial-clockwork-heart',
    name: 'Clockwork Sanctuary Grandmaster',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Masterwork brass escapement gears and ruby filigree that illuminates your profile, sidebar badge, and arena header.',
    emblem: '⚙️💎',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 650,
    previewCode: 'skin-imperial-clockwork-heart',
    bannerGradient: 'from-amber-500/30 via-orange-500/20 to-rose-500/25',
    frameClass: 'border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    tagColorClass: 'text-amber-200 border-amber-400/60 bg-amber-500/20',
    patternMotif: 'Precision Brass Escapement & Ruby Filigree',
  },
  {
    id: 'skin-sakura-moonlit-pavilion',
    name: 'Moonlit Sakura Pavilion',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Hand-painted evening cherry blossoms with plum-blossom lacquer trim and floating petal accents.',
    emblem: '🌸🌙',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 420,
    previewCode: 'skin-sakura-moonlit-pavilion',
    bannerGradient: 'from-rose-500/30 via-fuchsia-500/20 to-amber-500/20',
    frameClass: 'border-fuchsia-400/80 shadow-[0_0_16px_rgba(217,70,239,0.18)]',
    tagColorClass: 'text-fuchsia-200 border-fuchsia-400/60 bg-fuchsia-500/20',
    patternMotif: 'Evening Sakura Petals & Lacquer Trim',
  },
  {
    id: 'skin-starlight-observatory',
    name: 'Starlight Cartographer',
    rarity: 'Rare',
    rarityOrder: 3,
    description:
      'Deep sapphire celestial chart etched with brass compass lines and northern-star coordinates.',
    emblem: '🧭✨',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 260,
    previewCode: 'skin-starlight-observatory',
    bannerGradient: 'from-sky-500/25 via-indigo-500/20 to-teal-500/20',
    frameClass: 'border-sky-400/80',
    tagColorClass: 'text-sky-200 border-sky-400/60 bg-sky-500/20',
    patternMotif: 'Sapphire Celestial Chart & Compass Rose',
  },
  {
    id: 'skin-matcha-botanical-press',
    name: 'Pressed Clover Herbarium',
    rarity: 'Uncommon',
    rarityOrder: 4,
    description:
      'Cozy botanical notebook margin with pressed four-leaf clovers, sage linen tape, and warm sepia ink.',
    emblem: '🍀🌿',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 140,
    previewCode: 'skin-matcha-botanical-press',
    bannerGradient: 'from-emerald-500/25 via-teal-500/15 to-stone-800/40',
    frameClass: 'border-emerald-400/75',
    tagColorClass: 'text-emerald-200 border-emerald-400/60 bg-emerald-500/20',
    patternMotif: 'Pressed Clover Leaf & Linen Tape',
  },
  {
    id: 'skin-berry-milk-postmark',
    name: 'Strawberry Postmark Stamp',
    rarity: 'Uncommon',
    rarityOrder: 4,
    description:
      'Playful airmail postmark border with strawberry wax seal and warm cream stationery stripes.',
    emblem: '🍓✉️',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 120,
    previewCode: 'skin-berry-milk-postmark',
    bannerGradient: 'from-rose-500/20 via-amber-500/15 to-stone-800/40',
    frameClass: 'border-emerald-400/70',
    tagColorClass: 'text-emerald-200 border-emerald-400/60 bg-emerald-500/20',
    patternMotif: 'Airmail Postmark & Berry Wax Seal',
  },
  {
    id: 'skin-classic-notebook',
    name: 'Warm Sketchbook Margin',
    rarity: 'Common',
    rarityOrder: 5,
    description:
      'Default archival working-sheet margin with graphite pencil rule lines and masking tape corners.',
    emblem: '📓✏️',
    scope: 'individual_and_couple',
    acquisitionSource: 'starter',
    costCoins: 0,
    previewCode: 'skin-classic-notebook',
    bannerGradient: 'from-stone-700/30 via-stone-800/30 to-stone-900/40',
    frameClass: 'border-stone-600',
    tagColorClass: 'text-stone-200 border-stone-500/60 bg-stone-500/20',
    patternMotif: 'Archival Grid & Graphite Pencil Rule',
  },
  {
    id: 'skin-cozy-parchment-cord',
    name: 'Twine & Kraft Keepsake',
    rarity: 'Common',
    rarityOrder: 5,
    description:
      'Simple kraft-paper parcel trim tied with baker’s twine and a neat handwritten label.',
    emblem: '🏷️🧵',
    scope: 'individual_and_couple',
    acquisitionSource: 'shop',
    costCoins: 60,
    previewCode: 'skin-cozy-parchment-cord',
    bannerGradient: 'from-amber-700/20 via-stone-800/30 to-stone-900/40',
    frameClass: 'border-stone-500',
    tagColorClass: 'text-stone-200 border-stone-500/60 bg-stone-500/20',
    patternMotif: 'Kraft Parcel & Baker’s Twine',
  },
];

export function getSkinById(skinId: string | undefined | null): ArcadeSkinDef & {
  icon: string;
  badgeClass: string;
  seasonalRank?: 1 | 2 | 3;
} {
  const found =
    (skinId
      ? ARCADE_SKINS.find((s) => s.id === skinId || s.previewCode === skinId)
      : undefined) || ARCADE_SKINS.find((s) => s.id === 'skin-classic-notebook')!;
  return {
    ...found,
    icon: found.icon || found.emblem,
    badgeClass: found.badgeClass || found.tagColorClass,
    seasonalRank: found.seasonalRank ?? found.seasonExclusiveRank,
  };
}

export interface RewardShopItem {
  id: string;
  name: string;
  category: 'utility' | 'skin' | 'avatar' | 'pet' | 'decoration' | 'theme';
  costCoins: number;
  description: string;
  previewCode: string;
  consumable?: boolean;
  rarity?: SkinRarity;
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
  // Purchasable & starter skins exposed in unified shop catalog
  ...ARCADE_SKINS.filter((s) => s.acquisitionSource !== 'seasonal_exclusive').map((s) => ({
    id: s.id,
    name: `${s.name} (${s.rarity} Skin)`,
    category: 'skin' as const,
    costCoins: s.costCoins,
    description: s.description,
    previewCode: s.previewCode,
    rarity: s.rarity,
  })),
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

/* ============================================================================
   DAILY (EASY · 24H), WEEKLY (MEDIUM · 7D) & MONTHLY (HARD · 1M) CHALLENGES
   ============================================================================ */

export type ChallengePeriodType = 'daily' | 'weekly' | 'monthly';
export type ChallengeDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ChallengeMetricType =
  | 'specific_games'
  | 'pet_care'
  | 'any_matches_played'
  | 'any_wins'
  | 'single_matches'
  | 'multiplayer_1v1_matches'
  | 'multiplayer_2v2_matches'
  | 'multiplayer_2v2_wins'
  | 'high_score_200';

export interface ArcadeChallengeDef {
  key: string;
  periodType: ChallengePeriodType;
  difficulty: ChallengeDifficulty;
  durationLabel: string;
  title: string;
  gameId: string;
  eligibleGameIds?: string[];
  metricType: ChallengeMetricType;
  description: string;
  objectiveLabel: string;
  target: number;
  xpReward: number;
  coinReward: 0; // Strictly 0 Coins — Challenges never bypass 2v2 coin economy rules
}

export const ARCADE_CHALLENGE_CATALOG: ArcadeChallengeDef[] = [
  // === DAILY CHALLENGES (Easy · 24 Hours) ===
  {
    key: 'daily-chess-blitz',
    periodType: 'daily',
    difficulty: 'Easy',
    durationLabel: '24 hours',
    title: 'Twilight Chess Duel',
    gameId: 'chess',
    eligibleGameIds: ['chess'],
    metricType: 'specific_games',
    description: 'Play 1 match of Chess (any preset or custom increment time control).',
    objectiveLabel: 'Complete 1 Chess match',
    target: 1,
    xpReward: 30,
    coinReward: 0,
  },
  {
    key: 'daily-pet-care',
    periodType: 'daily',
    difficulty: 'Easy',
    durationLabel: '24 hours',
    title: 'Mochi Morning Routine',
    gameId: 'virtual-pet',
    eligibleGameIds: ['virtual-pet'],
    metricType: 'pet_care',
    description: 'Feed, play with, or rest your Virtual Pet companion 3 times today.',
    objectiveLabel: 'Care for Mochi 3 times',
    target: 3,
    xpReward: 25,
    coinReward: 0,
  },
  {
    key: 'daily-memory-match',
    periodType: 'daily',
    difficulty: 'Easy',
    durationLabel: '24 hours',
    title: 'Shared Keepsake Flip',
    gameId: 'memory-match',
    eligibleGameIds: ['memory-match', '2048-puzzle'],
    metricType: 'specific_games',
    description: 'Clear a board in Memory Match or 2048 Puzzle.',
    objectiveLabel: 'Finish 1 Memory Match or 2048 game',
    target: 1,
    xpReward: 25,
    coinReward: 0,
  },
  {
    key: 'daily-coop-team',
    periodType: 'daily',
    difficulty: 'Easy',
    durationLabel: '24 hours',
    title: 'Co-Op Kitchen & Maze',
    gameId: 'cooking-together',
    eligibleGameIds: ['cooking-together', 'escape-the-maze', 'treasure-hunt', 'couple-puzzle'],
    metricType: 'specific_games',
    description: 'Complete 1 round of Cooking Together, Escape the Maze, Couple Puzzle, or Treasure Hunt.',
    objectiveLabel: 'Complete 1 Co-Op match',
    target: 1,
    xpReward: 35,
    coinReward: 0,
  },

  // === WEEKLY CHALLENGES (Medium · 7 Days) ===
  {
    key: 'weekly-strategy-tactician',
    periodType: 'weekly',
    difficulty: 'Medium',
    durationLabel: '7 days',
    title: 'Clockwork Board Tactician',
    gameId: 'chess',
    eligibleGameIds: ['chess', 'connect-four', 'battleship', 'tic-tac-toe'],
    metricType: 'specific_games',
    description: 'Complete 4 head-to-head board or strategy duels across Chess, Connect Four, Battleship, or Tic-Tac-Toe this week.',
    objectiveLabel: 'Play 4 strategy board duels',
    target: 4,
    xpReward: 110,
    coinReward: 0,
  },
  {
    key: 'weekly-2v2-couple-contender',
    periodType: 'weekly',
    difficulty: 'Medium',
    durationLabel: '7 days',
    title: 'Paired Couple Contenders',
    gameId: 'quiz-battle',
    metricType: 'multiplayer_2v2_matches',
    description: 'Complete 3 ranked 2v2 Couple Mode matches with your paired partner during the current week.',
    objectiveLabel: 'Complete 3 ranked 2v2 matches',
    target: 3,
    xpReward: 135,
    coinReward: 0,
  },
  {
    key: 'weekly-solo-sanctuary-tour',
    periodType: 'weekly',
    difficulty: 'Medium',
    durationLabel: '7 days',
    title: 'Solo Sanctuary Explorer',
    gameId: '2048-puzzle',
    metricType: 'single_matches',
    description: 'Finish 5 Single-Player games across 2048, Sudoku, Snake, Brick Breaker, Flappy Bird, or Memory Match.',
    objectiveLabel: 'Complete 5 Single-Player games',
    target: 5,
    xpReward: 95,
    coinReward: 0,
  },
  {
    key: 'weekly-victory-streak',
    periodType: 'weekly',
    difficulty: 'Medium',
    durationLabel: '7 days',
    title: 'Sketchbook Winner’s Circle',
    gameId: 'word-duel',
    metricType: 'any_wins',
    description: 'Earn 5 verified game victories or completed board clears across any arcade mode this week.',
    objectiveLabel: 'Record 5 victories this week',
    target: 5,
    xpReward: 120,
    coinReward: 0,
  },

  // === MONTHLY CHALLENGES (Hard · 1 Month) ===
  {
    key: 'monthly-arcade-veteran',
    periodType: 'monthly',
    difficulty: 'Hard',
    durationLabel: '1 month',
    title: 'Grand Notebook Marathon',
    gameId: 'chess',
    metricType: 'any_matches_played',
    description: 'Complete 15 verified arcade games across Single-Player, 1v1 Duels, and 2v2 Couple Mode within the calendar month.',
    objectiveLabel: 'Complete 15 total games this month',
    target: 15,
    xpReward: 340,
    coinReward: 0,
  },
  {
    key: 'monthly-2v2-championship-drive',
    periodType: 'monthly',
    difficulty: 'Hard',
    durationLabel: '1 month',
    title: '2v2 Couple Championship Drive',
    gameId: 'quiz-battle',
    metricType: 'multiplayer_2v2_wins',
    description: 'Win 8 ranked 2v2 Couple Mode matches with your partner across the monthly campaign.',
    objectiveLabel: 'Win 8 ranked 2v2 Couple matches',
    target: 8,
    xpReward: 420,
    coinReward: 0,
  },
  {
    key: 'monthly-1v1-duelist-mastery',
    periodType: 'monthly',
    difficulty: 'Hard',
    durationLabel: '1 month',
    title: 'Master of 1v1 Duels',
    gameId: 'connect-four',
    metricType: 'multiplayer_1v1_matches',
    description: 'Play 10 head-to-head 1v1 Multiplayer matches against your paired partner or invited rivals this month.',
    objectiveLabel: 'Complete 10 1v1 Multiplayer matches',
    target: 10,
    xpReward: 320,
    coinReward: 0,
  },
  {
    key: 'monthly-high-score-alchemist',
    periodType: 'monthly',
    difficulty: 'Hard',
    durationLabel: '1 month',
    title: 'High-Score Alchemist',
    gameId: '2048-puzzle',
    metricType: 'high_score_200',
    description: 'Achieve a score of 200+ points in 8 completed games across the arcade this month.',
    objectiveLabel: 'Score 200+ in 8 games this month',
    target: 8,
    xpReward: 380,
    coinReward: 0,
  },
];

export const DAILY_CHALLENGE_TEMPLATES = ARCADE_CHALLENGE_CATALOG.filter(
  (c) => c.periodType === 'daily'
);

export interface ChallengePeriodWindow {
  periodType: ChallengePeriodType;
  periodKey: string;
  startsAtIso: string;
  endsAtIso: string;
  remainingMs: number;
  remainingLabel: string;
  scheduleLabel: string;
}

export function getChallengePeriodWindow(
  periodType: ChallengePeriodType,
  nowDate: Date = new Date()
): ChallengePeriodWindow {
  const nowMs = nowDate.getTime();
  const year = nowDate.getUTCFullYear();
  const month = nowDate.getUTCMonth();
  const date = nowDate.getUTCDate();

  let startsAt: Date;
  let endsAt: Date;
  let periodKey: string;
  let scheduleLabel: string;

  if (periodType === 'daily') {
    startsAt = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
    endsAt = new Date(Date.UTC(year, month, date + 1, 0, 0, 0, 0));
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(date).padStart(2, '0');
    periodKey = `daily:${yStr}-${mStr}-${dStr}`;
    scheduleLabel = 'Resets every 24h at 00:00 UTC';
  } else if (periodType === 'weekly') {
    // Monday-anchored 7-day UTC week
    const dayOfWeek = nowDate.getUTCDay(); // 0 (Sun) .. 6 (Sat)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startsAt = new Date(Date.UTC(year, month, date + diffToMonday, 0, 0, 0, 0));
    endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sYear = startsAt.getUTCFullYear();
    const sMonth = String(startsAt.getUTCMonth() + 1).padStart(2, '0');
    const sDay = String(startsAt.getUTCDate()).padStart(2, '0');
    periodKey = `weekly:${sYear}-${sMonth}-${sDay}`;
    scheduleLabel = 'Resets every Monday at 00:00 UTC (7-Day Cycle)';
  } else {
    startsAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    endsAt = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, '0');
    periodKey = `monthly:${yStr}-${mStr}`;
    scheduleLabel = 'Resets on the 1st of every month at 00:00 UTC';
  }

  const remainingMs = Math.max(0, endsAt.getTime() - nowMs);
  const totalMinutes = Math.floor(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  const remainingLabel =
    days > 0
      ? `${days}d ${hours}h remaining`
      : hours > 0
      ? `${hours}h ${mins}m remaining`
      : `${mins}m remaining`;

  return {
    periodType,
    periodKey,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    remainingMs,
    remainingLabel,
    scheduleLabel,
  };
}

/* ============================================================================
   SEASONAL LEADERBOARD & DYNAMIC 4TH+ COIN REWARD BRACKET ENGINE
   ============================================================================ */

export interface SeasonalBracketConfig {
  seasonDurationDays: number;
  rank4BaseCoins: number;
  minEligibleCoins: number;
  curveExponent: number;
}

export const DEFAULT_SEASONAL_BRACKET_CONFIG: SeasonalBracketConfig = {
  seasonDurationDays: 30,
  rank4BaseCoins: 500,
  minEligibleCoins: 75,
  curveExponent: 1.25,
};

export interface SeasonalTopSkinBracketRow {
  rank: 1 | 2 | 3;
  rankLabel: string;
  skinId: string;
  skinName: string;
  rarity: SkinRarity;
  emblem: string;
  populated: boolean;
  coupleName?: string;
  coupleTrophies?: number;
}

export interface SeasonalCoinBracketRow {
  tierIndex: number;
  rankStart: number;
  rankEnd: number;
  rankRangeLabel: string;
  tierTitle: string;
  coinsPerPartner: number;
  couplesInTier: number;
}

export function computeRankCoinRewardFor4thPlus(
  rank: number,
  totalEligibleCouples: number,
  config: SeasonalBracketConfig = DEFAULT_SEASONAL_BRACKET_CONFIG
): number {
  if (rank < 4 || totalEligibleCouples < 4 || rank > totalEligibleCouples) {
    return 0;
  }
  const maxCoins = Math.max(50, Math.round(config.rank4BaseCoins));
  const minCoins = Math.max(10, Math.min(maxCoins, Math.round(config.minEligibleCoins)));
  const remainingCount = totalEligibleCouples - 3; // ranks 4..N
  if (remainingCount <= 1) {
    return maxCoins;
  }
  const relativeIndex = rank - 4; // 0 for rank 4, remainingCount - 1 for rank N
  const normalizedProgress = relativeIndex / (remainingCount - 1); // 0 .. 1
  const exponent = Math.max(0.5, Math.min(3, config.curveExponent || 1.25));
  const rawCoins =
    minCoins + (maxCoins - minCoins) * Math.pow(1 - normalizedProgress, exponent);
  // Round to nearest 5 coins for clean arcade payouts while keeping monotonic order
  return Math.max(minCoins, Math.round(rawCoins / 5) * 5);
}

export function computeDynamicSeasonalBracket(
  eligibleCouples: {
    id: number;
    coupleName: string;
    coupleTrophies: number;
  }[],
  config: SeasonalBracketConfig = DEFAULT_SEASONAL_BRACKET_CONFIG
): {
  eligibleCount: number;
  top3SkinRows: SeasonalTopSkinBracketRow[];
  coinBracketRows: SeasonalCoinBracketRow[];
  perRankCoinMap: Record<number, number>;
} {
  const eligibleCount = eligibleCouples.length;
  const s1 = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 1)!;
  const s2 = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 2)!;
  const s3 = ARCADE_SKINS.find((s) => s.seasonExclusiveRank === 3)!;

  const top3SkinRows: SeasonalTopSkinBracketRow[] = [
    {
      rank: 1,
      rankLabel: '1st Place Couple',
      skinId: s1.id,
      skinName: s1.name,
      rarity: s1.rarity,
      emblem: s1.emblem,
      populated: eligibleCount >= 1,
      coupleName: eligibleCouples[0]?.coupleName,
      coupleTrophies: eligibleCouples[0]?.coupleTrophies,
    },
    {
      rank: 2,
      rankLabel: '2nd Place Couple',
      skinId: s2.id,
      skinName: s2.name,
      rarity: s2.rarity,
      emblem: s2.emblem,
      populated: eligibleCount >= 2,
      coupleName: eligibleCouples[1]?.coupleName,
      coupleTrophies: eligibleCouples[1]?.coupleTrophies,
    },
    {
      rank: 3,
      rankLabel: '3rd Place Couple',
      skinId: s3.id,
      skinName: s3.name,
      rarity: s3.rarity,
      emblem: s3.emblem,
      populated: eligibleCount >= 3,
      coupleName: eligibleCouples[2]?.coupleName,
      coupleTrophies: eligibleCouples[2]?.coupleTrophies,
    },
  ];

  const perRankCoinMap: Record<number, number> = {};
  const coinBracketRows: SeasonalCoinBracketRow[] = [];

  if (eligibleCount < 4) {
    return {
      eligibleCount,
      top3SkinRows,
      coinBracketRows: [],
      perRankCoinMap,
    };
  }

  for (let r = 4; r <= eligibleCount; r++) {
    perRankCoinMap[r] = computeRankCoinRewardFor4thPlus(r, eligibleCount, config);
  }

  const remainingCouplesCount = eligibleCount - 3;

  // If 4..8 couples total, show exact individual or compact rank brackets without any empty ranks
  if (remainingCouplesCount <= 4) {
    const tierNames = [
      '4th Place Contender',
      '5th Place Contender',
      '6th Place Contender',
      '7th Place Contender',
    ];
    for (let r = 4; r <= eligibleCount; r++) {
      coinBracketRows.push({
        tierIndex: r - 3,
        rankStart: r,
        rankEnd: r,
        rankRangeLabel: `#${r}`,
        tierTitle: tierNames[r - 4] || `Rank #${r} Contender`,
        coinsPerPartner: perRankCoinMap[r],
        couplesInTier: 1,
      });
    }
  } else {
    // Dynamically partition 4..N into up to 4 proportional tiers (Upper Crest, Silver Division, Bronze Division, Season Finishers)
    const tierDefinitions = [
      { title: 'Upper Crest Bracket (Top 25% of 4th+)', share: 0.25 },
      { title: 'Silver Division Bracket (Next 25% of 4th+)', share: 0.25 },
      { title: 'Bronze Division Bracket (Next 25% of 4th+)', share: 0.25 },
      { title: 'Season Finisher Bracket (Final 25% of 4th+)', share: 0.25 },
    ];

    let cursor = 4;
    for (let i = 0; i < tierDefinitions.length; i++) {
      if (cursor > eligibleCount) break;
      const isLast = i === tierDefinitions.length - 1;
      const countForTier = isLast
        ? eligibleCount - cursor + 1
        : Math.max(1, Math.round(remainingCouplesCount * tierDefinitions[i].share));
      const rankStart = cursor;
      const rankEnd = Math.min(eligibleCount, cursor + countForTier - 1);
      const tierCoins = perRankCoinMap[rankStart];

      // Normalize all ranks inside this grouped bracket to receive the tier's coin payout so the table and payout match 100%
      for (let r = rankStart; r <= rankEnd; r++) {
        perRankCoinMap[r] = tierCoins;
      }

      coinBracketRows.push({
        tierIndex: i + 1,
        rankStart,
        rankEnd,
        rankRangeLabel: rankStart === rankEnd ? `#${rankStart}` : `#${rankStart} – #${rankEnd}`,
        tierTitle: tierDefinitions[i].title,
        coinsPerPartner: tierCoins,
        couplesInTier: rankEnd - rankStart + 1,
      });

      cursor = rankEnd + 1;
    }
  }

  return {
    eligibleCount,
    top3SkinRows,
    coinBracketRows,
    perRankCoinMap,
  };
}


