export interface User {
  id: string;
  full_name: string;
  birth_year: number;
  email: string;
  role: "alumni" | "admin";
  profile_completion: number;
  profile?: Profile;
}

export interface Profile {
  user_id: string;
  photo_url?: string;
  phone?: string;
  graduation_year?: number;
  major?: string;
  city?: string;
  job_title?: string;
  company?: string;
  bio?: string;
  linkedin_url?: string;
  instagram_url?: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  content?: string;
  thumbnail?: string;
  category?: string;
  published: boolean;
  can_manage?: boolean;
  created_at: string;
  author_name?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_type: "offline" | "online";
  zoom_link?: string;
  start_time: string;
  end_time?: string;
  thumbnail?: string;
  published?: boolean;
  can_manage?: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  job_type: "full_time" | "part_time" | "remote" | "contract";
  description?: string;
  apply_url?: string;
  expires_at?: string;
  posted_by?: string;
  poster?: {
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    deskripsi?: string;
  };
  published?: boolean;
  can_manage?: boolean;
  created_at: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  form_url: string;
  active?: boolean;
  can_manage?: boolean;
  created_at: string;
}

export interface Alumni {
  id: string;
  full_name: string;
  birth_year: number;
  email: string;
  photo_url?: string;
  city?: string;
  job_title?: string;
  company?: string;
  graduation_year?: number;
  major?: string;
  linkedin_url?: string;
  instagram_url?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
