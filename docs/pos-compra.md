# Formulário e criação automática de sites

## O que está implementado

`/briefing/` contém o questionário em etapas, com revisão das respostas, rascunho opcional no dispositivo e exportação JSON. Sem o link individual, a página é uma prévia e não envia dados. Materiais são informados por links de pastas e documentos; não há upload de arquivos nesta versão.

O fluxo integrado captura nome e e-mail em `/contratar/`, cria um checkout InfinitePay de R$1.000, confirma o pagamento pela API da operadora, envia o link privado pelo Google e armazena as respostas no Supabase. O link expira em 30 dias. O formulário não carrega Google Ads e não aparece no sitemap.

O executor local consulta a fila, analisa o briefing com Codex em modo somente leitura e gera um prompt estruturado. Dados faltantes e projetos de loja/portal ficam em `needs_review`. Briefings completos geram uma primeira versão em uma pasta própria, sem publicação automática. O status `completed` significa primeira versão gerada, não site entregue. Não há envio automático para a conversa aberta do aplicativo: a integração usa `codex exec`, com autenticação e consumo da conta configurada nessa máquina.

## Configurar Supabase e Vercel

1. Execute `docs/workflow.sql` no SQL Editor do projeto Supabase. A tabela tem RLS e fica acessível somente ao backend com chave secreta.
2. No Vercel, configure as variáveis de `.env.example`. Mantenha `WORKFLOW_ENABLED=false` durante a preparação. `SUPABASE_SECRET_KEY` é uma chave de servidor; nunca use em código do navegador.
3. Gere dois segredos diferentes de pelo menos 32 caracteres para `BRIEFING_TOKEN_SECRET` e `WORKFLOW_WORKER_SECRET`. Não troque o primeiro enquanto existirem links válidos.
4. Configure `SMTP_USER=tiago.marques@logosdata.com.br` e `SMTP_APP_PASSWORD` com uma senha de app do Google, se a política do Workspace permitir. Ative a verificação em duas etapas. Se o administrador bloquear senhas de app, será necessário adaptar o envio para OAuth ou relay autorizado antes de ativar.
5. Confira `INFINITEPAY_HANDLE=engdados-me` com o titular da conta. O link de loja atual usa esse identificador. O nome de usuário do antigo link de pagamento era diferente; não assumir que as duas contas são iguais.
6. O banco limita a criação a três pedidos por e-mail e 100 no total por hora, de forma atômica. Configure também proteção contra abuso/rate limit no Vercel para `POST /api/workflow?action=checkout` antes de ativar o checkout público, para impedir o esgotamento intencional desse limite. Não há CAPTCHA nesta versão. Preserve o acesso aos webhooks da InfinitePay.

Os botões públicos continuam levando ao link de loja existente enquanto a flag estiver desligada. Essa loja antiga não envia automaticamente pedidos para este fluxo. Quando a integração estiver testada, ative `WORKFLOW_ENABLED=true` e faça novo deploy: os botões passam a levar ao checkout integrado, que captura o e-mail antes de redirecionar.

## Executor local do Codex

Instale/use o Codex CLI e confirme a autenticação com `codex login status`. Na máquina que ficará ligada, defina `WORKFLOW_URL`, `WORKFLOW_WORKER_SECRET`, `CODEX_BINARY` se o executável não estiver no PATH e `CODEX_PROJECTS_DIR` para uma pasta de projetos. Não copie as credenciais SMTP ou Supabase para o executor: ele só precisa do segredo da fila.

Execute `npm run worker -- --once` para uma consulta única ou `npm run worker` para consultar continuamente a cada 30 segundos. É um processo local; se fechar ou desligar o computador, a fila aguarda. A análise e a criação usam o Codex e podem consumir sua franquia. Cada etapa tem limite de 30 minutos.

`node --env-file=.env.worker automation/check-workflow.mjs` verifica banco, autenticação da fila e login SMTP no Google sem enviar e-mail ou criar cobrança. As variáveis locais devem estar no arquivo ignorado `.env.worker`.

Arquivos produzidos por pedido: `briefing.json`, `analysis.json`, `prompt-codex.md`, `resultado.md`, logs e o código criado. São dados privados de clientes: mantenha a pasta protegida. Conteúdo do cliente é tratado como dados, sem autorização para executar instruções, publicar sites ou acessar credenciais. Revise o resultado antes de entregar.

## Validar antes de ativar

- Execute `npm test` e `npm run lint`.
- Abra `/briefing/` e teste a exportação de um briefing fictício. `node automation/codex-worker.mjs --dry-run=caminho/briefing.json` gera somente a prévia do prompt, sem usar IA ou enviar mensagens.
- Valide envio SMTP para uma caixa controlada, armazenamento e permissões no Supabase. Não há validação dessas contas até fornecer/configurar as credenciais.
- Faça uma compra controlada pelo checkout integrado: confirme valor, identificação da conta recebedora, e-mail, link privado, envio único do formulário e processamento. Não existe simulação de pagamento que prove o funcionamento da operadora em produção.
- Teste repetição do webhook: a confirmação não deve duplicar o trabalho. Envio SMTP e gravação no banco não são uma transação única; se houver falha após o Google aceitar o e-mail, uma tentativa posterior pode duplicar a mensagem, com o mesmo link.

## Operação e recuperação

Pedidos e resultados ficam em `public.logos_orders`, para acompanhamento no Supabase. `queued` aguarda o executor; `processing` está em execução; `needs_review` exige revisão do escopo/informações; `failed` exige investigação dos logs. O executor também tenta novamente e-mails pendentes.

Se o computador interromper um trabalho, ele pode permanecer em `processing`. Verifique primeiro que nenhum executor continua trabalhando. Só então atualize esse pedido para `queued` e limpe `lease` para tentar de novo. A versão inicial não tem painel administrativo nem retomada automática de trabalhos interrompidos. Defina um prazo de retenção e elimine dados e pastas quando não forem mais necessários.

Fontes das integrações: [InfinitePay Checkout](https://www.infinitepay.io/checkout-documentacao), [Codex não interativo](https://learn.chatgpt.com/docs/non-interactive-mode), [Supabase REST](https://supabase.com/docs/guides/api/creating-routes), [Nodemailer SMTP](https://nodemailer.com/smtp).
