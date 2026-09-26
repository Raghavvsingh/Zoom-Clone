'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { meetingService } from '@/services/api';
import { Meeting } from '@/types';
import { Video, VideoOff, Mic, MicOff, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function JoinMeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const meetingCode = (params.code as string) || '';
  const initialName = searchParams.get('name') || '';

  const [displayName, setDisplayName] = useState(initialName || 'Guest User');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Local media preview state
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate meeting code from backend
  useEffect(() => {
    const validateMeeting = async () => {
      try {
        setLoading(true);
        const data = await meetingService.getMeetingByCode(meetingCode);
        setMeeting(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || `Meeting ID '${meetingCode}' was not found or has ended.`);
      } finally {
        setLoading(false);
      }
    };
    if (meetingCode) {
      validateMeeting();
    }
  }, [meetingCode]);

  // Request camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/mic access error or device unavailable', err);
        setIsVideoOff(true);
        setIsMicMuted(true);
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((t) => (t.enabled = isMicMuted));
    }
    setIsMicMuted(!isMicMuted);
  };

  const toggleVideo = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleEnterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your display name to join the meeting.');
      return;
    }

    try {
      setJoining(true);
      // Join meeting on backend
      await meetingService.joinMeeting(meetingCode, { display_name: displayName.trim() });
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      router.push(
        `/meeting/${meetingCode}?name=${encodeURIComponent(displayName.trim())}&mic=${!isMicMuted}&cam=${!isVideoOff}`
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to join meeting room.');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-gray-900 flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Header */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center space-x-2">
          <div className="bg-[#0E71EB] p-1.5 rounded-lg flex items-center justify-center shadow-xs">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4.5 4.5A2.5 2.5 0 002 7v10a2.5 2.5 0 002.5 2.5h11a2.5 2.5 0 002.5-2.5V7a2.5 2.5 0 00-2.5-2.5h-11zM19 8.5l3.5-2.5v12L19 15.5v-7z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#0E71EB]">zoom</span>
        </div>
      </header>

      {/* Main Join Container */}
      <div className="max-w-4xl mx-auto w-full my-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-6">
        {/* Left Side: Video Preview Box */}
        <div className="md:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-4 space-y-4">
          <div className="relative aspect-video bg-[#121418] rounded-xl overflow-hidden flex items-center justify-center border border-gray-900">
            {!isVideoOff && mediaStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center space-y-2 text-gray-400">
                <div className="w-20 h-20 rounded-full bg-[#272b35] border border-gray-700 flex items-center justify-center text-xl font-bold text-white">
                  {displayName ? displayName.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span className="text-xs text-gray-500">Camera is turned off</span>
              </div>
            )}

            {/* Display name tag */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-xs font-medium text-white">
              {displayName || 'Preview'}
            </div>
          </div>

          {/* Quick Media Toggles */}
          <div className="flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={toggleMic}
              className={`p-2.5 rounded-full transition border ${
                isMicMuted
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-emerald-600'
              }`}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-600" />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`p-2.5 rounded-full transition border ${
                isVideoOff
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-[#0E71EB]'
              }`}
              title={isVideoOff ? 'Start video' : 'Stop video'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-[#0E71EB]" />}
            </button>
          </div>
        </div>

        {/* Right Side: Join Meeting Card */}
        <div className="md:col-span-5 space-y-4">
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <div className="w-7 h-7 border-2 border-[#0E71EB] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div className="text-xs font-medium text-gray-600">Validating Meeting ID...</div>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-3 text-center shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">Meeting Unavailable</h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
              </div>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-[#0E71EB] hover:bg-[#0b5cbe] text-white rounded-lg text-xs font-semibold transition shadow-xs"
              >
                Return to Dashboard
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 font-semibold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Meeting</span>
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  {meeting?.title || 'Zoom Meeting'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Meeting ID: <span className="font-mono text-gray-800">{meetingCode}</span>
                </p>
              </div>

              <form onSubmit={handleEnterRoom} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-[#F8FAFC] border border-gray-300 focus:border-[#0E71EB] focus:bg-white text-gray-900 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none transition"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={joining}
                  className="w-full py-2.5 bg-[#0E71EB] hover:bg-[#0b5cbe] text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  {joining ? <span>Connecting...</span> : <span>Join Meeting</span>}
                </button>
              </form>

              <div className="text-[10px] text-gray-400 text-center leading-relaxed">
                By clicking Join, you agree to our Terms of Service and Privacy Statement.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-gray-600 max-w-4xl mx-auto w-full">
        Zoom Video Communications, Inc. All rights reserved.
      </footer>
    </div>
  );
}
