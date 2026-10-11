const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!expanded));
  menu.setAttribute('aria-label', expanded ? 'Abrir menu' : 'Fechar menu');
  navigation.classList.toggle('open', !expanded);
});
navigation.querySelectorAll('a, button').forEach(item => item.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('open');
}));
const booking = document.querySelector('#booking');
const form = document.querySelector('#appointment');
const inputView = document.querySelector('#booking-form');
const resultView = document.querySelector('#booking-result');
function resetBooking() { inputView.hidden = false; resultView.hidden = true; form.reset(); }
document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
  resetBooking(); document.querySelector('#specialty').value = button.dataset.specialty || ''; booking.showModal();
}));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const values = new FormData(form);
  document.querySelector('#booking-summary').textContent = `${document.querySelector('#specialty').value} · Preferência: ${values.get('period')}.`;
  inputView.hidden = true; resultView.hidden = false; document.querySelector('#result-title').focus();
});
document.querySelector('#booking-reset').addEventListener('click', () => { resetBooking(); document.querySelector('#specialty').focus(); });
document.querySelector('#privacy-open').addEventListener('click', () => document.querySelector('#privacy').showModal());
document.querySelector('#year').textContent = new Date().getFullYear();
