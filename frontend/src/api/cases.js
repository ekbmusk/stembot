import { apiClient } from './client';

export async function listCases({ subject, difficulty, tag } = {}) {
  const { data } = await apiClient.get('/cases/', {
    params: {
      ...(subject ? { subject } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(tag ? { tag } : {}),
    },
  });
  return data;
}

export async function getCase(id) {
  const { data } = await apiClient.get(`/cases/${id}`);
  return data;
}

export async function listAssigned() {
  const { data } = await apiClient.get('/cases/assigned');
  return data;
}

export async function listSubjects() {
  const { data } = await apiClient.get('/cases/subjects');
  return data;
}
