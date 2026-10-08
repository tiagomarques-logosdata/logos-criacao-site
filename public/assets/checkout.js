const form = document.querySelector('#purchase-form');
form.addEventListener('submit', async event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const button = form.querySelector('button'), status = document.querySelector('#purchase-status');
  button.disabled = true; status.textContent = 'Preparando seu pagamento…';
  try {
    const data = new FormData(form);
    const response = await fetch('/api/workflow?action=checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email') }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível preparar o pagamento.');
    const target = new URL(result.url);
    if (target.protocol !== 'https:' || !['checkout.infinitepay.com.br', 'checkout.infinitepay.io'].includes(target.hostname)) throw new Error('Destino de pagamento inválido.');
    location.assign(target.href);
  } catch (error) { status.textContent = error.message; button.disabled = false; }
});
