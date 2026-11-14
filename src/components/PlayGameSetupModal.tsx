'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Swords,
  Users,
  Send,
  Globe,
  Lock,
  Sparkles,
  Trophy,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Heart,
  UserCheck,
  PartyPopper,
} from 'lucide-react';
import {
  ALL_ARCADE_GAMES,
  MULTIPLAYER_GAMES,
  ARCADE_SKINS,
  getSkinById,
} from '@/src/lib/arcade-data';
import {
  MultiplayerRoomState,
} from '@/src/components/VoiceAndLobbyDock';
import { AnimatedSkinnedAvatar } from '@/src/components/CosmeticAvatarAndBanner';
import {
  useGsapModalTransition,
  animateButtonPress,
} from '@/src/lib/gsap-motion';

interface CouplePartnerSummary {
  uid: string;
  username: string;
  email?: string;
  avatar: string;
  customPhotoUrl?: string;
  level?: number;
  xp?: number;
  equippedSkin?: string;
  equippedBanner?: string;
  isOnline?: boolean;
  presenceStatus?: string;
}

interface ActiveCoupleSummary {
  id: number;
  pairingCode?: string;
  requesterUid: string;
  partnerUid: string;
  status: string;
  coupleName: string;
  coupleBanner: string;
  coupleTitle?: string;
  equippedCoupleSkin?: string;
  coupleTrophies: number;
  requesterProfile?: CouplePartnerSummary | null;
  partnerProfile: CouplePartnerSummary | null;
}

interface OutgoingInvitationItem {
  id: number;
  inviteType: string;
  senderUid: string;
  targetUid: string;
  targetUsername: string;
  targetCoupleName: string;
  gameId: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoupleTeamLobbyState {
  id: number;
  coupleId: number;
  coupleName: string;
  coupleTitle: string;
  coupleTrophies: number;
  equippedCoupleSkin: string;
  equippedBanner: string;
  gameId: string;
  hostUid: string;
  partnerUid: string;
  partnerInviteStatus: 'none' | 'pending' | 'accepted' | 'declined';
  hostReady: boolean;
  partnerReady: boolean;
  bothOnline: boolean;
  bothReady: boolean;
  hostProfile: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin: string;
    isOnline: boolean;
    ready: boolean;
    shieldCards?: number;
    shieldCardArmed?: boolean;
  };
  partnerProfile: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin: string;
    isOnline: boolean;
    ready: boolean;
    shieldCards?: number;
    shieldCardArmed?: boolean;
  };
}

interface MatchmakingQueueEntry {
  id: number;
  queueMode: '1v1' | '2v2';
  gameId: string;
  coupleId: number;
  coupleName: string;
  coupleTrophies: number;
  status: 'searching' | 'match_found' | 'match_starting' | 'cancelled' | 'expired';
  matchedRoomCode: string;
  opponentCoupleName: string;
  opponentProfiles: Array<{ uid: string; username: string; avatar: string }>;
  waitSeconds: number;
  allowedTrophyRange: number;
}

interface PublicPartyRoomItem {
  roomCode: string;
  gameId: string;
  gameTitle: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  currentCouples?: number;
  maxCouples?: number;
}

interface PlayGameSetupModalProps {
  isOpen: boolean;
  initialGameId: string;
  mode: '1v1' | '2v2' | 'party';
  currentUser: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin?: string;
    equippedBanner?: string;
    shieldCards?: number;
    shieldCardArmed?: boolean;
  };
  activeCouple: ActiveCoupleSummary | null;
  activeRoom: MultiplayerRoomState | null;
  authFetcher: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onRoomJoinedOrCreated: (room: MultiplayerRoomState, autoLaunchGame?: boolean) => void;
  onOpenCouplePairing: () => void;
  onSwitchMode?: (mode: '1v1' | '2v2') => void;
  onShieldCardUpdated?: () => void;
}

function parseRoomPayload(dbRoom: Record<string, unknown>): MultiplayerRoomState {
  const safeParse = <T,>(raw: unknown, fallback: T): T => {
    if (typeof raw !== 'string' || !raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const resolvedMode =
    dbRoom.mode === 'party'
      ? 'party'
      : dbRoom.mode === '2v2'
      ? '2v2'
      : '1v1';

  return {
    roomCode: String(dbRoom.roomCode || ''),
    gameId: String(dbRoom.gameId || 'chess'),
    mode: resolvedMode,
    visibility: dbRoom.visibility === 'private' ? 'private' : 'public',
    joinPolicy:
      dbRoom.joinPolicy === 'approval_required' ? 'approval_required' : 'immediate',
    maxPlayers: Number(
      dbRoom.maxPlayers ||
        (resolvedMode === 'party' ? 20 : resolvedMode === '2v2' ? 4 : 2)
    ),
    hostUid: String(dbRoom.hostUid || ''),
    hostName: String(dbRoom.hostName || 'Player'),
    hostAvatar: String(dbRoom.hostAvatar || '🦊'),
    status:
      dbRoom.status === 'playing'
        ? 'playing'
        : dbRoom.status === 'finished'
        ? 'finished'
        : 'lobby',
    settings: safeParse(dbRoom.settingsJson, {}),
    players: safeParse(dbRoom.playersJson, []),
    teams: safeParse(dbRoom.teamsJson, []),
    pendingRequests: safeParse(dbRoom.pendingRequestsJson, []),
    invitedUids: safeParse(dbRoom.invitedUidsJson, []),
    gameState: safeParse(dbRoom.gameStateJson, {}),
    chat: safeParse(dbRoom.chatJson, []),
    voiceParticipants: safeParse(dbRoom.voiceParticipantsJson, []),
  };
}

export function PlayGameSetupModal({
  isOpen,
  initialGameId,
  mode,
  currentUser,
  activeCouple,
  activeRoom,
  authFetcher,
  onClose,
  onRoomJoinedOrCreated,
  onOpenCouplePairing,
  onSwitchMode,
  onShieldCardUpdated,
}: PlayGameSetupModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [selectedGameId, setSelectedGameId] = useState(initialGameId);

  // 1v1 Partner-Only Challenge state
  const [sendingInviteUid, setSendingInviteUid] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<number | null>(null);
  const [respondingIncomingId, setRespondingIncomingId] = useState<number | null>(null);
  const [outgoingInvitations, setOutgoingInvitations] = useState<OutgoingInvitationItem[]>([]);
  const [incomingPartnerInvites, setIncomingPartnerInvites] = useState<
    Array<{
      id: number;
      inviteType: string;
      senderUid: string;
      senderUsername: string;
      gameId: string;
      roomCode: string;
      status: string;
    }>
  >([]);

  // 1v1 Chess Clock Preset & Color Assignment (Host configures before challenging partner)
  const [chessPresetId, setChessPresetId] = useState<string>('rapid-10-0');
  const [chessCustomMinutes, setChessCustomMinutes] = useState<number>(10);
  const [chessCustomIncrement, setChessCustomIncrement] = useState<number>(5);
  const [hostColorPreference, setHostColorPreference] = useState<'white' | 'black' | 'random'>('white');

  // Party Room setup state (3–10 Couples)
  const [partyVisibility, setPartyVisibility] = useState<'public' | 'private'>('public');
  const [creatingPartyRoom, setCreatingPartyRoom] = useState(false);
  const [publicPartyRooms, setPublicPartyRooms] = useState<PublicPartyRoomItem[]>([]);
  const [joiningPartyCode, setJoiningPartyCode] = useState('');

  // 2v2 Team & Matchmaking state
  const [teamLobby, setTeamLobby] = useState<CoupleTeamLobbyState | null>(null);
  const [invitingPartner2v2, setInvitingPartner2v2] = useState(false);
  const [respondingPartner2v2, setRespondingPartner2v2] = useState(false);
  const [togglingReady2v2, setTogglingReady2v2] = useState(false);
  const [queueEntry, setQueueEntry] = useState<MatchmakingQueueEntry | null>(null);
  const [enqueuingMatch, setEnqueuingMatch] = useState(false);
  const [cancellingMatch, setCancellingMatch] = useState(false);
  const [togglingShieldCard, setTogglingShieldCard] = useState(false);
  const [confirmShieldPrompt, setConfirmShieldPrompt] = useState<boolean | null>(null);

  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialGameId) {
      Promise.resolve().then(() => {
        setSelectedGameId(initialGameId);
      });
    }
  }, [initialGameId, isOpen]);

  useGsapModalTransition(
    backdropRef,
    panelRef,
    isOpen,
    `${mode}-${selectedGameId}`
  );

  const selectedGame =
    ALL_ARCADE_GAMES.find((g) => g.id === selectedGameId) || MULTIPLAYER_GAMES[0];

  const pairedPartner: CouplePartnerSummary | null = activeCouple
    ? (activeCouple.requesterUid === currentUser.uid
        ? activeCouple.partnerProfile
        : activeCouple.requesterProfile || activeCouple.partnerProfile) || null
    : null;

  const getSkinName = (skinId?: string) => {
    const found =
      getSkinById(skinId) ||
      ARCADE_SKINS.find((s) => s.id === (skinId || 'skin-classic-notebook'));
    return found ? `${found.emblem} ${found.name}` : '📓 Classic Notebook';
  };

  const getBannerLabel = (bannerId?: string) => {
    if (!bannerId || bannerId === 'banner-none') return 'Notebook Standard';
    return bannerId
      .replace(/^banner-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getResolvedChessSettings = useCallback(() => {
    const presets: Record<string, { label: string; initialTimeMs: number; incrementSeconds: number }> = {
      'bullet-1-0': { label: 'Bullet 1+0', initialTimeMs: 60 * 1000, incrementSeconds: 0 },
      'blitz-3-2': { label: 'Blitz 3+2', initialTimeMs: 3 * 60 * 1000, incrementSeconds: 2 },
      'blitz-5-0': { label: 'Blitz 5+0', initialTimeMs: 5 * 60 * 1000, incrementSeconds: 0 },
      'rapid-10-0': { label: 'Rapid 10+0', initialTimeMs: 10 * 60 * 1000, incrementSeconds: 0 },
      'classical-15-10': { label: 'Classical 15+10', initialTimeMs: 15 * 60 * 1000, incrementSeconds: 10 },
    };
    const chosen = presets[chessPresetId];
    if (chosen) {
      return {
        timePresetId: chessPresetId,
        timeControlLabel: chosen.label,
        initialTimeMs: chosen.initialTimeMs,
        incrementSeconds: chosen.incrementSeconds,
        hostColorPreference,
      };
    }
    const mins = Math.max(1, Math.min(60, Number(chessCustomMinutes) || 10));
    const inc = Math.max(0, Math.min(30, Number(chessCustomIncrement) || 0));
    return {
      timePresetId: 'custom',
      timeControlLabel: `Custom ${mins}+${inc}`,
      initialTimeMs: mins * 60 * 1000,
      incrementSeconds: inc,
      hostColorPreference,
    };
  }, [chessPresetId, chessCustomMinutes, chessCustomIncrement, hostColorPreference]);

  // Poll matchmaking, outgoing 1v1/2v2 invitations, active room status, and 2v2 Couple Team Lobby while modal is open
  const pollModalLiveState = useCallback(async () => {
    if (!isOpen || !currentUser.uid) return;
    try {
      const res = await authFetcher(
        `/api/arcade?matchmakingStatus=1&uid=${encodeURIComponent(currentUser.uid)}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data.incomingInvitations)) {
        setIncomingPartnerInvites(data.incomingInvitations);
      }

      // Check if an active match room is already in 'playing' state for this user
      if (data.activeMatchRoom) {
        const parsedActive = parseRoomPayload(data.activeMatchRoom);
        const minPlayersRequired =
          parsedActive.mode === 'party' ? 6 : parsedActive.mode === '2v2' ? 4 : 2;
        if (
          parsedActive.status === 'playing' &&
          parsedActive.players.length >= minPlayersRequired &&
          (parsedActive.gameId === selectedGameId ||
            (activeRoom && parsedActive.roomCode === activeRoom.roomCode))
        ) {
          onRoomJoinedOrCreated(parsedActive, true);
          return;
        }
      }

      if (Array.isArray(data.outgoingInvitations)) {
        setOutgoingInvitations(data.outgoingInvitations);
        // Check if an outgoing 1v1 or 2v2 invitation was accepted — always transition when modal is open!
        const acceptedInvite = (data.outgoingInvitations as OutgoingInvitationItem[]).find(
          (inv) =>
            (inv.inviteType === '1v1' || inv.inviteType === '2v2') &&
            inv.status === 'accepted' &&
            inv.roomCode &&
            (inv.gameId === selectedGameId ||
              (activeRoom && inv.roomCode === activeRoom.roomCode))
        );
        if (acceptedInvite) {
          const roomRes = await authFetcher(
            `/api/arcade?roomCode=${encodeURIComponent(acceptedInvite.roomCode)}`
          );
          const roomData = await roomRes.json();
          if (roomData?.room) {
            const parsed = parseRoomPayload(roomData.room);
            if (parsed.status === 'playing' && parsed.players.length >= 2) {
              onRoomJoinedOrCreated(parsed, true);
              return;
            }
          }
        }
      }

      if (mode === 'party') {
        const pubRes = await authFetcher(
          `/api/arcade?publicRooms=1&mode=party&gameId=${encodeURIComponent(
            selectedGameId
          )}&uid=${encodeURIComponent(currentUser.uid)}`
        );
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          setPublicPartyRooms(Array.isArray(pubData.publicRooms) ? pubData.publicRooms : []);
        }
      }

      if (data.coupleTeamLobby) {
        setTeamLobby(data.coupleTeamLobby);
      }

      if (data.myQueueEntry) {
        setQueueEntry(data.myQueueEntry);
        if (
          (data.myQueueEntry.status === 'match_found' ||
            data.myQueueEntry.status === 'match_starting') &&
          data.matchedRoom
        ) {
          const parsed = parseRoomPayload(data.matchedRoom);
          if (data.myQueueEntry.status === 'match_found') {
            await authFetcher('/api/arcade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'acknowledge_match_starting',
                queueId: data.myQueueEntry.id,
              }),
            });
          }
          onRoomJoinedOrCreated(parsed, true);
        }
      } else {
        setQueueEntry(null);
      }
    } catch {
      // ignore poll error
    }
  }, [
    isOpen,
    currentUser.uid,
    authFetcher,
    selectedGameId,
    activeRoom,
    mode,
    onRoomJoinedOrCreated,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.resolve().then(() => {
      pollModalLiveState();
    });
    const interval = window.setInterval(pollModalLiveState, 1200);
    return () => window.clearInterval(interval);
  }, [isOpen, pollModalLiveState]);

  const handleRespondIncomingChallenge = async (invitationId: number, accept: boolean) => {
    setRespondingIncomingId(invitationId);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (accept && data.room) {
        const parsed = parseRoomPayload(data.room);
        onRoomJoinedOrCreated(parsed, true);
        return;
      }
      setStatusBanner({
        type: 'info',
        text: 'Invitation declined.',
      });
      await pollModalLiveState();
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to respond to invitation.',
      });
    } finally {
      setRespondingIncomingId(null);
    }
  };

  const handleSend1v1PartnerChallenge = async () => {
    if (!activeCouple || activeCouple.status !== 'active' || !pairedPartner) {
      setStatusBanner({
        type: 'error',
        text: 'Couple pairing is required before challenging your partner to a 1v1 match.',
      });
      return;
    }
    setSendingInviteUid(pairedPartner.uid);
    setStatusBanner(null);
    try {
      const matchSettings =
        selectedGameId === 'chess' ? getResolvedChessSettings() : {};
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_game_invitation',
          inviteType: '1v1',
          targetUsername: pairedPartner.username,
          gameId: selectedGameId,
          settings: matchSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send 1v1 challenge to partner.');
      }
      if (data.room) {
        const parsedRoom = parseRoomPayload(data.room);
        onRoomJoinedOrCreated(parsedRoom, false);
      }
      setStatusBanner({
        type: 'success',
        text: `1v1 Challenge sent to your partner @${pairedPartner.username}! Both of you will automatically enter the match as soon as they accept.`,
      });
      await pollModalLiveState();
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send challenge.',
      });
    } finally {
      setSendingInviteUid(null);
    }
  };

  const handleCancel1v1Challenge = async (invitationId: number) => {
    setCancellingInviteId(invitationId);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_game_invitation',
          invitationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not cancel challenge.');
      }
      setStatusBanner({
        type: 'info',
        text: '1v1 partner challenge cancelled.',
      });
      await pollModalLiveState();
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to cancel challenge.',
      });
    } finally {
      setCancellingInviteId(null);
    }
  };

  const handleCreatePartyRoom = async () => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusBanner({
        type: 'error',
        text: 'Active Couple Pairing is required to host a Party Game (3–10 Couples).',
      });
      return;
    }
    setCreatingPartyRoom(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_room',
          gameId: selectedGameId,
          mode: 'party',
          visibility: partyVisibility,
          joinPolicy: 'immediate',
          includePairedPartner: false,
          settings: {
            minCouples: 3,
            maxCouples: 10,
            partyRounds: selectedGame.partyRounds || 4,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Could not create Party Room.');
      }
      const parsed = parseRoomPayload(data.room);
      onRoomJoinedOrCreated(parsed, true);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create Party Room.',
      });
    } finally {
      setCreatingPartyRoom(false);
    }
  };

  const handleJoinPartyRoomByCode = async (codeToJoin: string) => {
    const clean = codeToJoin.trim().toUpperCase();
    if (!clean) return;
    setCreatingPartyRoom(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_room',
          roomCode: clean,
          includePairedPartner: false,
          viaDirectCodeOrInvite: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Could not join Party Room.');
      }
      const parsed = parseRoomPayload(data.room);
      onRoomJoinedOrCreated(parsed, true);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to join Party Room.',
      });
    } finally {
      setCreatingPartyRoom(false);
    }
  };

  const handleInvitePartner2v2 = async () => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusBanner({
        type: 'error',
        text: 'Couple pairing is required for 2v2 Couple Mode.',
      });
      return;
    }
    setInvitingPartner2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite_partner_2v2_team',
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not invite partner.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
      setStatusBanner({
        type: 'success',
        text: `Team invitation sent to @${pairedPartner?.username || 'partner'}! Once they accept, both of you click Ready to unlock Find Match.`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to invite partner.',
      });
    } finally {
      setInvitingPartner2v2(false);
    }
  };

  const handleRespondPartner2v2 = async (accept: boolean) => {
    setRespondingPartner2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_partner_2v2_team',
          accept,
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to team invitation.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
      setStatusBanner({
        type: accept ? 'success' : 'info',
        text: accept
          ? 'You joined the 2v2 Couple Team! Both partners can now click Ready.'
          : 'You declined the 2v2 team invitation.',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to respond.',
      });
    } finally {
      setRespondingPartner2v2(false);
    }
  };

  const handleToggleReady2v2 = async () => {
    setTogglingReady2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_2v2_team_ready',
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle team readiness.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update readiness.',
      });
    } finally {
      setTogglingReady2v2(false);
    }
  };

  const handleFind2v2Match = async () => {
    setEnqueuingMatch(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enqueue_matchmaking',
          queueMode: '2v2',
          gameId: selectedGameId,
          requireTeamReady: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start 2v2 matchmaking.');
      }
      if (data.myQueueEntry) {
        setQueueEntry(data.myQueueEntry);
      }
      if (data.matchedRoom) {
        const parsed = parseRoomPayload(data.matchedRoom);
        onRoomJoinedOrCreated(parsed, true);
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to start matchmaking.',
      });
    } finally {
      setEnqueuingMatch(false);
    }
  };

  const handleCancel2v2Matchmaking = async () => {
    setCancellingMatch(true);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_matchmaking',
          queueId: queueEntry?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQueueEntry(data.myQueueEntry || null);
      }
    } catch {
      // ignore
    } finally {
      setCancellingMatch(false);
    }
  };

  const handleToggleShieldCard = async (targetArmed: boolean) => {
    setTogglingShieldCard(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_shield_card',
          armed: targetArmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not update Ranked Shield Card.');
      }
      setConfirmShieldPrompt(null);
      setStatusBanner({
        type: 'success',
        text: targetArmed
          ? '🛡️ Ranked Shield Card ARMED! Your personal XP is protected on your next 2v2 loss.'
          : 'Ranked Shield Card disarmed and returned to standby.',
      });
      await pollModalLiveState();
      onShieldCardUpdated?.();
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to toggle Ranked Shield Card.',
      });
    } finally {
      setTogglingShieldCard(false);
    }
  };

  if (!isOpen) return null;

  const myReadyIn2v2 =
    teamLobby?.hostUid === currentUser.uid
      ? Boolean(teamLobby?.hostReady)
      : Boolean(teamLobby?.partnerReady);

  const canFind2v2Match =
    Boolean(teamLobby) &&
    teamLobby!.partnerInviteStatus === 'accepted' &&
    teamLobby!.hostReady &&
    teamLobby!.partnerReady &&
    teamLobby!.bothOnline;

  const latestPartner1v1Invite = outgoingInvitations.find(
    (inv) =>
      inv.inviteType === '1v1' &&
      (!pairedPartner || inv.targetUid === pairedPartner.uid)
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2523]/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-4xl bg-[#FDFBF7] border-2 border-[#2C2523] rounded-3xl shadow-[8px_8px_0px_#2C2523] overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Modal Header */}
        <div
          className="px-5 py-4 border-b-2 border-[#2C2523] flex items-center justify-between gap-3"
          style={{ backgroundColor: selectedGame.accentColor || '#F3EFE6' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center justify-center shrink-0">
              {mode === '1v1' ? (
                <Swords className="w-5 h-5 text-[#2C2523]" />
              ) : mode === 'party' ? (
                <PartyPopper className="w-5 h-5 text-[#E11D48]" />
              ) : (
                <Users className="w-5 h-5 text-[#2C2523]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-black uppercase tracking-wider">
                  {mode === '1v1'
                    ? '1v1 Partner Duel'
                    : mode === 'party'
                    ? 'Party Games (3–10 Couples)'
                    : '2v2 Team & Matchmaking'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-[#2C2523] text-[10px] font-bold text-[#2C2523]">
                  {mode === '1v1'
                    ? 'Paired Partner Only · XP Only · 0 Coins · 0 Trophies'
                    : mode === 'party'
                    ? '6–20 Players · Placement XP Only · 0 Coins · 0 Trophies'
                    : 'XP + Coins + Couple Trophies 🏆'}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2C2523] truncate mt-0.5">
                {selectedGame.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mode !== 'party' && selectedGame.supports2v2 && onSwitchMode && (
              <div className="hidden sm:flex items-center rounded-xl border-2 border-[#2C2523] bg-white p-0.5 shadow-[2px_2px_0px_#2C2523]">
                <button
                  type="button"
                  onClick={() => onSwitchMode('1v1')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                    mode === '1v1'
                      ? 'bg-[#2C2523] text-white'
                      : 'text-[#2C2523] hover:bg-[#F3EFE6]'
                  }`}
                >
                  1v1 Partner
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchMode('2v2')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                    mode === '2v2'
                      ? 'bg-[#E11D48] text-white'
                      : 'text-[#2C2523] hover:bg-[#F3EFE6]'
                  }`}
                >
                  2v2 Couple
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                animateButtonPress(e.currentTarget);
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center hover:bg-[#F3EFE6] transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-[#2C2523]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Couple Pairing Gate Warning if Unpaired */}
          {(!activeCouple || activeCouple.status !== 'active') && (
            <div
              data-gsap-modal-item
              className="p-4 rounded-2xl bg-[#FFF3CD] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#2C2523]">
                    Active Couple Pairing Required
                  </p>
                  <p className="text-xs text-[#6B5E58]">
                    All multiplayer modes (1v1 Partner Duels, 2v2 Couples, and Party Games) require an active couple pairing with your partner first.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenCouplePairing}
                className="px-4 py-2 rounded-xl bg-[#D96B43] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] shrink-0"
              >
                Pair Partner Now
              </button>
            </div>
          )}

          {statusBanner && (
            <div
              data-gsap-modal-item
              className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-xs font-bold flex items-center justify-between gap-3 ${
                statusBanner.type === 'error'
                  ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                  : statusBanner.type === 'success'
                  ? 'bg-[#DEF7EC] text-[#03543F]'
                  : 'bg-[#E1EFFE] text-[#1E429F]'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-xs underline font-black"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ================================================================
              MODE A: PARTNER-ONLY 1V1 DUEL FLOW (You VS Your Partner)
             ================================================================ */}
          {mode === '1v1' && (
            <div className="space-y-5">
              {/* Main You VS Your Partner Duel Arena Card */}
              <div
                data-gsap-modal-item
                className="bg-white border-2 border-[#2C2523] rounded-3xl p-5 sm:p-6 shadow-[4px_4px_0px_#2C2523] space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-dashed border-[#2C2523]/15">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E11D48]">
                      Exclusive Couple 1v1 Matchup
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2C2523]">
                      Compete Head-to-Head Against Your Paired Partner
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold text-[#2C2523]">
                    Individual XP Only · 0 Coins · 0 Trophies
                  </span>
                </div>

                {/* You VS Your Partner Split Display */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
                  {/* Left Card: YOU (Your account) */}
                  <div className="md:col-span-5 p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-col items-center text-center space-y-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#2C2523] text-white text-[10px] font-black uppercase tracking-wider">
                      You · Your Account
                    </span>
                    <AnimatedSkinnedAvatar
                      avatarId={currentUser.avatar || '🦊'}
                      customPhotoUrl={currentUser.customPhotoUrl}
                      skinId={currentUser.equippedSkin}
                      size="lg"
                    />
                    <div>
                      <div className="font-serif text-lg font-bold text-[#2C2523]">
                        @{currentUser.username}
                      </div>
                      <div className="text-xs font-bold text-[#6B5E58] mt-0.5">
                        Skin: {getSkinName(currentUser.equippedSkin)}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#DEF7EC] border border-[#2C2523] text-[11px] font-black text-[#03543F]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online & Ready
                    </span>
                  </div>

                  {/* Center VS Emblem */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center font-serif text-base font-black text-[#E11D48]">
                      VS
                    </div>
                  </div>

                  {/* Right Card: YOUR PARTNER (Paired account) */}
                  <div className="md:col-span-5 p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-col items-center text-center space-y-2.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#E11D48] text-white text-[10px] font-black uppercase tracking-wider">
                      Your Partner · Paired Account
                    </span>
                    {pairedPartner ? (
                      <>
                        <AnimatedSkinnedAvatar
                          avatarId={pairedPartner.avatar || '🐼'}
                          customPhotoUrl={pairedPartner.customPhotoUrl}
                          skinId={pairedPartner.equippedSkin}
                          size="lg"
                        />
                        <div>
                          <div className="font-serif text-lg font-bold text-[#2C2523]">
                            @{pairedPartner.username}
                          </div>
                          <div className="text-xs font-bold text-[#6B5E58] mt-0.5">
                            Skin: {getSkinName(pairedPartner.equippedSkin)}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#2C2523] text-[11px] font-black ${
                            pairedPartner.isOnline
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              pairedPartner.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                            }`}
                          />
                          {pairedPartner.isOnline ? 'Online' : 'Offline · Unavailable'}
                        </span>
                      </>
                    ) : (
                      <div className="py-6 space-y-2">
                        <div className="text-sm font-bold text-[#2C2523]">
                          No Paired Partner Yet
                        </div>
                        <p className="text-xs text-[#6B5E58] max-w-xs">
                          Pair with your partner in Profile & Couple to unlock 1v1 Partner Duels.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Incoming 1v1 Challenge from Partner (Instant 1-Click Accept) */}
                {incomingPartnerInvites
                  .filter(
                    (inv) =>
                      inv.inviteType === '1v1' &&
                      inv.status === 'pending' &&
                      (!pairedPartner || inv.senderUid === pairedPartner.uid)
                  )
                  .map((inc) => {
                    const incGame = ALL_ARCADE_GAMES.find((g) => g.id === inc.gameId);
                    return (
                      <div
                        key={inc.id}
                        className="p-4 rounded-2xl bg-[#DEF7EC] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-[#03543F]">
                            Incoming 1v1 Partner Challenge · Room #{inc.roomCode}
                          </div>
                          <p className="text-xs font-bold text-[#2C2523] mt-0.5">
                            @{inc.senderUsername} challenged you to play{' '}
                            <strong>{incGame?.title || inc.gameId}</strong>! Accept now to launch both of you into the live match immediately.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={respondingIncomingId === inc.id}
                            onClick={() => handleRespondIncomingChallenge(inc.id, true)}
                            className="px-4 py-2.5 rounded-xl bg-[#03543F] hover:bg-[#023E2F] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {respondingIncomingId === inc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Accept & Enter Match
                          </button>
                          <button
                            type="button"
                            disabled={respondingIncomingId === inc.id}
                            onClick={() => handleRespondIncomingChallenge(inc.id, false)}
                            className="px-3 py-2.5 rounded-xl bg-white hover:bg-[#FDE8E8] text-[#9B1C1C] text-xs font-bold border-2 border-[#2C2523]"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Chess Clock Preset & Color Assignment (when 1v1 Chess is selected) */}
                {selectedGameId === 'chess' && (
                  <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
                          Official Chess Match Settings (Clock & Piece Colors)
                        </div>
                        <p className="text-xs text-[#6B5E58]">
                          Choose the match clock preset and your preferred piece color before sending the challenge to your partner.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] border border-[#2C2523] text-[11px] font-black text-[#92400E]">
                        {getResolvedChessSettings().timeControlLabel} · Host:{' '}
                        {hostColorPreference.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Clock Preset Selector */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-[#2C2523]">
                          Time Control Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'bullet-1-0', label: 'Bullet 1+0', desc: '1 min' },
                            { id: 'blitz-3-2', label: 'Blitz 3+2', desc: '3m + 2s' },
                            { id: 'blitz-5-0', label: 'Blitz 5+0', desc: '5 min' },
                            { id: 'rapid-10-0', label: 'Rapid 10+0', desc: '10 min' },
                            { id: 'classical-15-10', label: 'Classical 15+10', desc: '15m + 10s' },
                            { id: 'custom', label: 'Custom Clock', desc: 'Set m + s' },
                          ].map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setChessPresetId(preset.id)}
                              className={`p-2 rounded-xl border-2 border-[#2C2523] text-left transition-all ${
                                chessPresetId === preset.id
                                  ? 'bg-[#FEF3C7] shadow-[2px_2px_0px_#2C2523]'
                                  : 'bg-white hover:bg-[#F3EFE6]'
                              }`}
                            >
                              <div className="text-xs font-bold text-[#2C2523]">
                                {preset.label}
                              </div>
                              <div className="text-[10px] text-[#6B5E58]">{preset.desc}</div>
                            </button>
                          ))}
                        </div>

                        {chessPresetId === 'custom' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-[#6B5E58]">
                                Minutes (1–60)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={chessCustomMinutes}
                                onChange={(e) =>
                                  setChessCustomMinutes(
                                    Math.max(1, Math.min(60, Number(e.target.value) || 10))
                                  )
                                }
                                className="mt-0.5 w-full rounded-lg border-2 border-[#2C2523] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2C2523]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-[#6B5E58]">
                                Increment Sec (0–30)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={30}
                                value={chessCustomIncrement}
                                onChange={(e) =>
                                  setChessCustomIncrement(
                                    Math.max(0, Math.min(30, Number(e.target.value) || 0))
                                  )
                                }
                                className="mt-0.5 w-full rounded-lg border-2 border-[#2C2523] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2C2523]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Piece Color Selector */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-[#2C2523]">
                          Your Piece Color Assignment
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {
                              id: 'white' as const,
                              label: '♔ White',
                              desc: 'You move first',
                            },
                            {
                              id: 'black' as const,
                              label: '♚ Black',
                              desc: 'Partner moves 1st',
                            },
                            {
                              id: 'random' as const,
                              label: '🎲 Random',
                              desc: '50/50 coin toss',
                            },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setHostColorPreference(opt.id)}
                              className={`p-2.5 rounded-xl border-2 border-[#2C2523] text-center transition-all ${
                                hostColorPreference === opt.id
                                  ? 'bg-[#E3E8FF] shadow-[2px_2px_0px_#2C2523]'
                                  : 'bg-white hover:bg-[#F3EFE6]'
                              }`}
                            >
                              <div className="text-xs font-bold text-[#2C2523]">
                                {opt.label}
                              </div>
                              <div className="text-[10px] text-[#6B5E58] mt-0.5">
                                {opt.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Partner Offline Warning */}
                {pairedPartner && !pairedPartner.isOnline && (
                  <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] flex items-center justify-between gap-3 text-xs font-bold text-[#92400E]">
                    <span>
                      @{pairedPartner.username} is currently offline. You can still send a 1v1 challenge invitation — your partner must come online and accept before the match begins.
                    </span>
                  </div>
                )}

                {/* Challenge Your Partner CTA Section */}
                <div className="p-4 rounded-2xl bg-[#F3EFE6] border-2 border-[#2C2523] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
                      Challenge Your Partner
                    </div>
                    <p className="text-xs text-[#6B5E58] mt-0.5">
                      Send a direct 1v1 invitation for{' '}
                      <strong className="text-[#2C2523]">{selectedGame.title}</strong> to{' '}
                      {pairedPartner ? `@${pairedPartner.username}` : 'your paired partner'}. Both players automatically enter the same room as soon as your partner accepts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    {latestPartner1v1Invite &&
                      latestPartner1v1Invite.status === 'pending' &&
                      latestPartner1v1Invite.gameId === selectedGameId && (
                        <button
                          type="button"
                          disabled={cancellingInviteId === latestPartner1v1Invite.id}
                          onClick={(e) => {
                            animateButtonPress(e.currentTarget);
                            handleCancel1v1Challenge(latestPartner1v1Invite.id);
                          }}
                          className="px-4 py-3 rounded-2xl bg-white hover:bg-[#FDE8E8] text-[#9B1C1C] text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {cancellingInviteId === latestPartner1v1Invite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Cancel Challenge
                        </button>
                      )}

                    <button
                      type="button"
                      disabled={
                        !pairedPartner ||
                        !activeCouple ||
                        activeCouple.status !== 'active' ||
                        sendingInviteUid === pairedPartner?.uid
                      }
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleSend1v1PartnerChallenge();
                      }}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#D96B43] hover:bg-[#C25934] text-white text-sm font-bold border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-45"
                    >
                      {sendingInviteUid === pairedPartner?.uid ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Swords className="w-4 h-4" />
                      )}
                      {latestPartner1v1Invite &&
                      latestPartner1v1Invite.status === 'pending' &&
                      latestPartner1v1Invite.gameId === selectedGameId
                        ? 'Resend 1v1 Challenge'
                        : 'Challenge Your Partner'}
                    </button>
                  </div>
                </div>

                {/* Outgoing 1v1 Partner Invitation States (pending, accepted, declined, expired, cancelled) */}
                {outgoingInvitations.filter((i) => i.inviteType === '1v1').length > 0 && (
                  <div className="pt-3 border-t-2 border-dashed border-[#2C2523]/20 space-y-2.5">
                    <div className="text-xs font-black uppercase tracking-wider text-[#2C2523] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Partner 1v1 Invitation States
                    </div>
                    <div className="space-y-2 max-h-44 overflow-y-auto">
                      {outgoingInvitations
                        .filter((i) => i.inviteType === '1v1')
                        .slice(0, 6)
                        .map((inv) => {
                          const statusStyle =
                            inv.status === 'accepted'
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : inv.status === 'declined'
                              ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                              : inv.status === 'cancelled'
                              ? 'bg-[#F3EFE6] text-[#6B5E58]'
                              : inv.status === 'expired'
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-[#FEF3C7] text-[#92400E]';
                          const gameObj = ALL_ARCADE_GAMES.find((g) => g.id === inv.gameId);
                          return (
                            <div
                              key={inv.id}
                              className="px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-[#2C2523]">
                                  @{inv.targetUsername}
                                </span>
                                <span className="text-[#6B5E58]">
                                  · {gameObj?.title || inv.gameId} · Room #{inv.roomCode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-md border border-[#2C2523] text-[10px] font-black uppercase ${statusStyle}`}
                                >
                                  {inv.status}
                                </span>
                                {inv.status === 'pending' && (
                                  <button
                                    type="button"
                                    disabled={cancellingInviteId === inv.id}
                                    onClick={() => handleCancel1v1Challenge(inv.id)}
                                    className="px-2 py-0.5 rounded-md bg-white hover:bg-[#FDE8E8] border border-[#2C2523] text-[10px] font-bold text-[#9B1C1C]"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              MODE C: PARTY GAMES SETUP (3-10 Couples · 6-20 Players)
             ================================================================ */}
          {mode === 'party' && (
            <div className="space-y-5">
              <div
                data-gsap-modal-item
                className="bg-white border-2 border-[#2C2523] rounded-3xl p-5 sm:p-6 shadow-[4px_4px_0px_#2C2523] space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b-2 border-dashed border-[#2C2523]/15">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E11D48]">
                      Multi-Couple Party Session · 3 to 10 Couples (6–20 Players)
                    </span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#2C2523]">
                      {selectedGame.title} · Party Room Setup
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold text-[#2C2523]">
                    1st: +60 XP · 2nd: +45 XP · 3rd: +35 XP · 0 Coins · 0 Trophies
                  </span>
                </div>

                {/* Create Party Room Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] space-y-3.5">
                    <div className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
                      Option 1 · Host a New Party Room
                    </div>
                    <p className="text-xs text-[#6B5E58]">
                      Creates a 3–10 couple Party Room for <strong>{selectedGame.title}</strong> and automatically invites your paired partner ({pairedPartner ? `@${pairedPartner.username}` : 'partner'}) to your couple team slot.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPartyVisibility('public')}
                        className={`p-3 rounded-xl border-2 border-[#2C2523] text-left transition-all ${
                          partyVisibility === 'public'
                            ? 'bg-[#DEF7EC] shadow-[2px_2px_0px_#2C2523]'
                            : 'bg-white hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#2C2523]">
                          <Globe className="w-3.5 h-3.5 text-[#03543F]" />
                          Public Party
                        </div>
                        <p className="text-[10px] text-[#6B5E58] mt-0.5">
                          Listed in Public Party Browser
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPartyVisibility('private')}
                        className={`p-3 rounded-xl border-2 border-[#2C2523] text-left transition-all ${
                          partyVisibility === 'private'
                            ? 'bg-[#E3E8FF] shadow-[2px_2px_0px_#2C2523]'
                            : 'bg-white hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#2C2523]">
                          <Lock className="w-3.5 h-3.5 text-[#3B4CCA]" />
                          Private Party
                        </div>
                        <p className="text-[10px] text-[#6B5E58] mt-0.5">
                          Join via Room Code only
                        </p>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={creatingPartyRoom || !activeCouple || activeCouple.status !== 'active'}
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleCreatePartyRoom();
                      }}
                      className="w-full py-3 rounded-2xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-45"
                    >
                      {creatingPartyRoom ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Create Party Room & Auto-Invite Partner
                    </button>
                  </div>

                  {/* Option 2: Join Existing Party Room by Code or Public List */}
                  <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] space-y-3.5">
                    <div className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
                      Option 2 · Join Existing Party Room
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={joiningPartyCode}
                        onChange={(e) => setJoiningPartyCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-char Party Code..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white border-2 border-[#2C2523] text-xs font-mono font-bold uppercase"
                      />
                      <button
                        type="button"
                        disabled={creatingPartyRoom || !joiningPartyCode.trim()}
                        onClick={() => handleJoinPartyRoomByCode(joiningPartyCode)}
                        className="px-4 py-2 rounded-xl bg-[#2C2523] text-white text-xs font-bold border-2 border-[#2C2523] disabled:opacity-45"
                      >
                        {creatingPartyRoom ? 'Joining...' : 'Join Code'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="text-[11px] font-black uppercase text-[#6B5E58]">
                        Open Public Party Rooms ({publicPartyRooms.length})
                      </div>
                      {publicPartyRooms.length === 0 ? (
                        <div className="p-3 rounded-xl bg-white border border-dashed border-[#2C2523]/30 text-xs text-[#6B5E58] text-center">
                          No open public party rooms right now. Create one on the left!
                        </div>
                      ) : (
                        publicPartyRooms.map((room) => (
                          <div
                            key={room.roomCode}
                            className="p-2.5 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="font-bold text-[#2C2523]">
                                #{room.roomCode} · {room.gameTitle}
                              </div>
                              <div className="text-[10px] text-[#6B5E58]">
                                Host: @{room.hostName} · {room.currentCouples ?? 1}/10 Couples
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleJoinPartyRoomByCode(room.roomCode)}
                              className="px-3 py-1.5 rounded-lg bg-[#DEF7EC] border border-[#2C2523] text-[11px] font-bold text-[#03543F]"
                            >
                              Join Party
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              MODE B: 2V2 TEAM & MATCHMAKING SCREEN (Partner Invite + Ready Gate + Find Match)
             ================================================================ */}
          {mode === '2v2' && (
            <div className="space-y-5">
              {/* Couple Banner & Team Header */}
              <div
                data-gsap-modal-item
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FFF0F3] via-[#FDFBF7] to-[#E3E8FF] border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-dashed border-[#2C2523]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFE4E6] border-2 border-[#2C2523] flex items-center justify-center">
                      <Heart className="w-5 h-5 text-[#E11D48] fill-[#E11D48]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg font-bold text-[#2C2523]">
                          {teamLobby?.coupleName ||
                            activeCouple?.coupleName ||
                            'Your Couple Team'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-black uppercase">
                          {teamLobby?.coupleTitle || activeCouple?.coupleTitle || 'Duo'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5E58]">
                        Banner:{' '}
                        <span className="font-semibold text-[#2C2523]">
                          {getBannerLabel(
                            teamLobby?.equippedBanner || activeCouple?.coupleBanner
                          )}
                        </span>{' '}
                        · Couple Skin:{' '}
                        <span className="font-semibold text-[#2C2523]">
                          {getSkinName(
                            teamLobby?.equippedCoupleSkin ||
                              activeCouple?.equippedCoupleSkin
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#D97706]" />
                    <span className="font-black text-sm text-[#2C2523]">
                      {teamLobby?.coupleTrophies ?? activeCouple?.coupleTrophies ?? 0} Couple
                      Trophies
                    </span>
                  </div>
                </div>

                {/* Both Team Members & Avatars, Skins, Online Status, and Readiness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                  {/* Member 1: Current User */}
                  <div className="p-3.5 rounded-2xl bg-white border-2 border-[#2C2523] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AnimatedSkinnedAvatar
                        avatarId={currentUser.avatar || 'kitsune'}
                        customPhotoUrl={currentUser.customPhotoUrl}
                        skinId={currentUser.equippedSkin}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#2C2523] truncate">
                            @{currentUser.username}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#DEF7EC] border border-[#2C2523] text-[10px] font-bold text-[#03543F]">
                            You · Online
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B5E58] truncate mt-0.5">
                          Skin: {getSkinName(currentUser.equippedSkin)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl border-2 border-[#2C2523] text-[11px] font-black uppercase shrink-0 ${
                        myReadyIn2v2
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#F3EFE6] text-[#6B5E58]'
                      }`}
                    >
                      {myReadyIn2v2 ? 'Ready ✓' : 'Not Ready'}
                    </span>
                  </div>

                  {/* Member 2: Paired Partner (Unrelated Users Never Allowed) */}
                  <div className="p-3.5 rounded-2xl bg-white border-2 border-[#2C2523] flex items-center justify-between gap-3">
                    {pairedPartner ? (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <AnimatedSkinnedAvatar
                            avatarId={pairedPartner.avatar || 'star-cat'}
                            customPhotoUrl={pairedPartner.customPhotoUrl}
                            skinId={pairedPartner.equippedSkin}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-[#2C2523] truncate">
                                @{pairedPartner.username}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border border-[#2C2523] text-[10px] font-bold ${
                                  pairedPartner.isOnline
                                    ? 'bg-[#DEF7EC] text-[#03543F]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pairedPartner.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B5E58] truncate mt-0.5">
                              Skin: {getSkinName(pairedPartner.equippedSkin)}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl border-2 border-[#2C2523] text-[11px] font-black uppercase shrink-0 ${
                            teamLobby?.partnerInviteStatus === 'accepted' &&
                            (teamLobby.hostUid === pairedPartner.uid
                              ? teamLobby.hostReady
                              : teamLobby.partnerReady)
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : 'bg-[#F3EFE6] text-[#6B5E58]'
                          }`}
                        >
                          {teamLobby?.partnerInviteStatus === 'accepted'
                            ? (
                                teamLobby.hostUid === pairedPartner.uid
                                  ? teamLobby.hostReady
                                  : teamLobby.partnerReady
                              )
                              ? 'Ready ✓'
                              : 'Not Ready'
                            : teamLobby?.partnerInviteStatus === 'pending'
                            ? 'Invited...'
                            : 'Not Joined'}
                        </span>
                      </>
                    ) : (
                      <div className="text-xs font-bold text-[#6B5E58]">
                        No Paired Partner Found (Pair in Profile & Couple first)
                      </div>
                    )}
                  </div>
                </div>

                {/* Ranked Shield Card Pre-Equip Bar in 2v2 Lobby */}
                {(() => {
                  const myLobbyProfile =
                    teamLobby?.hostUid === currentUser.uid
                      ? teamLobby?.hostProfile
                      : teamLobby?.partnerUid === currentUser.uid
                      ? teamLobby?.partnerProfile
                      : null;
                  const myShieldCount =
                    myLobbyProfile?.shieldCards ?? currentUser.shieldCards ?? 0;
                  const myShieldArmed =
                    myLobbyProfile?.shieldCardArmed ??
                    Boolean(currentUser.shieldCardArmed);

                  return (
                    <div className="mt-4 rounded-2xl border-2 border-[#2C2523] bg-white p-3.5 shadow-[2px_2px_0px_#2C2523]">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#2C2523] bg-[#E0F2FE] text-lg">
                            🛡️
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
                                Ranked Shield Card (2v2 Loss XP Protection)
                              </span>
                              <span className="rounded-md border border-[#2C2523] bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] font-black text-[#92400E]">
                                Owned: {myShieldCount}
                              </span>
                              {myShieldArmed && (
                                <span className="rounded-md border border-[#2C2523] bg-[#DEF7EC] px-2 py-0.5 text-[10px] font-black uppercase text-[#03543F]">
                                  ARMED FOR NEXT LOSS ✓
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#6B5E58]">
                              Prevents your personal <strong>-25 XP penalty</strong> on your next 2v2 defeat. Consumed only when a 2v2 loss occurs (does not protect partner XP or couple trophies).
                            </p>
                          </div>
                        </div>

                        <div>
                          {confirmShieldPrompt !== null ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={togglingShieldCard}
                                onClick={() => handleToggleShieldCard(confirmShieldPrompt)}
                                className="rounded-xl border-2 border-[#2C2523] bg-[#03543F] px-3 py-1.5 text-xs font-bold text-white shadow-[2px_2px_0px_#2C2523] disabled:opacity-50"
                              >
                                {togglingShieldCard
                                  ? 'Updating...'
                                  : confirmShieldPrompt
                                  ? 'Confirm Pre-Equip'
                                  : 'Confirm Disarm'}
                              </button>
                              <button
                                type="button"
                                disabled={togglingShieldCard}
                                onClick={() => setConfirmShieldPrompt(null)}
                                className="rounded-xl border-2 border-[#2C2523] bg-white px-2.5 py-1.5 text-xs font-bold text-[#2C2523]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={(!myShieldArmed && myShieldCount <= 0) || togglingShieldCard}
                              onClick={() => setConfirmShieldPrompt(!myShieldArmed)}
                              className={`rounded-xl border-2 border-[#2C2523] px-3.5 py-2 text-xs font-bold shadow-[2px_2px_0px_#2C2523] transition-colors disabled:opacity-45 ${
                                myShieldArmed
                                  ? 'bg-[#DEF7EC] text-[#03543F] hover:bg-[#BCF0DA]'
                                  : 'bg-[#E0F2FE] text-[#1E429F] hover:bg-[#BAE6FD]'
                              }`}
                            >
                              {myShieldArmed
                                ? '🛡️ Shield Armed (Click to Disarm)'
                                : myShieldCount > 0
                                ? 'Pre-Equip Ranked Shield Card'
                                : '0 Shield Cards (Drop from Rare+ Chests)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Two Main 2v2 Actions Side-by-Side on the Same Screen */}
              <div
                data-gsap-modal-item
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* ACTION 1: INVITE PARTNER & TEAM READINESS */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE4E6] border border-[#2C2523] text-[10px] font-black uppercase text-[#E11D48]">
                        Step 1 · Invite Partner & Ready Up
                      </span>
                      <span className="text-xs font-bold text-[#6B5E58]">
                        Paired Partner Only
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#2C2523]">
                      Assemble Your Couple Team
                    </h4>
                    <p className="text-xs text-[#6B5E58]">
                      Invite your paired partner (@{pairedPartner?.username || 'partner'}) to join your 2v2 team for{' '}
                      <span className="font-bold text-[#2C2523]">
                        {selectedGame.title}
                      </span>
                      . Unrelated users cannot replace your paired partner.
                    </p>

                    {/* Partner Invitation Status Pill */}
                    <div className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#2C2523]">
                        Partner Invitation Status:
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md border border-[#2C2523] font-black uppercase text-[10px] ${
                          teamLobby?.partnerInviteStatus === 'accepted'
                            ? 'bg-[#DEF7EC] text-[#03543F]'
                            : teamLobby?.partnerInviteStatus === 'pending'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : teamLobby?.partnerInviteStatus === 'declined'
                            ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {teamLobby?.partnerInviteStatus || 'none'}
                      </span>
                    </div>

                    {/* If current user is the invited partner and invite is pending, allow accepting directly */}
                    {teamLobby?.partnerInviteStatus === 'pending' &&
                      teamLobby.partnerUid === currentUser.uid && (
                        <div className="p-3 rounded-xl bg-[#E3E8FF] border-2 border-[#2C2523] space-y-2">
                          <div className="text-xs font-bold text-[#2C2523]">
                            @{teamLobby.hostProfile.username} invited you to the 2v2 team!
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={respondingPartner2v2}
                              onClick={() => handleRespondPartner2v2(true)}
                              className="flex-1 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-bold border-2 border-[#2C2523]"
                            >
                              Accept Team Invite
                            </button>
                            <button
                              type="button"
                              disabled={respondingPartner2v2}
                              onClick={() => handleRespondPartner2v2(false)}
                              className="px-3 py-2 rounded-xl bg-white text-[#9B1C1C] text-xs font-bold border-2 border-[#2C2523]"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      disabled={
                        !pairedPartner ||
                        invitingPartner2v2 ||
                        Boolean(queueEntry && queueEntry.status === 'searching')
                      }
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleInvitePartner2v2();
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#3B4CCA] hover:bg-[#2F3EA8] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {invitingPartner2v2 ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {teamLobby?.partnerInviteStatus === 'pending'
                        ? `Resend Team Invite to @${pairedPartner?.username || 'Partner'}`
                        : teamLobby?.partnerInviteStatus === 'accepted'
                        ? `Partner Joined (@${pairedPartner?.username}) · Re-Invite`
                        : `Invite Partner (@${pairedPartner?.username || 'Partner'})`}
                    </button>

                    {/* Click Ready Button (Unlocks after Partner Accepts) */}
                    <button
                      type="button"
                      disabled={
                        teamLobby?.partnerInviteStatus !== 'accepted' ||
                        togglingReady2v2 ||
                        Boolean(queueEntry && queueEntry.status === 'searching')
                      }
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleToggleReady2v2();
                      }}
                      className={`w-full py-3 rounded-xl font-bold text-xs border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2 transition-colors disabled:opacity-45 ${
                        myReadyIn2v2
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#2C2523]'
                      }`}
                    >
                      {togglingReady2v2 ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {myReadyIn2v2
                        ? 'You Are Ready ✓ (Click to Unready)'
                        : 'Click Ready for 2v2 Matchmaking'}
                    </button>
                  </div>
                </div>

                {/* ACTION 2: FIND MATCH (2V2 TROPHY MATCHMAKING) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FEF3C7] border border-[#2C2523] text-[10px] font-black uppercase text-[#92400E]">
                        Step 2 · Find Match
                      </span>
                      <span className="text-xs font-bold text-[#6B5E58]">
                        Trophy-Based Queue
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#2C2523]">
                      2v2 Couple Matchmaking
                    </h4>

                    {/* Pre-Matchmaking Checklist */}
                    <div className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">1. Both Partners Online</span>
                        {teamLobby?.bothOnline ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">
                          2. Partner Accepted Team Invite
                        </span>
                        {teamLobby?.partnerInviteStatus === 'accepted' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">
                          3. Both Partners Clicked Ready
                        </span>
                        {teamLobby?.hostReady && teamLobby?.partnerReady ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                    </div>

                    {/* Live Queue Status / Search Duration / Trophy Range */}
                    {queueEntry &&
                    (queueEntry.status === 'searching' ||
                      queueEntry.status === 'match_found' ||
                      queueEntry.status === 'match_starting') ? (
                      <div className="p-3.5 rounded-2xl bg-[#E3E8FF] border-2 border-[#2C2523] space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-[#2C2523]">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B4CCA]" />
                            {queueEntry.status === 'searching'
                              ? 'Searching for Eligible Couple...'
                              : 'Match Found! Launching Game...'}
                          </span>
                          <span className="font-mono">
                            {Math.floor((queueEntry.waitSeconds || 0) / 60)}:
                            {String((queueEntry.waitSeconds || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#2C2523] flex items-center justify-between">
                          <span>Acceptable Trophy Range:</span>
                          <span className="font-bold">
                            ±{queueEntry.allowedTrophyRange || 150} 🏆
                          </span>
                        </div>
                        {queueEntry.opponentCoupleName && (
                          <div className="p-2 rounded-lg bg-[#DEF7EC] border border-[#2C2523] text-xs font-bold text-[#03543F]">
                            Matched vs {queueEntry.opponentCoupleName}!
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#6B5E58]">
                        Matches your couple against another online couple with similar Couple Trophies (range expands every 10s). Never matches against simulated bots.
                      </p>
                    )}
                  </div>

                  <div>
                    {queueEntry && queueEntry.status === 'searching' ? (
                      <button
                        type="button"
                        disabled={cancellingMatch}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleCancel2v2Matchmaking();
                        }}
                        className="w-full py-3 rounded-xl bg-[#FDE8E8] hover:bg-[#FBD5D5] text-[#9B1C1C] font-bold text-xs border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2"
                      >
                        {cancellingMatch ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Cancel Matchmaking
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canFind2v2Match || enqueuingMatch}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleFind2v2Match();
                        }}
                        className="w-full py-3 rounded-xl bg-[#D96B43] hover:bg-[#C25934] text-white font-bold text-sm border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-45"
                      >
                        {enqueuingMatch ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Swords className="w-4 h-4" />
                        )}
                        {canFind2v2Match
                          ? `Find 2v2 Match (${selectedGame.title})`
                          : 'Waiting for Partner Acceptance & Both Ready...'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
