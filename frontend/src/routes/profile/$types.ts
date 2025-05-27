// TypeScript definitions for the profile route

export interface ProfileInterval {
  time: string;
  value: number;
}

export interface Profile {
  dia?: number;
  carbs_hr?: number;
  delay?: number;
  perGIvalues?: boolean;
  carbs_hr_high?: number;
  carbs_hr_medium?: number;
  carbs_hr_low?: number;
  delay_high?: number;
  delay_medium?: number;
  delay_low?: number;
  timezone?: string;
  target_low?: ProfileInterval[];
  target_high?: ProfileInterval[];
  basal?: ProfileInterval[];
  sens?: ProfileInterval[];
  carbratio?: ProfileInterval[];
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

export interface PageData {
  mongoRecords: ProfileRecord[];
  timezones: string[];
}

export interface ActionData {
  success?: boolean;
  message?: string;
  error?: string;
}
