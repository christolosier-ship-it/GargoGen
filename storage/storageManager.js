const KEY_DUNGEON = 'gargogen:lastDungeon';
const KEY_SETTINGS = 'gargogen:lastSettings';
export const saveDungeon = (d) => localStorage.setItem(KEY_DUNGEON, JSON.stringify(d));
export const loadDungeon = () => JSON.parse(localStorage.getItem(KEY_DUNGEON) || 'null');
export const saveSettings = (s) => localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
export const loadSettings = () => JSON.parse(localStorage.getItem(KEY_SETTINGS) || 'null');
