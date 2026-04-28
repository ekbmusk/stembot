export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('kk-KZ', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export function formatStatus(status) {
  switch (status) {
    case 'in_progress':
      return 'Орындалуда';
    case 'submitted':
      return 'Тапсырылды';
    case 'graded':
      return 'Бағаланды';
    default:
      return status ?? '—';
  }
}

export function statusTone(status) {
  switch (status) {
    case 'in_progress':
      return 'warn';
    case 'submitted':
      return 'primary';
    case 'graded':
      return 'success';
    default:
      return 'muted';
  }
}
