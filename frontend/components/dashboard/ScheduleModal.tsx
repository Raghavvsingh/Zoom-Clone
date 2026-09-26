'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ScheduledMeetingPayload } from '@/types';
import { meetingService } from '@/services/api';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meeting: any) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const defaultDate = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 10);
  const defaultTime = "14:00";

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting topic is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Combine date & time into ISO string
      const scheduledDateTime = new Date(`${date}T${time}:00Z`).toISOString();

      const payload: ScheduledMeetingPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDateTime,
        duration_minutes: Number(duration),
      };

      const meeting = await meetingService.scheduleMeeting(payload);
      onSuccess(meeting);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to schedule meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-emerald-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Schedule Meeting</h2>
            <p className="text-xs text-gray-500">
              Set up a scheduled video conference session
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Topic *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Weekly Team Sync"
              className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none transition placeholder-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda or notes for attendees..."
              rows={2}
              className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none transition resize-none placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3 py-2 text-xs focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Start Time (UTC) *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3 py-2 text-xs focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3 py-2.5 text-xs focus:outline-none transition"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour (60 mins)</option>
              <option value={90}>1.5 hours (90 mins)</option>
              <option value={120}>2 hours (120 mins)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-[#0E71EB] hover:bg-[#0b5cbe] text-white rounded-lg transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              {loading && <Clock className="w-3 h-3 animate-spin" />}
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
