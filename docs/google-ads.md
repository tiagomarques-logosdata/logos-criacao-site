# Medição do WhatsApp

A medição está preparada, mas fica desativada sem as duas variáveis de build:

- `GOOGLE_ADS_ID`: ID da tag, no formato `AW-` seguido de números.
- `GOOGLE_ADS_CONVERSION_LABEL`: rótulo da ação de conversão de clique no WhatsApp.

Configure os valores no projeto da Vercel e faça um novo deploy. Crie no Google Ads uma ação chamada “Clique no WhatsApp”. O evento mede a abertura do WhatsApp, não o envio de uma mensagem, um lead qualificado ou uma venda. Não envia nome, descrição do projeto, telefone, e-mail ou o endereço completo do link do WhatsApp ao Google.

Depois da publicação, valide a tag e o evento no Tag Assistant usando os IDs reais. O servidor local permite os domínios necessários apenas quando a configuração está ativa.
