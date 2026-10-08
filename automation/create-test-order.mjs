import { randomUUID } from 'node:crypto';
if (!process.argv.includes('--send')) throw new Error('Use --send para autorizar o envio real do e-mail de teste.');
const id = process.argv.find(x => x.startsWith('--id='))?.slice(5) || randomUUID();
const secret = process.env.WORKFLOW_WORKER_SECRET;
if (!secret || secret.length < 32) throw new Error('Configure a chave privada do executor.');
console.log(`Pedido de teste: ${id}. Use o mesmo --id em qualquer repetição.`);
const url = new URL('/api/workflow?action=test-order', process.env.WORKFLOW_URL || 'https://www.logosdata.com.br');
const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
  body: JSON.stringify({ id }), signal: AbortSignal.timeout(60000) });
const result = await response.json();
if (!response.ok) throw new Error(result.error || 'Falha no pedido de teste.');
console.log(JSON.stringify(result));
