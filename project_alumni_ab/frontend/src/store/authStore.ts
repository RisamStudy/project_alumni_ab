import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateProfileCompletion: (pct: number) => void;
  updateProfilePhoto: (photoUrl: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAccessToken: (token) => set({ accessToken: token }),

      setUser: (user) => set({ user }),

      login: (token, user) =>
        set({ accessToken: token, user, isAuthenticated: true }),

      logout: () =>
        set({ accessToken: null, user: null, isAuthenticated: false }),

      updateProfileCompletion: (pct) =>
        set((state) => ({
          user: state.user ? { ...state.user, profile_completion: pct } : null,
        })),

      updateProfilePhoto: (photoUrl) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                profile: {
                  ...state.user.profile,
                  user_id: state.user.id,
                  photo_url: photoUrl,
                },
              }
            : null,
        })),
    }),
    {
      name: "auth-storage",
      // Persist everything including access token
      // Note: This is less secure but more convenient for development
      // For production, consider using httpOnly cookies for access token too
    }
  )
);
