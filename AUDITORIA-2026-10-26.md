# Auditoria de acessibilidade, dispositivos e segurança

Data: 26/10/2026. Ambiente local: frontend em localhost:5174 e API em 127.0.0.1:8000.

Esta revisão inspecionou código, árvore de acessibilidade e geometria do DOM no navegador Chromium do aplicativo. Também executou testes existentes, auditorias de dependências e requisições locais controladas à API. O objetivo de acessibilidade foi WCAG 2.2 AA. O código do aplicativo e as dependências não foram alterados nesta revisão.

## Resultado principal

Há barreiras confirmadas de acessibilidade, duas falhas de tratamento de entrada na API e uma dependência de desenvolvimento com avisos de segurança. Os layouts principais não apresentaram elementos fora da largura da tela nas dimensões medidas. Isso não comprova funcionamento em todos os aparelhos, sistemas ou tecnologias assistivas.

## Achados prioritários

### A1 — Alta: comparador e ajuda de atalhos ficam inativos junto com o fundo

- Referências: `frontend/src/hooks/useDialog.ts:14`, `frontend/src/Dashboard.tsx:211`, `frontend/src/components/KeyboardShortcuts.tsx:55`.
- Reprodução: fechar a apresentação e abrir Comparar ou Abrir atalhos de teclado.
- Evidência: em ambos, `dialog.closest('[inert]')` encontra o app-shell; o foco permanece em BODY, fora do diálogo. A árvore de acessibilidade fica sem conteúdo interativo.
- Causa: useDialog aplica inert ao app-shell, mas esses dois diálogos são descendentes desse elemento. Os diálogos de apresentação e Sobre ficam fora dessa área.
- Impacto: usuários de teclado e leitores de tela não conseguem operar os controles do comparador ou da ajuda. Escape ainda fecha os dois nos testes realizados.
- Correção: renderizar todos os modais em um portal fora do app-shell; depois validar Tab, Shift+Tab, Escape, foco inicial e retorno de foco.
- Critérios relacionados: 2.1.1, 2.4.3 e 4.1.2.

### A2 — Alta: contraste insuficiente dos botões no tema escuro

- Referências: `frontend/src/components/FeaturesSection.tsx:110`, `frontend/src/components/IntroModal.tsx:70`, `frontend/src/components/QuoteChart.tsx:115`, `frontend/src/components/Base100Comparator.tsx:106`, `frontend/src/Dashboard.tsx:134`.
- Evidência: texto #FFFFFF sobre fundo #00C2FF apresenta contraste de aproximadamente 2,07:1. A cor foi confirmada no DOM de Simular Agora e do filtro Todos.
- Impacto: leitura difícil para pessoas com baixa visão. A relação fica abaixo de 4,5:1 para texto comum e de 3:1 para texto grande.
- Correção: criar um token de texto sobre o destaque, escuro no tema escuro, ou escurecer o fundo dos botões. Conferir também hover e foco.
- Critério: 1.4.3.

### S1 — Média: entradas inválidas produzem erro 500 sem cabeçalhos de segurança

- Referências: `backend/src/routers/features.py:11`, `backend/src/routers/features.py:58`, `backend/src/main.py:119`. A comparação de token também existe em `backend/src/routers/quotes.py:158`.
- Reprodução 1: enviar JSON com `initial_amount: NaN`, contribuição 0, taxa 10 e período 1 ao simulador. Resposta observada: 500, sem X-Content-Type-Options.
- Reprodução 2: enviar Authorization com um caractere não ASCII ao endpoint de relatórios. Resposta observada: 500, sem X-Content-Type-Options. Nenhum relatório foi autorizado ou enfileirado por esse teste.
- Causa: o erro de validação contendo NaN não é serializado com segurança pelo tratamento padrão; compare_digest com strings não ASCII lança TypeError. Exceções não tratadas escapam de call_next antes da aplicação dos cabeçalhos.
- Impacto demonstrado: erro interno acionável sem autenticação e perda dos cabeçalhos nessas respostas. A API continuou disponível; não foi demonstrado bypass de autenticação nem vazamento de dados.
- Correção: rejeitar constantes JSON não finitas com resposta 400/422 serializável; normalizar a comparação do token para bytes ou rejeitar caracteres inválidos com 401; garantir cabeçalhos também no tratamento global de exceções. Adicionar testes de regressão.

### S2 — Média no projeto: dependência de desenvolvimento com aviso de severidade alta

- Referência: `frontend/package-lock.json:3469`.
- `npm audit` encontrou undici 8.10.2 com três avisos, um deles de severidade alta. A cadeia observada é jsdom -> undici; trata-se de dependência de desenvolvimento usada nos testes.
- `npm audit --omit=dev` não encontrou vulnerabilidades conhecidas. Não foi demonstrada exploração desse pacote pelo frontend publicado.
- Correção disponível: atualizar a resolução do pacote para uma versão corrigida, revisar o lockfile e repetir os testes. O aviso consultado indica correção na série 8 a partir de 8.12.2.
- Fonte: https://github.com/advisories/GHSA-xjj6-f33q-929c

### A3 — Média: atalhos de caractere único sem opção de desativação

- Referência: `frontend/src/components/KeyboardShortcuts.tsx:20`.
- A, C, T e ? são capturados globalmente, fora de campos de entrada, sem configuração para desligar ou remapear.
- Impacto: digitação acidental e comandos por voz podem abrir áreas ou alterar o tema.
- Correção: oferecer opção para desativar/remapear ou restringir a ativação ao componente com foco.
- Critério: 2.1.4.

### A4 — Média: resultado da simulação depende do gráfico visual

- Referência: `frontend/src/components/FeaturesSection.tsx:118`.
- Evidência: depois de Simular Agora, a árvore de acessibilidade mostra legendas e marcas dos eixos, mas não um resumo textual do patrimônio final, do total investido e dos juros, nem tabela equivalente.
- Impacto: usuários que não enxergam o gráfico não recebem uma alternativa textual clara ao resultado principal. Não foi executado teste com NVDA, VoiceOver ou TalkBack.
- Correção: incluir resumo numérico em texto, anúncio de conclusão e tabela acessível dos valores; revisar também histórico e comparador.
- Critérios relacionados: 1.1.1 e 4.1.3.

### A5 — Média: botão de remover estreito e com nome genérico

- Referência: `frontend/src/Dashboard.tsx:177`.
- Medição: botões Remover com 22 x 44 CSS px nas sete larguras do mercado. Os botões ficam sobrepostos à área clicável do card.
- Impacto: alvo estreito para toque e nome que não identifica qual ativo será removido.
- Correção: usar área de 44 x 44 CSS px, reservar espaço no card e nomear, por exemplo, Remover BTC da carteira. Confirmar a geometria das exceções de espaçamento do critério 2.5.8; não basta medir apenas a altura.
- Observação: os checkboxes SMA medem 13 px de largura, mas têm labels clicáveis envolventes. Não foram classificados automaticamente como falha pelo tamanho do input isolado.

### A6 — Baixa: labels visuais do simulador não estão associadas aos campos

- Referência: `frontend/src/components/FeaturesSection.tsx:61`.
- Evidência: as quatro labels retornam `label.control === null`. Os inputs têm aria-label e, portanto, não estão sem nome acessível.
- Impacto: clicar na label não foca o campo, reduzindo a área útil no celular. A label visível e o nome por voz também devem ser revisados em conjunto.
- Correção: associar htmlFor e id, usar nomes consistentes e preservar ajuda/erros acessíveis.

### Q1 — Baixa: teste de segurança está desatualizado

- Referência: `backend/tests/test_security.py:23`.
- Resultado: espera 503 na inscrição pública removida, mas a implementação retorna 410 Gone.
- Correção: alinhar a expectativa ao contrato decidido. Não reativar inscrição pública para fazer o teste passar.

## Dispositivos e cobertura

| Área | Dimensões CSS testadas | Resultado observado |
| --- | --- | --- |
| Mercado | 320x740, 360x800, 390x844, 430x932, 768x1024, 1024x768, 1280x800 | Sem elementos de main fora da largura medida |
| Simulador e relatórios | 320x740, 390x844, 768x1024, 1024x768, 1280x800, 844x390 | Sem elementos de main fora da largura medida |
| Seleção de ativos | 320x740 | Busca e categorias acessíveis na árvore; busca recebe foco |
| Comparador | 320x740 | Caixa de 273x666 CSS px; falha de inert descrita em A1 |
| Sobre | 844x390 | Diálogo fora de inert, recebe foco; altura limitada a 351 CSS px |
| Temas | Claro e escuro em 390x844 | Botão do simulador com fundos #0066CC e #00C2FF; falha de contraste no escuro |

A seleção de ativos existente foi preservada. O tema do sistema e o tamanho normal do navegador foram restaurados. A aba temporária de auditoria foi fechada.

Limitações: não foram usados aparelhos físicos, Safari/iOS, Firefox, TalkBack, VoiceOver ou NVDA. Não houve ensaio real de zoom a 400%, teclado virtual, áreas seguras de notch ou orientação por sensores. Redimensionamento de viewport não simula esses comportamentos. A inspeção automatizada desta revisão usou medições do DOM e requisições controladas; não foi uma varredura axe ou uma certificação WCAG.

## Segurança: controles confirmados

- Health e consulta de ativos responderam 200.
- Endpoints administrativos sem token responderam 401.
- POST com origem não permitida respondeu 403.
- Simulação com valor negativo respondeu 422.
- Corpo JSON acima do limite de 16 KiB respondeu 413.
- Arquivos privados consultados via /@fs receberam 403; não houve chave privada no conteúdo dessas respostas. A rota /.env devolveu HTML do fallback da aplicação, não o arquivo de ambiente.
- Backend e PostgreSQL estão em loopback. O servidor de desenvolvimento do frontend escuta em 0.0.0.0:5174; não é uma configuração de publicação de produção.
- Backend/.env e o JSON de credencial Google estão com modo 0600.
- Cabeçalhos de proteção presentes nas respostas normais; exceções descritas em S1.
- Auditoria Python: nenhuma vulnerabilidade conhecida encontrada nas dependências auditadas. O pacote local fin-dashboard-backend não está no PyPI e não é coberto por essa base de vulnerabilidades.

Não foi validada a revogação das credenciais nos provedores. A existência de um arquivo local não prova que sua chave continua válida, nem que uma chave anteriormente exposta foi revogada. HTTPS/CSP/HSTS de produção, IAM, MFA e infraestrutura externa ficam fora do alcance desta execução local.

## Testes existentes

- Frontend: 2 arquivos, 2 testes aprovados.
- Backend: 3 aprovados, 1 reprovado pelo contrato 410/503 descrito em Q1.
- Esses testes não cobrem os dois modais descendentes de inert nem as duas entradas malformadas reproduzidas nesta auditoria. Aprovação dos testes atuais não comprova ausência dessas falhas.

## Ordem recomendada de correção

1. Corrigir a estrutura dos modais e testar navegação por teclado.
2. Corrigir os botões de destaque nos dois temas.
3. Tratar entradas malformadas e padronizar as respostas de erro da API.
4. Atualizar a dependência de desenvolvimento vulnerável e o teste de contrato.
5. Completar alternativas textuais dos gráficos, atalhos configuráveis e alvos de toque.
6. Executar validação assistiva e em aparelhos reais antes de declarar compatibilidade ampla.

## Referências

- Contraste WCAG: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- Tamanho de alvo e exceções: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Atalhos de caractere: https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html
