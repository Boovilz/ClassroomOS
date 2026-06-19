import { create } from "zustand";
import type { AppUser, Role } from "@/lib/types";

interface AuthState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));

/** Convenience hook: the currently signed-in app user (or null). */
export function useUser(): AppUser | null {
  return useAuthStore((state) => state.user);
}

/** Convenience hook: the currently signed-in user's role (or null). */
export function useRole(): Role | null {
  return useAuthStore((state) => state.user?.role ?? null);
}
