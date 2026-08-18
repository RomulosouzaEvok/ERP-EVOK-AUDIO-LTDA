# CODEX_REMEDIATION_DISPATCH_RETROATIVO — CASE-001 (FIND-ERP-001, GRUPO B)

**Natureza deste documento: registro retroativo de rastreabilidade.**
**NÃO é uma autorização.** Nenhuma decisão nova é tomada aqui. Este documento
reconstrói, depois do fato, o despacho que deveria ter existido antes do
commit de implementação — para que o histórico do CASE-001 tenha o mesmo
formato de auditabilidade dos demais casos do lote (CASE-002, CASE-004,
CASE-007, CASE-008, CASE-010), todos com `CODEX_CORRECTION_DISPATCH_XX.md`
ou `CODEX_REMEDIATION_DISPATCH.md` versionado ANTES da implementação.

Autor: sanacore-remediation-evidence.
Data do registro: 2026-08-18 (posterior ao commit).
Commit coberto: `1c19d15a5ef272656f22ab341bd854d691ca6228`, worktree
`sana/ERP-LEGACY-001/FIND-ERP-001` (caminho local
`C:\Sistema EvokAudio\ERP-Evok-sana-FIND-ERP-001`), autor Gilwagno,
2026-08-18 01:03:38 -0300.

---

## 1. O GAP

Diferente de CASE-002, CASE-004, CASE-007, CASE-008 e CASE-010 — todos com
despacho formal versionado em `remediation/cases/<CASO>/` antes do commit de
correção — o CASE-001 tinha, até este registro, apenas `TRIAGE.md` na pasta.
O commit `1c19d15a` foi produzido diretamente a partir do plano de correção
descrito em `TRIAGE.md` §5 e da decisão do dono registrada em
`coretriad/governance/APPROVALS.md` sob `APR-2026-054`, sem que um documento
de despacho intermediário tivesse sido escrito e commitado antes da
implementação começar.

Isso não invalida a correção nem a decisão do dono — `TRIAGE.md` já continha
o plano detalhado (alternativas avaliadas, desenho recomendado, testes
previstos, arquivos afetados, riscos) e `APR-2026-054` está formalmente
registrada com timestamp e autoridade — mas quebra o padrão de rastreabilidade
do lote: nos outros casos é possível ler, em ordem, "o que foi pedido" →
"o que foi decidido" → "o que foi entregue". No CASE-001, o passo intermediário
inexistiu como artefato próprio. Este documento preenche essa lacuna
retroativamente, sem alterar nem reescrever o que já aconteceu.

---

## 2. RECONSTRUÇÃO DO QUE O DESPACHO TERIA DITO

Com base em `TRIAGE.md` §5.2/§5.3 e nas 3 decisões de `APR-2026-054`, um
despacho escrito ANTES do commit teria instruído o engineer a implementar
exatamente o seguinte (nenhum item abaixo é novo — é a leitura combinada dos
dois artefatos já existentes na época):

### 2.1 Defeito (a) — estoque (`TRIAGE.md` §5.2)

1. Migration M1: `inventory_movements.operation_id` (UUID, nullable) + índice
   único parcial `WHERE operation_id IS NOT NULL`. Sem backfill.
2. Model `InventoryMovement.ts`: campo + índice declarados.
3. `inventoryService.ts`: `adjust`/`createMovement` ganham parâmetro
   **opcional** `operationId` (default `null`) — os 11 call sites internos já
   protegidos por máquina de estado continuam com comportamento idêntico.
4. `POST /api/inventory/movements`: originalmente o plano do TRIAGE.md
   descrevia `operation_id` **obrigatório**. **Este ponto foi alterado pela
   decisão do dono em APR-2026-054/P2** (ver §2.4 abaixo) — o despacho
   retroativo já reflete essa alteração, não o texto original do TRIAGE.md.
5. Violação do índice único → `ConflictError` (409), mesmo padrão in-repo de
   `ReceivePurchaseItemsUseCase` — confirmado como decisão pela APR-2026-054/P3.
6. Client: UUID gerado na abertura do formulário (por intenção do usuário),
   nunca no clique de submit; 409 tratado como "já aplicado".
7. `facilities/InventoryServiceAdapter`: chama o use case direto, sem passar
   pela rota — segue funcionando sem chave.
8. Incluir as 3 superfícies-irmãs de mesma causa-raiz (`TRIAGE.md` §6.2,
   mediante confirmação do director): `POST /api/products/movements`,
   `POST /api/mobile-inventory/scan`, `POST /api/mobile-inventory/batch`.

### 2.2 Defeito (b) — pagamentos (`TRIAGE.md` §5.3)

1. Migration M2: tabela nova `financial_payment_events` (append-only),
   `UNIQUE (operation_id)`.
2. `PayPayableUseCase`/`ReceivePaymentUseCase`: inserir evento de pagamento
   dentro da transação já existente (lock intocado); violação do UNIQUE →
   409 ("esta operação de baixa já foi aplicada"). Guarda `status === 'paid'`
   permanece como defesa em profundidade.
3. Contrato: `payAccountSchema` ganha `operation_id`. Originalmente descrito
   como obrigatório no TRIAGE.md — mesma ressalva do item 2.1.4 aplica-se
   aqui, por decisão da APR-2026-054/P2.
4. Client: UUID gerado na abertura do modal de baixa; 409 tratado como
   "já baixado".

### 2.3 Testes previstos (`TRIAGE.md` §5.4)

- Atualização obrigatória (inversão de asserção) dos dois testes de
  caracterização existentes, citando FIND-ERP-001 + APR-2026-020.
- Testes novos de idempotência: mesma chave → 1 movimento/409; chaves
  distintas → 2 movimentos; chave ausente → conforme decisão P2 (ver
  abaixo, não mais `400` obrigatório).
- Reversibilidade das 2 migrations verificada contra `erp_evok_audio_test`.
- Fluxos não tocados (transferência, recebimento parcial, aprovação de
  contagem, scan mobile) continuam verdes.

### 2.4 As 3 decisões de APR-2026-054 aplicadas ao plano do TRIAGE.md

O TRIAGE.md deixou 3 perguntas abertas ao dono (§7, Q1/Q2/Q3). `APR-2026-054`
resolveu as três, e um despacho correto teria de citá-las explicitamente
como condição de implementação:

- **P1 (Q1 do TRIAGE.md) — parcelas idênticas legítimas: Opção A**, conforme
  recomendação da triagem — chave de idempotência gerada a cada nova
  tentativa/abertura de tela. Parcelas legítimas de mesmo valor continuam
  permitidas; só bloqueia duplo clique/reenvio de rede. Não há mudança de
  desenho aqui em relação ao que o TRIAGE.md já recomendava — é confirmação.
- **P2 (Q2 do TRIAGE.md) — consumidor externo confirmado: SIM.** O dono
  confirmou que existe consumidor externo (n8n/bot/integração) fora do
  client oficial usando as rotas de lançamento de estoque e pagamento.
  **Consequência que ALTERA o plano original do TRIAGE.md:** `operation_id`
  não pode ser obrigatório de imediato — precisa de período de transição
  como campo **opcional**. Este é o único ponto em que o despacho retroativo
  diverge do texto literal de `TRIAGE.md` §5.2 item 4 e §5.3 item 3 (que
  descreviam o campo como obrigatório) — a divergência é a decisão do dono,
  não uma opção da SanaCore.
- **P3 (Q3 do TRIAGE.md) — resposta ao reenvio: 409 Conflict.** Confirma a
  recomendação da triagem (consistente com o precedente in-repo de
  `ReceivePurchaseItemsUseCase`), rejeitando explicitamente a alternativa de
  replay silencioso (200 com o registro original).

Um despacho formal, escrito antes do commit, teria portanto autorizado
exatamente: "implemente TRIAGE.md §5.2/§5.3 na íntegra, com `operation_id`
OPCIONAL (não obrigatório) nas rotas, respondendo 409 em reenvio detectado,
sem restringir parcelas legítimas de mesmo valor" — nada além disso, e nada
menos.

---

## 3. O QUE O COMMIT `1c19d15a` DE FATO ENTREGOU

Confirmado por `git show --stat 1c19d15a5ef272656f22ab341bd854d691ca6228` na
worktree `sana/ERP-LEGACY-001/FIND-ERP-001` e pela mensagem do commit:

- **Migrations**: duas novas em `server/migrations/` —
  `20260817-000048-inventory-movements-operation-id.cjs` (coluna
  `operation_id` UUID nullable + índice único parcial em
  `inventory_movements`) e `20260817-000049-create-financial-payment-events.cjs`
  (tabela nova `financial_payment_events`).
- **`operation_id` opcional, não obrigatório**, exatamente como decidido em
  APR-2026-054/P2 — a mensagem do commit registra explicitamente: *"ajuste
  combinado com o dono para Q2: operation_id opcional (não obrigatório) nas
  6 rotas, porque existe consumidor externo (n8n/bot) fora do client oficial
  que ainda não envia essa chave. Se enviado, aplica idempotência (índice
  único + 409 em duplicata); se ausente, comportamento idêntico ao anterior
  (sem 400, sem proteção nessa chamada) até o consumidor externo migrar."*
- **11 call sites internos** de `adjust`/`createMovement` preservados sem
  mudança de comportamento (parâmetro novo opcional, default `null`).
- **As 3 rotas-irmãs incluídas** por custo marginal, conforme `TRIAGE.md`
  §6.2: `server/src/modules/products/application/use-cases/RegisterProductMovementUseCase.ts`
  (`POST /api/products/movements`),
  `server/src/modules/mobile-inventory/application/use-cases/ScanItemUseCase.ts`
  (`POST /api/mobile-inventory/scan`) e
  `.../BatchScanUseCase.ts` (`POST /api/mobile-inventory/batch`) — todas
  tocadas no diff, com validators correspondentes (`productValidators.ts`,
  `inventoryValidators.ts`).
- **`financial_payment_events`**: model novo (`FinancialPaymentEvent.ts`),
  registrado em `models/index.ts`; `PayPayableUseCase.ts` e
  `ReceivePaymentUseCase.ts` alterados para inserir o evento na mesma
  transação do lock existente; `financialController.ts` e
  `financialValidators.ts` atualizados; violação do UNIQUE mapeada para 409.
- **Client**: `client/src/api/financial.ts`, `client/src/api/inventory.ts`,
  `client/src/pages/financial/FinancialPage.tsx` e
  `client/src/pages/logistics/BalancesTab.tsx` alterados para gerar o UUID
  na abertura do formulário/modal e tratar 409.
- **Testes**: os dois testes de caracterização invertidos
  (`qualidade-estoque--duplicacao-lancamento-estoque.test.ts`,
  `comercial-financeiro--pagamento-parcial-repetido.test.ts`) e um teste de
  integração novo dedicado
  (`server/tests/integration/inventory-movement-idempotency.test.ts`).
  Outros arquivos de teste tocados no diff (`stock-concurrency.test.ts`,
  `inventory-movements-dual-read.test.ts`, testes de MRP/produção) aparecem
  no `--stat` com alterações pequenas (1-20 linhas) — não confirmadas linha a
  linha por este agente; ver §4.
- Um `REMEDIATION_EVIDENCE_PACKAGE.md` já foi escrito pelo engineer dentro do
  próprio commit `1c19d15a`, na worktree de remediação. **Este documento não
  substitui aquele** — é um registro de rastreabilidade sobre a ausência de
  despacho prévio, não o pacote de evidência do CASE-001 (que é
  responsabilidade separada de consolidação para a pasta
  `remediation/cases/ERP-LEGACY-001-CASE-001/` no repositório principal,
  fora do escopo deste documento).

---

## 4. O QUE NÃO FOI VERIFICADO POR ESTE AGENTE

Este registro é retroativo e documental — não reexecuta nem reabre a
correção. Ficam explicitamente **não confirmados por este agente**:

- Se o `409 Conflict` é de fato devolvido em reenvio real contra
  `erp_evok_audio_test` (a mensagem do commit e o `TRIAGE.md` descrevem o
  comportamento esperado; este agente não executou a suíte nem abriu conexão
  com banco algum, por proibição permanente de segurança de dado real).
- Execução real e resultado completo da suíte de testes (característica +
  integração + unitários) contra `erp_evok_audio_test` para este commit
  específico — a mensagem do commit menciona "suites verdes, 3 falhas
  pré-existentes fora de escopo analisadas", mas este agente não rodou nada
  para confirmar.
- Reversibilidade (`down`) das duas migrations novas.
- Se o comportamento do consumidor externo (n8n/bot) sem `operation_id`
  segue de fato idêntico ao anterior em ambiente real (isso é comportamento
  de implantação, não de código-fonte).
- Cobertura completa das alterações "pequenas" nos arquivos de teste de MRP/
  produção listados no `--stat` (1-20 linhas cada) — não lidas linha a linha
  neste registro.

Tudo isso é matéria de **reteste dinâmico da VeriCore**, que ainda não
ocorreu sobre este commit. Este documento não antecipa nem presume esse
resultado.

---

## 5. RECOMENDAÇÃO PARA CASE-011/012/013

CASE-011, CASE-012 e CASE-013 já têm decisão do dono registrada em
`APPROVALS.md` (ex.: `APR-2026-056` para CASE-011), mas nenhum código ainda
foi implementado. Recomenda-se que, para esses casos, o
`CODEX_CORRECTION_DISPATCH_XX.md` (ou `CODEX_REMEDIATION_DISPATCH.md`) seja
escrito e commitado ANTES de qualquer commit de implementação — reproduzindo
o padrão já seguido em CASE-002, CASE-004, CASE-007, CASE-008 e CASE-010 —
para que o CASE-001 não precise de reconstrução retroativa como esta.

---

## 6. LIMITES DESTE DOCUMENTO

- Não abre novo caso.
- Não redefine escopo do CASE-001 além do que `TRIAGE.md` e `APR-2026-054`
  já estabeleciam.
- Não autoriza nada além do que `APR-2026-054` já autorizou — é leitura
  combinada de artefatos preexistentes, não uma nova decisão.
- Não declara `RETEST_PASSED` nem `FINDING CLOSED` — autoridade exclusiva da
  VeriCore (Regras 3 e 4 do `CLAUDE.md`).
- Não altera código, migrations, testes nem o finding original.
- Não conectou nem conecta a nenhum banco de dados real.
