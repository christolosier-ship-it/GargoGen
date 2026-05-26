export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[randInt(0, arr.length - 1)];
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
