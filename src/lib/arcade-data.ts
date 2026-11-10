export type GameCategory = 'single' | 'competitive' | 'cooperative' | 'party';

export interface ArcadeGameDef {
  id: string;
  number: number;
  title: string;
  collection: 'single' | 'multiplayer' | 'party';
  category: GameCategory;
  shortDesc: string;
  rulesSummary: string;
  controlsHint: string;
  xpReward: number;
  coinReward: number;
  supports2v2?: boolean;
  supportsParty?: boolean;
  minCouples?: number;
  maxCouples?: number;
  minPlayers?: number;
  maxPlayers?: number;
  partyRounds?: number;
  supportsPersonalization?: boolean;
  personalizationType?: 'memory_photo' | 'guess_picture' | 'quiz_question' | 'truth_or_dare';
  defaultDifficulty?: 'Easy' | 'Medium' | 'Hard';
  accentColor: string;
}

export const PARTY_PLACEMENT_XP_REWARDS = {
  first: 60,
  second: 45,
  third: 35,
  participant: 25,
} as const;

export function getPartyPlacementXp(rank: number): number {
  if (rank === 1) return PARTY_PLACEMENT_XP_REWARDS.first;
  if (rank === 2) return PARTY_PLACEMENT_XP_REWARDS.second;
  if (rank === 3) return PARTY_PLACEMENT_XP_REWARDS.third;
  return PARTY_PLACEMENT_XP_REWARDS.participant;
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

export const PARTY_GAMES: ArcadeGameDef[] = [
  {
    id: 'party-couple-quiz-showdown',
    number: 1,
    title: 'Couple Quiz Showdown',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples compete in trivia rounds covering general knowledge, entertainment, puzzles, and fun topics. Both partners can discuss answers before submitting.',
    rulesSummary: '3–10 couples race through 5 multi-category trivia rounds. Both partners see their partner’s live suggested pick and lock in a combined team answer for speed and accuracy points.',
    controlsHint: 'Select Option A–D · Coordinate with Partner · Lock In Answer',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#E76F51',
  },
  {
    id: 'party-draw-and-guess',
    number: 2,
    title: 'Draw & Guess Party',
    collection: 'party',
    category: 'party',
    shortDesc: 'One partner draws a randomly assigned word while everyone else guesses. Rotate drawing turns and award points for correct guesses.',
    rulesSummary: '3–10 couples rotate spotlight easel turns. The active artist sketches the secret prompt while their partner and rival couples race to type the exact word.',
    controlsHint: 'Drag on Canvas to Draw · Type Guess in Prompt Box · Submit',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#F4A261',
  },
  {
    id: 'party-charades-challenge',
    number: 3,
    title: 'Charades Challenge',
    collection: 'party',
    category: 'party',
    shortDesc: 'One partner acts out a word or phrase without speaking while their partner guesses. Compete against other couples within a time limit.',
    rulesSummary: 'Perform silent stage cues, expressive gestures, and scene actions without taboo words so your partner and rival couples can identify the secret phrase before the curtain falls.',
    controlsHint: 'Trigger Stage Gesture Cues · Select Phrase Guess · Lock In',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#2A9D8F',
  },
  {
    id: 'party-word-association',
    number: 4,
    title: 'Word Association Battle',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples take turns connecting words under time pressure. Repeated answers, invalid words, and slow responses can affect scoring.',
    rulesSummary: 'Link semantic word chains from the root theme word before the fuse runs out. Unique, fast word connections build your couple multiplier; repeated or invalid words break your streak.',
    controlsHint: 'Type Connected Word · Press Enter Before Timer Expires',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#E9C46A',
  },
  {
    id: 'party-emoji-decode',
    number: 5,
    title: 'Emoji Decode',
    collection: 'party',
    category: 'party',
    shortDesc: 'Decode movies, objects, phrases, and popular expressions using emoji clues. Fast and accurate answers earn points.',
    rulesSummary: 'Inspect the encrypted emoji sequence representing famous films, idioms, songs, and holiday puzzles. Submit the decoded title or expression fastest for top couple points.',
    controlsHint: 'Inspect Emoji Cipher · Type or Pick Decoded Phrase · Submit',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#F4A261',
  },
  {
    id: 'party-reaction-rumble',
    number: 6,
    title: 'Reaction Rumble',
    collection: 'party',
    category: 'party',
    shortDesc: 'Compete in reaction-based mini-rounds. Both partners participate in quick challenges involving timing, attention, and coordination.',
    rulesSummary: 'Both partners strike synchronized target beacons, dodge red decoys, and hit precision timing windows. Combined partner millisecond scores rank every couple each round.',
    controlsHint: 'Click Emerald Target Beacons · Avoid Red Decoys · Space Strike',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#E76F51',
  },
  {
    id: 'party-memory-mayhem',
    number: 7,
    title: 'Memory Mayhem',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples work together to remember card positions and solve increasingly challenging memory rounds while competing for the highest score.',
    rulesSummary: 'Study the brief constellation card flash, then flip and pair matching relic tiles across escalating 4x4 and 4x5 grids before the round timer runs out.',
    controlsHint: 'Memorize Revealed Grid · Click Matching Tile Pairs',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 4,
    accentColor: '#2A9D8F',
  },
  {
    id: 'party-two-truths-and-a-lie',
    number: 8,
    title: 'Two Truths & A Lie',
    collection: 'party',
    category: 'party',
    shortDesc: 'Participants submit three statements, with others trying to identify the false one. Award points for correct guesses.',
    rulesSummary: 'Craft two true statements and one clever lie (or customize from playful prompt templates). Earn deception points when rival couples fall for your lie and detective points for spotting theirs!',
    controlsHint: 'Submit 2 Truths + 1 Lie · Vote on Rival Couple Statements',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 4,
    accentColor: '#E9C46A',
  },
  {
    id: 'party-puzzle-rush',
    number: 9,
    title: 'Puzzle Rush',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples solve timed puzzles involving patterns, logic, sequences, and visual clues. The fastest accurate team wins.',
    rulesSummary: 'Race through randomized logic sequences, cipher wheels, missing-symbol matrices, and arithmetic relays. Accuracy and remaining seconds determine your couple score.',
    controlsHint: 'Analyze Pattern Matrix · Select Missing Element · Lock In',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#F4A261',
  },
  {
    id: 'party-treasure-hunt',
    number: 10,
    title: 'Treasure Hunt Party',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples solve clues and complete a series of challenges to find hidden treasure. Include multiple possible paths and randomized puzzles.',
    rulesSummary: 'Navigate branching archipelago map nodes, solve compass riddles to unlock coastal paths, and excavate the Golden Keepsake Chest ahead of rival couples.',
    controlsHint: 'Choose Map Path · Solve Compass Riddle · Excavate Sector',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 4,
    accentColor: '#2A9D8F',
  },
  {
    id: 'party-story-chain',
    number: 11,
    title: 'Story Chain',
    collection: 'party',
    category: 'party',
    shortDesc: 'Couples collaboratively create funny stories by adding sentences based on randomized prompts. Other couples vote on creativity and entertainment.',
    rulesSummary: 'Each round provides a story opening and a mandatory wildcard word. Couples write the next twist in the tale, then vote on the most creative and hilarious couple entries!',
    controlsHint: 'Write Next Story Sentence Using Wildcard Word · Vote on Entries',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 4,
    accentColor: '#E76F51',
  },
  {
    id: 'party-quickfire-challenge',
    number: 12,
    title: 'Quickfire Challenge',
    collection: 'party',
    category: 'party',
    shortDesc: 'A collection of short mini-challenges involving quick decisions, pattern recognition, memory, and general knowledge. Each round contributes to the final team score.',
    rulesSummary: 'Survive a rapid 5-stage micro-game gauntlet: Math Blitz, Stroop Color Trap, Odd-Icon Out, Sequence Recall, and Lightning Trivia!',
    controlsHint: 'Respond Rapidly to Each Mini-Challenge Before the 12s Fuse Ends',
    xpReward: 60,
    coinReward: 0,
    supportsParty: true,
    minCouples: 3,
    maxCouples: 10,
    minPlayers: 6,
    maxPlayers: 20,
    partyRounds: 5,
    accentColor: '#E9C46A',
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
  ...PARTY_GAMES,
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

export type SkinFrameAnimationStyle =
  | 'solar_eclipse_corona'
  | 'celestial_waltz_orbit'
  | 'lantern_river_sway'
  | 'clockwork_escapement'
  | 'sakura_petal_drift'
  | 'starlight_compass_sweep'
  | 'botanical_clover_bloom'
  | 'strawberry_wax_pulse'
  | 'sketchbook_graphite_tick'
  | 'kraft_twine_swing';

export function isDirectCoinPurchaseAllowed(rarity: SkinRarity): boolean {
  return rarity === 'Rare' || rarity === 'Uncommon' || rarity === 'Common';
}

export interface ArcadeSkinDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  rarityOrder: number;
  description: string;
  emblem: string;
  icon?: string;
  scope: 'individual_and_couple' | 'couple_crest';
  acquisitionSource: 'starter' | 'shop' | 'chest' | 'seasonal_exclusive';
  directPurchaseAllowed: boolean;
  seasonExclusiveRank?: 1 | 2 | 3;
  seasonalRank?: 1 | 2 | 3;
  costCoins: number;
  previewCode: string;
  bannerGradient: string;
  frameClass: string;
  tagColorClass: string;
  badgeClass?: string;
  patternMotif: string;
  animationStyle: SkinFrameAnimationStyle;
  animationLabel: string;
  framePrimaryColor: string;
  frameSecondaryColor: string;
}

export const ARCADE_SKINS: ArcadeSkinDef[] = [
  // === SEASONAL TOP-3 & CHEST SKINS ===
  {
    id: 'skin-season-sovereign-eclipse',
    name: 'Sovereign Eclipse Crown',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Gilded celestial astrolabe frame with twin solar-eclipse halos and crimson-gold foil. Exclusively obtained from Chests or 1st Place Season finish.',
    emblem: '👑✨',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    directPurchaseAllowed: false,
    seasonExclusiveRank: 1,
    costCoins: 0,
    previewCode: 'skin-season-sovereign-eclipse',
    bannerGradient: 'from-amber-500/35 via-rose-500/25 to-yellow-500/30',
    frameClass: 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.28)]',
    tagColorClass: 'text-amber-200 border-amber-400/60 bg-amber-500/20',
    patternMotif: 'Solar Astrolabe & Twin Gilded Halos',
    animationStyle: 'solar_eclipse_corona',
    animationLabel: 'Orbiting Solar Eclipse Corona & Gilded Astrolabe Rays',
    framePrimaryColor: '#F59E0B',
    frameSecondaryColor: '#F43F5E',
  },
  {
    id: 'skin-season-celestial-waltz',
    name: 'Astral Nocturne Serenade',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Velvet constellation tapestry with silver-violet starlight ribbons. Exclusively obtained from Chests or 2nd Place Season finish.',
    emblem: '🦢🌙',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    directPurchaseAllowed: false,
    seasonExclusiveRank: 2,
    costCoins: 0,
    previewCode: 'skin-season-celestial-waltz',
    bannerGradient: 'from-fuchsia-500/30 via-purple-500/25 to-indigo-500/30',
    frameClass: 'border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.24)]',
    tagColorClass: 'text-fuchsia-200 border-fuchsia-400/60 bg-fuchsia-500/20',
    patternMotif: 'Velvet Starlight & Silver Swans',
    animationStyle: 'celestial_waltz_orbit',
    animationLabel: 'Counter-Rotating Comet Ribbons & Silver Swan Stardust',
    framePrimaryColor: '#D946EF',
    frameSecondaryColor: '#818CF8',
  },
  {
    id: 'skin-season-paper-lantern-harmony',
    name: 'Festival Lantern Regalia',
    rarity: 'Rare',
    rarityOrder: 3,
    description:
      'Azure river lanterns drifting across warm twilight ink wash. Obtainable from Chests, direct Coin purchase, or 3rd Place Season finish.',
    emblem: '🏮🌊',
    scope: 'individual_and_couple',
    acquisitionSource: 'seasonal_exclusive',
    directPurchaseAllowed: true,
    seasonExclusiveRank: 3,
    costCoins: 300,
    previewCode: 'skin-season-paper-lantern-harmony',
    bannerGradient: 'from-sky-500/30 via-teal-500/20 to-amber-500/25',
    frameClass: 'border-sky-400 shadow-[0_0_16px_rgba(14,165,233,0.22)]',
    tagColorClass: 'text-sky-200 border-sky-400/60 bg-sky-500/20',
    patternMotif: 'Drifting River Lanterns & Ink Wash',
    animationStyle: 'lantern_river_sway',
    animationLabel: 'Swaying Paper Lanterns & Rising Golden River Embers',
    framePrimaryColor: '#38BDF8',
    frameSecondaryColor: '#FBBF24',
  },

  // === CHEST & SHOP SKINS ACROSS ALL 5 RARITY LEVELS ===
  {
    id: 'skin-imperial-clockwork-heart',
    name: 'Clockwork Sanctuary Grandmaster',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Masterwork brass escapement gears and ruby filigree that illuminates your profile, sidebar badge, and arena header. Chest-Exclusive Legendary reward.',
    emblem: '⚙️💎',
    scope: 'individual_and_couple',
    acquisitionSource: 'chest',
    directPurchaseAllowed: false,
    costCoins: 0,
    previewCode: 'skin-imperial-clockwork-heart',
    bannerGradient: 'from-amber-500/30 via-orange-500/20 to-rose-500/25',
    frameClass: 'border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.22)]',
    tagColorClass: 'text-amber-200 border-amber-400/60 bg-amber-500/20',
    patternMotif: 'Precision Brass Escapement & Ruby Filigree',
    animationStyle: 'clockwork_escapement',
    animationLabel: 'Interlocking Brass Escapement Gears & Ruby Pendulum Pulse',
    framePrimaryColor: '#D97706',
    frameSecondaryColor: '#E11D48',
  },
  {
    id: 'skin-sakura-moonlit-pavilion',
    name: 'Moonlit Sakura Pavilion',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Hand-painted evening cherry blossoms with plum-blossom lacquer trim and floating petal accents. Chest-Exclusive Epic reward.',
    emblem: '🌸🌙',
    scope: 'individual_and_couple',
    acquisitionSource: 'chest',
    directPurchaseAllowed: false,
    costCoins: 0,
    previewCode: 'skin-sakura-moonlit-pavilion',
    bannerGradient: 'from-rose-500/30 via-fuchsia-500/20 to-amber-500/20',
    frameClass: 'border-fuchsia-400/80 shadow-[0_0_16px_rgba(217,70,239,0.18)]',
    tagColorClass: 'text-fuchsia-200 border-fuchsia-400/60 bg-fuchsia-500/20',
    patternMotif: 'Evening Sakura Petals & Lacquer Trim',
    animationStyle: 'sakura_petal_drift',
    animationLabel: 'Floating Moonlit Cherry Blossom Petals & Crescent Shimmer',
    framePrimaryColor: '#EC4899',
    frameSecondaryColor: '#C084FC',
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
    directPurchaseAllowed: true,
    costCoins: 260,
    previewCode: 'skin-starlight-observatory',
    bannerGradient: 'from-sky-500/25 via-indigo-500/20 to-teal-500/20',
    frameClass: 'border-sky-400/80',
    tagColorClass: 'text-sky-200 border-sky-400/60 bg-sky-500/20',
    patternMotif: 'Sapphire Celestial Chart & Compass Rose',
    animationStyle: 'starlight_compass_sweep',
    animationLabel: 'Sweeping Compass Rose & Orbiting Polaris Starlight',
    framePrimaryColor: '#0EA5E9',
    frameSecondaryColor: '#6366F1',
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
    directPurchaseAllowed: true,
    costCoins: 140,
    previewCode: 'skin-matcha-botanical-press',
    bannerGradient: 'from-emerald-500/25 via-teal-500/15 to-stone-800/40',
    frameClass: 'border-emerald-400/75',
    tagColorClass: 'text-emerald-200 border-emerald-400/60 bg-emerald-500/20',
    patternMotif: 'Pressed Clover Leaf & Linen Tape',
    animationStyle: 'botanical_clover_bloom',
    animationLabel: 'Breathing Botanical Vine Garland & Blooming Four-Leaf Clovers',
    framePrimaryColor: '#10B981',
    frameSecondaryColor: '#84CC16',
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
    directPurchaseAllowed: true,
    costCoins: 120,
    previewCode: 'skin-berry-milk-postmark',
    bannerGradient: 'from-rose-500/20 via-amber-500/15 to-stone-800/40',
    frameClass: 'border-emerald-400/70',
    tagColorClass: 'text-emerald-200 border-emerald-400/60 bg-emerald-500/20',
    patternMotif: 'Airmail Postmark & Berry Wax Seal',
    animationStyle: 'strawberry_wax_pulse',
    animationLabel: 'Airmail Chevron Border & Pulsing Crimson Wax Seal',
    framePrimaryColor: '#F43F5E',
    frameSecondaryColor: '#10B981',
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
    directPurchaseAllowed: false,
    costCoins: 0,
    previewCode: 'skin-classic-notebook',
    bannerGradient: 'from-stone-700/30 via-stone-800/30 to-stone-900/40',
    frameClass: 'border-stone-600',
    tagColorClass: 'text-stone-200 border-stone-500/60 bg-stone-500/20',
    patternMotif: 'Archival Grid & Graphite Pencil Rule',
    animationStyle: 'sketchbook_graphite_tick',
    animationLabel: 'Hand-Sketched Graphite Corner Crop Marks & Paper Tape Gleam',
    framePrimaryColor: '#78716C',
    frameSecondaryColor: '#D6D3D1',
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
    directPurchaseAllowed: true,
    costCoins: 60,
    previewCode: 'skin-cozy-parchment-cord',
    bannerGradient: 'from-amber-700/20 via-stone-800/30 to-stone-900/40',
    frameClass: 'border-stone-500',
    tagColorClass: 'text-stone-200 border-stone-500/60 bg-stone-500/20',
    patternMotif: 'Kraft Parcel & Baker’s Twine',
    animationStyle: 'kraft_twine_swing',
    animationLabel: 'Braided Baker’s Twine Stitch & Gently Swinging Parcel Tag',
    framePrimaryColor: '#A8A29E',
    frameSecondaryColor: '#D97706',
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
  // Only Rare, Uncommon, and Common purchasable skins are listed for direct coin purchase
  ...ARCADE_SKINS.filter((s) => s.directPurchaseAllowed && s.costCoins > 0).map((s) => ({
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
  keyRewardTier: SkinRarity; // Chest Key awarded upon verified completion & claim
  keyRewardCount: number;
}

export const ARCADE_CHALLENGE_CATALOG: ArcadeChallengeDef[] = [
  // === DAILY CHALLENGES (Easy · 24 Hours -> Awards Common or Uncommon Key) ===
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
    keyRewardTier: 'Common',
    keyRewardCount: 1,
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
    keyRewardTier: 'Common',
    keyRewardCount: 1,
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
    keyRewardTier: 'Uncommon',
    keyRewardCount: 1,
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
    keyRewardTier: 'Uncommon',
    keyRewardCount: 1,
  },

  // === WEEKLY CHALLENGES (Medium · 7 Days -> Awards Rare or Epic Key) ===
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
    keyRewardTier: 'Rare',
    keyRewardCount: 1,
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
    keyRewardTier: 'Epic',
    keyRewardCount: 1,
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
    keyRewardTier: 'Rare',
    keyRewardCount: 1,
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
    keyRewardTier: 'Epic',
    keyRewardCount: 1,
  },

  // === MONTHLY CHALLENGES (Hard · 1 Month -> Awards Legendary Key) ===
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
    keyRewardTier: 'Legendary',
    keyRewardCount: 1,
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
    keyRewardTier: 'Legendary',
    keyRewardCount: 1,
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
    keyRewardTier: 'Legendary',
    keyRewardCount: 1,
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
    keyRewardTier: 'Legendary',
    keyRewardCount: 1,
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

/* ============================================================================
   5-RARITY PROFILE BANNERS, 5-TIER CHESTS & CUSTOM KEYS SYSTEM
   ============================================================================ */

export type BannerArtworkPattern =
  | 'solar_eclipse_sanctuary'
  | 'imperial_clockwork_orrery'
  | 'astral_swan_nocturne'
  | 'moonlit_sakura_bridge'
  | 'river_lantern_festival'
  | 'celestial_compass_chart'
  | 'pressed_clover_herbarium'
  | 'strawberry_airmail_parlor'
  | 'warm_sketchbook_grid'
  | 'kraft_twine_postscript';

export interface ArcadeBannerDef {
  id: string;
  name: string;
  rarity: SkinRarity;
  rarityOrder: number;
  description: string;
  emblem: string;
  costCoins: number;
  directPurchaseAllowed: boolean;
  acquisitionSource: 'starter' | 'shop' | 'chest' | 'trophy_road';
  artworkPattern: BannerArtworkPattern;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderClass: string;
  badgeClass: string;
  motifLabel: string;
}

export const ARCADE_BANNERS: ArcadeBannerDef[] = [
  // 1. LEGENDARY BANNERS (Chest-Exclusive · No Direct Coin Purchase)
  {
    id: 'banner-sovereign-eclipse-horizon',
    name: 'Sovereign Eclipse Horizon',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Gilded celestial horizon where twin solar-eclipse rings and golden astrolabe arcs illuminate dark velvet parchment. Chest-Exclusive Legendary banner.',
    emblem: '🌞👑',
    costCoins: 0,
    directPurchaseAllowed: false,
    acquisitionSource: 'chest',
    artworkPattern: 'solar_eclipse_sanctuary',
    primaryColor: '#451A03',
    secondaryColor: '#991B1B',
    accentColor: '#FBBF24',
    borderClass: 'border-amber-400',
    badgeClass: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
    motifLabel: 'Twin Solar Halos & Gilded Astrolabe',
  },
  {
    id: 'banner-grandmaster-clockwork-orrery',
    name: 'Grandmaster Clockwork Orrery',
    rarity: 'Legendary',
    rarityOrder: 1,
    description:
      'Intricate planetary gearwork, brass pendulums, and ruby jewel bearings spanning a royal horology blueprint. Chest-Exclusive Legendary banner.',
    emblem: '⚙️🕰️',
    costCoins: 0,
    directPurchaseAllowed: false,
    acquisitionSource: 'chest',
    artworkPattern: 'imperial_clockwork_orrery',
    primaryColor: '#3B1D0A',
    secondaryColor: '#7C2D12',
    accentColor: '#F59E0B',
    borderClass: 'border-amber-400',
    badgeClass: 'border-amber-400/70 bg-amber-500/20 text-amber-200',
    motifLabel: 'Planetary Brass Gears & Ruby Bearings',
  },

  // 2. EPIC BANNERS (Chest-Exclusive · No Direct Coin Purchase)
  {
    id: 'banner-astral-swan-constellation',
    name: 'Astral Swan Constellation',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Silver-violet nebula silk embroidered with twin swans, crescent moon reflections, and shimmering starlight threads. Chest-Exclusive Epic banner.',
    emblem: '🦢🌌',
    costCoins: 0,
    directPurchaseAllowed: false,
    acquisitionSource: 'chest',
    artworkPattern: 'astral_swan_nocturne',
    primaryColor: '#2E1065',
    secondaryColor: '#701A75',
    accentColor: '#E879F9',
    borderClass: 'border-fuchsia-400',
    badgeClass: 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200',
    motifLabel: 'Nebula Tapestry & Twin Starlight Swans',
  },
  {
    id: 'banner-moonlit-sakura-bridge',
    name: 'Moonlit Sakura Footbridge',
    rarity: 'Epic',
    rarityOrder: 2,
    description:
      'Arched vermilion garden bridge beneath cascading cherry blossom boughs and a glowing harvest moon. Chest-Exclusive Epic banner.',
    emblem: '🌸🏮',
    costCoins: 0,
    directPurchaseAllowed: false,
    acquisitionSource: 'chest',
    artworkPattern: 'moonlit_sakura_bridge',
    primaryColor: '#4C0519',
    secondaryColor: '#581C87',
    accentColor: '#F472B6',
    borderClass: 'border-fuchsia-400',
    badgeClass: 'border-fuchsia-400/70 bg-fuchsia-500/20 text-fuchsia-200',
    motifLabel: 'Sakura Canopy & Vermilion Bridge',
  },

  // 3. RARE BANNERS (Obtainable from Chests or Direct Coin Purchase)
  {
    id: 'banner-twilight-lantern-harbor',
    name: 'Twilight Lantern Harbor',
    rarity: 'Rare',
    rarityOrder: 3,
    description:
      'Paper festival lanterns drifting across deep indigo harbor waves with warm amber reflections.',
    emblem: '🏮🌊',
    costCoins: 240,
    directPurchaseAllowed: true,
    acquisitionSource: 'shop',
    artworkPattern: 'river_lantern_festival',
    primaryColor: '#0C4A6E',
    secondaryColor: '#134E4A',
    accentColor: '#38BDF8',
    borderClass: 'border-sky-400',
    badgeClass: 'border-sky-400/70 bg-sky-500/20 text-sky-200',
    motifLabel: 'Harbor Waves & Floating Lanterns',
  },
  {
    id: 'banner-compass-rose-observatory',
    name: 'Starlight Compass Chart',
    rarity: 'Rare',
    rarityOrder: 3,
    description:
      'Hand-inked nautical and celestial meridian map with a golden compass rose and Polaris coordinates.',
    emblem: '🧭🗺️',
    costCoins: 220,
    directPurchaseAllowed: true,
    acquisitionSource: 'shop',
    artworkPattern: 'celestial_compass_chart',
    primaryColor: '#1E1B4B',
    secondaryColor: '#0F172A',
    accentColor: '#60A5FA',
    borderClass: 'border-sky-400',
    badgeClass: 'border-sky-400/70 bg-sky-500/20 text-sky-200',
    motifLabel: 'Nautical Meridians & Compass Rose',
  },

  // 4. UNCOMMON BANNERS (Obtainable from Chests or Direct Coin Purchase)
  {
    id: 'banner-pressed-clover-conservatory',
    name: 'Pressed Clover Conservatory',
    rarity: 'Uncommon',
    rarityOrder: 4,
    description:
      'Botanical field journal page with pressed four-leaf clovers, fern fronds, and sage green linen tape.',
    emblem: '🍀🌿',
    costCoins: 130,
    directPurchaseAllowed: true,
    acquisitionSource: 'shop',
    artworkPattern: 'pressed_clover_herbarium',
    primaryColor: '#064E3B',
    secondaryColor: '#14532D',
    accentColor: '#34D399',
    borderClass: 'border-emerald-400',
    badgeClass: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200',
    motifLabel: 'Pressed Fern & Four-Leaf Clovers',
  },
  {
    id: 'banner-strawberry-postmark-parlor',
    name: 'Strawberry Airmail Postcard',
    rarity: 'Uncommon',
    rarityOrder: 4,
    description:
      'Vintage airmail stationery with diagonal coral-and-cream stripes, postmark cancellation lines, and a berry wax seal.',
    emblem: '🍓📮',
    costCoins: 115,
    directPurchaseAllowed: true,
    acquisitionSource: 'shop',
    artworkPattern: 'strawberry_airmail_parlor',
    primaryColor: '#4C1D24',
    secondaryColor: '#3F2E21',
    accentColor: '#FB7185',
    borderClass: 'border-emerald-400',
    badgeClass: 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200',
    motifLabel: 'Vintage Airmail Stripes & Berry Seal',
  },

  // 5. COMMON BANNERS (Obtainable from Chests or Direct Coin Purchase)
  {
    id: 'banner-warm-sketchbook',
    name: 'Warm Sketchbook Working Sheet',
    rarity: 'Common',
    rarityOrder: 5,
    description:
      'Default cozy dot-grid sketchbook sheet with hand-ruled pencil margin lines and masking tape tabs.',
    emblem: '📓✏️',
    costCoins: 0,
    directPurchaseAllowed: false,
    acquisitionSource: 'starter',
    artworkPattern: 'warm_sketchbook_grid',
    primaryColor: '#292524',
    secondaryColor: '#44403C',
    accentColor: '#D6D3D1',
    borderClass: 'border-stone-500',
    badgeClass: 'border-stone-500/70 bg-stone-500/20 text-stone-200',
    motifLabel: 'Dot-Grid Sheet & Masking Tape',
  },
  {
    id: 'banner-kraft-twine-parcel',
    name: 'Kraft Parcel & Baker’s Twine',
    rarity: 'Common',
    rarityOrder: 5,
    description:
      'Warm kraft wrapping paper tied crosswise with red-and-cream baker’s twine and a stamped keepsake tag.',
    emblem: '📦🧵',
    costCoins: 55,
    directPurchaseAllowed: true,
    acquisitionSource: 'shop',
    artworkPattern: 'kraft_twine_postscript',
    primaryColor: '#3E2C1C',
    secondaryColor: '#292524',
    accentColor: '#FBBF24',
    borderClass: 'border-stone-500',
    badgeClass: 'border-stone-500/70 bg-stone-500/20 text-stone-200',
    motifLabel: 'Kraft Paper & Crossed Baker’s Twine',
  },
];

// Map legacy couple banner aliases so existing couple records resolve cleanly
const LEGACY_BANNER_ALIASES: Record<string, string> = {
  'twilight-lanterns': 'banner-twilight-lantern-harbor',
  'compass-rose-banner': 'banner-compass-rose-observatory',
  'banner-none': 'banner-warm-sketchbook',
  'banner-sketchbook-grid': 'banner-warm-sketchbook',
};

export function getBannerById(bannerId: string | undefined | null): ArcadeBannerDef {
  const normalizedId = bannerId ? LEGACY_BANNER_ALIASES[bannerId] || bannerId : undefined;
  return (
    (normalizedId ? ARCADE_BANNERS.find((b) => b.id === normalizedId) : undefined) ||
    ARCADE_BANNERS.find((b) => b.id === 'banner-warm-sketchbook')!
  );
}

/* ============================================================================
   CUSTOM KEY DESIGNS & 5-RARITY PROGRESSION
   ============================================================================ */

export interface ArcadeKeyDef {
  id: string;
  tier: SkinRarity;
  rarityOrder: number;
  name: string;
  unlocksChestTier: SkinRarity;
  unlocksChestName: string;
  materialLabel: string;
  visualDescription: string;
  challengeSourceLabel: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
}

export const ARCADE_KEYS: ArcadeKeyDef[] = [
  {
    id: 'key-legendary',
    tier: 'Legendary',
    rarityOrder: 1,
    name: 'Legendary Key',
    unlocksChestTier: 'Legendary',
    unlocksChestName: 'Legendary Chest',
    materialLabel: 'Sunforged Gold, Ruby Core & Solar Halo Filigree',
    visualDescription:
      'Ornate sovereign key crowned with a blazing solar-eclipse astrolabe bow, twin winged crests, and radiant starlight teeth.',
    challengeSourceLabel: 'Earned from Monthly (Hard · 1m) Challenges',
    primaryColor: '#F59E0B',
    secondaryColor: '#EF4444',
    glowColor: 'rgba(245, 158, 11, 0.55)',
  },
  {
    id: 'key-epic',
    tier: 'Epic',
    rarityOrder: 2,
    name: 'Epic Key',
    unlocksChestTier: 'Epic',
    unlocksChestName: 'Epic Chest',
    materialLabel: 'Amethyst Crystal, Rose-Gold Lacquer & Glowing Runes',
    visualDescription:
      'Crescent-moon and sakura-blossom bow inlaid with a pulsing amethyst core and etched astral runes along the shaft.',
    challengeSourceLabel: 'Earned from Weekly (Medium · 7d) 2v2 & Victory Challenges',
    primaryColor: '#D946EF',
    secondaryColor: '#8B5CF6',
    glowColor: 'rgba(217, 70, 239, 0.48)',
  },
  {
    id: 'key-rare',
    tier: 'Rare',
    rarityOrder: 3,
    name: 'Rare Key',
    unlocksChestTier: 'Rare',
    unlocksChestName: 'Rare Chest',
    materialLabel: 'Celestial Sapphire, Brushed Silver & Compass Rose',
    visualDescription:
      'Nautical compass-rose bow with a faceted sapphire cabochon, silver meridian engravings, and precision warded bit.',
    challengeSourceLabel: 'Earned from Weekly (Medium · 7d) Strategy & Solo Challenges',
    primaryColor: '#0EA5E9',
    secondaryColor: '#38BDF8',
    glowColor: 'rgba(14, 165, 233, 0.42)',
  },
  {
    id: 'key-uncommon',
    tier: 'Uncommon',
    rarityOrder: 4,
    name: 'Uncommon Key',
    unlocksChestTier: 'Uncommon',
    unlocksChestName: 'Uncommon Chest',
    materialLabel: 'Antiqued Botanical Brass & Verdigris Clover Inlay',
    visualDescription:
      'Four-leaf clover bow forged in warm botanical brass with twisted vine detailing and a double-notched bit.',
    challengeSourceLabel: 'Earned from Daily (Easy · 24h) Co-Op & Puzzle Challenges',
    primaryColor: '#10B981',
    secondaryColor: '#84CC16',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'key-common',
    tier: 'Common',
    rarityOrder: 5,
    name: 'Common Key',
    unlocksChestTier: 'Common',
    unlocksChestName: 'Common Chest',
    materialLabel: 'Hand-Forged Graphite Iron & Baker’s Twine Tag',
    visualDescription:
      'Simple, sturdy sketchbook diary key with a circular iron bow, clean single-tooth bit, and tied twine loop.',
    challengeSourceLabel: 'Earned from Daily (Easy · 24h) Chess & Pet Care Challenges',
    primaryColor: '#A8A29E',
    secondaryColor: '#78716C',
    glowColor: 'rgba(168, 162, 158, 0.25)',
  },
];

export function getKeyByTier(tier: SkinRarity): ArcadeKeyDef {
  return ARCADE_KEYS.find((k) => k.tier === tier) || ARCADE_KEYS[ARCADE_KEYS.length - 1];
}

/* ============================================================================
   5-TIER COLLECTIBLE CHEST CATALOG & DROP PROBABILITIES
   ============================================================================ */

export const DUPLICATE_COSMETIC_COIN_PAYOUT: Record<SkinRarity, number> = {
  Common: 100,
  Uncommon: 250,
  Rare: 600,
  Epic: 1500,
  Legendary: 3000,
};

export const RANKED_SHIELD_DROP_RATES: Record<SkinRarity, number> = {
  Common: 0,
  Uncommon: 0,
  Rare: 2,
  Epic: 5,
  Legendary: 10,
};

export interface ArcadeChestDef {
  id: string;
  tier: SkinRarity;
  rarityOrder: number;
  name: string;
  subtitle: string;
  description: string;
  costCoins: number;
  compatibleKeyTier: SkinRarity;
  compatibleKeyName: string;
  rarityProbabilities: Record<SkinRarity, number>; // Percentages summing to 100
  rankedShieldDropPercent: number; // 0 for Common/Uncommon, 2% Rare, 5% Epic, 10% Legendary
  openingAnimationStyle: string;
  openingAnimationDescription: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const ARCADE_CHESTS: ArcadeChestDef[] = [
  {
    id: 'chest-legendary',
    tier: 'Legendary',
    rarityOrder: 1,
    name: 'Legendary Chest',
    subtitle: 'Sovereign Solar Reliquary',
    description:
      'Gilded celestial reliquary forged in sun-gold and crimson velvet. Guarantees an Epic or Legendary cosmetic Skin or Profile Banner, with a 10% chance for a Ranked Shield Card.',
    costCoins: 1500,
    compatibleKeyTier: 'Legendary',
    compatibleKeyName: 'Legendary Key',
    rarityProbabilities: {
      Legendary: 75,
      Epic: 25,
      Rare: 0,
      Uncommon: 0,
      Common: 0,
    },
    rankedShieldDropPercent: 10,
    openingAnimationStyle: 'Solar Eclipse Levitation & Triple-Orbital Prism Draw',
    openingAnimationDescription:
      'Levitates with golden shockwaves, shatters the solar astrolabe seal into starlight, converges three orbital rings, and unveils a radiant prism card.',
    primaryColor: '#F59E0B',
    secondaryColor: '#991B1B',
    accentColor: '#FDE047',
  },
  {
    id: 'chest-epic',
    tier: 'Epic',
    rarityOrder: 2,
    name: 'Epic Chest',
    subtitle: 'Moonlit Lacquer Coffer',
    description:
      'Plum-lacquer coffer inlaid with mother-of-pearl sakura blossoms and amethyst clasps. High probability of Epic and Legendary cosmetics, plus a 5% chance for a Ranked Shield Card.',
    costCoins: 850,
    compatibleKeyTier: 'Epic',
    compatibleKeyName: 'Epic Key',
    rarityProbabilities: {
      Legendary: 12,
      Epic: 68,
      Rare: 20,
      Uncommon: 0,
      Common: 0,
    },
    rankedShieldDropPercent: 5,
    openingAnimationStyle: 'Twin Lacquer Doors & Sakura Vortex Tarot Flip',
    openingAnimationDescription:
      'Parts double lacquer doors amidst swirling sakura petals and violet comet trails, elevating a glowing tarot card with a shockwave flip.',
    primaryColor: '#D946EF',
    secondaryColor: '#581C87',
    accentColor: '#F0ABFC',
  },
  {
    id: 'chest-rare',
    tier: 'Rare',
    rarityOrder: 3,
    name: 'Rare Chest',
    subtitle: 'Starlight Astrolabe Trunk',
    description:
      'Deep sapphire navigator’s trunk bound in brushed silver and brass compass dials. Contains Rare, Epic, and Legendary Skins & Banners, plus a 2% chance for a Ranked Shield Card.',
    costCoins: 450,
    compatibleKeyTier: 'Rare',
    compatibleKeyName: 'Rare Key',
    rarityProbabilities: {
      Legendary: 3,
      Epic: 17,
      Rare: 65,
      Uncommon: 15,
      Common: 0,
    },
    rankedShieldDropPercent: 2,
    openingAnimationStyle: '180° Compass Lock Rotation & Sapphire Beam Spiral',
    openingAnimationDescription:
      'Rotates the brass compass dial 180°, projects a sapphire meridian beam, and spirals the drawn card to center stage.',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0C4A6E',
    accentColor: '#7DD3FC',
  },
  {
    id: 'chest-uncommon',
    tier: 'Uncommon',
    rarityOrder: 4,
    name: 'Uncommon Chest',
    subtitle: 'Botanical Conservatory Satchel',
    description:
      'Cedarwood herbarium box clasped with antiqued brass clover hardware and sage linen straps.',
    costCoins: 220,
    compatibleKeyTier: 'Uncommon',
    compatibleKeyName: 'Uncommon Key',
    rarityProbabilities: {
      Legendary: 0,
      Epic: 3,
      Rare: 17,
      Uncommon: 50,
      Common: 30,
    },
    rankedShieldDropPercent: 0,
    openingAnimationStyle: 'Botanical Clasp Snap & Leaf Burst Card Lift',
    openingAnimationDescription:
      'Snaps open the brass clover clasp with a burst of botanical leaves and lifts the reward card in a crisp vertical arc.',
    primaryColor: '#10B981',
    secondaryColor: '#064E3B',
    accentColor: '#6EE7B7',
  },
  {
    id: 'chest-common',
    tier: 'Common',
    rarityOrder: 5,
    name: 'Common Chest',
    subtitle: 'Sketchbook Keepsake Parcel',
    description:
      'Cozy archival parcel wrapped in kraft paper and baker’s twine. A welcoming way to collect Common, Uncommon, and Rare keepsakes.',
    costCoins: 100,
    compatibleKeyTier: 'Common',
    compatibleKeyName: 'Common Key',
    rarityProbabilities: {
      Legendary: 0,
      Epic: 0,
      Rare: 5,
      Uncommon: 25,
      Common: 70,
    },
    rankedShieldDropPercent: 0,
    openingAnimationStyle: 'Twine Untie & Sketchbook Card Slide',
    openingAnimationDescription:
      'Unties the baker’s twine bow, unfolds the kraft parcel flaps, and smoothly slides out a hand-stamped keepsake card.',
    primaryColor: '#A8A29E',
    secondaryColor: '#44403C',
    accentColor: '#E7E5E4',
  },
];

export function getChestByTier(tier: SkinRarity): ArcadeChestDef {
  return ARCADE_CHESTS.find((c) => c.tier === tier) || ARCADE_CHESTS[ARCADE_CHESTS.length - 1];
}

export interface ChestRewardPoolItem {
  id: string;
  name: string;
  category: 'skin' | 'banner' | 'consumable';
  rarity: SkinRarity;
  emblem: string;
  description: string;
}

export function getRewardPoolForChest(chestTier: SkinRarity): ChestRewardPoolItem[] {
  const chest = getChestByTier(chestTier);
  const eligibleRarities = SKIN_RARITY_ORDER.filter(
    (r) => (chest.rarityProbabilities[r] || 0) > 0
  );

  const skinItems: ChestRewardPoolItem[] = ARCADE_SKINS.filter(
    (s) =>
      s.acquisitionSource !== 'starter' &&
      eligibleRarities.includes(s.rarity)
  ).map((s) => ({
    id: s.id,
    name: s.name,
    category: 'skin' as const,
    rarity: s.rarity,
    emblem: s.emblem,
    description: s.description,
  }));

  // Also include starter/common skins if Common rarity is in pool so Common tier has both skins & banners
  const commonSkins: ChestRewardPoolItem[] = eligibleRarities.includes('Common')
    ? ARCADE_SKINS.filter((s) => s.rarity === 'Common').map((s) => ({
        id: s.id,
        name: s.name,
        category: 'skin' as const,
        rarity: s.rarity,
        emblem: s.emblem,
        description: s.description,
      }))
    : [];

  const bannerItems: ChestRewardPoolItem[] = ARCADE_BANNERS.filter((b) =>
    eligibleRarities.includes(b.rarity)
  ).map((b) => ({
    id: b.id,
    name: b.name,
    category: 'banner' as const,
    rarity: b.rarity,
    emblem: b.emblem,
    description: b.description,
  }));

  const consumableItems: ChestRewardPoolItem[] =
    chest.rankedShieldDropPercent > 0
      ? [
          {
            id: 'ranked-shield-card',
            name: `Ranked Shield Card (${chest.rankedShieldDropPercent}% Drop)`,
            category: 'consumable' as const,
            rarity: chest.tier,
            emblem: '🛡️✨',
            description:
              'Protects you from losing XP on your next 2v2 Couple Mode loss when pre-equipped in the 2v2 lobby.',
          },
        ]
      : [];

  const deduped = new Map<string, ChestRewardPoolItem>();
  for (const item of [...consumableItems, ...skinItems, ...commonSkins, ...bannerItems]) {
    deduped.set(`${item.category}:${item.id}`, item);
  }
  return Array.from(deduped.values());
}

export type TierCountMap = Record<SkinRarity, number>;

export const EMPTY_TIER_COUNT_MAP: TierCountMap = {
  Legendary: 0,
  Epic: 0,
  Rare: 0,
  Uncommon: 0,
  Common: 0,
};

export function parseTierCountMap(raw: unknown): TierCountMap {
  if (!raw) return { ...EMPTY_TIER_COUNT_MAP };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_TIER_COUNT_MAP };
    return {
      Legendary: Math.max(0, Number((parsed as Record<string, unknown>).Legendary) || 0),
      Epic: Math.max(0, Number((parsed as Record<string, unknown>).Epic) || 0),
      Rare: Math.max(0, Number((parsed as Record<string, unknown>).Rare) || 0),
      Uncommon: Math.max(0, Number((parsed as Record<string, unknown>).Uncommon) || 0),
      Common: Math.max(0, Number((parsed as Record<string, unknown>).Common) || 0),
    };
  } catch {
    return { ...EMPTY_TIER_COUNT_MAP };
  }
}
