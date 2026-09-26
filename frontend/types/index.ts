export type MeetingStatus = 'scheduled' | 'active' | 'ended';
export type MeetingType = 'instant' | 'scheduled';

export interface User {
  id: number;
  display_name: string;
  email: string;
  avatar_initials?: string;
  is_default: boolean;
  created_at: string;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  title: string;
  description?: string;
  host_id: number;
  host_display_name?: string;
  status: MeetingStatus;
  meeting_type: MeetingType;
  scheduled_at?: string;
  duration_minutes: number;
  invite_link?: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  participant_count: number;
}

export interface Participant {
  id: number;
  meeting_id: number;
  display_name: string;
  is_host: boolean;
  is_muted: boolean;
  is_video_off: boolean;
  joined_at: string;
  left_at?: string;
}

export interface MeetingDetail extends Meeting {
  participants: Participant[];
}

export interface InstantMeetingPayload {
  title?: string;
  host_display_name?: string;
}

export interface ScheduledMeetingPayload {
  title: string;
  description?: string;
  scheduled_at: string; // ISO string
  duration_minutes: number;
}

export interface JoinMeetingPayload {
  display_name: string;
}
