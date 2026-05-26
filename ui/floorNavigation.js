export function renderFloorTabs(container, floors, current, onSelect) {
  container.innerHTML = '';
  floors.forEach((f, i) => {
    const b = document.createElement('button');
    b.textContent = `${i+1}. ${f.role}`;
    b.className = i===current ? 'active' : '';
    b.onclick = () => onSelect(i);
    container.appendChild(b);
  });
}
