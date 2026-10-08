# Medição do WhatsApp

A tag base `AW-18430684930` está instalada. A conversão de clique no WhatsApp fica desativada até informar o rótulo. Variáveis de build:

- `GOOGLE_ADS_ID`: opcional, substitui o ID da tag instalado.
- `GOOGLE_ADS_CONVERSION_LABEL`: rótulo da ação de conversão de clique no WhatsApp.

Configure os valores no projeto da Vercel e faça um novo deploy. Crie no Google Ads uma ação chamada “Clique no WhatsApp”. O evento mede a abertura do WhatsApp, não o envio de uma mensagem, um lead qualificado ou uma venda. Não envia nome, descrição do projeto, telefone, e-mail ou o endereço completo do link do WhatsApp ao Google.

Depois da publicação, valide a tag e o evento no Tag Assistant usando os IDs reais. O servidor local permite os domínios necessários apenas quando a configuração está ativa.
