// Seeded deterministic & rule-valid game randomization engine for Her Little Arcade.
// Every game session (single-player or multiplayer) receives a fresh seed.
// Chess is explicitly excluded from starting-position randomization and always uses the official FIDE starting FEN.

export const OFFICIAL_CHESS_STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Generates a fresh 32-bit positive integer seed for a new game session.
 * Safe to call inside event handlers, room creation, rematch handlers, and backend API routes.
 */
export function generateFreshGameSeed(entropySalt = 0): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    const val = (buf[0] ^ (entropySalt & 0xffffffff)) >>> 0;
    return val === 0 ? 104729 : val;
  }
  const fallback = ((Date.now() & 0x7fffffff) ^ ((entropySalt + 1) * 2654435761)) >>> 0;
  return fallback === 0 ? 104729 : fallback;
}

/**
 * Mulberry32 deterministic PRNG: given a numeric seed, returns a function producing [0, 1).
 * Ensures both multiplayer clients sharing a room seed generate the exact same valid board layout.
 */
export function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 104729;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates deterministic shuffle using a seeded PRNG.
 * Guarantees a non-identity permutation when array length > 1.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  if (arr.length <= 1) return arr;
  const rng = createSeededRng(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  // Ensure we don't accidentally leave the array in its original unshuffled order
  const isIdentical = arr.every((val, idx) => val === items[idx]);
  if (isIdentical && arr.length >= 2) {
    const first = arr[0];
    arr[0] = arr[1];
    arr[1] = first;
  }
  return arr;
}

/**
 * 1. Memory Match: Shuffles 8 pairs of cards (16 cards total) into a fresh layout for every game session.
 */
export interface MemoryCardItemSpec {
  id: number;
  pairKey: string;
  label: string;
  symbol: string;
  isCustom?: boolean;
  flipped: boolean;
  matched: boolean;
}

const DEFAULT_MEMORY_PAIRS: Array<{ pairKey: string; label: string; symbol: string }> = [
  { pairKey: 'kitsune', label: 'Kitsune Mask', symbol: '🦊' },
  { pairKey: 'lantern', label: 'Starlight Lantern', symbol: '🏮' },
  { pairKey: 'matcha', label: 'Matcha Parfait', symbol: '🍵' },
  { pairKey: 'sakura', label: 'Cherry Blossom', symbol: '🌸' },
  { pairKey: 'crescent', label: 'Velvet Moon', symbol: '🌙' },
  { pairKey: 'vinyl', label: 'Lo-Fi Record', symbol: '💿' },
  { pairKey: 'origami', label: 'Paper Crane', symbol: '🦢' },
  { pairKey: 'polaroid', label: 'Shared Keepsake', symbol: '📸' },
];

export function generateMemoryMatchDeck(
  seed: number,
  customPhotoTitle?: string
): MemoryCardItemSpec[] {
  const basePairs = DEFAULT_MEMORY_PAIRS.map((p, idx) =>
    idx === 7 && customPhotoTitle
      ? {
          pairKey: 'custom-photo',
          label: customPhotoTitle,
          symbol: '🖼️',
          isCustom: true,
        }
      : { ...p, isCustom: false }
  );

  const doubled = [...basePairs, ...basePairs];
  const shuffled = seededShuffle(doubled, seed);
  return shuffled.map((item, idx) => ({
    id: idx + 1,
    pairKey: item.pairKey,
    label: item.label,
    symbol: item.symbol,
    isCustom: item.isCustom,
    flipped: false,
    matched: false,
  }));
}

/**
 * 2. 2048 Puzzle: Generates an empty 4x4 grid and spawns 2 initial tiles (2 or 4)
 * at randomized distinct coordinates.
 */
export function generateInitial2048Grid(seed: number): number[][] {
  const rng = createSeededRng(seed);
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0));
  const firstIdx = Math.floor(rng() * 16);
  let secondIdx = Math.floor(rng() * 15);
  if (secondIdx >= firstIdx) secondIdx += 1;

  const val1 = rng() < 0.85 ? 2 : 4;
  const val2 = rng() < 0.85 ? 2 : 4;

  grid[Math.floor(firstIdx / 4)][firstIdx % 4] = val1;
  grid[Math.floor(secondIdx / 4)][secondIdx % 4] = val2;
  return grid;
}

/**
 * 3. Bubble Shooter: Generates randomized valid bubble color rows (0..colorCount-1 or null).
 */
export function generateBubbleShooterGrid(
  rows = 10,
  cols = 11,
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium',
  seed = 104729
): (number | null)[][] {
  const rng = createSeededRng(seed);
  const colorCount = difficulty === 'Easy' ? 4 : 5;
  const filledRows = difficulty === 'Hard' ? 5 : 4;
  const grid: (number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: (number | null)[] = [];
    for (let c = 0; c < cols; c++) {
      if (r < filledRows) {
        row.push(Math.floor(rng() * colorCount));
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
}

/**
 * 4. Sudoku: Generates a fresh valid 9x9 Sudoku solution via digit permutation,
 * band/stack shuffles, and transposition, then masks cells according to difficulty.
 */
const BASE_SUDOKU_SOLUTION: number[][] = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

export function generateSudokuBoard(
  difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium',
  seed = 104729
): { board: number[][]; solution: number[][]; fixed: boolean[][] } {
  const rng = createSeededRng(seed);
  // 1. Permute digits 1..9
  const digitMap = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], seed + 11);
  let fullBoard = BASE_SUDOKU_SOLUTION.map((row) => row.map((val) => digitMap[val - 1]));

  // 2. Shuffle rows within each 3-row band
  for (let band = 0; band < 3; band++) {
    const rowOrder = seededShuffle([0, 1, 2], seed + 31 + band * 17);
    const bandRows = [
      fullBoard[band * 3],
      fullBoard[band * 3 + 1],
      fullBoard[band * 3 + 2],
    ];
    fullBoard[band * 3] = bandRows[rowOrder[0]];
    fullBoard[band * 3 + 1] = bandRows[rowOrder[1]];
    fullBoard[band * 3 + 2] = bandRows[rowOrder[2]];
  }

  // 3. Shuffle columns within each 3-column stack
  for (let stack = 0; stack < 3; stack++) {
    const colOrder = seededShuffle([0, 1, 2], seed + 79 + stack * 23);
    fullBoard = fullBoard.map((row) => {
      const nextRow = [...row];
      const stackCols = [row[stack * 3], row[stack * 3 + 1], row[stack * 3 + 2]];
      nextRow[stack * 3] = stackCols[colOrder[0]];
      nextRow[stack * 3 + 1] = stackCols[colOrder[1]];
      nextRow[stack * 3 + 2] = stackCols[colOrder[2]];
      return nextRow;
    });
  }

  // 4. Optional transpose
  if (rng() > 0.5) {
    fullBoard = fullBoard[0].map((_, cIdx) => fullBoard.map((row) => row[cIdx]));
  }

  const solution = fullBoard.map((r) => [...r]);

  // 5. Mask cells according to difficulty while ensuring every row/col retains anchors
  const hideRate = difficulty === 'Easy' ? 0.34 : difficulty === 'Medium' ? 0.48 : 0.58;
  const coords = seededShuffle(
    Array.from({ length: 81 }, (_, i) => i),
    seed + 199
  );
  const targetBlanks = Math.floor(81 * hideRate);
  const blankSet = new Set(coords.slice(0, targetBlanks));

  const board = solution.map((row, rIdx) =>
    row.map((val, cIdx) => (blankSet.has(rIdx * 9 + cIdx) ? 0 : val))
  );
  const fixed = board.map((row) => row.map((val) => val !== 0));

  return { board, solution, fixed };
}

/**
 * 5. Battleship: Places 5 standard naval vessels (lengths 5, 4, 3, 3, 2 = 17 cells)
 * onto a 10x10 grid with randomized orientation and non-overlapping coordinates.
 */
export interface BattleshipVesselPlacement {
  id: string;
  name: string;
  size: number;
  coords: [number, number][];
  cells: number[];
}

export function generateBattleshipFleet(seed: number): BattleshipVesselPlacement[] {
  const rng = createSeededRng(seed);
  const specs = [
    { id: 'carrier', name: 'Carrier (5)', size: 5 },
    { id: 'battleship', name: 'Battleship (4)', size: 4 },
    { id: 'cruiser', name: 'Cruiser (3)', size: 3 },
    { id: 'submarine', name: 'Submarine (3)', size: 3 },
    { id: 'destroyer', name: 'Destroyer (2)', size: 2 },
  ];

  const occupied = new Set<number>();
  const vessels: BattleshipVesselPlacement[] = [];

  for (const spec of specs) {
    let placed = false;
    for (let attempt = 0; attempt < 250 && !placed; attempt++) {
      const horizontal = rng() < 0.5;
      const maxRow = horizontal ? 10 : 10 - spec.size + 1;
      const maxCol = horizontal ? 10 - spec.size + 1 : 10;
      const r = Math.floor(rng() * maxRow);
      const c = Math.floor(rng() * maxCol);

      const candidateCells: number[] = [];
      const candidateCoords: [number, number][] = [];
      let conflict = false;
      for (let k = 0; k < spec.size; k++) {
        const nr = horizontal ? r : r + k;
        const nc = horizontal ? c + k : c;
        const cell = nr * 10 + nc;
        if (occupied.has(cell)) {
          conflict = true;
          break;
        }
        candidateCells.push(cell);
        candidateCoords.push([nr, nc]);
      }

      if (!conflict) {
        candidateCells.forEach((cell) => occupied.add(cell));
        vessels.push({
          id: spec.id,
          name: spec.name,
          size: spec.size,
          coords: candidateCoords,
          cells: candidateCells,
        });
        placed = true;
      }
    }
  }

  return vessels;
}

/**
 * 6. Word Battle: Selects a randomized 7-letter pangram rack and shuffles outer letters.
 */
const WORD_BATTLE_RACK_POOLS: Array<{ letters: string[]; center: string }> = [
  { letters: ['S', 'T', 'A', 'R', 'L', 'I', 'N'], center: 'A' },
  { letters: ['P', 'A', 'I', 'N', 'T', 'E', 'R'], center: 'E' },
  { letters: ['G', 'A', 'R', 'D', 'E', 'N', 'S'], center: 'R' },
  { letters: ['C', 'R', 'Y', 'S', 'T', 'A', 'L'], center: 'A' },
  { letters: ['L', 'A', 'N', 'T', 'E', 'R', 'S'], center: 'E' },
  { letters: ['M', 'E', 'L', 'O', 'D', 'I', 'C'], center: 'O' },
];

export function generateWordBattleRack(seed: number): { rack: string[]; center: string } {
  const rng = createSeededRng(seed);
  const chosen = WORD_BATTLE_RACK_POOLS[Math.floor(rng() * WORD_BATTLE_RACK_POOLS.length)];
  const outer = chosen.letters.filter((l) => l !== chosen.center);
  const shuffledOuter = seededShuffle(outer, seed + 41);
  return {
    rack: [
      shuffledOuter[0],
      shuffledOuter[1],
      chosen.center,
      shuffledOuter[2],
      shuffledOuter[3],
      shuffledOuter[4],
      shuffledOuter[5],
    ],
    center: chosen.center,
  };
}

/**
 * 7. Tic-Tac-Toe & Connect Four: Keep board empty and randomize starting player.
 */
export function getRandomStartingTurnSymbol(seed: number): 'X' | 'O' {
  const rng = createSeededRng(seed);
  return rng() < 0.5 ? 'X' : 'O';
}

export function getRandomStartingPlayerNumber(seed: number): 1 | 2 {
  const rng = createSeededRng(seed);
  return rng() < 0.5 ? 1 : 2;
}

/**
 * 7. Jigsaw Puzzle: Shuffles 0..8 into a guaranteed non-solved permutation.
 */
export function generateJigsawTileOrder(seed: number, tileCount = 9): number[] {
  const base = Array.from({ length: tileCount }, (_, i) => i);
  return seededShuffle(base, seed);
}

/**
 * 8. Treasure Hunt: Selects 3 distinct random coordinates on the 6x6 archipelago grid.
 */
export function generateTreasureRelicCoords(
  seed: number,
  gridSize = 36,
  relicCount = 3
): Array<[number, number]> {
  const allIndices = Array.from({ length: gridSize }, (_, i) => i);
  const shuffled = seededShuffle(allIndices, seed);
  return shuffled.slice(0, relicCount).map((idx) => [Math.floor(idx / 6), idx % 6]);
}

/**
 * 9. Escape the Maze: Generates randomized valid key & gate coordinates on open floor cells.
 */
export function generateMazeKeyPositions(seed: number): Array<[number, number]> {
  const openCandidates: Array<[number, number]> = [
    [0, 3],
    [1, 2],
    [1, 4],
    [2, 1],
    [2, 3],
    [3, 1],
    [3, 2],
    [4, 1],
  ];
  return seededShuffle(openCandidates, seed);
}

/**
 * 10. Higher or Lower: Generates a shuffled deck of tarot/numbered cards (1..13) with a random starting card.
 */
export function generateHigherLowerStartingCard(seed: number): number {
  const rng = createSeededRng(seed);
  return Math.floor(rng() * 13) + 1;
}
