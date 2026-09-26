'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/dashboard/Navbar';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MeetingCard } from '@/components/dashboard/MeetingCard';
import { JoinModal } from '@/components/dashboard/JoinModal';
import { ScheduleModal } from '@/components/dashboard/ScheduleModal';
import { Toast, ToastType } from '@/components/ui/Toast';
import { User, Meeting } from '@/types';
import { userService, meetingService } from '@/services/api';
import {
  Video,
  Plus,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'upcoming'>('home');
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInstant, setCreatingInstant] = useState(false);

  // Modals state
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [pmIdCopied, setPmIdCopied] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userData, upcomingData] = await Promise.all([
        userService.getCurrentUser().catch(() => null),
        meetingService.getUpcomingMeetings().catch(() => []),
      ]);
      setUser(userData);
      setUpcomingMeetings(upcomingData);
    } catch (err) {
      setToast({ message: 'Failed to sync with backend server.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInstantMeeting = async () => {
    try {
      setCreatingInstant(true);
      const hostName = user?.display_name || 'Alex Morgan';
      const meeting = await meetingService.createInstantMeeting({
        title: `${hostName}'s Meeting`,
        host_display_name: hostName,
      });
      setToast({ message: 'Instant meeting ready! Launching room...', type: 'success' });
      router.push(`/meeting/${meeting.meeting_code}?name=${encodeURIComponent(hostName)}`);
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.detail || 'Failed to create instant meeting.',
        type: 'error',
      });
      setCreatingInstant(false);
    }
  };

  const handleScheduleSuccess = (newMeeting: Meeting) => {
    setUpcomingMeetings((prev) => [newMeeting, ...prev]);
    setToast({
      message: `Meeting "${newMeeting.title}" scheduled successfully!`,
      type: 'success',
    });
  };

  const handleDeleteMeeting = async (code: string) => {
    try {
      await meetingService.deleteMeeting(code);
      setUpcomingMeetings((prev) => prev.filter((m) => m.meeting_code !== code));
      setToast({ message: 'Scheduled meeting deleted.', type: 'info' });
    } catch (e) {
      setToast({ message: 'Failed to delete meeting.', type: 'error' });
    }
  };

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const copyPersonalId = () => {
    navigator.clipboard.writeText('345-890-123');
    setPmIdCopied(true);
    showToast('Personal Meeting ID copied to clipboard', 'success');
    setTimeout(() => setPmIdCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-gray-900 flex flex-col font-sans select-none">
      {/* Top Bar */}
      <Navbar
        user={user}
        onOpenSettings={() => showToast('Settings configured for Zoom Default User.', 'info')}
        onOpenSchedule={() => setIsScheduleOpen(true)}
        onOpenJoin={() => setIsJoinOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSchedule={() => setIsScheduleOpen(true)}
          onOpenJoin={() => setIsJoinOpen(true)}
          upcomingCount={upcomingMeetings.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
          {/* Quick Actions Matrix & Live Clock Banner */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* 3 Zoom Classic Action Tiles (Share Screen removed as requested) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* New Meeting (Iconic Zoom Orange) */}
              <button
                onClick={handleCreateInstantMeeting}
                disabled={creatingInstant}
                className="bg-white hover:bg-orange-50/40 border border-gray-200 hover:border-orange-300 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 transition shadow-xs hover:shadow-md group disabled:opacity-50 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF7426] flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-900 block">New Meeting</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Start instant</span>
                </div>
              </button>

              {/* Join Meeting (Zoom Blue) */}
              <button
                onClick={() => setIsJoinOpen(true)}
                className="bg-white hover:bg-blue-50/40 border border-gray-200 hover:border-blue-300 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 transition shadow-xs hover:shadow-md group text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#0E71EB] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
                  <Plus className="w-7 h-7" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-900 block">Join</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Enter meeting ID</span>
                </div>
              </button>

              {/* Schedule (Calendar Emerald) */}
              <button
                onClick={() => setIsScheduleOpen(true)}
                className="bg-white hover:bg-emerald-50/40 border border-gray-200 hover:border-emerald-300 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 transition shadow-xs hover:shadow-md group text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-900 block">Schedule</span>
                  <span className="text-xs text-gray-500 block mt-0.5">Plan ahead</span>
                </div>
              </button>
            </div>

            {/* Live Clock & Personal ID Card */}
            <div className="lg:col-span-4 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400">
                    Live Clock
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-600 text-[10px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Synchronized</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mt-1 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-gray-400 text-[10px] block">Personal Meeting ID (PMI)</span>
                  <span className="font-mono text-gray-800 text-xs font-semibold">345-890-123</span>
                </div>
                <button
                  onClick={copyPersonalId}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition text-xs flex items-center space-x-1"
                  title="Copy PMI"
                >
                  {pmIdCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Tab Navigation header */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('home')}
                className={`text-xs font-semibold pb-2 border-b-2 transition ${
                  activeTab === 'home'
                    ? 'border-[#0E71EB] text-[#0E71EB]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                All Meetings
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`text-xs font-semibold pb-2 border-b-2 transition flex items-center space-x-1.5 ${
                  activeTab === 'upcoming'
                    ? 'border-[#0E71EB] text-[#0E71EB]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>Upcoming</span>
                <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.2 rounded-full">
                  {upcomingMeetings.length}
                </span>
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition border border-gray-200 text-xs flex items-center space-x-1 shadow-xs"
              title="Refresh meetings data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[11px] hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Upcoming Meetings Section */}
          {(activeTab === 'home' || activeTab === 'upcoming') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Upcoming Meetings</h2>
                  <span className="text-xs text-gray-500">({upcomingMeetings.length})</span>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-4 h-36 animate-pulse"
                    />
                  ))}
                </div>
              ) : upcomingMeetings.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">No Upcoming Meetings</div>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                      You have no scheduled calls. Click "Schedule" to create a meeting invitation.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsScheduleOpen(true)}
                    className="px-4 py-2 bg-[#0E71EB] hover:bg-[#0b5cbe] text-white text-xs font-semibold rounded-lg transition shadow-xs"
                  >
                    Schedule Meeting
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      type="upcoming"
                      onCopyLink={() => showToast('Invite link copied to clipboard', 'success')}
                      onDelete={handleDeleteMeeting}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* Modals */}
      <JoinModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
      <ScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={handleScheduleSuccess}
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
