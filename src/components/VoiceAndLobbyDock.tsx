'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Copy,
  Check,
  Send,
  Users,
  Radio,
  Sparkles,
  PlusCircle,
  LogIn,
  Play,
  AlertCircle,
  CheckCircle2,
  Search,
  Globe,
  Lock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { MULTIPLAYER_GAMES, PARTY_GAMES, getSkinById } from '@/src/lib/arcade-data';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { ArcadeCircularLoader, ArcadeInlineSpinner } from './ArcadeLoader';
import { soundFX } from '@/src/lib/sound';

export interface RoomParticipant {
  uid: string;
  username: string;
  avatar: string;
  coupleId?: number;
  coupleName?: string;
  teamSlot?: 1 | 2;
  ready: boolean;
  online: boolean;
}

export interface RoomCoupleTeam {
  teamSlot: 1 | 2;
  coupleId: number;
  coupleName: string;
  coupleTrophies?: number;
  score: number;
  members: { uid: string; username: string; avatar: string }[];
}

export interface RoomPendingRequest {
  uid: string;
  username: string;
  avatar: string;
  coupleId?: number;
  coupleName?: string;
  partnerUid?: string;
  partnerUsername?: string;
  partnerAvatar?: string;
  requestedAt: string;
}

export interface GameInvitationItem {
  id: number;
  inviteType: '1v1' | '2v2' | '2v2_partner_team' | string;
  senderUid: string;
  senderUsername: string;
  senderAvatar: string;
  senderCoupleId: number;
  senderCoupleName: string;
  targetUid: string;
  targetUsername: string;
  targetCoupleId: number;
  targetCoupleName: string;
  gameId: string;
  roomCode: string;
  status: string;
}

export type IncomingInvitationRecord = GameInvitationItem;

export interface VoiceParticipant {
  uid: string;
  username: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  volume: number;
}

export interface RoomChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface MultiplayerRoomState {
  roomCode: string;
  gameId: string;
  gameTitle?: string;
  mode: '1v1' | '2v2' | 'party';
  visibility?: 'public' | 'private';
  joinPolicy?: 'immediate' | 'approval_required';
  maxPlayers: number;
  hostUid: string;
  hostName: string;
  hostUsername?: string;
  hostAvatar?: string;
  status: 'lobby' | 'playing' | 'finished' | 'expired';
  sessionSeed?: number;
  settings: Record<string, unknown>;
  players: RoomParticipant[];
  teams: RoomCoupleTeam[];
  pendingRequests?: RoomPendingRequest[];
  invitedUids?: string[];
  gameState: Record<string, unknown>;
  chat: RoomChatMessage[];
  voiceParticipants: VoiceParticipant[];
}

export type ActiveMultiplayerRoom = MultiplayerRoomState;

export interface PublicRoomSummaryItem {
  roomCode: string;
  gameId: string;
  gameName: string;
  mode: '1v1' | '2v2' | 'party';
  visibility: 'public' | 'private';
  joinPolicy: 'immediate' | 'approval_required';
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  pendingRequestAlreadySent?: boolean;
  players: RoomParticipant[];
  teams: RoomCoupleTeam[];
  createdAt?: string;
}

interface RoomInspectionResult {
  valid: boolean;
  reason: string;
  message: string;
  room: {
    roomCode: string;
    gameId: string;
    mode: '1v1' | '2v2' | 'party';
    visibility?: 'public' | 'private';
    joinPolicy?: 'immediate' | 'approval_required';
    maxPlayers: number;
    hostUid: string;
    hostName: string;
    hostAvatar?: string;
    status: string;
    players: RoomParticipant[];
    teams: RoomCoupleTeam[];
  } | null;
}

interface MatchmakingQueueEntry {
  id: number;
  queueMode: '1v1' | '2v2';
  gameId: string;
  coupleId: number;
  coupleName: string;
  coupleTrophies?: number;
  allowedTrophyRange?: number;
  waitSeconds?: number;
  requesterUid: string;
  requesterUsername: string;
  requesterAvatar: string;
  partnerUid: string;
  partnerUsername: string;
  partnerAvatar: string;
  status: 'searching' | 'match_found' | 'match_starting' | 'cancelled' | 'expired';
  matchedRoomCode: string;
  opponentCoupleId: number;
  opponentCoupleName: string;
  opponentProfiles: { uid: string; username: string; avatar: string }[];
}

interface MatchmakingPollState {
  myQueueEntry: MatchmakingQueueEntry | null;
  matchedRoom: Record<string, unknown> | null;
  queueCounts: { queue1v1Count: number; queue2v2Count: number };
  partnerOnline: boolean;
  bothPartnersOnline?: boolean;
  coupleInActiveMatch?: boolean;
  activeMatchRoomCode?: string;
  coupleAvailable: boolean;
}

interface VoiceAndLobbyDockProps {
  currentUser: { uid: string; username: string; avatar: string };
  sessionToken: string;
  activeCouple: EnrichedCouplePairing | null;
  activeRoom: MultiplayerRoomState | null;
  incomingInvitations?: GameInvitationItem[];
  requestedLobbyTab?: 'matchmake' | 'invite' | 'create' | 'join' | null;
  preferredMode?: '1v1' | '2v2';
  onLobbyTabChange?: (tab: 'matchmake' | 'invite' | 'create' | 'join') => void;
  onRefreshInvitations?: () => void;
  onUpdateRoom: (nextRoom: MultiplayerRoomState) => void;
  onStartRoomGame: (room: MultiplayerRoomState) => void;
  onSelectGame: (gameId: string) => void;
  onOpenCouplePairing?: () => void;
  onVoiceAchievement?: () => void;
}

function getAvatarEmoji(avatarCode?: string) {
  if (avatarCode && avatarCode.length <= 4 && !/^[a-z-]+$/i.test(avatarCode)) {
    return avatarCode;
  }
  if (avatarCode === 'star-cat') return '🐱';
  if (avatarCode === 'bunny') return '🐰';
  if (avatarCode === 'otter') return '🦦';
  return '🦊';
}

export function parseRawDatabaseRoom(raw: Record<string, unknown>): MultiplayerRoomState {
  const modeVal =
    raw.mode === 'party' ? 'party' : raw.mode === '2v2' ? '2v2' : '1v1';
  return {
    roomCode: String(raw.roomCode || ''),
    gameId: String(raw.gameId || 'chess'),
    gameTitle: String(raw.gameTitle || raw.gameName || ''),
    mode: modeVal,
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    joinPolicy:
      raw.joinPolicy === 'approval_required' ? 'approval_required' : 'immediate',
    maxPlayers: Number(
      raw.maxPlayers || (modeVal === 'party' ? 20 : modeVal === '2v2' ? 4 : 2)
    ),
    hostUid: String(raw.hostUid || ''),
    hostName: String(raw.hostName || raw.hostUsername || 'Host'),
    hostUsername: String(raw.hostUsername || raw.hostName || 'Host'),
    hostAvatar: String(raw.hostAvatar || '🦊'),
    status: (raw.status as MultiplayerRoomState['status']) || 'lobby',
    sessionSeed: typeof raw.sessionSeed === 'number' ? raw.sessionSeed : undefined,
    settings: safeParse(raw.settingsJson ?? raw.settings, {}),
    players: safeParse(raw.playersJson ?? raw.players, []),
    teams: safeParse(raw.teamsJson ?? raw.teams, []),
    pendingRequests: safeParse(raw.pendingRequestsJson ?? raw.pendingRequests, []),
    invitedUids: safeParse(raw.invitedUidsJson ?? raw.invitedUids, []),
    gameState: safeParse(raw.gameStateJson ?? raw.gameState, {}),
    chat: safeParse(raw.chatJson ?? raw.chat, []),
    voiceParticipants: safeParse(
      raw.voiceParticipantsJson ?? raw.voiceParticipants,
      []
    ),
  };
}

function safeParse<T>(val: unknown, fallback: T): T {
  if (typeof val !== 'string') return (val as T) ?? fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

export function VoiceAndLobbyDock({
  currentUser,
  sessionToken,
  activeCouple,
  activeRoom,
  incomingInvitations = [],
  requestedLobbyTab,
  preferredMode,
  onLobbyTabChange,
  onRefreshInvitations,
  onUpdateRoom,
  onStartRoomGame,
  onSelectGame,
  onOpenCouplePairing,
  onVoiceAchievement,
}: VoiceAndLobbyDockProps) {
  const [internalLobbyTab, setInternalLobbyTab] = useState<
    'matchmake' | 'invite' | 'create' | 'join'
  >('matchmake');
  const lobbyTab = requestedLobbyTab || internalLobbyTab;

  function setLobbyTab(nextTab: 'matchmake' | 'invite' | 'create' | 'join') {
    setInternalLobbyTab(nextTab);
    onLobbyTabChange?.(nextTab);
  }

  // Create Room & Matchmaking configuration state
  const [selectedGameId, setSelectedGameId] = useState<string>(
    activeRoom?.gameId || 'quiz-battle'
  );
  const selectedGameDef =
    MULTIPLAYER_GAMES.find((g) => g.id === selectedGameId) || MULTIPLAYER_GAMES[0];
  const [selectedMode, setSelectedMode] = useState<'1v1' | '2v2' | 'party'>(
    preferredMode || '2v2'
  );
  const [roundSetting, setRoundSetting] = useState<string>('Standard Match (Best of 3)');
  const [includePartnerInRoom, setIncludePartnerInRoom] = useState<boolean>(true);
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public');
  const [roomJoinPolicy, setRoomJoinPolicy] = useState<'immediate' | 'approval_required'>(
    'immediate'
  );

  // Public Room Browser state (under Join Group)
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummaryItem[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);
  const [publicFilterGameId, setPublicFilterGameId] = useState<string>('all');
  const [publicFilterMode, setPublicFilterMode] = useState<'all' | '2v2' | 'party'>('all');

  useEffect(() => {
    if (!preferredMode) return;
    const timer = setTimeout(() => {
      setSelectedMode(preferredMode);
    }, 0);
    return () => clearTimeout(timer);
  }, [preferredMode]);

  // Username-Based Invitations state (1v1 Player Invite & 2v2 Couple Invite)
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [isSearchingInviteTargets, setIsSearchingInviteTargets] = useState(false);
  const [hasSearchedInviteTargets, setHasSearchedInviteTargets] = useState(false);
  const [inviteSearchError, setInviteSearchError] = useState<string | null>(null);
  const [selfMatchedUsername, setSelfMatchedUsername] = useState<string | null>(null);
  const [inviteSearchResults, setInviteSearchResults] = useState<{
    players: Array<{
      uid: string;
      username: string;
      avatar: string;
      equippedSkin?: string;
      level: number;
      presenceStatus?: string;
      isOnline: boolean;
      hasActiveCouple: boolean;
      coupleId?: number;
      coupleName: string;
      coupleTrophies: number;
      alreadyInvited?: boolean;
      pendingRoomCode?: string;
    }>;
    couples: Array<{
      coupleId: number;
      coupleName: string;
      coupleTitle: string;
      coupleTrophies: number;
      equippedCoupleSkin?: string;
      bothOnline: boolean;
      alreadyInvited?: boolean;
      pendingRoomCode?: string;
      partnerA: { uid: string; username: string; avatar: string; isOnline: boolean };
      partnerB: { uid: string; username: string; avatar: string; isOnline: boolean };
    }>;
  }>({ players: [], couples: [] });

  // Matchmaking Queue state (1v1 & 2v2)
  const [mmState, setMmState] = useState<MatchmakingPollState | null>(null);
  const [searchElapsedSec, setSearchElapsedSec] = useState<number>(0);
  const launchedRoomCodeRef = useRef<string>('');

  // Join Group lookup & validation state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [inspectedRoom, setInspectedRoom] = useState<RoomInspectionResult | null>(null);
  const [loadingRoomAction, setLoadingRoomAction] = useState(false);
  const [roomErrorMsg, setRoomErrorMsg] = useState<string | null>(null);
  const [roomStatusMsg, setRoomStatusMsg] = useState<string | null>(null);
  const [respondingRequestUid, setRespondingRequestUid] = useState<string | null>(null);

  // Room Chat & Copy state
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Optional WebRTC Voice Chat state
  const [inVoice, setInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'fallback'>('prompt');
  const [partnerVolume, setPartnerVolume] = useState(90);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll matchmaking & presence state every 3.5 seconds
  useEffect(() => {
    if (!currentUser.uid) return;
    let mounted = true;

    async function fetchMmStatus() {
      try {
        const res = await fetch(
          `/api/arcade?matchmakingStatus=1&uid=${encodeURIComponent(currentUser.uid)}`
        );
        if (!res.ok) return;
        const data: MatchmakingPollState = await res.json();
        if (!mounted) return;
        setMmState(data);

        const entry = data.myQueueEntry;
        if (
          entry &&
          (entry.status === 'match_found' || entry.status === 'match_starting') &&
          data.matchedRoom
        ) {
          const parsedRoom = parseRawDatabaseRoom(data.matchedRoom);
          onUpdateRoom(parsedRoom);
        }
      } catch {
        // Ignore transient poll error
      }
    }

    fetchMmStatus();
    const interval = setInterval(fetchMmStatus, 3500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentUser.uid, onUpdateRoom]);

  // Increment elapsed timer while searching
  useEffect(() => {
    const status = mmState?.myQueueEntry?.status;
    if (status !== 'searching') {
      return;
    }
    const timer = setInterval(() => {
      setSearchElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [mmState?.myQueueEntry?.status]);

  // Automatically transition from 'match_found' -> 'match_starting' -> auto-start game session
  useEffect(() => {
    const entry = mmState?.myQueueEntry;
    if (!entry || !mmState?.matchedRoom) return;

    if (
      entry.status === 'match_found' &&
      entry.matchedRoomCode &&
      launchedRoomCodeRef.current !== entry.matchedRoomCode
    ) {
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch('/api/arcade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              action: 'acknowledge_match_starting',
              queueId: entry.id,
            }),
          });
          if (res.ok) {
            const nextState: MatchmakingPollState = await res.json();
            setMmState(nextState);
            if (nextState.matchedRoom) {
              const roomObj = parseRawDatabaseRoom(nextState.matchedRoom);
              launchedRoomCodeRef.current = roomObj.roomCode;
              onUpdateRoom(roomObj);
              onStartRoomGame(roomObj);
              soundFX.playSuccess();
            }
          }
        } catch {
          // ignore
        }
      }, 2400);
      return () => clearTimeout(timeout);
    }
  }, [
    mmState?.myQueueEntry,
    mmState?.matchedRoom,
    sessionToken,
    onUpdateRoom,
    onStartRoomGame,
  ]);

  // Periodically refresh active room state from PostgreSQL so real joining players appear live
  useEffect(() => {
    if (!activeRoom?.roomCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/arcade?roomCode=${encodeURIComponent(activeRoom.roomCode)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.room) {
          const parsed = parseRawDatabaseRoom(data.room);
          onUpdateRoom(parsed);
        }
      } catch {
        // Ignore transient poll error
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [activeRoom?.roomCode, onUpdateRoom]);

  // Push-to-talk key listener ('V' key when not typing in an input)
  useEffect(() => {
    if (!inVoice || !pushToTalk) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyV') {
        setPttActive(true);
        setIsSpeaking(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') {
        setPttActive(false);
        setIsSpeaking(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inVoice, pushToTalk]);

  useEffect(() => {
    return () => {
      if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function handleSearchInviteTargets(
    queryOverride?: string,
    modeOverride?: '1v1' | '2v2' | 'party'
  ) {
    const q = queryOverride !== undefined ? queryOverride : inviteSearchQuery;
    const resolvedOverride: '1v1' | '2v2' | undefined =
      modeOverride === 'party' ? '2v2' : modeOverride;
    const fallbackMode: '1v1' | '2v2' = selectedMode === '1v1' ? '1v1' : '2v2';
    const effectiveInviteType: '1v1' | '2v2' =
      resolvedOverride || (selectedGameDef.supports2v2 ? fallbackMode : '1v1');
    setIsSearchingInviteTargets(true);
    setInviteSearchError(null);
    try {
      let data: {
        players?: typeof inviteSearchResults.players;
        couples?: typeof inviteSearchResults.couples;
        selfMatchedUsername?: string | null;
        error?: string;
      } | null = null;

      if (sessionToken) {
        const res = await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'search_invite_targets',
            query: q,
            inviteType: effectiveInviteType,
          }),
        });
        const parsed = await res.json();
        if (res.ok) {
          data = parsed;
        }
      }

      if (!data && currentUser.uid) {
        const fallbackRes = await fetch(
          `/api/arcade?searchUsername=${encodeURIComponent(q)}&inviteType=${encodeURIComponent(
            effectiveInviteType
          )}&uid=${encodeURIComponent(currentUser.uid)}`,
          {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
          }
        );
        const fallbackParsed = await fallbackRes.json();
        if (!fallbackRes.ok) {
          throw new Error(fallbackParsed.error || 'Could not search registered usernames.');
        }
        data = fallbackParsed;
      }

      if (data) {
        setInviteSearchResults({
          players: data.players || [],
          couples: data.couples || [],
        });
        setSelfMatchedUsername(data.selfMatchedUsername || null);
        setHasSearchedInviteTargets(true);
      }
    } catch (err: unknown) {
      setInviteSearchError(
        err instanceof Error ? err.message : 'Unable to search usernames right now.'
      );
    } finally {
      setIsSearchingInviteTargets(false);
    }
  }

  // Debounced username search when on the Invite tab
  useEffect(() => {
    if (lobbyTab !== 'invite' || !currentUser.uid) return;
    const fallbackMode: '1v1' | '2v2' = selectedMode === '1v1' ? '1v1' : '2v2';
    const effectiveInviteType: '1v1' | '2v2' = selectedGameDef.supports2v2
      ? fallbackMode
      : '1v1';
    const timer = setTimeout(() => {
      handleSearchInviteTargets(inviteSearchQuery, effectiveInviteType);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyTab, inviteSearchQuery, selectedMode, selectedGameDef.supports2v2, currentUser.uid]);

  async function handleSendUsernameInvitation(opts: {
    inviteType: '1v1' | '2v2';
    targetUsername?: string;
    targetCoupleId?: number;
  }) {
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    if (!activeCouple) {
      setRoomErrorMsg(
        `Couple pairing is mandatory before sending a ${opts.inviteType.toUpperCase()} invitation.`
      );
      soundFX.playError();
      return;
    }
    if (
      opts.inviteType === '1v1' &&
      opts.targetUsername &&
      opts.targetUsername.trim().toLowerCase() === currentUser.username.trim().toLowerCase()
    ) {
      setRoomErrorMsg('You cannot invite yourself to a 1v1 match.');
      soundFX.playError();
      return;
    }
    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'send_game_invitation',
          inviteType: opts.inviteType,
          targetUsername: opts.targetUsername,
          targetCoupleId: opts.targetCoupleId,
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }
      if (data.room) {
        const parsedRoom = parseRawDatabaseRoom(data.room);
        onUpdateRoom(parsedRoom);
      }
      setRoomStatusMsg(
        opts.inviteType === '2v2'
          ? `Sent 2v2 Couple Invitation for ${selectedGameDef.title}! Room #${data.room?.roomCode} is ready.`
          : `Sent 1v1 Invitation to @${opts.targetUsername} for ${selectedGameDef.title}! Room #${data.room?.roomCode} is ready.`
      );
      soundFX.playSuccess();
      onRefreshInvitations?.();
      await handleSearchInviteTargets(inviteSearchQuery, opts.inviteType);
    } catch (err: unknown) {
      setRoomErrorMsg(err instanceof Error ? err.message : 'Failed to send invitation.');
      soundFX.playError();
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleRespondToInvitation(invitationId: number, accept: boolean) {
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'respond_game_invitation',
          invitationId,
          accept,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not respond to invitation.');
      }
      onRefreshInvitations?.();
      if (accept && data.room) {
        const parsedRoom = parseRawDatabaseRoom(data.room);
        onUpdateRoom(parsedRoom);
        onStartRoomGame(parsedRoom);
        setRoomStatusMsg(`Accepted invitation! Joined Room #${parsedRoom.roomCode}.`);
        soundFX.playCapture();
      } else {
        setRoomStatusMsg('Invitation declined.');
        soundFX.playMove();
      }
    } catch (err: unknown) {
      setRoomErrorMsg(err instanceof Error ? err.message : 'Failed to respond to invitation.');
      soundFX.playError();
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleEnterMatchmakingQueue() {
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    setSearchElapsedSec(0);

    if (!activeCouple) {
      setRoomErrorMsg(
        'Couple pairing is mandatory for 2v2 Automatic Couple Matchmaking. Both partners must have registered and actively paired accounts.'
      );
      soundFX.playError();
      return;
    }

    const matchmakingGameId = selectedGameDef.supports2v2
      ? selectedGameId
      : 'quiz-battle';

    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'enqueue_matchmaking',
          queueMode: '2v2',
          gameId: matchmakingGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not enter 2v2 matchmaking queue.');
      }
      setMmState(data);
      if (data.matchedRoom) {
        const parsed = parseRawDatabaseRoom(data.matchedRoom);
        onUpdateRoom(parsed);
      }
      soundFX.playSuccess();
    } catch (err: unknown) {
      setRoomErrorMsg(
        err instanceof Error ? err.message : 'Failed to enter 2v2 matchmaking queue.'
      );
      soundFX.playError();
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleCancelMatchmakingQueue() {
    setRoomErrorMsg(null);
    setSearchElapsedSec(0);
    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'cancel_matchmaking',
          queueId: mmState?.myQueueEntry?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMmState(data);
        setRoomStatusMsg('Matchmaking cancelled.');
        soundFX.playMove();
      }
    } catch {
      setRoomErrorMsg('Failed to cancel matchmaking.');
    } finally {
      setLoadingRoomAction(false);
    }
  }

  const fetchPublicRooms = useCallback(async () => {
    setLoadingPublicRooms(true);
    try {
      const params = new URLSearchParams({
        publicRooms: '1',
        mode: publicFilterMode,
      });
      if (publicFilterGameId && publicFilterGameId !== 'all') {
        params.set('gameId', publicFilterGameId);
      }
      if (currentUser.uid) {
        params.set('uid', currentUser.uid);
      }
      const res = await fetch(`/api/arcade?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(Array.isArray(data.publicRooms) ? data.publicRooms : []);
      }
    } catch {
      // ignore transient poll error
    } finally {
      setLoadingPublicRooms(false);
    }
  }, [publicFilterGameId, publicFilterMode, currentUser.uid]);

  useEffect(() => {
    if (lobbyTab !== 'join') return;
    Promise.resolve().then(() => {
      fetchPublicRooms();
    });
    const interval = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(interval);
  }, [lobbyTab, fetchPublicRooms]);

  async function handleCreateRoomSubmit() {
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    const effectiveMode = selectedMode === 'party' ? 'party' : '2v2';
    if (!activeCouple) {
      setRoomErrorMsg(
        `Couple pairing is mandatory for ${effectiveMode.toUpperCase()} multiplayer. Pair with your partner in Profile & Couple first.`
      );
      soundFX.playError();
      return;
    }

    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'create_room',
          gameId:
            effectiveMode === 'party' && !selectedGameId.startsWith('party-')
              ? PARTY_GAMES[0].id
              : selectedGameId,
          mode: effectiveMode,
          visibility: roomVisibility,
          joinPolicy: roomVisibility === 'public' ? roomJoinPolicy : 'immediate',
          settings: { format: roundSetting },
          includePairedPartner: includePartnerInRoom,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Could not create multiplayer room.');
      }
      const created = parseRawDatabaseRoom(data.room);
      onUpdateRoom(created);
      setRoomStatusMsg(
        `Created ${
          created.visibility === 'private' ? 'Private' : 'Public'
        } Room #${created.roomCode} (${created.mode.toUpperCase()} Mode). Share the room number or invite link!`
      );
      soundFX.playSuccess();
    } catch (err: unknown) {
      setRoomErrorMsg(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleInspectRoomByCode(e: React.FormEvent) {
    e.preventDefault();
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    setInspectedRoom(null);
    const clean = joinCodeInput.trim().toUpperCase().replace(/^#+/, '');
    if (!clean) {
      setRoomErrorMsg('Please enter a room number to look up.');
      return;
    }

    setLoadingRoomAction(true);
    try {
      const res = await fetch(
        `/api/arcade?inspectRoom=${encodeURIComponent(clean)}&uid=${encodeURIComponent(
          currentUser.uid
        )}`
      );
      const data: RoomInspectionResult = await res.json();
      setInspectedRoom(data);
      if (!data.valid) {
        setRoomErrorMsg(data.message);
        soundFX.playError();
      } else {
        soundFX.playMove();
      }
    } catch {
      setRoomErrorMsg('Could not validate room number right now.');
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleConfirmJoinRoom(codeToJoin: string, viaDirectCode = true) {
    setRoomErrorMsg(null);
    setRoomStatusMsg(null);
    if (!activeCouple) {
      setRoomErrorMsg(
        'Couple pairing is mandatory to join 1v1 or 2v2 multiplayer rooms. Please pair with your partner in Profile & Couple first.'
      );
      soundFX.playError();
      return;
    }
    setLoadingRoomAction(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'join_room',
          roomCode: codeToJoin,
          includePairedPartner: true,
          viaDirectCodeOrInvite: viaDirectCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Failed to join room.');
      }
      if (data.pendingApproval) {
        setRoomStatusMsg(
          data.pendingMessage ||
            `Join request sent to host of Room #${codeToJoin}. Waiting for host approval!`
        );
        soundFX.playMove();
        await fetchPublicRooms();
      } else {
        const joined = parseRawDatabaseRoom(data.room);
        onUpdateRoom(joined);
        setInspectedRoom(null);
        setJoinCodeInput('');
        setRoomStatusMsg(`Joined Room #${joined.roomCode}!`);
        soundFX.playSuccess();
      }
    } catch (err: unknown) {
      setRoomErrorMsg(err instanceof Error ? err.message : 'Could not join room.');
    } finally {
      setLoadingRoomAction(false);
    }
  }

  async function handleRespondJoinRequest(requesterUid: string, approve: boolean) {
    if (!activeRoom) return;
    setRespondingRequestUid(requesterUid);
    setRoomErrorMsg(null);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'respond_join_request',
          roomCode: activeRoom.roomCode,
          requesterUid,
          approve,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Failed to process join request.');
      }
      const updated = parseRawDatabaseRoom(data.room);
      onUpdateRoom(updated);
      setRoomStatusMsg(
        approve ? 'Approved player join request!' : 'Declined player join request.'
      );
      soundFX.playSuccess();
    } catch (err: unknown) {
      setRoomErrorMsg(
        err instanceof Error ? err.message : 'Could not respond to join request.'
      );
    } finally {
      setRespondingRequestUid(null);
    }
  }

  function handleHostStartGame() {
    if (!activeRoom) return;
    const nextRoom: MultiplayerRoomState = {
      ...activeRoom,
      status: 'playing',
    };
    onUpdateRoom(nextRoom);
    onStartRoomGame(nextRoom);
    soundFX.playSuccess();
  }

  async function handleToggleVoice() {
    if (!activeRoom) return;
    if (inVoice) {
      if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      setInVoice(false);
      setIsSpeaking(false);
      const nextVoice = activeRoom.voiceParticipants.filter(
        (v) => v.uid !== currentUser.uid
      );
      onUpdateRoom({ ...activeRoom, voiceParticipants: nextVoice });
      soundFX.playMove();
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        mediaStreamRef.current = stream;
        setMicPermissionState('granted');

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          analyserIntervalRef.current = setInterval(() => {
            if (isMuted || (pushToTalk && !pttActive)) {
              setIsSpeaking(false);
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setIsSpeaking(avg > 14);
          }, 180);
        }
      } else {
        setMicPermissionState('fallback');
      }
    } catch {
      setMicPermissionState('fallback');
    }

    setInVoice(true);
    soundFX.playSuccess();
    onVoiceAchievement?.();

    const myVoice: VoiceParticipant = {
      uid: currentUser.uid,
      username: currentUser.username,
      muted: isMuted,
      deafened: isDeafened,
      speaking: false,
      volume: 100,
    };

    const existingWithoutMe = activeRoom.voiceParticipants.filter(
      (v) => v.uid !== currentUser.uid
    );
    onUpdateRoom({
      ...activeRoom,
      voiceParticipants: [...existingWithoutMe, myVoice],
    });
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRoom) return;
    const text = chatInput.trim();
    if (!text) return;
    const newMsg: RoomChatMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUser.username,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextChat = [...activeRoom.chat, newMsg];
    onUpdateRoom({ ...activeRoom, chat: nextChat });
    setChatInput('');
    soundFX.playMove();
  }

  function handleCopyCode() {
    if (!activeRoom) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(activeRoom.roomCode).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  }

  function handleCopyInviteLink() {
    if (!activeRoom) return;
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/?room=${activeRoom.roomCode}&game=${activeRoom.gameId}`;
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  }

  function toggleReadyStatus() {
    if (!activeRoom) return;
    const nextPlayers = activeRoom.players.map((p) =>
      p.uid === currentUser.uid ? { ...p, ready: !p.ready } : p
    );
    onUpdateRoom({ ...activeRoom, players: nextPlayers });
    soundFX.playMove();
  }

  const activeRoomGameTitle = activeRoom
    ? MULTIPLAYER_GAMES.find((g) => g.id === activeRoom.gameId)?.title || activeRoom.gameId
    : '';

  const pairedPartnerProfile = activeCouple
    ? activeCouple.requesterUid === currentUser.uid
      ? activeCouple.partnerProfile
      : activeCouple.requesterProfile
    : null;

  const isPartnerOnline = Boolean(
    mmState?.partnerOnline ?? pairedPartnerProfile?.isOnline
  );
  const myQueueEntry = mmState?.myQueueEntry || null;
  const isQueueActive =
    myQueueEntry &&
    (myQueueEntry.status === 'searching' ||
      myQueueEntry.status === 'match_found' ||
      myQueueEntry.status === 'match_starting');

  return (
    <aside className="flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900/90 p-4 text-stone-100">
      {/* Incoming Username/Couple Invitations Banner */}
      {incomingInvitations.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-400/60 bg-amber-500/10 p-3 text-xs">
          <div className="font-bold text-amber-300">
            Incoming Game Invitations ({incomingInvitations.length})
          </div>
          {incomingInvitations.map((inv) => {
            const gTitle =
              MULTIPLAYER_GAMES.find((g) => g.id === inv.gameId)?.title || inv.gameId;
            return (
              <div
                key={inv.id}
                className="space-y-2 rounded-lg border border-stone-800 bg-stone-950 p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-100">
                    {inv.inviteType === '2v2'
                      ? `2v2 Challenge from ${inv.senderCoupleName}`
                      : `1v1 Challenge from @${inv.senderUsername}`}
                  </span>
                  <span className="font-mono text-[10px] text-amber-300">
                    #{inv.roomCode}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300">
                  Game: <strong>{gTitle}</strong> ({inv.inviteType.toUpperCase()})
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loadingRoomAction}
                    onClick={() => handleRespondToInvitation(inv.id, true)}
                    className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-stone-950 hover:bg-emerald-400"
                  >
                    Accept &amp; Join
                  </button>
                  <button
                    type="button"
                    disabled={loadingRoomAction}
                    onClick={() => handleRespondToInvitation(inv.id, false)}
                    className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-stone-800"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Primary Multiplayer Controls: Matchmaking Queue / Invite / Create Room / Join Group */}
      <div className="border-b border-stone-800 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-stone-100">
              Multiplayer Matchmaking &amp; Rooms
            </h3>
          </div>
          {activeRoom && (
            <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
              #{activeRoom.roomCode} · {activeRoom.mode.toUpperCase()}
            </span>
          )}
        </div>

        {/* Live Couple Pairing, Trophies & Online Presence Bar */}
        <div className="mt-2.5 rounded-xl border border-stone-800 bg-stone-950 p-2.5 text-xs">
          {activeCouple && pairedPartnerProfile ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-100">
                  ♥ {activeCouple.coupleName} · 🏆 {activeCouple.coupleTrophies || 0}
                </span>
                <span
                  className={`font-mono text-[11px] font-bold ${
                    mmState?.coupleInActiveMatch
                      ? 'text-amber-300'
                      : isPartnerOnline
                      ? 'text-emerald-400'
                      : 'text-rose-300'
                  }`}
                >
                  {mmState?.coupleInActiveMatch
                    ? `In Match (#${mmState.activeMatchRoomCode})`
                    : isPartnerOnline
                    ? 'Both Online & Available'
                    : 'Partner Offline'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
                <span>
                  {getAvatarEmoji(currentUser.avatar)} {currentUser.username}:{' '}
                  <strong className="text-emerald-400">Online</strong>
                </span>
                <span>
                  {getAvatarEmoji(pairedPartnerProfile.avatar)}{' '}
                  {pairedPartnerProfile.username}:{' '}
                  <strong
                    className={
                      isPartnerOnline ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {isPartnerOnline ? 'Online' : 'Offline'}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-bold text-rose-300">
                Mandatory Requirement: Unpaired Account
              </div>
              <p className="text-[11px] leading-relaxed text-stone-300">
                Active couple pairing is required for all <strong>1v1</strong> and{' '}
                <strong>2v2</strong> multiplayer modes.
              </p>
              {onOpenCouplePairing && (
                <button
                  type="button"
                  onClick={onOpenCouplePairing}
                  className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
                >
                  Pair with Partner to Unlock 1v1 &amp; 2v2
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
          <button
            type="button"
            onClick={() => {
              setLobbyTab('matchmake');
              setRoomErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors whitespace-nowrap ${
              lobbyTab === 'matchmake'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Queue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLobbyTab('invite');
              setRoomErrorMsg(null);
              const modeToSearch = selectedGameDef.supports2v2 ? selectedMode : '1v1';
              handleSearchInviteTargets(inviteSearchQuery, modeToSearch);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors whitespace-nowrap ${
              lobbyTab === 'invite'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            <Search className="h-3 w-3" />
            <span>Invite</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLobbyTab('create');
              setRoomErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors whitespace-nowrap ${
              lobbyTab === 'create'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            <PlusCircle className="h-3 w-3" />
            <span>Create</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLobbyTab('join');
              setRoomErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors whitespace-nowrap ${
              lobbyTab === 'join'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            <LogIn className="h-3 w-3" />
            <span>Join</span>
          </button>
        </div>

        {roomErrorMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{roomErrorMsg}</span>
          </div>
        )}

        {roomStatusMsg && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{roomStatusMsg}</span>
          </div>
        )}

        {/* TAB 0: 2V2 AUTOMATIC COUPLE MATCHMAKING (TROPHY-BASED) */}
        {lobbyTab === 'matchmake' && (
          <div className="mt-3 space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs">
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span className="font-semibold text-rose-300">
                2v2 Automatic Couple Matchmaking (Trophy-Based)
              </span>
              <span className="font-mono tabular-nums text-amber-300">
                2v2 Couples Searching: {mmState?.queueCounts.queue2v2Count || 0}
              </span>
            </div>

            {isQueueActive && myQueueEntry ? (
              <div className="space-y-3 rounded-xl border border-amber-500/50 bg-stone-900 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase text-amber-300">
                    {myQueueEntry.status === 'searching'
                      ? 'Status: Searching for Couple...'
                      : myQueueEntry.status === 'match_found'
                      ? 'Status: 2v2 Match Found!'
                      : 'Status: 2v2 Match Starting!'}
                  </span>
                  <span className="font-mono text-[11px] text-rose-300 tabular-nums">
                    2v2 Ranked Queue
                  </span>
                </div>

                <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                    <span>Your Paired Couple Team</span>
                    <span className="font-mono font-bold text-amber-300">
                      🏆 {myQueueEntry.coupleTrophies || activeCouple?.coupleTrophies || 0} Trophies
                    </span>
                  </div>
                  <div className="mt-0.5 font-bold text-stone-100">
                    {myQueueEntry.coupleName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-stone-300">
                    <span>
                      {getAvatarEmoji(myQueueEntry.requesterAvatar)}{' '}
                      {myQueueEntry.requesterUsername}
                    </span>
                    <span>&amp;</span>
                    <span>
                      {getAvatarEmoji(myQueueEntry.partnerAvatar)}{' '}
                      {myQueueEntry.partnerUsername}
                    </span>
                  </div>
                </div>

                {myQueueEntry.status === 'searching' && (
                  <div className="space-y-3">
                    <ArcadeCircularLoader
                      active={true}
                      variant="card"
                      messages={[
                        'Searching for an online couple...',
                        'Matching 2v2 Couple Trophies...',
                        'Setting up your game...',
                        'Getting everything ready...',
                      ]}
                      subtitle={`Trophy window ±${
                        myQueueEntry.allowedTrophyRange || 150
                      } 🏆 · Elapsed ${searchElapsedSec}s`}
                    />
                    <p className="text-xs text-stone-300">
                      Searching for an online couple near 🏆{' '}
                      {myQueueEntry.coupleTrophies || 0} (±
                      {myQueueEntry.allowedTrophyRange || 150} Trophy window) for{' '}
                      {MULTIPLAYER_GAMES.find((g) => g.id === myQueueEntry.gameId)?.title ||
                        myQueueEntry.gameId}
                      ... ({searchElapsedSec}s)
                    </p>
                    <button
                      type="button"
                      disabled={loadingRoomAction}
                      onClick={handleCancelMatchmakingQueue}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/25"
                    >
                      {loadingRoomAction ? (
                        <ArcadeInlineSpinner size={14} label="Cancelling..." />
                      ) : (
                        'Cancel 2v2 Matchmaking'
                      )}
                    </button>
                  </div>
                )}

                {(myQueueEntry.status === 'match_found' ||
                  myQueueEntry.status === 'match_starting') && (
                  <div className="space-y-2.5">
                    <div className="rounded-lg border border-emerald-500/40 bg-stone-950 p-2.5">
                      <div className="text-[11px] font-semibold text-emerald-400">
                        Opposing Couple Found (Trophy Matched)
                      </div>
                      <div className="mt-0.5 font-bold text-stone-100">
                        {myQueueEntry.opponentCoupleName}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {myQueueEntry.opponentProfiles.map((op) => (
                          <span
                            key={op.uid}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-700 bg-stone-900 px-2 py-0.5 text-[11px] text-stone-200"
                          >
                            <span>{getAvatarEmoji(op.avatar)}</span>
                            <span>{op.username}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-center font-mono text-[11px] text-amber-300">
                      {myQueueEntry.status === 'match_found'
                        ? `Session #${myQueueEntry.matchedRoomCode} created · Starting match...`
                        : `Entering Room #${myQueueEntry.matchedRoomCode}...`}
                    </div>

                    {mmState?.matchedRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseRawDatabaseRoom(mmState.matchedRoom!);
                          onUpdateRoom(parsed);
                          onStartRoomGame(parsed);
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-bold text-stone-950 hover:bg-emerald-400"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Enter 2v2 Match Now (#{myQueueEntry.matchedRoomCode})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="text-[11px] leading-relaxed text-stone-300">
                  <strong className="text-rose-300">2v2 Couple Mode Exclusive:</strong> Automatic matchmaking finds online couples with similar trophy counts (🏆 {activeCouple?.coupleTrophies || 0}). 2v2 matches award <strong>XP, Coins &amp; Couple Trophies</strong>!
                </p>

                <div>
                  <label htmlFor="mm-game-select" className="block font-medium text-stone-300">
                    Select 2v2 Couple Game (10 Eligible 2v2 Games)
                  </label>
                  <select
                    id="mm-game-select"
                    value={
                      selectedGameDef.supports2v2 ? selectedGameId : 'quiz-battle'
                    }
                    onChange={(e) => {
                      setSelectedGameId(e.target.value);
                      setSelectedMode('2v2');
                    }}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  >
                    <optgroup label="2v2 Party, Trivia, Word & Drawing (6 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category !== 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Ranked · +XP, +Coins, +🏆)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="2v2 Cooperative Couple Team Games (4 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category === 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Ranked · +XP, +Coins, +🏆)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={loadingRoomAction || !activeCouple}
                  onClick={handleEnterMatchmakingQueue}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {loadingRoomAction ? (
                    <ArcadeInlineSpinner size={15} label="Entering 2v2 Queue..." />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {!activeCouple
                          ? 'Pair with Partner Required'
                          : 'Find 2v2 Couple Trophy Match'}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between border-t border-stone-800 pt-2 text-[11px] text-stone-400">
                  <span>Want to challenge your paired partner in 1v1?</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('1v1');
                        setLobbyTab('invite');
                        handleSearchInviteTargets('', '1v1');
                      }}
                      className="font-semibold text-amber-300 hover:underline"
                    >
                      Challenge Your Partner (1v1)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 0.5: USERNAME-BASED 1V1 & 2V2 INVITATIONS */}
        {lobbyTab === 'invite' && (
          <div className="mt-3 space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('1v1');
                  handleSearchInviteTargets(inviteSearchQuery, '1v1');
                }}
                className={`rounded-lg border py-1.5 text-xs font-bold ${
                  selectedMode === '1v1'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                    : 'border-stone-800 bg-stone-900 text-stone-400'
                }`}
              >
                1v1 Player Invite (14 Games)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('2v2');
                  if (!selectedGameDef.supports2v2) {
                    setSelectedGameId('quiz-battle');
                  }
                  handleSearchInviteTargets(inviteSearchQuery, '2v2');
                }}
                className={`rounded-lg border py-1.5 text-xs font-bold ${
                  selectedMode === '2v2'
                    ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                    : 'border-stone-800 bg-stone-900 text-stone-400'
                }`}
              >
                2v2 Couple Invite (10 Games)
              </button>
            </div>

            <div>
              <label htmlFor="invite-game-select" className="block font-medium text-stone-300">
                {selectedMode === '2v2'
                  ? 'Select 2v2 Couple Game (10 Games)'
                  : 'Select 1v1 Multiplayer Game (14 Games)'}
              </label>
              <select
                id="invite-game-select"
                value={
                  selectedMode === '2v2' && !selectedGameDef.supports2v2
                    ? 'quiz-battle'
                    : selectedGameId
                }
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedGameId(nextId);
                  const def = MULTIPLAYER_GAMES.find((g) => g.id === nextId);
                  if (!def?.supports2v2 && selectedMode === '2v2') {
                    setSelectedMode('1v1');
                    handleSearchInviteTargets(inviteSearchQuery, '1v1');
                  }
                }}
                className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100"
              >
                {selectedMode === '2v2' ? (
                  <>
                    <optgroup label="2v2 Party, Trivia, Word & Drawing (6 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category !== 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Couple Mode)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="2v2 Cooperative Couple Team Games (4 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category === 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Couple Mode)
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  <>
                    <optgroup label="1v1 Exclusive Board & Strategy Duels (4 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => !g.supports2v2).map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (1v1 Only)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="1v1 Party, Trivia, Word & Co-Op Duels (10 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2).map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (1v1 Mode)
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {activeCouple && pairedPartnerProfile && (selectedMode === '1v1' || !selectedGameDef.supports2v2) && (
              <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2">
                <div>
                  <div className="font-bold text-amber-200">
                    Play 1v1 vs Paired Partner (@{pairedPartnerProfile.username})
                  </div>
                  <div className="text-[10px] text-stone-300">
                    1v1 awards XP only (0 Coins · 0 Trophies)
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loadingRoomAction}
                  onClick={() =>
                    handleSendUsernameInvitation({
                      inviteType: '1v1',
                      targetUsername: pairedPartnerProfile.username,
                    })
                  }
                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-stone-950 hover:bg-amber-400"
                >
                  Invite Partner
                </button>
              </div>
            )}

            <div>
              <label htmlFor="invite-username-search" className="block font-medium text-stone-300">
                {selectedMode === '2v2' && selectedGameDef.supports2v2
                  ? 'Add Using Username or Couple Name (2v2)'
                  : 'Add Using Username (Search Registered Arcade Username)'}
              </label>
              <div className="mt-1 flex gap-1.5">
                <input
                  id="invite-username-search"
                  type="text"
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchInviteTargets(
                        inviteSearchQuery,
                        selectedGameDef.supports2v2 ? selectedMode : '1v1'
                      );
                    }
                  }}
                  placeholder={
                    selectedMode === '2v2' && selectedGameDef.supports2v2
                      ? 'Type partner @username or couple name...'
                      : 'Enter @username (partial or exact, case-insensitive)...'
                  }
                  className="w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
                {inviteSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInviteSearchQuery('');
                      handleSearchInviteTargets(
                        '',
                        selectedGameDef.supports2v2 ? selectedMode : '1v1'
                      );
                    }}
                    className="rounded-lg border border-stone-700 bg-stone-900 px-2 py-1.5 text-[11px] text-stone-400 hover:text-stone-200"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSearchingInviteTargets || loadingRoomAction}
                  onClick={() =>
                    handleSearchInviteTargets(
                      inviteSearchQuery,
                      selectedGameDef.supports2v2 ? selectedMode : '1v1'
                    )
                  }
                  className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {isSearchingInviteTargets ? (
                    <ArcadeInlineSpinner className="h-3.5 w-3.5" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  <span>Search</span>
                </button>
              </div>
              <div className="mt-1 text-[10px] text-stone-400">
                Searches unique arcade usernames only (partial &amp; case-insensitive). Email addresses and Google names are never exposed.
              </div>
            </div>

            {selfMatchedUsername && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>
                  <strong>@{selfMatchedUsername}</strong> is your own account — you cannot send a game invitation to yourself.
                </span>
              </div>
            )}

            {inviteSearchError && (
              <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-[11px] text-rose-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                <span>{inviteSearchError}</span>
              </div>
            )}

            <div className="max-h-56 space-y-1.5 overflow-y-auto pt-1">
              {isSearchingInviteTargets && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 py-4 text-[11px] text-stone-300">
                  <ArcadeInlineSpinner className="h-4 w-4 text-amber-400" />
                  <span>Searching registered arcade usernames...</span>
                </div>
              )}

              {!isSearchingInviteTargets &&
                (selectedMode === '1v1' || !selectedGameDef.supports2v2) &&
                inviteSearchResults.players.map((pl) => {
                  const skinDef = getSkinById(pl.equippedSkin);
                  return (
                    <div
                      key={pl.uid}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-bold text-stone-100">
                          <span>{getAvatarEmoji(pl.avatar)}</span>
                          <span className="truncate">@{pl.username}</span>
                          <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[9px] text-stone-300">
                            Lv.{pl.level}
                          </span>
                          {skinDef && (
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${skinDef.badgeClass}`}
                            >
                              {skinDef.icon} {skinDef.name}
                            </span>
                          )}
                          <span
                            className={`text-[10px] ${
                              pl.isOnline ? 'text-emerald-400' : 'text-stone-500'
                            }`}
                          >
                            · {pl.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-stone-400">
                          {pl.hasActiveCouple
                            ? `Paired (${pl.coupleName}) · Eligible for 1v1`
                            : 'Unpaired (Must complete couple pairing before 1v1)'}
                        </div>
                      </div>
                      {pl.alreadyInvited ? (
                        <span className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-300">
                          Pending #{pl.pendingRoomCode}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingRoomAction || !activeCouple || !pl.hasActiveCouple}
                          onClick={() =>
                            handleSendUsernameInvitation({
                              inviteType: '1v1',
                              targetUsername: pl.username,
                            })
                          }
                          title={
                            !activeCouple
                              ? 'Pair with your partner first to send 1v1 invitations'
                              : !pl.hasActiveCouple
                              ? 'This player has not paired with a partner yet'
                              : `Invite @${pl.username} to 1v1 ${selectedGameDef.title}`
                          }
                          className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-40"
                        >
                          Invite 1v1
                        </button>
                      )}
                    </div>
                  );
                })}

              {!isSearchingInviteTargets &&
                selectedMode === '2v2' &&
                selectedGameDef.supports2v2 &&
                inviteSearchResults.couples.map((cp) => {
                  const cpSkin = getSkinById(cp.equippedCoupleSkin);
                  return (
                    <div
                      key={cp.coupleId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-bold text-stone-100">
                          <span>♥ {cp.coupleName}</span>
                          <span className="font-mono text-[10px] text-amber-300">
                            🏆 {cp.coupleTrophies}
                          </span>
                          {cpSkin && (
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${cpSkin.badgeClass}`}
                            >
                              {cpSkin.icon} {cpSkin.name}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          @{cp.partnerA.username} &amp; @{cp.partnerB.username} ·{' '}
                          <span className={cp.bothOnline ? 'text-emerald-400' : 'text-amber-300'}>
                            {cp.bothOnline ? 'Both Online' : 'Partial Online'}
                          </span>
                        </div>
                      </div>
                      {cp.alreadyInvited ? (
                        <span className="shrink-0 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-200">
                          Pending #{cp.pendingRoomCode}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingRoomAction || !activeCouple}
                          onClick={() =>
                            handleSendUsernameInvitation({
                              inviteType: '2v2',
                              targetCoupleId: cp.coupleId,
                            })
                          }
                          className="shrink-0 rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-stone-950 hover:bg-rose-400 disabled:opacity-40"
                        >
                          Invite 2v2
                        </button>
                      )}
                    </div>
                  );
                })}

              {!isSearchingInviteTargets &&
                ((selectedMode === '1v1' || !selectedGameDef.supports2v2)
                  ? inviteSearchResults.players.length === 0
                  : inviteSearchResults.couples.length === 0) && (
                  <div className="rounded-lg border border-stone-800/80 bg-stone-900/40 px-3 py-3 text-center text-[11px] text-stone-400">
                    {hasSearchedInviteTargets && inviteSearchQuery.trim()
                      ? `No registered ${
                          selectedMode === '2v2' && selectedGameDef.supports2v2
                            ? 'couples'
                            : 'players'
                        } found matching "@${inviteSearchQuery.trim()}". Check the spelling or try a partial username.`
                      : 'No other registered players found yet. Type a username above to search the database.'}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* TAB 1: CREATE ROOM (2v2 Couple & 3-10 Couple Party Rooms; 1v1 is Partner-Only Duel) */}
        {lobbyTab === 'create' && (
          <div className="mt-3 space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs">
            <div>
              <span className="block font-medium text-stone-300">
                1. Select Room Format (1v1 uses Direct Partner Challenge)
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('2v2');
                    if (selectedGameId.startsWith('party-') || !selectedGameDef.supports2v2) {
                      setSelectedGameId('quiz-battle');
                    }
                  }}
                  className={`rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                    selectedMode !== 'party'
                      ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                      : 'border-stone-800 bg-stone-900 text-stone-400'
                  }`}
                >
                  2v2 Couple Mode (10 Games)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('party');
                    setSelectedGameId(PARTY_GAMES[0].id);
                  }}
                  className={`rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                    selectedMode === 'party'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-stone-800 bg-stone-900 text-stone-400'
                  }`}
                >
                  Party Games (3–10 Couples)
                </button>
              </div>
            </div>

            {/* Room Visibility: Public vs Private */}
            <div>
              <span className="block font-medium text-stone-300">
                2. Room Visibility (Public Browser vs. Private Code/Invite)
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoomVisibility('public')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                    roomVisibility === 'public'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-stone-800 bg-stone-900 text-stone-400'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Public Room</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRoomVisibility('private')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                    roomVisibility === 'private'
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                      : 'border-stone-800 bg-stone-900 text-stone-400'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Private Room</span>
                </button>
              </div>

              {roomVisibility === 'public' ? (
                <div className="mt-2 rounded-lg border border-stone-800 bg-stone-900 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-200">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Public Browser Join Policy
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setRoomJoinPolicy('immediate')}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          roomJoinPolicy === 'immediate'
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        Immediate Join
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomJoinPolicy('approval_required')}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          roomJoinPolicy === 'approval_required'
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        Require Approval
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-stone-400">
                    Visible in the Public Room Browser. Players can also join with your room code.
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-[10px] text-stone-400">
                  Hidden from the Public Room Browser. Players can only join via your unique room code or direct invitation.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="create-room-game-select" className="block font-medium text-stone-300">
                {selectedMode === 'party'
                  ? '3. Select Party Game (12 Games · 3–10 Couples)'
                  : '3. Select 2v2 Couple Mode Game (10 Games)'}
              </label>
              <select
                id="create-room-game-select"
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                {selectedMode === 'party' ? (
                  <optgroup label="Party Games (3–10 Couples · 6–20 Players · Placement XP)">
                    {PARTY_GAMES.map((g, idx) => (
                      <option key={g.id} value={g.id}>
                        {String(idx + 1).padStart(2, '0')}. {g.title} (Party · +XP)
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <>
                    <optgroup label="2v2 Party, Trivia, Word & Drawing (6 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category !== 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Couple Mode · +XP, +Coins, +🏆)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="2v2 Cooperative Couple Team Games (4 Games)">
                      {MULTIPLAYER_GAMES.filter((g) => g.supports2v2 && g.category === 'cooperative').map((g) => (
                        <option key={g.id} value={g.id}>
                          {String(g.number).padStart(2, '0')}. {g.title} (2v2 Couple Mode · +XP, +Coins, +🏆)
                        </option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
              <div className="mt-2 rounded-lg border border-stone-800 bg-stone-900 p-2 text-[11px]">
                {activeCouple ? (
                  <label className="flex items-center gap-2 text-stone-200">
                    <input
                      type="checkbox"
                      checked={includePartnerInRoom}
                      onChange={(e) => setIncludePartnerInRoom(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>
                      {selectedMode === 'party'
                        ? `Auto-invite paired partner to Couple Team #1 (${activeCouple.coupleName})`
                        : `Seat our Couple (${activeCouple.coupleName}) as Team 1`}
                    </span>
                  </label>
                ) : (
                  <span className="text-amber-300">
                    Mandatory: Pair with your partner in Profile first to create a room.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="create-room-settings" className="block font-medium text-stone-300">
                4. Room Match Settings
              </label>
              <select
                id="create-room-settings"
                value={roundSetting}
                onChange={(e) => setRoundSetting(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="Quick Duel (Single Round)">Quick Duel (Single Round)</option>
                <option value="Standard Match (Best of 3)">Standard Match (Best of 3)</option>
                <option value="Championship Series (Best of 5)">Championship Series (Best of 5)</option>
              </select>
            </div>

            {loadingRoomAction && (
              <ArcadeCircularLoader
                active={loadingRoomAction}
                variant="compact"
                messages={[
                  'Opening multiplayer room...',
                  'Setting up your game...',
                  'Almost there!',
                ]}
              />
            )}

            <button
              type="button"
              disabled={loadingRoomAction || !activeCouple}
              onClick={handleCreateRoomSubmit}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {loadingRoomAction ? (
                <ArcadeInlineSpinner size={15} label="Creating Room..." />
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>
                    {!activeCouple
                      ? 'Pair with Partner Required'
                      : `Create ${roomVisibility === 'private' ? 'Private' : 'Public'} Room & Generate Code`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: JOIN GROUP + BROWSE PUBLIC ROOMS */}
        {lobbyTab === 'join' && (
          <div className="mt-3 space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs">
            <form onSubmit={handleInspectRoomByCode} className="space-y-2">
              <label htmlFor="join-room-code-input" className="block font-medium text-stone-300">
                Enter Room Code to Validate &amp; Join (Public or Private)
              </label>
              <div className="flex gap-1.5">
                <input
                  id="join-room-code-input"
                  type="text"
                  maxLength={8}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter 6-char room code"
                  className="w-full rounded-lg border border-stone-800 bg-stone-900 px-2.5 py-1.5 font-mono text-xs uppercase text-stone-100 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loadingRoomAction}
                  className="flex items-center gap-1 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-stone-100 hover:bg-stone-700 whitespace-nowrap shrink-0"
                >
                  {loadingRoomAction ? (
                    <ArcadeInlineSpinner size={14} label="Checking..." />
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5" />
                      <span>Look Up</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {inspectedRoom && inspectedRoom.room && (
              <div className="space-y-2.5 rounded-xl border border-stone-700 bg-stone-900 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-amber-300">
                      Room #{inspectedRoom.room.roomCode}
                    </span>
                    <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-stone-300">
                      {inspectedRoom.room.visibility === 'private' ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-teal-300">
                    {inspectedRoom.room.mode.toUpperCase()} · {inspectedRoom.room.players.length}/
                    {inspectedRoom.room.maxPlayers} Slots
                  </span>
                </div>
                <div className="text-stone-300">
                  <div>
                    Game:{' '}
                    <strong className="text-stone-100">
                      {MULTIPLAYER_GAMES.find((g) => g.id === inspectedRoom.room?.gameId)?.title ||
                        inspectedRoom.room.gameId}
                    </strong>
                  </div>
                  <div>
                    Host: <strong className="text-stone-100">{inspectedRoom.room.hostName}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-stone-400">
                    Participating Players:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {inspectedRoom.room.players.map((pl) => (
                      <span
                        key={pl.uid}
                        className="rounded-md border border-stone-700 bg-stone-950 px-2 py-0.5 text-[11px] text-stone-200"
                      >
                        {getAvatarEmoji(pl.avatar)} {pl.username}
                      </span>
                    ))}
                  </div>
                </div>

                {inspectedRoom.valid && (
                  <button
                    type="button"
                    disabled={loadingRoomAction || !activeCouple}
                    onClick={() => handleConfirmJoinRoom(inspectedRoom.room!.roomCode, true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>
                      {!activeCouple
                        ? 'Pair with Partner Required to Join'
                        : inspectedRoom.room.mode === '2v2'
                        ? `Join Room as ${activeCouple.coupleName}`
                        : `Confirm & Join Room #${inspectedRoom.room.roomCode}`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* BROWSE PUBLIC ROOMS SECTION */}
            <div className="border-t border-stone-800 pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-bold text-stone-100">Browse Public Rooms</span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    {publicRooms.length}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={loadingPublicRooms}
                  onClick={fetchPublicRooms}
                  className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] font-semibold text-stone-200 hover:bg-stone-800"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loadingPublicRooms ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Game & Mode Filters */}
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  aria-label="Filter public rooms by game"
                  value={publicFilterGameId}
                  onChange={(e) => setPublicFilterGameId(e.target.value)}
                  className="rounded-lg border border-stone-800 bg-stone-900 px-2 py-1 text-[11px] text-stone-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">All Games</option>
                  {MULTIPLAYER_GAMES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-800 bg-stone-900 p-0.5">
                  {(['all', '2v2', 'party'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPublicFilterMode(m)}
                      className={`rounded py-0.5 text-[10px] font-bold uppercase ${
                        publicFilterMode === m
                          ? 'bg-amber-500 text-stone-950'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Joinable Public Room List */}
              <div className="max-h-60 space-y-2 overflow-y-auto pr-0.5">
                {loadingPublicRooms && publicRooms.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 py-5 text-[11px] text-stone-300">
                    <ArcadeInlineSpinner size={14} label="Loading active public rooms..." />
                  </div>
                ) : publicRooms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-stone-800 bg-stone-900/40 px-3 py-4 text-center text-[11px] text-stone-400">
                    No active joinable public rooms match your filter right now. Create a Public Room or click Refresh!
                  </div>
                ) : (
                  publicRooms.map((pr) => (
                    <div
                      key={pr.roomCode}
                      className="space-y-2 rounded-xl border border-stone-800 bg-stone-900 p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-amber-300">
                            #{pr.roomCode}
                          </span>
                          <span className="truncate font-bold text-stone-100">
                            {pr.gameName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              pr.mode === '2v2'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {pr.mode}
                          </span>
                          <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                            {pr.currentPlayers}/{pr.maxPlayers}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-stone-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{getAvatarEmoji(pr.hostAvatar)}</span>
                          <span className="truncate">
                            Host: <strong className="text-stone-100">@{pr.hostName}</strong>
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400">
                          {pr.joinPolicy === 'approval_required'
                            ? 'Approval Required'
                            : 'Open Lobby'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={
                          loadingRoomAction ||
                          !activeCouple ||
                          Boolean(pr.pendingRequestAlreadySent)
                        }
                        onClick={() => handleConfirmJoinRoom(pr.roomCode, false)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-stone-950 hover:bg-emerald-400 disabled:opacity-45"
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        <span>
                          {pr.pendingRequestAlreadySent
                            ? 'Approval Pending...'
                            : pr.joinPolicy === 'approval_required'
                            ? `Request to Join #${pr.roomCode}`
                            : `Join Public Room #${pr.roomCode}`}
                        </span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE ROOM LOBBY DETAILS */}
      {activeRoom ? (
        <>
          <div id="multiplayer-lobby-panel" className="border-b border-stone-800 pb-3">
            <div className="rounded-xl border border-amber-500/40 bg-stone-950 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase">
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 ${
                    activeRoom.visibility === 'private'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {activeRoom.visibility === 'private' ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Globe className="h-3 w-3" />
                  )}
                  {activeRoom.visibility === 'private' ? 'Private Room' : 'Public Room'}
                </span>
                {activeRoom.visibility !== 'private' && (
                  <span className="rounded bg-stone-800 px-2 py-0.5 text-stone-300">
                    {activeRoom.joinPolicy === 'approval_required'
                      ? 'Host Approval'
                      : 'Immediate Join'}
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tracking-wider text-amber-300 tabular-nums">
                #{activeRoom.roomCode}
              </div>
              <div className="mt-1 text-xs text-stone-300">
                {activeRoomGameTitle} · {activeRoom.mode === '2v2' ? '2v2 Couple Mode' : '1v1 Mode'}{' '}
                · {activeRoom.players.length}/{activeRoom.maxPlayers} Players
              </div>

              <div className="mt-2.5 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 whitespace-nowrap"
                >
                  {copiedCode ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-stone-400" />
                  )}
                  <span>{copiedCode ? 'Copied!' : 'Copy Number'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 whitespace-nowrap"
                >
                  {copiedLink ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>{copiedLink ? 'Link Copied!' : 'Invite Link'}</span>
                </button>
              </div>
            </div>

            {/* Host Join Request Approval Queue */}
            {activeRoom.hostUid === currentUser.uid &&
              Array.isArray(activeRoom.pendingRequests) &&
              activeRoom.pendingRequests.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-2.5 text-xs">
                  <div className="font-bold text-amber-300">
                    Pending Join Requests ({activeRoom.pendingRequests.length})
                  </div>
                  {activeRoom.pendingRequests.map((req) => (
                    <div
                      key={req.uid}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-800 bg-stone-950 p-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-stone-100 truncate">
                          {getAvatarEmoji(req.avatar)} @{req.username}
                        </div>
                        {req.coupleName && (
                          <div className="text-[10px] text-stone-400 truncate">
                            Couple: {req.coupleName}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={respondingRequestUid === req.uid}
                          onClick={() => handleRespondJoinRequest(req.uid, true)}
                          className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-stone-950 hover:bg-emerald-400"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={respondingRequestUid === req.uid}
                          onClick={() => handleRespondJoinRequest(req.uid, false)}
                          className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[11px] font-semibold text-stone-300 hover:bg-stone-800"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* 2v2 Couple Teams Display */}
            {activeRoom.mode === '2v2' && activeRoom.teams.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-xs font-bold text-rose-300">
                  2v2 Couple Teams ({activeRoom.teams.length}/2 Couples)
                </span>
                {activeRoom.teams.map((team) => (
                  <div
                    key={team.coupleId}
                    className="rounded-xl border border-rose-500/30 bg-stone-950 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-stone-100">
                      <span>
                        Team {team.teamSlot}: {team.coupleName}
                      </span>
                      <span className="font-mono text-amber-300 tabular-nums">
                        {team.score} pts
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {team.members.map((m) => (
                        <span
                          key={m.uid}
                          className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900 px-2 py-0.5 text-[11px] text-stone-200"
                        >
                          <span>{getAvatarEmoji(m.avatar)}</span>
                          <span>{m.username}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Connected Players & Ready Status */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>
                  Players in Room ({activeRoom.players.length}/{activeRoom.maxPlayers})
                </span>
                <button
                  type="button"
                  onClick={toggleReadyStatus}
                  className="font-medium text-amber-400 hover:underline"
                >
                  Toggle My Ready Status
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {activeRoom.players.map((p) => (
                  <div
                    key={p.uid}
                    className="flex items-center justify-between rounded-lg border border-stone-800/80 bg-stone-950/60 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getAvatarEmoji(p.avatar)}</span>
                      <span className="font-semibold text-stone-200">{p.username}</span>
                      {p.uid === activeRoom.hostUid && (
                        <span className="text-[11px] text-amber-300">· Host</span>
                      )}
                    </div>
                    <span className={p.ready ? 'font-medium text-emerald-400' : 'text-stone-500'}>
                      {p.ready ? 'Ready' : 'Waiting'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Start Game Button */}
            {activeRoom.hostUid === currentUser.uid ? (
              <button
                type="button"
                onClick={handleHostStartGame}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-stone-950 transition-colors hover:bg-emerald-400"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>
                  Start {activeRoomGameTitle} ({activeRoom.mode.toUpperCase()})
                </span>
              </button>
            ) : (
              <div className="mt-3 rounded-xl border border-stone-800 bg-stone-950 py-2 text-center text-xs text-stone-400">
                Waiting for host ({activeRoom.hostName}) to start the game...
              </div>
            )}

            {/* Host Game Switcher */}
            {activeRoom.hostUid === currentUser.uid && (
              <div className="mt-3">
                <label htmlFor="lobby-game-select" className="block text-xs font-medium text-stone-400">
                  Switch Room Game
                </label>
                <select
                  id="lobby-game-select"
                  value={activeRoom.gameId}
                  onChange={(e) => {
                    const nextGameId = e.target.value;
                    const def = MULTIPLAYER_GAMES.find((g) => g.id === nextGameId);
                    const nextMode =
                      activeRoom.mode === '2v2' && !def?.supports2v2
                        ? '1v1'
                        : activeRoom.mode;
                    onUpdateRoom({
                      ...activeRoom,
                      gameId: nextGameId,
                      mode: nextMode,
                      maxPlayers: nextMode === '2v2' ? 4 : 2,
                    });
                    onSelectGame(nextGameId);
                  }}
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  {MULTIPLAYER_GAMES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.number}. {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Optional Voice Chat System */}
          <div id="multiplayer-voice-panel" className="border-b border-stone-800 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-teal-400" />
                <span className="text-xs font-bold text-stone-100">Voice Chat (Optional)</span>
              </div>
              <span className="text-xs text-stone-400">
                {inVoice ? 'Connected · WebRTC' : 'Standby'}
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  inVoice
                    ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-teal-500 text-stone-950 hover:bg-teal-400'
                }`}
              >
                {inVoice ? <PhoneOff className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
                <span>{inVoice ? 'Leave Voice' : 'Join Voice Room'}</span>
              </button>

              <button
                type="button"
                disabled={!inVoice}
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  if (mediaStreamRef.current) {
                    mediaStreamRef.current.getAudioTracks().forEach((t) => {
                      t.enabled = !nextMute;
                    });
                  }
                }}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`rounded-lg border p-2 text-xs transition-colors disabled:opacity-40 ${
                  isMuted
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-stone-600'
                }`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                type="button"
                disabled={!inVoice}
                onClick={() => setIsDeafened(!isDeafened)}
                aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
                className={`rounded-lg border p-2 text-xs transition-colors disabled:opacity-40 ${
                  isDeafened
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                    : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-stone-600'
                }`}
              >
                {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {inVoice && (
              <div className="mt-3 space-y-2 rounded-xl border border-stone-800 bg-stone-950 p-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Input Mode</span>
                  <button
                    type="button"
                    onClick={() => setPushToTalk(!pushToTalk)}
                    className="font-medium text-teal-400 hover:underline"
                  >
                    {pushToTalk ? 'Push-to-Talk [Hold V]' : 'Open Microphone'}
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {activeRoom.voiceParticipants.map((vp) => (
                    <div key={vp.uid} className="flex items-center justify-between">
                      <span className="font-medium text-stone-200">
                        {vp.username} {vp.uid === currentUser.uid ? '(You)' : ''}
                      </span>
                      <span
                        className={
                          vp.uid === currentUser.uid && isSpeaking && !isMuted
                            ? 'font-semibold text-teal-400'
                            : 'text-stone-500'
                        }
                      >
                        {vp.muted ? 'Muted' : vp.speaking ? 'Speaking' : 'Connected'}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <label htmlFor="partner-volume-slider" className="text-[11px] text-stone-400">
                      Room Audio Vol ({isDeafened ? 0 : partnerVolume}%)
                    </label>
                    <input
                      id="partner-volume-slider"
                      type="range"
                      min={0}
                      max={100}
                      value={isDeafened ? 0 : partnerVolume}
                      onChange={(e) => setPartnerVolume(Number(e.target.value))}
                      className="h-1.5 flex-1 accent-teal-400"
                    />
                  </div>
                </div>

                {micPermissionState === 'fallback' && (
                  <p className="text-[11px] text-stone-400">
                    Voice room connected (no physical microphone detected in browser environment).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Real-time Room Text Chat */}
          <div className="flex flex-1 flex-col">
            <span className="text-xs font-bold text-stone-100">Room Text Chat</span>
            <div className="mt-2 h-36 space-y-2 overflow-y-auto rounded-xl border border-stone-800 bg-stone-950 p-2.5 text-xs">
              {activeRoom.chat.length === 0 ? (
                <p className="text-stone-500">No messages in this room yet.</p>
              ) : (
                activeRoom.chat.map((m) => (
                  <div key={m.id} className="leading-relaxed">
                    <span className="font-semibold text-amber-300">{m.sender}</span>
                    <span className="mx-1 text-stone-600">·</span>
                    <span className="font-mono text-[10px] text-stone-500 tabular-nums">
                      {m.timestamp}
                    </span>
                    <p className="text-stone-200">{m.text}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5">
              <label htmlFor="room-chat-input" className="sr-only">
                Message room chat
              </label>
              <input
                id="room-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Write a message..."
                className="w-full rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Send chat message"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-stone-950 hover:bg-amber-400"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <p className="py-3 text-center text-xs leading-relaxed text-stone-400">
          No active multiplayer room selected. Use <strong className="text-stone-200">Create Room</strong> above to generate a unique room number, or <strong className="text-stone-200">Join Group</strong> to validate and join an existing room!
        </p>
      )}
    </aside>
  );
}
