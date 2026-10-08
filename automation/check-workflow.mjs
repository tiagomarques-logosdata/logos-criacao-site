const secret = process.env.WORKFLOW_WORKER_SECRET;
if (!secret || secret.length < 32) throw new Error('Configure a chave local do executor.');
const url = new URL('/api/workflow?action=health', process.env.WORKFLOW_URL || 'https://www.logosdata.com.br');
const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: '{}', signal: AbortSignal.timeout(60000) });
const result = await response.json();
if (!response.ok) { console.error(result.error || 'Verificação indisponível.'); process.exitCode = 1; }
else console.log(JSON.stringify(result));
