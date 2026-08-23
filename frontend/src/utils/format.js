export function formatStatus(value) {
  if (!value) return '-';

  return value
    .toString()
    .replace(/_/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
