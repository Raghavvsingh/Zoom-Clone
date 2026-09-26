'use client';

import React from 'react';
import { User } from '@/types';
import { Search, Settings, Bell, HelpCircle, Video, Plus, Calendar } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  user: User | null;
  onOpenSettings?: () => void;
  onOpenSchedule?: () => void;
  onOpenJoin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenSettings,
  onOpenSchedule,
  onOpenJoin,
}) => {
  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-xs">
      {/* Brand & Search */}
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="bg-[#0E71EB] p-1.5 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4.5 4.5A2.5 2.5 0 002 7v10a2.5 2.5 0 002.5 2.5h11a2.5 2.5 0 002.5-2.5V7a2.5 2.5 0 00-2.5-2.5h-11zM19 8.5l3.5-2.5v12L19 15.5v-7z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#0E71EB] flex items-center">
            zoom
            <span className="text-[11px] font-semibold text-gray-600 ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 hidden sm:inline">
              Workplace
            </span>
          </span>
        </Link>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center bg-[#F4F5F8] px-3 py-1.5 rounded-lg text-xs text-gray-800 w-64 border border-gray-200 focus-within:border-[#0E71EB] focus-within:bg-white transition">
          <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search meetings, contacts..."
            className="bg-transparent text-gray-900 focus:outline-none w-full text-xs placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right Controls / Quick Actions & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onOpenSchedule && (
          <button
            onClick={onOpenSchedule}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition border border-gray-200 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Schedule</span>
          </button>
        )}

        {onOpenJoin && (
          <button
            onClick={onOpenJoin}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition border border-gray-200 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#0E71EB]" />
            <span>Join</span>
          </button>
        )}

        <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition relative hidden sm:flex"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#0E71EB] rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 pl-1 cursor-pointer group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0E71EB] flex items-center justify-center font-bold text-xs text-white shadow-xs border border-white">
            {user?.avatar_initials || 'AM'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-gray-900 leading-tight">
              {user?.display_name || 'Alex Morgan'}
            </div>
            <div className="text-[10px] text-gray-500 leading-tight">
              Licensed Host
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
