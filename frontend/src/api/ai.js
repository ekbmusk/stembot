import { apiClient } from './client';

export async function ask(prompt, context) {
  const { data } = await apiClient.post('/ai/ask', { prompt, context });
  return data;
}

export async function hint(taskId, studentAttempt) {
  const { data } = await apiClient.post('/ai/hint', {
    task_id: taskId,
    student_attempt: studentAttempt ?? null,
  });
  return data;
}
