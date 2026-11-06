'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MULTIPLAYER_GAMES,
  KEEPSAKE_PICNIC_IMAGE,
  TREASURE_MAP_IMAGE,
} from '@/src/lib/arcade-data';
import {
  TicTacToeCell,
  checkTicTacToeWinner,
  ConnectFourCell,
  dropConnectFourDisc,
  checkConnectFourWinnerWithLine,
  scoreWordBattleSubmission,
} from '@/src/lib/game-rules';
import {
  generateFreshGameSeed,
  seededShuffle,
  getRandomStartingTurnSymbol,
  getRandomStartingPlayerNumber,
  generateBattleshipFleet,
  generateWordBattleRack,
  generateHigherLowerStartingCard,
  generateMazeKeyPositions,
  generateJigsawTileOrder,
  generateTreasureRelicCoords,
} from '@/src/lib/game-randomizer';
import { PersonalizedItemRecord } from './SinglePlayerGames';
import { soundFX } from '@/src/lib/sound';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Eraser,
  Compass,
  UtensilsCrossed,
  Flame,
  Music,
  Shield,
  Crosshair,
  Sparkles,
  Shuffle,
} from 'lucide-react';

import { RoomCoupleTeam } from './VoiceAndLobbyDock';

interface MultiplayerGamesProps {
  gameId: string;
  playerName: string;
  partnerName: string;
  roomMode?: '1v1' | '2v2';
  roomTeams?: RoomCoupleTeam[];
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  autostart?: boolean;
  personalizedItems: PersonalizedItemRecord[];
  onBackToArcade: () => void;
  onMatchFinished: (
    gameId: string,
    mode: string,
    result: 'win' | 'loss' | 'draw' | 'completed',
    score: number,
    xpEarned: number,
    coinsEarned: number,
    details?: Record<string, unknown>
  ) => void;
}

export function MultiplayerGameArena({
  gameId,
  playerName,
  partnerName,
  roomMode = '1v1',
  roomTeams = [],
  roomGameState,
  onSyncRoomGameState,
  autostart = false,
  personalizedItems,
  onBackToArcade,
  onMatchFinished,
}: MultiplayerGamesProps) {
  const gameDef =
    MULTIPLAYER_GAMES.find((g) => g.id === gameId) || MULTIPLAYER_GAMES[0];

  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [selectedMatchMode, setSelectedMatchMode] = useState<'1v1' | '2v2'>(
    gameDef.supports2v2 && roomMode === '2v2' ? '2v2' : '1v1'
  );
  const effectiveMode: '1v1' | '2v2' =
    gameDef.supports2v2 && selectedMatchMode === '2v2' ? '2v2' : '1v1';

  const [score, setScore] = useState<number>(0);
  const [partnerScore, setPartnerScore] = useState<number>(0);
  const [localSeed, setLocalSeed] = useState<number>(208411);
  const [lastResult, setLastResult] = useState<'win' | 'loss' | 'draw' | 'completed'>('win');
  const [outcomeText, setOutcomeText] = useState<string>('Match Complete!');
  const [musicActive, setMusicActive] = useState<boolean>(soundFX.musicEnabled);

  const sessionSeed = Number(roomGameState?.sessionSeed || localSeed);

  const team1Name =
    roomTeams[0]?.coupleName || `${playerName} & ${partnerName}`;
  const team2Name =
    roomTeams[1]?.coupleName || 'Challenger Couple';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  function finishMatch(
    result: 'win' | 'loss' | 'draw' | 'completed',
    finalScore: number,
    summaryText: string,
    details?: Record<string, unknown>
  ) {
    setScore(finalScore);
    setLastResult(result);
    setOutcomeText(summaryText);
    setShellState('gameover');
    soundFX.playFanfare();
    const recordedMode =
      effectiveMode === '2v2'
        ? '2v2_couple'
        : gameDef.category === 'cooperative'
        ? 'cooperative'
        : '1v1';
    const earnedXp =
      effectiveMode === '2v2' ? gameDef.xpReward + 10 : gameDef.xpReward;
    const earnedCoins =
      effectiveMode === '2v2'
        ? result === 'win' || result === 'completed'
          ? 25
          : result === 'draw'
          ? 12
          : 8
        : 0;
    onMatchFinished(
      gameDef.id,
      recordedMode,
      result,
      finalScore,
      earnedXp,
      earnedCoins,
      {
        ...details,
        sessionSeed,
        matchMode: effectiveMode,
        team1: effectiveMode === '2v2' ? team1Name : playerName,
        team2: effectiveMode === '2v2' ? team2Name : partnerName,
        team1Score: finalScore,
        team2Score: partnerScore,
      }
    );
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 text-stone-100">
      {/* Unified Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToArcade}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Arcade Hub</span>
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-100">
              {gameDef.title}
            </h2>
            <p className="text-xs text-stone-400">
              {effectiveMode === '2v2' ? '2v2 Couple Mode' : '1v1 Mode'} · {gameDef.category} ·{' '}
              {effectiveMode === '2v2'
                ? `${team1Name} vs ${team2Name}`
                : `${playerName} & ${partnerName}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-1.5 font-mono text-xs tabular-nums">
            <span>
              {effectiveMode === '2v2' ? team1Name : playerName}:{' '}
              <strong className="text-amber-300">{score}</strong>
            </span>
            <span aria-hidden="true" className="text-stone-700">
              ·
            </span>
            <span>
              {effectiveMode === '2v2' ? team2Name : partnerName}:{' '}
              <strong className="text-teal-300">{partnerScore}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMusicActive(soundFX.toggleMusic())}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${
              musicActive
                ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                : 'border-stone-700 bg-stone-950 text-stone-400'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>{musicActive ? 'BGM ON' : 'BGM OFF'}</span>
          </button>

          {shellState === 'playing' && (
            <button
              type="button"
              onClick={() => setShellState('paused')}
              aria-label="Pause Multiplayer Game"
              className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-800 whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* 2v2 COUPLE TEAMS BANNER */}
      {effectiveMode === '2v2' && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-rose-500/30 bg-stone-950/90 p-3 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold text-amber-300">Couple Team 1</div>
              <div className="font-bold text-stone-100">{team1Name}</div>
              <div className="text-[11px] text-stone-400">
                🦊 {playerName} &amp; 🐱 {partnerName}
              </div>
            </div>
            <div className="font-mono text-base font-bold text-amber-300 tabular-nums">
              {score} pts
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold text-teal-300">Couple Team 2</div>
              <div className="font-bold text-stone-100">{team2Name}</div>
              <div className="text-[11px] text-stone-400">
                {roomTeams[1]?.members?.length
                  ? roomTeams[1].members.map((m) => m.username).join(' & ')
                  : 'Paired Couple Slot 2'}
              </div>
            </div>
            <div className="font-mono text-base font-bold text-teal-300 tabular-nums">
              {partnerScore} pts
            </div>
          </div>
        </div>
      )}

      {/* TITLE STAGE */}
      {shellState === 'title' && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-6 text-center">
          <svg
            className="h-14 w-14 text-teal-400"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="24"
              cy="32"
              r="14"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(20,184,166,0.1)"
            />
            <circle
              cx="40"
              cy="32"
              r="14"
              stroke="#F59E0B"
              strokeWidth="2.5"
              fill="rgba(245,158,11,0.1)"
            />
          </svg>
          <h3 className="mt-4 text-2xl font-bold tracking-tight text-stone-100">
            {gameDef.title}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-400">
            {gameDef.rulesSummary}
          </p>

          {gameDef.supports2v2 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 p-1">
              <button
                type="button"
                onClick={() => setSelectedMatchMode('1v1')}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                  effectiveMode === '1v1'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                1v1 Mode (Individual)
              </button>
              <button
                type="button"
                onClick={() => setSelectedMatchMode('2v2')}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                  effectiveMode === '2v2'
                    ? 'bg-rose-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-100'
                }`}
              >
                2v2 Couple Mode (Team vs Team)
              </button>
            </div>
          )}

          <button
            type="button"
            data-start="true"
            onClick={() => {
              const freshSeed = generateFreshGameSeed();
              setLocalSeed(freshSeed);
              if (onSyncRoomGameState) {
                onSyncRoomGameState({
                  sessionSeed: freshSeed,
                  tttBoard: null,
                  c4Grid: null,
                });
              }
              setScore(0);
              setPartnerScore(0);
              setShellState('playing');
              soundFX.playSuccess();
            }}
            className="mt-6 flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              Start {effectiveMode === '2v2' ? '2v2 Couple Match' : '1v1 Multiplayer Session'}
            </span>
          </button>

          <p className="mt-4 text-xs text-stone-500">
            {gameDef.controlsHint} ·{' '}
            {effectiveMode === '2v2'
              ? `2v2 Rewards: +${gameDef.xpReward + 10} XP, +25 Coins & +30 Couple Trophies`
              : `1v1 Rewards: +${gameDef.xpReward} XP · 0 Coins (Coins & Trophies are exclusive to 2v2)`}
          </p>
        </div>
      )}

      {/* ACTIVE GAMEPLAY ROUTER */}
      {shellState !== 'title' && (
        <div className="min-h-[420px]">
          {gameDef.id === 'tic-tac-toe' && (
            <TicTacToeDuel
              key={`ttt-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              roomGameState={roomGameState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'connect-four' && (
            <ConnectFourDuel
              key={`c4-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              roomGameState={roomGameState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'battleship' && (
            <BattleshipDuel
              key={`battleship-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              roomGameState={roomGameState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'draw-and-guess' && (
            <DrawAndGuessParty
              key={`draw-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'quiz-battle' && (
            <QuizBattleDuel
              key={`quiz-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              personalizedItems={personalizedItems}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'word-battle' && (
            <WordBattleDuel
              key={`word-${sessionSeed}`}
              sessionSeed={sessionSeed}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'reaction-race' && (
            <ReactionRaceDuel
              key={`reaction-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'truth-or-dare' && (
            <TruthOrDareParty
              key={`tod-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              personalizedItems={personalizedItems}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'higher-or-lower' && (
            <HigherOrLowerDuel
              key={`hol-${sessionSeed}`}
              sessionSeed={sessionSeed}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'escape-the-maze' && (
            <EscapeTheMazeCoop
              key={`maze-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'cooking-together' && (
            <CookingTogetherCoop
              key={`cooking-${sessionSeed}`}
              sessionSeed={sessionSeed}
              playerName={playerName}
              partnerName={partnerName}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'jigsaw-puzzle' && (
            <JigsawPuzzleCoop
              key={`jigsaw-${sessionSeed}`}
              sessionSeed={sessionSeed}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'treasure-hunt' && (
            <TreasureHuntCoop
              key={`treasure-${sessionSeed}`}
              sessionSeed={sessionSeed}
              onScores={(s1, s2) => {
                setScore(s1);
                setPartnerScore(s2);
              }}
              onFinish={finishMatch}
            />
          )}
        </div>
      )}

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-stone-100">{gameDef.title} Paused</h3>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Resume Match
              </button>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200"
              >
                Restart Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {shellState === 'gameover' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold text-amber-300">{outcomeText}</h3>
            <p className="mt-1 text-xs text-stone-400">{gameDef.title}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 font-mono text-xs tabular-nums sm:grid-cols-4">
              <div>
                <div className="text-stone-500">SCORE</div>
                <div className="mt-1 text-base font-bold text-stone-100">{score}</div>
              </div>
              <div>
                <div className="text-stone-500">XP EARNED</div>
                <div className="mt-1 text-base font-bold text-amber-400">
                  +{effectiveMode === '2v2' ? gameDef.xpReward + 10 : gameDef.xpReward}
                </div>
              </div>
              <div>
                <div className="text-stone-500">2v2 COINS</div>
                <div className="mt-1 text-xs font-bold text-teal-400">
                  {effectiveMode === '2v2'
                    ? lastResult === 'win' || lastResult === 'completed'
                      ? '+25 Coins'
                      : lastResult === 'draw'
                      ? '+12 Coins'
                      : '+8 Coins'
                    : '0 (2v2 Only)'}
                </div>
              </div>
              <div>
                <div className="text-stone-500">TROPHIES</div>
                <div className="mt-1 text-xs font-bold text-rose-300">
                  {effectiveMode === '2v2'
                    ? lastResult === 'win' || lastResult === 'completed'
                      ? '+30 🏆'
                      : lastResult === 'draw'
                      ? '+6 🏆'
                      : '-15 🏆'
                    : '0 (2v2 Only)'}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  const freshSeed = generateFreshGameSeed();
                  setLocalSeed(freshSeed);
                  if (onSyncRoomGameState) {
                    onSyncRoomGameState({
                      sessionSeed: freshSeed,
                      tttBoard: null,
                      c4Grid: null,
                    });
                  }
                  setScore(0);
                  setShellState('playing');
                }}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Rematch Together (Fresh Board)
              </button>
              <button
                type="button"
                onClick={onBackToArcade}
                className="flex-1 rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
              >
                Arcade Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   1. TIC-TAC-TOE (Winning Line Highlight, Room Sync & Tactical Partner Reply)
   ============================================================================ */
function TicTacToeDuel({
  sessionSeed,
  playerName,
  partnerName,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win' | 'loss' | 'draw', score: number, text: string) => void;
}) {
  const [board, setBoard] = useState<TicTacToeCell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>(() =>
    getRandomStartingTurnSymbol(sessionSeed)
  );
  const [autoPartner, setAutoPartner] = useState(true);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  // Sync incoming board from shared room
  useEffect(() => {
    if (Array.isArray(roomGameState?.tttBoard) && roomGameState.tttBoard.length === 9) {
      Promise.resolve().then(() => {
        setBoard(roomGameState.tttBoard as TicTacToeCell[]);
        if (roomGameState.tttTurn === 'X' || roomGameState.tttTurn === 'O') {
          setTurn(roomGameState.tttTurn);
        }
      });
    }
  }, [roomGameState]);

  function handleSquare(idx: number) {
    if (board[idx]) return;
    const check = checkTicTacToeWinner(board);
    if (check.winner) return;

    const next = [...board];
    next[idx] = turn;
    setBoard(next);
    soundFX.playMove();

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        tttBoard: next,
        tttTurn: turn === 'X' ? 'O' : 'X',
      });
    }

    const afterPlayer = checkTicTacToeWinner(next);
    if (afterPlayer.winner) {
      setWinningLine(afterPlayer.line);
      if (afterPlayer.winner === 'X') {
        onScores(300, 100);
        setTimeout(() => onFinish('win', 300, `${playerName} Wins Tic-Tac-Toe!`), 380);
      } else if (afterPlayer.winner === 'O') {
        onScores(100, 300);
        setTimeout(() => onFinish('loss', 100, `${partnerName} Wins Tic-Tac-Toe!`), 380);
      } else {
        onScores(200, 200);
        setTimeout(() => onFinish('draw', 200, 'Stalemate Draw!'), 380);
      }
      return;
    }

    if (autoPartner && turn === 'X') {
      setTurn('O');
      setTimeout(() => {
        const empties = next
          .map((v, i) => (v === null ? i : -1))
          .filter((i) => i !== -1);
        if (empties.length === 0) return;
        const pick = empties.includes(4) ? 4 : empties[0];
        const afterBot = [...next];
        afterBot[pick] = 'O';
        setBoard(afterBot);
        setTurn('X');
        soundFX.playMove();
        const botRes = checkTicTacToeWinner(afterBot);
        if (botRes.winner) {
          setWinningLine(botRes.line);
          if (botRes.winner === 'O') {
            onScores(120, 300);
            setTimeout(() => onFinish('loss', 120, `${partnerName} Wins!`), 380);
          } else if (botRes.winner === 'draw') {
            onScores(200, 200);
            setTimeout(() => onFinish('draw', 200, 'Tic-Tac-Toe Draw!'), 380);
          }
        }
      }, 420);
    } else {
      setTurn(turn === 'X' ? 'O' : 'X');
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs text-stone-300">
        <span>
          Active Turn:{' '}
          <strong className={turn === 'X' ? 'text-amber-300' : 'text-teal-300'}>
            {turn === 'X' ? `${playerName} (X)` : `${partnerName} (O)`}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => setAutoPartner(!autoPartner)}
          className="text-amber-400 hover:underline"
        >
          {autoPartner ? `Partner Auto-Move: ON` : `2P Shared Clicks: ON`}
        </button>
      </div>

      <div className="grid aspect-square w-full max-w-[330px] grid-cols-3 gap-3 rounded-2xl border-2 border-stone-700 bg-stone-950 p-4 shadow-xl">
        {board.map((val, idx) => {
          const isWinCell = winningLine?.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSquare(idx)}
              aria-label={`Tic Tac Toe Square ${idx + 1} ${val || 'Empty'}`}
              className={`flex aspect-square items-center justify-center rounded-xl border text-4xl font-bold transition-all ${
                isWinCell
                  ? 'border-emerald-400 bg-emerald-500/25 scale-105 shadow-lg'
                  : 'border-stone-800 bg-stone-900 hover:border-amber-500/60'
              }`}
            >
              <span className={val === 'X' ? 'text-amber-400' : 'text-teal-400'}>
                {val || ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   2. CONNECT FOUR (Vertical Blue/Brass Slotted Grid, Disc Drop & Winning Line)
   ============================================================================ */
function ConnectFourDuel({
  sessionSeed,
  playerName,
  partnerName,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win' | 'loss' | 'draw', score: number, text: string) => void;
}) {
  const [grid, setGrid] = useState<ConnectFourCell[][]>(() =>
    Array.from({ length: 6 }, () => Array(7).fill(0))
  );
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastPlaced, setLastPlaced] = useState<[number, number] | null>(null);
  const [winCells, setWinCells] = useState<[number, number][] | null>(null);
  const [turn, setTurn] = useState<1 | 2>(() =>
    getRandomStartingPlayerNumber(sessionSeed)
  );
  const [autoPartner, setAutoPartner] = useState(true);

  useEffect(() => {
    if (Array.isArray(roomGameState?.c4Grid) && roomGameState.c4Grid.length === 6) {
      Promise.resolve().then(() => {
        setGrid(roomGameState.c4Grid as ConnectFourCell[][]);
      });
    }
  }, [roomGameState]);

  function handleColumnDrop(col: number) {
    if (winCells) return;
    const step1 = dropConnectFourDisc(grid, col, turn);
    if (!step1) return;

    setGrid(step1.nextGrid);
    setLastPlaced([step1.placedRow, col]);
    soundFX.playDrop();

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        c4Grid: step1.nextGrid,
      });
    }

    const res1 = checkConnectFourWinnerWithLine(step1.nextGrid);
    if (res1.winner === 1) {
      setWinCells(res1.line);
      onScores(450, 150);
      setTimeout(() => onFinish('win', 450, `${playerName} Connected Four!`), 420);
      return;
    } else if (res1.winner === 2) {
      setWinCells(res1.line);
      onScores(180, 450);
      setTimeout(() => onFinish('loss', 180, `${partnerName} Connected Four!`), 420);
      return;
    } else if (res1.winner === 'draw') {
      onScores(250, 250);
      setTimeout(() => onFinish('draw', 250, 'Connect Four Grid Full — Draw!'), 420);
      return;
    }

    if (autoPartner && turn === 1) {
      setTimeout(() => {
        const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => step1.nextGrid[0][c] === 0);
        if (!validCols.length) return;
        const botCol = validCols[(col + 3) % validCols.length];
        const step2 = dropConnectFourDisc(step1.nextGrid, botCol, 2);
        if (!step2) return;
        setGrid(step2.nextGrid);
        setLastPlaced([step2.placedRow, botCol]);
        soundFX.playDrop();
        const res2 = checkConnectFourWinnerWithLine(step2.nextGrid);
        if (res2.winner === 2) {
          setWinCells(res2.line);
          onScores(180, 450);
          setTimeout(() => onFinish('loss', 180, `${partnerName} Connected Four!`), 420);
        }
      }, 420);
    } else {
      setTurn(turn === 1 ? 2 : 1);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs text-stone-300">
        <span>
          Click any column (1–7) to drop your{' '}
          <strong className="text-amber-300">Amber</strong> or{' '}
          <strong className="text-teal-300">Teal</strong> disc!
        </span>
        <button
          type="button"
          onClick={() => setAutoPartner((a) => !a)}
          className="text-amber-400 hover:underline"
        >
          {autoPartner ? 'Partner Auto-Drop: ON' : '2P Alternate Turn: ON'}
        </button>
      </div>

      {/* Column Drop Preview Indicators */}
      <div className="grid w-full grid-cols-7 gap-2 px-4">
        {[0, 1, 2, 3, 4, 5, 6].map((c) => (
          <div
            key={c}
            className="flex h-6 items-center justify-center font-mono text-xs text-amber-300"
          >
            {hoverCol === c ? '▼ DROP' : `Col ${c + 1}`}
          </div>
        ))}
      </div>

      {/* Classic Blue Vertical Slotted Connect Four Frame */}
      <div className="grid w-full grid-cols-7 gap-2.5 rounded-2xl border-4 border-[#1D4ED8] bg-[#1E3A8A] p-4 shadow-2xl">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isWinDisc = winCells?.some(([wr, wc]) => wr === r && wc === c);
            const isNewest = lastPlaced?.[0] === r && lastPlaced?.[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                onClick={() => handleColumnDrop(c)}
                aria-label={`Drop disc in column ${c + 1} row ${r + 1}`}
                style={{
                  backgroundColor:
                    cell === 1 ? '#F59E0B' : cell === 2 ? '#14B8A6' : '#0F172A',
                }}
                className={`aspect-square rounded-full border-2 transition-all duration-200 ${
                  isWinDisc
                    ? 'border-white ring-4 ring-emerald-400 scale-105'
                    : isNewest
                    ? 'border-amber-200 scale-105'
                    : cell === 1
                    ? 'border-amber-300 shadow-inner'
                    : cell === 2
                    ? 'border-teal-200 shadow-inner'
                    : 'border-[#1E40AF] hover:border-amber-400/70'
                }`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   3. BATTLESHIP (Dual 10x10 Naval Radar Grids, 5-Ship Placement & Rotation)
   ============================================================================ */
interface NavalShipDef {
  id: string;
  name: string;
  size: number;
  coords: [number, number][];
}

const SHIPS_TO_PLACE = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

function BattleshipDuel({
  sessionSeed,
  playerName,
  partnerName,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win' | 'loss' | 'draw', score: number, text: string) => void;
}) {
  const [enemyFleet] = useState<NavalShipDef[]>(() =>
    generateBattleshipFleet(sessionSeed + 97)
  );
  const [myFleet, setMyFleet] = useState<NavalShipDef[]>(() =>
    generateBattleshipFleet(sessionSeed)
  );
  const [placingIdx, setPlacingIdx] = useState<number>(5);
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [shots, setShots] = useState<Record<string, 'hit' | 'miss'>>({});
  const [enemyShots, setEnemyShots] = useState<Record<string, 'hit' | 'miss'>>({});
  const [combatLog, setCombatLog] = useState<string>(
    'Randomized naval fleets deployed! Click any sector on the Enemy Target Radar (or randomize/re-place your fleet) to fire salvos!'
  );

  const totalEnemyCells = enemyFleet.reduce((acc, s) => acc + s.size, 0);

  function handlePlaceShipAt(r: number, c: number) {
    if (placingIdx >= SHIPS_TO_PLACE.length) return;
    const shipSpec = SHIPS_TO_PLACE[placingIdx];
    const coords: [number, number][] = [];
    for (let i = 0; i < shipSpec.size; i++) {
      const nr = orientation === 'V' ? r + i : r;
      const nc = orientation === 'H' ? c + i : c;
      if (nr >= 10 || nc >= 10) {
        setCombatLog(`${shipSpec.name} (${shipSpec.size} cells) does not fit at (${r + 1}, ${c + 1})!`);
        soundFX.playError();
        return;
      }
      coords.push([nr, nc]);
    }
    // Check overlap
    const occupied = new Set(
      myFleet.flatMap((s) => s.coords.map(([sr, sc]) => `${sr}-${sc}`))
    );
    if (coords.some(([cr, cc]) => occupied.has(`${cr}-${cc}`))) {
      setCombatLog('Cannot overlap another vessel in your fleet!');
      soundFX.playError();
      return;
    }

    const nextFleet = [
      ...myFleet,
      { id: shipSpec.id, name: `${shipSpec.name} (${shipSpec.size})`, size: shipSpec.size, coords },
    ];
    setMyFleet(nextFleet);
    const nextIdx = placingIdx + 1;
    setPlacingIdx(nextIdx);
    soundFX.playDrop();
    if (nextIdx >= SHIPS_TO_PLACE.length) {
      setCombatLog('All 5 vessels positioned! Fire at the Enemy Target Radar!');
    } else {
      setCombatLog(
        `Placed ${shipSpec.name}! Now position your ${SHIPS_TO_PLACE[nextIdx].name} (${SHIPS_TO_PLACE[nextIdx].size} cells).`
      );
    }
  }

  function fireAtEnemyCoord(r: number, c: number) {
    const key = `${r}-${c}`;
    if (shots[key]) return;

    const hitShip = enemyFleet.find((ship) =>
      ship.coords.some(([sr, sc]) => sr === r && sc === c)
    );
    const isHit = Boolean(hitShip);
    const nextShots = { ...shots, [key]: isHit ? ('hit' as const) : ('miss' as const) };
    setShots(nextShots);

    if (isHit && hitShip) {
      const isSunk = hitShip.coords.every(
        ([sr, sc]) => nextShots[`${sr}-${sc}`] === 'hit'
      );
      if (isSunk) {
        soundFX.playExplosion();
        setCombatLog(`DIRECT HIT! You sank ${partnerName}'s ${hitShip.name}!`);
      } else {
        soundFX.playExplosion();
        setCombatLog(`Direct hit on enemy vessel at Sector ${String.fromCharCode(65 + r)}${c + 1}!`);
      }
    } else {
      soundFX.playSplash();
      setCombatLog(`Splash at Sector ${String.fromCharCode(65 + r)}${c + 1} — missed.`);
    }

    // Enemy counter-salvo on Your Fleet
    const shotCount = Object.keys(nextShots).length;
    const er = (r + shotCount * 3) % 10;
    const ec = (c + shotCount * 7) % 10;
    const eKey = `${er}-${ec}`;
    const eHit = myFleet.some((s) => s.coords.some(([sr, sc]) => sr === er && sc === ec));
    setEnemyShots((prev) => ({ ...prev, [eKey]: eHit ? 'hit' : 'miss' }));

    const hits = Object.values(nextShots).filter((v) => v === 'hit').length;
    const pts = hits * 110;
    onScores(pts, Object.keys(nextShots).length * 25);

    if (hits >= totalEnemyCells) {
      setTimeout(
        () => onFinish('win', pts + 350, `${playerName} Sank All 5 Enemy Warships!`),
        400
      );
    }
  }

  const hitsCount = Object.values(shots).filter((v) => v === 'hit').length;
  const sunkEnemyShips = enemyFleet.filter((ship) =>
    ship.coords.every(([sr, sc]) => shots[`${sr}-${sc}`] === 'hit')
  );
  const myShipCells = new Set(
    myFleet.flatMap((s) => s.coords.map(([r, c]) => `${r}-${c}`))
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Naval Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-slate-950 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-teal-300">
          <Crosshair className="h-4 w-4" />
          <span className="font-semibold">{combatLog}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {placingIdx < SHIPS_TO_PLACE.length && (
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'H' ? 'V' : 'H'))}
              className="rounded-lg border border-amber-400 bg-amber-500/20 px-2.5 py-1 font-bold text-amber-200"
            >
              Orientation: {orientation === 'H' ? 'Horizontal ➡' : 'Vertical ⬇'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMyFleet(generateBattleshipFleet(generateFreshGameSeed()));
              setPlacingIdx(5);
              setCombatLog('Generated a fresh valid randomized 5-vessel fleet placement!');
              soundFX.playFlip();
            }}
            className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-2.5 py-1 text-teal-200 hover:border-teal-400"
          >
            Randomize Fleet
          </button>
          <button
            type="button"
            onClick={() => {
              setMyFleet([]);
              setPlacingIdx(0);
              setCombatLog('Custom Fleet Deployment: Click Your Fleet Grid to place your Carrier (5 cells).');
            }}
            className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-stone-200 hover:border-amber-400"
          >
            Re-Place Ships ({orientation})
          </button>
          <button
            type="button"
            onClick={() =>
              onFinish(
                'win',
                Math.max(300, hitsCount * 140),
                'Naval Fleet Reconnaissance Complete!'
              )
            }
            className="text-amber-400 hover:underline"
          >
            Complete Naval Patrol
          </button>
        </div>
      </div>

      {/* Dual 10x10 Naval Radar Boards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ENEMY TARGET RADAR (10x10) */}
        <div className="flex flex-col items-center rounded-2xl border border-teal-500/30 bg-slate-950 p-4">
          <div className="mb-2 flex w-full items-center justify-between text-xs">
            <span className="font-bold text-rose-300">
              🎯 ENEMY TARGET RADAR (Click to Fire Salvo)
            </span>
            <span className="font-mono text-teal-300">
              Hits: {hitsCount}/{totalEnemyCells} · Sunk: {sunkEnemyShips.length}/5
            </span>
          </div>

          <div className="grid aspect-square w-full max-w-[360px] grid-cols-10 gap-1 rounded-xl border border-teal-900/60 bg-[#061320] p-2">
            {Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 10 }, (_, c) => {
                const state = shots[`${r}-${c}`];
                return (
                  <button
                    key={`target-${r}-${c}`}
                    type="button"
                    onClick={() => fireAtEnemyCoord(r, c)}
                    aria-label={`Radar Sector ${r + 1}-${c + 1}`}
                    className={`flex aspect-square items-center justify-center rounded-xs border font-mono text-[10px] font-bold transition-colors ${
                      state === 'hit'
                        ? 'border-rose-400 bg-rose-500/40 text-rose-100'
                        : state === 'miss'
                        ? 'border-slate-700 bg-slate-800/80 text-slate-400'
                        : 'border-teal-900/50 bg-teal-950/35 text-teal-500/40 hover:border-amber-400'
                    }`}
                  >
                    {state === 'hit' ? '✕' : state === 'miss' ? '•' : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* YOUR FLEET DEPLOYMENT GRID (10x10) */}
        <div className="flex flex-col items-center rounded-2xl border border-stone-800 bg-slate-950 p-4">
          <div className="mb-2 flex w-full items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-amber-300">
              <Shield className="h-3.5 w-3.5" />
              <span>YOUR HOME FLEET (10x10)</span>
            </span>
            <span className="font-mono text-stone-400">
              Ships Deployed: {myFleet.length}/5
            </span>
          </div>

          <div className="grid aspect-square w-full max-w-[360px] grid-cols-10 gap-1 rounded-xl border border-stone-800 bg-[#091526] p-2">
            {Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 10 }, (_, c) => {
                const hasShip = myShipCells.has(`${r}-${c}`);
                const incoming = enemyShots[`${r}-${c}`];
                return (
                  <button
                    key={`fleet-${r}-${c}`}
                    type="button"
                    onClick={() => handlePlaceShipAt(r, c)}
                    aria-label={`Home Fleet Sector ${r + 1}-${c + 1}`}
                    className={`flex aspect-square items-center justify-center rounded-xs border font-mono text-[10px] font-bold ${
                      incoming === 'hit'
                        ? 'border-rose-400 bg-rose-600/50 text-white'
                        : hasShip
                        ? 'border-amber-400/80 bg-amber-500/35 text-amber-200'
                        : incoming === 'miss'
                        ? 'border-slate-700 bg-slate-800 text-slate-500'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-amber-400/50'
                    }`}
                  >
                    {incoming === 'hit' ? '🔥' : hasShip ? '■' : incoming === 'miss' ? '•' : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. DRAW & GUESS (Multi-Tool Sketch Studio, Brush Sizes & Masked Clue)
   ============================================================================ */
const DRAW_PROMPTS = [
  'Shooting Star',
  'Cup of Hot Cocoa',
  'Campfire Tent',
  'Crescent Moon',
  'Kitsune Fox',
];

function DrawAndGuessParty({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#FBBF24');
  const [brushSize, setBrushSize] = useState(5);
  const [promptIdx, setPromptIdx] = useState(0);
  const [guessText, setGuessText] = useState('');
  const [feedback, setFeedback] = useState('');

  const shuffledPrompts = seededShuffle(DRAW_PROMPTS, sessionSeed);
  const secretWord = shuffledPrompts[promptIdx % shuffledPrompts.length];
  const maskedWord = secretWord
    .split('')
    .map((ch, i) => (ch === ' ' ? '  ' : i === 0 || i === 4 ? ch : '_'))
    .join(' ');

  function drawStroke(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (lastPosRef.current) {
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      } else {
        ctx.moveTo(x, y);
      }
      ctx.lineTo(x, y);
      ctx.stroke();
      lastPosRef.current = { x, y };
    }
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }

  function handleGuessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guessText.trim().toLowerCase() === secretWord.toLowerCase()) {
      onScores(500, 500);
      setFeedback(`Spot on! It was "${secretWord}"!`);
      setTimeout(() => onFinish('completed', 500, 'Masterpiece Guessed!'), 450);
    } else {
      setFeedback(`Hint: Starts with "${secretWord.slice(0, 3)}..."`);
      soundFX.playMove();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col items-center gap-3 lg:col-span-7">
        <div className="flex w-full items-center justify-between text-xs">
          <span className="font-semibold text-amber-300">
            Secret Prompt to Sketch: {secretWord}
          </span>
          <button
            type="button"
            onClick={() => {
              clearCanvas();
              setPromptIdx((i) => i + 1);
            }}
            className="text-stone-400 hover:text-stone-200"
          >
            Next Prompt
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={520}
          height={280}
          onMouseDown={(e) => {
            setDrawing(true);
            const rect = e.currentTarget.getBoundingClientRect();
            lastPosRef.current = {
              x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
              y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
            };
          }}
          onMouseUp={() => {
            setDrawing(false);
            lastPosRef.current = null;
          }}
          onMouseLeave={() => {
            setDrawing(false);
            lastPosRef.current = null;
          }}
          onMouseMove={drawStroke}
          className="w-full cursor-crosshair rounded-2xl border border-stone-800 bg-stone-950"
        />

        <div className="flex flex-wrap items-center gap-2">
          {['#FBBF24', '#F43F5E', '#2DD4BF', '#A78BFA', '#34D399', '#FFFFFF'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBrushColor(c)}
              aria-label={`Select brush color ${c}`}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full border-2 ${
                brushColor === c ? 'border-white scale-110' : 'border-transparent'
              }`}
            />
          ))}
          {[3, 6, 11].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setBrushSize(sz)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-mono ${
                brushSize === sz
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-stone-700 bg-stone-900 text-stone-300'
              }`}
            >
              {sz}px
            </button>
          ))}
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-200"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-5 lg:col-span-5">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-100">Partner Guess Box</h4>
            <span className="font-mono text-xs text-amber-300">{maskedWord}</span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Sketch on the canvas and enter the prompt guess below to score party points together.
          </p>
          <form onSubmit={handleGuessSubmit} className="mt-4 space-y-2.5">
            <input
              type="text"
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              placeholder={`Type "${secretWord}" to test match...`}
              className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
            >
              Submit Guess
            </button>
          </form>
          {feedback && <p className="mt-3 text-xs text-teal-300">{feedback}</p>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. QUIZ BATTLE (Supports Personalized Questions + Speed Streak)
   ============================================================================ */
function QuizBattleDuel({
  sessionSeed,
  personalizedItems,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  personalizedItems: PersonalizedItemRecord[];
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const customQuestions = personalizedItems
    .filter((i) => i.category === 'quiz_question')
    .map((i) => {
      try {
        const p = JSON.parse(i.payloadJson);
        return {
          question: p.question || i.title,
          options: p.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          answerIndex: Number(p.answerIndex ?? 0),
          category: p.category || 'Our Memories',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const baseQuestions = [
    ...customQuestions,
    {
      question:
        'Which planet in our solar system is famous for its bright icy ring system?',
      options: ['Mercury', 'Saturn', 'Mars', 'Venus'],
      answerIndex: 1,
      category: 'Stargazing Trivia',
    },
    {
      question:
        'In standard chess, how many squares does a King move during castling?',
      options: ['1 square', '2 squares', '3 squares', '4 squares'],
      answerIndex: 1,
      category: 'Arcade Classics',
    },
    {
      question:
        'Which Japanese green tea is stone-ground into a fine vivid powder?',
      options: ['Sencha', 'Matcha', 'Oolong', 'Earl Grey'],
      answerIndex: 1,
      category: 'Cozy Café Trivia',
    },
  ];

  const questions = seededShuffle(baseQuestions, sessionSeed);

  const [qIdx, setQIdx] = useState(0);
  const [pts, setPts] = useState(0);

  const currentQ = questions[qIdx % questions.length]!;

  function selectAnswer(idx: number) {
    const correct = idx === currentQ.answerIndex;
    const nextPts = pts + (correct ? 250 : 50);
    setPts(nextPts);
    onScores(nextPts, (qIdx + 1) * 180);
    if (correct) soundFX.playCapture();
    else soundFX.playError();

    if (qIdx + 1 >= Math.min(4, questions.length)) {
      setTimeout(() => onFinish('win', nextPts, 'Quiz Battle Victory!'), 350);
    } else {
      setQIdx(qIdx + 1);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex items-center justify-between text-xs text-amber-300">
        <span>Category: {currentQ.category}</span>
        <span>
          Question {qIdx + 1} of {Math.min(4, questions.length)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-stone-100">{currentQ.question}</h3>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {currentQ.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => selectAnswer(idx)}
            className="rounded-xl border border-stone-800 bg-stone-900 p-3.5 text-left text-xs font-semibold text-stone-100 hover:border-amber-500"
          >
            {idx + 1}. {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   6. WORD BATTLE (Honeycomb Letter Rack, Shuffle & Pangram Bonus)
   ============================================================================ */
function WordBattleDuel({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const initialRackSpec = generateWordBattleRack(sessionSeed);
  const [rack, setRack] = useState<string[]>(initialRackSpec.rack);
  const center = initialRackSpec.center;
  const [wordInput, setWordInput] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [totalPts, setTotalPts] = useState(0);
  const [msg, setMsg] = useState(
    `Forge words of 3+ letters that include the golden center letter "${center}".`
  );

  function shuffleOuterLetters() {
    const outer = rack.filter((l) => l !== center);
    const rotated = [...outer.slice(1), outer[0]];
    setRack([rotated[0], rotated[1], center, rotated[2], rotated[3], rotated[4], rotated[5]]);
    soundFX.playFlip();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const upper = wordInput.trim().toUpperCase();
    if (foundWords.includes(upper)) {
      setMsg('Already forged that word!');
      return;
    }
    const check = scoreWordBattleSubmission(upper, rack, center);
    if (!check.valid) {
      setMsg(check.reason || 'Invalid word.');
      soundFX.playError();
      return;
    }
    const nextPts = totalPts + check.points;
    const nextFound = [...foundWords, upper];
    setFoundWords(nextFound);
    setTotalPts(nextPts);
    setWordInput('');
    setMsg(`Forged "${upper}" for +${check.points} pts!`);
    onScores(nextPts, nextFound.length * 45);
    soundFX.playCapture();

    if (nextFound.length >= 3) {
      setTimeout(() => onFinish('win', nextPts, 'Word Battle Champion!'), 400);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {rack.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => setWordInput((w) => w + letter)}
            className={`h-11 w-11 rounded-xl border font-mono text-base font-bold transition-transform hover:scale-105 ${
              letter === center
                ? 'border-amber-400 bg-amber-500 text-stone-950 shadow-md'
                : 'border-stone-700 bg-stone-900 text-stone-100 hover:border-amber-500/50'
            }`}
          >
            {letter}
          </button>
        ))}
        <button
          type="button"
          onClick={shuffleOuterLetters}
          aria-label="Shuffle Letters"
          className="flex h-11 items-center gap-1 rounded-xl border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 hover:border-amber-400"
        >
          <Shuffle className="h-3.5 w-3.5" />
          <span>Shuffle</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <input
          type="text"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value.toUpperCase())}
          placeholder="e.g. STAR, TRAIN, ART..."
          className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 uppercase"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Submit
        </button>
      </form>
      <p className="text-xs text-amber-300">{msg}</p>
      <div className="text-xs text-stone-400">
        Found Words ({foundWords.length}/3 to win): {foundWords.join(' · ') || 'None yet'}
      </div>
    </div>
  );
}

/* ============================================================================
   7. REACTION RACE (False-Start Penalty Detection + Millisecond Telemetry)
   ============================================================================ */
function ReactionRaceDuel({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'false_start' | 'done'>(
    'waiting'
  );
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [reactionMs, setReactionMs] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const delayMs = 950 + (sessionSeed % 1100);
    const t = setTimeout(() => {
      setPhase('ready');
      setStartTimestamp(performance.now());
    }, delayMs);
    return () => clearTimeout(t);
  }, [phase, sessionSeed]);

  function handleStrike() {
    if (phase === 'waiting') {
      setPhase('false_start');
      soundFX.playError();
      setTimeout(() => setPhase('waiting'), 900);
      return;
    }
    if (phase === 'ready') {
      const ms = Math.max(115, Math.round(performance.now() - startTimestamp));
      setReactionMs(ms);
      setPhase('done');
      const pts = Math.max(200, 1000 - ms);
      onScores(pts, 680);
      soundFX.playCapture();
      setTimeout(() => onFinish('win', pts, `Lightning Reflex: ${ms}ms!`), 550);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleStrike}
        className={`flex h-56 w-full flex-col items-center justify-center rounded-2xl border-2 p-6 text-center transition-colors ${
          phase === 'ready'
            ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
            : phase === 'false_start'
            ? 'border-rose-400 bg-rose-500/25 text-rose-200'
            : 'border-stone-800 bg-stone-950 text-stone-300'
        }`}
      >
        <span className="text-xl font-bold">
          {phase === 'waiting' && 'Wait for Emerald Lantern...'}
          {phase === 'false_start' && 'Too Early! False Start — Resetting...'}
          {phase === 'ready' && 'STRIKE NOW! (Click Here)'}
          {phase === 'done' && `Reaction Time: ${reactionMs} ms`}
        </span>
      </button>
    </div>
  );
}

/* ============================================================================
   8. TRUTH OR DARE (Spinning Turn Selector + Custom Decks)
   ============================================================================ */
function TruthOrDareParty({
  sessionSeed,
  playerName,
  partnerName,
  personalizedItems,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  personalizedItems: PersonalizedItemRecord[];
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const customCards = personalizedItems
    .filter((i) => i.category === 'truth_or_dare')
    .map((i) => {
      try {
        const p = JSON.parse(i.payloadJson);
        return {
          type: (p.type || 'truth') as 'truth' | 'dare',
          prompt: p.prompt || i.title,
          deck: p.deck || 'Custom Shared Deck',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const baseDeck = [
    ...customCards,
    {
      type: 'truth' as const,
      prompt:
        'What is a dream trip destination you want us to visit together in the next two years?',
      deck: 'Cozy Late Night',
    },
    {
      type: 'dare' as const,
      prompt:
        'Speak in a dramatic movie trailer voice for the next 60 seconds in voice or text chat!',
      deck: 'Playful Spark',
    },
    {
      type: 'truth' as const,
      prompt: 'What was your very first impression of me when we first met?',
      deck: 'Cozy Late Night',
    },
  ];

  const deck = seededShuffle(baseDeck, sessionSeed);

  const [idx, setIdx] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [spotlightPlayer, setSpotlightPlayer] = useState(() =>
    sessionSeed % 2 === 0 ? playerName : partnerName
  );
  const activeCard = deck[idx % deck.length]!;

  function spinTurnWheel() {
    const nextP = spotlightPlayer === playerName ? partnerName : playerName;
    setSpotlightPlayer(nextP);
    soundFX.playFlip();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6 text-center">
      <div className="flex w-full items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-amber-400">
          {activeCard.type.toUpperCase()} · {activeCard.deck}
        </span>
        <button
          type="button"
          onClick={spinTurnWheel}
          className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-teal-300"
        >
          Spotlight: {spotlightPlayer} (Click to Spin)
        </button>
      </div>
      <p className="text-lg font-bold leading-relaxed text-stone-100">
        &ldquo;{activeCard.prompt}&rdquo;
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => {
            const nextC = completedCount + 1;
            setCompletedCount(nextC);
            setIdx((i) => i + 1);
            spinTurnWheel();
            onScores(nextC * 150, nextC * 150);
            soundFX.playCapture();
          }}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Complete &amp; Draw Next Card
        </button>
        <button
          type="button"
          onClick={() =>
            onFinish(
              'completed',
              Math.max(300, completedCount * 150),
              'Truth or Dare Session Completed!'
            )
          }
          className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-200"
        >
          Finish Deck
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   9. HIGHER OR LOWER (Astral Card Deck + History Trail)
   ============================================================================ */
function HigherOrLowerDuel({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const initialCard = generateHigherLowerStartingCard(sessionSeed);
  const [currentVal, setCurrentVal] = useState(initialCard);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<number[]>([initialCard]);

  function guess(dir: 'higher' | 'lower') {
    const deckSequence = seededShuffle(
      [14, 6, 18, 9, 20, 4, 15, 11, 19, 3, 16, 8, 2, 13, 17, 7],
      sessionSeed + history.length
    );
    let nextVal = deckSequence[(history.length + streak) % deckSequence.length];
    if (nextVal === currentVal) nextVal = currentVal < 21 ? currentVal + 1 : 1;
    const won =
      (dir === 'higher' && nextVal > currentVal) ||
      (dir === 'lower' && nextVal < currentVal);
    setCurrentVal(nextVal);
    setHistory((h) => [...h.slice(-6), nextVal]);
    const nextStreak = won ? streak + 1 : streak;
    setStreak(nextStreak);
    const pts = nextStreak * 160;
    onScores(pts, 280);
    if (won) soundFX.playCapture();
    else soundFX.playMove();

    if (nextStreak >= 4) {
      setTimeout(
        () => onFinish('win', pts + 200, '4x Prediction Streak Achieved!'),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6 text-center">
      <span className="text-xs text-stone-400">
        Astral Card Value (Scale 1–21) · Streak: {streak}/4
      </span>
      <div className="flex h-36 w-28 flex-col items-center justify-center rounded-2xl border-2 border-amber-400 bg-stone-900 font-mono text-4xl font-bold text-amber-300 tabular-nums shadow-lg">
        <span>{currentVal}</span>
        <span className="mt-1 text-[10px] text-stone-400">ASTRAL TAROT</span>
      </div>
      <div className="text-[11px] font-mono text-stone-400">
        Drawn Trail: {history.join(' → ')}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => guess('higher')}
          className="rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-teal-400"
        >
          ▲ Higher
        </button>
        <button
          type="button"
          onClick={() => guess('lower')}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          ▼ Lower
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   10. ESCAPE THE MAZE (Cooperative Key-Switch Dungeon)
   ============================================================================ */
function EscapeTheMazeCoop({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const [switchCoord] = useState<[number, number]>(
    () => generateMazeKeyPositions(sessionSeed)[0]
  );
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [gateUnlocked, setGateUnlocked] = useState(false);

  function move(dr: number, dc: number) {
    const nr = Math.max(0, Math.min(4, pos[0] + dr));
    const nc = Math.max(0, Math.min(4, pos[1] + dc));
    setPos([nr, nc]);
    soundFX.playMove();
    if (nr === switchCoord[0] && nc === switchCoord[1]) {
      setGateUnlocked(true);
      soundFX.playCapture();
    }
    if (nr === 4 && nc === 4) {
      onScores(600, 600);
      setTimeout(
        () => onFinish('win', 600, 'Sanctuary Maze Escaped Together!'),
        300
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <p className="text-xs text-stone-400">
        Step on the randomized Switch Plate (Row {switchCoord[0] + 1}, Col {switchCoord[1] + 1}) and guide the team to the Exit Portal (Bottom-Right)!
      </p>
      <div className="grid aspect-square w-64 grid-cols-5 gap-1.5 rounded-2xl border border-stone-800 bg-stone-950 p-3">
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const isPlayer = pos[0] === r && pos[1] === c;
            const isSwitch = r === switchCoord[0] && c === switchCoord[1];
            const isExit = r === 4 && c === 4;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => move(r - pos[0], c - pos[1])}
                aria-label={`Maze tile ${r + 1}-${c + 1}`}
                className={`flex items-center justify-center rounded-lg border text-xs font-bold ${
                  isPlayer
                    ? 'border-amber-400 bg-amber-500 text-stone-950'
                    : isExit
                    ? 'border-teal-400 bg-teal-500/20 text-teal-200'
                    : isSwitch
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-900'
                }`}
              >
                {isPlayer ? '★' : isExit ? 'EXIT' : isSwitch ? (gateUnlocked ? 'OPEN' : 'KEY') : ''}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   11. COOKING TOGETHER (Cooperative Bistro Kitchen)
   ============================================================================ */
const RECIPE_STEPS = [
  'Whisk Sweet Batter',
  'Fold Matcha Powder',
  'Steam Fluffy Soufflé',
  'Garnish Strawberry',
];

function CookingTogetherCoop({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  playerName: string;
  partnerName: string;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [dishesServed, setDishesServed] = useState(0);
  const counterButtons = seededShuffle(RECIPE_STEPS, sessionSeed);

  function addIngredient(stepName: string) {
    if (stepName === RECIPE_STEPS[stepIdx]) {
      const nextStep = stepIdx + 1;
      soundFX.playCapture();
      if (nextStep >= RECIPE_STEPS.length) {
        const nextDishes = dishesServed + 1;
        setDishesServed(nextDishes);
        setStepIdx(0);
        const pts = nextDishes * 320;
        onScores(pts, pts);
        if (nextDishes >= 2) {
          setTimeout(
            () => onFinish('win', pts, 'Co-Op Bistro Service Complete!'),
            350
          );
        }
      } else {
        setStepIdx(nextStep);
      }
    } else {
      soundFX.playError();
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex w-full items-center justify-between text-xs text-amber-300">
        <span className="flex items-center gap-1.5 font-bold">
          <UtensilsCrossed className="h-4 w-4" />
          Order: Matcha Soufflé Pancakes
        </span>
        <span>Dishes Served: {dishesServed} / 2</span>
      </div>

      {/* Recipe Progress Bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-900">
        <div
          className="h-full bg-teal-400 transition-all duration-300"
          style={{ width: `${(stepIdx / RECIPE_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="w-full rounded-xl border border-stone-800 bg-stone-900 p-3 text-xs">
        <span className="text-stone-400">Next Required Prep Step: </span>
        <strong className="text-teal-300">{RECIPE_STEPS[stepIdx]}</strong>
      </div>

      <div className="grid w-full grid-cols-2 gap-2.5">
        {counterButtons.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => addIngredient(step)}
            className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 p-3.5 text-left text-xs font-semibold text-stone-100 hover:border-amber-500"
          >
            <Flame className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{step}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   12. JIGSAW PUZZLE TOGETHER (True Quadrant-Sliced Keepsake Photo Tiles)
   ============================================================================ */
function JigsawPuzzleCoop({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const [tiles, setTiles] = useState<number[]>(() =>
    generateJigsawTileOrder(sessionSeed)
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  function handleTileClick(idx: number) {
    if (selectedIdx === null) {
      setSelectedIdx(idx);
      soundFX.playMove();
      return;
    }
    const next = [...tiles];
    [next[selectedIdx], next[idx]] = [next[idx], next[selectedIdx]];
    setTiles(next);
    setSelectedIdx(null);
    soundFX.playCapture();

    const solved = next.every((val, i) => val === i);
    if (solved) {
      onScores(650, 650);
      setTimeout(
        () => onFinish('win', 650, 'Shared Keepsake Jigsaw Completed!'),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <p className="text-xs text-stone-400">
        Click two tiles to swap them into ascending order (1 to 9) to lock the Starlight Picnic illustration!
      </p>
      <div className="grid aspect-square w-72 grid-cols-3 gap-2 rounded-2xl border border-stone-800 bg-stone-950 p-3">
        {tiles.map((pieceNum, idx) => {
          const origRow = Math.floor(pieceNum / 3);
          const origCol = pieceNum % 3;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTileClick(idx)}
              style={{
                backgroundImage: `url(${KEEPSAKE_PICNIC_IMAGE})`,
                backgroundSize: '300% 300%',
                backgroundPosition: `${origCol * 50}% ${origRow * 50}%`,
              }}
              className={`relative flex items-center justify-center overflow-hidden rounded-xl border font-mono text-lg font-bold ${
                selectedIdx === idx
                  ? 'border-amber-400 ring-2 ring-amber-400'
                  : pieceNum === idx
                  ? 'border-emerald-500/80'
                  : 'border-stone-700'
              }`}
            >
              <span className="relative z-10 rounded bg-black/70 px-2 py-0.5 text-stone-100">
                {pieceNum + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   13. TREASURE HUNT (Compass Triangulation & Archipelago Relics)
   ============================================================================ */
function TreasureHuntCoop({
  sessionSeed,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'win', score: number, text: string) => void;
}) {
  const [relics] = useState<[number, number][]>(() =>
    generateTreasureRelicCoords(sessionSeed)
  );
  const [dug, setDug] = useState<Record<string, string>>({});
  const [clueMsg, setClueMsg] = useState(
    'Click any island sector to excavate and triangulate compass clues.'
  );

  function digSector(r: number, c: number) {
    const key = `${r}-${c}`;
    if (dug[key]) return;
    const isRelic = relics.some(([rr, cc]) => rr === r && cc === c);
    const minDist = Math.min(
      ...relics.map(([rr, cc]) => Math.abs(rr - r) + Math.abs(cc - c))
    );

    const next = { ...dug, [key]: isRelic ? 'RELIC' : `${minDist}` };
    setDug(next);
    if (isRelic) {
      setClueMsg(`Unearthed Golden Relic at Sector (${r + 1}, ${c + 1})!`);
      soundFX.playCapture();
    } else {
      setClueMsg(`Compass Reading: Nearest relic is ${minDist} tile(s) away.`);
      soundFX.playMove();
    }

    const foundCount = Object.values(next).filter((v) => v === 'RELIC').length;
    onScores(foundCount * 240, foundCount * 240);
    if (foundCount >= relics.length) {
      setTimeout(
        () => onFinish('win', 720, 'All 3 Archipelago Relics Unearthed!'),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
        <Compass className="h-4 w-4" />
        <span>{clueMsg}</span>
      </div>

      <div className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl border border-stone-800">
        <img
          src={TREASURE_MAP_IMAGE}
          alt="Archipelago Treasure Map"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-65"
        />
        <div className="relative z-10 grid h-full w-full grid-cols-5 grid-rows-5 gap-1.5 p-3">
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 5 }, (_, c) => {
              const val = dug[`${r}-${c}`];
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => digSector(r, c)}
                  aria-label={`Excavate Island Sector ${r + 1}-${c + 1}`}
                  className={`flex items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors ${
                    val === 'RELIC'
                      ? 'border-amber-300 bg-amber-500 text-stone-950'
                      : val
                      ? 'border-stone-700 bg-stone-950/85 text-teal-300'
                      : 'border-white/20 bg-black/30 text-white/70 hover:bg-black/50'
                  }`}
                >
                  {val === 'RELIC' ? '💎' : val || ''}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
