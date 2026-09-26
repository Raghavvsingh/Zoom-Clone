'use client';

import React, { useState } from 'react';
import { Meeting } from '@/types';
import { Calendar, Clock, Copy, Check, Video, ExternalLink, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface MeetingCardProps {
  meeting: Meeting;
  type: 'upcoming' | 'recent';
  onCopyLink: (link: string) => void;
  onDelete?: (code: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  type,
  onCopyLink,
  onDelete,
}) => {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const formattedDate = meeting.scheduled_at
    ? format(new Date(meeting.scheduled_at), 'EEE, MMM d, yyyy')
    : format(new Date(meeting.created_at), 'EEE, MMM d, yyyy');

  const formattedTime = meeting.scheduled_at
    ? format(new Date(meeting.scheduled_at), 'h:mm a')
    : format(new Date(meeting.created_at), 'h:mm a');

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = meeting.invite_link || `${window.location.origin}/join/${meeting.meeting_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    onCopyLink(link);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartOrJoin = () => {
    // Pass host name so meeting room doesn't generate a ghost guest
    const hostName = encodeURIComponent(meeting.host_display_name || 'Alex Morgan');
    router.push(`/meeting/${meeting.meeting_code}?name=${hostName}`);
  };

  return (
    <div className="bg-white border border-gray-200 hover:border-blue-300 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between space-y-3 group select-none shadow-sm hover:shadow-md">
      {/* Top Header: ID badge & Copy Link */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                type === 'upcoming' ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
            ></span>
            <span className="text-[11px] font-mono font-medium text-gray-500 tracking-wider">
              ID: {meeting.meeting_code}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition text-xs flex items-center space-x-1"
              title="Copy invite link"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="text-[11px] hidden sm:inline">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            {onDelete && type === 'upcoming' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(meeting.meeting_code);
                }}
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                title="Delete scheduled meeting"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Meeting Topic Title */}
        <h3 className="text-sm font-semibold text-gray-900 mt-1.5 group-hover:text-[#0E71EB] transition line-clamp-1">
          {meeting.title}
        </h3>

        {meeting.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {meeting.description}
          </p>
        )}
      </div>

      {/* Date & Time Metadata */}
      <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-[#0E71EB] shrink-0" />
            <span>{formattedDate}</span>
          </div>
          <span className="text-gray-500 font-mono text-[11px]">{formattedTime}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{meeting.duration_minutes} mins</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3 text-gray-400 shrink-0" />
            <span>{meeting.participant_count || 1} participant(s)</span>
          </div>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="pt-1">
        {type === 'upcoming' ? (
          <button
            onClick={handleStartOrJoin}
            className="w-full py-2 px-3 bg-[#0E71EB] hover:bg-[#0b5cbe] text-white font-medium text-xs rounded-lg transition flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Start</span>
          </button>
        ) : (
          <button
            onClick={handleStartOrJoin}
            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-xs rounded-lg transition flex items-center justify-center space-x-1.5 border border-gray-200"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Re-join</span>
          </button>
        )}
      </div>
    </div>
  );
};
