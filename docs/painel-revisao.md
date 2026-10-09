# Painel privado de revisão

Endereço: `/painel/`. Login por link de uso único enviado exclusivamente ao SMTP_USER configurado (tiago.marques@logosdata.com.br). Link válido por 15 minutos, sessão de 7 dias em cookie HttpOnly/Secure/SameSite Strict, logout revoga a sessão. Nenhuma chave Supabase/worker no navegador. O pedido de link tem limite global de três por dez minutos.

Execute `review-panel.sql` após `workflow.sql`. Tabelas de sessão, tokens e histórico têm RLS e acesso somente ao backend. O formulário e o painel não carregam anúncios, não entram no sitemap e têm noindex/no-store.

Avisos de revisão são enviados ao responsável, não ao cliente. Claim no banco evita processamento simultâneo; o executor tenta novamente avisos pendentes a cada consulta. Uma falha entre aceitação SMTP e gravação pode repetir o aviso. Novo ciclo de análise permite um novo aviso. Pedidos que já estavam em revisão recebem aviso após a implantação.

O painel mostra até os 100 pedidos mais recentes, com filtro por status, respostas completas, contatos, pendências, histórico e campos editáveis. Análises novas associam pendências a IDs de campos em reviewFields. Análises anteriores mostram associações sugeridas por palavras-chave, identificadas como sugestões; pendências gerais continuam visíveis.

Salvar exige uma observação e mantém o pedido em revisão. Salvar e reenviar altera a fila de maneira atômica e salva histórico antes/depois. Somente needs_review/failed permitem edição. Um conflito de versão ou mudança de status retorna 409 sem sobrescrever; atualizar antes de continuar. Corrigir as respostas após falar com o cliente, então reenviar. A nova análise pode encontrar pendências novamente. Não há botão para ignorar escopo ou restrições nem publicação automática.

O status completed significa primeira versão gerada para revisão do time. Nenhum e-mail de cliente anuncia produção concluída. Materiais por links não são baixados nem verificados pelo painel.

Pedidos com status created (aguardando pagamento) somem da lista após três horas da criação. Os registros são preservados e a confirmação de pagamento tardio continua funcionando. Pedidos em outros status não expiram na lista. O painel atualiza a cada 30 segundos enquanto visível, sem edição não salva e sem envio em andamento; também há o botão Atualizar.
