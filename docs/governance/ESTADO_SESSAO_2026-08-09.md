# Estado da sessão — 2026-08-09 / madrugada de 10

> ## ⚠️ DOCUMENTO HISTÓRICO DE SESSÃO — SUPERADO
>
> Retrato de **uma sessão específica (2026-08-09 / madrugada de 10)**, não o
> estado atual. As migrations aqui listadas como "commitadas, NÃO aplicadas ao
> banco" **estão todas aplicadas** desde 2026-08-10.
>
> Para o estado atual: `CLAUDE.md` e
> `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

**Documento de retomada.** Serve para parar o trabalho numa máquina e continuar em
outra sem perder contexto. Leia este arquivo primeiro, depois `git log`, depois a
seção "Fila de próximos passos".

Documento anterior equivalente: `ESTADO_SESSAO_2026-08-07.md`.

> ⚙️ **Nota de ambiente (não versionada):** as definições de agente em `.claude/agents/`
> estão no `.gitignore`. Nesta máquina os 21 agentes foram migrados para
> `model: opus` + `effort: high`. **Em outra máquina eles voltam a ser `sonnet`** —
> se quiser o mesmo comportamento, repita a troca lá.

---

## 1. Onde estamos

### Meta que orienta tudo (definida pelo dono nesta sessão)
> "Um insumo é cadastrado e segue seu curso até virar produto finalizado,
> passando pelos departamentos, **sem gap**."

Esse é o critério de aceite final: a corrente `cadastro do item → estrutura →
demanda → requisição → cotação → pedido → recebimento → qualidade → estoque →
ordem de produção → apontamento → consumo → lote de acabado → inspeção →
estoque de acabado → venda → NF-e → expedição` precisa fechar sem ponto onde o
processo permita erro ou pule etapa.

### Situação do pipeline de módulos novos
Blocos 0–5 fechados (LGPD, SST, TI, Jurídico, Facilities, Marketing).
**Bloco 6 (RH) em execução** — ver seção 4.

---

## 2. Commits desta sessão (todos pushados)

| Commit | O que entregou |
|---|---|
| `97628ae` | **Gap Jurídico fechado** — RF-JUR-030 (atos societários) + RF-JUR-003 (alçada de aprovação de contrato em 3 faixas: ≤R$50k direto / R$50k–300k 1 diretor / >R$300k diretor+financeiro). 2 migrations aplicadas. |
| `b04e21d` | **Build de produção do client destravado** + telas do gap Jurídico. |
| `a2947b9` | **Correção de 500 no widget de Jurídico** da home (enum inexistente). |
| `60e1362` | **Design do Bloco 6 RH** — requisitos, schema (20 tabelas `hr_*`, 16 migrations), API (~77 endpoints), auditoria cruzada. |
| `41b92cc` | Primeira versão deste documento de retomada. |
| `4f4122e` | Validação de enums de entrada no módulo TI (400 em vez de 500) + **plano de ação dos 17 gaps**. |
| `5ec0651` | **G2** — OP não conclui mais sem BOM ativa (entrava com custo zero) nem com quantidade zero (deixava reserva presa). |
| `0d5812e` | **Onda 1** — G16 (rigor do MRP + numeração de OP serializada), G8 (teste acústico reprovado sempre abre NC), G10 (NC avisa quando não bloqueia), G12 (fim do pedido duplicado). G6 analisado e conscientemente não implementado. |
| `9b169a7` | **RH passada 1** — 34/77 endpoints, núcleo legal da CLT. |
| `fed3129` | **G3** — reserva de material vinculada à OP (fim da canibalização entre ordens). |
| `bf07136` | **Pesquisa normativa** das 6 decisões, com fonte. |
| `9df39c7` | **G14/G15** — importação com lote e quarentena; ciclo `partial`/`received` da requisição. |
| `4f077a2` | Atualização deste documento com o placar dos gaps. |
| `a90deee` | 🔴 **Teste ponta a ponta + auditoria de consistência revelam bloqueador P0** (ver seção 3.1). |
| `94e0f14` | 🟢 **Bloqueador P0 destravado** — 38 colunas alinhadas, provado via API real. |

### Estado do banco local
**Todas as migrations aplicadas**, incluindo as 16 do RH (`20260808-000010..025`),
a `20260809-000026` (reservas por OP) e a `000027` (valor `import` nos enums).
Backup pré-migração em `scratchpad/bkp_pre_migrations.sql` (929 KB).
Backfill de reservas executado (`--apply`) — base estava limpa, zero divergência.
API rebuildada e `GET /health/ready` respondendo 200.

### Suíte
**1453/1453 testes unitários**, typecheck limpo, e `npx tsx -e "require('./app')"`
sobe — este último passou a ser critério de aceite, ver achado C abaixo.

### Quatro achados desta sessão que valem registro permanente

**A. O build de produção estava quebrado no `main` e ninguém sabia.**
`npm run build` do `client/` falhava com 25 erros em 13 arquivos (Facilities,
Marketing, Tesouraria, Contabilidade). Causa: `zodResolver` tipa
`Resolver<z.input, ctx, z.output>` e os formulários declaravam `useForm<z.infer>`
(tipo de saída) para os dois papéis. Corrigido com o generic de 3 parâmetros
`useForm<z.input<typeof schema>, unknown, FormData>`.
👉 **Regra que passa a valer**: `npx tsc --noEmit` **não** é critério de aceite de
frontend — ele fica limpo com o build quebrado. O critério é `npm run build`
(que roda `tsc -b`, mais rigoroso).

**B. Bug de enum que passa por typecheck e por 1200+ testes.**
`SequelizeDeadlineRepository.listCritical()` filtrava por `status='escalated'`,
valor que não existe no enum. O Postgres rejeitava a query inteira → 500.
Nem o typecheck (o `where` do Sequelize é `any`) nem os testes (repositório
mockado, sem Postgres) pegam isso.
👉 **Regra que passa a valer**: todo literal de status/enum usado em query ou
escrita precisa ser conferido contra a migration da coluna. Uma varredura
completa foi feita e **não achou outra ocorrência**; o módulo `ti` recebeu
validadores Zod para fechar a superfície adjacente (valor inválido agora
retorna 400, não 500).

**C. `export =` junto com qualquer outro `export` derruba o servidor em runtime.**
O esbuild do `tsx` transpila em modo ESM e o `export =` vira referência a um
símbolo inexistente → `ReferenceError` no `require`. O `tsc` aceita e o Jest
também (transform CJS), então **passa por typecheck e por 1400 testes**.
Afetava 10 arquivos, incluindo um commitado em `97628ae` — ou seja,
`npm run server` estava quebrado e não aparecia porque o Docker compila com
`tsc`. Existe agora `tests/unit/export-assignment-guard.test.ts` varrendo `src/`.
👉 **Regra que passa a valer**: `npx tsx -e "require('./app')"` é critério de
aceite de backend, junto com typecheck e testes. Constante de negócio vai em
`domain/constants.ts`, nunca no arquivo do use case.

**D. Mock incompleto deixa teste verde pelo motivo errado.**
Encontrados **7 casos** nesta remediação — um deles literalmente afirmava o bug
como comportamento correto ("NÃO cria RNC quando a flag não é informada"), outro
só passava por causa do gap, e vários mocks de OP sem `due_date` estouravam na
validação da entidade sem nunca chegar na regra que diziam testar.
👉 **Regra que passa a valer**: ao escrever teste que espera erro, garanta que o
erro vem **da regra alvo**, não de uma validação anterior. Asserção por mensagem
específica, não só `toBeInstanceOf`.

**E. `inventoryService.ts` termina com `module.exports = {...}`, que substitui os
named exports.** Função nova exportada só com `export` some em runtime, passando
por typecheck e pela suíte. Guardado por `tests/unit/inventory-service-contract.test.ts`.

---

## 3. Auditoria do fluxo do produto final — 17 gaps

Mapeamento do fluxo **real do código** (não da documentação), 21 estações.
Artefato visual publicado para o dono:
<https://claude.ai/code/artifact/aad98974-1e2e-4980-bf24-01192b5e1128>

Plano de execução: `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md`.

### Placar (atualizado na madrugada de 10/08)

| Gap | Estado |
|---|---|
| **G2** custo zero + reserva presa | ✅ corrigido (`5ec0651`) |
| **G3** canibalização de reserva | ✅ corrigido (`fed3129`) |
| **G16** rigor do MRP + numeração de OP | ✅ corrigido (`0d5812e`) |
| **G8** teste acústico sem consequência | ✅ corrigido (`0d5812e`) |
| **G10** NC que não bloqueia, em silêncio | ✅ corrigido (`0d5812e`) |
| **G12** pedido duplicado | ✅ corrigido (`0d5812e`) |
| **G14** importação sem rastreabilidade | ✅ corrigido (`9df39c7`) |
| **G15** ciclo da requisição que não fecha | ✅ corrigido (`9df39c7`) |
| **G6** início de produção sem validação | ⚪ analisado, **conscientemente não implementado** (a proteção que importa já existe; o resto exigiria mudança de schema ou depende do G4) |
| **G1** duas BOMs paralelas | 🟡 **decisão do dono** (D6 é a pergunta-chave) |
| **G4** apontamento opcional | 🟡 **decisão do dono — mas a lei já responde** (Bloco K) |
| **G5** roteiro sem API | 🟡 pré-requisito do G4 |
| **G7 + G9** inspeção inexistente e sem gate de qualidade | 🟡 **decisão do dono** |
| **G11** alçada de compra | 🟡 **decisão do dono** (falta ticket médio) |
| **G13** momento de AP/AR | 🟡 **decisão do dono — a norma contábil já responde** |
| **G17** venda não gera produção; MRP não lê carteira | 🟡 **decisão do dono** |

---

## 3.1. 🔴 O achado mais importante da noite — e ele não estava nos 17 gaps

**O schema físico do banco não correspondia ao que a aplicação escreve.**
Dois agentes independentes (teste ponta a ponta contra a API no ar, e auditoria
cruzada banco × docs × código) chegaram ao **mesmo diagnóstico sem se falarem**.

Era **impossível**, contra o banco real — todos 500:
- criar estrutura de produto (BOM) · criar cliente · criar venda ·
  confirmar venda · criar contagem de inventário · **ajustar estoque**
  (o que derrubava **todo o app mobile**)

**Prova de que nunca funcionou:** as únicas 4 linhas de `clients` eram resíduo de
teste inserido por SQL direto, e entre 35 movimentações de estoque **nenhuma**
tinha `reference_type='adjustment'`.

**Efeito colateral cruel:** como o `5ec0651` (G2) passou a exigir BOM ativa para
concluir OP, e criar BOM era impossível, a cadeia ficou **fechada em circuito**.
A correção estava certa — ela expôs o defeito de baixo.

### Resolvido em `94e0f14` (S-1)
38 colunas afrouxadas em 7 tabelas, models alinhados (`allowNull` explícito em
todas as 128 colunas, batendo 1:1 com o `information_schema`), resíduo limpo, e
**provado via API real**: BOM 201, cliente 201, venda 201 com parcelas, contagem
201, e o **primeiro `reference_type='adjustment'` da história deste banco**.

Um bug de código que a auditoria não viu foi descoberto no caminho: `ClientEntity`
normalizava campo ausente para `null` e o use case repassava esse **NULL explícito**
para colunas `NOT NULL DEFAULT ''` — e **NULL explícito anula o DEFAULT do Postgres**.

### ⚠️ Ainda em aberto desta frente
1. **12 FKs `ON DELETE SET NULL` sobre colunas `NOT NULL`** em `employees`,
   `service_orders`, `assets`, `maintenance_orders` — provavelmente a mesma bomba.
   As 4 tabelas estão com **0 linhas**, o que reforça a suspeita. Precisam de
   migration e prova próprias.
2. **Drift de schema entre bancos** — `erp_evok_audio_test` tem 29 colunas
   `NOT NULL` a mais que o de dev, **com as mesmas migrations**. Nenhum dos dois é
   reproduzível a partir das migrations. 🚨 **Isso bloqueia provisionar o servidor
   de produção.** Recomendação: recriar o banco de teste só por migrations + criar
   teste-guarda comparando `information_schema` × models.
3. **Toda RNC fechada fica sem data** — `UpdateNonConformityUseCase` grava
   `closed_at`, coluna que **não existe** (a real é `closed_date`); o Sequelize
   engole em silêncio.
4. **28 ações nunca gravam log de auditoria** — `enum_audit_logs_action` tem 15
   valores e o código usa 43 literais. A API responde 200 e o registro some.
5. **S-2**: `inventoryService.ts` usa fallback `'reservation'`/`'reservation_release'`,
   valores que não existem no enum (nenhum chamador vivo atinge, mas é bomba armada).
6. **S-5**: `docs/database/schema.sql` e `03-MODELO_FISICO.md` precisam de
   `pg_dump --schema-only` novo agora que o S-1 foi aplicado.

Relatórios: `docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md` e
`docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

---

### Os 6 que quebram a corrente (diagnóstico original)

| ID | Gap | Etapa |
|---|---|---|
| **G2** | Ordem de produção conclui sem estrutura ativa (erro engolido): nada é consumido, nenhum lote baixado, produto entra em estoque com **custo zero** — contamina o custo médio. | Produção |
| **G3** | Reserva de estoque é contador global no produto, **não vinculada à OP** — uma ordem consome/libera a reserva de outra (canibalização). | Produção |
| **G1** | **Duas estruturas de produto (BOM) paralelas** sem sincronização: MRP planeja por `item_estruturas`, produção consome por `bill_of_materials`. Ligadas só por casamento de string de código. | Cadastro |
| **G9** | **Nenhum gate impede vender/expedir sem qualidade aprovada.** Única exigência de expedição é NF-e autorizada. | Qualidade |
| **G11** | Aprovação de requisição e de pedido de compra no **mesmo nível de quem cria**, sem alçada por valor. Aprovar o pedido já gera a conta a pagar. | Suprimentos |
| **G7** | **Inspeção de qualidade não existe como entidade.** Liberar lote da quarentena é um clique com observação livre — sem critério, amostragem ou resultado registrados. | Qualidade |

### Os demais

`G4` conclui OP sem apontamento → mão de obra R$ 0,00 · `G12` cotação e
requisição geram pedido em duplicidade · `G13` AP antes da mercadoria, AR antes
da NF-e, venda à vista nasce "paga" sem baixa · `G14` importação entra sem lote,
sem quarentena e sem AP · `G8` teste acústico não bloqueia nada · `G10` NC sem
lote informado não bloqueia · `G16` OP via MRP não valida material nem tipo ·
`G17` venda não gera produção; MRP não lê carteira nem estoque mínimo ·
`G5` roteiro de fabricação não tem API (não dá para cadastrar) · `G6` início da
produção não valida nada · `G15` campos e status sem uso.

---

## 4. Bloco 6 — RH (em execução)

**Design commitado** em `60e1362`:
- `docs/business/BLOCO_6_RH_REQUISITOS.md` — 81 RF (19 P0 / 49 P1 / 8 P2), UC-67 a UC-71
- `docs/business/BLOCO_6_RH_MODELO_DADOS.md` — 20 tabelas `hr_*`, 5 triggers de imutabilidade legal
- `docs/business/BLOCO_6_RH_API.md` — ~77 endpoints em `/api/rh/*`
- `docs/business/BLOCO_6_RH_AUDITORIA.md` — 15 achados (8 corrigidos, 4 escalados, 3 informativos)
- Migrations `20260808-000010` a `000025` — **commitadas, NÃO aplicadas ao banco**

**Folha de pagamento e ponto = comprar/integrar, não desenvolver** (decisão do dono).
Só a fronteira de integração foi especificada.

### 3 regras de negócio decididas pelo dono nesta sessão

1. **Dado sensível** — `rh:approve` fica só para ações de alto impacto. Ver **CID**
   exige módulo `rh` **E** `sst`; ver **salário individual** da folha exige `rh`
   **E** `financeiro`. Sem a interseção, o campo é omitido do retorno (sanitização
   por campo, mecanismo já existente em `employeeSensitiveFields.ts`), não 403 na rota.
2. **Treinamento normativo** — **SST é fonte única** para curso de NR. O RH delega
   a checagem de apto/inapto ao blocklist do SST via adapter; `hr_employee_trainings`
   é espelho de leitura para normativo e fonte primária só do treinamento corporativo.
3. **Demissão** — processo formal **obrigatório**: `DELETE /api/employees/:id` fica
   bloqueado quando existir `TerminationProcess`, garantindo ASO demissional,
   devolução de ativos e prazo legal de verbas.

Mais uma correção obrigatória (não é decisão): `'pcd'` entra em
`SENSITIVE_EMPLOYEE_FIELDS` — sem isso a condição de PCD ficaria visível a
qualquer usuário autenticado, porque `GET /api/employees` não passa pelo gate `rh`.

### Status da implementação
**Passada 1 ENTREGUE** (`9b169a7`): 34 de ~77 endpoints, os 19 RF P0 fechados —
férias, contrato de experiência, admissão, demissão e documentos.
Migrations **aplicadas**. Telas ainda não existem.

**Passada 2 pendente**: benefícios, treinamentos, recrutamento, avaliação,
importação de folha/ponto, KPIs (~43 endpoints), gatilho de afastamentos,
histórico de cargo no `PUT /api/employees/:id`, e as telas em `client/`.

#### 4 bugs encontrados no RH que passavam por typecheck e por 1400 testes
1. **`export =` + outro `export`** derrubava o servidor em runtime (achado C acima).
2. **Aviso prévio 3 dias menor que a lei**: `floor(dias/365,25)` dava 9 anos para
   exatamente 10 de casa → 57 em vez de 60 dias (Lei 12.506/2011).
3. **`calculateConcessiveEnd` violaria CHECK do Postgres em 29/02** (JS transborda
   para 01/03; Postgres satura em 28/02).
4. **Contrato `prorrogado` nunca vencia sozinho** — a verificação só olhava
   `'ativo'`, deixando de fora justamente o cenário do Art. 451.

#### Divergências lei × requisito
- **CORRIGIDA**: a vedação de início de férias antes de feriado/DSR é o
  **Art. 134 §3º**, não §2º — o §2º foi **revogado** pela Lei 13.467/2017.
  Requisitos, contrato de API e código diziam §2º.
- **EM ABERTO, precisa do dono**: **Art. 135 caput** fixa 30 dias como mínimo
  **obrigatório** do aviso de férias; RF-RH-037 manda aceitar menos com
  justificativa. Seguiu-se o requisito, mas o aviso passou a citar o
  descumprimento. **Bloquear é uma linha** — falta a decisão.
- **Gap**: feriados não são verificáveis (não existe calendário de feriados no ERP).

`server/tests/unit/rh-validators.test.ts` **lê as migrations** e compara literal a
literal com cada `z.enum` (14 pares) — a classe de bug de enum não passa silenciosa
neste módulo. Achou 2 literais errados na documentação.

---

## 5. Fila de próximos passos (retomar exatamente daqui)

0. **[PRIORIDADE — nasceu esta noite]** Fechar as 6 pendências da seção 3.1.
   As duas mais urgentes: as **12 FKs contraditórias** nos 4 módulos ainda não
   validados, e o **drift de schema entre bancos**, que bloqueia o servidor de
   produção. Um teste-guarda `information_schema` × models impede a reincidência
   de toda essa classe de defeito.

1. **[PENDENTE — decisão do dono]** Validar as 6 decisões de processo.
   Artefato pronto: <https://claude.ai/code/artifact/34b933ad-33a6-4ec1-b5a5-ea8e9cc20804>
   Documento completo: `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`.
   **3 têm resposta legal** (apontamento/Bloco K, baixa de estoque/NF-e, AP-AR/CPC);
   as outras 3 têm recomendação de boa prática pronta.
2. **[PENDENTE — bloqueado por 1]** Onda 3 dos gaps: G1, G4, G5, G7, G9, G11, G13, G17.
   Ordem de execução e dependências no anexo da pesquisa normativa.
3. **[PENDENTE]** RH passada 2 + telas do RH.
4. **[PENDENTE]** Telas: aba de Atos Societários e alçada de contrato do Jurídico
   já existem; falta expor **reserva por OP** (`listOrderReservations` existe no
   serviço, sem rota HTTP) e a tela de **Importação/COMEX**.
5. **[PENDENTE]** Teste de integração real (Postgres) das features de maior risco —
   os unitários usam repositório mockado e não pegam erro de enum/constraint.
6. **[PENDENTE]** Polimento visual (`webdesiner`) de Jurídico e Facilities.

### Perguntas que travam trabalho
Consolidadas no artefato de decisões. As mais bloqueantes:
- **D6** — qual das duas estruturas de produto a equipe **realmente mantém** hoje?
  (pode inverter qual sobrevive na unificação do G1)
- **D15/D16** — ticket médio dos pedidos de compra e quem pode aprovar
  (sem isso, qualquer faixa de alçada é chute; as faixas do Jurídico **não servem**)
- **C1/C4** — CNAE escriturado e se a empresa mantém o Livro modelo 3
  (confirmam o enquadramento no Bloco K, que sustenta o G4)
- **D13** — janela entre confirmar pedido e faturar (dimensiona o risco do G9)

---

## 6. Como subir o ambiente em outra máquina

```bash
git pull

# .env do server precisa existir (não é versionado)
# Postgres + API
docker compose up -d --build

# Frontend
cd client && npm run dev      # http://localhost:5173
```

Conferir migrations antes de qualquer coisa:
```bash
cd server && npm run migration:status
```

### Armadilhas conhecidas deste projeto
- **Nunca** rodar `migration:up` cru — usar `server/scripts/apply-pending-migrations.cjs`.
- Após `git pull` que toque `server/`, rodar `docker compose up -d --build`
  (senão a imagem da API fica com código velho).
- `comment:` dentro de `addColumn` corrompe o SQL quando o texto tem parênteses —
  usar `COMMENT ON COLUMN` explícito.
- Critério de aceite de frontend é `npm run build`, não `npx tsc --noEmit`.
- Literal de enum em query/escrita: conferir contra a migration da coluna.
- A senha do admin no `.env` local **não** confere com a do banco (incidente
  anterior) — login por API precisa de credencial válida real.
