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
| **G11** | Alçada de compra por valor + segregação de função (aprovador ≠ solicitante). | Já existe padrão aprovado e implementado para contratos jurídicos (3 faixas). Avaliar se as mesmas faixas servem para compra recorrente de insumo, que tem volume e frequência muito diferentes. |
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

### 🟡 Ainda pendente do dono
- **D10** — a empresa é ou pretende ser certificada **ISO 9001**? Algum cliente
  OEM exige plano de amostragem próprio? *(define o rigor do registro de
  inspeção do G7 e do controle de alteração de engenharia)*
- **CNAE no cadastro de cliente** — deve passar a ser coletado? Hoje o campo
  nem existe no schema de criação, e não se aplica a pessoa física.
- **Conta a receber avulsa** (sem venda vinculada) é caso legítimo de negócio?

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
