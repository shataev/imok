export interface Pause {
  id: string;
  userId: string;
  pauseFrom: string; // ISO date "YYYY-MM-DD"
  pauseUntil: string; // ISO date "YYYY-MM-DD"
  reason: string | null;
  createdAt: string;
}

export interface CreatePausePayload {
  pauseFrom: string;
  pauseUntil: string;
  reason?: string;
}
