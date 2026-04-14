export interface User {
  id: string;
  phone: string;
  name: string;
  timezone: string;
  checkinTime: string; // "HH:MM" local time
  gracePeriodMin: number;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateUserPayload {
  name?: string;
  timezone?: string;
  checkinTime?: string;
  gracePeriodMin?: number;
}
