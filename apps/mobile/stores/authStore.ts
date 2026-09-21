// ============================================================
// BarberQ — Auth store (Zustand)
// Holds session, user profile, and role.
// Used throughout the app for auth checks and user data.
// ============================================================

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session:   null,
  user:      null,
  role:      null,
  isLoading: true,

  setSession: (session) =>
    set({ session }),

  setUser: (user) =>
    set({ user, role: user?.role ?? null }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  signOut: () =>
    set({ session: null, user: null, role: null }),
}));
