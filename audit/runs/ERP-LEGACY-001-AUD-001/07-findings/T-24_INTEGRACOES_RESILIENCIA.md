# T-24 — INTEGRAÇÕES E RESILIÊNCIA · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-integration-auditor` (T-24 integracoes e resiliencia) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:      ERP-LEGACY-001-AUD-001
TRILHA:        T-24 — Integrações e Resiliência
TITULAR:       vericore-integration-auditor
AUTORIDADE:    AUDIT_PLAN.md §4.4 (linhas 562-568)
REGIME:        APR-2026-016 — read-only, zero conexão de banco, zero execução
AUDIT_COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f (declarado; ver IN-08 abaixo)
ESTADO:        FIELDWORK CONCLUÍDO — sem veredito de aprovação emitido (Regra 22)
```

**IN-08 — declaração vinculante.** Não tenho shell nesta sessão. Não afirmo proveniência temporal de código (nada sobre "quando"/"em que commit"); auditei a árvore de trabalho lida diretamente do disco em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/`. Todas as contagens vêm de Read/Grep, não de comandos. Se o diretor exigir amarração criptográfica ao `AUDIT_COMMIT`, isso é lacuna de método já registrada por T-17/T-18 (`RES-T17-02`), à qual me somo sem reabrir.

Nenhum arquivo foi criado ou alterado (Regra 2). Findings saem `PROPOSED` (Regra 22).

---

### COBERTURA EFETIVA (honesta)

| Integração do escopo §4.4 | Timeout declarado? | Retry? | Falha total → | Circuit breaker/degradação? | Cobertura |
|---|---|---|---|---|---|
| **Focus NFe** (`FocusNfeProvider.ts`, `issue`/`queryStatus`/`cancel`) | **Não.** `fetch()` sem `signal`/`AbortController` em nenhuma das 3 chamadas (`:100,132,151`). Só o timeout implícito, não documentado, do runtime | **Nenhuma.** Uma tentativa; sem backoff, sem fila | **Emissão (`issue`):** convertido em `status:'denied'` (T24-F02) · **Consulta/webhook (`queryStatus`):** exceção propaga sem tratamento (T24-F01) · **Cancelamento:** exceção propaga, sem corrupção de estado | **Nenhum** | Alta (3 use cases lidos linha a linha) |
| **eNotas** (`ENotasProvider.ts`) | **Não**, mesmo padrão (`:82,114,133`) | **Nenhuma** | Idêntico ao Focus NFe (mesmo `NfeProviderFactory`, mesmos use cases) | **Nenhum** | Alta |
| **n8n** (`POST /api/webhooks/n8n`) | N/A (entrada, não chamada de saída) | N/A (recepção; idempotência por `event_id`, não retry de envio) | 503 fechado explícito se `N8N_WEBHOOK_SECRET` ausente; 400/401/500 para os demais erros | **Falha fechada é o próprio design** — correto | Alta |
| **Focus NFe webhook** (`POST /api/webhooks/focus-nfe`) | N/A (entrada) | N/A | 503 se `FOCUS_NFE_WEBHOOK_SECRET` ausente; 500 com `error.message` cru nos demais erros (já `T17-F07`) | Nenhum; reconsulta ao provedor externo em cada chamada, sem cache/janela | Alta |
| **SMTP / e-mail** (`emailService.ts`) | Implícito (padrões do `nodemailer`, não sobrescritos) | **Nenhuma** — 1 tentativa, falha logada e descartada (design explícito, documentado no cabeçalho do arquivo) | Silêncio controlado: log de erro, promise sempre resolvida, fluxo de negócio segue como concluído | Fallback: sem SMTP configurado, conteúdo vai para o log do servidor (degradação declarada) | Alta |
| **QR Code** (`qrCodeService.ts`) | N/A | N/A | N/A | N/A | **Não é integração externa** — biblioteca `qrcode` roda in-process, sem rede. Fora do escopo de resiliência a falha externa; confirmo por leitura integral |
| **Upload** (`uploadService.ts`) | N/A | N/A | N/A | N/A | **Não é integração externa** — `fs.writeFileSync`/`fs.renameSync` local. Confirmo por leitura integral: nenhuma chamada de rede |
| **Comex** (ângulo de resiliência) | N/A | N/A | N/A | N/A | **Confirmado: zero integração automatizada.** `RegisterImportTrackingUseCase.ts` (lido integralmente) é 100% entrada manual via API interna — não há `fetch`/`http`/`axios` em `server/src/modules/comex/**` (Grep exaustivo, zero ocorrências). Rastreamento de embarque/desembaraço é digitado por um humano, não consultado a uma API de transportador/receita federal. Não há "fornecedor externo" para timeout/retry auditar aqui |
| **Auditoria/alerta** (`auditLogService.ts`, `AUDIT_ALERT_WEBHOOK_URL`) | Não | Não — 1 tentativa, `try/catch` mudo | Log de erro no console; não bloqueia o fluxo principal (é o último recurso de um retry de 2 tentativas de escrita local) | N/A | Alta |

---

## Resposta às duas perguntas centrais, por integração

### Focus NFe / eNotas (emissão de NF-e) — **as duas respostas são o achado principal desta trilha**

**"O que acontece se reenviar duas vezes?"** — Depende de QUAL operação:
- **Reconsulta de status** (`GET /sales/:id/nfe` e webhook `focus-nfe`, via `GetSaleNfeStatusUseCase.ts:88-91,113-132`): **protegido corretamente.** Estado terminal (`authorized`/`cancelled`) retorna sem tocar nada; estado intermediário usa `LOCK.UPDATE` na venda + checagem `alreadyReconciled` (`saleInvoice.nfe_status !== 'processing'`) dentro da mesma transação — duas reconsultas concorrentes serializam pelo lock e a segunda não reaplica baixa de estoque nem recebível. **Confirmo e refino T-17/T-08: reenviar o webhook do Focus NFe não duplica efeito patrimonial** (estoque/recebível), mesmo sem proteção de replay no protocolo HTTP — a proteção existe uma camada abaixo, no estado do banco.
- **Emissão** (`IssueSaleNfeUseCase.execute`): **não é idempotente para o operador humano**, e isso é o próprio `T24-F02` abaixo.

**"O que acontece com resposta perdida?"** — **É o pior caso do escopo, e a resposta é: o ERP assume falha (denied) quando na verdade não sabe.** Ver `T24-F02`.

---

## FINDINGS

### T24-F01 — Falta de credencial do provedor de NF-e não falha fechado: deixa a venda presa em `processing` para sempre, com numeração de NF-e queimada
**Severidade: CRITICAL · Confiança: CONFIRMED**

Cadeia completa, por leitura própria:

1. `IssueSaleNfeUseCase.ts:106-293` — transação curta de **reserva**: trava a venda, marca `sale.nfe_status = 'processing'` (`:253`), **incrementa `config.nfe_next_number`** (`:187-189`, número de NF-e consumido de forma irreversível — é sequencial e não há "devolução" de número), grava `sale_invoices` com `nfe_status:'processing'` (`:266-276`). **Commit.**
2. `IssueSaleNfeUseCase.ts:295` — **fora de qualquer `try/catch`**: `const provider = createNfeProvider(reserved.provider);`.
3. `FocusNfeProvider.ts:44-47` / `ENotasProvider.ts:35-39` — o **construtor lança de forma síncrona** se `FOCUS_NFE_TOKEN`/`ENOTAS_API_KEY`/`ENOTAS_EMPRESA_ID` estiverem ausentes (confirma e amplia `T18-F03`, que já provou que esses 4 segredos escapam de `runtimeEnv.ts` sem fail-fast em boot).
4. O `try/catch` de `IssueSaleNfeUseCase.ts:297-347` **só envolve `provider.issue(...)`, não `createNfeProvider(...)` da linha 295.** A exceção do construtor propaga sem tratamento até o `errorHandler` (500 ao cliente) — **mas o passo 1 já foi commitado.**
5. Resultado: a venda fica com `nfe_status = 'processing'` permanentemente. Retentativa de emissão é bloqueada por `IssueSaleNfeUseCase.ts:116-118` (`if (sale.nfe_status === 'processing') throw ConflictError`). A via de reconciliação (`GET /sales/:id/nfe` → `GetSaleNfeStatusUseCase.ts:96`) chama o **mesmo** `createNfeProvider(config.nfe_provider)`, que lança **o mesmo erro** enquanto a variável faltar — não há caminho de leitura que resolva o estado.
6. Mesmo depois de a variável de ambiente ser corrigida, a reconciliação não resolve sozinha: o `ref` (`sale-{id}-{series}-{number}`) **nunca foi de fato submetido** ao provedor (o `issue()` nunca chegou a rodar), então uma reconsulta a esse `ref` consulta uma NF-e que não existe do lado do provedor — `mapFocusStatus`/`mapENotasStatus` caem no `default: 'processing'` (`FocusNfeProvider.ts:34`, `ENotasProvider.ts:25`) para qualquer resposta sem `status` reconhecido. **A venda permanece em `processing` indefinidamente; a única saída é intervenção manual no banco.**

**Impacto:** um erro de configuração (nove segredos fora de `runtimeEnv.ts`, já provado por T-18) deixa de ser "erro no primeiro uso" e passa a ser **corrupção de estado sem reversão automática** — a pergunta do plano ("o que acontece se a Focus NFe estiver fora do ar por 10 minutos") tem resposta pior no caso de credencial ausente do que no caso de indisponibilidade transitória: aqui não há "voltar ao ar" que resolva.

**Âncoras:** `server/src/modules/fiscal/application/use-cases/IssueSaleNfeUseCase.ts:106-118,187-189,253,266-276,295-297` · `server/src/modules/fiscal/application/use-cases/GetSaleNfeStatusUseCase.ts:88-96` · `server/src/modules/fiscal/infrastructure/providers/FocusNfeProvider.ts:42-50` · `server/src/modules/fiscal/infrastructure/providers/ENotasProvider.ts:33-42` · `server/src/modules/fiscal/infrastructure/providers/NfeProviderFactory.ts:16-26`.

**Handoff:** amplia `T18-F03` (mesma causa raiz de segredo fora de `runtimeEnv.ts`); a consequência de estado é matéria própria de T-24, não duplicação.

---

### T24-F02 — Nenhum timeout declarado nas chamadas a Focus NFe/eNotas; falha de rede na emissão é indistinguível de rejeição fiscal real, e o retentativa manual pode gerar duas NF-e reais para a mesma venda
**Severidade: HIGH · Confiança: CONFIRMED**

- Nenhuma das 6 chamadas `fetch(...)` em `FocusNfeProvider.ts:100,132,151` e `ENotasProvider.ts:82,114,133` passa `signal`/`AbortController` ou qualquer opção de timeout. Grep exaustivo em `server/src` por `AbortController`/`signal:`/timeout de fetch: **zero ocorrências relevantes** (as únicas 6 ocorrências da palavra "timeout" são nomes de parâmetro de listagem, não configuração de rede). O único teto é o timeout implícito e não documentado do runtime Node (não escolhido, não declarado, não testado neste projeto — nenhum teste referencia `FocusNfeProvider`/`ENotasProvider`, Grep confirmado).
- Nenhuma biblioteca de retry ou circuit breaker está nas dependências do servidor (Grep em `server/package.json` por `opossum`/`p-retry`/`axios-retry`/`cockatiel`: zero).
- **Consequência concreta em `IssueSaleNfeUseCase.ts:297-347`:** o `try/catch` que envolve `provider.issue(...)` mapeia **qualquer** falha — timeout, `ECONNRESET`, DNS, erro 5xx do provedor — para `result.status = 'denied'` (`:340-346`), **exatamente o mesmo resultado** que uma rejeição fiscal legítima do SEFAZ produziria via `FocusNfeProvider.ts:108-116`. A transação final (`:349-439`) persiste `sale.nfe_status = 'denied'` com a mensagem de erro genérica (`error.message`), consumindo o número de série já reservado (`T24-F01`, passo 1).
- Como `'denied'` **não é** estado terminal para o guard de reemissão (`IssueSaleNfeUseCase.ts:113-114` só bloqueia por `'processing'`), o operador pode emitir novamente a mesma venda — o que gera um **novo `ref`/número de série** e uma **nova chamada real** `provider.issue(...)` ao provedor. Se a primeira chamada, apesar do timeout local, **tiver sido processada e autorizada do lado da Focus NFe/eNotas** (o clássico cenário de "resposta perdida" — rede caiu na volta, não na ida), o resultado é **duas NF-e autorizadas para a mesma mercadoria/venda** perante o fisco, uma delas órfã no ERP (nunca reconciliada, porque nada aponta para o `ref` original perdido).
- Não há reconciliação automática nem sinalização diferenciada entre "recusado pelo fisco" e "sem resposta" — o campo `nfe_error_message` guarda o texto cru do erro de rede (ex.: `fetch failed`, timeout do socket), mas o `nfe_status` é o mesmo `'denied'` em ambos os casos; nada no contrato (`API.md`, não reverificado nesta trilha) instrui o operador a reconsultar antes de reemitir.

**Impacto:** o cenário-teste do plano ("Focus NFe fora do ar por 10 minutos durante emissão") não resulta em erro visível e seguro — resulta em um estado ambíguo que, combinado com o comportamento humano esperado ("tentar de novo"), tem risco real de duplicação de documento fiscal.

**Âncoras:** `FocusNfeProvider.ts:100-129` · `ENotasProvider.ts:82-111` · `IssueSaleNfeUseCase.ts:113-118,296-347`.

**Escalono ao diretor:** este é o achado de maior severidade da trilha e tem implicação fiscal/contábil direta — recomendo revisão conjunta com T-08 (fiscal) antes de fechamento.

---

### T24-F03 — Nove segredos de integração fora de `runtimeEnv.ts` falham de formas opostas conforme o ponto de chamada (confirma T18-F03, acrescenta a distinção de resiliência)
**Severidade: MEDIUM · Confiança: CONFIRMED**

Confirmo `T18-F03` por leitura própria e acrescento a dimensão de resiliência que não é da alçada de T-18:

| Ponto de chamada | Comportamento na ausência do segredo |
|---|---|
| `POST /api/webhooks/n8n` (`webhookController.ts` via `ProcessN8nWebhookUseCase.ts:53-58`) | **Falha fechada limpa**: `WEBHOOK_SECRET_NOT_CONFIGURED` → 503, nenhuma escrita, nenhum estado corrompido |
| `POST /api/webhooks/focus-nfe` (`webhookController.ts:52-56`) | **Falha fechada limpa**: 503, nenhuma escrita |
| Emissão de NF-e (`IssueSaleNfeUseCase` via `NfeProviderFactory`) | **Falha suja** (`T24-F01`): estado já commitado antes do erro, sem caminho de volta |
| Alerta de auditoria (`AUDIT_ALERT_WEBHOOK_URL`, `auditLogService.ts:76-89`) | **Degradação correta**: `if (webhookUrl)` — ausência simplesmente pula o alerta, sem exceção; o evento de falha já foi persistido em arquivo antes (`:69-74`) |

**Nota:** a mesma classe de causa raiz (T18-F03) produz efeitos de resiliência radicalmente diferentes dependendo de onde o segredo é consumido. Isso é relevante para priorização de remediação: corrigir a validação em `runtimeEnv.ts` resolve o sintoma em todos os pontos, mas não resolve, sozinho, a ausência de `try/catch` ao redor de `createNfeProvider(...)` (`T24-F01`), que é o defeito estrutural.

---

### T24-F04 — n8n confirmado, por leitura independente, como transporte burro; achado de observabilidade: o log de eventos é só-escrita, sem superfície de leitura
**Severidade: LOW (achado positivo com uma lacuna) · Confiança: CONFIRMED**

**Parte de conformidade:** verifiquei por leitura própria (sem depender de `EXTERNAL_CONSUMER_INVENTORY.md`, embora ele chegue à mesma conclusão de forma independente) que `ProcessN8nWebhookUseCase.ts` faz exatamente três coisas — validar HMAC-SHA256 em tempo constante (`:60-66`), exigir `event_id` (`:68-71`) e persistir em `WebhookEvent` via `findOrCreateEvent` (`:73-79`). **Não há despacho, roteamento nem invocação de nenhum use case de negócio.** A idempotência é garantida em dois níveis, não apenas um: (a) checagem `findOrCreate` na aplicação e (b) **constraint única de banco** `webhook_events_source_event_id_unique` sobre `(source, event_id)` (`migrations/20260731-000014-create-webhook-events.cjs:21-24`) — logo, duas entregas concorrentes do mesmo evento são serializadas pelo próprio Postgres, não apenas por lógica de aplicação (mais forte do que o padrão check-then-act). **Isto confirma, com evidência de schema, que o n8n é tratado como transporte burro de fato, coerente com a decisão do dono** ("n8n fica, servidor de produção adiado").

**A lacuna:** Grep exaustivo em `server/src/modules/webhooks/**` por qualquer leitura de `WebhookEvent` fora do próprio `findOrCreateEvent`: **zero ocorrências.** Não existe rota, controller ou job que liste, consulte ou reprocesse os eventos gravados. A tabela é **write-only** do ponto de vista do próprio repositório. Isso não é um defeito do desenho "n8n é burro" — é uma lacuna de observabilidade da integração: se um evento é recebido e um workflow externo (fora deste repositório, conforme `EXTERNAL_CONSUMER_INVENTORY.md:66-69`) esperava que o ERP reagisse a ele por algum outro canal, **não há como um operador do ERP consultar "quais eventos chegaram, quando, e com que payload" sem acesso direto ao banco** — o critério de pronto desta trilha ("estado rastreável para reconciliação") está parcialmente atendido: o dado existe e é correto (fonte da verdade real), mas a superfície de reconciliação operacional não existe.

**Âncoras:** `server/src/modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase.ts:46-82` · `server/migrations/20260731-000014-create-webhook-events.cjs:1-30` · `server/src/models/WebhookEvent.ts`.

---

### T24-F05 — Webhook Focus NFe: reenvio de rede não duplica efeito patrimonial (achado positivo, refina T-17/T-18 pelo ângulo de resiliência)
**Severidade: N/A — confirmação de controle, não defeito · Confiança: CONFIRMED**

T-17 (`T17-F02`) e T-18 (`T18-F06`) já documentaram, pelo ângulo de segurança/contrato, que `POST /api/webhooks/focus-nfe` não tem proteção de replay no protocolo (comparação `!==`, sem HMAC, sem `event_id`). Minha tarefa era avaliar o efeito prático de um reenvio de rede (não malicioso) — e por leitura própria de `GetSaleNfeStatusUseCase.ts:88-91,113-132` confirmo que **o reenvio não duplica o efeito**: o guard `alreadyReconciled` roda dentro de uma transação com `LOCK.UPDATE` sobre a venda, então duas invocações concorrentes (a legítima e o reenvio) serializam nesse lock; a segunda vê `saleInvoice.nfe_status !== 'processing'` já verdadeiro e pula integralmente a reaplicação de baixa de estoque e criação de recebível. **O que o reenvio de fato causa** (residual, não crítico): uma chamada redundante a `provider.queryStatus(...)` — consumo de cota/latência do provedor externo, já anotado por T-18 como "amplificação de reconsultas". Registro esta confirmação porque a pergunta do plano era literalmente esta ("Focus NFe reenviar o webhook duplica efeito?") e a resposta, com evidência própria, é **não, para o efeito de negócio; sim, para a chamada externa redundante.**

---

### T24-F06 — E-mail e alerta de auditoria: silêncio controlado e declarado, não um vazio acidental
**Severidade: N/A — confirmação de conformidade · Confiança: CONFIRMED**

`emailService.ts:53-71` documenta explicitamente (cabeçalho do arquivo, `:1-10`) a decisão de design: sem SMTP configurado, o conteúdo do e-mail vai para o log do servidor e o fluxo de negócio segue como concluído; com SMTP configurado, falha de envio é capturada (`:68-70`), logada, e a `Promise` **nunca rejeita**. Não há retry nem fila, mas isso é consistente com o próprio comentário do arquivo — é uma escolha declarada de "best-effort", não uma lacuna descoberta. Da mesma forma, `auditLogService.ts:76-89` só dispara o webhook de alerta se a URL estiver configurada, e o `try/catch` ao redor do `fetch` garante que uma falha no alerta não impede a persistência do arquivo de fallback já gravada antes (`:69-74`). **Não registro finding aqui** — é o padrão correto de degradação controlada que o critério de pronto desta trilha pede para os demais casos.

---

## O que está correto (registro de negativa, para não inflar o quadro)

- **Arquitetura de transação curta em `IssueSaleNfeUseCase`** (reserva → chamada externa fora de transação → finalização) é o padrão certo para não segurar locks de banco durante I/O de rede — o defeito não está no desenho geral, está na ausência de tratamento de exceção ao redor de `createNfeProvider(...)` e na classificação de qualquer falha de rede como `'denied'`.
- **Idempotência de `n8n` é robusta em dois níveis** (aplicação + constraint de banco), a mais forte encontrada nesta trilha.
- **`CancelSaleNfeUseCase`** não sofre do mesmo defeito de `T24-F01`: se `createNfeProvider`/`provider.cancel(...)` falhar, nada foi commitado ainda (o `nfe_status` só muda dentro da transação, depois do resultado do provedor) — o cancelamento é seguro para repetir.
- **`comex`** não tem integração automatizada nenhuma — confirmado por Grep exaustivo — logo não há superfície de falha externa a auditar além do que já está coberto por T-16 (módulo).
- **`uploadService.ts`/`qrCodeService.ts`** são puramente locais (disco/CPU), sem chamada de rede — fora do escopo real de "resiliência a falha externa", apesar de listados no plano.

---

## Evidência dinâmica requerida (`DYN-T24-nn`) — nada foi executado

| ID | O que provar | Como (sem executar aqui) | Por que estático não basta |
|---|---|---|---|
| `DYN-T24-01` | Que `FocusNfeProvider.issue()` sem `FOCUS_NFE_TOKEN` corrompe o estado da venda em `processing` permanente | Em `erp_evok_audio_test`: remover `FOCUS_NFE_TOKEN` do ambiente, chamar `POST /sales/:id/nfe`, inspecionar `sales.nfe_status` e `sale_invoices.nfe_status` antes/depois, tentar reemitir e observar o `ConflictError` | O comportamento depende do runtime lançar a exceção do construtor de fato; a leitura estática prova o caminho, não a consumação |
| `DYN-T24-02` | Que um timeout de rede real na emissão produz `nfe_status='denied'` indistinguível de rejeição fiscal | Interceptar a chamada `fetch` (proxy/mock que atrasa a resposta além do timeout implícito do runtime) durante `provider.issue()`, inspecionar `sale.nfe_error_message` resultante | O timeout implícito do runtime só é observável em execução; o texto de erro exato também |
| `DYN-T24-03` | Que o reenvio do webhook `focus-nfe` para uma venda em `processing` não duplica `InventoryMovement`/`AccountReceivable` | Duas chamadas concorrentes a `POST /api/webhooks/focus-nfe` com o mesmo `ref`, contando `inventory_movements` e `accounts_receivable` antes/depois em `erp_evok_audio_test` | Concorrência e lock são propriedades observáveis em runtime, não deriváveis por leitura |
| `DYN-T24-04` | Que duas entregas concorrentes do mesmo evento n8n (`event_id` igual) resultam em uma linha só em `webhook_events` | Duas requisições simultâneas a `POST /api/webhooks/n8n` com o mesmo `event_id`/assinatura válida, contando linhas na tabela | Prova a garantia de unicidade sob concorrência real, não apenas a existência da constraint |
| `DYN-T24-05` | Tempo real até timeout de um `fetch` para `FocusNfeProvider`/`ENotasProvider` quando o host não responde | Apontar `FOCUS_NFE_ENVIRONMENT`/`BASE_URL` para um host que aceita conexão mas nunca responde (blackhole), medir o tempo até a promise rejeitar | O valor exato do timeout implícito do runtime Node/undici não está declarado em nenhum lugar do código — só a execução revela o número real |

Todos requerem **G4** e execução pelo `vericore-audit-verification-runner`. **T-24 não executou nada.**

---

## Escalonamentos

1. **Ao diretor — `T24-F01`/`T24-F02` são o núcleo desta trilha e têm implicação fiscal direta.** Recomendo revisão conjunta com T-08 antes do fechamento da onda, e validação por `vericore-finding-validator` (ambos CRITICAL/HIGH, Regra 22).
2. **Sem divergência a resolver por Regra 20.** Confirmo `T17-F02`/`T18-F06` (webhook Focus NFe) pelo ângulo de resiliência, com nuance: o efeito patrimonial está protegido por lock+estado, mesmo sem proteção de replay no protocolo — isso **rebaixa o risco prático** de `T18-F06` sem contradizê-lo (a superfície de forjar chamadas continua real, é questão de segurança, não de resiliência a retry legítimo). Confirmo `T18-F03` e acrescento a distinção de comportamento por ponto de chamada (`T24-F03`).
3. **Handoffs:** `T24-F01`/`T24-F02` → T-08 (fiscal, avaliação de impacto contábil/tributário de dupla emissão) e ao dono do produto (decisão sobre introduzir timeout/retry/circuit breaker explícitos antes de qualquer emissão real, já que hoje o sistema está em `NÃO-PRODUÇÃO` para NF-e conforme `INTEGRATION_INVENTORY.md`). `T24-F04` → equipe responsável pela frente WhatsApp/n8n (memória do projeto), caso haja expectativa de consumo dos `WebhookEvent` que hoje não existe.
4. **Nenhuma regra de negócio encontrada vazada para o n8n** — confirmo a decisão do dono ("n8n é transporte burro") como implementada corretamente no código, com evidência de schema (constraint única) além da lógica de aplicação.

---

## Arquivos lidos (caminhos absolutos)

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\INTEGRATION_INVENTORY.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-17_CONTRATO_DE_API.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\presentation\controllers\webhookController.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\application\use-cases\ProcessN8nWebhookUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\presentation\routes\webhooks.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\infrastructure\sequelize\SequelizeWebhookRepository.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\WebhookEvent.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\migrations\20260731-000014-create-webhook-events.cjs` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\application\use-cases\HandleNfeStatusWebhookUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\application\use-cases\GetSaleNfeStatusUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\application\use-cases\IssueSaleNfeUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\application\use-cases\CancelSaleNfeUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\infrastructure\providers\FocusNfeProvider.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\infrastructure\providers\ENotasProvider.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\fiscal\infrastructure\providers\NfeProviderFactory.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\emailService.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\qrCodeService.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\uploadService.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\auditLogService.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\config\runtimeEnv.ts` (parcial, `:1-40`, por consulta cruzada com T-18)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\comex\application\use-cases\RegisterImportTrackingUseCase.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\package.json` (por consulta, Grep de dependências de retry/circuit breaker)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\EXTERNAL_CONSUMER_INVENTORY.md` (trechos `:37-230`, por Grep+Read)

**Nenhum arquivo foi criado, alterado ou removido. Nenhum comando foi executado. Nenhuma conexão de banco foi aberta.**
