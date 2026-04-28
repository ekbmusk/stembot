import { apiClient } from './client';

export async function getStats() {
  const { data } = await apiClient.get('/teacher/stats');
  return data;
}

export async function listStudents(groupId) {
  const { data } = await apiClient.get('/teacher/students', {
    params: groupId ? { group_id: groupId } : {},
  });
  return data;
}

export async function listSubmissions({ groupId, caseId, status } = {}) {
  const { data } = await apiClient.get('/teacher/submissions', {
    params: {
      ...(groupId ? { group_id: groupId } : {}),
      ...(caseId ? { case_id: caseId } : {}),
      ...(status ? { status } : {}),
    },
  });
  return data;
}

export async function broadcast(payload) {
  const { data } = await apiClient.post('/teacher/broadcast', payload);
  return data;
}

export async function createCase(payload) {
  const { data } = await apiClient.post('/teacher/cases', payload);
  return data;
}

export async function updateCase(caseId, payload) {
  const { data } = await apiClient.patch(`/teacher/cases/${caseId}`, payload);
  return data;
}

export async function gradeSubmission(submissionId, payload) {
  const { data } = await apiClient.patch(
    `/teacher/submissions/${submissionId}/grade`,
    payload,
  );
  return data;
}
