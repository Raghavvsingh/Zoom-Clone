'use client';

import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Shield } from 'lucide-react';

interface ParticipantTileProps {
  displayName: string;
  isHost?: boolean;
  isLocalUser?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  stream?: MediaStream | null;
  totalParticipants?: number;
  reaction?: string | null;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  displayName,
  isHost = false,
  isLocalUser = false,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  stream = null,
  totalParticipants = 1,
  reaction = null,
}) => {

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Set srcObject whenever videoRef or stream or isVideoOff changes
  const setVideoRef = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    if (element && stream) {
      element.srcObject = stream;
      // For remote participants, NEVER mute in the fallback — that would permanently silence remote audio.
      // If autoplay fails, it usually resolves once the user interacts with the page.
      element.play().catch((e) => {
        console.warn('Autoplay blocked — will retry on user interaction:', e);
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream && !isVideoOff) {
      video.srcObject = stream;
      // Ensure muted state matches JSX attribute (local = muted, remote = unmuted)
      video.muted = isLocalUser;
      video.play().catch(() => {
        // Don't set muted=true for remote participants — that permanently kills audio.
        // Autoplay restrictions auto-resolve after user interaction.
      });

      // Listen for track unmute when remote RTP packets start flowing
      const tracks = stream.getTracks();
      const playHandler = () => {
        video.play().catch(() => {});
      };
      tracks.forEach((t) => t.addEventListener('unmute', playHandler));
      return () => {
        tracks.forEach((t) => t.removeEventListener('unmute', playHandler));
      };
    }
  }, [stream, isVideoOff, isLocalUser]);


  const initials = displayName
    ? displayName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div
      className={`relative w-full h-full bg-[#16181e] rounded-xl overflow-hidden border border-[#2b303b]/80 shadow-2xl flex items-center justify-center transition-all duration-300 group select-none ${
        totalParticipants === 1 ? 'max-w-4xl max-h-[72vh] aspect-video mx-auto' : 'aspect-video'
      }`}
    >
      {/* Video element when camera is on */}
      {!isVideoOff && stream ? (
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted={isLocalUser} // Mute self to prevent acoustic feedback echo
          className={`w-full h-full object-cover ${isLocalUser && !isScreenSharing ? 'transform -scale-x-100' : ''}`}
        />

      ) : (
        /* Video Off State: Clean Zoom avatar with initials */
        <div className="flex flex-col items-center justify-center space-y-3 p-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#272b35] border-2 border-[#3a4150] flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white shadow-inner">
            {initials}
          </div>
          <span className="text-xs text-gray-400 font-medium tracking-wide">
            {isVideoOff ? 'Video Off' : 'Connecting...'}
          </span>
        </div>
      )}

      {/* Host badge indicator */}
      {isHost && (
        <div className="absolute top-3 left-3 flex items-center space-x-1 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-400">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Host</span>
        </div>
      )}

      {/* Floating Animated Reaction */}
      {reaction && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none animate-bounce text-4xl sm:text-5xl filter drop-shadow-lg transition-transform transform scale-125">
          {reaction}
        </div>
      )}

      {/* Bottom overlay: Name and Mic status */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-xs text-white font-medium flex items-center space-x-1.5 shadow-sm max-w-[85%] truncate">
          <span className="truncate">{displayName}</span>
          {isLocalUser && <span className="text-gray-400 font-normal text-[11px]">(You)</span>}
        </div>

        <div
          className={`p-1 rounded backdrop-blur-md border ${
            isMuted
              ? 'bg-rose-600/90 border-rose-500 text-white'
              : 'bg-black/70 border-white/10 text-emerald-400'
          }`}
          title={isMuted ? 'Muted' : 'Microphone Active'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};
