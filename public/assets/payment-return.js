const params = new URLSearchParams(location.search);
const status = document.querySelector('#payment-status');
// Remove payment identifiers before any further navigation.
history.replaceState(null, '', location.pathname);
try {
  const response = await fetch('/api/workflow?action=confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_nsu: params.get('order_nsu'), transaction_nsu: params.get('transaction_nsu'), slug: params.get('slug') }) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Não foi possível confirmar agora.');
  status.textContent = result.paid ? 'Pagamento confirmado. O link do formulário será enviado ao e-mail informado na contratação.' : 'Seu pagamento ainda não foi confirmado. Assim que houver aprovação, enviaremos o formulário por e-mail.';
} catch { status.textContent = 'Não foi possível conferir agora. A confirmação também será processada pela notificação da InfinitePay. Se precisar de ajuda, fale com a Logos Data.'; }
