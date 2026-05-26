import { DIFFICULTIES, STRUCTURES } from '../data/generationRules.js';

export function getSettingsFromForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function initSettings(form, initial) {
  form.innerHTML = `
  <label>Donjon<select name="dungeonName"><option>Le Château de Bastognac</option></select></label>
  <label>Taille<select name="size"><option>Petit</option><option selected>Moyen</option><option>Grand</option></select></label>
  <label>Structure<select name="structure">${STRUCTURES.map(s=>`<option>${s}</option>`).join('')}</select></label>
  <label>Difficulté<select name="difficulty">${DIFFICULTIES.map(s=>`<option>${s}</option>`).join('')}</select></label>
  <label>Héros<select name="heroes"><option>1</option><option>2</option><option selected>3</option><option>4</option></select></label>`;
  if (initial) for (const [k,v] of Object.entries(initial)) if (form.elements[k]) form.elements[k].value = v;
}
