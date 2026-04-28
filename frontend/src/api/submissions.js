import { apiClient } from './client';

export async function createSubmission(caseId) {
  const { data } = await apiClient.post('/submissions/', { case_id: caseId });
  return data;
}

export async function getSubmission(id) {
  const { data } = await apiClient.get(`/submissions/${id}`);
  return data;
}

export async function listMine() {
  const { data } = await apiClient.get('/submissions/mine');
  return data;
}

export async function answerTask(submissionId, taskId, payload) {
  const { data } = await apiClient.post(`/submissions/${submissionId}/answers`, {
    task_id: taskId,
    payload,
  });
  return data;
}

export async function finalize(submissionId) {
  const { data } = await apiClient.post(`/submissions/${submissionId}/finalize`);
  return data;
}

export async function uploadFiles(caseId, files) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const { data } = await apiClient.post(`/uploads/submissions/${caseId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
