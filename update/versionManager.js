export async function checkVersion(current) {
  const local = localStorage.getItem('gargogen:version') || current;
  const res = await fetch(`./version.json?v=${Date.now()}`, { cache: 'no-store' });
  const remote = (await res.json()).version;
  return { local, remote, hasUpdate: local !== remote };
}
export async function applyUpdate(remote) {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) await reg.update();
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith('gargogen-')).map((k) => caches.delete(k)));
  localStorage.setItem('gargogen:version', remote);
  location.reload();
}
