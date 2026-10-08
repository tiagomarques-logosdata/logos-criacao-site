import { sections, activeSections, normalizeAnswers, schemaVersion } from './briefing-schema.mjs';
const form = document.querySelector('#brief-form');
const status = document.querySelector('#brief-status');
const banner = document.querySelector('#brief-access');
const submit = document.querySelector('#brief-submit');
const hash = new URLSearchParams(location.hash.slice(1));
const incomingToken = hash.get('token');
if (incomingToken) { sessionStorage.setItem('logos-brief-token', incomingToken); history.replaceState(null, '', location.pathname); }
const token = incomingToken || sessionStorage.getItem('logos-brief-token') || '';
const draftKey = `logos-brief-draft-${token ? token.slice(0, 16) : 'preview'}`;
let step = 0, canSubmit = false, sent = false;
const answers = () => Object.fromEntries(sections.flatMap(s => s.fields).map(q => {
  const el = form.elements.namedItem(q.id);
  return [q.id, q.type === 'checkbox' ? el.checked : el.value];
}));
const steps = () => [...activeSections(answers()).map(s => s.id), 'revisao'];
function sectionValid(id) {
  const fields = [...form.querySelector(`[data-section="${id}"]`).querySelectorAll('input, select, textarea')];
  for (const field of fields) if (!field.checkValidity()) {
    step = steps().indexOf(id); render(true); field.reportValidity(); field.focus(); return false;
  }
  return true;
}
function review() {
  const values = answers();
  const target = document.querySelector('#brief-review');
  target.replaceChildren();
  for (const section of activeSections(values)) {
    const heading = document.createElement('h3'); heading.textContent = section.title; target.append(heading);
    const list = document.createElement('dl');
    for (const q of section.fields) {
      const dt = document.createElement('dt'); dt.textContent = q.label;
      const dd = document.createElement('dd'); dd.textContent = q.type === 'checkbox' ? (values[q.id] ? 'Confirmado' : 'Não confirmado') : values[q.id] || 'Não informado';
      list.append(dt, dd);
    }
    target.append(list);
  }
}
function render(focus = false) {
  const ids = steps(); step = Math.min(step, ids.length - 1);
  form.querySelectorAll('.brief-step').forEach(el => {
    el.hidden = el.dataset.section !== ids[step];
    el.querySelectorAll('input, select, textarea').forEach(field => { field.disabled = !ids.includes(el.dataset.section); });
  });
  document.querySelector('#brief-back').hidden = step === 0;
  document.querySelector('#brief-next').hidden = step === ids.length - 1;
  submit.hidden = step !== ids.length - 1;
  submit.disabled = !canSubmit || sent;
  document.querySelector('#brief-position').textContent = `Etapa ${step + 1} de ${ids.length}`;
  document.querySelector('#brief-progress').value = (step + 1) / ids.length * 100;
  const list = document.querySelector('#brief-steps'); list.replaceChildren();
  ids.forEach((id, index) => {
    const li = document.createElement('li'), button = document.createElement('button');
    button.type = 'button'; button.textContent = id === 'revisao' ? 'Revisar e enviar' : sections.find(s => s.id === id).title;
    button.setAttribute('aria-current', index === step ? 'step' : 'false');
    button.addEventListener('click', () => {
      if (index > step) for (let i = step; i < index; i++) if (!sectionValid(ids[i])) return;
      step = index; render(true);
    });
    li.append(button); list.append(li);
  });
  if (ids[step] === 'revisao') review();
  if (focus) { const legend = form.querySelector(`[data-section="${ids[step]}"] legend`); legend.tabIndex = -1; legend.focus(); }
}
document.querySelector('#brief-next').addEventListener('click', () => { if (sectionValid(steps()[step])) { step++; render(true); } });
document.querySelector('#brief-back').addEventListener('click', () => { step--; render(true); });
form.elements.namedItem('tipo').addEventListener('change', () => render());
document.querySelector('#save-draft').addEventListener('click', () => {
  try { localStorage.setItem(draftKey, JSON.stringify({ version: schemaVersion, answers: answers() })); status.textContent = 'Rascunho salvo neste dispositivo.'; }
  catch { status.textContent = 'Não foi possível salvar. Você pode baixar uma cópia em JSON.'; }
});
document.querySelector('#load-draft').addEventListener('click', () => {
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (!saved) { status.textContent = 'Nenhum rascunho salvo neste dispositivo.'; return; }
    for (const q of sections.flatMap(s => s.fields)) { const el = form.elements.namedItem(q.id); if (q.type === 'checkbox') el.checked = saved.answers[q.id] === true; else el.value = saved.answers[q.id] || ''; }
    status.textContent = 'Rascunho retomado.'; step = 0; render();
  } catch { status.textContent = 'Não foi possível retomar esse rascunho.'; }
});
document.querySelector('#clear-draft').addEventListener('click', () => { localStorage.removeItem(draftKey); status.textContent = 'Rascunho apagado deste dispositivo.'; });
document.querySelector('#export-brief').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ schemaVersion, answers: answers() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'briefing-meu-site.json'; link.click(); URL.revokeObjectURL(url);
});
form.addEventListener('submit', async event => {
  event.preventDefault(); if (!canSubmit || sent) return;
  try {
    const values = normalizeAnswers(answers()); submit.disabled = true; status.textContent = 'Enviando seu briefing…';
    const response = await fetch('/api/workflow?action=briefing', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ schemaVersion, answers: values }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível enviar.');
    sent = true; localStorage.removeItem(draftKey); status.textContent = 'Briefing recebido! Suas respostas estão na fila de análise para preparar o desenvolvimento do site.';
  } catch (error) { status.textContent = error.message; submit.disabled = !canSubmit || sent; }
});
render();
if (!token) banner.textContent = 'Prévia do formulário. Você pode conhecer as perguntas e baixar suas respostas. Para enviar, use o link individual recebido por e-mail após a compra.';
else {
  try {
    const response = await fetch('/api/workflow?action=access', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Link inválido.');
    sent = result.submitted; canSubmit = !sent;
    banner.textContent = sent ? 'Este pedido já possui um briefing enviado.' : 'Seu acesso está confirmado. Preencha o briefing abaixo.';
    render();
  } catch (error) { banner.textContent = error.message; }
}
