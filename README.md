# Logos Data

Sites e e-commerce com engenharia por trás. Desenvolvimento, automação, dados e inteligência artificial para negócios.

## Origem e escopo

Projeto novo preparado para o repositório [tiagomarques-logosdata/logos-criacao-site](https://github.com/tiagomarques-logosdata/logos-criacao-site). Não havia repositório do site atual disponível. A implementação utiliza o briefing fornecido e o conteúdo público consultado em https://www.logosdata.com.br/ em 5 de outubro de 2026. Nenhum arquivo do site em produção foi alterado e nenhuma publicação foi feita automaticamente.

As páginas de dados, automação e IA desta base são páginas novas. Não é possível afirmar equivalência funcional com um projeto original cujo código não foi disponibilizado. A home mantém a comunicação de engenharia de dados, integrações, automação, BI, método e apresentação do especialista, acrescentando desenvolvimento web. Não foram inventados clientes, resultados, parcerias ou certificações.

## Executar localmente

Requer Node.js 20 ou superior. Não há dependências de aplicação para instalar.

```sh
npm run dev
```

Abra http://127.0.0.1:4173. O comando gera a saída antes de iniciar o servidor. Após alterar os templates, execute `npm run build` ou reinicie o servidor. Os arquivos estáticos atualizados são servidos imediatamente.

```sh
npm run lint
npm run build
```

`lint` executa verificação de sintaxe JavaScript, metadados, JSON-LD, hierarquia principal, existência de recursos e links internos com suas âncoras. Não utiliza ESLint. `build` gera as dez páginas HTML e os assets em `dist/`.

## Rotas

- `/` — home com os quatro pilares e novo card de desenvolvimento web.
- `/desenvolvimento-de-sites/` — página comercial completa, incluindo `#ecommerce`, `#processo` e `#orcamento`.
- `/dados/`
- `/automacao/`
- `/inteligencia-artificial/`
- `/business-intelligence/`
- `/engenharia-de-dados/`
- `/integracoes/`
- `/portfolio/` — filtros e um projeto demonstrativo de e-commerce.
- `/sobre/`

O servidor local aceita `/desenvolvimento-de-sites` e a versão com barra final. O canonical usa barra final. Há página de erro 404, `robots.txt` e sitemap.

## Arquitetura e arquivos criados

Sites estáticos gerados com Node.js, HTML semântico, CSS responsivo e JavaScript nativo. A página comercial não exige um framework ou execução de JavaScript para exibir o conteúdo. Essa escolha se aplica ao projeto novo, já que não havia uma arquitetura original para reutilizar.

- `src/site.mjs`: configuração, catálogo de projetos e serviços.
- `src/templates.mjs`: layout, header, footer, CTAs, metadados e templates de páginas.
- `public/assets/styles.css`: identidade visual, grids, responsividade e movimento reduzido.
- `public/assets/site.js`: menu mobile, formulário e filtros de portfólio.
- `public/assets/favicon.svg`: símbolo gráfico da nova base; substituir pela marca oficial se disponível.
- `public/assets/og-cover.svg`: fonte vetorial da imagem social.
- `public/assets/og-cover.png`: imagem social para compartilhamento.
- `scripts/build.mjs`: geração das páginas e sitemap.
- `scripts/check.mjs`: validação da base e links.
- `scripts/server.mjs`: servidor de desenvolvimento com 404 e cabeçalhos básicos de segurança.
- `docs/validate-workflow.yml`: modelo opcional de validação em GitHub Actions. Ainda não ativado; para ativar, mover para `.github/workflows/validate.yml` com autorização de escrita em workflows.
- `package.json`, `.gitignore` e este README.

**Arquivos originais modificados:** nenhum. Todos os arquivos desta entrega são novos.

## Componentes

Reutilizados entre as páginas desta nova base: header e menu, footer, layout com SEO, botões, listas de tecnologias, cabeçalhos de seção e CTA final.

Novos componentes: browser ilustrado com loja demonstrativa, cards de projeto, seção de plataformas, fluxo site → integrações → dados → automações → sistemas, etapas do processo, formulário de orçamento, filtros e estado vazio do portfólio.

## Home e conteúdo comercial

A home apresenta Desenvolvimento, Automação, Dados e Inteligência Artificial. O card “Sites e E-commerce” leva à nova página. Os serviços de engenharia de dados, BI e integrações continuam visíveis, com links próprios. O conteúdo público de método, benefícios e apresentação do especialista foi incorporado. A foto e as certificações precisam de assets e confirmação atual do responsável antes de serem acrescentadas.

A página de desenvolvimento apresenta sites institucionais, landing pages, lojas virtuais, aplicações sob medida, integrações, processo, tecnologias, manutenção e CTAs recorrentes. As plataformas aparecem como alternativas de implementação, sem afirmação de parceria oficial.

## Formulário e privacidade

O número `+55 11 98319-5720` foi obtido do link público de WhatsApp do site atual. O formulário valida os campos, exibe URL quando já existe site e monta uma mensagem para o visitante revisar e enviar pelo WhatsApp. Não há backend, persistência, integração automática com CRM nem confirmação de recebimento. A mensagem não é enviada automaticamente. Se a janela for bloqueada, permanece um link para abrir o rascunho.

O telefone está em `src/site.mjs` e `public/assets/site.js`. Atualize ambos se mudar. Não habilitamos pixels, analytics ou cookies de rastreamento. Caso seja integrado um backend, definir retenção de leads e texto de privacidade antes da publicação.

## SEO e performance

Cada página possui title, description, canonical, Open Graph, idioma e um h1. Há Schema.org Organization em todas as páginas e Service na página comercial. O sitemap inclui as dez rotas. A página 404 usa noindex.

Os canonicals e a imagem social apontam para `https://www.logosdata.com.br`. Atualize `src/site.mjs` se o endereço definitivo mudar. Não deixe uma prévia indexável em outro domínio antes de revisar essa configuração.

Sem bibliotecas de interface, fontes remotas, vídeos, imagens pesadas no conteúdo ou scripts de terceiros. A ilustração do hero usa CSS. Por isso não há imagens de conteúdo que precisem de lazy loading. Há foco visível, link para pular navegação, labels nos campos, menu acessível por teclado e respeito a `prefers-reduced-motion`. Core Web Vitals devem ser medidos após a hospedagem: o desempenho final depende também da infraestrutura.

## Validação realizada

- `npm run lint`: aprovado.
- `npm run build`: aprovado; dez páginas geradas.
- Navegador Chromium: larguras 375, 390, 430, 768 e 1440 px na página comercial, sem overflow horizontal.
- Menu mobile nas quatro larguras menores e navegação das dez rotas: aprovados.
- Formulário: campos, seleção de tipo, exibição condicional de URL e mensagem codificada corretamente para WhatsApp. Nenhuma mensagem de teste enviada.
- Portfólio: filtros e mensagem de categoria vazia aprovados.
- Console: sem erros na navegação e interação válidas.
- URL inexistente: resposta 404 confirmada.
- Links internos, recursos, âncoras e JSON-LD: aprovados pelo validador.

## GitHub e publicação

Repositório de destino: https://github.com/tiagomarques-logosdata/logos-criacao-site. O repositório estava vazio antes desta implementação. Não incluir credenciais no código.

O código-fonte é versionado sem `dist/`. Para publicar o site, executar `npm run build` e hospedar o conteúdo de `dist/` em um provedor com suporte a diretórios `index.html`. A configuração de redirects, cache, HTTPS e domínio depende do provedor. Não existe workflow de deploy automático nesta entrega. O modelo de CI está em `docs/validate-workflow.yml`, sem ativação automática.

Não substituir o site atual sem revisar URLs antigas, hospedagem, identidade e integrações. Como os arquivos originais não foram disponibilizados, é necessário inventariar rotas antigas e definir redirects antes de uma migração de produção.

## Decisões pendentes

1. Revisar o projeto no repositório `tiagomarques-logosdata/logos-criacao-site`.
2. Confirmar se esta base substituirá o site atual ou ficará inicialmente em ambiente de revisão.
3. Disponibilizar logo oficial, foto do especialista, cases reais e eventuais assets originais.
4. Confirmar telefone de atendimento, escopo de plataformas oferecidas e condições de suporte.
5. Decidir se o orçamento continuará no WhatsApp ou será integrado a CRM/backend.
6. Definir hospedagem e revisão das URLs antigas antes de alterar domínio ou produção.
