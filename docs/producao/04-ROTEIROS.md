# Roteiros de Fabricação - EVOK ÁUDIO

## O que é um Roteiro de Fabricação?

Documento que descreve **passo a passo** como fabricar um auto-falante, incluindo:
- Sequência de operações
- Máquinas utilizadas
- Tempos (setup + ciclo)
- Insumos e componentes
- Parâmetros de processo
- Controles de qualidade

## Roteiro Padrão: Auto-falante 12" 300W

| OP | Operação | Departamento | Máquina | Setup (min) | Ciclo (min) | Qtd Oper. |
|----|----------|-------------|---------|-------------|-------------|-----------|
| 10 | Injetar Cone 12" | PROD | Injetora Hidráulica 80t | 30 | 0,6 | 1 |
| 20 | Prensar Surround 12" | PROD | Prensa Surround Pneumática | 15 | 0,4 | 1 |
| 30 | Prensar Spider 12" | PROD | Prensa Spider | 10 | 0,5 | 1 |
| 40 | Bobinar Voice Coil 12" | PROD | Bobinadeira Automática | 20 | 0,3 | 1 |
| 50 | Colar Cone + VC + Spider | PROD | Mesa Colagem Manual | 5 | 0,8 | 1 |
| 60 | Centralizar Gap | PROD | Centralizadora | 10 | 0,7 | 1 |
| 70 | Montar Conjunto Magnético | PROD | Mesa Montagem | 10 | 0,5 | 1 |
| 80 | Magnetizar | PROD | Magnetizadora Pulsada | 5 | 0,3 | 1 |
| 90 | Montagem Final (MC+CM+Basket) | PROD | Esteira Montagem | 5 | 1,2 | 3 |
| 100 | Soldar Terminais | PROD | Solda Ultrassônica | 5 | 0,4 | 1 |
| 110 | Teste Elétrico | QUAL | LMS / Medidor Impedância | 5 | 0,5 | 1 |
| 120 | Teste Acústico | QUAL | Câmara Acústica | 5 | 1,0 | 1 |
| 130 | Inspeção Visual | QUAL | Banca Inspeção | 0 | 0,3 | 1 |
| 140 | Embalar | EXP | Mesa Embalagem | 5 | 0,5 | 2 |
| 150 | Paletizar | EXP | Paletizadora Manual | 10 | 1,5 | 1 |

## Roteiro Específico por Modelo

### Modelo: EVOK-12-300

| OP | Descrição | Tempo Total (min) | Custo Oper. (R$) |
|----|-----------|-------------------|------------------|
| 10 | Injetar Cone | 0,63 | 0,52 |
| 20 | Prensar Surround | 0,42 | 0,35 |
| 30 | Prensar Spider | 0,52 | 0,38 |
| 40 | Bobinar VC | 0,32 | 0,45 |
| 50 | Colagem | 0,82 | 0,68 |
| 60 | Centralizar | 0,72 | 0,55 |
| 70 | Montagem Magnética | 0,52 | 0,42 |
| 80 | Magnetizar | 0,32 | 0,30 |
| 90 | Montagem Final | 1,25 | 1,05 |
| 100 | Soldar | 0,42 | 0,35 |
| 110 | Teste Elétrico | 0,52 | 0,48 |
| 120 | Teste Acústico | 1,02 | 1,20 |
| 130 | Inspeção Visual | 0,30 | 0,25 |
| 140 | Embalar | 0,52 | 0,40 |
| 150 | Paletizar | 1,52 | 0,38 |
| **Total** | | **9,80 min** | **R$ 7,76** |

### Modelo: EVOK-15-500

| OP | Tempo Total (min) | Custo Oper. (R$) |
|----|-------------------|------------------|
| 10-150 | (similar, com tempos maiores) | |
| **Total** | **14,20 min** | **R$ 11,50** |

## Parâmetros de Processo por Operação

### Injeção de Cone

| Parâmetro | Cone Papel | Cone Polipropileno |
|-----------|------------|-------------------|
| Temperatura zona 1 | 180°C | 220°C |
| Temperatura zona 2 | 185°C | 225°C |
| Temperatura zona 3 | 190°C | 230°C |
| Pressão de injeção | 80 bar | 100 bar |
| Pressão de recalque | 50 bar | 65 bar |
| Tempo de injeção | 3s | 4s |
| Tempo de resfriamento | 25s | 30s |
| Temperatura do molde | 60°C | 70°C |

### Bobinagem (Voice Coil)

| Parâmetro | Valor |
|-----------|-------|
| Tensão do fio | 30 gf |
| Velocidade de bobinagem | 400 rpm |
| Camadas | 2 |
| Espessura do former | 0,2 mm |
| Temperatura cura cola | 150°C |
| Tempo de cura | 60 min |

### Colagem

| Parâmetro | Cone-VC | Spider-Cone | Magnético |
|-----------|---------|-------------|-----------|
| Tipo de cola | Epóxi | Cianoacrilato | Epóxi |
| Gramatura | 3g | 1g | 5g |
| Temperatura de aplicação | 25°C | 25°C | 30°C |
| Tempo de cura | 24h | 2h | 24h |
| Força de aperto | 2 kgf | 1 kgf | 5 kgf |

## Roteiro no sistema (API) — implementado em 2026-08-10 (gap G5)

Até 2026-08-10 as tabelas `production_routes` / `production_route_steps`
existiam e já eram **lidas** pelo sistema (custeio de mão de obra na conclusão
da OP, carga-máquina por centro de trabalho, OEE), mas **não havia nenhuma
tela nem endpoint para cadastrá-las** — só script. Ou seja: era impossível ao
PCP registrar o roteiro que gera o custo. Isso foi fechado com a API
`/api/production/routes` (contrato completo em `docs/arquitetura/API.md` §33).

### Quem faz o quê

| Papel | Permissão | Pode |
|---|---|---|
| PCP / Engenharia de Processo | `producao` nível `operate` | criar rascunho, editar cabeçalho e etapas, criar nova revisão, excluir rascunho |
| Gerência de Produção | `producao` nível `approve` | **liberar** (`activate`) e **aposentar** (`inactivate`) o roteiro |

Liberar roteiro é ato de aprovação, não de digitação — por isso grava
`approved_by`/`approved_at` (sempre do usuário logado, nunca do payload).

### Ciclo de vida — e por que o roteiro liberado não muda

```
rascunho (draft) ──liberar──> ativo (active) ──(nova revisão liberada)──> substituído (superseded)
                                  │
                                  └──aposentar──> inativo (inactive) ──liberar──> ativo
```

Um roteiro **ativo é congelado**. Quem precisa mudar o processo (trocar o
adesivo da bobina, mudar a operação de centro de trabalho) **cria uma nova
revisão** (`POST /api/production/routes/:id/revise`), edita o rascunho e libera.
A revisão anterior vira `superseded` com **todas as etapas intactas**.

**Consequência prática — o que acontece com as OPs já abertas:** nada. Elas não
são afetadas, porque as etapas antigas continuam existindo e os apontamentos já
feitos continuam apontando para elas (é disso que sai o custo de mão de obra
daquela OP). O que muda é o que a fábrica passa a executar dali para frente.

⚠️ **Limitação estrutural (decisão de negócio em aberto):** não existe coluna
que amarre uma OP a uma revisão específica de roteiro. Relatórios derivados
(carga-máquina) usam sempre a revisão **ativa no momento da consulta**. Amarrar
a OP à revisão vigente na liberação é decisão do dono do produto — registrada em
`docs/governance/TODO.md`.

> **Mitigação parcial entregue no G4 (2026-08-10), sem migration.** Ao liberar
> a OP, cada etapa do roteiro ativo vira uma linha de
> `production_order_tracking` **já carregando o `production_route_step_id`
> daquela revisão**. Como roteiro ativo é imutável e a revisão substituída fica
> `superseded` com as etapas intactas, o processo **como executado** passa a ser
> reconstituível a partir dos próprios apontamentos.
> **O que a mitigação NÃO cobre:** OP liberada quando o produto ainda não tinha
> roteiro ativo, e apontamento criado à mão sem `production_route_step_id`.
> Cobrir 100% dos casos continua exigindo a coluna em `production_orders`.

Só pode existir **um roteiro ativo por produto** (garantido em transação e por
índice único parcial no banco, migration `20260810-000034`).

### Numeração das operações: `sequence` × `step_code`

As tabelas deste documento numeram as operações de 10 em 10 (`OP 10`, `OP 20`,
`OP 30`...), prática de chão de fábrica que deixa espaço para inserir etapa no
meio. O sistema separa as duas coisas:

| Campo | O que é | Regra |
|---|---|---|
| `sequence` | **ordinal** da etapa no roteiro | obrigatoriamente **1..N contígua**, sem buraco e sem repetição |
| `step_code` | **código da operação** como o chão de fábrica a conhece | texto livre (até 50 caracteres), único dentro do roteiro |

Ou seja, a operação "OP 20 — Prensar Surround" é gravada como
`sequence: 2`, `step_code: "20"` (ou `"PRENSA-SUR"`). O `sequence` contíguo é
exigência do sistema porque é por ele que o apontamento
(`production_order_tracking.sequence`) casa com a etapa, sem tabela de-para.
Inserir uma operação no meio implica renumerar o `sequence` — o que só é
possível em rascunho, e é exatamente o motivo de existir o fluxo de revisão.

### Tempos

| Campo | Unidade | Entra em |
|---|---|---|
| `standard_time_minutes` | minutos **por unidade** | `total_standard_time_minutes` do roteiro, tempo padrão do OEE |
| `setup_time_minutes` | minutos **por lote** | carga-máquina (uma vez por etapa) — **não** entra no tempo padrão total |

Essa separação é deliberada: somar setup (por lote) ao tempo padrão (por
unidade) distorceria o OEE. O detalhe está em
`server/src/modules/production/domain/productionRouteRules.ts`.

### Vínculo com centro de trabalho

`work_center_id` é **opcional**, mas quando informado precisa apontar para um
centro **existente e ativo** — verificado tanto ao gravar o rascunho quanto **de
novo na liberação** (um centro pode ser desativado no meio do caminho, e roteiro
ativo apontando para centro morto zera o custo de mão de obra sem avisar).
Etapa sem `work_center_id` é válida: ela apenas não entra na carga-máquina nem
no custeio por hora-máquina.

### Por que isto foi feito agora

É **pré-requisito** do apontamento de produção obrigatório (gap G4 — Bloco K do
SPED Fiscal, Ajuste SINIEF 2/09 cláusula 3ª §7º III/§10; ver
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4).
Exigir apontamento sem poder cadastrar roteiro seria regra inexequível: o
operador não teria contra o que apontar.

---

## Apontamento obrigatório para concluir a OP — gap G4 (2026-08-10)

> **É LEI, não escolha de processo.** Ajuste SINIEF 2/09, cláusula 3ª §7º III
> (redação do Ajuste SINIEF 46/22): Bloco K desde **01/01/2019** para os demais
> estabelecimentos industriais das divisões 10 a 32 — alto-falante é CNAE
> **2640-0/00**, divisão 26. O **§10** é o dispositivo decisivo: *só* a
> escrituração completa desobriga o **Livro Registro de Controle da Produção e
> do Estoque (modelo 3)**, que exige consumo e produção **por ordem de
> produção**. O **§13** deixa explícito que a escrituração simplificada da Lei
> 13.874/2019 dispensa *transmitir*, e não *registrar*: o dado tem de existir no
> ERP de qualquer forma.
>
> Em paralelo, o RIR/2018 condiciona a avaliação do estoque pelo custo real à
> manutenção de **custo integrado e coordenado com a escrituração**. Produto
> acabado valorizado com mão de obra R$ 0,00 não é custo real — é custo
> incompleto, e a alternativa legal é o arbitramento.
>
> Fonte, artigos e as ressalvas `[NÃO CONFIRMADO NA FONTE]` (número do artigo
> do RIR/2018, alcance do Ajuste SINIEF 31/24, CNAE efetivamente escriturado):
> `docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md`, Decisão 4.
> **Essas ressalvas continuam pendentes de confirmação pelo contador** e não
> foram tratadas aqui como norma.

### O que mudou na prática

| Antes (até 2026-08-09) | Depois (G4) |
|---|---|
| OP sem nenhum apontamento concluía normalmente | conclusão bloqueada (`G4-TRACKING-REQUIRED`) |
| todas as etapas `skipped` = sem produção apontada, e concluía | bloqueada (`G4-TRACKING-NO-COMPLETED`) |
| etapa concluída sem `started_at`/`finished_at` era **pulada em silêncio** no custeio | bloqueada (`G4-TRACKING-TIME-MISSING`) |
| sem taxa horária, o custo de mão de obra saía **zero sem erro** | bloqueada (`G4-LABOR-RATE-MISSING`) |
| operador tinha de criar cada etapa de apontamento à mão | liberar a OP **materializa** as etapas do roteiro ativo |

### O fluxo completo no chão de fábrica

```
1. Engenharia/PCP cadastra o roteiro          Produção > Roteiros de Fabricação
   (etapa -> centro de trabalho COM custo/hora)
2. Gerência libera o roteiro (active)
3. PCP cria a OP e LIBERA
   └─> o sistema cria uma linha de apontamento `pending` por etapa ativa
4. Chão de fábrica inicia e conclui cada etapa Produção > Chão de Fábrica
   └─> `started_at`, `finished_at`, `quantity_good`, `quantity_scrapped`
5. PCP conclui a OP
   └─> consumo por lote + entrada do acabado + custo real (material + MO + overhead)
```

Sem roteiro ativo o fluxo continua possível: as etapas são criadas manualmente
em Chão de Fábrica. A liberação **nunca** é travada por falta de roteiro — parar
a fábrica por um cadastro que ainda dá tempo de fazer seria pior que o problema.

### Pré-requisito de configuração que trava tudo se for esquecido

O custo de mão de obra sai de **horas apontadas × taxa horária**. A taxa é
resolvida nesta ordem:

1. `work_centers.cost_per_hour` do centro da etapa de roteiro;
2. na ausência do centro, `production_cost_settings.default_labor_rate_per_hour`.

Se **nenhuma das duas** for positiva, a conclusão falha com
`G4-LABOR-RATE-MISSING`. Estado verificado no banco de dev em 2026-08-10: os
dois valores estavam **zerados**, e o único centro cadastrado (`MONTAGEM`)
tinha `cost_per_hour = 0`.

- ✅ `cost_per_hour` passou a ser configurável em `POST`/`PUT /api/work-centers`
  (entregue junto com o G4 — antes só existia por SQL direto).
- ⚠️ `default_labor_rate_per_hour` **continua sem API**. Etapa de apontamento
  sem centro de trabalho depende dele. Registrado em `docs/governance/TODO.md`.

### Janela de transição

`PRODUCTION_TRACKING_REQUIRED=warn` registra a pendência em log estruturado e
deixa concluir, para não travar o chão de fábrica no dia 1. Nesse modo a
liberação **não** materializa etapas — materializar sem bloquear só criaria
etapas pendentes que a regra de "etapa em aberto" barraria assim mesmo.

Ausente ou com valor inválido, o modo é `block`: a lei vale por padrão, e um
typo (`blok`, `false`) nunca desliga a regra em silêncio — cai em `block` e loga
`G4-TRACKING-MODE-INVALID`.

**`warn` é temporário por desenho e precisa estar desligado no Go-Live.**

### Duas regras que valem sempre, independentemente do modo

`G4-TRACKING-STEP-OPEN` (etapa em aberto) e `G4-TRACKING-QTY-EXCEEDS`
(`quantity_produced` acima do apontado na última etapa) são anteriores ao G4 —
vieram da reconciliação apontamento × OP (bloqueador 1.3) — e por isso não fazem
parte da janela de transição.

Contrato de erro completo: `docs/arquitetura/API.md` §10.
Regras puras: `server/src/modules/production/domain/productionTrackingRules.ts`.

---

## Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL** — este ERP
> roda **exclusivamente em PostgreSQL 16**. Confronto contra `erp_evok_audio`
> nesta data:
>
> - `process_parameters` e `operation_consumables` **não existem**. As rotas
>   reais são `production_routes` + `production_route_steps` (com
>   `standard_time_minutes`, `setup_time_minutes`, `quality_check_required`,
>   `work_center_id`); não há tabela de parâmetros de processo nem de
>   consumíveis por operação.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- ROTEIROS DETALHADOS (expansão do manufacturing_routes)
ALTER TABLE manufacturing_routes ADD COLUMN (
    setup_time INT DEFAULT 0,           -- minutos
    cycle_time INT DEFAULT 0,           -- minutos
    labor_time INT DEFAULT 0,           -- minutos de mão de obra
    labor_count INT DEFAULT 1,          -- quantidade de operadores
    machine_code VARCHAR(50),
    tool_code VARCHAR(50),              -- molde/gabarito
    parameters JSON,                    -- parâmetros de processo
    quality_check VARCHAR(255),         -- controle de qualidade na operação
    consumables TEXT                    -- insumos consumidos (cola, etc)
);

-- PARÂMETROS DE PROCESSO POR PRODUTO E OPERAÇÃO
CREATE TABLE process_parameters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    parameter_value VARCHAR(100),
    min_value VARCHAR(50),
    max_value VARCHAR(50),
    unit VARCHAR(20),
    created_at DATETIME,
    updated_at DATETIME
);

-- INSUMOS POR OPERAÇÃO
CREATE TABLE operation_consumables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    almox_item_id INT NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,        -- quantidade por unidade
    unit VARCHAR(10),
    created_at DATETIME
);
```

## Matriz de Qualificação de Operadores

| Operador | Injetora | Bobinadeira | Colagem | Montagem | Solda | Testes |
|----------|----------|-------------|---------|----------|-------|--------|
| João S. | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Maria C. | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pedro A. | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ana L. | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
