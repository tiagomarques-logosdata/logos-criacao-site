# Painel: Supabase Auth e TOTP

O painel utiliza Supabase Auth para senha e autenticador TOTP. Apenas SMTP_USER, com e-mail confirmado, pode entrar. A API verifica o JWT com getUser antes de confiar em suas claims e exige AMR password, AAL2 e fator TOTP verificado para listar, consultar ou editar pedidos. O banco continua sem acesso direto para anon/authenticated.

O token de acesso fica em cookie HttpOnly, Secure, SameSite=Strict, com duração máxima de uma hora. Não há tokens no localStorage nem chave de servidor no navegador. Ao expirar, faça login novamente. Sair revoga a sessão no provedor e remove os cookies. Como em sessões JWT do Supabase, um token previamente roubado pode continuar válido até expirar.

Links antigos e cookies logos_admin não autenticam mais. E-mails de revisão abrem /painel/ sem credenciais. O botão Definir ou recuperar senha gera link de uso único do Supabase enviado pelo SMTP existente, apenas ao responsável. O link serve para definir senha, não para ler pedidos. Recuperação com fator existente exige confirmar TOTP antes da troca; o usuário deve fazer login com senha depois.

Primeiro acesso: solicitar e-mail, definir senha de pelo menos 12 caracteres, entrar com ela, escanear QR pessoal e validar código. O responsável deve guardar o cadastro do autenticador de forma segura. O aplicativo não oferece remoção de fator; eventual perda deve ser tratada pelo administrador do projeto Supabase, após validar identidade.

A configuração de convite/recuperação e os erros de autenticação nunca retornam tokens no JSON. Respostas da API e página privada usam no-store; origem é validada e pedidos exigem JSON. A limitação do provedor protege login/TOTP e a RPC existente limita os e-mails de configuração a três solicitações por dez minutos.
