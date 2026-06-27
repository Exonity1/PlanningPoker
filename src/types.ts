export interface Participant {
  user_id: string;
  name: string;
  vote: string | null;
  online_at?: string;
}

export interface Room {
  id: string;
  is_revealed: boolean;
  created_at: string;
}

export type ViewType = 'landing' | 'room';
