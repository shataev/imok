export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  notifyViaPush: boolean;
  notifyViaSms: boolean;
  notifyViaEmail: boolean;
  createdAt: string;
}

export interface CreateContactPayload {
  name: string;
  phone: string;
  email?: string;
  notifyViaPush?: boolean;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
}

export interface UpdateContactPayload {
  name?: string;
  phone?: string;
  email?: string | null;
  notifyViaPush?: boolean;
  notifyViaSms?: boolean;
  notifyViaEmail?: boolean;
}
