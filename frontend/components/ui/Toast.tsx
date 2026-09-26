'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-zoom-blue shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80',
    error: 'border-rose-500/30 bg-rose-950/80',
    info: 'border-zoom-blue/30 bg-zoom-dark-card',
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-md transition-all animate-bounce-in max-w-sm ${borders[type]}`}
    >
      {icons[type]}
      <span className="text-xs md:text-sm font-medium text-white">{message}</span>
      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-white rounded-md transition ml-2"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
