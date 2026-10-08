import { mkdir, rm, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { site, services } from '../src/site.mjs';
import { layout, webPage, homePage, servicePage, aboutPage, portfolioPage } from '../src/templates.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
if (dist !== join(root, 'dist')) throw new Error('Invalid build output');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });
export const pages = [
  ['/', 'Logos Data | Sites, E-commerce, Dados e Automação', 'Sites, lojas virtuais e aplicações web com integrações. Engenharia de dados, automação, business intelligence e inteligência artificial para negócios.', homePage()],
  ['/desenvolvimento-de-sites/', 'Site profissional por R$1.000 | Logos Data', 'Criação de site profissional por R$1.000, ou R$900 no Pix com 10% de desconto. Atendimento em todo o Brasil. Fale diretamente com a Logos Data.', webPage(), true],
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
await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(([path]) => `<url><loc>${site.origin}${path}</loc></url>`).join('')}</urlset>`);
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`);
console.log(`Build completo: ${pages.length} páginas estáticas em dist/.`);
