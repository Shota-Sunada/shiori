export const pad2 = (n?: number) => (typeof n === 'number' ? String(n).padStart(2, '0') : '');
