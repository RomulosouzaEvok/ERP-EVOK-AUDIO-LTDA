# EXTERNAL_CONSUMER_INVENTORY.md — Inventário estático de consumidores das rotas de movimentação de estoque e baixa de título

```
PROJECT_ID:  ERP-LEGACY-001
AUTORIDADE:  APR-2026-021 Parte B item 2 (coretriad/governance/APPROVALS.md), aprovada por Gilwagno em 14/08/2026
DATA:        2026-08-14
NATUREZA:    Inventário estático de repositório. NÃO é prova de ausência.
ESTADO:      EXTERNAL_CONSUMER_STATUS = UNKNOWN (inalterado — ver §5)
```

**Mandato:** o dono determinou `EXTERNAL_CONSUMER_STATUS = UNKNOWN`, **vedou
inferir** e determinou que **`UNKNOWN` não pode ser lido como `NÃO`**. Este
documento executa o inventário exigido; **não altera o status** e **devolve a
questão ao dono**, como determinado.

---

## 1. Método de busca

### 1.1 Escopo varrido

Repositório inteiro `ERP-Evok--Audio-LTDA`, sem exclusão de diretório:
`server/`, `client/`, `mobile/`, `tv/`, `scripts/` e `server/scripts/`,
`docs/`, `audit/`, `remediation/`, `coretriad/`, `.github/workflows/`,
`.claude/`, `.codex/`, arquivos de configuração de raiz
(`docker-compose.yml`, `docker-compose.prod.yml`, `.env.example`),
migrações e SQL de baseline, `package-lock.json` de `mobile/` e `tv/`.

Diretório adicional de trabalho `c:\Sistema EvokAudio\tibia`: varrido com os
padrões `evok|ERP|api/inventory|8080|3001` (case-insensitive) — **zero
arquivos com correspondência**. Conclusão: `tibia` **não contém referência ao
ERP** e está fora deste inventário.

### 1.2 Padrões usados

| Classe | Padrão (regex ripgrep) |
|---|---|
| Rotas-alvo literais | `api/inventory/movements`, `api/products/movements`, `mobile-inventory/(scan\|batch)`, `payable/.*\/pay`, `receivable/.*\/pay` |
| Chamadas parametrizadas | `payable/\$\{`, `receivable/\$\{`, `/pay['"`+ "`" + `]` |
| Automação/integração | `n8n` (case-insensitive, repositório inteiro) |
| Cliente HTTP externo | `curl` combinado com cada rota-alvo |
| Publicação a terceiros | leitura das seções correspondentes de `docs/arquitetura/API.md` e do inventário de integrações do passo 24 |

### 1.3 Limite metodológico declarado

Varredura **estática e restrita a este repositório**. Consumidor externo que
viva **fora** do repositório (instância n8n hospedada, bot de WhatsApp, planilha
com script, integração de terceiro, Postman/cron de operador, tunnel
Cloudflare) é **invisível** a este método. Ver §5.

---

## 2. Achados transversais

### 2.1 Caminho n8n — verificado, **não alcança** as rotas-alvo

- A única superfície n8n **no código** é `POST /api/webhooks/n8n`, servida por
  `server/src/modules/webhooks/application/use-cases/ProcessN8nWebhookUseCase.ts`.
- Esse use case faz exatamente três coisas: valida HMAC-SHA256 contra
  `N8N_WEBHOOK_SECRET`, exige `event_id`, e persiste o evento em
  `WebhookEvent` via `findOrCreateEvent` (idempotente por `source`+`event_id`).
  **Não despacha, não roteia e não invoca nenhum use case de estoque ou
  financeiro.** É um coletor inerte.
- Sentido do fluxo: **entrada** (n8n → ERP), e apenas para a rota de webhook.
  Nada no repositório mostra o n8n chamando as rotas-alvo.
- **Ressalva material:** o que o *workflow dentro da instância n8n* faz **não
  está neste repositório**. Um workflow n8n pode perfeitamente chamar
  `POST /api/inventory/movements` com um JWT de serviço sem deixar rastro aqui.
  O projeto `n8n-projectevokaudio` **não é versionado neste repositório**.

### 2.2 Frente WhatsApp — sem alcance às rotas-alvo no repositório

Os artefatos da frente WhatsApp (documentos de conceito e de API do Bloco 7)
não contêm referência a nenhuma das seis rotas-alvo. Nenhum código de
implementação da frente foi encontrado chamando-as.

### 2.3 Documentação de API publicada

`docs/arquitetura/API.md` documenta explicitamente `POST /api/inventory/movements`,
`POST /api/products/movements`, `POST /api/mobile-inventory/scan`,
`POST /api/mobile-inventory/batch`, `PUT /api/finance/receivable/:id/pay` e a
rota irmã de `payable`. **Trata-se de documentação interna de API do produto**,
sem portal público, sem contrato de parceiro, sem OpenAPI publicado e sem
chave de API de terceiro identificada. Ainda assim, documentação existente é
**vetor de adoção**: qualquer operador ou integrador com acesso ao repositório
ou ao documento pode ter construído um consumidor fora dele.

### 2.4 CI, scripts e automações internas

- `.github/workflows/server-ci.yml`: não chama as rotas-alvo.
- `server/scripts/smoke-apresentacao.cjs`: faz apenas **GET** de
  `/api/inventory/movements` e `/api/finance/payable` (leitura, smoke local).
- `scripts/` de raiz: apenas backup PostgreSQL e build de imagem — nenhuma
  chamada HTTP às rotas-alvo.
- `tv/`: nenhum consumo — usa apenas auth e dashboard.

---

## 3. Achados por rota-alvo

Legenda de natureza: **1P-repo** = consumidor first-party dentro deste
repositório (frontend/app do próprio produto); **externo** = agente fora do
ciclo de build deste repositório.

### 3.1 `POST /api/inventory/movements`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| Frontend web — API client | 1P-repo | `client/src/api/inventory.ts` (`httpClient.post`) |
| Frontend web — tela Logística/Saldos | 1P-repo | `client/src/pages/logistics/BalancesTab.tsx` |
| Adapter server-side de Facilities (consumo interno, não HTTP) | 1P-repo | registrado na triagem do CASE-001 (`InventoryServiceAdapter.registerConsumption`) |
| Fluxo SST de confirmação de entrega de EPI (reaproveitamento documentado) | 1P-repo | `ConfirmEpiDeliveryUseCase.ts` e docs do Bloco 1 SST |
| Consumidor externo | — | **nenhum encontrado no repositório** |

**Veredito da rota: `INDETERMINADO`.** Nenhum consumidor externo encontrado,
mas a rota é a mais documentada e mais reaproveitada do sistema, e o caminho
n8n→ERP existe fora do repositório. Ausência não foi provada.

### 3.2 `POST /api/products/movements`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| Frontend web — API client (rota legada, substituída em Saldos) | 1P-repo | `client/src/api/products.ts` |
| Consumidor externo | — | **nenhum encontrado no repositório** |

**Veredito da rota: `INDETERMINADO`.** Rota **legada** e documentada em
`docs/arquitetura/API.md`; rota legada é exatamente o perfil que integrações
antigas costumam consumir. Ausência não foi provada.

### 3.3 `POST /api/mobile-inventory/scan`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| App mobile — API client | 1P-repo | `mobile/src/api/mobileInventory.ts` |
| Consumidor externo | — | **nenhum encontrado no repositório** |

**Veredito da rota: `INDETERMINADO`.** Rota exige JWT + `estoque:operate`;
qualquer coletor/bot de código de barras fora do repositório poderia usá-la com
credencial de serviço.

### 3.4 `POST /api/mobile-inventory/batch`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| Nenhum chamador encontrado — nem no app mobile | — | `mobile/src/api/mobileInventory.ts` chama apenas `/scan` e `GET /movements` |
| Documentação publicada | — | `docs/arquitetura/API.md` documenta a rota |

**Veredito da rota: `INDETERMINADO`, com agravante.** É a rota **documentada e
sem nenhum chamador first-party no repositório** — o perfil clássico de
endpoint que existe *para* consumo externo (carga em lote). Isto **eleva**, não
reduz, a suspeita de consumidor externo. Não é evidência de que exista; é
evidência de que a ausência **não pode ser presumida**.

### 3.5 `PUT /api/finance/payable/:id/pay`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| Frontend web — API client | 1P-repo | `client/src/api/financial.ts` |
| Consumidor externo | — | **nenhum encontrado no repositório** |

**Veredito da rota: `INDETERMINADO`.** Baixa de título é alvo típico de
automação bancária/CNAB e de robô de conciliação; o inventário de integrações
do passo 24 registra CNAB como trilha **órfã** — órfã no código não significa
órfã em operação.

### 3.6 `PUT /api/finance/receivable/:id/pay`

| Consumidor encontrado | Natureza | Evidência |
|---|---|---|
| Frontend web — API client | 1P-repo | `client/src/api/financial.ts` |
| Consumidor externo | — | **nenhum encontrado no repositório** |

**Veredito da rota: `INDETERMINADO`.** Mesmas razões de §3.5.

### 3.7 Quadro-resumo

| Rota | Veredito |
|---|---|
| `POST /api/inventory/movements` | `INDETERMINADO` |
| `POST /api/products/movements` | `INDETERMINADO` |
| `POST /api/mobile-inventory/scan` | `INDETERMINADO` |
| `POST /api/mobile-inventory/batch` | `INDETERMINADO` (agravante: sem chamador 1P e documentada) |
| `PUT /api/finance/payable/:id/pay` | `INDETERMINADO` |
| `PUT /api/finance/receivable/:id/pay` | `INDETERMINADO` |

Nenhuma rota recebeu `CONSUMIDOR_EXTERNO_CONFIRMADO`.
**Nenhuma rota recebeu `NENHUM_ENCONTRADO_NO_REPOSITÓRIO` como veredito final**
— embora seja literalmente verdade que nada foi encontrado, esse rótulo, usado
como veredito, seria lido como conclusão de ausência. Ver §4.

---

## 4. Por que nenhum veredito é `NENHUM_ENCONTRADO_NO_REPOSITÓRIO`

O estado factual "nada encontrado no repositório" é verdadeiro para as seis
rotas e está registrado linha a linha na §3. Ele **não** foi promovido a
veredito porque o veredito é insumo de decisão sobre breaking change, e a
diferença prática entre "não encontrei" e "não existe" é justamente o que o
dono determinou preservar. Registrar `NENHUM_ENCONTRADO_NO_REPOSITÓRIO` como
veredito criaria, na próxima leitura, exatamente a inferência vedada
(`UNKNOWN` → `NÃO`). O estado factual fica nas tabelas; o veredito fica
`INDETERMINADO`.

---

## 5. Veredito global — permanece `UNKNOWN`

**`EXTERNAL_CONSUMER_STATUS = UNKNOWN` (inalterado).**

Prova positiva de ausência de consumidor externo é **inalcançável por varredura
estática de repositório** — isto é uma limitação lógica do método, não uma
falha de execução desta varredura. Um consumidor externo é, por definição, um
artefato que **não vive neste repositório**: workflow dentro da instância n8n,
bot, script de operador, integração de terceiro, chamada manual autenticada.
Nenhum grep sobre este repositório pode observá-los.

**Prova de ausência exigiria evidência que este método não produz**, por
exemplo: (a) logs de acesso do servidor por período representativo, segmentados
por rota e por `User-Agent`/token; (b) inventário exportado dos workflows da
instância n8n; (c) declaração formal do dono/operador de que não há integração;
(d) auditoria dos tokens de serviço emitidos e do que cada um consome.
**Nada disso está autorizado ou disponível nesta trilha** (sem banco real, sem
conexão externa — `APR-2026-016` e Parte D da `APR-2026-021`).

**Questão devolvida ao dono, conforme `APR-2026-021` Parte B item 2:**

1. Existe workflow no `n8n-projectevokaudio` que chame qualquer das seis
   rotas-alvo? (Só o dono/operador da instância pode responder.)
2. Existe coletor, bot, planilha, robô bancário ou integração de terceiro que
   poste movimentação de estoque ou dê baixa de título via API?
3. Foram emitidas credenciais/tokens de serviço para consumo externo dessas
   rotas?
4. Autoriza-se coleta de logs de acesso por rota para fundamentar a decisão?

Enquanto as respostas não existirem: **vedado breaking change**, vedado tornar
chave de idempotência obrigatória de forma incompatível.

---

## 6. Estratégia backward-compatible de adoção de chave de idempotência

Recomendação de estratégia em **quatro fases**, com portão humano entre a fase 3
e a fase 4. Recomendação técnica de analista — **não é decisão**; a passagem de
fase 3 para 4 é decisão do dono.

### Fase 1 — Chave **opcional**, servidor idempotente

- Aceitar header `Idempotency-Key` (opcional) nas seis rotas-alvo.
- Com chave presente: persistir `(rota, chave, hash do payload, resposta)` em
  tabela dedicada, com **índice único**; requisição repetida com a mesma chave
  e mesmo payload retorna a **resposta original** sem reexecutar; mesma chave
  com payload diferente retorna erro de conflito.
- **Sem chave: comportamento atual, byte a byte.** Zero quebra.
- A unicidade tem de ser garantida no banco (constraint), não só em código —
  caso contrário a corrida continua vencendo.

### Fase 2 — Observabilidade de adoção

- Métrica/log por rota: total de requisições, com chave, sem chave, e a
  identidade do chamador (token/serviço/origem) de cada requisição **sem
  chave**.
- Isto é o que efetivamente **converte `UNKNOWN` em conhecimento**: ao fim da
  janela, existe a lista real de consumidores, inclusive os externos que nenhum
  grep enxerga. É a única via aqui proposta que produz evidência de ausência.
- Janela de observação declarada e suficiente para cobrir sazonalidade
  (fechamento mensal, inventário periódico) — **duração é decisão do dono**.

### Fase 3 — Migração dos consumidores conhecidos + aviso

- Passar a enviar chave em todos os consumidores first-party
  (`client/src/api/inventory.ts`, `client/src/api/products.ts`,
  `client/src/api/financial.ts`, `mobile/src/api/mobileInventory.ts`) e nos
  fluxos server-side internos.
- Responder com header de deprecação nas chamadas sem chave e documentar em
  `docs/arquitetura/API.md`.
- Notificar formalmente os consumidores externos que a Fase 2 revelou.

### Fase 4 — Obrigatoriedade (**somente após decisão humana**)

- Tornar a chave obrigatória **só quando** a Fase 2 mostrar 0 requisições sem
  chave por toda a janela, **ou** quando todos os consumidores identificados
  tiverem migrado, **e** houver decisão humana registrada em `APPROVALS.md`.
- Recomenda-se obrigatoriedade **por rota**, não em bloco: `/batch` e as rotas
  de baixa de título têm perfis de risco e de consumidor distintos.

### Mitigação imediata, independente das fases

Para o defeito de duplicação em si (FIND-ERP-001 grupo B), há proteção que
**não depende de chave de cliente** e portanto **não quebra ninguém**: lock
pessimista + guarda transacional de estado no fluxo de escrita, e, para baixa de
título, verificação transacional do saldo/estado do título antes de aplicar o
pagamento. Isto pode preceder a Fase 1 sem alterar o contrato da API.

---

## 7. Fontes consultadas

- `docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-001.md`
- `docs/coretriad/projects/ERP-LEGACY-001/discovery/INTEGRATION_INVENTORY.md`
- `docs/coretriad/projects/ERP-LEGACY-001/discovery/API_INVENTORY.md`
- `docs/arquitetura/API.md`
- `remediation/cases/ERP-LEGACY-001-CASE-001/TRIAGE.md`
- `coretriad/governance/APPROVALS.md` (APR-2026-021)

---

*Produzido pelo `opuscore-business-analyst` sob mandato da APR-2026-021 Parte B
item 2. Não altera `EXTERNAL_CONSUMER_STATUS`, não autoriza breaking change e
não substitui decisão humana.*
