# INTEGRATION_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

**Método:** leitura direta de código e rotas (Read/Grep/Glob). **Nenhuma
integração real foi chamada, nenhum comando executado, nenhuma conexão de
banco aberta.** Produzido diretamente pelo orquestrador (4 tentativas de
despachar um agente `vericore-integration-auditor` em background caíram por
instabilidade de conexão — `ECONNRESET` — nesta sessão; o trabalho foi feito
diretamente com Read/Grep/Glob para não bloquear o passo 23).

## Resumo

**4 integrações externas identificadas. 1 delas (CNAB) é código órfão —
existe mas nunca é montado no app.**

| Integração | Direção | Montada/roteada? |
|---|---|---|
| NF-e (fiscal) | Síncrona, saída (chamada a provedor externo) | Sim |
| Webhooks recebidos (n8n, Focus NFe) | Assíncrona, entrada | Sim |
| Conciliação bancária (OFX, upload manual) | Assíncrona (processamento de arquivo), entrada | Sim |
| CNAB (remessa/retorno bancário) | Síncrona/arquivo, saída+entrada | **NÃO — órfã, deliberadamente deixada fora do v1** |

---

## 1. NF-e (Nota Fiscal Eletrônica) — fiscal

- **Arquivos:** `server/src/modules/fiscal/infrastructure/providers/{NfeProviderFactory,FocusNfeProvider,ENotasProvider,MockNfeProvider}.ts`.
- **Propósito:** emissão, consulta de status e cancelamento de NF-e de venda
  (`IssueSaleNfeUseCase`, `GetSaleNfeStatusUseCase`, `CancelSaleNfeUseCase`,
  `server/src/modules/fiscal/application/use-cases/`).
- **Seleção de provedor:** `NfeProviderFactory.ts:1-28` — deliberadamente
  **não** lê variável de ambiente diretamente; o provedor (`mock` /
  `focus_nfe` / `enotas`) é um dado de negócio administrável
  (`CompanyFiscalConfig.nfe_provider`, vindo do banco). Credenciais
  (tokens), essas sim, vêm de variável de ambiente — nunca do banco
  (comentário explícito no próprio arquivo).
- **Direção:** síncrona, saída (o ERP chama a API do provedor).
- **Autenticação:** delegada a cada provider (tokens de API via env).
- **Montada?** Sim — usada pelos use cases de venda, que são chamados pelas
  rotas de `sales` (não reverificado rota-a-rota nesta trilha; ver
  `MODULE_CATALOG.md` para a contagem de rotas de `sales`).
- **Status de produção:** NÃO-PRODUÇÃO — depende de `clients`/`products`
  reais (ambos em 0, conforme `PRODUCTION_STATUS_MAP.md`), logo nenhuma
  NF-e real pode ser emitida hoje.

## 2. Webhooks recebidos — `server/src/modules/webhooks/`

Roteado em `server/app.ts:204`:
`app.use('/api/webhooks', require('./src/modules/webhooks/presentation/routes/webhooks'))`.

### `POST /api/webhooks/n8n`
- **Propósito:** recebe eventos do n8n (memória do projeto: "bot n8n fora do
  ar" — não reverificado nesta trilha, proibido testar conexão real).
- **Autenticação:** assinatura HMAC via header `X-Evok-Signature`
  (`webhookController.ts:17-42`), verificada e idempotência garantida por
  `ProcessN8nWebhookUseCase` (rejeita corpo sem assinatura, assinatura
  inválida, payload sem `event_id`, ou segredo não configurado — 4 códigos
  de erro distintos tratados explicitamente).
- **Tratamento de erro:** respostas HTTP específicas por tipo de falha
  (400/401/503/500) — não é um catch-all genérico.
- **Direção:** assíncrona, entrada.

### `POST /api/webhooks/focus-nfe`
- **Propósito:** notificação assíncrona de mudança de status de NF-e emitida
  via Focus NFe.
- **Autenticação:** segredo compartilhado em header `X-Webhook-Secret`
  (`FOCUS_NFE_WEBHOOK_SECRET`), não HMAC — comentário do próprio código
  explica a razão: "a Focus NFe não assina o corpo por padrão".
- **Padrão de segurança notável:** o payload recebido do webhook é usado
  **apenas para extrair a referência** — o status real da NF-e é sempre
  reconsultado diretamente na API do provedor, nunca aplicado a partir do
  corpo do webhook (`webhookController.ts:47-49`, comentário explícito).
  Isso mitiga o risco clássico de webhook forjado alterar estado a partir de
  dado não confiável.
- **Direção:** assíncrona, entrada.

## 3. Conciliação bancária (OFX) — `server/src/modules/financial/`

- **Arquivos:** `infrastructure/ofx/parseOfx.ts`,
  `application/use-cases/ImportStatementUseCase.ts`,
  `presentation/{routes/reconciliation.ts,controllers/reconciliationController.ts,middlewares/ofxUpload.ts}`.
- **Roteamento confirmado:** `reconciliation.ts` é montado como sub-router
  dentro de `finance.ts` (`const reconciliationRouter = require('./reconciliation')`),
  que por sua vez é montado em `server/app.ts:161` sob `/api/finance` —
  resultando em `/api/finance/reconciliation/...` (confirmado pelo próprio
  comentário de cabeçalho do arquivo).
- **Endpoints:** upload de extrato (`POST /statements`, multipart via
  `ofxUpload`), listagem de extratos/lançamentos/sugestões de match
  (`GET`), e ações de match/ignore/unmatch de lançamento (`POST`).
- **Autorização:** todas as rotas exigem `authorizeModule('financeiro', ...)`
  — leitura só precisa do módulo `financeiro`; escrita (upload/match/ignore/
  unmatch) exige adicionalmente a permissão `'operate'`.
- **Direção:** entrada, processamento de arquivo enviado manualmente pelo
  usuário (não é uma integração ativa/streaming com o banco).
- **Status de produção:** NÃO-PRODUÇÃO (depende de fluxo financeiro real,
  hoje inexistente — ver `PRODUCTION_STATUS_MAP.md`).

## 4. CNAB (remessa/retorno de banco) — código órfão, confirmado

- **Arquivos existentes:** `infrastructure/cnab/{buildRemittanceFile,cnabFieldUtils,fixedWidthLayout,layouts240,parseReturnFile}.ts`,
  `application/use-cases/{GenerateRemittanceUseCase,ProcessReturnFileUseCase}.ts`,
  `presentation/{routes/cnab.ts,controllers/cnabController.ts,middlewares/cnabReturnUpload.ts,validators/cnabValidators.ts}`.
  Todas as camadas (domain/application/infrastructure/presentation) estão
  presentes e implementadas — não é um esqueleto vazio.
- **Confirmado NÃO montado:** `Grep "cnab"` (case-insensitive) em
  `server/app.ts` retorna **zero ocorrências**. `finance.ts` (o roteador
  principal do módulo financeiro, montado em `/api/finance`) **não**
  requer `cnab.ts` em nenhum ponto — só requer `reconciliation.ts`.
- **Motivo documentado, não omissão acidental:** comentário explícito em
  `reconciliation.ts:9` e `finance.ts:56`: *"gap 'conciliação bancária/CNAB'
  de `docs/governance/TODO.md` — CNAB fica fora desta v1"*. Ou seja, o
  próprio time deixou o registro de que CNAB foi implementado mas
  deliberadamente não conectado nesta versão — não é um bug de "esqueceram
  de montar a rota", é uma decisão de escopo registrada no código.
- **Direção pretendida (quando montado):** saída (geração de arquivo de
  remessa CNAB 240 para banco) + entrada (parse de arquivo de retorno via
  upload).
- **Risco de discovery a registrar (não é finding formal ainda — isso é
  passo 25+/31):** código órfão implica risco de drift silencioso — se
  `layouts240.ts`/`buildRemittanceFile.ts` nunca são exercitados por rota
  real, qualquer mudança de schema/model que os quebre não seria pega por
  nenhum teste de integração via rota (só testes unitários isolados, se
  existirem, cobririam isso). Recomendo à auditoria 360° (passo 31)
  verificar se há teste algum cobrindo este código órfão.

---

## Observação de processo

Esta trilha foi originalmente delegada a um agente `vericore-integration-auditor`
em background, mas as 4 tentativas de despacho falharam por erro de conexão
(`ECONNRESET`) antes de produzir qualquer resultado utilizável. O
orquestrador assumiu o trabalho diretamente via Read/Grep/Glob para não
atrasar o passo 23. Nenhuma regra de segurança foi relaxada por isso — o
método (leitura estática, sem execução) é o mesmo que seria exigido do
agente.

---

*Produzido diretamente pelo orquestrador (Claude Code) em modo read-only
reforçado, via Read/Grep/Glob, após 4 falhas de conexão do agente
`vericore-integration-auditor` dedicado a esta trilha.*
