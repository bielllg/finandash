# Revisão de segurança, acessibilidade e privacidade

## Implementado

- Ignore de segredos na raiz e permissões locais 0600 para credenciais existentes.
- Banco publicado apenas em loopback no Docker; container recriado usando o volume existente. Backup local protegido antes das migrações.
- Workers automáticos desativados por padrão. Ativação explícita via BACKGROUND_WORKERS_ENABLED=true; manter somente um processo para os jobs.
- Bloqueio de endpoints administrativos com segredo curto ou placeholder conhecido.
- Limite de corpo JSON de 16 KiB, verificação de origem em POST e CORS sem credenciais.
- Limpeza e limite de entradas do rate limiter local; Retry-After em 429.
- Entrada de simulação rejeita campos extras e números não finitos.
- Inscrição pública por username removida. A pessoa se cadastra em conversa privada via `/assinar`; `/parar` cancela e apaga, `/dados` consulta o registro.
- Fila persistente de relatórios com chave idempotente por período, lock PostgreSQL e revisão manual quando a entrega fica ambígua. Um job interrompido pode exigir revisão; não há replay automático.
- PDF aceita somente imagens embutidas, bloqueando buscas externas pelo renderizador. Geração de PDF e planilha ocorre fora do event loop.
- Mensagens brutas de exceções dos provedores não são impressas, para evitar expor URLs que contenham tokens.
- `/api/health` verifica a conexão ao banco; respostas de erro do middleware recebem os cabeçalhos de segurança.
- CRON_SECRET fraco substituído localmente por um valor aleatório forte; o arquivo continua com permissão 0600.
- Auditorias npm e pip-audit executadas; dependências vulneráveis do frontend e do ambiente Python atualizadas.
- Dados fictícios retirados do conversor.
- Idioma pt-BR, link de salto, foco visível, cards operáveis por teclado, foco/Escape nos modais de apresentação e comparação, alvos de toque e movimento reduzido.
- Informações de armazenamento local, privacidade e condições de uso no rodapé.

## Pendências de produção

- Revogar/rotacionar token Telegram e chave Google nos respectivos provedores. Permissão de arquivo não invalida credencial exposta.
- Configurar responsável e canal real para solicitações de privacidade; definir retenção, exclusão e exportação de dados. Os textos atuais não representam certificação jurídica.
- A fila ainda não confirma entrega nem registra recibos por destinatário; conferir jobs `processing`/`needs_review` antes de repetir manualmente.
- Confirmar restauração do backup em instância isolada e instalação a partir de um banco vazio.
- Rate limiter compartilhado para múltiplas réplicas, logs sem PII, métricas, backups com teste de restauração.
- HTTPS, HSTS e CSP no servidor que hospedar o frontend; MFA/IAM, firewall e proteção de branches nos provedores.
- Dependências Python completas e lock; auditoria contínua de dependências e segredos em CI.
- Revisão manual em larguras de celular/tablet feita no navegador; ainda faltam aparelhos reais, leitores de tela e zoom 400%. Larguras de navegador não comprovam compatibilidade com todos os celulares.

## Cookies e itens não aplicáveis

Não foram encontrados cookies próprios, pixels ou analytics. Preferências de tema e ativos usam localStorage. Não foi adicionado aceite obrigatório genérico. Se rastreamento opcional for instalado, bloquear sua carga antes da escolha e oferecer rejeição e revogação equivalentes.

Login/senhas/MFA de usuários, pagamentos, GraphQL, uploads e Android nativo não existem no produto e não foram introduzidos apenas para satisfazer o checklist.

Fonte de orientação: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf
