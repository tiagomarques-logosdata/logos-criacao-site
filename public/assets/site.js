'use strict';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() {
  nav?.classList.remove('open');
  menu?.setAttribute('aria-expanded', 'false');
  menu?.setAttribute('aria-label', 'Abrir menu');
}
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  nav.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeMenu();
    document.querySelector('.solutions')?.removeAttribute('open');
  }
});
document.addEventListener('click', event => {
  const details = document.querySelector('.solutions');
  if (details && !details.contains(event.target)) details.removeAttribute('open');
  if (event.target.closest('#navigation a')) closeMenu();
});
const form = document.querySelector('#quote-form');
const existingSite = document.querySelector('#existing-site');
const urlField = document.querySelector('#site-url-field');
existingSite?.addEventListener('change', () => {
  const hasSite = existingSite.value === 'Sim';
  urlField.hidden = !hasSite;
  const input = urlField.querySelector('input');
  input.disabled = !hasSite;
  input.required = hasSite;
});
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const message = [
    'Olá, gostaria de solicitar um orçamento à Logos Data.',
    `Nome: ${data.get('nome')}`, `Empresa: ${data.get('empresa')}`,
    `WhatsApp: ${data.get('whatsapp')}`, `E-mail: ${data.get('email')}`,
    `Tipo de projeto: ${data.get('tipo')}`, `Projeto: ${data.get('projeto')}`,
    `Já possui site: ${data.get('possuiSite')}`,
    ...(data.get('url') ? [`Site atual: ${data.get('url')}`] : []),
  ].join('\n');
  const link = document.createElement('a');
  link.href = `https://wa.me/5511983195720?text=${encodeURIComponent(message)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Abrir mensagem no WhatsApp →';
  const status = document.querySelector('#form-status');
  status.replaceChildren('Revise e confirme o envio no WhatsApp. Se a janela não abrir, ', link);
  // The click stays within the user's submit action; no message is sent automatically.
  link.click();
});
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(other => {
      other.classList.toggle('active', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });
    let visible = 0;
    document.querySelectorAll('[data-category]').forEach(card => {
      const show = button.dataset.filter === 'Todos' || card.dataset.category === button.dataset.filter;
      card.hidden = !show;
      if (show) visible++;
    });
    document.querySelector('#portfolio-empty').hidden = visible > 0;
  });
});
