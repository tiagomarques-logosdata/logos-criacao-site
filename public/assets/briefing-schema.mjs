export const schemaVersion = '1.0';
const field = (id, label, type = 'textarea', extra = {}) => ({ id, label, type, ...extra });
export const sections = [
  { id: 'empresa', title: 'Sua empresa', intro: 'Conte quem vocês são. As informações de publicação podem ser diferentes dos dados usados na compra.', fields: [
    field('responsavel', 'Seu nome e cargo', 'text', { required: true }),
    field('empresa', 'Nome da empresa ou marca', 'text', { required: true }),
    field('nomePublico', 'Como o nome deve aparecer no site?', 'text'),
    field('segmento', 'Em qual segmento a empresa atua?', 'text', { required: true }),
    field('historia', 'História da empresa, trajetória, missão e valores'),
    field('descricao', 'O que sua empresa faz? Explique como explicaria a um novo cliente.', 'textarea', { required: true }),
    field('diferenciais', 'Quais são seus diferenciais e por que alguém deveria escolher você?'),
    field('regiao', 'Quais cidades, regiões ou países você atende?', 'text'),
    field('publico', 'Quem é seu cliente ideal? Perfil, necessidades, dúvidas e objeções.', 'textarea', { required: true }),
    field('tom', 'Como sua marca conversa?', 'select', { options: ['Profissional e objetiva', 'Próxima e acolhedora', 'Premium e sofisticada', 'Criativa e descontraída', 'Técnica e especializada', 'Ainda não sei'] }),
  ] },
  { id: 'objetivos', title: 'Objetivos do site', intro: 'Vamos definir o que o visitante precisa entender e fazer.', fields: [
    field('tipo', 'Qual tipo de site você precisa?', 'select', { required: true, options: ['Site institucional', 'Landing page', 'Loja virtual', 'Aplicação ou portal', 'Ainda não sei'] }),
    field('objetivo', 'Qual é o principal objetivo do site?', 'select', { required: true, options: ['Receber contatos no WhatsApp', 'Receber pedidos de orçamento', 'Apresentar a empresa', 'Vender produtos ou serviços online', 'Captar inscrições ou agendamentos', 'Outro'] }),
    field('acao', 'Qual ação principal o visitante deve realizar?', 'text', { required: true, hint: 'Ex.: pedir orçamento, agendar uma visita, comprar, ligar.' }),
    field('sucesso', 'Como você vai avaliar se o site está dando certo?'),
    field('oferta', 'Qual serviço, produto ou oferta deve receber mais destaque?'),
    field('campanhas', 'Vai anunciar no Google Ads, Instagram ou em outros canais? Descreva as campanhas.'),
    field('siteAtual', 'Já existe um site? Cole o endereço.', 'url'),
    field('manter', 'O que deve ser mantido ou corrigido no site atual?'),
    field('idiomas', 'Em quais idiomas o site precisa estar disponível?', 'text', { hint: 'Se não informar, vamos considerar português do Brasil.' }),
  ] },
  { id: 'identidade', title: 'Identidade e referências', intro: 'Diga o que combina com sua marca e o que você prefere evitar.', fields: [
    field('logo', 'Link da logo e do manual de marca', 'url', { hint: 'Pode ser uma pasta no Google Drive. Dê acesso de leitura para a Logos Data.' }),
    field('cores', 'Cores da marca e cores que deseja evitar', 'text'),
    field('fontes', 'Fontes ou orientações de tipografia, se houver', 'text'),
    field('estilo', 'Qual estilo visual você prefere?', 'select', { options: ['Limpo e minimalista', 'Moderno e tecnológico', 'Elegante e premium', 'Tradicional e corporativo', 'Acolhedor e humano', 'Colorido e criativo', 'Quero uma recomendação'] }),
    field('referencias', 'Até três sites de referência. Para cada um, diga o que gostou.', 'textarea', { hint: 'Explique: cores, menu, organização, fotografias, estilo ou funcionalidades. Inspiração não significa copiar.' }),
    field('concorrentes', 'Quem são seus concorrentes? Cole os sites e diga como quer se diferenciar.'),
    field('evitar', 'O que você não quer no visual ou no conteúdo?'),
    field('imagens', 'Link das fotos, vídeos e outros materiais da empresa', 'url'),
    field('imagensFaltantes', 'Se faltarem imagens, podemos usar imagens licenciadas ou criar imagens para seu site? Quais temas representam sua empresa?'),
    field('animacoes', 'Preferência por animações', 'select', { options: ['Discretas', 'Quase nenhuma', 'Mais marcantes, sem atrapalhar a navegação', 'Quero uma recomendação'] }),
  ] },
  { id: 'conteudo', title: 'Páginas e conteúdo', intro: 'Não precisa escrever tudo de uma vez. Se algo ainda não estiver pronto, indique o que falta.', fields: [
    field('paginas', 'Quais páginas e seções seu site deve ter?', 'textarea', { required: true, hint: 'Ex.: início, sobre, serviços, projetos, contato. Diga o objetivo e o conteúdo de cada página.' }),
    field('headline', 'Qual mensagem deve aparecer primeiro? Há um slogan?', 'text'),
    field('servicos', 'Liste os serviços: nome, descrição, benefícios e público de cada um.', 'textarea', { required: true }),
    field('precos', 'Quais preços, condições, promoções ou pacotes podem aparecer publicamente?'),
    field('sobre', 'O que deve aparecer na página Sobre? Equipe, experiência, história, fotos.'),
    field('projetos', 'Quais projetos ou cases podemos apresentar? Inclua links, imagens e resultados comprováveis.'),
    field('depoimentos', 'Há depoimentos autorizados? Envie o texto, identificação pública e autorização.'),
    field('credenciais', 'Certificações, prêmios, números ou logos de parceiros que podem ser publicados.'),
    field('faq', 'Quais são as perguntas mais frequentes dos seus clientes e suas respostas?'),
    field('conteudoPronto', 'Link dos textos ou documentos já preparados', 'url'),
    field('redacao', 'O que podemos revisar ou redigir a partir das informações enviadas?'),
    field('informacoesProibidas', 'Há dados, preços, clientes ou informações que NÃO podem aparecer no site?'),
  ] },
  { id: 'contato', title: 'Contato e conversão', intro: 'Informe apenas os dados que podem aparecer publicamente no site.', fields: [
    field('whatsappPublico', 'WhatsApp público com DDD', 'tel'),
    field('mensagemWhatsapp', 'Mensagem inicial desejada para o WhatsApp', 'text'),
    field('telefonePublico', 'Telefone público', 'tel'),
    field('emailPublico', 'E-mail público', 'email'),
    field('endereco', 'Endereço público e orientações para chegar'),
    field('horarios', 'Dias e horários de atendimento', 'text'),
    field('redes', 'Links das redes sociais'),
    field('formulario', 'O site deve ter formulário? Quais perguntas e para qual e-mail as respostas devem ir?'),
    field('agendamento', 'Precisa de agendamento? Informe o processo e uma ferramenta existente, se houver.'),
    field('botoes', 'Quais textos você prefere nos botões? Há mais de uma ação importante?'),
    field('mapa', 'Link da localização no Google Maps', 'url'),
  ] },
  { id: 'funcionalidades', title: 'Funcionalidades e integrações', intro: 'Diferencie o essencial do que pode ficar para uma próxima etapa. Recursos extras serão avaliados conforme o serviço contratado.', fields: [
    field('essenciais', 'Quais funcionalidades são indispensáveis?'),
    field('futuro', 'Quais funcionalidades podem ficar para uma segunda etapa?'),
    field('blog', 'Precisa de blog, notícias ou conteúdos atualizados? Quem vai publicar?'),
    field('catalogo', 'Precisa de catálogo, busca, filtros, downloads ou galeria? Descreva.'),
    field('integracoes', 'Precisa conectar CRM, ERP, pagamentos, ferramentas de e-mail, WhatsApp ou outros sistemas?'),
    field('sistemaExistente', 'Há alguma ferramenta já contratada? Informe o nome e o link da documentação pública.'),
    field('areaRestrita', 'Precisa de login, área do cliente ou funcionalidades restritas? Descreva perfis e permissões.'),
    field('edicao', 'Quem vai atualizar o site? O que precisa conseguir alterar?'),
    field('acessibilidade', 'Existem necessidades de acessibilidade específicas do seu público?'),
  ] },
  { id: 'loja', title: 'Detalhes da loja virtual', when: ['Loja virtual'], intro: 'Esta etapa aparece para projetos de loja. Nosso time avaliará as necessidades que exigem escopo adicional.', fields: [
    field('produtos', 'Quais produtos ou serviços serão vendidos? Quantidade, categorias e variações.'),
    field('catalogoProdutos', 'Link da planilha ou catálogo: nomes, descrições, preços, fotos, estoque e códigos', 'url'),
    field('plataforma', 'Já possui plataforma de e-commerce? Qual?', 'text'),
    field('pagamentos', 'Meios de pagamento e parcelamento desejados. Informe sua plataforma de cobrança.'),
    field('frete', 'Regras de entrega, frete, regiões, retirada e transportadoras.'),
    field('estoque', 'Como o estoque é controlado? Há integração com ERP?'),
    field('trocas', 'Política de trocas, devoluções, cancelamento e atendimento.'),
    field('promocoes', 'Cupons, descontos, combos, assinaturas ou regras comerciais.'),
    field('posCompra', 'O que deve acontecer depois da compra? E-mails, formulários, acompanhamento.'),
  ] },
  { id: 'portal', title: 'Detalhes do portal ou aplicação', when: ['Aplicação ou portal'], intro: 'Descreva o fluxo de uso. Evite detalhes técnicos que você ainda não conhece.', fields: [
    field('usuarios', 'Quem usa o sistema e o que cada perfil pode fazer?'),
    field('fluxos', 'Descreva as principais tarefas do usuário, passo a passo.'),
    field('dados', 'Quais dados são cadastrados, consultados ou editados?'),
    field('relatorios', 'Quais relatórios, indicadores ou dashboards são necessários?'),
    field('notificacoes', 'Quais notificações ou automações são necessárias?'),
    field('volume', 'Qual é o volume esperado de usuários e dados?'),
  ] },
  { id: 'publicacao', title: 'Domínio, divulgação e publicação', intro: 'Não envie senhas, tokens, chaves de API ou dados de cartão. Acessos serão tratados separadamente.', fields: [
    field('dominio', 'Domínio desejado ou já registrado', 'text'),
    field('registrador', 'Onde o domínio está registrado? Quem administra?', 'text'),
    field('hospedagem', 'Já tem hospedagem? Qual? Existe uma preferência de plataforma?', 'text'),
    field('emailDominio', 'Usa e-mail no seu domínio? Qual provedor? Há configurações que precisam ser preservadas?'),
    field('seoTermos', 'Quais serviços e palavras seu cliente pesquisa no Google?'),
    field('seoLocal', 'Quais localidades devem receber destaque nas buscas?'),
    field('analytics', 'Já possui Google Analytics, Google Ads ou Meta Pixel? Informe somente IDs públicos, se souber.'),
    field('legal', 'Possui textos aprovados de privacidade, cookies, termos ou regras do seu setor? Cole o texto ou um link.'),
    field('dadosPessoais', 'Que dados pessoais o seu site vai coletar e para qual finalidade?'),
    field('manutencao', 'Como pretende cuidar de atualizações e manutenção depois da entrega?'),
  ] },
  { id: 'validacao', title: 'Entrega e observações', intro: 'Vamos organizar o que já está pronto e o que ainda precisa ser definido.', fields: [
    field('aprovador', 'Quem será responsável por aprovar o site?', 'text'),
    field('materiaisPendentes', 'Quais materiais ainda faltam e quando você consegue enviá-los?'),
    field('restricoes', 'Há datas importantes, regras técnicas, restrições ou exigências do seu setor?'),
    field('prioridades', 'Se precisar priorizar, quais são as três coisas mais importantes?'),
    field('observacoes', 'O que mais precisamos saber?'),
    field('autorizacao', 'Confirmo que posso usar os materiais enviados e autorizo o time da Logos Data a analisar estas respostas para planejar e desenvolver meu site.', 'checkbox', { required: true }),
  ] },
];
export function activeSections(answers) { return sections.filter(section => !section.when || section.when.includes(answers.tipo)); }
export function normalizeAnswers(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Respostas inválidas.');
  const answers = {};
  for (const section of sections) for (const question of section.fields) {
    const value = input[question.id];
    if (question.type === 'checkbox') answers[question.id] = value === true;
    else {
      if (value !== undefined && typeof value !== 'string') throw new Error(`Resposta inválida: ${question.id}`);
      answers[question.id] = (value || '').trim();
      if (answers[question.id].length > 8000) throw new Error(`Resposta longa demais: ${question.label}`);
      if (answers[question.id] && question.options && !question.options.includes(answers[question.id])) throw new Error(`Opção inválida: ${question.label}`);
      if (answers[question.id] && question.type === 'url') {
        const url = new URL(answers[question.id]);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`Link inválido: ${question.label}`);
      }
      if (answers[question.id] && question.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers[question.id])) throw new Error(`E-mail inválido: ${question.label}`);
    }
  }
  const active = activeSections(answers);
  for (const section of active) for (const question of section.fields) if (question.required && !answers[question.id]) throw new Error(`Preencha: ${question.label}`);
  for (const section of sections.filter(s => !active.includes(s))) for (const question of section.fields) delete answers[question.id];
  return answers;
}
