'use strict';
const adsConversion = document.querySelector('meta[name="google-ads-conversion"]')?.content;
const adsId = document.querySelector('meta[name="google-ads-id"]')?.content;
if (adsId) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', adsId);
}
if (adsId && adsConversion) {
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const destination = new URL(anchor.href, location.href);
    if (destination.hostname !== 'wa.me') return;
    const opensHere = (!anchor.target || anchor.target === '_self') &&
      !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;
    let navigated = false;
    const continueToWhatsApp = () => {
      if (!opensHere || navigated) return;
      navigated = true;
      window.location.assign(anchor.href);
    };
    if (opensHere) {
      event.preventDefault();
      // Continue even when the tag is blocked or the network is unavailable.
      window.setTimeout(continueToWhatsApp, 1000);
    }
    // Only the conversion identifier is sent; the WhatsApp message stays private.
    window.gtag('event', 'conversion', {
      send_to: adsConversion, value: 1.0, currency: 'BRL',
      event_callback: continueToWhatsApp, event_timeout: 1000,
    });
  });
}
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
function revealLinkedService() {
  if (!location.hash) return;
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  const details = target?.closest('.service-details');
  if (details) {
    details.open = true;
    target.scrollIntoView();
  }
}
window.addEventListener('hashchange', revealLinkedService);
revealLinkedService();
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
    'Olá! Quero falar sobre meu site',
    `Nome: ${data.get('nome')}`,
    `Tipo de projeto: ${data.get('tipo')}`, `Sobre minha empresa: ${data.get('projeto')}`,
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
