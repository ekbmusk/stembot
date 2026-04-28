import { create } from 'zustand';

export const useUiStore = create((set) => ({
  toast: null,
  showToast(message, tone = 'default') {
    set({ toast: { message, tone, id: Date.now() } });
    setTimeout(() => set({ toast: null }), 2400);
  },
  dismiss() {
    set({ toast: null });
  },
}));
