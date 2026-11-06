'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SINGLE_PLAYER_GAMES,
  VIRTUAL_PET_IMAGE,
  KEEPSAKE_PICNIC_IMAGE,
  TREASURE_MAP_IMAGE,
  HERO_BANNER_IMAGE,
} from '@/src/lib/arcade-data';
import {
  move2048Grid,
  can2048GridMove,
  resolveBubbleClusterAndAvalanche,
} from '@/src/lib/game-rules';
import {
  generateFreshGameSeed,
  generateMemoryMatchDeck,
  generateInitial2048Grid,
  generateBubbleShooterGrid,
  generateSudokuBoard,
  seededShuffle,
} from '@/src/lib/game-randomizer';
import { soundFX } from '@/src/lib/sound';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Heart,
  Utensils,
  Moon,
  HelpCircle,
  Eye,
  Volume2,
  Music,
  Undo2,
  Pencil,
  Eraser,
} from 'lucide-react';

export interface PersonalizedItemRecord {
  id?: number;
  category: string;
  title: string;
  payloadJson: string;
}

interface SinglePlayerGamesProps {
  gameId: string;
  autostart?: boolean;
  personalBest: number;
  petState: {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    accessory: string;
    stage: number;
  };
  unlockedItems: string[];
  personalizedItems: PersonalizedItemRecord[];
  onUpdatePet: (nextPet: {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    accessory: string;
    stage: number;
  }) => void;
  onBackToArcade: () => void;
  onGameComplete: (
    gameId: string,
    score: number,
    xpEarned: number,
    coinsEarned: number,
    details?: Record<string, unknown>
  ) => void;
}

export function SinglePlayerGameArena({
  gameId,
  autostart = false,
  personalBest,
  petState,
  unlockedItems,
  personalizedItems,
  onUpdatePet,
  onBackToArcade,
  onGameComplete,
}: SinglePlayerGamesProps) {
  const gameDef =
    SINGLE_PLAYER_GAMES.find((g) => g.id === gameId) || SINGLE_PLAYER_GAMES[0];

  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [score, setScore] = useState<number>(0);
  const [sessionSeed, setSessionSeed] = useState<number>(104729);
  const [sessionSummary, setSessionSummary] = useState<string>('Stage Cleared!');
  const [musicActive, setMusicActive] = useState<boolean>(soundFX.musicEnabled);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  function handleFinishSession(
    finalScore: number,
    summaryText = 'Session Completed!',
    extra?: Record<string, unknown>
  ) {
    setScore(finalScore);
    setSessionSummary(summaryText);
    setShellState('gameover');
    soundFX.playFanfare();
    onGameComplete(
      gameDef.id,
      finalScore,
      gameDef.xpReward,
      0,
      { difficulty, sessionSeed, ...extra }
    );
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 text-stone-100">
      {/* Unified Game Shell Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToArcade}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:text-amber-200 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Arcade Hub</span>
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-100">
              {gameDef.title}
            </h2>
            <p className="text-xs text-stone-400">{gameDef.shortDesc}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-1.5 font-mono text-xs tabular-nums">
            <span className="text-stone-400">
              SCORE: <strong className="text-amber-300">{score}</strong>
            </span>
            <span aria-hidden="true" className="text-stone-700">
              ·
            </span>
            <span className="text-stone-400">
              BEST: <strong className="text-teal-300">{Math.max(personalBest, score)}</strong>
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
              aria-label="Pause Game"
              className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-800 whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* TITLE OVERLAY STAGE */}
      {shellState === 'title' && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-6 text-center">
          <svg
            className="h-14 w-14 text-amber-400"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="8"
              y="12"
              width="48"
              height="40"
              rx="10"
              stroke="currentColor"
              strokeWidth="2.5"
              fill="rgba(245,158,11,0.08)"
            />
            <circle cx="24" cy="32" r="5" stroke="#2DD4BF" strokeWidth="2.5" />
            <path
              d="M38 27h8M42 23v8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <h3 className="mt-4 text-2xl font-bold tracking-tight text-stone-100">
            {gameDef.title}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-400">
            {gameDef.rulesSummary}
          </p>

          {/* Difficulty Selector */}
          <div className="mt-5 flex items-center gap-2">
            {(['Easy', 'Medium', 'Hard'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficulty(lvl)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  difficulty === lvl
                    ? 'bg-amber-500 text-stone-950'
                    : 'border border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-700'
                }`}
              >
                {lvl} Mode
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={() => {
                setScore(0);
                setSessionSeed(generateFreshGameSeed());
                setShellState('playing');
                soundFX.playSuccess();
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start {gameDef.title}</span>
            </button>
          </div>

          <p className="mt-4 text-xs text-stone-500">
            Controls: {gameDef.controlsHint} · Rewards: +{gameDef.xpReward} XP · 0 Coins (Coins are exclusive to 2v2 Couple Mode)
          </p>
        </div>
      )}

      {/* ACTIVE GAMEPLAY STAGE */}
      {shellState !== 'title' && (
        <div className="min-h-[420px]">
          {gameDef.id === 'virtual-pet' && (
            <VirtualPetSanctuary
              key={`pet-${sessionSeed}`}
              petState={petState}
              unlockedItems={unlockedItems}
              onUpdatePet={onUpdatePet}
              onScoreChange={setScore}
              onComplete={(finalScore) =>
                handleFinishSession(finalScore, `${petState.name} is Radiant & Happy!`)
              }
            />
          )}
          {gameDef.id === 'memory-match' && (
            <MemoryMatchGame
              key={`memory-${sessionSeed}`}
              sessionSeed={sessionSeed}
              difficulty={difficulty}
              personalizedItems={personalizedItems}
              onScoreChange={setScore}
              onComplete={(finalScore, details) =>
                handleFinishSession(finalScore, 'All Memory Keepsake Pairs Matched!', details)
              }
            />
          )}
          {gameDef.id === 'bubble-shooter' && (
            <BubbleShooterGame
              key={`bubble-${sessionSeed}`}
              sessionSeed={sessionSeed}
              difficulty={difficulty}
              onScoreChange={setScore}
              onComplete={(finalScore, summaryText, details) =>
                handleFinishSession(finalScore, summaryText, details)
              }
            />
          )}
          {gameDef.id === '2048-puzzle' && (
            <Puzzle2048Game
              key={`2048-${sessionSeed}`}
              sessionSeed={sessionSeed}
              onScoreChange={setScore}
              onComplete={(finalScore, summaryText, details) =>
                handleFinishSession(finalScore, summaryText, details)
              }
            />
          )}
          {gameDef.id === 'guess-the-picture' && (
            <GuessThePictureGame
              key={`guess-${sessionSeed}`}
              sessionSeed={sessionSeed}
              difficulty={difficulty}
              personalizedItems={personalizedItems}
              onScoreChange={setScore}
              onComplete={(finalScore, details) =>
                handleFinishSession(finalScore, 'Keepsake Illustration Identified!', details)
              }
            />
          )}
          {gameDef.id === 'endless-runner' && (
            <EndlessRunnerGame
              key={`runner-${sessionSeed}`}
              isPaused={shellState !== 'playing'}
              difficulty={difficulty}
              onScoreChange={setScore}
              onComplete={(finalScore, details) =>
                handleFinishSession(finalScore, 'Moonlit Rooftop Run Complete!', details)
              }
            />
          )}
          {gameDef.id === 'sudoku-daily' && (
            <SudokuDailyGame
              key={`sudoku-${sessionSeed}`}
              sessionSeed={sessionSeed}
              difficulty={difficulty}
              onScoreChange={setScore}
              onComplete={(finalScore, details) =>
                handleFinishSession(finalScore, 'Daily Sudoku Grid Solved!', details)
              }
            />
          )}
        </div>
      )}

      {/* PAUSE MODAL */}
      {shellState === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-stone-100">{gameDef.title} Paused</h3>
            <p className="mt-1 text-xs text-stone-400">
              Current Score: {score} · Mode: {difficulty}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Resume Game
              </button>
              <button
                type="button"
                onClick={() => {
                  setScore(0);
                  setShellState('title');
                }}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
              >
                Restart from Title
              </button>
              <button
                type="button"
                onClick={onBackToArcade}
                className="w-full rounded-lg py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Exit to Arcade Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / COMPLETION MODAL */}
      {shellState === 'gameover' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-stone-100">{sessionSummary}</h3>
            <p className="mt-1 text-xs text-stone-400">
              {gameDef.title} · {difficulty} Difficulty
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 font-mono text-xs tabular-nums">
              <div>
                <div className="text-stone-500">FINAL SCORE</div>
                <div className="mt-1 text-base font-bold text-stone-100">{score}</div>
              </div>
              <div>
                <div className="text-stone-500">XP EARNED</div>
                <div className="mt-1 text-base font-bold text-amber-400">
                  +{gameDef.xpReward}
                </div>
              </div>
              <div>
                <div className="text-stone-500">COINS</div>
                <div className="mt-1 text-xs font-bold text-stone-400">
                  0 (2v2 Exclusive)
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={() => {
                  setScore(0);
                  setSessionSeed(generateFreshGameSeed());
                  setShellState('playing');
                }}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Play Again (Fresh Layout)
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
   1. VIRTUAL PET SANCTUARY (With Animated Moods, Evolution & Treat Catch Mini-Game)
   ============================================================================ */
function VirtualPetSanctuary({
  petState,
  unlockedItems,
  onUpdatePet,
  onScoreChange,
  onComplete,
}: {
  petState: {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    accessory: string;
    stage: number;
  };
  unlockedItems: string[];
  onUpdatePet: (nextPet: {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    accessory: string;
    stage: number;
  }) => void;
  onScoreChange: (s: number) => void;
  onComplete: (s: number) => void;
}) {
  const [nameInput, setNameInput] = useState(petState.name);
  const [carePoints, setCarePoints] = useState(120);
  const [petPose, setPetPose] = useState<'idle' | 'eating' | 'playing' | 'sleeping'>('idle');
  const [statusMessage, setStatusMessage] = useState(
    `${petState.name} is wagging its twin fox tails in the sanctuary!`
  );
  const [miniGameActive, setMiniGameActive] = useState(false);
  const [treatX, setTreatX] = useState(50);
  const [treatsCaught, setTreatsCaught] = useState(0);

  function triggerCare(type: 'feed' | 'play' | 'sleep' | 'brush') {
    const next = { ...petState };
    if (type === 'feed') {
      next.hunger = Math.min(100, next.hunger + 18);
      next.happiness = Math.min(100, next.happiness + 6);
      setPetPose('eating');
      setStatusMessage(`${next.name} munched a warm honey-berry tart! (+18 Hunger)`);
    } else if (type === 'play') {
      next.happiness = Math.min(100, next.happiness + 20);
      next.energy = Math.max(10, next.energy - 10);
      setPetPose('playing');
      setStatusMessage(`${next.name} chased the floating starlight orb! (+20 Happiness)`);
    } else if (type === 'sleep') {
      next.energy = Math.min(100, next.energy + 25);
      setPetPose('sleeping');
      setStatusMessage(`${next.name} curled up on the velvet cushion for a power nap! (+25 Energy)`);
    } else {
      next.happiness = Math.min(100, next.happiness + 12);
      setPetPose('playing');
      setStatusMessage(`${next.name}'s coat is sparkling after a gentle brushing!`);
    }
    const nextScore = carePoints + 120;
    setCarePoints(nextScore);
    onScoreChange(nextScore);
    onUpdatePet(next);
    soundFX.playPop(2);
    setTimeout(() => setPetPose('idle'), 1400);
  }

  function catchTreat() {
    const nextCaught = treatsCaught + 1;
    setTreatsCaught(nextCaught);
    setTreatX(18 + ((nextCaught * 29) % 64));
    const nextScore = carePoints + 95;
    setCarePoints(nextScore);
    onScoreChange(nextScore);
    soundFX.playCapture();
    onUpdatePet({
      ...petState,
      happiness: Math.min(100, petState.happiness + 5),
    });
    if (nextCaught >= 5) {
      setMiniGameActive(false);
      setStatusMessage(`${petState.name} caught 5 Starlight Treats in a row! Bonus +250 Care Pts!`);
    }
  }

  const accessories = [
    { id: 'star-collar', label: 'Starlight Bell Collar' },
    { id: 'flower-crown', label: 'Sakura Blossom Crown' },
    { id: 'wizard-cape', label: 'Astral Velvet Cape' },
  ];

  const bondScore = Math.round((petState.hunger + petState.happiness + petState.energy) / 3);
  const evolutionStage =
    bondScore >= 90
      ? 'Stage III · Celestial Nine-Tailed Kitsune'
      : bondScore >= 70
      ? 'Stage II · Mystic Starlight Fox'
      : 'Stage I · Cozy Fox Kit';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Visual Pet Terrarium */}
      <div className="flex flex-col items-center justify-between rounded-2xl border border-stone-800 bg-stone-950 p-6 lg:col-span-6">
        <div className="flex w-full items-center justify-between">
          <div>
            <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
              Companion: {petState.name}
            </span>
            <p className="mt-1 text-[11px] font-semibold text-teal-300">{evolutionStage}</p>
          </div>
          <span className="font-mono text-xs text-stone-400">
            Wearing: {petState.accessory}
          </span>
        </div>

        <div className="relative my-4 flex h-60 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
          <img
            src={VIRTUAL_PET_IMAGE}
            alt={petState.name}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-500 ${
              petPose === 'playing'
                ? 'scale-110 -translate-y-2'
                : petPose === 'eating'
                ? 'scale-105'
                : petPose === 'sleeping'
                ? 'opacity-80 scale-95'
                : 'scale-100'
            }`}
          />

          {/* Interactive Pose Overlay Badge */}
          <div className="absolute top-3 right-3 rounded-full bg-black/75 px-3 py-1 text-xs font-bold text-amber-300">
            {petPose === 'eating' && '🍓 Yummy! +18'}
            {petPose === 'playing' && '✨ Happy Jump!'}
            {petPose === 'sleeping' && '💤 Zzz... Restoring'}
            {petPose === 'idle' && `♥ Bond ${bondScore}%`}
          </div>

          {/* Mini-Game Treat Catch Overlay */}
          {miniGameActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-between bg-black/70 p-4 backdrop-blur-xs">
              <div className="flex w-full items-center justify-between text-xs font-bold text-amber-300">
                <span>Catch Falling Star Treats! ({treatsCaught}/5)</span>
                <button
                  type="button"
                  onClick={() => setMiniGameActive(false)}
                  className="text-stone-300 underline"
                >
                  Close
                </button>
              </div>
              <button
                type="button"
                onClick={catchTreat}
                style={{ left: `${treatX}%` }}
                className="relative -translate-x-1/2 animate-bounce rounded-full border-2 border-amber-300 bg-amber-500 px-3.5 py-2 text-sm font-bold text-stone-950 shadow-lg"
              >
                ★ Catch Treat!
              </button>
              <p className="text-[11px] text-stone-200">
                Click the bouncing star treat to feed {petState.name}!
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-amber-200">{statusMessage}</p>
      </div>

      {/* Right: Vitals, Care Buttons & Wardrobe */}
      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-6 lg:col-span-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Pet Name"
              className="flex-1 rounded-lg border border-stone-800 bg-stone-900 px-3 py-1.5 text-xs text-stone-100"
            />
            <button
              type="button"
              onClick={() => {
                if (!nameInput.trim()) return;
                onUpdatePet({ ...petState, name: nameInput.trim() });
                setStatusMessage(`Renamed companion to ${nameInput.trim()}!`);
              }}
              className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:border-amber-500"
            >
              Rename Pet
            </button>
          </div>

          {/* 3 Vital Progress Bars */}
          {(
            [
              { label: 'Hunger (Fullness)', value: petState.hunger, color: 'bg-amber-400' },
              { label: 'Happiness (Affection)', value: petState.happiness, color: 'bg-rose-400' },
              { label: 'Energy (Stamina)', value: petState.energy, color: 'bg-teal-400' },
            ] as const
          ).map((stat) => (
            <div key={stat.label}>
              <div className="flex justify-between text-xs">
                <span className="text-stone-300">{stat.label}</span>
                <span className="font-mono font-bold text-stone-100 tabular-nums">
                  {stat.value}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-stone-900">
                <div
                  className={`h-full ${stat.color} transition-all duration-300`}
                  style={{ width: `${stat.value}%` }}
                />
              </div>
            </div>
          ))}

          {/* Care Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => triggerCare('feed')}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 p-2.5 text-xs font-semibold text-stone-100 hover:border-amber-500/60"
            >
              <Utensils className="h-4 w-4 text-amber-400" />
              <span>Feed Tart</span>
            </button>
            <button
              type="button"
              onClick={() => triggerCare('play')}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 p-2.5 text-xs font-semibold text-stone-100 hover:border-rose-500/60"
            >
              <Heart className="h-4 w-4 text-rose-400" />
              <span>Play Orb</span>
            </button>
            <button
              type="button"
              onClick={() => triggerCare('sleep')}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 p-2.5 text-xs font-semibold text-stone-100 hover:border-teal-500/60"
            >
              <Moon className="h-4 w-4 text-teal-400" />
              <span>Cozy Nap</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTreatsCaught(0);
                setMiniGameActive(true);
                soundFX.playMove();
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs font-semibold text-amber-200 hover:border-amber-400"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Catch Game</span>
            </button>
          </div>

          {/* Wardrobe Selector */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-stone-400">
              Companion Accessories ({unlockedItems.length} unlocked)
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {accessories.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onUpdatePet({ ...petState, accessory: acc.id });
                    soundFX.playMove();
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    petState.accessory === acc.id
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'border border-stone-800 bg-stone-900 text-stone-300'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComplete(carePoints)}
          className="mt-6 w-full rounded-xl bg-teal-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-teal-400"
        >
          Save Pet Sanctuary Progress &amp; Claim +{carePoints} Score
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   2. MEMORY MATCH (Ornate Keepsake Cards, Combo Multiplier, Timer & Custom Photos)
   ============================================================================ */
interface MemoryCardItem {
  id: number;
  pairKey: string;
  label: string;
  symbol: string;
  isCustom?: boolean;
  flipped: boolean;
  matched: boolean;
}

function MemoryMatchGame({
  sessionSeed,
  difficulty,
  personalizedItems,
  onScoreChange,
  onComplete,
}: {
  sessionSeed: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  personalizedItems: PersonalizedItemRecord[];
  onScoreChange: (s: number) => void;
  onComplete: (s: number, details?: Record<string, unknown>) => void;
}) {
  const customPhotos = personalizedItems.filter((i) => i.category === 'memory_photo');

  const [cards, setCards] = useState<MemoryCardItem[]>(() =>
    generateMemoryMatchDeck(sessionSeed, customPhotos[0]?.title)
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function handleFlipCard(idx: number) {
    if (selectedIds.length >= 2) return;
    const target = cards[idx];
    if (!target || target.flipped || target.matched) return;

    const nextCards = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    const nextSelected = [...selectedIds, idx];
    setCards(nextCards);
    setSelectedIds(nextSelected);
    soundFX.playFlip();

    if (nextSelected.length === 2) {
      const [firstIdx, secondIdx] = nextSelected;
      const firstCard = nextCards[firstIdx];
      const secondCard = nextCards[secondIdx];
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      if (firstCard.pairKey === secondCard.pairKey) {
        const nextStreak = comboStreak + 1;
        setComboStreak(nextStreak);
        const nextMatched = matchedPairs + 1;
        const updated = nextCards.map((c, i) =>
          i === firstIdx || i === secondIdx ? { ...c, matched: true } : c
        );
        setCards(updated);
        setSelectedIds([]);
        setMatchedPairs(nextMatched);
        const currentScore = Math.max(
          100,
          nextMatched * 150 + nextStreak * 45 - nextMoves * 10
        );
        onScoreChange(currentScore);
        soundFX.playPop(nextStreak);

        if (nextMatched === 8) {
          setTimeout(() => {
            onComplete(currentScore + 250, {
              moves: nextMoves,
              elapsedSec,
              difficulty,
            });
          }, 350);
        }
      } else {
        setComboStreak(0);
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, flipped: false } : c
            )
          );
          setSelectedIds([]);
        }, 620);
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs text-stone-300">
        <span>
          Pairs Matched: <strong className="text-amber-300">{matchedPairs} / 8</strong>
        </span>
        <span>
          Combo Streak:{' '}
          <strong className="text-rose-400">
            {comboStreak > 0 ? `${comboStreak}x Flame!` : '0x'}
          </strong>
        </span>
        <span>
          Moves: <strong className="text-teal-300">{moves}</strong> · Time:{' '}
          <strong className="font-mono">{elapsedSec}s</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            const freshSeed = generateFreshGameSeed();
            setCards(generateMemoryMatchDeck(freshSeed, customPhotos[0]?.title));
            setSelectedIds([]);
            setMoves(0);
            setMatchedPairs(0);
            setComboStreak(0);
            setElapsedSec(0);
            onScoreChange(0);
          }}
          className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-amber-400 hover:border-amber-400"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Shuffle New Deck</span>
        </button>
      </div>

      <div className="grid w-full grid-cols-4 gap-3">
        {cards.map((card, idx) => {
          const revealed = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlipCard(idx)}
              aria-label={revealed ? card.label : `Memory Card ${idx + 1}`}
              className={`flex h-24 flex-col items-center justify-center rounded-xl border p-2 text-center transition-all duration-200 ${
                card.matched
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 scale-95'
                  : card.flipped
                  ? 'border-amber-400 bg-stone-800 text-stone-100 shadow-lg'
                  : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-amber-500/50 hover:-translate-y-0.5'
              }`}
            >
              {revealed ? (
                <>
                  <span className="text-2xl">{card.symbol}</span>
                  <span className="mt-1 line-clamp-1 text-[11px] font-semibold">
                    {card.label}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-sm text-amber-400">
                    ✦
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
                    Keepsake
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   3. BUBBLE SHOOTER (Full HTML5 Canvas Trajectory Aiming + Hex Grid + Avalanche Drop)
   ============================================================================ */
const BUBBLE_PALETTE = [
  { id: 0, name: 'Amber', hex: '#F59E0B', rim: '#FDE68A' },
  { id: 1, name: 'Teal', hex: '#14B8A6', rim: '#99F6E4' },
  { id: 2, name: 'Rose', hex: '#F43F5E', rim: '#FECDD3' },
  { id: 3, name: 'Violet', hex: '#8B5CF6', rim: '#DDD6FE' },
  { id: 4, name: 'Emerald', hex: '#10B981', rim: '#A7F3D0' },
];

const HEX_ROWS = 10;
const HEX_COLS = 11;
const BUBBLE_RADIUS = 19;
const CANVAS_W = 480;
const CANVAS_H = 440;
const LAUNCHER_X = CANVAS_W / 2;
const LAUNCHER_Y = CANVAS_H - 34;

function getBubbleCenter(r: number, c: number): { x: number; y: number } {
  const oddOffset = r % 2 === 1 ? BUBBLE_RADIUS : 0;
  const x = 36 + c * (BUBBLE_RADIUS * 2) + oddOffset;
  const y = 32 + r * (BUBBLE_RADIUS * 1.74);
  return { x, y };
}

interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorId: number;
}

interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
}

function BubbleShooterGame({
  sessionSeed,
  difficulty,
  onScoreChange,
  onComplete,
}: {
  sessionSeed: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onScoreChange: (s: number) => void;
  onComplete: (s: number, summaryText: string, details?: Record<string, unknown>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudScore, setHudScore] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [currentColorId, setCurrentColorId] = useState(() => sessionSeed % 4);
  const [nextColorId, setNextColorId] = useState(() => (sessionSeed + 1) % 4);
  const [statusNote, setStatusNote] = useState(
    'Move mouse/touch to aim the laser guide, then click to launch! Match 3+ to pop & drop floating clusters!'
  );

  const simRef = useRef<{
    grid: (number | null)[][];
    aimAngle: number; // radians from horizontal (-PI+0.2 to -0.2)
    activeColor: number;
    previewColor: number;
    projectile: {
      active: boolean;
      x: number;
      y: number;
      vx: number;
      vy: number;
      colorId: number;
    };
    falling: FallingBubble[];
    particles: PopParticle[];
    score: number;
    shots: number;
    finished: boolean;
  }>({
    grid: generateBubbleShooterGrid(HEX_ROWS, HEX_COLS, difficulty, sessionSeed),
    aimAngle: -Math.PI / 2,
    activeColor: sessionSeed % 4,
    previewColor: (sessionSeed + 1) % 4,
    projectile: {
      active: false,
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: 0,
      vy: 0,
      colorId: 0,
    },
    falling: [],
    particles: [],
    score: 0,
    shots: 0,
    finished: false,
  });

  const launchBubble = useCallback(() => {
    const s = simRef.current;
    if (s.projectile.active || s.finished) return;
    const speed = 640;
    s.projectile = {
      active: true,
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: Math.cos(s.aimAngle) * speed,
      vy: Math.sin(s.aimAngle) * speed,
      colorId: s.activeColor,
    };
    soundFX.playMove();
  }, []);

  const swapBubbles = useCallback(() => {
    const s = simRef.current;
    if (s.projectile.active) return;
    const tmp = s.activeColor;
    s.activeColor = s.previewColor;
    s.previewColor = tmp;
    setCurrentColorId(s.activeColor);
    setNextColorId(s.previewColor);
    soundFX.playFlip();
  }, []);

  // Keyboard support (Left/Right arrows to aim, Space/Up to shoot, R to swap)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        s.aimAngle = Math.max(-Math.PI + 0.22, s.aimAngle - 0.08);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        s.aimAngle = Math.min(-0.22, s.aimAngle + 0.08);
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        launchBubble();
      } else if (e.key === 'r' || e.key === 'R') {
        swapBubbles();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [launchBubble, swapBubbles]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const snapProjectileToGrid = (px: number, py: number, colorId: number) => {
      const s = simRef.current;
      let bestR = 0;
      let bestC = 0;
      let bestDist = Infinity;

      for (let r = 0; r < HEX_ROWS; r++) {
        for (let c = 0; c < HEX_COLS; c++) {
          if (s.grid[r][c] !== null) continue;
          const center = getBubbleCenter(r, c);
          const d = Math.hypot(px - center.x, py - center.y);
          if (d < bestDist) {
            bestDist = d;
            bestR = r;
            bestC = c;
          }
        }
      }

      // Snapshot old colors before popping for falling bubble animations
      const prevGrid = s.grid.map((row) => [...row]);
      prevGrid[bestR][bestC] = colorId;

      const { nextGrid, poppedCells, droppedCells } = resolveBubbleClusterAndAvalanche(
        prevGrid,
        bestR,
        bestC
      );
      s.grid = nextGrid;
      s.shots += 1;
      setShotsFired(s.shots);

      if (poppedCells.length >= 3) {
        // Spawn pop particles
        for (const [pr, pc] of poppedCells) {
          const { x, y } = getBubbleCenter(pr, pc);
          const colHex = BUBBLE_PALETTE[colorId]?.hex || '#F59E0B';
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI * 2 * k) / 6;
            s.particles.push({
              x,
              y,
              vx: Math.cos(ang) * 90,
              vy: Math.sin(ang) * 90,
              color: colHex,
              alpha: 1,
            });
          }
        }

        // Spawn falling avalanche bubbles for unanchored clusters!
        for (const [dr, dc] of droppedCells) {
          const { x, y } = getBubbleCenter(dr, dc);
          const cId = prevGrid[dr][dc] ?? 0;
          s.falling.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 60,
            vy: 40,
            colorId: cId,
          });
        }

        const gained = poppedCells.length * 45 + droppedCells.length * 90;
        s.score += gained;
        setHudScore(s.score);
        onScoreChange(s.score);
        soundFX.playPop(poppedCells.length);

        if (droppedCells.length > 0) {
          setStatusNote(
            `AVALANCHE! Popped ${poppedCells.length} & dropped ${droppedCells.length} unanchored bubbles (+${gained} pts)!`
          );
        } else {
          setStatusNote(`Popped ${poppedCells.length} matching bubbles (+${gained} pts)!`);
        }
      } else {
        soundFX.playDrop();
        // Every 6 non-clearing shots, add a ceiling row shift if space permits
        if (s.shots % 6 === 0) {
          const colorCount = difficulty === 'Easy' ? 4 : 5;
          const newTopRow = Array.from(
            { length: HEX_COLS },
            (_, c) => (s.shots + c) % colorCount
          );
          s.grid = [newTopRow, ...s.grid.slice(0, HEX_ROWS - 1)];
          setStatusNote('New bubble row descended from the starlight ceiling!');
        }
      }

      // Advance active & preview bubble colors from remaining colors on board
      const activeBoardColors = new Set<number>();
      let remainingCount = 0;
      let bottomReached = false;
      for (let r = 0; r < HEX_ROWS; r++) {
        for (let c = 0; c < HEX_COLS; c++) {
          const cellVal = s.grid[r][c];
          if (cellVal !== null) {
            remainingCount++;
            activeBoardColors.add(cellVal);
            if (r >= HEX_ROWS - 1) bottomReached = true;
          }
        }
      }

      const colorPool =
        activeBoardColors.size > 0 ? Array.from(activeBoardColors) : [0, 1, 2, 3];
      s.activeColor = colorPool.includes(s.previewColor)
        ? s.previewColor
        : colorPool[0];
      s.previewColor = colorPool[Math.floor(Math.random() * colorPool.length)];
      setCurrentColorId(s.activeColor);
      setNextColorId(s.previewColor);

      if (remainingCount === 0 && !s.finished) {
        s.finished = true;
        const winScore = s.score + 600;
        onScoreChange(winScore);
        onComplete(winScore, 'All Starlight Bubbles Cleared!', { shots: s.shots });
      } else if (bottomReached && !s.finished) {
        s.finished = true;
        onComplete(Math.max(150, s.score), 'Bubbles Reached the Bottom Line!', {
          shots: s.shots,
        });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      const s = simRef.current;
      const canvas = canvasRef.current;

      // Update flying projectile
      if (s.projectile.active) {
        s.projectile.x += s.projectile.vx * dt;
        s.projectile.y += s.projectile.vy * dt;

        // Bounce off left and right playfield walls
        if (s.projectile.x <= BUBBLE_RADIUS + 14) {
          s.projectile.x = BUBBLE_RADIUS + 14;
          s.projectile.vx = Math.abs(s.projectile.vx);
          soundFX.playMove();
        } else if (s.projectile.x >= CANVAS_W - BUBBLE_RADIUS - 14) {
          s.projectile.x = CANVAS_W - BUBBLE_RADIUS - 14;
          s.projectile.vx = -Math.abs(s.projectile.vx);
          soundFX.playMove();
        }

        // Check collision with top ceiling or any existing bubble
        let hit = s.projectile.y <= BUBBLE_RADIUS + 16;
        if (!hit) {
          for (let r = 0; r < HEX_ROWS && !hit; r++) {
            for (let c = 0; c < HEX_COLS; c++) {
              if (s.grid[r][c] === null) continue;
              const center = getBubbleCenter(r, c);
              if (
                Math.hypot(s.projectile.x - center.x, s.projectile.y - center.y) <=
                BUBBLE_RADIUS * 1.88
              ) {
                hit = true;
                break;
              }
            }
          }
        }

        if (hit) {
          s.projectile.active = false;
          snapProjectileToGrid(
            s.projectile.x,
            s.projectile.y,
            s.projectile.colorId
          );
        }
      }

      // Update falling avalanche bubbles
      s.falling = s.falling
        .map((fb) => ({
          ...fb,
          x: fb.x + fb.vx * dt,
          y: fb.y + fb.vy * dt,
          vy: fb.vy + 680 * dt,
        }))
        .filter((fb) => fb.y < CANVAS_H + 30);

      // Update pop particles
      s.particles = s.particles
        .map((pt) => ({
          ...pt,
          x: pt.x + pt.vx * dt,
          y: pt.y + pt.vy * dt,
          alpha: pt.alpha - dt * 2.2,
        }))
        .filter((pt) => pt.alpha > 0);

      // Render Canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Deep Indigo Starfield Background
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

          // Danger line near bottom
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(14, CANVAS_H - 76);
          ctx.lineTo(CANVAS_W - 14, CANVAS_H - 76);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Laser Aiming Trajectory (with wall reflection)
          if (!s.projectile.active) {
            ctx.save();
            ctx.strokeStyle = 'rgba(253, 230, 138, 0.65)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 6]);
            ctx.beginPath();
            let rx = LAUNCHER_X;
            let ry = LAUNCHER_Y;
            let dx = Math.cos(s.aimAngle);
            let dy = Math.sin(s.aimAngle);
            ctx.moveTo(rx, ry);
            for (let step = 0; step < 34; step++) {
              rx += dx * 12;
              ry += dy * 12;
              if (rx <= BUBBLE_RADIUS + 14 || rx >= CANVAS_W - BUBBLE_RADIUS - 14) {
                dx = -dx;
              }
              ctx.lineTo(rx, ry);
              if (ry <= 34) break;
            }
            ctx.stroke();
            ctx.restore();
          }

          // Helper to draw a glossy 3D-shaded arcade bubble
          const drawGlossyBubble = (bx: number, by: number, colorId: number) => {
            const pal = BUBBLE_PALETTE[colorId % BUBBLE_PALETTE.length];
            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
            ctx.fillStyle = pal.hex;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = pal.rim;
            ctx.stroke();

            // Specular highlight
            ctx.beginPath();
            ctx.arc(bx - 6, by - 6, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fill();
            ctx.restore();
          };

          // Draw Hex Grid Bubbles
          for (let r = 0; r < HEX_ROWS; r++) {
            for (let c = 0; c < HEX_COLS; c++) {
              const colorId = s.grid[r][c];
              if (colorId === null) continue;
              const { x, y } = getBubbleCenter(r, c);
              drawGlossyBubble(x, y, colorId);
            }
          }

          // Draw Falling Avalanche Bubbles
          for (const fb of s.falling) {
            drawGlossyBubble(fb.x, fb.y, fb.colorId);
          }

          // Draw Pop Particles
          for (const pt of s.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // Draw Shooter Cannon Base & Active Bubble
          ctx.save();
          ctx.translate(LAUNCHER_X, LAUNCHER_Y);
          ctx.rotate(s.aimAngle + Math.PI / 2);
          ctx.fillStyle = '#334155';
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 2;
          ctx.fillRect(-10, -34, 20, 34);
          ctx.strokeRect(-10, -34, 20, 34);
          ctx.restore();

          if (s.projectile.active) {
            drawGlossyBubble(
              s.projectile.x,
              s.projectile.y,
              s.projectile.colorId
            );
          } else {
            drawGlossyBubble(LAUNCHER_X, LAUNCHER_Y, s.activeColor);
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [difficulty, onComplete, onScoreChange]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const my = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    const dx = mx - LAUNCHER_X;
    const dy = Math.min(-24, my - LAUNCHER_Y);
    const angle = Math.atan2(dy, dx);
    simRef.current.aimAngle = Math.max(-Math.PI + 0.18, Math.min(-0.18, angle));
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-3">
          <span>
            Active Bubble:{' '}
            <strong
              style={{ color: BUBBLE_PALETTE[currentColorId]?.hex }}
              className="font-bold"
            >
              ● {BUBBLE_PALETTE[currentColorId]?.name}
            </strong>
          </span>
          <span>
            Next:{' '}
            <strong
              style={{ color: BUBBLE_PALETTE[nextColorId]?.hex }}
              className="font-bold"
            >
              ● {BUBBLE_PALETTE[nextColorId]?.name}
            </strong>
          </span>
          <span className="font-mono text-stone-400">Shots: {shotsFired}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={swapBubbles}
            className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:border-amber-400"
          >
            Swap Bubble [R]
          </button>
          <button
            type="button"
            onClick={() => {
              const freshSeed = generateFreshGameSeed();
              simRef.current.grid = generateBubbleShooterGrid(
                HEX_ROWS,
                HEX_COLS,
                difficulty,
                freshSeed
              );
              simRef.current.score = 0;
              simRef.current.shots = 0;
              simRef.current.finished = false;
              setHudScore(0);
              setShotsFired(0);
              onScoreChange(0);
            }}
            className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-xs text-stone-300 hover:border-amber-400"
          >
            New Random Board
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseMove={handleMouseMove}
        onClick={launchBubble}
        data-testid="bubble-shooter-canvas"
        className="w-full max-w-[480px] cursor-crosshair rounded-2xl border-2 border-stone-700 bg-slate-950 shadow-2xl"
      />

      <p className="text-center text-xs text-amber-200">{statusNote}</p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            simRef.current.aimAngle = Math.max(
              -Math.PI + 0.22,
              simRef.current.aimAngle - 0.14
            );
          }}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-200"
        >
          ◀ Aim Left
        </button>
        <button
          type="button"
          onClick={launchBubble}
          className="rounded-lg bg-amber-500 px-5 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Launch Bubble [Click / Space]
        </button>
        <button
          type="button"
          onClick={() => {
            simRef.current.aimAngle = Math.min(-0.22, simRef.current.aimAngle + 0.14);
          }}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-200"
        >
          Aim Right ▶
        </button>
        <button
          type="button"
          onClick={() =>
            onComplete(Math.max(250, hudScore), 'Bubble Shooter Stage Completed!', {
              shots: shotsFired,
            })
          }
          className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-3.5 py-1.5 text-xs font-semibold text-teal-200"
        >
          Bank Score ({hudScore} pts)
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   4. 2048 PUZZLE (With Undo Stack, Max Tile Badge & Full Game Over Detection)
   ============================================================================ */
function Puzzle2048Game({
  sessionSeed,
  onScoreChange,
  onComplete,
}: {
  sessionSeed: number;
  onScoreChange: (s: number) => void;
  onComplete: (s: number, summaryText: string, details?: Record<string, unknown>) => void;
}) {
  const [grid, setGrid] = useState<number[][]>(() =>
    generateInitial2048Grid(sessionSeed)
  );
  const [history, setHistory] = useState<{ grid: number[][]; score: number }[]>([]);
  const [totalScore, setTotalScore] = useState(0);

  const performSlide = useCallback(
    (dir: 'left' | 'right' | 'up' | 'down') => {
      const { nextGrid, scoreDelta, moved } = move2048Grid(grid, dir);
      if (!moved) return;

      // Save undo snapshot
      setHistory((prev) => [...prev.slice(-8), { grid: grid.map((r) => [...r]), score: totalScore }]);

      // Spawn a new 2 (90%) or 4 (10%) in a random empty cell
      const empties: [number, number][] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (nextGrid[r][c] === 0) empties.push([r, c]);
        }
      }
      if (empties.length > 0) {
        const [er, ec] = empties[totalScore % empties.length];
        nextGrid[er][ec] = (totalScore + empties.length) % 5 === 0 ? 4 : 2;
      }

      const updatedScore = totalScore + scoreDelta;
      setGrid(nextGrid);
      setTotalScore(updatedScore);
      onScoreChange(updatedScore);
      if (scoreDelta > 0) soundFX.playPop(2);
      else soundFX.playMove();

      const maxTile = Math.max(...nextGrid.flat());
      if (maxTile >= 2048) {
        onComplete(updatedScore + 1000, '2048 Sunstone Tile Forged!', { maxTile });
        return;
      }

      // Check authentic Game Over condition when no moves remain
      if (!can2048GridMove(nextGrid)) {
        setTimeout(() => {
          onComplete(updatedScore, `No More Moves! Highest Tile: ${maxTile}`, { maxTile });
        }, 400);
      }
    },
    [grid, totalScore, onScoreChange, onComplete]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        performSlide('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        performSlide('right');
      } else if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        performSlide('up');
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        performSlide('down');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [performSlide]);

  function handleUndo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setGrid(prev.grid);
    setTotalScore(prev.score);
    onScoreChange(prev.score);
    setHistory((h) => h.slice(0, -1));
    soundFX.playFlip();
  }

  const maxTile = Math.max(...grid.flat());

  function getTileStyle(val: number): string {
    if (val === 0) return 'border-stone-800 bg-stone-900/70 text-transparent';
    if (val === 2) return 'border-stone-600 bg-[#EFE6D5] text-[#2B2623]';
    if (val === 4) return 'border-amber-700/50 bg-[#E6D5B8] text-[#2B2623]';
    if (val === 8) return 'border-amber-500 bg-[#F59E0B] text-stone-950';
    if (val === 16) return 'border-orange-500 bg-[#EA580C] text-white';
    if (val === 32) return 'border-rose-500 bg-[#E11D48] text-white';
    if (val === 64) return 'border-rose-400 bg-[#BE123C] text-white';
    if (val >= 128 && val < 512) return 'border-amber-300 bg-[#FBBF24] text-stone-950 shadow-md';
    return 'border-teal-300 bg-[#14B8A6] text-stone-950 shadow-lg';
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs">
        <span>
          Max Tile: <strong className="font-mono text-amber-300">{maxTile}</strong>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-stone-200 disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
            <span>Undo ({history.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setGrid(generateInitial2048Grid(generateFreshGameSeed()));
              setHistory([]);
              setTotalScore(0);
              onScoreChange(0);
              soundFX.playFlip();
            }}
            className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-stone-200 hover:border-amber-400"
          >
            New Board
          </button>
          <button
            type="button"
            onClick={() =>
              onComplete(Math.max(250, totalScore), `2048 Run Banked (Max Tile ${maxTile})`, {
                maxTile,
              })
            }
            className="text-amber-400 hover:underline"
          >
            Bank Score
          </button>
        </div>
      </div>

      <div className="grid aspect-square w-full max-w-[340px] grid-cols-4 gap-2.5 rounded-2xl border-2 border-stone-700 bg-stone-950 p-3 shadow-xl">
        {grid.flat().map((val, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-center rounded-xl border font-mono text-xl font-bold tabular-nums transition-all duration-150 ${getTileStyle(
              val
            )}`}
          >
            {val > 0 ? val : ''}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['left', 'up', 'down', 'right'] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => performSlide(dir)}
            className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-2 text-xs font-bold uppercase text-stone-200 hover:border-amber-500"
          >
            {dir}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   5. GUESS THE PICTURE (Multi-Round Progressive Shutter Reveal & Hints)
   ============================================================================ */
function GuessThePictureGame({
  sessionSeed,
  difficulty,
  personalizedItems,
  onScoreChange,
  onComplete,
}: {
  sessionSeed: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  personalizedItems: PersonalizedItemRecord[];
  onScoreChange: (s: number) => void;
  onComplete: (s: number, details?: Record<string, unknown>) => void;
}) {
  const customPhotos = personalizedItems.filter((i) => i.category === 'memory_photo');

  const baseRounds = [
    {
      title: customPhotos[0]?.title || 'Starlight Picnic Blanket',
      image: KEEPSAKE_PICNIC_IMAGE,
      clue: 'Cozy lantern-lit evening outdoors with warm cocoa and pastries.',
      options: seededShuffle(
        [
          customPhotos[0]?.title || 'Starlight Picnic Blanket',
          'Submarine Coral Reef',
          'Desert Sand Dunes',
          'Glacier Iceberg Peak',
        ],
        sessionSeed + 11
      ),
    },
    {
      title: 'Celestial Kitsune Fox',
      image: VIRTUAL_PET_IMAGE,
      clue: 'Our fluffy twin-tailed arcade sanctuary companion.',
      options: seededShuffle(
        [
          'Celestial Kitsune Fox',
          'Snowy Polar Bear',
          'Clockwork Owl',
          'Deep Sea Octopod',
        ],
        sessionSeed + 23
      ),
    },
    {
      title: 'Archipelago Treasure Map',
      image: TREASURE_MAP_IMAGE,
      clue: 'Compass rose and charted islands hiding three golden relics.',
      options: seededShuffle(
        [
          'Archipelago Treasure Map',
          'Subway Train Blueprint',
          'Botanical Greenhouse',
          'Piano Sheet Music',
        ],
        sessionSeed + 37
      ),
    },
  ];

  const rounds = seededShuffle(baseRounds, sessionSeed);

  const [roundIdx, setRoundIdx] = useState(0);
  const [revealedTiles, setRevealedTiles] = useState<number[]>(() => [
    sessionSeed % 16,
    (sessionSeed + 5) % 16,
  ]);
  const [totalPts, setTotalPts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeRound = rounds[roundIdx % rounds.length];

  function revealNextTile(tileIdx?: number) {
    if (typeof tileIdx === 'number' && !revealedTiles.includes(tileIdx)) {
      setRevealedTiles((prev) => [...prev, tileIdx]);
      soundFX.playFlip();
      return;
    }
    const unrevealed = Array.from({ length: 16 }, (_, i) => i).filter(
      (i) => !revealedTiles.includes(i)
    );
    if (unrevealed.length === 0) return;
    const pick = unrevealed[0];
    setRevealedTiles((prev) => [...prev, pick]);
    soundFX.playFlip();
  }

  function submitChoice(option: string) {
    if (option === activeRound.title) {
      const roundScore = Math.max(150, 600 - revealedTiles.length * 25);
      const nextTotal = totalPts + roundScore;
      setTotalPts(nextTotal);
      onScoreChange(nextTotal);
      soundFX.playCapture();

      if (roundIdx + 1 >= rounds.length) {
        onComplete(nextTotal, { roundsCleared: rounds.length, difficulty });
      } else {
        setFeedback(`Correct! +${roundScore} pts! Loading Round ${roundIdx + 2}...`);
        setTimeout(() => {
          setRoundIdx((r) => r + 1);
          setRevealedTiles([5]);
          setFeedback(null);
        }, 650);
      }
    } else {
      setFeedback('Not quite! Click any shutter tile to reveal more of the illustration.');
      revealNextTile();
      soundFX.playError();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col items-center lg:col-span-6">
        <div className="mb-2 flex w-full max-w-md items-center justify-between text-xs text-stone-400">
          <span>
            Round {roundIdx + 1} of {rounds.length}
          </span>
          <span>
            Shutters Opened: {revealedTiles.length}/16 (Fewer shutters = higher bonus!)
          </span>
        </div>

        <div className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl border border-stone-800 bg-stone-950">
          <img
            src={activeRound.image}
            alt="Hidden Mystery Illustration"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }, (_, idx) => {
              const open = revealedTiles.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => revealNextTile(idx)}
                  aria-label={`Reveal shutter tile ${idx + 1}`}
                  className={`border border-stone-900 transition-opacity duration-300 ${
                    open
                      ? 'opacity-0 pointer-events-none'
                      : 'bg-stone-950/95 hover:bg-stone-900'
                  }`}
                >
                  {!open && (
                    <span className="font-mono text-xs text-stone-500">#{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-6 lg:col-span-6">
        <div>
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span>Clue: {activeRound.clue}</span>
            <button
              type="button"
              onClick={() => revealNextTile()}
              className="flex items-center gap-1 rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1 text-teal-300"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open Random Shutter</span>
            </button>
          </div>
          <h4 className="mt-3 text-lg font-bold text-stone-100">
            Which keepsake illustration is hidden behind the shutters?
          </h4>
          {feedback && <p className="mt-2 text-xs font-semibold text-amber-300">{feedback}</p>}

          <div className="mt-4 space-y-2.5">
            {activeRound.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => submitChoice(opt)}
                className="w-full rounded-xl border border-stone-800 bg-stone-900 px-4 py-3 text-left text-xs font-semibold text-stone-100 transition-colors hover:border-amber-500/60"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   6. ENDLESS RUNNER (60fps Parallax Canvas, Double-Jump, Crouch/Slide & Shield)
   ============================================================================ */
function EndlessRunnerGame({
  isPaused,
  difficulty,
  onScoreChange,
  onComplete,
}: {
  isPaused: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onScoreChange: (s: number) => void;
  onComplete: (s: number, details?: Record<string, unknown>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    playerY: 216,
    vy: 0,
    jumpsRemaining: 2,
    ducking: false,
    shieldActive: true,
    obstacles: [
      { x: 520, type: 'ground' as 'ground' | 'aerial', passed: false },
      { x: 860, type: 'aerial' as 'ground' | 'aerial', passed: false },
    ],
    coinsList: [
      { x: 360, y: 175 },
      { x: 410, y: 155 },
      { x: 460, y: 175 },
    ],
    bgScroll: 0,
    score: 0,
    coins: 0,
    speed: difficulty === 'Hard' ? 280 : difficulty === 'Medium' ? 245 : 215,
    animTime: 0,
  });

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.jumpsRemaining > 0) {
      s.vy = -420;
      s.jumpsRemaining -= 1;
      s.ducking = false;
      soundFX.playMove();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        triggerJump();
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        stateRef.current.ducking = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's') {
        stateRef.current.ducking = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [triggerJump]);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas && !isPaused) {
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;
        s.animTime += dt;
        s.bgScroll = (s.bgScroll + s.speed * dt * 0.4) % 680;

        // Gravity & Jump Physics
        s.vy += 1050 * dt;
        s.playerY += s.vy * dt;
        const groundY = s.ducking ? 230 : 216;
        if (s.playerY >= groundY) {
          s.playerY = groundY;
          s.vy = 0;
          s.jumpsRemaining = 2;
        }

        // Update Coins
        for (const coin of s.coinsList) {
          coin.x -= s.speed * dt;
          if (Math.abs(coin.x - 96) < 28 && Math.abs(s.playerY - coin.y) < 38) {
            s.coins += 1;
            s.score += 75;
            coin.x = 700 + Math.random() * 240;
            coin.y = 145 + Math.floor(Math.random() * 60);
            onScoreChange(Math.round(s.score));
            soundFX.playCapture();
          } else if (coin.x < -20) {
            coin.x = 700 + Math.random() * 220;
          }
        }

        // Update Obstacles
        for (const obs of s.obstacles) {
          obs.x -= s.speed * dt;
          if (obs.x < -40) {
            obs.x = 690 + Math.random() * 240;
            obs.type = Math.random() < 0.35 ? 'aerial' : 'ground';
            obs.passed = false;
            s.score += 55;
            s.speed = Math.min(440, s.speed + 4);
            onScoreChange(Math.round(s.score));
          }

          // Check Collision
          const playerH = s.ducking ? 20 : 34;
          const playerTop = s.playerY;
          const playerBottom = s.playerY + playerH;

          const obsLeft = obs.x;
          const obsRight = obs.x + 26;
          const obsTop = obs.type === 'aerial' ? 182 : 214;
          const obsBottom = obs.type === 'aerial' ? 218 : 250;

          if (96 + 26 > obsLeft && 96 < obsRight && playerBottom > obsTop && playerTop < obsBottom) {
            if (s.shieldActive) {
              s.shieldActive = false;
              obs.x = 760;
              soundFX.playSplash();
            } else if (s.score > 350) {
              onComplete(Math.round(s.score), { coinsCollected: s.coins });
              return;
            } else {
              obs.x = 760;
            }
          }
        }

        if (ctx) {
          // Twilight Sky Gradient
          const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
          grad.addColorStop(0, '#090D16');
          grad.addColorStop(1, '#1E1B4B');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Parallax Moon & Distant Mountains
          ctx.fillStyle = '#FDE68A';
          ctx.beginPath();
          ctx.arc(560, 58, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#1E293B';
          for (let i = -1; i < 4; i++) {
            const mx = i * 240 - (s.bgScroll * 0.5) % 240;
            ctx.beginPath();
            ctx.moveTo(mx, 250);
            ctx.lineTo(mx + 120, 145);
            ctx.lineTo(mx + 240, 250);
            ctx.fill();
          }

          // Rooftop Track
          ctx.fillStyle = '#292524';
          ctx.fillRect(0, 250, canvas.width, 50);
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 250);
          ctx.lineTo(canvas.width, 250);
          ctx.stroke();

          // Collectible Starlight Coins
          for (const coin of s.coinsList) {
            ctx.fillStyle = '#FBBF24';
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Obstacles (Ground Lantern Hurdles & Aerial Spirit Banners)
          for (const obs of s.obstacles) {
            if (obs.type === 'ground') {
              ctx.fillStyle = '#F43F5E';
              ctx.fillRect(obs.x, 214, 24, 36);
              ctx.strokeStyle = '#FECDD3';
              ctx.strokeRect(obs.x, 214, 24, 36);
            } else {
              ctx.fillStyle = '#A855F7';
              ctx.fillRect(obs.x, 182, 28, 32);
              ctx.strokeStyle = '#E9D5FF';
              ctx.strokeRect(obs.x, 182, 28, 32);
            }
          }

          // Animated Kitsune Runner
          const pH = s.ducking ? 20 : 34;
          ctx.save();
          if (s.shieldActive) {
            ctx.strokeStyle = 'rgba(45, 212, 191, 0.7)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(96 + 15, s.playerY + pH / 2, 24, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(96, s.playerY, 30, pH);
          // Fox Ears
          if (!s.ducking) {
            ctx.beginPath();
            ctx.moveTo(98, s.playerY);
            ctx.lineTo(104, s.playerY - 10);
            ctx.lineTo(110, s.playerY);
            ctx.moveTo(114, s.playerY);
            ctx.lineTo(120, s.playerY - 10);
            ctx.lineTo(126, s.playerY);
            ctx.fillStyle = '#FDE68A';
            ctx.fill();
          }
          ctx.restore();
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPaused, onScoreChange, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={680}
        height={300}
        onClick={triggerJump}
        data-testid="endless-runner-canvas"
        className="w-full max-w-2xl cursor-pointer rounded-2xl border border-stone-800 bg-stone-950 shadow-xl"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={triggerJump}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Jump / Double-Jump [Space / W]
        </button>
        <button
          type="button"
          onMouseDown={() => {
            stateRef.current.ducking = true;
          }}
          onMouseUp={() => {
            stateRef.current.ducking = false;
          }}
          className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-xs font-semibold text-teal-300"
        >
          Hold to Duck [Down / S]
        </button>
        <button
          type="button"
          onClick={() =>
            onComplete(Math.max(300, Math.round(stateRef.current.score)), {
              coinsCollected: stateRef.current.coins,
            })
          }
          className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-800"
        >
          Finish Run &amp; Claim Rewards
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   7. SUDOKU & DAILY PUZZLES (9x9 Subgrids, Pencil Notes, Conflict Check & Hints)
   ============================================================================ */

function SudokuDailyGame({
  sessionSeed,
  difficulty,
  onScoreChange,
  onComplete,
}: {
  sessionSeed: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onScoreChange: (s: number) => void;
  onComplete: (s: number, details?: Record<string, unknown>) => void;
}) {
  const [{ board, solution, fixed }, setPuzzle] = useState(() =>
    generateSudokuBoard(difficulty, sessionSeed)
  );
  const [notes, setNotes] = useState<Record<string, number[]>>({});
  const [notesMode, setNotesMode] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  function hasSudokuConflict(b: number[][], r: number, c: number, val: number): boolean {
    if (val === 0) return false;
    for (let i = 0; i < 9; i++) {
      if (i !== c && b[r][i] === val) return true;
      if (i !== r && b[i][c] === val) return true;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        if ((rr !== r || cc !== c) && b[rr][cc] === val) return true;
      }
    }
    return false;
  }

  function handleNumberInput(num: number) {
    const [r, c] = selectedCell;
    if (fixed[r][c]) return;

    if (notesMode && num !== 0) {
      const key = `${r}-${c}`;
      const existing = notes[key] || [];
      const nextNotes = existing.includes(num)
        ? existing.filter((n) => n !== num)
        : [...existing, num].sort();
      setNotes({ ...notes, [key]: nextNotes });
      soundFX.playFlip();
      return;
    }

    const next = board.map((row) => [...row]);
    next[r][c] = num;
    setPuzzle({ board: next, solution, fixed });

    if (num !== 0 && num !== solution[r][c]) {
      setMistakes((m) => m + 1);
      soundFX.playError();
    } else {
      soundFX.playMove();
    }

    let correctCells = 0;
    let allSolved = true;
    for (let rr = 0; rr < 9; rr++) {
      for (let cc = 0; cc < 9; cc++) {
        if (next[rr][cc] === solution[rr][cc]) {
          correctCells++;
        } else {
          allSolved = false;
        }
      }
    }
    const pts = Math.max(0, correctCells * 15 - mistakes * 20);
    onScoreChange(pts);
    if (allSolved) {
      onComplete(pts + 400, { hintsUsed, mistakes, difficulty });
    }
  }

  function handleRevealHint() {
    const [r, c] = selectedCell;
    setHintsUsed((h) => h + 1);
    const prevMode = notesMode;
    if (prevMode) setNotesMode(false);
    const next = board.map((row) => [...row]);
    next[r][c] = solution[r][c];
    setPuzzle({ board: next, solution, fixed });
    soundFX.playCapture();
  }

  const selectedVal = board[selectedCell[0]]?.[selectedCell[1]] || 0;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs">
        <span>
          Mistakes: <strong className="text-rose-400">{mistakes}</strong> · Hints:{' '}
          <strong className="text-teal-300">{hintsUsed}</strong>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPuzzle(generateSudokuBoard(difficulty, generateFreshGameSeed()));
              setNotes({});
              setHintsUsed(0);
              setMistakes(0);
              onScoreChange(0);
              soundFX.playFlip();
            }}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-amber-300 hover:border-amber-400"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New Puzzle</span>
          </button>
          <button
            type="button"
            onClick={() => setNotesMode((m) => !m)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 font-semibold ${
              notesMode
                ? 'border-amber-400 bg-amber-500 text-stone-950'
                : 'border-stone-700 bg-stone-900 text-stone-300'
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Notes: {notesMode ? 'ON' : 'OFF'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleNumberInput(0)}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-stone-300"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* 9x9 Sudoku Grid with Bold 3x3 Subgrid Borders */}
      <div className="grid aspect-square w-full max-w-[405px] grid-cols-9 overflow-hidden rounded-xl border-3 border-stone-600 bg-stone-950 shadow-xl">
        {board.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selectedCell[0] === r && selectedCell[1] === c;
            const isSameNumber = val !== 0 && val === selectedVal;
            const isGiven = fixed[r][c];
            const isWrong =
              val !== 0 &&
              (val !== solution[r][c] || hasSudokuConflict(board, r, c, val));
            const cellNotes = notes[`${r}-${c}`] || [];
            const thickRight = c === 2 || c === 5 ? 'border-r-2 border-r-stone-500' : '';
            const thickBottom = r === 2 || r === 5 ? 'border-b-2 border-b-stone-500' : '';

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => setSelectedCell([r, c])}
                aria-label={`Row ${r + 1} Column ${c + 1} Value ${val || 'Empty'}`}
                className={`relative flex aspect-square items-center justify-center border border-stone-800/80 font-mono text-sm font-bold tabular-nums ${thickRight} ${thickBottom} ${
                  isSelected
                    ? 'bg-amber-500/35 text-amber-200 ring-2 ring-inset ring-amber-400'
                    : isWrong
                    ? 'bg-rose-500/25 text-rose-300'
                    : isSameNumber
                    ? 'bg-teal-500/20 text-teal-200'
                    : isGiven
                    ? 'bg-stone-900 text-stone-100'
                    : 'bg-stone-950 text-amber-300'
                }`}
              >
                {val !== 0 ? (
                  val
                ) : cellNotes.length > 0 ? (
                  <span className="px-0.5 text-[9px] leading-tight text-stone-400">
                    {cellNotes.join('')}
                  </span>
                ) : (
                  ''
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleNumberInput(n)}
            className="h-10 w-10 rounded-lg border border-stone-700 bg-stone-900 font-mono text-sm font-bold text-stone-100 hover:border-amber-500"
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={handleRevealHint}
          className="flex h-10 items-center gap-1 rounded-lg bg-teal-500 px-3 text-xs font-bold text-stone-950 hover:bg-teal-400"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Hint</span>
        </button>
      </div>
    </div>
  );
}
