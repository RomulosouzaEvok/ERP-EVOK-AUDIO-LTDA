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

> **Estado em 2026-08-10 — conferido contra `git log`, não de memória.**
> **16 dos 17 gaps têm entrada de fechamento na §6.** O que sobra:
>
> | | |
> |---|---|
> | **Onda 1** (G2, G8, G10, G12, G15, G16) | ✅ fechada em 2026-08-09 |
> | **Onda 2** (G3, G5, G14) | ✅ fechada — G3/G14 em 08-09, **G5** em 08-10 (`c21f81b` API + `b52470d` tela) |
> | **Onda 2 — G6** | ⏸️ **único gap sem implementação.** Decisão consciente: a pré-condição já é coberta (`in_progress` só vem de `released`/`paused`, e entrar em `released` valida disponibilidade e reserva material). Exigir centro de trabalho é mudança de schema. Ver a linha do G6 na §6. |
> | **Onda 3** (G1, G4, G7, G9, G11, G13, G17) | ✅ **toda fechada em 2026-08-10**, mais as decisões **D-G** (gate COMEX) e **D-K** (segregação de função) |
>
> Todas as migrations envolvidas (`20260810-000029` a `000037`) estão
> **aplicadas** nos dois bancos desde `e2a8d7e`. As anotações "NÃO aplicada"
> que ainda aparecem no texto da §6 são anteriores a esse commit.
>
> ⚠️ **Fechar o gap não é o mesmo que ter exercitado o caminho.** Boa parte
> destas entregas foi validada por typecheck + suíte unitária com repositório
> dublê. O critério de aceite honesto continua sendo o da §5 e o do item 3 de
> `docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`:
> uma **escrita real bem-sucedida** no fluxo principal.

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
| **G7** | ✅ **Implementado em 2026-08-10** (decisão D-H). `quality_inspections` criada, `ReleaseLotUseCase` passou a exigir inspeção aprovada (a **mais recente**), rastreabilidade de quem autorizou gravada no lote. **Achado colateral fechado junto:** a quarentena deixou de ser decorativa — MRP e disponibilidade de OP passaram a descontar o saldo retido. **Não implementado por falta de decisão do dono:** motor de amostragem Ac/Re (nível de inspeção + AQL da ISO 2859-1). Migration `20260810-000032` ✅ **aplicada em 2026-08-10** (`e2a8d7e`). Detalhes em `docs/governance/TODO.md` (entrada 2026-08-10 G7). |
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

### ✅ D-K — Segregação de função na compra: **aprovador ≠ solicitante**
Resposta direta do dono em 2026-08-10 à pergunta *"aprovador ≠ solicitante?"*:
**"Sim, aprovador ≠ solicitante"**. Isto reverte a ressalva registrada em
**D-C** ("não foi pedida segregação; fica como recomendação de controle
interno") e **fecha o critério de pronto da §5** que estava aberto de
propósito desde o G11.

Alcance: os **4 pontos de aprovação** da cadeia, não um só —
requisição (`purchase_requisitions.requester_id`), pedido
(`purchase_orders.requester_id`), alçada da diretoria do G11
(`purchase_order_approvals`) e gate do COMEX (`import_process_approvals`,
comparado com `import_processes.created_by`). Aprovador **sempre** de
`req.user.id` (JWT). Cada ponto tem seu `details.rule` próprio
(`D-K-REQUISICAO`, `D-K-PEDIDO`, `D-K-ALCADA`, `D-K-COMEX`).

Duas decisões de implementação que precisam do aval do dono:

1. ⚠️ **`role = 'admin'` NÃO isenta.** É a única regra do ERP sem
   curto-circuito de admin. Argumento: RBAC e alçada respondem a
   *"esta pessoa tem privilégio para isso?"* — e privilégio é concedível;
   segregação responde a *"esta é a mesma pessoa?"* — e identidade não é.
   Uma exceção para `admin` não seria estreita, seria o cancelamento da
   regra, porque `admin` é justamente a conta que opera o sistema hoje.
2. 🔴 **Impacto operacional imediato — verificado no banco, não estimado.**
   Existem **2 usuários ativos**: `admin` (id 1) e um Analista de
   Laboratório sem nenhum módulo de compras. **Um único usuário no sistema
   inteiro é capaz de aprovar compra**, e é o mesmo que cria tudo: 18 de 18
   pedidos, 4 de 4 processos de importação e 13 de 13 requisições têm
   `requester_id = 1`; **7 das 7 requisições aprovadas foram
   auto-aprovadas** (`approved_by = requester_id = 1`) — que é exatamente o
   furo que a regra fecha, agora com prova documental.
   Consequência: **assim que este código entrar em produção, nenhuma compra
   será aprovável** até existir um segundo usuário habilitado. A regra está
   correta; falta a contrapartida organizacional. **Ação necessária antes de
   aplicar:** cadastrar um segundo aprovador em Administração → Perfis de
   Acesso (`requisicoes: approve` + `compras: operate`, e `diretor` se for
   aprovar alçada/COMEX).

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

### ✅ Bloqueio operacional — RESOLVIDO em 2026-08-10 (`e2a8d7e`)
- ~~**Aplicar migrations no banco local**~~ — o bloqueio caiu. As **160**
  migrations estão aplicadas nos **dois** bancos (`erp_evok_audio` e
  `erp_evok_audio_test`), que foram medidos como **idênticos** (coluna, tipo,
  default, índice e constraint, via `server/scripts/comparar-bancos.cjs`).
  Com isso o **S-1b** andou: as 65 divergências schema × model foram fechadas
  (`92cf555`), e o baseline deixou de gerar schema a partir dos models — passou
  a aplicar DDL congelado, de modo que banco novo nasce idêntico ao atual
  (provado com banco descartável provisionado só por migrations).
  Ver `docs/database/DATABASE.md`, seção *"Baseline congelado"*.

### 🟡 Pendente do contador
- **C1** CNAE efetivamente escriturado e faturamento do segundo exercício anterior
- **C4** a empresa escritura hoje o Livro modelo 3? *(só o Bloco K completo desobriga)*
- **C9** destino das contas a pagar já criadas na aprovação e ainda não recebidas
- **C11** a empresa é auditada ou tem exigência de banco sobre os números?

---

## 5. Critério de pronto (definição de "sem gap")

A cadeia só é considerada fechada quando, num teste ponta a ponta com dado real:

> **Leitura em 2026-08-10.** Os itens abaixo foram reavaliados contra o código,
> não contra a lista de commits. **Marcar `[x]` aqui significa "a regra existe
> e bloqueia no código"** — não significa "exercitado ponta a ponta com dado
> real", que é o que a frase de abertura desta seção pede e **ainda não foi
> feito**. Onde a regra é parcial, está escrito o que falta em vez de um `[x]`
> otimista.

- [x] **Não existe caminho que faça produto entrar em estoque com custo zero** —
      G2 (concluir OP sem BOM ativa falha) + G4 (apontamento obrigatório, então
      mão de obra não fica R$ 0,00). ⚠️ Não cobre OPs concluídas **antes** de
      2026-08-04 (backfill de custo nunca executado, risco residual já
      registrado no `CLAUDE.md`).
- [x] **Reserva de material de uma ordem não pode ser consumida por outra** —
      G3 (`production_order_reservations`), generalizada pelo G9 para também
      cobrir venda. ⚠️ O backfill `05_production_order_reservations.ts`
      continua **sem execução com `--apply`**.
- [x] **Uma única estrutura de produto governa planejamento e consumo** — G1:
      `bill_of_materials` é a fonte única; escrita paralela em
      `item_estruturas` encerrada com 422; MRP lê por projeção em tempo de
      leitura, sem réplica.
- [x] **Nenhum produto sai sem liberação de qualidade registrada, com
      evidência** — **fechado nos dois lados em 2026-08-10.** Entrada: G7
      tornou a inspeção uma entidade (`quality_inspections`), liberar lote
      exige inspeção aprovada e grava
      `release_inspection_id`/`released_by`/`released_at`; a quarentena deixou
      de ser decorativa (MRP e disponibilidade de OP descontam o retido); FEFO
      só consome lote liberado. **Saída (D-L/D-M):**
      `services/saleLotService.ts` passou a rodar o gate antes de qualquer
      escrita da emissão — lote `quarantine`/`blocked`/vencido recusa o
      faturamento com 422 `details.rule = 'D-L'` sem queimar número de NF-e —,
      a expedição grava o rastro por lote em `sale_lot_shipments` (migration
      `20260810-000039`) e o cancelamento devolve **ao mesmo lote** (D-M), sem
      liberar o que a Qualidade bloqueou. Exercitado contra PostgreSQL real em
      `tests/integration/sale-lot-quality-gate.test.ts` (9 casos: bloqueio,
      atomicidade, liberação parcial, FEFO, rastro, devolução, lote bloqueado
      pós-embarque e estoque legado). ⚠️ Produto sem lote nenhum continua
      faturando (`governed: false`) — a regra degrada em vez de travar o
      faturamento de cadastro legado, e isso é deliberado.
- [x] Quem aprova uma compra não é quem a solicitou — **fechado em 2026-08-10
      (decisão D-K)** nos 4 pontos de aprovação da cadeia, sem exceção para
      `admin`. ⚠️ Depende de uma ação operacional para não travar a fábrica:
      resolvido **para teste** em 2026-08-10 (20 usuários departamentais
      semeados, entre eles Diretor e Gerente de Compras, ambos distintos do
      `admin` que assina 18/18 pedidos e 13/13 requisições); **falta um
      aprovador real** no domínio `@evokaudio.com.br` para produção — os
      semeados usam `@teste.evokaudio` e o script recusa rodar em produção
      (ver D-K, item 2)
- [ ] **Todo passo obrigatório do processo é obrigatório no código** —
      avançou muito (G2, G4, G7, G9, G11, G13, D-K passaram a **bloquear**),
      mas o **G6 segue em aberto** por decisão consciente: iniciar produção
      não valida centro de trabalho nem operador. Enquanto houver um passo
      declarado obrigatório na norma e não no código, este item não fecha.
- [ ] **Nenhum dado é registrado "decorativamente"** — a quarentena deixou de
      ser decorativa (G7) e os estados mortos da requisição foram acionados
      (G15). Segue decorativo, por decisão registrada: plano de amostragem /
      tamanho de lote e de amostra da inspeção são **evidência textual sem
      motor Ac/Re** (ISO 2859-1 não decidida pelo dono).
- [ ] **Documentação, banco de dados e código descrevem o mesmo processo** —
      banco e código convergiram: as 3 guardas de integração (drift de schema,
      nome de coluna, literal de enum) estão **verdes**, e o banco passou a ser
      reproduzível a partir de DDL congelado. A documentação é a perna que
      falta: este arquivo, `TODO.md` e `HANDOFF_CODEX.md` ainda contêm dezenas
      de "migration NÃO aplicada" superados por `e2a8d7e` (marcados em bloco,
      não linha a linha).

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
| 2026-08-10 | 3 | **G11** | ✅ Implementado — alçada de aprovação de compra **por ORIGEM** (decisão D-C): nacional ≤ R$ 500.000 segue direto, acima exige `diretor`; **importação exige `diretor` em qualquer valor**. Regra em `modules/purchases/domain/constants.ts`; aprovação registrada em `purchase_order_approvals` (migration `20260810-000029`, ✅ **aplicada em 2026-08-10**, `e2a8d7e` — mesmo padrão de `jur_contract_approvals`/RF-JUR-003, `approver_user_id` do JWT, `approver_role` do RBAC, UNIQUE por papel). Origem efetiva = `purchase_orders.origin='import'` **OU** `suppliers.is_foreign=true` (escalation-only: o campo do pedido só endurece a regra). Valor comparado = `total_amount` + `freight_value`, sem impostos. Pós-aprovação, `supplier_id`/`freight_value`/`origin` ficam congelados. **Segregação de função NÃO implementada** — não foi pedida (ver §4 D-C); permanece como risco residual de controle interno. ~~Importação registrada em `import_processes` (COMEX) continua fora da alçada~~ — **fechado no mesmo dia** pela decisão **D-G** e pelo commit `4b60a81` (gate na transição `draft → shipped`); tela em `612e116`. | *(working tree)* |
| 2026-08-10 | 3 | **G9** | ✅ Implementado (decisão D-A) — **a baixa de estoque da venda saiu da confirmação do pedido e passou para a autorização da NF-e**; confirmar passou a **reservar**. Base: Ajuste SINIEF 07/05, cláusula 1ª §1º e cláusula 9ª §1º (a nota é autorizada antes do fato gerador e a mercadoria só transita depois da autorização de uso). `production_order_reservations` foi generalizada exatamente como o cabeçalho da migration do G3 previu — `production_order_id` nullable, `sale_id` novo, CHECK de exatamente-um-dono, índices únicos parciais por dono (migration `20260810-000030`, ✅ **aplicada em 2026-08-10**, `e2a8d7e`). Baixa proporcional à quantidade faturada em `services/saleStockService.ts`, chamada pelos dois caminhos de autorização (síncrono e assíncrono/webhook) na MESMA transação que incrementa `invoiced_quantity`. Cancelamento libera a reserva e devolve só `invoiced_quantity`. **Migração do dado: 1 único pedido** no banco real (venda #10, 1 un. do produto #25) — confirma na prática a decisão **D-E**; backfill devolve o saldo a `products.quantity`/ACABADOS e converte em reserva. Desarmada de carona uma bomba do G3: `inventory_movements.reference_type` `'reservation'`/`'reservation_release'` **não existem no ENUM** e faziam toda reserva morrer em 500 — reserva deixou de gravar movimento (não altera `products.quantity`). Corrigido também o estoque fantasma ao cancelar orçamento. | *(working tree)* |
| 2026-08-10 | 3 | **D-K** | ✅ Implementado — **segregação de função na compra: quem solicita não aprova** (decisão D-K). Regra única em `shared/domain/segregationOfDuties.ts`, aplicada nos **4** pontos de aprovação da cadeia com `details.rule` próprio: requisição (`D-K-REQUISICAO`), pedido (`D-K-PEDIDO`), alçada da diretoria/G11 (`D-K-ALCADA`) e gate do COMEX (`D-K-COMEX`). Aprovador sempre de `req.user.id` (JWT); checagem **antes de qualquer escrita** (nada de estado parcial); mensagem prescritiva com `details.what_to_do`. ⚠️ **`role = 'admin'` não isenta** — única regra do ERP sem curto-circuito de admin (identidade ≠ privilégio). **Sem migration.** 🔴 **Impacto operacional verificado no banco:** 1 único usuário ativo capaz de aprovar compra (o próprio `admin`), autor de 18/18 pedidos, 13/13 requisições e 4/4 importações, com **7/7 requisições auto-aprovadas** — exige cadastrar um segundo aprovador antes de aplicar (ver §4, D-K item 2). Achado registrado: `purchase_orders.requester_id` é `NULL`-able (0 nulos hoje) e por isso não bloqueia quando nulo — recomendado `SET NOT NULL` em migration futura. Pontos avaliados e **não** implementados por não terem sido autorizados: adjudicação de RFQ (`POST /api/rfqs/:id/award`) e recebimento (`POST /api/purchases/:id/receive`). | *(working tree)* |
| 2026-08-10 | 3 | **D-G / G11-COMEX** | ✅ Implementado — a alçada do G11 não alcançava importação registrada em `import_processes` (fluxo paralelo, sem etapa de aprovação nenhuma: todas as escritas eram `comex:operate`). A diretoria passa a aprovar na transição **`draft → shipped`**, o último ponto em que ainda dá para desistir sem custo afundado. Mesmo padrão de `purchase_order_approvals`: `import_process_approvals`, papel `diretor`, `approver_user_id` sempre do JWT, UNIQUE por (processo, papel), leitura sem efeito colateral. Migration `20260810-000031`, **aplicada**. Tela do COMEX passou a conhecer o gate. | `4b60a81` · tela `612e116` |
| 2026-08-10 | 2 | **G5** | ✅ Implementado — as tabelas de roteiro existiam desde sempre e **não havia como cadastrar um roteiro pelo sistema**. 9 endpoints em `/api/production/routes`, Clean Architecture (domínio puro, transação injetada pelo controller). Sequência 1..N contígua sem buraco (`G5-SEQ-GAP`) nem duplicidade (`G5-SEQ-DUP`); `step_code` único no roteiro; centro de trabalho opcional, mas revalidado **de novo na liberação** (centro desativado entre rascunho e ativação zeraria o custo de mão de obra em silêncio). Roteiro `active` é imutável — mudança exige revisão, que clona em rascunho; ao ativar, a anterior vira `superseded` **com as etapas intactas**, sustentando os apontamentos já feitos. Migration `20260810-000034` (índice único parcial de roteiro ativo), **aplicada**. Bug latente corrigido de carona: `aggregateLoadByWorkCenter` somava todas as revisões, e dobraria a carga-máquina na primeira revisão criada. **Pré-requisito do G4** — exigir apontamento sem poder cadastrar roteiro seria regra inexequível. | `c21f81b` · tela `b52470d` |
| 2026-08-10 | 3 | **G4** | ✅ Implementado (decisão D-A) — **concluir OP sem apontamento passa a falhar**. É lei, não preferência: alto-falante é CNAE 2640-0/00 (divisão 26); o Ajuste SINIEF 2/09 cl. 3ª §7º III obriga ao Bloco K desde 01/01/2019, e o §10 é o dispositivo decisivo — só a escrituração **completa** desobriga o Livro modelo 3, que exige consumo e produção **por ordem de produção**. Regras em `production/domain/productionTrackingRules.ts`; doc nova em `docs/tributario/04-BLOCO_K.md`. Só foi possível porque o G5 caiu na mesma sessão. | `b954fa5` |
| 2026-08-10 | 3 | **G13** | ✅ Implementado (decisão D-A) — **AP nasce no recebimento, AR na NF-e**. CPC 00 (R2) 4.56/4.58: pedido aprovado é contrato executório, não passivo. CPC 47 31/38/108: receita quando o cliente obtém o **controle**; recebível exige direito incondicional. AP com valor = soma do que veio **nesta** entrega (três entregas → três AP); `approved_by` nasce nulo (quem recebe não aprova pagamento). AR nos **dois** caminhos de autorização (síncrono e webhook), na mesma transação que incrementa `invoiced_quantity` e baixa estoque (G9); **nenhuma parcela nasce paga, nem à vista**. Alçada do G11 permanece íntegra (pedido reprovado nunca chega a `sent`, e só `sent`/`partial` aceitam recebimento). AR avulsa segue aberta (D-J). **Dado legado não foi reclassificado** — 8 AP de pedido não recebido (R$ 3.675,02, uma delas de pedido cancelado) e 2 AR de venda não faturada (R$ 150,00) continuam como estão; destino é a pergunta **C9** ao contador. Zero UPDATE, zero DELETE. | `2648686` |
| 2026-08-10 | 3 | **G1** | ✅ Implementado (decisão D-B) — o ERP tinha **duas BOMs paralelas** (`item_estruturas`/UUID para o MRP e `bill_of_materials`/INT para a produção, ligadas por casamento de string). O banco confirmou o dono antes de qualquer escrita: 4 linhas em uma, 2 na outra, **zero engenharia real** — risco rebaixado de alto para escolha técnica. Sobrevive `bill_of_materials`: `items.estoque_atual` é `0.000000` em 100% das 17 linhas enquanto `products.quantity` carrega o saldo real, ou seja, o mestre da árvore "canônica" não é sistema de registro de nada transacional. Convergência **incremental, sem cópia**: `bomStructureProjection.ts` projeta a BOM ativa para arestas em UUID **em tempo de leitura** — não existe réplica para dessincronizar; escrita paralela encerrada com 422. Lacuna de catálogo é **reportada, não engolida**. Migration `20260810-000035`, **aplicada**. Três bugs latentes corrigidos de carona (entre eles: `superseded` rodava fora da transação, e uma criação que falhasse deixava o produto com **zero BOM ativa** — desde o G2, produto que não conclui OP). | `067472a` |
| 2026-08-10 | 3 | **G17** | ✅ Implementado (decisão D-F) — **Plano Mestre de Produção (MPS) entre a carteira e a ordem**. Antes, conferido no código: confirmar venda não gerava produção nenhuma, o MRP calculava só contra a demanda digitada no payload, nada lia a carteira aberta e `products.min_quantity` só alimentava alerta. A ponte era manual e não registrada. Conta: `necessidade = max(0, (carteira + estoque mínimo + previsão manual) − (saldo de planejamento + saldo a produzir das OPs abertas))`, descontando quarentena/bloqueio via `quarantineBalanceService` do G7 (para não criar uma **segunda** definição de "retido") e usando `BomService.checkAvailability`, que já lê a fonte única do G1. **Sem OP automática na venda:** `suggested_quantity` (sistema) e `planned_quantity` (humano) são colunas separadas, a linha nasce com zero mesmo com sugestão positiva, e firmar plano sem decisão humana é recusado. Migration `20260810-000037`, **aplicada**. ⚠️ **Limitação estrutural:** `sales` não tem data de entrega prometida — a demanda só pode ser consolidada no horizonte inteiro, **sem baldes de tempo**; o "Semana 1/2/3" de `docs/producao/02-PCP.md` não é possível hoje. Sem tela. 4 decisões de PCP em aberto, registradas e não inventadas. | `3e3827e` |
| 2026-08-10 | — | **Trilha de auditoria** | ✅ Corrigido (fora da lista de gaps, achado da varredura `5dfd63e`) — `enum_audit_logs_action` tinha 15 valores e o código usava 43 literais; como o serviço é fire-and-forget, a API respondia **200 e o registro sumia**. Prova no dado real: `audit_logs` continha apenas 5 valores distintos. Um dos ausentes era `access_denied` — **tentativa de acesso indevido não deixava rastro nenhum**. Vocabulário único em `shared/domain/auditActions.ts`, normalização no serviço, migration `20260810-000036` (**aplicada**), com rebaixamento seguro caso o código rode contra banco sem a migration. Junto: `UpdateNonConformityUseCase` gravava `closed_at`, coluna que **não existe** (a real é `closed_date`) e o Sequelize engolia em silêncio — as 6 RNCs estão `open`, então nada se perdeu. `closed_by` saiu de `ALLOWED_FIELDS` do `PUT` e passa a vir só do JWT. | `b954fa5` |
| 2026-08-10 | — | **Schema × model + baseline** | ✅ Corrigido — 65 divergências schema × model e 12 FKs `ON DELETE SET NULL` sobre coluna `NOT NULL` fechadas (`92cf555`); as 160 migrations **aplicadas nos dois bancos**, que passaram a ser **idênticos** (`e2a8d7e`); e o baseline deixou de gerar schema a partir dos models compilados — passa a aplicar DDL congelado, provado com banco descartável provisionado só por migrations. Isto **desbloqueia o provisionamento do servidor de produção** pelo lado do banco. Detalhe em `docs/database/DATABASE.md`, seção *"Baseline congelado"*. | `92cf555` · `e2a8d7e` · *(working tree)* |
| 2026-08-10 | 3 | **D-L / D-M** | ✅ Implementado — **o gate de qualidade na SAÍDA**, a metade que faltava do §5. `services/saleLotService.ts`: pré-checagem na primeira transação da emissão (não queima número de NF-e nem deixa a venda presa em `processing`), revalidação sob `FOR UPDATE` na transação que baixa o estoque, alocação **FEFO** e rastro por lote em `sale_lot_shipments` (migration `20260810-000039`). Erro 422 prescritivo (`details.rule = 'D-L'`) citando lote, estado, saldo liberado e o caminho para destravar. **D-M:** cancelar nota/venda devolve **ao mesmo lote e na mesma quantidade** (dono da linha é a EMISSÃO, então faturamento parcial devolve só a nota cancelada); lote que zerou por causa da expedição reabre como `available`, lote `blocked` **continua blocked** — devolver mercadoria não é liberar qualidade. Produto sem lote (`governed: false`) segue faturando. Provado contra PostgreSQL real: `tests/integration/sale-lot-quality-gate.test.ts`. | *(working tree)* |
| 2026-08-10 | — | **G18** | ✅ Implementado — subconjunto **estocável × fantasma** na explosão da BOM (`bill_of_material_items.is_phantom`, migration `20260810-000038`). O REPARO que a Evok vende no balcão E monta no alto-falante tinha o estoque nunca baixado, porque a explosão descia incondicionalmente até a matéria-prima. Duas visões separadas: produção para no subconjunto estocável, engenharia (`?through_subassemblies=true`) desce até a folha. Provado em `tests/integration/bom-two-level-reparo.test.ts`. ⚠️ A migration ficou aplicada **só no banco de teste** até 2026-08-10 — ver a linha da guarda de drift abaixo. | *(working tree)* |
| 2026-08-10 | — | **Importação de cadastro por planilha** | ✅ Implementado e **provado** — `/api/catalog-import` (módulo `spreadsheetImport`): dois CSVs (cadastro e estrutura), leitura tolerante ao Excel brasileiro (`;`, vírgula decimal, Windows-1252, BOM), simulação sem gravar, e gravação de `products` + `items` + `bill_of_materials` na mesma transação. Recusa é **tudo ou nada**, com arquivo/linha/coluna em português. RBAC exige `produtos` **e** `bom` em nível `operate` na escrita — sem isso a importação seria um caminho lateral para criar estrutura de produto. 6 casos em `tests/integration/catalog-spreadsheet-import.test.ts`. | *(working tree)* |
| 2026-08-10 | — | **Guarda de drift entre bancos** | ✅ Corrigido — a migration `...-000038` estava aplicada **só em `erp_evok_audio_test`**, com a `...-000039` já registrada: no banco real a coluna `is_phantom` não existia e qualquer leitura de item de BOM quebraria. Nenhuma rede pegou, porque **todas as guardas de integração rodam contra o banco de teste**. Migration aplicada e nova guarda `tests/integration/cross-database-drift-guard.test.ts`, que executa `scripts/comparar-bancos.cjs` (o script já existia; faltava alguém rodá-lo) e reprova quando os dois bancos divergem — contrato verificado: sai 0 idênticos, 2 divergentes. Pula quando o banco de dev não é acessível (CI). | *(working tree)* |
| — | 2 | **G6** | ⏸️ **Continua sem implementação** — reafirmado em 2026-08-10. A análise de 2026-08-09 (linha acima) segue válida: a pré-condição real já é coberta pela máquina de estados, e as validações sugeridas exigiriam coluna nova em `production_orders`. É o **único dos 17 gaps sem entrada de fechamento**. | — |
