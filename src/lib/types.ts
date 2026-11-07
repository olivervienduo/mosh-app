import type { Gender, Mode, ReactionKind } from './constants';

export type Profile = {
  id: string; name: string; birthdate: string | null; job: string; city: string; bio: string; pronouns: string;
  gender: Gender | null; gender_text: string; open_all: boolean; seek: Gender[]; modes: Mode[];
  lines: Partial<Record<Mode, string>>; tags: string[]; photo_path: string | null; color: string;
  onboarded: boolean; paused: boolean; live_visible: boolean; read_receipts: boolean;
  age_min: number; age_max: number; notify: { matches: boolean; messages: boolean; likes: boolean; events: boolean };
  is_admin: boolean;
};

export type EventRow = {
  id: string; creator_id: string; title: string; category: string; color: string;
  starts_on: string; ends_on: string | null; start_time: string | null; venue: string; city: string;
  description: string; image_path: string | null; ticket_url: string | null; official: boolean;
  partner_place: string | null; partner_deal: string | null; created_at: string;
};

export type DeckCard = {
  id: string; name: string; age: number; job: string; city: string; bio: string; pronouns: string; line: string;
  tags: string[]; photo_path: string | null; color: string; here: boolean;
};

export type LikeRow = { id: string; name: string; age: number; job: string; photo_path: string | null; color: string; pronouns: string; mode: Mode; event_id: string | null; event_title: string | null };

export type ChatRow = {
  match_id: string; mode: Mode; event_id: string | null; event_title: string | null; created_at: string; last_message_at: string;
  other_id: string; other_name: string; other_photo: string | null; other_color: string;
  last_body: string | null; last_kind: 'text' | 'meet' | null; last_sender: string | null; unread: number; here: boolean;
};

export type Meet = { day?: string; when: string; where: string; deal?: string };
export type Message = { id: number; match_id: string; sender_id: string; kind: 'text' | 'meet'; body: string; meet: Meet | null; meet_accepted: boolean; created_at: string; read_at: string | null };

export type Media = { type: 'image' | 'video'; path: string; width?: number; height?: number };
export type FeedPost = {
  id: string; event_id: string; event_title: string; event_color: string; event_official: boolean; event_live: boolean;
  body: string; media: Media[]; pinned: boolean; created_at: string; mine: boolean;
  reactions: Partial<Record<ReactionKind, number>>; my_reaction: ReactionKind | null; comment_count: number; saved: boolean;
  poll: { idx: number; label: string; votes: number }[] | null; my_vote: number | null;
};

export type CommentRow = {
  id: string; parent_id: string | null; body: string; created_at: string; author_id: string; author_name: string;
  author_photo: string | null; author_color: string; is_organiser: boolean; likes: number; liked: boolean; mine: boolean;
};

export type People = {
  joined: number; here: number; me_joined: boolean; me_here: boolean;
  modes: Record<Mode, number>;
  faces: { id: string; name: string; photo_path: string | null; color: string }[];
  here_faces: { id: string; name: string; photo_path: string | null; color: string }[];
};
