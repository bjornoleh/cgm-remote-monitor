// TypeScript definitions for the profile route

import type { Profile } from "$lib";

export interface ProfileInterval {
  time: string;
  value: number;
}

export interface ProfileRecord {
  _id?: string;
  startDate: string;
  defaultProfile: string;
  store: Record<string, Profile>;
  created_at?: string;
  srvModified?: number;
  srvCreated?: number;
  identifier?: string;
  mills?: number;
}


export interface ActionData {
  success?: boolean;
  message?: string;
  error?: string;
}
