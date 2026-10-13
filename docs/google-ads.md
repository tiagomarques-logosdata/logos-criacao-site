# Google Ads e contatos

A tag base usa AW-18430684930. A conversão primária do formulário usa NAVvCLL5xpsdEILet9RE (Contato recebido - Formulário).

- GOOGLE_ADS_ID substitui o ID da tag base.
- GOOGLE_ADS_LEAD_CONVERSION_LABEL substitui o rótulo do contato salvo. A variável antiga GOOGLE_ADS_CONVERSION_LABEL não é mais usada.
- O evento dispara somente após a API confirmar o registro em logos_leads, com transaction_id igual ao UUID do registro. Nome e telefone não são enviados à tag.
- Cliques em wa.me não disparam conversões. A ação histórica Clique no WhatsApp - Site fica secundária.
- A conversão representa um contato recebido, ainda não um lead qualificado ou venda. A atribuição no Ads depende de interação elegível com o anúncio, consentimento/configuração do navegador e disponibilidade da tag.

## Banco e painel

Aplicar docs/leads.sql no projeto Supabase antes do deploy. RLS bloqueia anon e authenticated; apenas o backend acessa a tabela. O painel continua exigindo a sessão do proprietário com senha e TOTP.

O formulário exige nome, celular brasileiro com DDD e autorização de contato. Há limite transacional por telefone e hash do IP, honeypot e repetição segura por UUID. O endereço IP não é armazenado em texto puro.

No painel, abrir o link prepara a mensagem. O responsável envia pelo WhatsApp e marca manualmente o contato como contatado; esse status é reversível.

Em 13/10/2026 a campanha 24344233381 foi pausada a pedido de Tiago. Não reativar automaticamente após o deploy.

## Avisos de novos contatos

Aplicar também docs/lead-notifications.sql. Novos registros ficam pendentes para notificação; registros anteriores não geram avisos retroativos. A API usa waitUntil da Vercel para enviar ao SMTP_USER após salvar o contato, sem bloquear a confirmação do formulário. O executor existente tenta novamente os avisos pendentes por retry-emails. Claim no banco evita envios concorrentes e o e-mail usa um Message-ID estável. O aviso inclui nome, WhatsApp, data, painel e link de mensagem pronta; nenhum e-mail é enviado ao visitante.

