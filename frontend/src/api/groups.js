import { apiClient } from './client';

export async function listGroups() {
  const { data } = await apiClient.get('/groups/');
  return data;
}

export async function createGroup(payload) {
  const { data } = await apiClient.post('/groups/', payload);
  return data;
}

export async function enroll(groupId, userId) {
  const { data } = await apiClient.post(`/groups/${groupId}/enroll`, { user_id: userId });
  return data;
}

export async function unenroll(groupId, studentId) {
  const { data } = await apiClient.delete(`/groups/${groupId}/enroll/${studentId}`);
  return data;
}

export async function assignCase(groupId, payload) {
  const { data } = await apiClient.post(`/groups/${groupId}/assign-case`, payload);
  return data;
}

export async function getProgress(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/progress`);
  return data;
}
