# Plano de ação — fechar a cadeia do produto final

**Data:** 2026-08-09 · **Origem:** mapeamento do fluxo real do código (21 estações, 17 gaps)
**Artefato visual para o dono:** <https://claude.ai/code/artifact/aad98974-1e2e-4980-bf24-01192b5e1128>

---

## 1. Objetivo (critério de aceite, definido pelo dono)

> "Um insumo é cadastrado e segue seu curso até virar produto finalizado,
> passando pelos departamentos, **sem gap**."

**Teste de pronto:** cadastrar um insumo real no sistema e levá-lo, pelas telas e
endpoints reais, até produto acabado expedido — sem que em nenhum ponto o
processo permita um resultado errado, pule etapa obrigatória ou registre dado
que não bloqueia nada.

A corrente completa:

```
item cadastrado → estrutura do produto → demanda (venda/MRP/PCP)
  → requisição → cotação → pedido de compra → recebimento → quarentena
  → inspeção de entrada → estoque de insumo
  → ordem de produção → apontamento → consumo de material
  → lote de produto acabado → inspeção final → estoque de acabado
  → venda → NF-e → separação → expedição
```

---

## 2. Princípios desta remediação

1. **Não quebrar o que já funciona.** Vários controles estão certos e não devem
   ser tocados: quarentena obrigatória no recebimento, FEFO consumindo só lote
   liberado, amarração lote-de-insumo × lote-de-produto, faturamento parcial com
   saldo por item, bloqueio de reversão de contrato/venda encerrados.
2. **Toda correção com teste.** E onde o risco for de runtime (enum, coluna,
   constraint), teste que toque o Postgres real — a suíte unitária usa
   repositório mockado e **não pega** essa classe de erro.
3. **Onde existe lei ou norma, ela decide.** Não é preferência: SPED Bloco K,
   ISO 9001, CPC/IFRS e a legislação da NF-e determinam algumas destas respostas.
4. **Mudança de alto risco vai isolada**, com caminho de migração descrito para o
   dado que já existe — nunca junto de outra mudança.

---

## 3. Ondas de execução

Priorizadas por: dano real causado → contenção do risco de corrigir →
dependência de decisão de negócio.

### 🔴 Onda 1 — Dano silencioso, correção contida (sem migration, sem decisão)

Estes causam dado errado hoje, e a correção é local e testável. **Executar primeiro.**

| Gap | O que fazer | Onde | Risco |
|---|---|---|---|
| **G2** | Parar de engolir o erro de BOM ausente na conclusão da OP. Sem estrutura ativa, a conclusão deve **falhar** com erro de negócio claro — nunca entrar produto em estoque com custo zero. | `ChangeProductionOrderStatusUseCase` (`completeOrder`, trecho que captura o 404 de `explodeBOM`) | Baixo. Pode expor OPs hoje "concluídas" indevidamente — bom, é o ponto. |
| **G16** | Alinhar o rigor dos dois caminhos de criação de OP: o caminho via MRP deve validar disponibilidade de material e tipo de produto igual ao manual. Corrigir também a numeração `OP-YYYY-NNNN`, que usa `COUNT` dentro de laço e pode colidir. | `ConvertPlannedOrdersToProductionOrderUseCase`, `CreateProductionOrderUseCase` | Baixo |
| **G8** | Teste acústico reprovado deve **sempre** abrir não conformidade — hoje só abre se quem digita marcar uma caixinha (`create_rnc_on_fail`). Reprovação não pode ser opcional. | `CreateAcousticTestUseCase` | Baixo |
| **G10** | Não conformidade que não consegue bloquear o lote (lote não informado ou não encontrado) deve **avisar explicitamente**, não passar em silêncio. | `CreateNonConformityUseCase` | Baixo |
| **G12** | Adjudicar cotação deve marcar a requisição de origem como atendida (e respeitar saldo), impedindo que o mesmo item vire dois pedidos. | `AwardRfqUseCase`, `CreateRfqUseCase`, máquina de estados de `PurchaseRequisition` | Médio — mexe na máquina de estados |
| **G15** | Ativar os estados mortos que deveriam existir (`partial`/`received` da requisição) ou removê-los do enum. Documentar os demais campos sem uso. | `ChangePurchaseRequisitionStatusUseCase` | Baixo |

### 🟠 Onda 2 — Precisa de migration, mas não de decisão de negócio

| Gap | O que fazer | Risco |
|---|---|---|
| **G3** | **Reserva vinculada à ordem.** Criar tabela de reserva (OP × item × quantidade) substituindo o contador global `products.reserved_quantity`. Liberar/consumir passa a ser pela reserva daquela OP. Backfill do saldo atual. | **Alto** — vai isolada, com migração do dado existente |
| **G14** | Importação (COMEX) deve entrar no padrão: criar lote, passar por quarentena e gerar a conta a pagar dos tributos. Hoje entra sem rastreabilidade e sem gate de qualidade. | Médio |
| **G6** | Início da produção (`in_progress`) deve validar pré-condição (centro de trabalho/operador), não só gravar data. | Baixo |
| **G5** | **API de roteiro de fabricação.** As tabelas existem e não há como cadastrar pelo sistema. Necessária se o apontamento por etapa virar obrigatório (ver G4). | Médio |

### 🟡 Onda 3 — Depende de decisão do dono (recomendação vem com a fonte)

| Gap | Decisão | Observação |
|---|---|---|
| **G4** | Apontamento obrigatório para concluir OP? | **Pode ter resposta legal.** SPED Bloco K é obrigação acessória de controle de produção e estoque para indústria. Sem apontamento, mão de obra fica R$ 0,00 no custo do estoque. Confirmar enquadramento com o contador. |
| **G9 + G7** | Gate de qualidade antes da saída + criar a entidade **inspeção** + mover a baixa de estoque da confirmação do pedido para a expedição. | ISO 9001:2015 (8.6 liberação, 8.7 saída não conforme) e a lógica fiscal da NF-e (a nota acompanha a mercadoria). **Alto risco** — muda o momento da baixa de estoque. Vai isolada, com migração dos pedidos confirmados e não expedidos. |
| **G7** | ✅ **Implementado em 2026-08-10** (decisão D-H). `quality_inspections` criada, `ReleaseLotUseCase` passou a exigir inspeção aprovada (a **mais recente**), rastreabilidade de quem autorizou gravada no lote. **Achado colateral fechado junto:** a quarentena deixou de ser decorativa — MRP e disponibilidade de OP passaram a descontar o saldo retido. **Não implementado por falta de decisão do dono:** motor de amostragem Ac/Re (nível de inspeção + AQL da ISO 2859-1). Migration `20260810-000032` **escrita, não aplicada**. Detalhes em `docs/governance/TODO.md` (entrada 2026-08-10 G7). |
| **G11** | ✅ **Implementado em 2026-08-10** (parte da alçada; segregação de função **não** — não foi pedida). A regra real não era faixa de valor: é por **origem** (ver §4 D-C e §6). | Reaproveitou o padrão aprovado do Jurídico (RF-JUR-003): constantes em `domain/constants.ts`, tabela de aprovações com UNIQUE por papel, aprovador do JWT, endpoint de leitura sem efeito colateral. |
| **G13** | Momento de criar conta a pagar (hoje: aprovação do pedido) e conta a receber (hoje: confirmação da venda, e à vista já nasce "paga" sem baixa). | CPC/IFRS: passivo nasce da obrigação presente; receita, da transferência de controle. **Alto risco** — afeta dado financeiro existente. **Escopo ampliado pelo G14 (2026-08-09):** a decisão precisa cobrir também os **tributos de importação** (II/IPI/PIS/COFINS/ICMS), que hoje não geram AP nenhuma. Fatos geradores e vencimentos distintos entre si, e `AccountPayable` não suporta moeda estrangeira. Implementar só para COMEX criaria um segundo padrão contábil dentro do mesmo ERP. |
| **G1** | Unificar as duas estruturas de produto (BOM) numa só + definir quem aprova alteração de engenharia. | **Alto risco e alto valor.** É a raiz de vários outros problemas. Migração incremental, não big-bang. ISO 9001 8.5.6 exige controle de alterações. |
| **G17** | Venda deve gerar produção? MRP deve ler carteira de pedidos e estoque mínimo? | Provavelmente **não** é "gerar OP automática no pedido" — o padrão da indústria é uma camada de Plano Mestre (MPS) entre a carteira e a ordem. |

---

## 4. Decisões do dono — TOMADAS em 2026-08-10

Registro das respostas dadas pelo dono do produto. Base normativa em
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`.

### ✅ D-A — Seguir a lei nas 3 decisões com resposta normativa
Autorizado implementar as três, **isoladas, uma por vez**, com caminho de
migração do dado existente:
- **G4** apontamento obrigatório (Bloco K) — **depende do G5** (API de roteiro):
  exigir apontamento sem poder cadastrar roteiro seria regra inexequível.
- **G9** baixa de estoque migra da confirmação do pedido para a **expedição**.
- **G13** conta a pagar nasce no **recebimento**; conta a receber, na **NF-e**.

### ✅ D-B — Unificação da BOM: ninguém mantém nenhuma das duas ainda
**Isto muda o risco do G1 de alto para baixo.** Não há base de produção a
preservar, então deixa de ser migração e vira **escolha técnica**: escolher a
estrutura tecnicamente melhor, migrar o que existir, e aposentar a outra.
Confirmar o volume real antes de agir (o comparador somente-leitura resolve).

### ✅ D-C — Alçada de compra: a regra é por ORIGEM, não só por valor
Descoberta importante — todos assumiam faixa de valor; a regra real é outra:

| Origem | Regra |
|---|---|
| **Nacional** | até R$ 500.000 segue direto · **acima de R$ 500.000 exige a diretoria** |
| **Importação** | **sempre exige a diretoria**, em qualquer valor |

Contexto: existem pedidos de importação na casa de **R$ 1 milhão**.
⚠️ Registrado como risco residual: abaixo de R$ 500.000 no nacional **quem
solicita ainda pode aprovar** (sem segregação de função). Não foi pedida
segregação; fica como recomendação de controle interno, não como implementação.
**Confirmado ainda válido em 2026-08-10, na implementação do G11** — o
código entregue não implementa segregação de função em nenhum ponto; o
critério "quem aprova uma compra não é quem a solicitou" da §5 continua **não
atendido de propósito**.

**Implementado em 2026-08-10** (ver §6, linha do G11). Duas observações que
saíram da implementação e precisam de atenção do dono:

1. **Como o sistema sabe que é importação.** Não havia como saber: `suppliers`
   não tem país e `import_processes` (COMEX) é um fluxo paralelo que nunca
   vira pedido de compra. Foram criados `suppliers.is_foreign` (cadastro) e
   `purchase_orders.origin` (declaração no pedido). A origem efetiva é o OU
   dos dois, com a regra **escalation-only**: o campo que o comprador
   controla no pedido só endurece a alçada — marcar como nacional um pedido
   de fornecedor estrangeiro **não** escapa da diretoria. Ação operacional
   necessária: **marcar `is_foreign` nos fornecedores estrangeiros já
   cadastrados**, porque nenhum dado atual permite inferir isso.
2. 🟡 **DECISÃO AINDA PENDENTE — importação registrada no módulo COMEX.** Os
   pedidos de importação de ~R$ 1 milhão citados pelo dono, se forem
   registrados em `import_processes` (`/api/comex/import-processes`) e não
   como pedido de compra, **não passam pela alçada implementada** — aquele
   fluxo não tem etapa de aprovação nenhuma hoje (todas as escritas são
   `comex:operate`, sem `approve`). Falta o dono definir **em que ponto do
   ciclo COMEX** (`draft → shipped → arrived → customs_cleared → received`) a
   diretoria aprova; a recomendação técnica é a saída de `draft` (registro de
   embarque), que é o primeiro passo irreversível.

### ✅ D-D — Aviso de férias: manter aceitando com alerta
A CLT (Art. 135 caput) exige 30 dias de antecedência, mas o sistema continua
**aceitando prazo menor** e registrando o alerta de descumprimento — para não
travar a operação quando o funcionário pede em cima da hora.
Divergência lei × prática **consciente e registrada**, não um defeito.

### ✅ D-E — Janela pedido → nota fiscal: mesmo dia
**Isto derruba o risco do G9.** Quase não existe pedido confirmado e não
faturado parado, então mover a baixa de estoque para a expedição tem migração
quase indolor. Ainda assim vai isolada.

### ✅ D-F — Existe PCP formal
Há quem exerça o planejamento, então a camada de **Plano Mestre (MPS)** faz
sentido e tem quem a opere. Confirma a recomendação do G17: **não** ligar
pedido de venda diretamente à ordem de produção.

---

### ✅ D-G — Importação no COMEX: diretoria aprova na saída de `draft`
A implementação do G11 (`ec1b499`) descobriu que **importação registrada no
módulo COMEX ficava fora da alçada**: `import_processes` não vira pedido de
compra e não tinha etapa de aprovação nenhuma — todas as escritas eram
`comex:operate`. Um processo de ~R$ 1 milhão passava sem a diretoria.

Decisão: **a diretoria aprova na transição `draft → shipped`**, ou seja,
antes de comprometer câmbio e embarque. É o único ponto do ciclo em que ainda
dá para desistir sem custo afundado; depois de embarcado, a aprovação seria
formalidade. Mesmo padrão de `purchase_order_approvals`: papel `diretor`,
`approver_user_id` sempre do JWT, UNIQUE por (processo, papel), endpoint de
leitura sem efeito colateral.

### ✅ D-H — ISO 9001: pretende certificar
O registro de inspeção do **G7** deve nascer já no formato que a norma pede
(ISO 9001:2015 §8.6 — evidência de conformidade com o critério de aceitação e
rastreabilidade de quem liberou), **sem** travar a operação de hoje com
burocracia que ninguém ainda executa. Na prática: a inspeção vira entidade
com critério, resultado, responsável e vínculo ao lote — e a liberação da
quarentena deixa de ser clique com observação livre.

### ✅ D-I — CNAE no cadastro de cliente: sim, opcional
Campo disponível no cadastro, **sem travar** a criação — não se aplica a
pessoa física e a empresa não quer bloquear cadastro por causa dele. A coluna
já existe no banco; falta expô-la na tela e no schema de criação.

### ✅ D-J — Conta a receber avulsa é caso legítimo
Existe cobrança sem venda vinculada (reembolso, aluguel, venda de sucata).
O caminho **permanece aberto** e não deve ser tratado como achado de
auditoria. Consequência: a validação do G13 (AR nasce na NF-e) precisa
distinguir *recebível originado de venda* — que passa a exigir nota — de
*recebível avulso*, que continua livre.

---

### 🟡 Ainda pendente do dono
*(nenhuma decisão de negócio pendente nesta frente — ver bloqueio operacional
abaixo)*

### 🔴 Bloqueio operacional
- **Aplicar migrations no banco local** — `node scripts/apply-pending-migrations.cjs`
  está sendo barrado pelo classificador de permissão do ambiente. Enquanto não
  for liberado, o G11 fica só no código e o **S-1b** (as 66 divergências
  schema × model que bloqueiam o servidor de produção) não anda, por ser
  inteiramente migration.

### 🟡 Pendente do contador
- **C1** CNAE efetivamente escriturado e faturamento do segundo exercício anterior
- **C4** a empresa escritura hoje o Livro modelo 3? *(só o Bloco K completo desobriga)*
- **C9** destino das contas a pagar já criadas na aprovação e ainda não recebidas
- **C11** a empresa é auditada ou tem exigência de banco sobre os números?

---

## 5. Critério de pronto (definição de "sem gap")

A cadeia só é considerada fechada quando, num teste ponta a ponta com dado real:

- [ ] Não existe caminho que faça produto entrar em estoque com custo zero
- [ ] Reserva de material de uma ordem não pode ser consumida por outra
- [ ] Uma única estrutura de produto governa planejamento e consumo
- [ ] Nenhum produto sai sem liberação de qualidade registrada, com evidência
- [ ] Quem aprova uma compra não é quem a solicitou
- [ ] Todo passo obrigatório do processo é obrigatório **no código**, não só na norma escrita
- [ ] Nenhum dado é registrado "decorativamente" — ou bloqueia algo, ou é removido
- [ ] Documentação, banco de dados e código descrevem o mesmo processo

---

## 6. Registro de execução

| Data | Onda | Gap | Status | Commit |
|---|---|---|---|---|
| 2026-08-09 | 1 | **G2** | ✅ Corrigido — OP não conclui sem BOM ativa nem com quantidade zero | `5ec0651` |
| 2026-08-09 | 1 | **G16** | ✅ Corrigido — caminho do MRP passa a validar BOM ativa + disponibilidade de material (igual ao manual); numeração `OP-YYYY-NNNN` serializada no repositório (advisory lock por ano + `MAX`, não `COUNT`) | *(working tree)* |
| 2026-08-09 | 1 | **G8** | ✅ Corrigido — reprovação em teste de laboratório abre RNC **sempre**; `create_rnc_on_fail` aceito e ignorado (remover a caixinha no `client/`) | *(working tree)* |
| 2026-08-09 | 1 | **G10** | ✅ Corrigido — RNC que não bloqueia lote nasce com aviso explícito em `notes` (`[ATENCAO: NENHUM LOTE BLOQUEADO]`), que volta no payload | *(working tree)* |
| 2026-08-09 | 1 | **G12** | ✅ Corrigido — controle de saldo por item: cotação só puxa item `pending` de requisição em estado cotável; adjudicação trava a requisição, exige `approved`, exige saldo e marca os itens `ordered` (fecha a requisição só quando não sobra saldo); conversão direta passa a filtrar por saldo | *(working tree)* |
| 2026-08-09 | 1 | **G6** | ⏸️ **Analisado, não implementado** (decisão consciente) — a pré-condição real já é coberta: `in_progress` só é alcançável de `released`/`paused`, e entrar em `released` valida disponibilidade e **reserva** o material. As validações sugeridas não têm apoio hoje: `production_orders` não tem coluna de centro de trabalho (exigi-lo é **mudança de schema**); `responsible_id` é opcional por desenho em todo o módulo; exigir apontamento iniciado contradiz a decisão explícita de `reconcileTrackingOnCompletion` ("OP sem apontamento: fluxo simples permanece válido") e é exatamente a pergunta em aberto do **G4** (decisão do dono, Onda 3). Análise registrada em código, em `ProductionOrderEntity.transitionTo`. Reclassificado corretamente para a **Onda 2** (precisa de migration). | — |
| 2026-08-09 | 2 | **G3** | ✅ Corrigido — reserva de material passa a ser **vinculada à OP** (`production_order_reservations`, migration `20260809-000026`, **aplicada ao banco** — confirmado em `SequelizeMeta` na auditoria de 2026-08-10; o backfill `05_production_order_reservations.ts` continua pendente de execução com `--apply`). `products.reserved_quantity` rebaixado a **cache derivado** (recalculado como soma das reservas vivas, na mesma transação) para não quebrar nenhum leitor. Liberação/consumo passam a operar só sobre a reserva da própria ordem; reserva anônima virou erro 400; remoção de OP com reserva ativa foi bloqueada. Backfill idempotente e dry-run-por-padrão em `server/src/scripts/backfill/05_production_order_reservations.ts` | *(working tree)* |
| — | — | **G15** | ⚠️ Avaliado durante o G12 e **deliberadamente não usado**: o enum `purchase_requisitions.status` (`...ordered, partial, received...`) espelha o de `purchase_orders`, onde `partial` = "parcialmente **recebido**". Usá-lo para "parcialmente **pedido**" colidiria com a futura rotina de recebimento. O saldo de compra ficou em `purchase_requisition_items.status` (`pending\|ordered\|canceled`), que é inequívoco; a requisição permanece `approved` enquanto há saldo. `partial`/`received` continuam mortos — G15 segue em aberto. | — |
| 2026-08-09 | 2 | **G14** | ✅ Corrigido — a importação (COMEX) entrava fora do padrão: sem lote, sem quarentena e sem dual-write de depósito. Os dois caminhos de entrada de material comprado passaram a chamar a MESMA função (`services/materialReceiptService.receiveMaterialIntoQuarantine`: estoque → depósito → lote nascendo em `quarantine` → custo real), extraída de `ReceivePurchaseItemsUseCase` sem mudar o comportamento dele. Lote de importação: `IMP-<ano>-XXXX-ITEM<id>-R001`, depósito `INSUMOS`, `received_at` = desembaraço. `reference_type`/`source_type` deixaram de mentir: de `'purchase'` (que fazia a consulta reversa por `(reference_type, reference_id)` cair num pedido de compra alheio) para `'import'`, via migration `20260809-000027` — **criada e aplicada ao banco** (confirmado em `SequelizeMeta`, auditoria de 2026-08-10). **AP dos tributos NÃO implementada de propósito** — é o G13 (Onda 3, decisão do dono). | *(working tree)* |
| 2026-08-09 | 1 | **G15** | ✅ Corrigido — estados mortos **acionados** (não removidos): `ReceivePurchaseItemsUseCase` passou a recalcular o status da requisição de origem a cada recebimento, na mesma transação e com lock pessimista. Regra pura isolada em `modules/purchases/application/services/syncRequisitionReceiptStatus.ts`: `received` ⇔ todos os pedidos ativos da requisição `received` **e** nenhum item com saldo `pending`; `partial` ⇔ chegou algo mas não tudo; pedido `canceled` ignorado. **Requisição `approved` com saldo NÃO é tocada** — `approved` é o estado que autoriza cotar/converter o restante (G12 bloqueia `partial`/`received`), então empurrá-la para `partial` travaria a compra do saldo remanescente; quando o último saldo vira pedido ela passa a `ordered` e o recebimento fecha em `received`. `PATCH /:id/status` continua sem alcançar `ordered`/`partial`/`received` (fatos derivados, não declaráveis à mão). | *(working tree)* |
| 2026-08-10 | 3 | **G11** | ✅ Implementado — alçada de aprovação de compra **por ORIGEM** (decisão D-C): nacional ≤ R$ 500.000 segue direto, acima exige `diretor`; **importação exige `diretor` em qualquer valor**. Regra em `modules/purchases/domain/constants.ts`; aprovação registrada em `purchase_order_approvals` (migration `20260810-000029`, **NÃO aplicada** — mesmo padrão de `jur_contract_approvals`/RF-JUR-003, `approver_user_id` do JWT, `approver_role` do RBAC, UNIQUE por papel). Origem efetiva = `purchase_orders.origin='import'` **OU** `suppliers.is_foreign=true` (escalation-only: o campo do pedido só endurece a regra). Valor comparado = `total_amount` + `freight_value`, sem impostos. Pós-aprovação, `supplier_id`/`freight_value`/`origin` ficam congelados. **Segregação de função NÃO implementada** — não foi pedida (ver §4 D-C); permanece como risco residual de controle interno. **Importação registrada em `import_processes` (COMEX) continua fora da alçada** — não passa por `purchase_orders`; falta decisão do dono sobre em que ponto do ciclo COMEX a diretoria aprova (ver §4, pendências). | *(working tree)* |
| 2026-08-10 | 3 | **G9** | ✅ Implementado (decisão D-A) — **a baixa de estoque da venda saiu da confirmação do pedido e passou para a autorização da NF-e**; confirmar passou a **reservar**. Base: Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º (a nota é autorizada antes do fato gerador e a mercadoria só transita depois da autorização de uso). `production_order_reservations` foi generalizada exatamente como o cabeçalho da migration do G3 previu — `production_order_id` nullable, `sale_id` novo, CHECK de exatamente-um-dono, índices únicos parciais por dono (migration `20260810-000030`, **NÃO aplicada**). Baixa proporcional à quantidade faturada em `services/saleStockService.ts`, chamada pelos dois caminhos de autorização (síncrono e assíncrono/webhook) na MESMA transação que incrementa `invoiced_quantity`. Cancelamento libera a reserva e devolve só `invoiced_quantity`. **Migração do dado: 1 único pedido** no banco real (venda #10, 1 un. do produto #25) — confirma na prática a decisão **D-E**; backfill devolve o saldo a `products.quantity`/ACABADOS e converte em reserva. Desarmada de carona uma bomba do G3: `inventory_movements.reference_type` `'reservation'`/`'reservation_release'` **não existem no ENUM** e faziam toda reserva morrer em 500 — reserva deixou de gravar movimento (não altera `products.quantity`). Corrigido também o estoque fantasma ao cancelar orçamento. | *(working tree)* |
