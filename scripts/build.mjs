import { mkdir, rm, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { briefingPage } from '../src/briefing.mjs';
import { reviewPage } from '../src/review.mjs';
import { site, services } from '../src/site.mjs';
import { layout, webPage, homePage, servicePage, aboutPage, portfolioPage } from '../src/templates.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
if (dist !== join(root, 'dist')) throw new Error('Invalid build output');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });
// Static directory URLs with trailing slashes need a fallback as well as Vercel redirects.
for (const legacy of ['contratar','pagamento']) {
  await mkdir(join(dist,legacy),{recursive:true});
  await writeFile(join(dist,legacy,'index.html'),`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="Converse com a Logos Data para definir o escopo e os próximos passos do seu projeto."><meta http-equiv="refresh" content="0;url=/desenvolvimento-de-sites/#orcamento"><link rel="canonical" href="${site.origin}/desenvolvimento-de-sites/"><title>Converse sobre seu projeto | Logos Data</title></head><body><h1>Vamos conversar sobre seu projeto.</h1><a href="/desenvolvimento-de-sites/#orcamento">Conversar sobre meu projeto</a></body></html>`);
}
export const pages = [
  ['/painel/', 'Painel privado | Logos Data', 'Área privada de revisão de pedidos da Logos Data.', reviewPage()],
  ['/briefing/', 'Briefing do seu site | Logos Data', 'Formulário para organizar as informações do seu site.', briefingPage()],
  ['/', 'Logos Data | Sites, E-commerce, Dados e Automação', 'Sites, lojas virtuais e aplicações web com integrações. Engenharia de dados, automação, business intelligence e inteligência artificial para negócios.', homePage()],
  ['/desenvolvimento-de-sites/', 'Criação de sites profissionais | Logos Data', 'Sites profissionais planejados para sua empresa. Atendimento em todo o Brasil. Converse sobre seu projeto com a Logos Data.', webPage(), true],
  ['/portfolio/', 'Portfólio | Logos Data', 'Conheça possibilidades de sites, e-commerce, dados, automação e integrações. Projetos demonstrativos são identificados claramente.', portfolioPage()],
  ['/sobre/', 'Sobre a Logos Data | Tecnologia para negócios', 'Conheça a Logos Data e Tiago Marques Pereira. Desenvolvimento web, engenharia de dados, automação e inteligência artificial para empresas.', aboutPage()],
  ...services.map(s => [`/${s.slug}/`, `${s.name} | Logos Data`, s.text, servicePage(s)]),
];
for (const [path, title, description, body, service] of pages) {
  const dir = join(dist, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), layout(path, title, description, body, service));
}
await writeFile(join(dist, '404.html'), layout('/404/', 'Página não encontrada | Logos Data', 'Acesse as soluções da Logos Data.', '<section class="compact-hero"><div class="container"><p class="eyebrow">404</p><h1>Página não encontrada.</h1><p>Confira o endereço ou volte para a página inicial.</p><a class="button" href="/">Ir para o início →</a></div></section>').replace('<head>', '<head><meta name="robots" content="noindex">'));
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(([path]) => !['/briefing/', '/contratar/', '/pagamento/', '/painel/'].includes(path)).map(([path]) => `<url><loc>${site.origin}${path}</loc></url>`).join('')}</urlset>`);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
console.log(`Build completo: ${pages.length} páginas estáticas em dist/.`);
