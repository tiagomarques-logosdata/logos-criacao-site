import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { normalizeAnswers } from '../public/assets/briefing-schema.mjs';
import { analysisPrompt, validateAnalysis, buildPrompt } from './prompts.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const projects = resolve(process.env.CODEX_PROJECTS_DIR || join(root, '../../outputs/sites-clientes'));
const once = process.argv.includes('--once');
const dryRunFile = process.argv.find(x => x.startsWith('--dry-run='))?.slice('--dry-run='.length);
if (dryRunFile) {
  const briefing = JSON.parse(await readFile(resolve(dryRunFile), 'utf8'));
  normalizeAnswers(briefing.answers);
  const folder = join(projects, 'exemplo-briefing'); await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'prompt-analise.txt'), analysisPrompt(briefing));
  console.log(`Prévia salva em ${folder}. Nenhuma IA, API, cobrança ou mensagem foi acionada.`);
  process.exit(0);
}
const url = new URL('/api/workflow', process.env.WORKFLOW_URL || 'https://www.logosdata.com.br');
const secret = process.env.WORKFLOW_WORKER_SECRET;
if (!secret || secret.length < 32) throw new Error('Configure WORKFLOW_WORKER_SECRET no ambiente local.');
async function api(action, body = {}) {
  const endpoint = new URL(url); endpoint.searchParams.set('action', action);
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Falha na fila.'); return result;
}
function runCodex(folder, prompt, stage) {
  const args = ['exec', '--ignore-user-config', '--skip-git-repo-check', '--sandbox', stage === 'analysis' ? 'read-only' : 'workspace-write', '--cd', folder, '--output-last-message', join(folder, stage === 'analysis' ? 'analysis.json' : 'resultado.md')];
  if (stage === 'analysis') args.push('--output-schema', join(root, 'automation/analysis-schema.json'));
  args.push('-');
  // Never pass service credentials to generated code or to the agent process.
  const env = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HOME', 'CODEX_HOME']) if (process.env[key]) env[key] = process.env[key];
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.env.CODEX_BINARY || 'codex', args, { cwd: folder, env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const timeout = setTimeout(() => child.kill(), 30 * 60 * 1000);
    let log = ''; const capture = chunk => { log = (log + chunk.toString()).slice(-1000000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    child.on('error', reject);
    child.on('close', async code => {
      clearTimeout(timeout);
      try {
        await writeFile(join(folder, `${stage}.log`), log);
        if (code === 0) resolveRun(); else reject(new Error(`Codex encerrou a etapa ${stage} com código ${code}. Veja o log local.`));
      } catch (error) { reject(error); }
    });
    child.stdin.end(prompt);
  });
}
async function processJob(job) {
  if (!/^[0-9a-f-]{36}$/i.test(job.id)) throw new Error('Identificador de projeto inválido.');
  const folder = resolve(projects, job.id);
  if (!folder.startsWith(projects + sep)) throw new Error('Destino de projeto inválido.');
  let analysis;
  try {
    const briefing = { ...job.briefing, answers: normalizeAnswers(job.briefing.answers) };
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'briefing.json'), JSON.stringify(briefing, null, 2));
    await writeFile(join(folder, 'AGENTS.md'), '# Regras da Logos Data\n\n' + (await import('./prompts.mjs')).buildRules);
    await runCodex(folder, analysisPrompt(briefing), 'analysis');
    analysis = validateAnalysis(JSON.parse(await readFile(join(folder, 'analysis.json'), 'utf8')));
    if (['Loja virtual', 'Aplicação ou portal'].includes(briefing.answers.tipo)) {
      analysis.needsReview = true;
      if (!analysis.outOfScope.length) analysis.outOfScope.push('Tipo de projeto exige revisão de escopo.');
    }
    await writeFile(join(folder, 'prompt-codex.md'), buildPrompt(analysis));
    if (analysis.needsReview || analysis.outOfScope.length || analysis.missingInformation.length) {
      await api('result', { id: job.id, lease: job.lease, status: 'needs_review', analysis, note: 'Briefing analisado. Revise pendências e escopo antes do desenvolvimento.' });
      console.log(`Projeto ${job.id}: pendências para revisão.`); return;
    }
    await runCodex(folder, buildPrompt(analysis), 'build');
    await api('result', { id: job.id, lease: job.lease, status: 'completed', analysis, note: 'Primeira versão criada pelo Codex; revisão da Logos Data necessária antes de publicar.' });
    console.log(`Projeto ${job.id}: primeira versão em ${folder}.`);
  } catch (error) {
    await api('result', { id: job.id, lease: job.lease, status: 'failed', analysis, note: error.message }).catch(() => {});
    console.error(`Projeto ${job.id}: execução interrompida; consulte os logs locais.`);
  }
}
do {
  try {
    await api('retry-emails');
    const { job } = await api('claim');
    if (job) await processJob(job);
    else if (once) console.log('Não há briefings na fila.');
  } catch (error) { console.error('Não foi possível acessar a fila. Confira a configuração do serviço.'); if (once) process.exitCode = 1; }
  if (!once) await new Promise(resolveWait => setTimeout(resolveWait, 30000));
} while (!once);
