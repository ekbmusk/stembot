import axios from 'axios';

import { getInitData } from '../lib/telegram';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const initData = getInitData();
  if (initData) {
    config.headers = config.headers ?? {};
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    // Surface a normalized error shape to callers.
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Қате орын алды';
    return Promise.reject({ ...error, message });
  },
);
