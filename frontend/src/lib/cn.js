export function cn(...inputs) {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .filter((x) => typeof x === 'string')
    .join(' ');
}
