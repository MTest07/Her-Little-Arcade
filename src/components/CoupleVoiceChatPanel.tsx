'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  HeartHandshake,
  Radio,
  ShieldCheck,
  Clock,
  AlertCircle,
  Maximize2,
} from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { AnimatedSkinnedAvatar } from './CosmeticAvatarAndBanner';
import { PlayerProfile } from './AuthModal';
import { EnrichedCouplePairing } from './CouplePairingPanel';
import { soundFX } from '@/src/lib/sound';

export interface CoupleVoiceCallRecord {
  id: number;
  callId: string;
  coupleId: number;
  callerUid: string;
  callerUsername: string;
  calleeUid: string;
  calleeUsername: string;
  status: 'ringing' | 'connecting' | 'connected' | 'declined' | 'missed' | 'ended';
  signaling: {
    offer?: RTCSessionDescriptionInit | null;
    answer?: RTCSessionDescriptionInit | null;
    callerCandidates?: RTCIceCandidateInit[];
    calleeCandidates?: RTCIceCandidateInit[];
    participantStates?: Record<
      string,
      {
        micMuted: boolean;
        speakerDeafened: boolean;
        speakingLevel: number;
        updatedAt: string;
      }
    >;
  };
  connectedAt?: string | null;
  endedAt?: string | null;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface CoupleVoiceChatState {
  paired: boolean;
  coupleId?: number;
  coupleName?: string;
  coupleBanner?: string;
  equippedCoupleSkin?: string;
  myProfile: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl: string;
    equippedSkin: string;
    equippedBanner: string;
    presenceStatus: string;
  } | null;
  partnerProfile: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl: string;
    equippedSkin: string;
    equippedBanner: string;
    presenceStatus: string;
  } | null;
  activeCall: CoupleVoiceCallRecord | null;
  recentCalls: CoupleVoiceCallRecord[];
  livekit: {
    configured: boolean;
    url: string | null;
  };
}

export interface CoupleVoiceController {
  voiceState: CoupleVoiceChatState | null;
  connectionStatus: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';
  isIncomingRinging: boolean;
  isOutgoingRinging: boolean;
  micMuted: boolean;
  speakerDeafened: boolean;
  partnerVolume: number;
  mySpeakingLevel: number;
  partnerSpeakingLevel: number;
  callDurationSec: number;
  permissionError: string | null;
  transportMode: 'livekit' | 'webrtc_p2p';
  startCall: () => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMicMute: () => void;
  toggleSpeakerDeafen: () => void;
  setPartnerVolume: (val: number) => void;
  clearPermissionError: () => void;
}

export function formatCallDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Top-level persistent hook so Couple Voice Call stays connected across
 * 1v1 Games, 2v2 Games, Party Games, and all other sections without ever
 * disconnecting on navigation or auto-starting without user consent.
 */
export function useCoupleVoiceCallController({
  currentUser,
  sessionToken,
  initialVoiceState,
  onVoiceAchievement,
}: {
  currentUser: PlayerProfile | null;
  sessionToken: string;
  initialVoiceState?: CoupleVoiceChatState | null;
  onVoiceAchievement?: () => void;
}): CoupleVoiceController {
  const [voiceState, setVoiceState] = useState<CoupleVoiceChatState | null>(
    initialVoiceState || null
  );
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [speakerDeafened, setSpeakerDeafened] = useState<boolean>(false);
  const [partnerVolume, setPartnerVolumeState] = useState<number>(85);
  const [mySpeakingLevel, setMySpeakingLevel] = useState<number>(0);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<'livekit' | 'webrtc_p2p'>('webrtc_p2p');

  // Hardware & WebRTC / LiveKit refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);
  const livekitRoomRef = useRef<Room | null>(null);
  const remoteAudioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const meterAnimRef = useRef<number | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const appliedCandidateCountRef = useRef<number>(0);
  const appliedAnswerRef = useRef<boolean>(false);

  const uid = currentUser?.uid || '';

  // Clean up all hardware audio tracks & peer connections
  const cleanupHardwareMedia = useCallback(() => {
    if (meterAnimRef.current) {
      cancelAnimationFrame(meterAnimRef.current);
      meterAnimRef.current = null;
    }
    if (livekitRoomRef.current) {
      try {
        livekitRoomRef.current.disconnect();
      } catch {
        // Ignore
      }
      livekitRoomRef.current = null;
    }
    if (peerConnRef.current) {
      try {
        peerConnRef.current.close();
      } catch {
        // Ignore
      }
      peerConnRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      localStreamRef.current = null;
    }
    if (remoteAudioElRef.current) {
      remoteAudioElRef.current.srcObject = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignore
      }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    gainNodeRef.current = null;
    appliedCandidateCountRef.current = 0;
    appliedAnswerRef.current = false;
    setMySpeakingLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupHardwareMedia();
    };
  }, [cleanupHardwareMedia]);

  // Attach a hidden <audio> element for remote partner voice output
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const audio = document.createElement('audio');
    audio.autoplay = true;
    remoteAudioElRef.current = audio;
    return () => {
      audio.pause();
      audio.srcObject = null;
      remoteAudioElRef.current = null;
    };
  }, []);

  // Poll server for Couple Voice Call state
  const fetchVoiceState = useCallback(async () => {
    if (!uid || !sessionToken) return;
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'get_couple_voice_state' }),
      });
      const data = await res.json();
      if (res.ok && data.coupleVoiceState) {
        setVoiceState(data.coupleVoiceState);
      }
    } catch {
      // Ignore transient error
    }
  }, [uid, sessionToken]);

  useEffect(() => {
    if (!uid || !sessionToken) return;
    const timer = setTimeout(() => {
      fetchVoiceState();
    }, 80);
    const interval = setInterval(() => {
      fetchVoiceState();
    }, 2800);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [uid, sessionToken, fetchVoiceState]);

  // Request microphone explicitly only on user-initiated Start Call or Accept Call
  const acquireMicrophoneStream = useCallback(async (): Promise<MediaStream | null> => {
    setPermissionError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setPermissionError(
        'Microphone capture is not supported by this browser or device.'
      );
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;

      // Setup Web Audio API analyser for real-time speaking indicator
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tickMeter = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i += 1) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.round((avg / 95) * 100));
          setMySpeakingLevel(normalized);
          meterAnimRef.current = requestAnimationFrame(tickMeter);
        };
        meterAnimRef.current = requestAnimationFrame(tickMeter);
      }

      return stream;
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setPermissionError(
          'Microphone permission was denied. Please allow microphone access in your browser address bar to join Couple Voice Chat.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setPermissionError(
          'No microphone was detected on your device. Connect a headset or microphone and try again.'
        );
      } else {
        setPermissionError(
          err instanceof Error
            ? err.message
            : 'Unable to access microphone. Please check your audio settings.'
        );
      }
      return null;
    }
  }, []);

  // Initialize WebRTC or LiveKit transport for an active call
  const setupCallTransport = useCallback(
    async (
      call: CoupleVoiceCallRecord,
      role: 'caller' | 'callee',
      stream: MediaStream
    ) => {
      activeCallIdRef.current = call.callId;

      // 1. Check if LiveKit server credentials are configured
      try {
        const tokenRes = await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ action: 'issue_couple_livekit_token' }),
        });
        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.mode === 'livekit' && tokenData.token && tokenData.livekitUrl) {
          setTransportMode('livekit');
          const lkRoom = new Room({
            adaptiveStream: true,
            dynacast: true,
          });
          livekitRoomRef.current = lkRoom;

          lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Audio && remoteAudioElRef.current) {
              track.attach(remoteAudioElRef.current);
            }
          });

          await lkRoom.connect(tokenData.livekitUrl, tokenData.token);
          await lkRoom.localParticipant.setMicrophoneEnabled(true);
          return;
        }
      } catch {
        // Fallback seamlessly to direct WebRTC P2P signaling
      }

      // 2. WebRTC RTCPeerConnection P2P Audio with Server SDP/ICE Relay
      setTransportMode('webrtc_p2p');
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream && remoteAudioElRef.current) {
          remoteAudioElRef.current.srcObject = remoteStream;
          remoteAudioElRef.current.volume = speakerDeafened
            ? 0
            : Math.max(0, Math.min(1, partnerVolume / 100));
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && activeCallIdRef.current) {
          try {
            await fetch('/api/arcade', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`,
              },
              body: JSON.stringify({
                action: 'sync_couple_voice_signaling',
                callId: activeCallIdRef.current,
                iceCandidate: event.candidate.toJSON(),
              }),
            });
          } catch {
            // Ignore
          }
        }
      };

      if (role === 'caller') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'sync_couple_voice_signaling',
            callId: call.callId,
            offer,
          }),
        });
      } else if (role === 'callee' && call.signaling?.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.signaling.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch('/api/arcade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            action: 'sync_couple_voice_signaling',
            callId: call.callId,
            answer,
          }),
        });
      }
    },
    [sessionToken, speakerDeafened, partnerVolume]
  );

  // Sync incoming WebRTC SDP answer & ICE candidates when activeCall updates
  const activeCall = voiceState?.activeCall || null;

  useEffect(() => {
    if (!activeCall) {
      if (activeCallIdRef.current) {
        activeCallIdRef.current = null;
        Promise.resolve().then(() => {
          cleanupHardwareMedia();
          setCallDurationSec(0);
        });
      }
      return;
    }

    const pc = peerConnRef.current;
    if (!pc) return;

    const isCaller = activeCall.callerUid === uid;
    (async () => {
      try {
        if (
          isCaller &&
          activeCall.signaling?.answer &&
          !appliedAnswerRef.current &&
          pc.signalingState === 'have-local-offer'
        ) {
          appliedAnswerRef.current = true;
          await pc.setRemoteDescription(
            new RTCSessionDescription(activeCall.signaling.answer)
          );
        } else if (
          !isCaller &&
          activeCall.signaling?.offer &&
          pc.signalingState === 'stable' &&
          !pc.remoteDescription
        ) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(activeCall.signaling.offer)
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await fetch('/api/arcade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              action: 'sync_couple_voice_signaling',
              callId: activeCall.callId,
              answer,
            }),
          });
        }

        const remoteCandidates = isCaller
          ? activeCall.signaling?.calleeCandidates || []
          : activeCall.signaling?.callerCandidates || [];

        if (
          pc.remoteDescription &&
          remoteCandidates.length > appliedCandidateCountRef.current
        ) {
          for (
            let i = appliedCandidateCountRef.current;
            i < remoteCandidates.length;
            i += 1
          ) {
            await pc.addIceCandidate(new RTCIceCandidate(remoteCandidates[i]));
          }
          appliedCandidateCountRef.current = remoteCandidates.length;
        }
      } catch {
        // Ignore transient WebRTC negotiation states
      }
    })();
  }, [activeCall, uid, sessionToken, cleanupHardwareMedia]);

  // Call Duration Timer when connected
  const connectedAtIso = activeCall?.connectedAt || null;
  const callStatus = activeCall?.status || null;

  useEffect(() => {
    if (callStatus !== 'connected' || !connectedAtIso) {
      Promise.resolve().then(() => setCallDurationSec(0));
      return;
    }
    const startMs = new Date(connectedAtIso).getTime();
    const updateClock = () => {
      if (Number.isNaN(startMs)) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setCallDurationSec(elapsed);
    };
    const initTimer = setTimeout(updateClock, 20);
    const interval = setInterval(updateClock, 1000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [callStatus, connectedAtIso]);

  // Periodically sync speaking level & mute/deafen state during connected call
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || !sessionToken) return;
    const interval = setInterval(() => {
      fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'sync_couple_voice_signaling',
          callId: activeCall.callId,
          micMuted,
          speakerDeafened,
          speakingLevel: micMuted ? 0 : mySpeakingLevel,
        }),
      }).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [activeCall, sessionToken, micMuted, speakerDeafened, mySpeakingLevel]);

  const startCall = useCallback(async () => {
    if (!uid || !sessionToken) return;
    const stream = await acquireMicrophoneStream();
    if (!stream) return;

    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ action: 'start_couple_voice_call' }),
      });
      const data = await res.json();
      if (!res.ok) {
        cleanupHardwareMedia();
        setPermissionError(data.error || 'Could not start Couple Voice Call.');
        soundFX.playError();
        return;
      }
      if (data.coupleVoiceState) {
        setVoiceState(data.coupleVoiceState);
        const call = data.coupleVoiceState.activeCall as CoupleVoiceCallRecord | null;
        if (call) {
          await setupCallTransport(
            call,
            call.callerUid === uid ? 'caller' : 'callee',
            stream
          );
          onVoiceAchievement?.();
          soundFX.playSuccess();
        }
      }
    } catch {
      cleanupHardwareMedia();
      setPermissionError('Network error while starting Couple Voice Call.');
    }
  }, [
    uid,
    sessionToken,
    acquireMicrophoneStream,
    cleanupHardwareMedia,
    setupCallTransport,
    onVoiceAchievement,
  ]);

  const acceptIncomingCall = useCallback(async () => {
    if (!activeCall || !sessionToken) return;
    const stream = await acquireMicrophoneStream();
    if (!stream) return;

    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'respond_couple_voice_call',
          callId: activeCall.callId,
          accept: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        cleanupHardwareMedia();
        setPermissionError(data.error || 'Could not accept incoming call.');
        soundFX.playError();
        return;
      }
      if (data.coupleVoiceState) {
        setVoiceState(data.coupleVoiceState);
        const updatedCall = data.coupleVoiceState
          .activeCall as CoupleVoiceCallRecord | null;
        if (updatedCall) {
          await setupCallTransport(updatedCall, 'callee', stream);
          onVoiceAchievement?.();
          soundFX.playSuccess();
        }
      }
    } catch {
      cleanupHardwareMedia();
      setPermissionError('Network error while accepting call.');
    }
  }, [
    activeCall,
    sessionToken,
    acquireMicrophoneStream,
    cleanupHardwareMedia,
    setupCallTransport,
    onVoiceAchievement,
  ]);

  const declineIncomingCall = useCallback(async () => {
    if (!activeCall || !sessionToken) return;
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'respond_couple_voice_call',
          callId: activeCall.callId,
          accept: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.coupleVoiceState) {
        setVoiceState(data.coupleVoiceState);
      }
      cleanupHardwareMedia();
      soundFX.playMove();
    } catch {
      // Ignore
    }
  }, [activeCall, sessionToken, cleanupHardwareMedia]);

  const activeCallId = activeCall?.callId;

  const endCall = useCallback(async () => {
    cleanupHardwareMedia();
    if (!sessionToken) return;
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'end_couple_voice_call',
          callId: activeCallId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.coupleVoiceState) {
        setVoiceState(data.coupleVoiceState);
      }
      soundFX.playMove();
    } catch {
      // Ignore
    }
  }, [cleanupHardwareMedia, sessionToken, activeCallId]);

  const toggleMicMute = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      if (livekitRoomRef.current) {
        livekitRoomRef.current.localParticipant
          .setMicrophoneEnabled(!next)
          .catch(() => {});
      }
      return next;
    });
    soundFX.playMove();
  }, []);

  const toggleSpeakerDeafen = useCallback(() => {
    setSpeakerDeafened((prev) => {
      const next = !prev;
      if (remoteAudioElRef.current) {
        remoteAudioElRef.current.muted = next;
        remoteAudioElRef.current.volume = next
          ? 0
          : Math.max(0, Math.min(1, partnerVolume / 100));
      }
      return next;
    });
    soundFX.playMove();
  }, [partnerVolume]);

  const setPartnerVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(100, val));
      setPartnerVolumeState(clamped);
      if (remoteAudioElRef.current && !speakerDeafened) {
        remoteAudioElRef.current.volume = clamped / 100;
      }
    },
    [speakerDeafened]
  );

  const connectionStatus: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' =
    !activeCall
      ? 'idle'
      : activeCall.status === 'ringing'
      ? 'ringing'
      : activeCall.status === 'connecting'
      ? 'connecting'
      : activeCall.status === 'connected'
      ? 'connected'
      : 'ended';

  const isIncomingRinging = Boolean(
    activeCall && activeCall.status === 'ringing' && activeCall.calleeUid === uid
  );
  const isOutgoingRinging = Boolean(
    activeCall && activeCall.status === 'ringing' && activeCall.callerUid === uid
  );

  const partnerUid = voiceState?.partnerProfile?.uid || '';
  const partnerRemoteState =
    (partnerUid && activeCall?.signaling?.participantStates?.[partnerUid]) || null;
  const partnerSpeakingLevel = partnerRemoteState?.speakingLevel || 0;

  return {
    voiceState,
    connectionStatus,
    isIncomingRinging,
    isOutgoingRinging,
    micMuted,
    speakerDeafened,
    partnerVolume,
    mySpeakingLevel,
    partnerSpeakingLevel,
    callDurationSec,
    permissionError,
    transportMode,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMicMute,
    toggleSpeakerDeafen,
    setPartnerVolume,
    clearPermissionError: () => setPermissionError(null),
  };
}

/**
 * Persistent Floating Couple Voice Call Bar displayed across 1v1, 2v2, Party Games,
 * and other arcade sections whenever a call is ringing or connected.
 */
export function FloatingCoupleCallBar({
  controller,
  isOnVoiceChatPage,
  onOpenCoupleVoicePage,
}: {
  controller: CoupleVoiceController;
  isOnVoiceChatPage: boolean;
  onOpenCoupleVoicePage: () => void;
}) {
  const {
    voiceState,
    connectionStatus,
    isIncomingRinging,
    isOutgoingRinging,
    micMuted,
    speakerDeafened,
    partnerVolume,
    mySpeakingLevel,
    partnerSpeakingLevel,
    callDurationSec,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMicMute,
    toggleSpeakerDeafen,
    setPartnerVolume,
  } = controller;

  if (connectionStatus === 'idle' || connectionStatus === 'ended') {
    return null;
  }

  // If already viewing the full Couple Voice Chat page and not incoming ringing, no duplicate bar needed
  if (isOnVoiceChatPage && !isIncomingRinging) {
    return null;
  }

  const partner = voiceState?.partnerProfile;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[94vw] rounded-2xl border border-rose-500/50 bg-stone-950/95 p-3.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {partner && (
            <div
              className={`rounded-full p-0.5 transition-shadow ${
                partnerSpeakingLevel > 15
                  ? 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : ''
              }`}
            >
              <AnimatedSkinnedAvatar
                avatarId={partner.avatar}
                customPhotoUrl={partner.customPhotoUrl}
                skinId={partner.equippedSkin}
                size="xs"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-bold text-stone-100">
                Couple Call · @{partner?.username || 'Partner'}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300 animate-pulse'
                }`}
              >
                {connectionStatus === 'connected'
                  ? formatCallDuration(callDurationSec)
                  : isIncomingRinging
                  ? 'Incoming'
                  : isOutgoingRinging
                  ? 'Ringing...'
                  : 'Connecting'}
              </span>
            </div>
            <div className="text-[11px] text-stone-400">
              {connectionStatus === 'connected'
                ? `Private Couple Channel · Mic ${micMuted ? 'Muted' : `${mySpeakingLevel}%`}`
                : isIncomingRinging
                ? `@${partner?.username} is calling you!`
                : `Calling @${partner?.username}...`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCoupleVoicePage}
          title="Open Couple Voice Chat"
          className="rounded-lg border border-stone-800 bg-stone-900 p-1.5 text-stone-300 hover:border-amber-500 hover:text-amber-300"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Controls */}
      {isIncomingRinging ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={acceptIncomingCall}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-stone-950 hover:bg-emerald-400"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Accept Call</span>
          </button>
          <button
            type="button"
            onClick={declineIncomingCall}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-500 py-2 text-xs font-bold text-white hover:bg-rose-400"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>Decline</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-800/80 pt-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMicMute}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                micMuted
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-500'
              }`}
            >
              {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span>{micMuted ? 'Muted' : 'Mic'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSpeakerDeafen}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                speakerDeafened
                  ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  : 'border-stone-700 bg-stone-900 text-stone-200 hover:border-amber-500'
              }`}
            >
              {speakerDeafened ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={speakerDeafened ? 0 : partnerVolume}
            onChange={(e) => setPartnerVolume(Number(e.target.value))}
            aria-label="Partner voice volume"
            className="h-1.5 w-20 accent-amber-500"
          />

          <button
            type="button"
            onClick={endCall}
            className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>End</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Full-page Couple Voice Chat view (Social -> Couple Voice Chat)
 */
export function CoupleVoiceChatPanel({
  currentUser,
  activeCouple,
  controller,
  onOpenCouplePairing,
  onNavigateToGameMode,
}: {
  currentUser: PlayerProfile;
  activeCouple: EnrichedCouplePairing | null;
  controller: CoupleVoiceController;
  onOpenCouplePairing: () => void;
  onNavigateToGameMode: (mode: 'mp-1v1' | 'mp-2v2' | 'mp-party') => void;
}) {
  const {
    voiceState,
    connectionStatus,
    isIncomingRinging,
    isOutgoingRinging,
    micMuted,
    speakerDeafened,
    partnerVolume,
    mySpeakingLevel,
    partnerSpeakingLevel,
    callDurationSec,
    permissionError,
    transportMode,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMicMute,
    toggleSpeakerDeafen,
    setPartnerVolume,
    clearPermissionError,
  } = controller;

  if (!activeCouple || !voiceState?.paired || !voiceState.partnerProfile) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-800 bg-stone-900/90 p-10 text-center">
        <HeartHandshake className="h-12 w-12 text-rose-400" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-100">
          Couple Voice Chat (Paired Partners Only)
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-300">
          Couple Voice Chat is a private, encrypted audio sanctuary reserved exclusively for you and your actively paired partner. Unpaired users or other couples can never join this channel.
        </p>
        <button
          type="button"
          onClick={onOpenCouplePairing}
          className="mt-6 flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-400"
        >
          <HeartHandshake className="h-4 w-4" />
          <span>Pair with Partner in Couple Profile</span>
        </button>
      </div>
    );
  }

  const me = voiceState.myProfile || {
    uid: currentUser.uid,
    username: currentUser.username,
    avatar: currentUser.avatar,
    customPhotoUrl: currentUser.customPhotoUrl || '',
    equippedSkin: currentUser.equippedSkin,
    equippedBanner: currentUser.equippedBanner,
    presenceStatus: 'online',
  };
  const partner = voiceState.partnerProfile;
  const activeCall = voiceState.activeCall;
  const partnerRemoteState =
    activeCall?.signaling?.participantStates?.[partner.uid] || null;

  const partnerStatusBadge =
    connectionStatus === 'connected'
      ? 'Connected in Call'
      : connectionStatus === 'ringing'
      ? 'Ringing...'
      : connectionStatus === 'connecting'
      ? 'Connecting...'
      : partner.presenceStatus === 'online'
      ? 'Online & Ready'
      : partner.presenceStatus === 'in_match'
      ? 'In Match (Online)'
      : 'Offline / Disconnected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Mic className="h-6 w-6 text-rose-400" />
            <h1 className="text-2xl font-bold tracking-tight text-stone-100">
              Couple Voice Chat
            </h1>
            <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-200">
              ♥ {voiceState.coupleName || activeCouple.coupleName}
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Dedicated private voice communication for you and @{partner.username}. Your call stays connected across 1v1 Games, 2v2 Games, and Party Games.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-stone-300">
            Private 2-Partner Channel ({transportMode === 'livekit' ? 'LiveKit SFU' : 'WebRTC P2P Audio'})
          </span>
        </div>
      </div>

      {permissionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{permissionError}</span>
          </div>
          <button
            type="button"
            onClick={clearPermissionError}
            className="text-stone-400 hover:text-stone-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Two-Partner Studio Stage */}
      <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-6">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
          {/* Partner 1: You */}
          <div className="flex flex-col items-center rounded-2xl border border-stone-800 bg-stone-950/90 p-5 text-center md:col-span-5">
            <div
              className={`rounded-full p-1 transition-all duration-150 ${
                connectionStatus === 'connected' && !micMuted && mySpeakingLevel > 14
                  ? 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)]'
                  : 'ring-1 ring-stone-700'
              }`}
            >
              <AnimatedSkinnedAvatar
                avatarId={me.avatar}
                customPhotoUrl={me.customPhotoUrl}
                skinId={me.equippedSkin}
                size="lg"
              />
            </div>

            <div className="mt-3 text-base font-bold text-stone-100">
              @{me.username} <span className="text-xs text-amber-300">(You)</span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                {connectionStatus === 'connected'
                  ? micMuted
                    ? 'Connected · Mic Muted'
                    : 'Connected · Live Audio'
                  : connectionStatus === 'ringing'
                  ? 'Ringing'
                  : 'Online'}
              </span>
            </div>

            {/* Live Mic Level Bar */}
            <div className="mt-3 w-full max-w-[200px]">
              <div className="flex items-center justify-between font-mono text-[10px] text-stone-400">
                <span>Your Microphone</span>
                <span>{micMuted ? 'Muted' : `${mySpeakingLevel}%`}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100"
                  style={{ width: `${micMuted ? 0 : mySpeakingLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center Call Status & Timer Bridge */}
          <div className="flex flex-col items-center justify-center space-y-3 text-center md:col-span-2">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                connectionStatus === 'connected'
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                  : connectionStatus === 'ringing'
                  ? 'border-amber-400 bg-amber-500/15 text-amber-300 animate-pulse'
                  : 'border-stone-700 bg-stone-950 text-stone-400'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Radio className="h-6 w-6" />
              ) : connectionStatus === 'ringing' ? (
                <PhoneIncoming className="h-6 w-6" />
              ) : (
                <PhoneCall className="h-6 w-6" />
              )}
            </div>

            <div className="font-mono text-lg font-bold text-stone-100 tabular-nums">
              {connectionStatus === 'connected'
                ? formatCallDuration(callDurationSec)
                : connectionStatus === 'ringing'
                ? 'RINGING'
                : 'READY'}
            </div>

            <div className="text-[11px] text-stone-400">
              {connectionStatus === 'connected'
                ? 'Active Couple Call'
                : isIncomingRinging
                ? `@${partner.username} is calling`
                : isOutgoingRinging
                ? `Calling @${partner.username}...`
                : 'Click Start Call below'}
            </div>
          </div>

          {/* Partner 2: Paired Partner */}
          <div className="flex flex-col items-center rounded-2xl border border-stone-800 bg-stone-950/90 p-5 text-center md:col-span-5">
            <div
              className={`rounded-full p-1 transition-all duration-150 ${
                connectionStatus === 'connected' &&
                !partnerRemoteState?.micMuted &&
                partnerSpeakingLevel > 14
                  ? 'ring-4 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.45)]'
                  : 'ring-1 ring-stone-700'
              }`}
            >
              <AnimatedSkinnedAvatar
                avatarId={partner.avatar}
                customPhotoUrl={partner.customPhotoUrl}
                skinId={partner.equippedSkin}
                size="lg"
              />
            </div>

            <div className="mt-3 text-base font-bold text-stone-100">
              @{partner.username}{' '}
              <span className="text-xs text-rose-300">(Paired Partner)</span>
            </div>

            <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-stone-300">
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected' ||
                  partner.presenceStatus === 'online' ||
                  partner.presenceStatus === 'in_match'
                    ? 'bg-emerald-400'
                    : 'bg-stone-500'
                }`}
              />
              <span>{partnerStatusBadge}</span>
            </div>

            {/* Partner Speaking & Volume Meter */}
            <div className="mt-3 w-full max-w-[200px]">
              <div className="flex items-center justify-between font-mono text-[10px] text-stone-400">
                <span>Partner Audio</span>
                <span>
                  {partnerRemoteState?.micMuted
                    ? 'Partner Muted'
                    : `${partnerSpeakingLevel}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full bg-rose-400 transition-all duration-100"
                  style={{
                    width: `${
                      partnerRemoteState?.micMuted ? 0 : partnerSpeakingLevel
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Control Deck */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-800 pt-5">
          {/* Left: Start / Accept / Decline / End Call */}
          <div className="flex flex-wrap items-center gap-3">
            {connectionStatus === 'idle' || connectionStatus === 'ended' ? (
              <button
                type="button"
                onClick={startCall}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-emerald-400"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Start Couple Voice Call</span>
              </button>
            ) : isIncomingRinging ? (
              <>
                <button
                  type="button"
                  onClick={acceptIncomingCall}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-emerald-400"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Accept Call from @{partner.username}</span>
                </button>
                <button
                  type="button"
                  onClick={declineIncomingCall}
                  className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-400"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>Decline Call</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={endCall}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-400"
              >
                <PhoneOff className="h-4 w-4" />
                <span>End Call</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleMicMute}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
                micMuted
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                  : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-amber-500'
              }`}
            >
              {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span>{micMuted ? 'Unmute Microphone' : 'Mute Microphone'}</span>
            </button>

            <button
              type="button"
              onClick={toggleSpeakerDeafen}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
                speakerDeafened
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                  : 'border-stone-700 bg-stone-950 text-stone-200 hover:border-amber-500'
              }`}
            >
              {speakerDeafened ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span>{speakerDeafened ? 'Undeafen Speaker' : 'Deafen Speaker'}</span>
            </button>
          </div>

          {/* Right: Individual Partner Volume Slider */}
          <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950 px-4 py-2">
            <Volume2 className="h-4 w-4 text-amber-400" />
            <div className="w-36">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300">
                <span>@{partner.username} Volume</span>
                <span className="font-mono text-amber-300">
                  {speakerDeafened ? '0%' : `${partnerVolume}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={speakerDeafened ? 0 : partnerVolume}
                onChange={(e) => setPartnerVolume(Number(e.target.value))}
                className="mt-1 h-1.5 w-full accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Play Together While on Call Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
        <div>
          <div className="text-sm font-bold text-stone-100">
            Play Together While Connected on Couple Voice Chat
          </div>
          <p className="text-xs text-stone-400">
            Your Couple Voice Call stays active as a floating bar when you switch to 1v1 Games, 2v2 Games, or Party Games.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToGameMode('mp-1v1')}
            className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
          >
            1v1 Games
          </button>
          <button
            type="button"
            onClick={() => onNavigateToGameMode('mp-2v2')}
            className="rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-400"
          >
            2v2 Games
          </button>
          <button
            type="button"
            onClick={() => onNavigateToGameMode('mp-party')}
            className="rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-stone-200 hover:border-amber-500"
          >
            Party Games
          </button>
        </div>
      </div>

      {/* Recent Couple Calls & Missed Calls Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-200">
            Recent Couple Calls &amp; Missed Calls
          </h2>
          <span className="font-mono text-xs text-stone-400">
            End-to-End Couple Call Log
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/80">
          {!voiceState.recentCalls || voiceState.recentCalls.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400">
              No voice calls recorded yet for your couple. Start a Couple Voice Call above anytime!
            </div>
          ) : (
            <div className="divide-y divide-stone-800/70">
              {voiceState.recentCalls.map((call) => {
                const isMissed =
                  call.status === 'missed' || call.status === 'declined';
                return (
                  <div
                    key={call.callId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      {isMissed ? (
                        <PhoneMissed className="h-4 w-4 text-rose-400" />
                      ) : (
                        <PhoneCall className="h-4 w-4 text-emerald-400" />
                      )}
                      <div>
                        <span className="font-bold text-stone-100">
                          @{call.callerUsername} → @{call.calleeUsername}
                        </span>
                        <span className="ml-2 font-mono text-[11px] text-stone-400">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {new Date(call.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      {call.durationSeconds > 0 && (
                        <span className="text-stone-300">
                          Duration: {formatCallDuration(call.durationSeconds)}
                        </span>
                      )}
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          call.status === 'connected' || call.status === 'ended'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : call.status === 'missed' || call.status === 'declined'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {call.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
