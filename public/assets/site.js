'use strict';
const adsConversion = document.querySelector('meta[name="google-ads-conversion"]')?.content;
const adsId = document.querySelector('meta[name="google-ads-id"]')?.content;
if (adsId) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', adsId);
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
let leadRequest = null;
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  const status = document.querySelector('#form-status');
  const data = new FormData(form);
  const details = {name: String(data.get('nome')).trim(), whatsapp: String(data.get('whatsapp')).trim(), consent: data.get('consent') === 'on', website: data.get('website') || ''};
  const signature = JSON.stringify(details);
  if (!leadRequest || leadRequest.signature !== signature) leadRequest = {signature, id: crypto.randomUUID()};
  button.disabled = true;
  status.textContent = 'Enviando seu contato…';
  try {
    const response = await fetch('/api/workflow?action=lead', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...details,id:leadRequest.id})});
    const result = await response.json();
    if (!response.ok || result.accepted !== true || result.id !== leadRequest.id) throw Error(result.error || 'Não foi possível salvar seu contato. Tente novamente.');
    form.hidden = true;
    const success = document.querySelector('#lead-success');
    success.hidden = false;
    success.focus();
    if (adsId && adsConversion) {
      // Only a successfully saved contact counts; never send name or phone to the tag.
      window.gtag('event','conversion',{send_to:adsConversion,transaction_id:result.id});
    }
    form.reset();
  } catch (error) {
    status.textContent = error.message || 'Não foi possível enviar. Tente novamente ou use o botão WhatsApp no início da página.';
    button.disabled = false;
  }
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

document.querySelectorAll('[data-plena-view]').forEach(button => {
  button.addEventListener('click', () => {
    const mobile = button.dataset.plenaView === 'mobile';
    document.querySelectorAll('[data-plena-view]').forEach(other => {
      other.setAttribute('aria-pressed', String(other === button));
    });
    const image = document.querySelector('#plena-preview-image');
    image.src = `/clinica-plena/assets/preview-${mobile ? 'mobile' : 'desktop'}.png`;
    image.alt = `Prévia real da página inicial da Clínica Plena no ${mobile ? 'celular' : 'computador'}`;
    image.width = mobile ? 390 : 1265;
    image.height = mobile ? 844 : 720;
    document.querySelector('#plena-preview-frame').classList.toggle('mobile', mobile);
    document.querySelector('#plena-preview-caption').textContent = mobile
      ? 'Veja como o conteúdo se adapta ao celular. Abra o site para navegar.'
      : 'Uma prévia do projeto. Abra o site para explorar todas as seções.';
  });
});
