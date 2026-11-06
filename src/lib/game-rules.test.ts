import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyGameCatalogCounts,
  calculateLevelFromXp,
  computeInitialChessTimeMs,
  applyChessIncrementMs,
  formatChessClock,
  checkTicTacToeWinner,
  dropConnectFourDisc,
  checkConnectFourWinner,
  move2048Grid,
  scoreWordBattleSubmission,
} from './game-rules';

test('arcade game catalog has exactly 7 single-player and 14 multiplayer games (21 total) and excludes Reversi/Checkers', () => {
  const counts = verifyGameCatalogCounts();
  assert.equal(counts.singleCount, 7);
  assert.equal(counts.multiCount, 14);
  assert.equal(counts.totalCount, 21);
  assert.equal(counts.hasReversiOrCheckers, false);
});

test('XP and level progression calculates accurately', () => {
  const lvl1 = calculateLevelFromXp(150);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.currentLevelXp, 150);
  assert.equal(lvl1.progressPercent, 75);

  const lvl3 = calculateLevelFromXp(450);
  assert.equal(lvl3.level, 3);
  assert.equal(lvl3.currentLevelXp, 50);
});

test('Custom chess time control supports starting minutes, extra seconds, and move increment', () => {
  // 5 minutes + 0 extra seconds = 300,000ms
  const startMs = computeInitialChessTimeMs({ minutes: 5, extraSeconds: 0, incrementSeconds: 3 });
  assert.equal(startMs, 300000);
  assert.equal(formatChessClock(startMs, false), '05:00');

  // After 4 seconds spent, +3 seconds increment applied => 299,000ms (04:59)
  const afterMove = applyChessIncrementMs(startMs - 4000, 3, false);
  assert.equal(afterMove, 299000);
  assert.equal(formatChessClock(afterMove, false), '04:59');
});

test('Tic-Tac-Toe winner and draw detection works', () => {
  const winBoard = ['X', 'X', 'X', 'O', 'O', null, null, null, null] as const;
  const res = checkTicTacToeWinner([...winBoard]);
  assert.equal(res.winner, 'X');
  assert.deepEqual(res.line, [0, 1, 2]);
});

test('Connect Four gravity drop and 4-in-a-row detection works', () => {
  let grid = Array.from({ length: 6 }, () => Array(7).fill(0));
  for (let c = 0; c < 4; c++) {
    const step = dropConnectFourDisc(grid, c, 1);
    assert.ok(step);
    grid = step.nextGrid;
  }
  assert.equal(checkConnectFourWinner(grid), 1);
});

test('2048 slide and merge combines matching tiles once per turn', () => {
  const initial = [
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  const { nextGrid, scoreDelta, moved } = move2048Grid(initial, 'left');
  assert.equal(moved, true);
  assert.equal(scoreDelta, 12);
  assert.deepEqual(nextGrid[0], [4, 8, 0, 0]);
});

test('Word Battle validates center letter and scores accurately', () => {
  const rack = ['S', 'T', 'A', 'R', 'L', 'I', 'T'];
  const valid = scoreWordBattleSubmission('STAR', rack, 'A');
  assert.equal(valid.valid, true);
  assert.equal(valid.points, 60);

  const missingCenter = scoreWordBattleSubmission('SLIT', rack, 'A');
  assert.equal(missingCenter.valid, false);
});

import {
  OFFICIAL_CHESS_STARTING_FEN,
  generateMemoryMatchDeck,
  generateInitial2048Grid,
  generateBubbleShooterGrid,
  generateSudokuBoard,
  generateBattleshipFleet,
  generateWordBattleRack,
  generateJigsawTileOrder,
} from './game-randomizer';
import {
  SINGLE_PLAYER_GAMES,
  MULTIPLAYER_GAMES,
  RENAME_CARD_COST_COINS,
  TROPHY_ROAD_MILESTONES,
} from './arcade-data';

test('Chess always starts from standard official starting position and never randomizes', () => {
  assert.equal(
    OFFICIAL_CHESS_STARTING_FEN,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );
});

test('All non-Chess games generate fresh valid randomized starting positions per seed and synchronize identically for same seed', () => {
  const deckA = generateMemoryMatchDeck(101);
  const deckA2 = generateMemoryMatchDeck(101);
  const deckB = generateMemoryMatchDeck(99991);
  assert.deepEqual(
    deckA.map((c) => c.pairKey),
    deckA2.map((c) => c.pairKey)
  );
  assert.notDeepEqual(
    deckA.map((c) => c.pairKey),
    deckB.map((c) => c.pairKey)
  );

  // Sudoku validity: every row and column in solution has digits 1..9
  const sudoku1 = generateSudokuBoard('Medium', 4242);
  const sudoku2 = generateSudokuBoard('Medium', 8888);
  assert.notDeepEqual(sudoku1.solution, sudoku2.solution);
  for (let r = 0; r < 9; r++) {
    const rowDigits = new Set(sudoku1.solution[r]);
    assert.equal(rowDigits.size, 9);
  }

  // Battleship validity: 5 vessels totaling 17 non-overlapping cells
  const fleet1 = generateBattleshipFleet(12345);
  const fleet2 = generateBattleshipFleet(67890);
  assert.equal(fleet1.length, 5);
  const uniqueCells1 = new Set(fleet1.flatMap((v) => v.cells));
  assert.equal(uniqueCells1.size, 17);
  assert.notDeepEqual(
    fleet1.flatMap((v) => v.cells),
    fleet2.flatMap((v) => v.cells)
  );

  // 2048 initial grid has exactly 2 non-zero tiles
  const grid2048 = generateInitial2048Grid(555);
  const nonZeroCount = grid2048.flat().filter((v) => v > 0).length;
  assert.equal(nonZeroCount, 2);

  // Bubble shooter & Word Battle & Jigsaw
  const bubbles = generateBubbleShooterGrid(10, 11, 'Medium', 777);
  assert.equal(bubbles.length, 10);
  const wordRack = generateWordBattleRack(333);
  assert.equal(wordRack.rack.length, 7);
  assert.ok(wordRack.rack.includes(wordRack.center));
  const jigsaw = generateJigsawTileOrder(444, 9);
  assert.equal(jigsaw.length, 9);
  assert.notDeepEqual(jigsaw, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
});

test('Economy rules enforce 0 base coins on solo/1v1-only catalog, 10,000-coin Rename Card, and 2v2 Couple Trophy Road', () => {
  assert.equal(RENAME_CARD_COST_COINS, 10000);
  assert.ok(SINGLE_PLAYER_GAMES.every((g) => g.coinReward === 0));
  assert.ok(
    MULTIPLAYER_GAMES.filter((g) => !g.supports2v2).every((g) => g.coinReward === 0)
  );
  assert.ok(
    MULTIPLAYER_GAMES.filter((g) => g.supports2v2).every((g) => g.coinReward >= 20 && g.coinReward <= 28)
  );
  assert.equal(TROPHY_ROAD_MILESTONES.length, 7);
  assert.equal(TROPHY_ROAD_MILESTONES[0].trophiesRequired, 100);
  assert.equal(TROPHY_ROAD_MILESTONES[6].trophiesRequired, 3000);
});

