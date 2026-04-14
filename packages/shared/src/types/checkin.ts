export type CheckinStatus = 'pending' | 'confirmed' | 'escalated' | 'skipped';

export interface Checkin {
  id: string;
  userId: string;
  scheduledFor: string;
  confirmedAt: string | null;
  escalatedAt: string | null;
  status: CheckinStatus;
  createdAt: string;
}
