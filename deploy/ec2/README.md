# Executor na EC2

O site e a API continuam no Vercel; o banco continua no Supabase. A EC2 executa a análise dos briefings e cria a primeira versão dos sites, sem publicar automaticamente.

Instância utilizada: `18.224.96.208`, Amazon Linux 2023. Usuário SSH: `ec2-user`. O executor usa o usuário separado `logos-worker`, sem sudo ou acesso ao Docker.

## Diretórios

- Código: `/opt/logosdata-worker/app` (protegido contra escrita pelo executor).
- Codex CLI: `/opt/logosdata-worker/tools/bin/codex` (instalado: 0.162.0).
- Autenticação Codex: `/var/lib/logosdata-worker/codex` (privada).
- Sites e logs por projeto: `/var/lib/logosdata-worker/projects` (privados).
- Configuração: `/etc/logosdata-worker.env` (root, modo 600).

O arquivo de configuração contém WORKFLOW_URL, WORKFLOW_WORKER_SECRET, CODEX_HOME, CODEX_BINARY e CODEX_PROJECTS_DIR. Não copiar credenciais SMTP ou Supabase para o executor. Não adicionar esse arquivo nem a autenticação Codex ao Git.

## Login pela assinatura ChatGPT

```sh
sudo -u logos-worker env HOME=/var/lib/logosdata-worker CODEX_HOME=/var/lib/logosdata-worker/codex /opt/logosdata-worker/tools/bin/codex login --device-auth
```

Concluir pessoalmente o login no endereço e código exibidos pelo comando. Os limites da assinatura se aplicam. Consulte a [documentação oficial de autenticação](https://developers.openai.com/codex/auth/).

## Serviço

Depois do login, iniciar e habilitar o serviço:

```sh
sudo systemctl enable --now logosdata-worker
sudo systemctl status logosdata-worker --no-pager
sudo journalctl -u logosdata-worker -n 30 --no-pager
```

O serviço verifica o Codex antes de retirar um briefing da fila. Processa um projeto por vez. Reinicia após falha, com limite de três tentativas por hora. Se atingir o limite, corrigir o problema e executar:

```sh
sudo systemctl reset-failed logosdata-worker
sudo systemctl start logosdata-worker
```

Após confirmar a execução na EC2, encerrar o executor local para manter apenas um executor ativo. A EC2 precisa permanecer ligada; o computador pessoal pode ser desligado.

## Operação

Revisar os sites gerados antes da publicação. Briefings incompletos ou fora do escopo ficam para revisão. Uma interrupção durante um projeto pode exigir revisão e recolocação manual na fila, evitando construções duplicadas. Acompanhar espaço em disco com `df -h /`; esta instalação não aumenta o disco nem altera o tipo da instância. Os containers preexistentes foram preservados.

Para atualizar, transferir um arquivo `git archive` da revisão desejada, substituir somente o código em `/opt/logosdata-worker/app` e reiniciar o serviço quando não houver projeto em processamento. Não transferir o checkout inteiro com arquivos `.env` e credenciais.
