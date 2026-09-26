import axios from 'axios';
import {
  User,
  Meeting,
  MeetingDetail,
  Participant,
  InstantMeetingPayload,
  ScheduledMeetingPayload,
  JoinMeetingPayload,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const userService = {
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<User>('/api/users/me');
    return res.data;
  },
};

export const meetingService = {
  getUpcomingMeetings: async (): Promise<Meeting[]> => {
    const res = await api.get<{ meetings: Meeting[]; total: number }>('/api/meetings/upcoming');
    return res.data.meetings;
  },

  getRecentMeetings: async (): Promise<Meeting[]> => {
    const res = await api.get<{ meetings: Meeting[]; total: number }>('/api/meetings/recent');
    return res.data.meetings;
  },

  getMeetingByCode: async (code: string): Promise<MeetingDetail> => {
    const res = await api.get<MeetingDetail>(`/api/meetings/${code}`);
    return res.data;
  },

  createInstantMeeting: async (payload?: InstantMeetingPayload): Promise<Meeting> => {
    const res = await api.post<Meeting>('/api/meetings/instant', payload || { title: 'Instant Meeting' });
    return res.data;
  },

  scheduleMeeting: async (payload: ScheduledMeetingPayload): Promise<Meeting> => {
    const res = await api.post<Meeting>('/api/meetings/schedule', payload);
    return res.data;
  },

  deleteMeeting: async (code: string): Promise<void> => {
    await api.delete(`/api/meetings/${code}`);
  },

  joinMeeting: async (code: string, payload: JoinMeetingPayload): Promise<Participant> => {
    const res = await api.post<Participant>(`/api/meetings/${code}/join`, payload);
    return res.data;
  },

  leaveMeeting: async (code: string, participantId: number): Promise<void> => {
    await api.post(`/api/meetings/${code}/leave`, null, {
      params: { participant_id: participantId },
    });
  },

  endMeeting: async (code: string): Promise<Meeting> => {
    const res = await api.post<Meeting>(`/api/meetings/${code}/end`);
    return res.data;
  },

  getParticipants: async (code: string): Promise<Participant[]> => {
    const res = await api.get<Participant[]>(`/api/meetings/${code}/participants`);
    return res.data;
  },

  removeParticipant: async (code: string, participantId: number): Promise<void> => {
    await api.delete(`/api/meetings/${code}/participants/${participantId}`);
  },

  muteAllParticipants: async (code: string): Promise<void> => {
    await api.post(`/api/meetings/${code}/mute-all`);
  },
};

export default api;
