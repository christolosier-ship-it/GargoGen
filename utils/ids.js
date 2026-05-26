export const uid = (prefix = 'id') => `${prefix}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
