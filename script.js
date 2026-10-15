const opener = document.getElementById('open-nav-sidebar');
const sidebar = document.getElementById('sidebar-container-navigation-id');
const closer = document.getElementById('sidebar-navigation-close');
let previousOverflow = '';
sidebar.inert = true;
function setMenu(open) {
  if (open && !sidebar.classList.contains('slidebar-show')) previousOverflow = document.body.style.overflow;
  sidebar.classList.toggle('slidebar-show', open);
  sidebar.inert = !open;
  opener.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : previousOverflow;
  (open ? closer : opener).focus();
}
opener.addEventListener('click', () => setMenu(true));
opener.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setMenu(true); }
});
closer.addEventListener('click', () => setMenu(false));
sidebar.addEventListener('click', event => { if (event.target === sidebar) setMenu(false); });
sidebar.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenu(false);
  if (event.key === 'Tab') { event.preventDefault(); closer.focus(); }
});
const search = document.querySelector('.search-input');
const cards = [...document.querySelectorAll('.card-product')];
const status = document.getElementById('search-status');
function filterProducts() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  for (const card of cards) {
    card.hidden = !card.textContent.toLowerCase().includes(query);
    if (!card.hidden) visible += 1;
  }
  status.textContent = query ? `${visible} matching product sections` : '';
}
search.addEventListener('input', filterProducts);
document.querySelector('.search-icon').addEventListener('click', filterProducts);
