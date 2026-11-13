'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  Check,
  X,
  Trash2,
  CheckCheck,
  RefreshCw,
  Swords,
  Users,
  PartyPopper,
  HeartHandshake,
  DoorOpen,
  Sparkles,
  Send,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { AnimatedSkinnedAvatar } from './CosmeticAvatarAndBanner';
import { PlayerProfile } from './AuthModal';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { MultiplayerRoomState, parseRawDatabaseRoom } from './VoiceAndLobbyDock';
import { ALL_ARCADE_GAMES } from '@/src/lib/arcade-data';
import { ArcadeInlineSpinner } from './ArcadeLoader';
import { soundFX } from '@/src/lib/sound';
import { ArcadeNavSection } from './ArcadeSidebar';

export type MailboxFilterTab =
  | 'all'
  | 'unread'
  | 'game_invitations'
  | 'couple_requests'
  | 'room_invitations';

export interface MailboxItemRecord {
  id: number;
  inviteCode: string;
  inviteType: string;
  mailboxFilter: 'game_invitations' | 'couple_requests' | 'room_invitations' | 'other';
  senderUid: string;
  senderUsername: string;
  senderAvatar: string;
  senderEquippedSkin: string;
  senderCustomPhotoUrl: string;
  senderCoupleId: number;
  senderCoupleName: string;
  targetUid: string;
  targetUsername: string;
  targetCoupleId: number;
  targetCoupleName: string;
  gameId: string;
  roomCode: string;
  status: string;
  isRead: boolean;
  isDismissed: boolean;
  isIncoming: boolean;
  metadata: Record<string, unknown>;
  roomSummary: {
    roomCode: string;
    gameId: string;
    mode: string;
    visibility: string;
    hostName: string;
    status: string;
    playerCount: number;
    maxPlayers: number;
    coupleCount: number;
    availableSlots: number;
  } | null;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MailboxStatePayload {
  items: MailboxItemRecord[];
  unreadCount: number;
}

interface UniversalMailboxPanelProps {
  currentUser: PlayerProfile;
  activeCouple: EnrichedCouplePairing | null;
  activeRoom: MultiplayerRoomState | null;
  mailbox: MailboxStatePayload;
  authFetcher: (url: string, options?: RequestInit) => Promise<Response>;
  onMailboxUpdated: (nextMailbox: MailboxStatePayload) => void;
  onRefreshBootstrap: () => Promise<void> | void;
  onAcceptedNavigate: (payload: {
    targetSection: ArcadeNavSection;
    room?: MultiplayerRoomState | null;
    gameId?: string;
    mode?: '1v1' | '2v2' | 'party';
  }) => void;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getRequestTypeMeta(inviteType: string): {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (inviteType) {
    case '1v1':
      return {
        label: '1v1 Partner Challenge',
        badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
        icon: Swords,
      };
    case '2v2_partner_team':
      return {
        label: '2v2 Partner Team Invite',
        badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
        icon: Users,
      };
    case '2v2':
    case '2v2_room':
      return {
        label: '2v2 Couple Room Invite',
        badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
        icon: Users,
      };
    case 'party':
      return {
        label: 'Party Game Invitation (3–10 Couples)',
        badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-200',
        icon: PartyPopper,
      };
    case 'room_invite':
      return {
        label: 'Direct Room Invitation',
        badgeClass: 'border-teal-500/40 bg-teal-500/15 text-teal-200',
        icon: DoorOpen,
      };
    case 'couple_request':
      return {
        label: 'Couple Account Pairing Request',
        badgeClass: 'border-pink-500/40 bg-pink-500/15 text-pink-200',
        icon: HeartHandshake,
      };
    default:
      return {
        label: 'Arcade Request',
        badgeClass: 'border-stone-700 bg-stone-800 text-stone-200',
        icon: Sparkles,
      };
  }
}

export function UniversalMailboxPanel({
  currentUser,
  activeCouple,
  activeRoom,
  mailbox,
  authFetcher,
  onMailboxUpdated,
  onRefreshBootstrap,
  onAcceptedNavigate,
}: UniversalMailboxPanelProps) {
  const [activeFilter, setActiveFilter] = useState<MailboxFilterTab>('all');
  const [directionView, setDirectionView] = useState<'incoming' | 'sent'>('incoming');
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Quick-Send Request state
  const [coupleTargetUsername, setCoupleTargetUsername] = useState<string>('');
  const [roomInviteUsername, setRoomInviteUsername] = useState<string>('');
  const [roomInviteCode, setRoomInviteCode] = useState<string>(activeRoom?.roomCode || '');
  const [selectedQuickGameId, setSelectedQuickGameId] = useState<string>('chess');
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);

  useEffect(() => {
    if (activeRoom?.roomCode) {
      Promise.resolve().then(() => {
        setRoomInviteCode(activeRoom.roomCode);
      });
    }
  }, [activeRoom?.roomCode]);

  const refreshMailbox = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_mailbox' }),
      });
      const data = await res.json();
      if (res.ok && data.mailbox) {
        onMailboxUpdated(data.mailbox);
      }
    } catch {
      // Ignore transient error
    } finally {
      setIsRefreshing(false);
    }
  }, [authFetcher, onMailboxUpdated]);

  // Real-time Mailbox polling every 5 seconds while open
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMailbox();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshMailbox]);

  const incomingItems = mailbox.items.filter((i) => i.isIncoming);
  const sentItems = mailbox.items.filter((i) => !i.isIncoming);

  const filteredItems = (directionView === 'incoming' ? incomingItems : sentItems).filter(
    (item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unread') return !item.isRead && item.isIncoming;
      if (activeFilter === 'game_invitations') {
        return item.mailboxFilter === 'game_invitations';
      }
      if (activeFilter === 'couple_requests') {
        return item.mailboxFilter === 'couple_requests';
      }
      if (activeFilter === 'room_invitations') {
        return item.mailboxFilter === 'room_invitations';
      }
      return true;
    }
  );

  async function handleMarkRead(invitationIds?: number[], markAll = false) {
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_mailbox_read',
          invitationIds,
          markAll,
        }),
      });
      const data = await res.json();
      if (res.ok && data.mailbox) {
        onMailboxUpdated(data.mailbox);
        soundFX.playMove();
      }
    } catch {
      // Ignore
    }
  }

  async function handleDismiss(invitationIds?: number[], dismissCompletedAndExpired = false) {
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss_mailbox_items',
          invitationIds,
          dismissCompletedAndExpired,
        }),
      });
      const data = await res.json();
      if (res.ok && data.mailbox) {
        onMailboxUpdated(data.mailbox);
        soundFX.playMove();
      }
    } catch {
      // Ignore
    }
  }

  async function handleCancelSentInvite(invitationId: number) {
    setBusyItemId(invitationId);
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
        setStatusBanner({
          type: 'error',
          text: data.error || 'Could not cancel request.',
        });
        soundFX.playError();
        return;
      }
      setStatusBanner({
        type: 'success',
        text: 'Cancelled outgoing invitation.',
      });
      soundFX.playMove();
      await refreshMailbox();
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Network error while cancelling invitation.',
      });
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRespondItem(item: MailboxItemRecord, accept: boolean) {
    setBusyItemId(item.id);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_mailbox_item',
          invitationId: item.id,
          accept,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({
          type: 'error',
          text: data.error || 'Could not process this request.',
        });
        soundFX.playError();
        await refreshMailbox();
        return;
      }

      if (data.mailbox) {
        onMailboxUpdated(data.mailbox);
      } else {
        await refreshMailbox();
      }
      await onRefreshBootstrap();

      if (!accept) {
        setStatusBanner({
          type: 'success',
          text: `Declined ${getRequestTypeMeta(item.inviteType).label} from @${item.senderUsername}.`,
        });
        soundFX.playMove();
        return;
      }

      soundFX.playSuccess();
      const targetSec = (data.targetSection || 'mp-1v1') as ArcadeNavSection;
      const parsedRoom = data.room ? parseRawDatabaseRoom(data.room) : null;
      const resolvedMode: '1v1' | '2v2' | 'party' =
        parsedRoom?.mode === 'party' || item.inviteType === 'party'
          ? 'party'
          : parsedRoom?.mode === '2v2' ||
            item.inviteType === '2v2' ||
            item.inviteType === '2v2_room' ||
            item.inviteType === '2v2_partner_team'
          ? '2v2'
          : '1v1';

      setStatusBanner({
        type: 'success',
        text: `Accepted ${getRequestTypeMeta(item.inviteType).label}! Opening active destination...`,
      });

      onAcceptedNavigate({
        targetSection: targetSec,
        room: parsedRoom,
        gameId: parsedRoom?.gameId || item.gameId || undefined,
        mode: resolvedMode,
      });
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Network error while responding to request.',
      });
      soundFX.playError();
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleSendCouplePairingRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!coupleTargetUsername.trim()) return;
    setIsSendingRequest(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_couple_pairing_request',
          targetUsername: coupleTargetUsername.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({
          type: 'error',
          text: data.error || 'Could not send couple pairing request.',
        });
        soundFX.playError();
        return;
      }
      setCoupleTargetUsername('');
      setStatusBanner({
        type: 'success',
        text: 'Couple Pairing Request delivered to their Mailbox!',
      });
      soundFX.playSuccess();
      await refreshMailbox();
      await onRefreshBootstrap();
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Network error while sending couple pairing request.',
      });
    } finally {
      setIsSendingRequest(false);
    }
  }

  async function handleQuickPartnerInvite(type: '1v1' | '2v2_team') {
    setIsSendingRequest(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === '1v1'
            ? {
                action: 'send_game_invitation',
                inviteType: '1v1',
                gameId: selectedQuickGameId,
              }
            : {
                action: 'invite_partner_2v2_team',
                gameId: selectedQuickGameId,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({
          type: 'error',
          text: data.error || 'Could not send invitation to your partner.',
        });
        soundFX.playError();
        return;
      }
      setStatusBanner({
        type: 'success',
        text:
          type === '1v1'
            ? 'Sent 1v1 Challenge Request to your paired partner’s Mailbox!'
            : 'Sent 2v2 Team Invitation to your paired partner’s Mailbox!',
      });
      soundFX.playSuccess();
      await refreshMailbox();
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Network error while sending partner invitation.',
      });
    } finally {
      setIsSendingRequest(false);
    }
  }

  async function handleSendDirectRoomInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!roomInviteCode.trim() || !roomInviteUsername.trim()) return;
    setIsSendingRequest(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_room_or_party_invite',
          roomCode: roomInviteCode.trim().toUpperCase(),
          targetUsername: roomInviteUsername.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusBanner({
          type: 'error',
          text: data.error || 'Could not send room invitation.',
        });
        soundFX.playError();
        return;
      }
      setRoomInviteUsername('');
      setStatusBanner({
        type: 'success',
        text: `Room #${roomInviteCode.trim().toUpperCase()} invitation delivered to their Mailbox!`,
      });
      soundFX.playSuccess();
      await refreshMailbox();
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Network error while sending room invitation.',
      });
    } finally {
      setIsSendingRequest(false);
    }
  }

  const pairedPartner = activeCouple
    ? activeCouple.requesterUid === currentUser.uid
      ? activeCouple.partnerProfile
      : activeCouple.requesterProfile
    : null;

  const filterCounts = {
    all: incomingItems.length,
    unread: incomingItems.filter((i) => !i.isRead).length,
    game_invitations: incomingItems.filter((i) => i.mailboxFilter === 'game_invitations').length,
    couple_requests: incomingItems.filter((i) => i.mailboxFilter === 'couple_requests').length,
    room_invitations: incomingItems.filter((i) => i.mailboxFilter === 'room_invitations').length,
  };

  return (
    <div className="space-y-6">
      {/* Mailbox Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Mail className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-stone-100">
              Universal Mailbox
            </h1>
            {mailbox.unreadCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                {mailbox.unreadCount} Unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Receive and manage 1v1 partner challenges, 2v2 team invites, 2v2 couple room invites, Party Game invites, direct room codes, and Couple Pairing requests in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkRead(undefined, true)}
            disabled={mailbox.unreadCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500/60 disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Mark All Read</span>
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(undefined, true)}
            className="flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-rose-500/60"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>Clear Completed / Expired</span>
          </button>

          <button
            type="button"
            onClick={refreshMailbox}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500/60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-xs font-semibold ${
            statusBanner.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick Dispatch Bar: Send Partner Invites, Room Invites, or Couple Pairing Requests */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-stone-800 bg-stone-900/80 p-4 lg:grid-cols-12">
        {/* Left: Partner 1v1 / 2v2 Team Quick Dispatch OR Couple Pairing Request */}
        <div className="space-y-2.5 lg:col-span-6">
          {activeCouple && pairedPartner ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-100">
                  Quick Partner Invite · @{pairedPartner.username}
                </span>
                <span className="font-mono text-[11px] text-emerald-300">
                  {pairedPartner.presenceStatus === 'online'
                    ? '● Online'
                    : pairedPartner.presenceStatus === 'in_match'
                    ? '● In Match'
                    : '○ Offline'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedQuickGameId}
                  onChange={(e) => setSelectedQuickGameId(e.target.value)}
                  aria-label="Select game for partner invite"
                  className="rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  {ALL_ARCADE_GAMES.filter((g) => g.collection === 'multiplayer').map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} {g.supports2v2 ? '(1v1 & 2v2)' : '(1v1 Only)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isSendingRequest}
                  onClick={() => handleQuickPartnerInvite('1v1')}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>Challenge 1v1</span>
                </button>
                <button
                  type="button"
                  disabled={isSendingRequest}
                  onClick={() => handleQuickPartnerInvite('2v2_team')}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Invite to 2v2 Team</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSendCouplePairingRequest} className="space-y-2">
              <div className="text-xs font-bold text-stone-100">
                Send Couple Pairing Request by @username
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={coupleTargetUsername}
                  onChange={(e) => setCoupleTargetUsername(e.target.value)}
                  placeholder="Enter partner's @username..."
                  className="flex-1 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSendingRequest || !coupleTargetUsername.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 disabled:opacity-50"
                >
                  <HeartHandshake className="h-3.5 w-3.5" />
                  <span>Send Pairing Request</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right: Send Direct Room / Party / 2v2 Room Invite by @username */}
        <form
          onSubmit={handleSendDirectRoomInvite}
          className="space-y-2 border-t border-stone-800 pt-3 lg:col-span-6 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-100">
              Send Room or Party Invitation to Player / Couple
            </span>
            {activeRoom && (
              <span className="font-mono text-[11px] text-teal-300">
                Active Room #{activeRoom.roomCode}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={roomInviteCode}
              onChange={(e) => setRoomInviteCode(e.target.value.toUpperCase())}
              placeholder="Room Code (e.g. AB12CD)"
              className="w-32 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 font-mono text-xs uppercase text-stone-100 focus:border-teal-500 focus:outline-none"
            />
            <input
              type="text"
              value={roomInviteUsername}
              onChange={(e) => setRoomInviteUsername(e.target.value)}
              placeholder="Recipient @username..."
              className="min-w-[160px] flex-1 rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSendingRequest || !roomInviteCode.trim() || !roomInviteUsername.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-teal-400 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Room Invite</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar + Incoming vs Sent Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Mailbox Category Filters"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-800 bg-stone-900/95 p-1.5"
        >
          {(
            [
              { id: 'all', label: 'All', count: filterCounts.all },
              { id: 'unread', label: 'Unread', count: filterCounts.unread },
              {
                id: 'game_invitations',
                label: 'Game Invitations',
                count: filterCounts.game_invitations,
              },
              {
                id: 'couple_requests',
                label: 'Couple Requests',
                count: filterCounts.couple_requests,
              },
              {
                id: 'room_invitations',
                label: 'Room Invitations',
                count: filterCounts.room_invitations,
              },
            ] as const
          ).map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => {
                  soundFX.playMove();
                  setActiveFilter(tab.id);
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    active ? 'text-stone-950' : 'text-stone-400'
                  }`}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-900 p-1">
          <button
            type="button"
            onClick={() => setDirectionView('incoming')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              directionView === 'incoming'
                ? 'bg-stone-100 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            Incoming ({incomingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setDirectionView('sent')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              directionView === 'sent'
                ? 'bg-stone-100 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            Sent ({sentItems.length})
          </button>
        </div>
      </div>

      {/* Notification Cards List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-stone-900/70 p-10 text-center">
          <MailOpen className="h-10 w-10 text-stone-500" />
          <h2 className="mt-3 text-base font-bold text-stone-200">
            {directionView === 'incoming'
              ? 'No notifications in this Mailbox filter'
              : 'No outgoing requests in this filter'}
          </h2>
          <p className="mt-1 max-w-md text-xs text-stone-400">
            {activeFilter === 'unread'
              ? 'You are all caught up! All incoming invitations and requests have been read.'
              : 'Incoming 1v1 partner challenges, 2v2 team invites, 2v2 room invites, Party Game invites, direct room codes, and Couple Pairing requests will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const meta = getRequestTypeMeta(item.inviteType);
            const TypeIcon = meta.icon;
            const gameDef = ALL_ARCADE_GAMES.find((g) => g.id === item.gameId);
            const isPending = item.status === 'pending';
            const isBusy = busyItemId === item.id;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center ${
                  !item.isRead && item.isIncoming
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-stone-800 bg-stone-900/90'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <AnimatedSkinnedAvatar
                      avatarId={item.senderAvatar || 'kitsune'}
                      customPhotoUrl={item.senderCustomPhotoUrl || ''}
                      skinId={item.senderEquippedSkin || 'skin-classic-notebook'}
                      size="md"
                    />
                    {!item.isRead && item.isIncoming && (
                      <span
                        title="Unread notification"
                        className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-stone-950"
                      />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                      >
                        <TypeIcon className="h-3 w-3" />
                        <span>{meta.label}</span>
                      </span>

                      <span className="text-xs font-bold text-stone-100">
                        {item.isIncoming
                          ? `From @${item.senderUsername}`
                          : `To @${item.targetUsername || item.targetCoupleName || 'Partner'}`}
                      </span>

                      {item.senderCoupleName && (
                        <span className="text-xs font-semibold text-rose-300">
                          · ♥ {item.senderCoupleName}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-stone-400">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* Contextual Game / Room / Party / Couple Details */}
                    <div className="text-xs text-stone-300">
                      {item.inviteType === 'couple_request' ? (
                        <span>
                          <strong>@{item.senderUsername}</strong> invited you to pair accounts as an official Couple in Her Little Arcade.
                          {item.metadata?.pairingCode
                            ? ` (Pairing Code: #${String(item.metadata.pairingCode)})`
                            : ''}
                        </span>
                      ) : item.inviteType === '2v2_partner_team' ? (
                        <span>
                          Your partner <strong>@{item.senderUsername}</strong> invited you to join your <strong>2v2 Couple Team Lobby</strong> for{' '}
                          <strong className="text-amber-300">
                            {gameDef?.title || item.gameId}
                          </strong>
                          .
                        </span>
                      ) : item.inviteType === '1v1' ? (
                        <span>
                          Your paired partner <strong>@{item.senderUsername}</strong> challenged you to a <strong>1v1 Duel</strong> in{' '}
                          <strong className="text-amber-300">
                            {gameDef?.title || item.gameId}
                          </strong>
                          .
                        </span>
                      ) : item.inviteType === 'party' ? (
                        <span>
                          Host couple{' '}
                          <strong className="text-rose-300">
                            {String(
                              item.metadata?.hostCoupleName ||
                                item.senderCoupleName ||
                                `@${item.senderUsername}`
                            )}
                          </strong>{' '}
                          invited your couple to play{' '}
                          <strong className="text-amber-300">
                            {gameDef?.title ||
                              String(item.metadata?.gameTitle || item.gameId)}
                          </strong>
                          .
                        </span>
                      ) : (
                        <span>
                          Invited to join{' '}
                          <strong className="text-amber-300">
                            {gameDef?.title ||
                              String(item.metadata?.gameTitle || item.gameId)}
                          </strong>{' '}
                          ({item.roomSummary?.mode?.toUpperCase() || 'MULTIPLAYER'})
                          {item.roomCode ? ` · Room #${item.roomCode}` : ''}.
                        </span>
                      )}
                    </div>

                    {/* Room / Party Live Slot Telemetry if applicable */}
                    {(item.roomSummary || item.roomCode) &&
                      item.inviteType !== 'couple_request' && (
                        <div className="flex flex-wrap items-center gap-3 pt-0.5 font-mono text-[11px] text-stone-400">
                          {item.roomCode && (
                            <span className="text-teal-300">Room #{item.roomCode}</span>
                          )}
                          {item.roomSummary && (
                            <>
                              <span>Host: @{item.roomSummary.hostName}</span>
                              <span>
                                Players: {item.roomSummary.playerCount}/
                                {item.roomSummary.maxPlayers}
                              </span>
                              {item.roomSummary.mode === 'party' && (
                                <span>
                                  Couples: {item.roomSummary.coupleCount}/10 (
                                  {Math.max(0, 10 - item.roomSummary.coupleCount)} couple slots open)
                                </span>
                              )}
                              <span>
                                Visibility: {item.roomSummary.visibility}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* Right Action Buttons / Status Badge */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!item.isRead && item.isIncoming && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead([item.id], false)}
                      title="Mark as read"
                      className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-[11px] font-semibold text-stone-300 hover:border-amber-500"
                    >
                      Mark Read
                    </button>
                  )}

                  {isPending && item.isIncoming ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRespondItem(item, true)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {isBusy ? (
                          <ArcadeInlineSpinner size={14} label="Joining..." />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRespondItem(item, false)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/15 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : isPending && !item.isIncoming ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-amber-300">
                        Pending Response
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleCancelSentInvite(item.id)}
                        className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:border-rose-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold uppercase ${
                          item.status === 'accepted'
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : item.status === 'declined'
                            ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                            : 'border-stone-700 bg-stone-800 text-stone-400'
                        }`}
                      >
                        {item.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDismiss([item.id], false)}
                        title="Dismiss notification"
                        className="rounded-lg border border-stone-800 bg-stone-950 p-1.5 text-stone-400 hover:border-rose-500/50 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
