import { create } from 'zustand';

import { register as apiRegister } from '../api/users';

export const useUserStore = create((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isAuthenticating: false,
  authError: null,

  async authenticate() {
    if (get().isAuthenticating) return;
    set({ isAuthenticating: true, authError: null });
    try {
      const user = await apiRegister();
      set({ user, role: user.role, isAuthenticated: true });
    } catch (e) {
      set({ authError: e.message ?? 'Кіру кезінде қате' });
    } finally {
      set({ isAuthenticating: false });
    }
  },

  reset() {
    set({ user: null, role: null, isAuthenticated: false });
  },
}));
