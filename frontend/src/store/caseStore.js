import { create } from 'zustand';

import { listCases as apiList, getCase as apiGet } from '../api/cases';
import {
  answerTask as apiAnswer,
  createSubmission,
  finalize as apiFinalize,
} from '../api/submissions';

export const useCaseStore = create((set, get) => ({
  catalogueBySubject: {},
  currentCase: null,
  currentSubmission: null,
  // Per-task answers map for the current draft: { [taskId]: payload }
  draftAnswers: {},
  loading: false,
  error: null,

  async loadCatalogue(subject) {
    const key = subject ?? '__all__';
    if (get().catalogueBySubject[key]) return get().catalogueBySubject[key];
    set({ loading: true, error: null });
    try {
      const data = await apiList(subject ? { subject } : {});
      set((s) => ({
        catalogueBySubject: { ...s.catalogueBySubject, [key]: data },
      }));
      return data;
    } catch (e) {
      set({ error: e.message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  async loadCase(id) {
    set({ loading: true, error: null });
    try {
      const data = await apiGet(id);
      set({ currentCase: data, draftAnswers: {} });
      return data;
    } catch (e) {
      set({ error: e.message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  async ensureSubmission(caseId) {
    if (
      get().currentSubmission &&
      get().currentSubmission.case_id === caseId &&
      get().currentSubmission.status === 'in_progress'
    ) {
      return get().currentSubmission;
    }
    const sub = await createSubmission(caseId);
    set({ currentSubmission: sub });
    return sub;
  },

  setDraftAnswer(taskId, payload) {
    set((s) => ({ draftAnswers: { ...s.draftAnswers, [taskId]: payload } }));
  },

  async pushAnswer(taskId) {
    const sub = get().currentSubmission;
    const payload = get().draftAnswers[taskId];
    if (!sub || !payload) return null;
    const saved = await apiAnswer(sub.id, taskId, payload);
    return saved;
  },

  async finalize() {
    const sub = get().currentSubmission;
    if (!sub) return null;
    const finalSub = await apiFinalize(sub.id);
    set({ currentSubmission: finalSub });
    return finalSub;
  },

  resetCurrent() {
    set({ currentCase: null, currentSubmission: null, draftAnswers: {} });
  },
}));
