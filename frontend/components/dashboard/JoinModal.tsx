'use client';

import React, { useState } from 'react';
import { X, Video, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [meetingCodeInput, setMeetingCodeInput] = useState('');
  const [displayName, setDisplayName] = useState('Alex Morgan');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = meetingCodeInput.trim().replace(/\s+/g, '');
    if (!cleanCode) {
      setError('Please enter a valid 9-digit Meeting ID or invite link.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    // Extract code if user pasted a full URL
    let code = cleanCode;
    if (cleanCode.includes('/join/')) {
      code = cleanCode.split('/join/')[1];
    } else if (cleanCode.includes('/meeting/')) {
      code = cleanCode.split('/meeting/')[1];
    }

    onClose();
    router.push(`/join/${encodeURIComponent(code)}?name=${encodeURIComponent(displayName.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-[#0E71EB]">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Join Meeting</h2>
            <p className="text-xs text-gray-500">
              Enter Meeting ID or Personal Link Name
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Meeting ID or Invite Link
            </label>
            <input
              type="text"
              value={meetingCodeInput}
              onChange={(e) => {
                setMeetingCodeInput(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 123-456-789 or paste invite link"
              className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none transition placeholder-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none transition placeholder-gray-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#0E71EB] hover:bg-[#0b5cbe] text-white rounded-lg transition shadow-xs"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
