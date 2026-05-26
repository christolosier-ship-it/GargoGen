const GROUPS = [
  { title: 'Terrain', tools: [['wall','Mur'],['floor','Sol'],['door','Porte'],['entrance','Entrée'],['stairsIn','Escalier entrant'],['stairsOut','Escalier sortant'],['exit','Sortie']] },
  { title: 'Créatures', tools: [['basic','Basique'],['tactical','Tactique'],['special','Spéciale'],['brute','Brute'],['miniBoss','Mini Boss'],['boss','Boss']] },
  { title: 'Éléments', tools: [['interactiveObject','Objet'],['chest','Coffre'],['trap','Piège']] },
  { title: 'Effacer', tools: [['erase','Effacer']] }
];

export function renderTools(container, selected, onPick) {
  container.innerHTML = '';
  for (const group of GROUPS) {
    const card = document.createElement('section'); card.className = 'tool-group';
    const title = document.createElement('h4'); title.textContent = group.title; card.appendChild(title);
    const wrap = document.createElement('div'); wrap.className = 'tool-buttons';
    for (const [value, label] of group.tools) {
      const b = document.createElement('button'); b.textContent = label; b.className = `ghost ${value === selected ? 'active' : ''}`; b.onclick = () => onPick(value); wrap.appendChild(b);
    }
    card.appendChild(wrap); container.appendChild(card);
  }
}
