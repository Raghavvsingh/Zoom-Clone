'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isMe: boolean;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserName: string;
  onSendMessage: (text: string) => void;
  unreadCount: number;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserName,
  onSendMessage,
  unreadCount,
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarColors = [
    'bg-blue-600', 'bg-purple-600', 'bg-emerald-600',
    'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-indigo-600',
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-[#1c2029] border-l border-[#2b303b] flex flex-col h-full z-20 shadow-2xl">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[#252830] bg-[#191d25] shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-zoom-blue" />
          <span className="text-sm font-semibold text-white">In-Meeting Chat</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-[#252932] rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-2 py-8">
            <MessageSquare className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium">No messages yet</p>
            <p className="text-[11px] opacity-70">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex items-start space-x-2 ${msg.isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getAvatarColor(msg.sender)}`}
              >
                {getInitials(msg.sender)}
              </div>

              {/* Bubble */}
              <div className={`max-w-[200px] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!msg.isMe && (
                  <span className="text-[10px] font-medium text-gray-400 mb-0.5 ml-1">{msg.sender}</span>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                    msg.isMe
                      ? 'bg-[#0E71EB] text-white rounded-tr-sm'
                      : 'bg-[#252a36] text-gray-100 rounded-tl-sm'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 mx-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-[#252830] p-3 bg-[#191d25] shrink-0">
        <div className="flex items-center space-x-2 bg-[#252a36] border border-[#363d4e] rounded-xl px-3 py-2 focus-within:border-zoom-blue/60 transition">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="flex-1 bg-transparent text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-1 text-zoom-blue hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 ml-1">Press Enter to send</p>
      </div>
    </div>
  );
};
