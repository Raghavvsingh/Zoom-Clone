'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isMe: boolean;
}

interface UseWebRTCOptions {
  meetingCode: string;
  currentUserName: string;
  localStream: MediaStream | null;
  isMicMuted: boolean;
  isVideoOff: boolean;
  onUserJoined?: (name: string) => void;
  onUserLeft?: (name: string) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onReaction?: (reaction: { emoji: string; sender: string }) => void;
  onScreenShareState?: (state: { sender: string; isSharing: boolean }) => void;
  /** Called when a host sends a force-mute signal targeting this client */
  onForceMute?: () => void;
  mediaReady?: boolean;
}

export interface RemoteMediaState {
  isMuted: boolean;
  isVideoOff: boolean;
}

export function useWebRTC({
  meetingCode,
  currentUserName,
  localStream,
  isMicMuted,
  isVideoOff,
  onUserJoined,
  onUserLeft,
  onChatMessage,
  onReaction,
  onScreenShareState,
  onForceMute,
  mediaReady = true,
}: UseWebRTCOptions) {

  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);

  const onChatMessageRef = useRef(onChatMessage);
  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
  }, [onChatMessage]);

  const onUserJoinedRef = useRef(onUserJoined);
  useEffect(() => {
    onUserJoinedRef.current = onUserJoined;
  }, [onUserJoined]);

  const onUserLeftRef = useRef(onUserLeft);
  useEffect(() => {
    onUserLeftRef.current = onUserLeft;
  }, [onUserLeft]);

  const onReactionRef = useRef(onReaction);
  useEffect(() => {
    onReactionRef.current = onReaction;
  }, [onReaction]);

  const onScreenShareStateRef = useRef(onScreenShareState);
  useEffect(() => {
    onScreenShareStateRef.current = onScreenShareState;
  }, [onScreenShareState]);

  const onForceMuteRef = useRef(onForceMute);
  useEffect(() => {
    onForceMuteRef.current = onForceMute;
  }, [onForceMute]);

  // Keep localStreamRef synced
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);



  // Helper to create or get an RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = useCallback((peer: string, isInitiator: boolean) => {
    const existingPc = peerConnections.current.get(peer);
    if (existingPc && existingPc.signalingState !== 'closed') {
      return existingPc;
    }

    console.log(`[WebRTC] Initializing RTCPeerConnection with peer: ${peer} (initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnections.current.set(peer, pc);

    // Attach local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
          console.log(`[WebRTC] Attached local ${track.kind} track to peer ${peer}`);
        } catch (err) {
          console.error(`[WebRTC] Error attaching local track to ${peer}:`, err);
        }
      });
    }

    // Handle local ICE candidates and send via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            target: peer,
            sender: currentUserName,
            candidate: event.candidate.toJSON(),
          })
        );
      }
    };

    // Handle incoming remote media tracks: ALWAYS create a new MediaStream instance so React detects prop change!
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${event.track.kind}) from ${peer}`, event.track.id);
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        const existing = next.get(peer);
        const tracks = existing ? existing.getTracks().filter((t) => t.id !== event.track.id && t.kind !== event.track.kind) : [];
        tracks.push(event.track);
        // Create fresh MediaStream with all current remote tracks
        const newStream = new MediaStream(tracks);
        next.set(peer, newStream);
        console.log(`[WebRTC] Updated remote stream for ${peer}: total tracks = ${tracks.length}`);
        return next;
      });
    };

    // Connection state logging & handling
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer connection with ${peer} state:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn(`[WebRTC] Connection with ${peer} failed, attempting restart`);
        pc.restartIce();
      }
    };


    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection state with ${peer}:`, pc.iceConnectionState);
    };

    return pc;
  }, [currentUserName]);

  // Drain any queued ICE candidates for a peer once remoteDescription is set
  const drainIceCandidates = useCallback(async (peer: string, pc: RTCPeerConnection) => {
    const queue = candidateQueues.current.get(peer) || [];
    if (queue.length > 0) {
      console.log(`[WebRTC] Draining ${queue.length} queued ICE candidates for ${peer}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error(`[WebRTC] Error adding queued ICE candidate for ${peer}:`, err);
        }
      }
      candidateQueues.current.delete(peer);
    }
  }, []);

  // Update tracks across existing peer connections when localStream changes
  useEffect(() => {
    localStreamRef.current = localStream;
    if (!localStream) return;

    peerConnections.current.forEach((pc, peer) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const existingSender = senders.find((s) => s.track?.kind === track.kind);
        if (existingSender) {
          existingSender.replaceTrack(track).catch((err) => {
            console.error(`[WebRTC] replaceTrack error for ${peer}:`, err);
          });
        } else {
          try {
            pc.addTrack(track, localStream);
            console.log(`[WebRTC] Added new track ${track.kind} to ${peer}`);
          } catch (err) {
            console.error(`[WebRTC] addTrack error for ${peer}:`, err);
          }
        }
      });
    });
  }, [localStream]);



  // Broadcast mic/cam state changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media-state',
          sender: currentUserName,
          isMuted: isMicMuted,
          isVideoOff: isVideoOff,
        })
      );
    }
  }, [isMicMuted, isVideoOff, currentUserName]);

  // Main WebSocket signaling connection
  useEffect(() => {
    if (!meetingCode || !currentUserName || !mediaReady) return;


    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsBase = apiUrl.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/${meetingCode}?name=${encodeURIComponent(currentUserName)}`;

    console.log(`[WebRTC] Connecting WebSocket signaling to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WebRTC] WebSocket signaling connected for ${currentUserName}`);
      setIsConnected(true);

      // Send initial media state upon connecting
      ws.send(
        JSON.stringify({
          type: 'media-state',
          sender: currentUserName,
          isMuted: isMicMuted,
          isVideoOff: isVideoOff,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log(`[WebRTC] Received message:`, msg.type, 'from:', msg.sender);

        switch (msg.type) {
          case 'room-users': {
            // Received list of existing peers upon joining this room
            const peers: string[] = msg.peers || [];
            console.log(`[WebRTC] Room has existing peers:`, peers);
            
            // As the newcomer, initiate WebRTC offer to every existing peer
            for (const peer of peers) {
              if (peer === currentUserName) continue;
              const pc = getOrCreatePeerConnection(peer, true);
              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                });
                await pc.setLocalDescription(offer);
                ws.send(
                  JSON.stringify({
                    type: 'offer',
                    target: peer,
                    sender: currentUserName,
                    offer: offer,
                  })
                );
              } catch (err) {
                console.error(`[WebRTC] Error creating offer for ${peer}:`, err);
              }
            }
            break;
          }

          case 'user-joined': {
            const newPeer = msg.sender;
            console.log(`[WebRTC] User joined room:`, newPeer);
            if (onUserJoinedRef.current) {
              onUserJoinedRef.current(newPeer);
            }
            // The newcomer will initiate the offer, but make sure peer connection is ready
            getOrCreatePeerConnection(newPeer, false);
            break;
          }


          case 'offer': {
            const sender = msg.sender;
            const offer = msg.offer;
            console.log(`[WebRTC] Handling offer from:`, sender);

            const pc = getOrCreatePeerConnection(sender, false);
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              await drainIceCandidates(sender, pc);

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              ws.send(
                JSON.stringify({
                  type: 'answer',
                  target: sender,
                  sender: currentUserName,
                  answer: answer,
                })
              );
            } catch (err) {
              console.error(`[WebRTC] Error handling offer from ${sender}:`, err);
            }
            break;
          }

          case 'answer': {
            const sender = msg.sender;
            const answer = msg.answer;
            console.log(`[WebRTC] Handling answer from:`, sender);

            const pc = peerConnections.current.get(sender);
            if (pc) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                await drainIceCandidates(sender, pc);
              } catch (err) {
                console.error(`[WebRTC] Error setting remote description from ${sender}:`, err);
              }
            }
            break;
          }

          case 'ice-candidate': {
            const sender = msg.sender;
            const candidate = msg.candidate;
            const pc = peerConnections.current.get(sender);

            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error(`[WebRTC] Error adding ICE candidate from ${sender}:`, err);
              }
            } else {
              // Queue candidate until remoteDescription is set
              const queue = candidateQueues.current.get(sender) || [];
              queue.push(candidate);
              candidateQueues.current.set(sender, queue);
            }
            break;
          }

          case 'media-state': {
            const sender = msg.sender;
            setRemoteMediaStates((prev) => {
              const next = new Map(prev);
              next.set(sender, {
                isMuted: msg.isMuted,
                isVideoOff: msg.isVideoOff,
              });
              return next;
            });
            break;
          }

          case 'user-left': {
            const leavingUser = msg.sender;
            console.log(`[WebRTC] User left:`, leavingUser);
            
            const pc = peerConnections.current.get(leavingUser);
            if (pc) {
              pc.close();
              peerConnections.current.delete(leavingUser);
            }
            candidateQueues.current.delete(leavingUser);

            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.delete(leavingUser);
              return next;
            });

            setRemoteMediaStates((prev) => {
              const next = new Map(prev);
              next.delete(leavingUser);
              return next;
            });

            if (onUserLeftRef.current) {
              onUserLeftRef.current(leavingUser);
            }
            break;
          }

          case 'chat-message': {
            if (msg.sender !== currentUserName && onChatMessageRef.current) {
              onChatMessageRef.current({
                id: msg.id || `${Date.now()}-${Math.random()}`,
                sender: msg.sender,
                text: msg.text,
                timestamp: new Date(msg.timestamp || Date.now()),
                isMe: false,
              });
            }
            break;
          }

          case 'reaction': {
            if (onReactionRef.current) {
              onReactionRef.current({ emoji: msg.emoji, sender: msg.sender });
            }
            break;
          }

          case 'screenshare-state': {
            if (onScreenShareStateRef.current) {
              onScreenShareStateRef.current({ sender: msg.sender, isSharing: !!msg.isSharing });
            }
            break;
          }

          case 'force-mute': {
            // This client was targeted by the host's "Mute All" or individual mute
            console.log('[WebRTC] Received force-mute from host — muting local audio');
            if (onForceMuteRef.current) {
              onForceMuteRef.current();
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[WebRTC] Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[WebRTC] WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log(`[WebRTC] WebSocket disconnected`);
      setIsConnected(false);
    };

    // Clean up on component unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'user-left',
            sender: currentUserName,
          })
        );
        ws.close();
      }
      peerConnections.current.forEach((pc) => {
        pc.close();
      });
      peerConnections.current.clear();
      candidateQueues.current.clear();
    };
  }, [meetingCode, currentUserName, mediaReady, getOrCreatePeerConnection, drainIceCandidates]);


  // Send an in-meeting chat message to all peers in the room
  const sendChatMessage = useCallback(
    (text: string): ChatMessage | null => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const msgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date();
        const payload = {
          type: 'chat-message',
          id: msgId,
          sender: currentUserName,
          text,
          timestamp: timestamp.toISOString(),
        };
        wsRef.current.send(JSON.stringify(payload));
        return {
          id: msgId,
          sender: currentUserName,
          text,
          timestamp,
          isMe: true,
        };
      }
      return null;
    },
    [currentUserName]
  );

  // Send an emoji reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'reaction',
            sender: currentUserName,
            emoji,
          })
        );
      }
    },
    [currentUserName]
  );

  // Broadcast screen sharing status
  const sendScreenShareState = useCallback(
    (isSharing: boolean) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'screenshare-state',
            sender: currentUserName,
            isSharing,
          })
        );
      }
    },
    [currentUserName]
  );

  /**
   * Send a force-mute signal to a specific participant (targeted) or all (broadcast).
   * Only the HOST should call this. The server relays it to the target client.
   * Per real Zoom behavior, the host can only mute — not unmute — remote participants.
   */
  const sendForceMute = useCallback(
    (targetName: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'force-mute',
            target: targetName,   // signals the relay server to direct only to that participant
            sender: currentUserName,
          })
        );
        console.log(`[WebRTC] Sent force-mute to: ${targetName}`);
      }
    },
    [currentUserName]
  );

  return {
    remoteStreams,
    remoteMediaStates,
    isConnected,
    sendChatMessage,
    sendReaction,
    sendScreenShareState,
    sendForceMute,
  };
}


