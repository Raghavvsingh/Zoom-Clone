'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { meetingService } from '@/services/api';
import { MeetingDetail, Participant } from '@/types';
import { ControlBar } from '@/components/meeting/ControlBar';
import { ParticipantTile } from '@/components/meeting/ParticipantTile';
import { ParticipantsDrawer } from '@/components/meeting/ParticipantsDrawer';
import { Toast, ToastType } from '@/components/ui/Toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { ChatDrawer, ChatMessage } from '@/components/meeting/ChatDrawer';
import { ShieldCheck, Info, Copy, Check, Maximize2, Minimize2, Grid, User, AlertCircle, X } from 'lucide-react';

export default function MeetingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const meetingCode = (params.code as string) || '';
  const queryName = searchParams.get('name');
  const initialMic = searchParams.get('mic') !== 'false';
  const initialCam = searchParams.get('cam') !== 'false';

  const [currentUserName, setCurrentUserName] = useState<string>(queryName || 'Alex Morgan');
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local media stream state
  const [isMicMuted, setIsMicMuted] = useState(!initialMic);
  const [isVideoOff, setIsVideoOff] = useState(!initialCam);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // UI state
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [showInfoDropdown, setShowInfoDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<number | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenSharer, setRemoteScreenSharer] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeReactions, setActiveReactions] = useState<Map<string, string>>(new Map());



  // Fetch meeting detail and join participant record
  useEffect(() => {
    let mounted = true;

    const initMeeting = async () => {
      try {
        setLoading(true);
        const data = await meetingService.getMeetingByCode(meetingCode);
        if (!mounted) return;
        setMeeting(data);

        // Resolve name: use URL query param if present, otherwise use meeting's host name
        const myName = queryName?.trim() || data.host_display_name || 'Alex Morgan';
        if (mounted) setCurrentUserName(myName);

        // Register as participant in backend
        const p = await meetingService.joinMeeting(meetingCode, { display_name: myName });
        if (mounted) setCurrentParticipantId(p.id);

        // Fetch actual active participants list
        const activeParticipants = await meetingService.getParticipants(meetingCode);
        if (mounted) setParticipants(activeParticipants);
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.detail || 'Meeting room could not be loaded.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (meetingCode) initMeeting();

    return () => { mounted = false; };
  }, [meetingCode, queryName]);



  // Real-time polling for participant changes (joins, leaves) every 2.5 seconds
  useEffect(() => {
    if (!meetingCode || error) return;

    const interval = setInterval(async () => {
      try {
        const activeParticipants = await meetingService.getParticipants(meetingCode);
        setParticipants(activeParticipants);
      } catch (e) {
        // Silent catch for background polling
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [meetingCode, error]);

  // Request browser WebRTC MediaStream (camera & mic)
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        // Apply initial mic & video settings
        stream.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
        stream.getVideoTracks().forEach((t) => (t.enabled = !isVideoOff));
      } catch (err) {
        console.warn('Camera or microphone permission denied or device not found.', err);
        setIsVideoOff(true);
        setIsMicMuted(true);
      } finally {
        setMediaReady(true);
      }
    };

    startMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);


  const handleToggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMicMuted));
    }
    const nextState = !isMicMuted;
    setIsMicMuted(nextState);
    setToast({
      message: nextState ? 'Microphone muted' : 'Microphone unmuted',
      type: nextState ? 'info' : 'success',
    });
  };

  const handleToggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    }
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    setToast({
      message: nextState ? 'Camera stopped' : 'Camera started',
      type: nextState ? 'info' : 'success',
    });
  };

  const handleCopyLink = () => {
    const inviteUrl = meeting?.invite_link || `${window.location.origin}/join/${meetingCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setLinkCopied(true);
    setToast({ message: 'Meeting invite link copied to clipboard!', type: 'success' });
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const handleLeaveMeeting = async () => {
    if (currentParticipantId) {
      try {
        await meetingService.leaveMeeting(meetingCode, currentParticipantId);
      } catch (e) {
        console.error('Error leaving meeting', e);
      }
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    router.push('/');
  };

  const handleEndMeeting = async () => {
    try {
      await meetingService.endMeeting(meetingCode);
    } catch (e) {
      console.error('Error ending meeting', e);
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    router.push('/');
  };

  const handleMuteAll = async () => {
    try {
      // 1. Update DB so participant records show muted (cosmetic + persistent)
      await meetingService.muteAllParticipants(meetingCode);

      // 2. Send force-mute WebSocket signal to every non-host, non-self participant
      // The signaling server relays targeted messages to the correct client
      participants.forEach((p) => {
        if (!p.is_host && p.display_name !== currentUserName) {
          sendForceMute(p.display_name);
        }
      });

      setToast({ message: 'All participants have been muted', type: 'info' });
      const updated = await meetingService.getParticipants(meetingCode);
      setParticipants(updated);
    } catch (e) {
      setToast({ message: 'Failed to mute participants', type: 'error' });
    }
  };

  /** Host mutes a single participant by their DB record id */
  const handleMuteParticipant = (pId: number) => {
    const target = participants.find((p) => p.id === pId);
    if (target && !target.is_host) {
      sendForceMute(target.display_name);
      setToast({ message: `${target.display_name} has been muted`, type: 'info' });
    }
  };

  const handleRemoveParticipant = async (pId: number) => {
    try {
      await meetingService.removeParticipant(meetingCode, pId);
      setParticipants((prev) => prev.filter((item) => item.id !== pId));
      setToast({ message: 'Participant removed from meeting.', type: 'info' });
    } catch (e) {
      setToast({ message: 'Failed to remove participant.', type: 'error' });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Determine host status
  const isHost = meeting?.host_display_name?.trim().toLowerCase() === currentUserName.trim().toLowerCase();

  // WebRTC real-time signaling, P2P media, and in-meeting chat hook
  const {
    remoteStreams,
    remoteMediaStates,
    sendChatMessage,
    sendReaction,
    sendScreenShareState,
    sendForceMute,
  } = useWebRTC({
    meetingCode,
    currentUserName: currentUserName,
    localStream: localStream,
    isMicMuted,
    isVideoOff,
    mediaReady,
    onUserJoined: async (user) => {
      try {
        const active = await meetingService.getParticipants(meetingCode);
        setParticipants(active);
        setToast({ message: `${user} joined the meeting`, type: 'info' });
      } catch (e) {}
    },
    onUserLeft: async (user) => {
      try {
        const active = await meetingService.getParticipants(meetingCode);
        setParticipants(active);
        setToast({ message: `${user} left the meeting`, type: 'info' });
        if (remoteScreenSharer === user) {
          setRemoteScreenSharer(null);
        }
      } catch (e) {}
    },
    onChatMessage: (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (!showChat) {
        setUnreadChatCount((count) => count + 1);
      }
    },
    onReaction: ({ emoji, sender }) => {
      setActiveReactions((prev) => new Map(prev).set(sender, emoji));
      setTimeout(() => {
        setActiveReactions((prev) => {
          const next = new Map(prev);
          if (next.get(sender) === emoji) next.delete(sender);
          return next;
        });
      }, 3500);
    },
    onScreenShareState: ({ sender, isSharing }) => {
      if (isSharing) {
        setRemoteScreenSharer(sender);
        setToast({ message: `${sender} started sharing screen`, type: 'info' });
      } else {
        setRemoteScreenSharer((curr) => (curr === sender ? null : curr));
        setToast({ message: `${sender} stopped sharing screen`, type: 'info' });
      }
    },
    onForceMute: () => {
      // Host forced this client to mute — disable the audio track immediately
      setLocalStream((stream) => {
        if (stream) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        return stream;
      });
      setIsMicMuted(true);
      setToast({ message: 'You have been muted by the host', type: 'info' });
    },
  });

  const handleSendMessage = (text: string) => {
    const sent = sendChatMessage(text);
    if (sent) {
      setChatMessages((prev) => [...prev, sent]);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setActiveReactions((prev) => new Map(prev).set(currentUserName, emoji));
    sendReaction(emoji);
    setTimeout(() => {
      setActiveReactions((prev) => {
        const next = new Map(prev);
        if (next.get(currentUserName) === emoji) next.delete(currentUserName);
        return next;
      });
    }, 3500);
  };

  const handleToggleRecord = () => {
    const next = !isRecording;
    setIsRecording(next);
    setToast({
      message: next ? 'Recording started.' : 'Recording paused.',
      type: next ? 'success' : 'info',
    });
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      sendScreenShareState(false);
      setToast({ message: 'Screen sharing stopped', type: 'info' });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        sendScreenShareState(true);
        setToast({ message: 'Screen sharing started', type: 'success' });

        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            setScreenStream(null);
            setIsScreenSharing(false);
            sendScreenShareState(false);
            setToast({ message: 'Screen sharing ended', type: 'info' });
          };
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error('Error starting screen share', err);
          setToast({ message: 'Could not start screen sharing', type: 'error' });
        }
      }
    }
  };

  const handleToggleChat = () => {
    const next = !showChat;
    setShowChat(next);
    if (next) {
      setUnreadChatCount(0);
      setShowParticipants(false);
    }
  };

  const handleToggleParticipants = () => {
    const next = !showParticipants;
    setShowParticipants(next);
    if (next) {
      setShowChat(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-zoom-blue border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm font-medium text-gray-300">Connecting to Zoom Meeting Room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0e1014] flex items-center justify-center p-4">
        <div className="bg-[#181b22] border border-rose-800/40 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Meeting Unavailable</h2>
          <p className="text-xs text-gray-400">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 bg-zoom-blue text-white text-xs font-semibold rounded-xl hover:bg-zoom-blue-hover transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Active participants list
  // Merges backend database participants with live WebRTC connected peers
  const baseParticipants = participants.length > 0 ? [...participants] : [
    {
      id: currentParticipantId || 1,
      meeting_id: meeting?.id || 1,
      display_name: currentUserName,
      is_host: isHost,
      is_muted: isMicMuted,
      is_video_off: isVideoOff,
      joined_at: new Date().toISOString(),
    },
  ];

  // If a peer is connected via WebRTC signaling but not yet in database participants, add them
  const existingNames = new Set(baseParticipants.map((p) => p.display_name.trim().toLowerCase()));
  remoteStreams.forEach((_, peerName) => {
    const norm = peerName.trim().toLowerCase();
    if (norm !== currentUserName.trim().toLowerCase() && !existingNames.has(norm)) {
      baseParticipants.push({
        id: Math.abs(peerName.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)) || 999,
        meeting_id: meeting?.id || 1,
        display_name: peerName,
        is_host: false,
        is_muted: false,
        is_video_off: false,
        joined_at: new Date().toISOString(),
      });
      existingNames.add(norm);
    }
  });

  const displayParticipants = baseParticipants;
  const totalCount = displayParticipants.length;



  return (
    <div className="min-h-screen bg-[#0e1014] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Header Bar */}
      <header className="h-12 bg-[#16181e] border-b border-[#252830] px-4 flex items-center justify-between z-30 sticky top-0">
        {/* Left: Green Shield / Meeting Info button */}
        <div className="flex items-center space-x-3 relative">
          <button
            onClick={() => setShowInfoDropdown(!showInfoDropdown)}
            className="flex items-center space-x-1.5 p-1.5 rounded-lg hover:bg-[#252932] text-emerald-400 transition"
            title="Meeting Information"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Meeting Info Dropdown */}
          {showInfoDropdown && (
            <div className="absolute top-10 left-0 w-80 bg-[#1c2029] border border-gray-700/80 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Meeting Details</span>
                </span>
                <button
                  onClick={() => setShowInfoDropdown(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Topic</span>
                  <span className="text-white font-medium">{meeting?.title || 'Zoom Meeting'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Meeting ID</span>
                  <span className="text-white font-mono">{meetingCode}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Host</span>
                  <span className="text-white">{meeting?.host_display_name || 'Alex Morgan'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Invite Link</span>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <input
                      readOnly
                      value={meeting?.invite_link || `${window.location.origin}/join/${meetingCode}`}
                      className="bg-[#121418] border border-gray-700 text-gray-300 text-[11px] rounded px-2 py-1 w-full focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 bg-zoom-blue hover:bg-zoom-blue-hover text-white rounded transition shrink-0"
                      title="Copy link"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-200 truncate max-w-xs sm:max-w-md">
              {meeting?.title || 'Zoom Meeting'}
            </span>
          </div>
        </div>

        {/* Center: Recording Indicator Badge */}
        {isRecording && (
          <div className="flex items-center space-x-1.5 bg-rose-950/80 border border-rose-500/50 px-3 py-1 rounded-full text-rose-300 text-xs font-semibold animate-pulse shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>REC</span>
          </div>
        )}

        {/* Right: View mode and fullscreen */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#20242c] px-2.5 py-1 rounded-md border border-gray-700/60 text-xs text-gray-300">
            <span className="text-gray-400 text-[11px]">ID:</span>
            <span className="font-mono text-gray-200">{meetingCode}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252932] rounded-lg transition"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Video Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 overflow-hidden flex flex-col items-center justify-center">
          {/* SCREEN SHARE PRESENTATION LAYOUT */}
          {(() => {
            const activeScreenSharer = isScreenSharing ? currentUserName : remoteScreenSharer;
            const sharedScreenStream = isScreenSharing
              ? screenStream
              : activeScreenSharer
              ? (remoteStreams.get(activeScreenSharer) || null)
              : null;

            if (activeScreenSharer && (screenStream || sharedScreenStream)) {
              return (
                <div className="w-full h-full flex flex-col overflow-hidden">
                  {/* Participant Video Filmstrip at Top */}
                  <div className="w-full flex items-center justify-center space-x-3 overflow-x-auto py-2.5 px-4 bg-[#121418]/90 border-b border-[#252830] shrink-0 h-36">
                    {displayParticipants.map((p) => {
                      const isLocal = p.display_name.trim().toLowerCase() === currentUserName.trim().toLowerCase();
                      const remoteStream = !isLocal
                        ? remoteStreams.get(p.display_name) ||
                          remoteStreams.get(p.display_name.trim()) ||
                          Array.from(remoteStreams.entries()).find(
                            ([k]) => k.trim().toLowerCase() === p.display_name.trim().toLowerCase()
                          )?.[1] ||
                          (remoteStreams.size === 1 ? Array.from(remoteStreams.values())[0] : null) ||
                          null
                        : null;

                      const remoteMedia = !isLocal
                        ? remoteMediaStates.get(p.display_name) ||
                          remoteMediaStates.get(p.display_name.trim()) ||
                          Array.from(remoteMediaStates.entries()).find(
                            ([k]) => k.trim().toLowerCase() === p.display_name.trim().toLowerCase()
                          )?.[1]
                        : null;

                      const effectiveMuted = isLocal ? isMicMuted : (remoteMedia?.isMuted ?? p.is_muted);
                      const effectiveVideoOff = isLocal ? isVideoOff : (remoteMedia?.isVideoOff ?? p.is_video_off);

                      return (
                        <div key={`thumb-${p.id}-${p.display_name}`} className="w-48 sm:w-56 h-full shrink-0">
                          <ParticipantTile
                            displayName={p.display_name}
                            isHost={p.is_host}
                            isLocalUser={isLocal}
                            isMuted={effectiveMuted}
                            isVideoOff={effectiveVideoOff}
                            isScreenSharing={false}
                            stream={isLocal ? localStream : remoteStream}
                            totalParticipants={displayParticipants.length}
                            reaction={activeReactions.get(p.display_name)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Large Shared Screen Presentation Viewport */}
                  <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden relative">
                    <div className="relative w-full h-full max-w-5xl flex items-center justify-center bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                      <video
                        ref={(el) => {
                          if (el && sharedScreenStream) {
                            el.srcObject = sharedScreenStream;
                            el.play().catch(() => {});
                          }
                        }}
                        autoPlay
                        playsInline
                        muted={isScreenSharing}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>
                          {isScreenSharing ? 'You are sharing your screen' : `${activeScreenSharer} is sharing screen`}
                        </span>
                      </div>
                      {isScreenSharing && (
                        <button
                          onClick={handleToggleScreenShare}
                          className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold shadow-md transition"
                        >
                          Stop Share
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // STANDARD GALLERY GRID LAYOUT
            return (
              <div className="w-full h-full p-3 sm:p-6 flex items-center justify-center overflow-y-auto">
                <div
                  className={`w-full h-full max-w-6xl mx-auto flex items-center justify-center ${
                    totalCount === 1
                      ? 'grid grid-cols-1'
                      : totalCount === 2
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'
                      : totalCount <= 4
                      ? 'grid grid-cols-2 gap-3 sm:gap-4'
                      : 'grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4'
                  }`}
                >
                  {displayParticipants.map((p) => {
                    const isLocal = p.display_name.trim().toLowerCase() === currentUserName.trim().toLowerCase();

                    const remoteStream = !isLocal
                      ? remoteStreams.get(p.display_name) ||
                        remoteStreams.get(p.display_name.trim()) ||
                        Array.from(remoteStreams.entries()).find(
                          ([k]) => k.trim().toLowerCase() === p.display_name.trim().toLowerCase()
                        )?.[1] ||
                        (remoteStreams.size === 1 ? Array.from(remoteStreams.values())[0] : null) ||
                        null
                      : null;

                    const remoteMedia = !isLocal
                      ? remoteMediaStates.get(p.display_name) ||
                        remoteMediaStates.get(p.display_name.trim()) ||
                        Array.from(remoteMediaStates.entries()).find(
                          ([k]) => k.trim().toLowerCase() === p.display_name.trim().toLowerCase()
                        )?.[1]
                      : null;

                    const effectiveMuted = isLocal ? isMicMuted : (remoteMedia?.isMuted ?? p.is_muted);
                    const effectiveVideoOff = isLocal ? isVideoOff : (remoteMedia?.isVideoOff ?? p.is_video_off);

                    return (
                      <ParticipantTile
                        key={`${p.id}-${p.display_name}`}
                        displayName={p.display_name}
                        isHost={p.is_host}
                        isLocalUser={isLocal}
                        isMuted={effectiveMuted}
                        isVideoOff={effectiveVideoOff}
                        isScreenSharing={false}
                        stream={isLocal ? localStream : remoteStream}
                        totalParticipants={totalCount}
                        reaction={activeReactions.get(p.display_name)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </main>

        {/* Zoom Participants Drawer */}
        <ParticipantsDrawer
          isOpen={showParticipants}
          onClose={() => setShowParticipants(false)}
          participants={displayParticipants}
          isHost={isHost}
          onMuteAll={handleMuteAll}
          onMuteParticipant={handleMuteParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          onCopyLink={handleCopyLink}
          linkCopied={linkCopied}
        />

        {/* Zoom In-Meeting Chat Drawer */}
        <ChatDrawer
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          messages={chatMessages}
          currentUserName={currentUserName}
          onSendMessage={handleSendMessage}
          unreadCount={unreadChatCount}
        />
      </div>

      {/* Zoom Bottom Control Bar */}
      <ControlBar
        isMuted={isMicMuted}
        onToggleMic={handleToggleMic}
        isVideoOff={isVideoOff}
        onToggleCamera={handleToggleCamera}
        participantCount={totalCount}
        onToggleParticipants={handleToggleParticipants}
        showParticipants={showParticipants}
        onToggleChat={handleToggleChat}
        showChat={showChat}
        unreadChatCount={unreadChatCount}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeeting={isHost ? handleEndMeeting : undefined}
        isHost={isHost}
        onCopyLink={handleCopyLink}
        linkCopied={linkCopied}
        isRecording={isRecording}
        onToggleRecord={handleToggleRecord}
        onSendReaction={handleSendReaction}
      />


      {/* Toast popup */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
