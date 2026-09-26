'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Users,
  MessageSquare,
  Share2,
  Shield,
  CircleDot,
  Smile,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react';

interface ControlBarProps {
  isMuted: boolean;
  onToggleMic: () => void;
  isVideoOff: boolean;
  onToggleCamera: () => void;
  participantCount: number;
  onToggleParticipants: () => void;
  showParticipants: boolean;
  onToggleChat?: () => void;
  showChat?: boolean;
  unreadChatCount?: number;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onLeaveMeeting: () => void;
  onEndMeeting?: () => void;
  isHost: boolean;
  onCopyLink: () => void;
  linkCopied: boolean;
  isRecording?: boolean;
  onToggleRecord?: () => void;
  onSendReaction?: (emoji: string) => void;
}


export const ControlBar: React.FC<ControlBarProps> = ({
  isMuted,
  onToggleMic,
  isVideoOff,
  onToggleCamera,
  participantCount,
  onToggleParticipants,
  showParticipants,
  onToggleChat,
  showChat = false,
  unreadChatCount = 0,
  isScreenSharing = false,
  onToggleScreenShare,
  onLeaveMeeting,
  onEndMeeting,
  isHost,
  onCopyLink,
  linkCopied,
  isRecording = false,
  onToggleRecord,
  onSendReaction,
}) => {


  const [showEndDialog, setShowEndDialog] = useState(false);
  const [internalRecording, setInternalRecording] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const effectiveRecording = onToggleRecord ? isRecording : internalRecording;

  return (
    <footer className="h-18 sm:h-20 bg-[#16181e] border-t border-[#252830] px-3 sm:px-6 flex items-center justify-between z-40 select-none">
      {/* Left section: Mic & Video buttons with chevrons */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Microphone Button */}
        <div className="flex items-center rounded-lg hover:bg-[#252932] text-gray-200 transition">
          <button
            onClick={onToggleMic}
            className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 focus:outline-none"
            title={isMuted ? 'Unmute (Alt+A)' : 'Mute (Alt+A)'}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 text-rose-500" />
            ) : (
              <Mic className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-[10px] mt-0.5 font-normal text-gray-300">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>
          <button className="px-1 py-3 text-gray-400 hover:text-white hidden sm:block">
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>

        {/* Video Camera Button */}
        <div className="flex items-center rounded-lg hover:bg-[#252932] text-gray-200 transition">
          <button
            onClick={onToggleCamera}
            className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 focus:outline-none"
            title={isVideoOff ? 'Start Video (Alt+V)' : 'Stop Video (Alt+V)'}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5 text-rose-500" />
            ) : (
              <VideoIcon className="w-5 h-5 text-zoom-blue" />
            )}
            <span className="text-[10px] mt-0.5 font-normal text-gray-300">
              {isVideoOff ? 'Start Video' : 'Stop Video'}
            </span>
          </button>
          <button className="px-1 py-3 text-gray-400 hover:text-white hidden sm:block">
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Center Section: Main Zoom Meeting Controls */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Security (Host only) */}
        {isHost && (
          <button className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#252932] text-gray-300 hover:text-white transition">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">Security</span>
          </button>
        )}

        {/* Participants Panel Button */}
        <button
          onClick={onToggleParticipants}
          className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg transition relative ${
            showParticipants ? 'bg-[#0E71EB]/20 text-zoom-blue' : 'hover:bg-[#252932] text-gray-300 hover:text-white'
          }`}
          title="Participants"
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2.5 bg-[#0E71EB] text-white text-[9px] font-bold px-1 rounded-full border border-black min-w-[16px] text-center">
              {participantCount}
            </span>
          </div>
          <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">Participants</span>
        </button>

        {/* Chat Panel Button */}
        <button
          onClick={onToggleChat}
          className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg transition relative ${
            showChat ? 'bg-[#0E71EB]/20 text-zoom-blue' : 'hover:bg-[#252932] text-gray-300 hover:text-white'
          }`}
          title="In-Meeting Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1 rounded-full border border-black min-w-[15px] text-center animate-pulse">
                {unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">Chat</span>
        </button>


        {/* Share Screen (Zoom iconic green button) */}
        <button
          onClick={onToggleScreenShare || onCopyLink}
          className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
            isScreenSharing
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'hover:bg-[#252932] text-emerald-400'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <Share2 className={`w-5 h-5 ${isScreenSharing ? 'text-emerald-300' : 'text-emerald-400'}`} />
          <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </span>
        </button>


        {/* Record Button */}
        <button
          onClick={onToggleRecord || (() => setInternalRecording(!internalRecording))}
          className={`flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg transition ${
            effectiveRecording
              ? 'text-rose-400 bg-rose-950/50 border border-rose-500/40'
              : 'hover:bg-[#252932] text-gray-300 hover:text-white'
          }`}
          title={effectiveRecording ? 'Pause / Stop Recording' : 'Record Meeting'}
        >
          <CircleDot className={`w-5 h-5 ${effectiveRecording ? 'animate-pulse text-rose-500' : ''}`} />
          <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">
            {effectiveRecording ? 'Recording' : 'Record'}
          </span>
        </button>

        {/* Reactions Button */}
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-1.5 rounded-lg hover:bg-[#252932] text-gray-300 hover:text-white transition"
            title="Reactions"
          >
            <Smile className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-normal hidden sm:inline">Reactions</span>
          </button>

          {showReactions && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#20242c] border border-gray-700/70 rounded-xl p-2 shadow-2xl flex space-x-2 z-50 animate-in fade-in">
              {['👍', '👏', '❤️', '🎉', '😂', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setShowReactions(false);
                    if (onSendReaction) onSendReaction(emoji);
                  }}
                  className="text-lg p-1 hover:scale-125 transition transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Red End / Leave Button */}
      <div className="relative">
        <button
          onClick={() => {
            if (isHost) {
              setShowEndDialog(true);
            } else {
              onLeaveMeeting();
            }
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition shadow-md flex items-center space-x-1"
        >
          <span>{isHost ? 'End' : 'Leave'}</span>
        </button>

        {/* Host End Dialog */}
        {showEndDialog && isHost && (
          <div className="absolute right-0 bottom-12 w-56 bg-[#20242c] border border-gray-700 rounded-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in">
            <button
              onClick={() => {
                setShowEndDialog(false);
                if (onEndMeeting) onEndMeeting();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
            >
              End Meeting for All
            </button>
            <button
              onClick={() => {
                setShowEndDialog(false);
                onLeaveMeeting();
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700/60 rounded-lg transition"
            >
              Leave Meeting
            </button>
            <div className="h-px bg-gray-700/60 my-1"></div>
            <button
              onClick={() => setShowEndDialog(false)}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};
