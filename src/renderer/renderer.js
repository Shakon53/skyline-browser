const params = new URLSearchParams(location.search);
const partition = params.get('partition') || 'persist:browser';
const tabs = new Map();
let activeId = null;
let counter = 0;
let bookmarks = JSON.parse(localStorage.getItem('skyline-bookmarks') || '[]');
let history = JSON.parse(localStorage.getItem('skyline-history') || '[]');
const $ = (id) => document.getElementById(id);
const pages = $('pages');
const strip = $('tab-strip');
const address = $('address');
const menu = $('app-menu');
const HOME = new URL('newtab.html', location.href).href;

function isHome(url = '') { return url.split('#')[0] === HOME.split('#')[0]; }
function toUrl(value) {
  const text = value.trim();
  if (!text) return HOME;
  if (/^(https?|file):\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}
function setSidebarState(url = '') {
  document.querySelectorAll('.browser-sidebar nav button').forEach((button) => button.classList.remove('active'));
  if (!isHome(url)) return;
  const key = url.includes('#news') ? 'news' : 'home';
  document.querySelector(`.browser-sidebar [data-nav="${key}"]`)?.classList.add('active');
}
function selectTab(id) {
  activeId = id;
  tabs.forEach((tab, key) => {
    tab.node.classList.toggle('active', key === id);
    tab.page.classList.toggle('active', key === id);
  });
  const tab = tabs.get(id); if (!tab) return;
  const url = tab.view.getURL?.() || '';
  address.value = isHome(url) ? '' : url;
  setSidebarState(url);
  updateControls();
}
function updateControls() {
  const tab = tabs.get(activeId); if (!tab) return;
  $('back').disabled = !tab.view.canGoBack?.();
  $('forward').disabled = !tab.view.canGoForward?.();
}
function addHistory(url, title) {
  if (!url || isHome(url) || url.startsWith('file:')) return;
  history.unshift({ url, title: title || url, time: Date.now() });
  history = history.slice(0, 100);
  localStorage.setItem('skyline-history', JSON.stringify(history));
}
function createTab(url = HOME) {
  const id = `tab-${++counter}`;
  const node = $('tab-template').content.firstElementChild.cloneNode(true);
  const title = node.querySelector('.tab-title');
  const page = document.createElement('section'); page.className = 'page';
  const view = document.createElement('webview');
  view.setAttribute('partition', partition); view.setAttribute('allowpopups', ''); view.src = url;
  page.append(view); pages.append(page); strip.insertBefore(node, $('new-tab'));
  tabs.set(id, { id, node, title, page, view });
  node.onclick = () => selectTab(id);
  node.querySelector('.close-tab').onclick = (event) => { event.stopPropagation(); closeTab(id); };
  view.addEventListener('did-start-loading', () => node.classList.add('loading'));
  view.addEventListener('did-stop-loading', () => { node.classList.remove('loading'); if (activeId === id) updateControls(); });
  view.addEventListener('page-title-updated', (event) => { title.textContent = isHome(view.getURL()) ? 'Skyline' : event.title || 'Жаңа қойынды'; });
  view.addEventListener('did-navigate', (event) => syncNavigation(id, event.url));
  view.addEventListener('did-navigate-in-page', (event) => syncNavigation(id, event.url));
  view.addEventListener('new-window', (event) => createTab(event.url));
  selectTab(id);
}
function syncNavigation(id, url) {
  const tab = tabs.get(id); if (!tab) return;
  if (activeId === id) {
    address.value = isHome(url) ? '' : url;
    setSidebarState(url);
    updateControls();
  }
  if (!isHome(url)) addHistory(url, tab.view.getTitle());
}
function closeTab(id) {
  const keys = [...tabs.keys()], index = keys.indexOf(id), tab = tabs.get(id); if (!tab) return;
  tab.node.remove(); tab.page.remove(); tabs.delete(id);
  if (!tabs.size) return createTab();
  if (activeId === id) selectTab(keys[index + 1] && tabs.has(keys[index + 1]) ? keys[index + 1] : [...tabs.keys()][Math.max(0, index - 1)]);
}
function navigate(value) { tabs.get(activeId)?.view.loadURL?.(toUrl(value)); }
function escapeHtml(value) { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; }
function showInternal(route) {
  const names = { history: 'Тарих', bookmarks: 'Бетбелгілер', downloads: 'Жүктеулер', settings: 'Баптаулар' };
  const data = route === 'history' ? history : route === 'bookmarks' ? bookmarks : [];
  const id = `tab-${++counter}`, node = $('tab-template').content.firstElementChild.cloneNode(true), title = node.querySelector('.tab-title'), page = document.createElement('section');
  title.textContent = names[route]; page.className = 'page internal';
  page.innerHTML = `<h1>${names[route]}</h1>${data.length ? data.map((item) => `<div class="internal-card"><div class="grow"><strong>${escapeHtml(item.title || item.url)}</strong><span>${escapeHtml(item.url)}</span></div><button data-open="${encodeURIComponent(item.url)}">Ашу</button></div>`).join('') : '<div class="empty">Әзірге ештеңе жоқ</div>'}`;
  page.onclick = (event) => { const button = event.target.closest('[data-open]'); if (button) { createTab(decodeURIComponent(button.dataset.open)); closeTab(id); } };
  pages.append(page); strip.insertBefore(node, $('new-tab'));
  const fake = { getURL: () => '', canGoBack: () => false, canGoForward: () => false };
  tabs.set(id, { id, node, title, page, view: fake });
  node.onclick = () => selectTab(id); node.querySelector('.close-tab').onclick = (event) => { event.stopPropagation(); closeTab(id); };
  selectTab(id); setSidebarState('');
}
function renderBookmarks() {
  const bar = $('bookmark-bar'); bar.innerHTML = '';
  bookmarks.forEach((item) => { const link = document.createElement('a'); link.href = '#'; link.textContent = item.title || item.url; link.onclick = (event) => { event.preventDefault(); navigate(item.url); }; bar.append(link); });
}

$('new-tab').onclick = () => createTab();
$('back').onclick = () => tabs.get(activeId)?.view.goBack?.();
$('forward').onclick = () => tabs.get(activeId)?.view.goForward?.();
$('reload').onclick = () => tabs.get(activeId)?.view.reload?.();
$('address-form').onsubmit = (event) => { event.preventDefault(); navigate(address.value); $('suggestions').classList.remove('visible'); };
$('bookmark').onclick = () => { const tab = tabs.get(activeId), url = tab?.view.getURL?.(); if (!url || isHome(url)) return; bookmarks.unshift({ url, title: tab.view.getTitle() || url }); localStorage.setItem('skyline-bookmarks', JSON.stringify(bookmarks)); renderBookmarks(); };
$('downloads').onclick = () => showInternal('downloads');
$('menu').onclick = (event) => { event.stopPropagation(); menu.classList.toggle('hidden'); };

document.querySelector('.browser-sidebar').onclick = (event) => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.nav === 'home') navigate(HOME);
  if (button.dataset.nav === 'news') navigate(`${HOME}#news`);
  if (button.dataset.nav === 'search') { address.focus(); address.select(); }
  if (button.dataset.url) navigate(button.dataset.url);
  if (button.dataset.route) showInternal(button.dataset.route);
};
menu.onclick = (event) => { const button = event.target.closest('button'); if (!button) return; menu.classList.add('hidden'); if (button.dataset.route) showInternal(button.dataset.route); if (button.dataset.command === 'new-tab') createTab(); if (button.dataset.command === 'private') window.desktop.newPrivateWindow(); if (button.dataset.command === 'devtools') tabs.get(activeId)?.view.openDevTools?.(); };
document.addEventListener('click', () => menu.classList.add('hidden'));
document.addEventListener('keydown', (event) => { if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); address.focus(); address.select(); } if (event.ctrlKey && event.key.toLowerCase() === 't') { event.preventDefault(); createTab(); } if (event.ctrlKey && event.key.toLowerCase() === 'w') { event.preventDefault(); closeTab(activeId); } });
address.oninput = () => { const box = $('suggestions'), query = address.value.trim(); if (!query) { box.classList.remove('visible'); return; } const hits = [...history, ...bookmarks].filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url) === index).filter((item) => `${item.title}${item.url}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5); box.innerHTML = hits.map((item) => `<button class="suggestion" data-url="${encodeURIComponent(item.url)}"><span>${escapeHtml(item.title || item.url)}</span><small>${escapeHtml(item.url)}</small></button>`).join(''); box.classList.toggle('visible', Boolean(hits.length)); };
$('suggestions').onclick = (event) => { const button = event.target.closest('[data-url]'); if (button) navigate(decodeURIComponent(button.dataset.url)); };
renderBookmarks(); createTab();
