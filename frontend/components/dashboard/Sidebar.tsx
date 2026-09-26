'use client';

import React from 'react';
import { Home, Calendar, Video, Plus, ShieldCheck, User } from 'lucide-react';

interface SidebarProps {
  activeTab: 'home' | 'upcoming';
  setActiveTab: (tab: 'home' | 'upcoming') => void;
  onOpenSchedule: () => void;
  onOpenJoin: () => void;
  upcomingCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSchedule,
  onOpenJoin,
  upcomingCount = 0,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'upcoming', label: 'Upcoming Meetings', icon: Calendar, badge: upcomingCount },
  ];

  return (
    <aside className="w-16 md:w-56 bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-3.5rem)] py-4 select-none shadow-xs">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div className="px-2 md:px-3 space-y-1">
          <div className="hidden md:block px-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">
            Zoom Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#EBF3FF] text-[#0E71EB] font-semibold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0E71EB]' : 'text-gray-500'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`hidden md:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#0E71EB] text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-gray-200 mx-3"></div>

        {/* Quick Launch Actions */}
        <div className="px-2 md:px-3 space-y-1">
          <div className="hidden md:block px-3 text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-2">
            Quick Launch
          </div>

          <button
            onClick={onOpenJoin}
            className="w-full flex items-center justify-center md:justify-start space-x-2.5 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <Plus className="w-4 h-4 text-[#0E71EB] shrink-0" />
            <span className="hidden md:inline">Join Meeting</span>
          </button>

          <button
            onClick={onOpenSchedule}
            className="w-full flex items-center justify-center md:justify-start space-x-2.5 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">Schedule Call</span>
          </button>
        </div>
      </div>

      {/* Network / Encryption Status footer */}
      <div className="px-3 hidden md:block">
        <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-gray-200 text-[11px] text-gray-600">
          <div className="flex items-center space-x-1.5 text-gray-800 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Zoom Cloud Audio/Video</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">256-bit AES End-to-End Ready</p>
        </div>
      </div>
    </aside>
  );
};
