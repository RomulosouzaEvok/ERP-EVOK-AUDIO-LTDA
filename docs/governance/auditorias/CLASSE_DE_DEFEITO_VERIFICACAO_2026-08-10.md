# Por que a mesma classe de defeito aparece de novo a cada rodada

**Data:** 2026-08-10 · **Origem:** pergunta do dono do produto — *"isso já é no mínimo a quarta vez que você acha. O que está acontecendo?"*
**Status:** causa raiz identificada e provada · **correção estrutural EXECUTADA no mesmo dia** — ver §6, onde cada item ganhou o resultado real

> **Atualização de 2026-08-10 (fim do dia).** Os 5 itens da §6 foram executados.
> O que mudou de fato: `npm run test:integration` deixou de pular em silêncio,
> as três guardas de varredura existem e estão **verdes**, o baseline do schema
> virou **DDL estático congelado** (banco novo nasce idêntico ao atual, provado
> com banco descartável) e os dois bancos são **idênticos**. O diagnóstico
> abaixo fica **como está**, sem reescrita: ele é o registro de por que a
> classe de defeito reincidia.

---

## 1. A resposta curta

**Não são quatro bugs diferentes. É um bug só, encontrado quatro vezes, porque
a rede de segurança que deveria pegá-lo está desarmada — e reporta verde.**

O ERP tem 150 arquivos de teste unitário com **1.533 testes que passam em 9
segundos**. Nenhum deles toca o PostgreSQL: todos usam repositório dublê. E os
**34 arquivos de teste de integração**, que existem exatamente para isso, estão
**todos pulando em silêncio**:

```
$ npx jest tests/integration
Test Suites: 34 skipped, 0 of 34 total
Tests:       116 skipped, 116 total
```

Eles são condicionados a `RUN_INTEGRATION=true` (`server/tests/helpers/testApi.ts:32`).
Sem a variável, `describeIntegration` vira `describe.skip` e o Jest reporta
sucesso.

**E o script que se usa no dia a dia não define a variável:**

```json
"test:integration": "jest --runInBand tests/integration"          ← pula tudo
"test:integration:strict": "node scripts/run-api-suite.cjs integration"  ← roda de verdade
```

Quem roda `npm run test:integration` recebe "tudo passou" tendo executado
**zero** verificação. O runner que funciona — que sobe o servidor, emite um JWT
e aponta para o banco de teste isolado — é o `:strict`, e ele não é o padrão.

---

## 2. O que isso permite passar

Todo defeito que só existe **em execução** atravessa as três redes atuais:

| Rede | O que ela vê | O que ela **não** vê |
|---|---|---|
| `tsc --noEmit` | tipos do TypeScript | o schema físico; o `where` do Sequelize é `any` |
| 1.533 testes unitários | lógica de negócio contra dublês | qualquer `INSERT`, `ENUM`, `NOT NULL`, FK real |
| boot do servidor | que os módulos carregam | qualquer caminho de escrita |

Nenhuma das três executa uma escrita real. Por isso a mesma família de defeito
reapareceu quatro vezes, com quatro roupas diferentes:

| # | Sintoma | Onde apareceu | Efeito real |
|---|---|---|---|
| 1 | Coluna `NOT NULL` que o código nunca preenche | 38 colunas, 7 tabelas (`94e0f14`) | criar BOM, cliente, venda, contagem e **ajuste de estoque** eram 500 · app mobile inteiro morto |
| 2 | Literal de `ENUM` inexistente | `'escalated'` no widget do Jurídico (`a2947b9`) | 500 do Postgres; a consulta inteira era rejeitada |
| 3 | Mesma coisa, outras 65 colunas + 12 FKs contraditórias | `assets`, `employees`, `service_orders`, `maintenance_orders` (`92cf555`) | **cadastrar patrimônio e cadastrar funcionário nunca funcionaram** |
| 4 | Literal de `ENUM` inexistente, de novo | `'reservation'` / `'reservation_release'` (`ed47e10`) | toda reserva morria; com o G9 no ar, derrubaria **toda venda confirmada** |

Variantes da mesma cegueira, já catalogadas e ainda abertas:
- `UpdateNonConformityUseCase` grava `closed_at`; a coluna real é `closed_date` — **toda RNC fechada fica sem data**, e o Sequelize engole em silêncio
- `enum_audit_logs_action` tem 15 valores e o código usa 43 literais — **28 ações nunca gravam log de auditoria**, e a API responde 200

---

## 3. A evidência que não deixa dúvida: tabelas com zero linhas

Em todas as quatro rodadas, o mesmo sinal apareceu antes da causa:

- entre 35 movimentações de estoque, **nenhuma** era `reference_type='adjustment'`
- as únicas 4 linhas de `clients` eram resíduo de teste inserido por SQL direto
- `assets`, `employees`, `service_orders` e `maintenance_orders`: **0 linhas**

Uma tabela vazia num sistema desenvolvido há meses não é "ainda não usaram".
É **prova de que aquele caminho nunca executou com sucesso**.

> **Regra prática que sai daqui:** antes de declarar um módulo pronto, conte as
> linhas da tabela dele. Zero linha = endpoint nunca exercitado.

---

## 4. A causa raiz mais funda: o banco é gerado pelos models

`20260731-000001-baseline-schema.cjs` **não é DDL congelado** — ele gera o
schema a partir dos models **compilados, em tempo de execução**.

Isso cria uma circularidade que anula a verificação: o banco é *derivado* dos
models, então ele não pode servir de conferência **contra** os models. E como
os testes dublam o repositório, nada nunca compara os dois.

Pior: até `f9f03ea` (2026-08-05) o mapeador traduzia model calado
(`notes: DataTypes.TEXT`, sem `allowNull`) para `NOT NULL`. O defeito foi
corrigido, mas **bancos já criados nunca foram reparados** — caem no atalho
"o schema já existe" e não passam mais pelo `createTable`. Dev ficou com o
mapeador bugado; o banco de teste, criado depois, pegou o corrigido.

**Dois bancos diferentes com as mesmas migrations.** É por isso que o servidor
de produção sairia um terceiro banco, diferente dos dois.

> ✅ **Resolvido em 2026-08-10.** A circularidade foi quebrada: o baseline não
> lê mais model nenhum — aplica DDL estático congelado
> (`server/database/postgresql/00_baseline_frozen.sql`). Com isso o banco
> **volta a poder servir de conferência contra os models**, que é exatamente o
> que as três guardas de integração fazem hoje. Os dois bancos existentes foram
> convergidos e medidos como idênticos, e um banco descartável provisionado só
> por migrations saiu idêntico a eles. Detalhe em `docs/database/DATABASE.md`,
> seção *"Baseline congelado"*.

---

## 5. Por que eu venho achando um de cada vez

Honestamente: porque venho **amostrando**, não varrendo. Cada rodada olhou o
módulo que estava na frente — vendas, jurídico, patrimônio, estoque — e achou
o que havia ali. O teste-guarda de `9830f9f` foi o primeiro passo de varredura
de verdade, e por isso achou 65 de uma vez em vez de 3.

Mas ele cobre **uma** das variantes (nulabilidade). As outras duas — literal de
`ENUM` inexistente e nome de coluna inexistente — continuam sem varredura.

---

## 6. O que fecha isso de vez

Ordenado por quanto elimina, não por esforço. **Resultado de cada item
registrado em 2026-08-10, no fim do dia:**

1. ✅ **Armar a rede que já existe.** `npm run test:integration` passou a ser
   `node scripts/run-api-suite.cjs integration` — o runner que sobe a API,
   emite JWT e aponta para o banco de teste isolado. Não pula mais em silêncio.
2. ✅ **Congelar o baseline do schema.** Os 4 passos foram executados: as
   migrations pendentes foram aplicadas e os dois bancos ficaram idênticos
   (`e2a8d7e`); o `pg_dump --schema-only` virou
   `server/database/postgresql/00_baseline_frozen.sql`; a geração dinâmica
   (`DYNAMIC_MODEL_FILES` / `createTableFromModel`) foi **removida** do
   `20260731-000001-baseline-schema.cjs`; e um banco descartável provisionado
   **só por migrations** saiu **idêntico** ao `erp_evok_audio` — 0 divergência
   em coluna, tipo, default, índice e constraint
   (`server/scripts/comparar-bancos.cjs`). **O passo 4 passou: o banco deixou
   de bloquear o provisionamento de produção.**
3. ✅ **Varredura de escrita real.** Feita: `POST` real contra 237 endpoints —
   ver `VARREDURA_ESCRITA_REAL_2026-08-10.md` (commit `5dfd63e`).
4. ✅ **Guarda de `ENUM` e de nome de coluna.** Criadas e **verdes**:
   `server/tests/integration/enum-literal-guard.test.ts` e
   `column-name-drift-guard.test.ts`, ao lado do
   `schema-model-drift-guard.test.ts` que já existia.
5. 🟡 **Critério de aceite corrigido** — a parte escrita está feita (o aviso
   está no topo do `CLAUDE.md`), mas **isto é cultural e só se prova no uso**.
   O teste ponta a ponta "insumo cadastrado → produto acabado expedido", que é
   o aceite de verdade, **ainda não foi executado**.

---

## 7. O que isso significa para o Go-Live

Nada disso é novo funcionalmente — o código sempre esteve lá. O que muda é a
leitura do estado do projeto:

**Os números de cobertura do ERP mediam quanto foi escrito, não quanto
funciona.** Vários módulos declarados prontos nunca tiveram uma única escrita
bem-sucedida contra o banco. A contagem "1.533 testes passando" é verdadeira e
irrelevante para esta classe de defeito.

O gate honesto de Go-Live passa a ser o item 3 desta lista: **um `POST` real
por endpoint de criação, verde**. Antes disso, "pronto" é uma afirmação sem
lastro.

---

## Referências

- `docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md` — teste ponta a ponta que expôs a primeira rodada
- `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md` — auditoria cruzada banco × docs × código
- `docs/database/DATABASE.md` — plano de 4 passos do baseline congelado
- `server/tests/integration/schema-model-drift-guard.test.ts` — a varredura que já existe (nulabilidade)
- Commits: `94e0f14`, `a2947b9`, `9830f9f`, `ed47e10`, `92cf555`
