import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send cookies (refresh_token)
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  console.log("Request interceptor - Token:", token ? "Present" : "Missing");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("Authorization header set");
  } else {
    console.warn(" No access token found in store");
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

// Auto refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log all errors for debugging
    console.error("API Error:", {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log("Got 401, attempting token refresh...");
      
      if (isRefreshing) {
        console.log("Already refreshing, queuing request...");
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("Calling refresh token endpoint...");
        const res = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = res.data.data.access_token;
        console.log("Token refreshed successfully");
        
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        console.error("Token refresh failed:", err);
        console.log("Logging out and redirecting to login...");
        processQueue(err, null);
        useAuthStore.getState().logout();
        
        // Add delay to see error before redirect
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
        
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Public endpoints
export const publicApi = {
  getNews: (page = 1, limit = 10) =>
    api.get(`/api/public/news?page=${page}&limit=${limit}`),
  getNewsBySlug: (slug: string) =>
    api.get(`/api/public/news/${slug}`),
  getEvents: (page = 1, limit = 10) =>
    api.get(`/api/public/events?page=${page}&limit=${limit}`),
  getEventById: (id: string) =>
    api.get(`/api/public/events/${id}`),
};

// Auth endpoints
export const authApi = {
  register: (data: {
    full_name: string;
    birth_year: number;
    email: string;
    password: string;
  }) => api.post("/api/auth/register", data),
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout"),
  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post("/api/auth/reset-password", { token, new_password }),
};

// Private endpoints
export const privateApi = {
  getProfile: () => api.get("/api/private/profile"),
  updateProfile: (data: Record<string, unknown>) =>
    api.put("/api/private/profile", data),
  uploadProfilePhoto: (file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return api.post("/api/private/upload/profile-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getDirectory: (q = "", page = 1, limit = 12) =>
    api.get(`/api/private/directory?q=${q}&page=${page}&limit=${limit}`),
  createDirectoryAlumni: (data: {
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
  }) => api.post("/api/private/directory", data),
  updateDirectoryAlumni: (id: string, data: {
    full_name?: string;
    birth_year?: number;
    email?: string;
    photo_url?: string;
    city?: string;
    job_title?: string;
    company?: string;
    graduation_year?: number;
    major?: string;
    linkedin_url?: string;
    instagram_url?: string;
  }) => api.put(`/api/private/directory/${id}`, data),
  deleteDirectoryAlumni: (id: string) =>
    api.delete(`/api/private/directory/${id}`),
  listNewsPrivate: (page = 1, limit = 10) =>
    api.get(`/api/private/news?page=${page}&limit=${limit}`),
  createNews: (data: {
    title: string;
    content: string;
    thumbnail?: string;
    category?: string;
    published?: boolean;
  }) => api.post("/api/private/news", data),
  updateNews: (id: string, data: {
    title?: string;
    content?: string;
    thumbnail?: string;
    category?: string;
    published?: boolean;
  }) => api.put(`/api/private/news/${id}`, data),
  deleteNews: (id: string) =>
    api.delete(`/api/private/news/${id}`),
  getJobs: (page = 1, limit = 10) =>
    api.get(`/api/private/jobs?page=${page}&limit=${limit}`),
  getJobById: (id: string) =>
    api.get(`/api/private/jobs/${id}`),
  createJob: (data: {
    title: string;
    company: string;
    location?: string;
    job_type?: "full_time" | "part_time" | "remote" | "contract";
    description?: string;
    apply_url?: string;
    expires_at?: string;
    published?: boolean;
  }) => api.post("/api/private/jobs", data),
  updateJob: (id: string, data: {
    title?: string;
    company?: string;
    location?: string;
    job_type?: "full_time" | "part_time" | "remote" | "contract";
    description?: string;
    apply_url?: string;
    expires_at?: string;
    published?: boolean;
  }) => api.put(`/api/private/jobs/${id}`, data),
  deleteJob: (id: string) =>
    api.delete(`/api/private/jobs/${id}`),
  getSurveys: () => api.get("/api/private/surveys"),
  createSurvey: (data: {
    title: string;
    description?: string;
    form_url: string;
    active?: boolean;
  }) => api.post("/api/private/surveys", data),
  updateSurvey: (id: string, data: {
    title?: string;
    description?: string;
    form_url?: string;
    active?: boolean;
  }) => api.put(`/api/private/surveys/${id}`, data),
  deleteSurvey: (id: string) =>
    api.delete(`/api/private/surveys/${id}`),
  // Events (private CRUD)
  listEvents: (page = 1, limit = 10) =>
    api.get(`/api/private/events?page=${page}&limit=${limit}`),
  getEventPrivate: (id: string) =>
    api.get(`/api/private/events/${id}`),
  createEvent: (data: {
    title: string;
    description?: string;
    location?: string;
    event_type?: "offline" | "online";
    zoom_link?: string;
    start_time: string;
    end_time?: string;
    thumbnail?: string;
    published?: boolean;
  }) => api.post("/api/private/events", data),
  updateEvent: (id: string, data: {
    title?: string;
    description?: string;
    location?: string;
    event_type?: "offline" | "online";
    zoom_link?: string;
    start_time?: string;
    end_time?: string;
    thumbnail?: string;
    published?: boolean;
  }) => api.put(`/api/private/events/${id}`, data),
  deleteEvent: (id: string) =>
    api.delete(`/api/private/events/${id}`),
  registerEvent: (eventId: string, status = "registered") =>
    api.post(`/api/private/events/${eventId}/register`, { status }),
  getEventRegistration: (eventId: string) =>
    api.get(`/api/private/events/${eventId}/registration`),
  getAdminMajorStats: () =>
    api.get("/api/private/stats/admin-major"),
  getMemberRegionStats: () =>
    api.get("/api/private/stats/member-region"),
  listAdmins: () =>
    api.get("/api/private/admins"),
  createAdmin: (data: {
    full_name: string;
    birth_year: number;
    email: string;
    password: string;
    major?: string;
    city?: string;
  }) => api.post("/api/private/admins", data),
  updateAdmin: (id: string, data: {
    full_name?: string;
    birth_year?: number;
    email?: string;
    password?: string;
    major?: string;
    city?: string;
    status?: "unverified" | "active" | "suspended";
  }) => api.put(`/api/private/admins/${id}`, data),
  deleteAdmin: (id: string) =>
    api.delete(`/api/private/admins/${id}`),
};
