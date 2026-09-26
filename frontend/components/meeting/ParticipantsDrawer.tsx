'use client';

import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, Shield, UserX, Copy, Check } from 'lucide-react';
import { Participant } from '@/types';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  currentUserId?: number;
  isHost: boolean;
  onMuteAll?: () => void;
  /** Called by host to force-mute a single participant */
  onMuteParticipant?: (participantId: number) => void;
  onRemoveParticipant?: (participantId: number) => void;
  onCopyLink: () => void;
  linkCopied: boolean;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  participants,
  isHost,
  onMuteAll,
  onMuteParticipant,
  onRemoveParticipant,
  onCopyLink,
  linkCopied,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-[#16181e] border-l border-[#252830] flex flex-col h-full z-30 shrink-0 select-none animate-in slide-in-from-right duration-150">
      {/* Drawer Header */}
      <div className="h-12 px-4 border-b border-[#252830] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-200">
            Participants ({participants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#242831] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {participants.map((p) => {
          const initials = p.display_name.slice(0, 2).toUpperCase();
          const isRemoteNonHost = isHost && !p.is_host;

          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#20242c] transition group text-xs"
            >
              {/* Left: Avatar + Display Name */}
              <div className="flex items-center space-x-2.5 truncate mr-2">
                <div className="w-7 h-7 rounded-full bg-[#272b35] border border-gray-700 flex items-center justify-center font-bold text-[11px] text-gray-200 shrink-0">
                  {initials}
                </div>
                <div className="truncate">
                  <div className="font-medium text-gray-200 truncate flex items-center space-x-1.5">
                    <span className="truncate">{p.display_name}</span>
                    {p.is_host && (
                      <span className="text-[10px] text-emerald-400 font-semibold">(Host)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Audio/Video Indicators + Host Actions */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {/* Mic status icon */}
                <div className="text-gray-400">
                  {p.is_muted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>

                {/* Video status icon */}
                <div className="text-gray-400">
                  {p.is_video_off ? (
                    <VideoOff className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-gray-300" />
                  )}
                </div>

                {/* Host-only: individual Mute button (only shown if participant is NOT muted) */}
                {/* Per real Zoom: host can mute a participant, but CANNOT unmute them */}
                {isRemoteNonHost && !p.is_muted && onMuteParticipant && (
                  <button
                    onClick={() => onMuteParticipant(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 rounded transition"
                    title="Mute participant"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Host-only: Remove button */}
                {isRemoteNonHost && onRemoveParticipant && (
                  <button
                    onClick={() => onRemoveParticipant(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded transition"
                    title="Remove participant"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-3 border-t border-[#252830] bg-[#121418] flex items-center space-x-2">
        <button
          onClick={onCopyLink}
          className="flex-1 py-1.5 px-3 bg-[#242831] hover:bg-[#2f3542] text-gray-200 text-xs font-medium rounded-lg transition flex items-center justify-center space-x-1.5 border border-gray-700"
        >
          {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{linkCopied ? 'Link Copied' : 'Invite'}</span>
        </button>

        {isHost && onMuteAll && (
          <button
            onClick={onMuteAll}
            className="flex-1 py-1.5 px-3 bg-[#242831] hover:bg-rose-950/40 hover:text-rose-300 text-gray-200 text-xs font-medium rounded-lg transition flex items-center justify-center space-x-1.5 border border-gray-700"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span>Mute All</span>
          </button>
        )}
      </div>
    </aside>
  );
};
