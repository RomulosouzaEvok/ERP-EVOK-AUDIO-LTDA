# BLOCO 4 (CORREÇÃO) — Módulo Facilities (FAC) — Auditoria Cruzada Requisitos × Banco × API

**Departamento:** 17 — Facilities.
**Autor:** `AuditorIntegrador`.
**Data:** 2026-08-07.
**Escopo:** gate de qualidade pré-código do bloco de correção do módulo
Facilities (60 RF-FAC, UC-58 a UC-62), confrontando
`docs/business/BLOCO_4_FAC_REQUISITOS.md`,
`docs/business/BLOCO_4_FAC_MODELO_DADOS.md` (11 migrations,
`server/migrations/20260807-000290` a `000300`, **não aplicadas**) e
`docs/business/BLOCO_4_FAC_API.md` (60 endpoints, 9 grupos). Contexto:
`docs/business/BLOCO_4_FAC_VERIFICACAO.md` (14/17 regras do brief
`NÃO ATENDIDA`s na primeira entrega, motivo desta correção) e código real
em `server/src/modules/facilities/`, `server/src/modules/maintenance/`,
`server/src/models/Asset.ts`/`MaintenanceOrder.ts`.

**Método:** leitura linha a linha das 11 migrations (`node -c` em todas),
comparação campo a campo Requisito↔Modelo de Dados↔Contrato de API,
verificação cruzada contra código real existente (models Sequelize,
use cases, middleware de RBAC) para confirmar precedentes citados pelos
dois documentos de design.

---

## Veredito: **[APROVADO COM RESSALVAS]**

O núcleo da correção (migração D-2 de `facility_vehicles` para extensão de
`Asset`, decisão D-1 de estender `maintenance_orders`, integridade de
odômetro, prazo legal de multa) está coerente nas 3 camadas depois das
correções aplicadas nesta auditoria. Havia 8 inconsistências reais de
nomenclatura/schema entre o Modelo de Dados/migrations e o Contrato de API
(um padrão já visto no Bloco 3), todas corrigidas diretamente nos artefatos
(ver secao 2). Um gap de contagem interno em `BLOCO_4_FAC_REQUISITOS.md`
tambem foi corrigido (secao 4). Ressalvas residuais que nao bloqueiam a
modelagem, mas exigem atencao do `programador`, estao listadas na secao 5.

---

## 1. Rastreabilidade verificada (RF-FAC -> Tabela(s) -> Endpoint(s))

Verificacao completa das 60 RF-FAC (nao amostral) contra
`BLOCO_4_FAC_MODELO_DADOS.md` secao 13 e `BLOCO_4_FAC_API.md` secoes 2-10.

| Grupo de RF-FAC | Tabela(s) | Endpoint(s) | Status |
|---|---|---|---|
| 001-006, 038 (Frota/D-2) | assets (ext.) + facility_vehicle_details | GET/POST/PUT /vehicles, GET /vehicles/:id | OK |
| 007-010 (Documento veiculo) | facility_vehicle_documents | GET/POST /vehicles/:id/documents, .../renew, .../release | OK |
| 011-015 (Condutor) | facility_drivers | /drivers (6 rotas) | OK |
| 016-021 (Diario de uso) | facility_vehicle_trips | /trips (6 rotas) | OK |
| 022-027 (Abastecimento) | facility_fuel_records (+ facility_vehicle_details) | /fuel-records (4 rotas) | OK - trip_id corrigido nesta auditoria (2.7) |
| 028-035 (Multa) | facility_fines | /fines (8 rotas) | OK |
| 036-038 (Preventiva por km) | maintenance_orders.next_maintenance_km | reaproveita /maintenance-tickets | OK |
| 039-043 (Chamado predial) | maintenance_orders (ext. facility_specialty/facility_area_id) | /maintenance-tickets (7 rotas) | OK - caminho real do model confirmado (2.8) |
| 044-047 (Visitante/Visita) | facility_visitors/facility_visits | /visitors, /visits (7 rotas) | OK |
| 048 (Correspondencia) | facility_correspondence | /correspondences (3 rotas) | OK - nome de tabela corrigido nesta auditoria (2.1) |
| 049, 050 (Limpeza plano x execucao) | facility_cleaning_schedules (ext.) + facility_cleaning_executions | /cleaning-schedules, /cleaning-executions (7 rotas) | OK - campo area_free_text corrigido para area (2.6) |
| 051, 052 (Insumos) | fora de escopo (D-3, reuso /api/inventory, /api/purchase-requisitions) | reuso, 0 endpoints novos | OK, documentado explicitamente nos 3 artefatos |
| 053 (Ficha EPI) | fora de escopo (SST) | N/A | OK, referencia cruzada consistente |
| 054-056 (Reserva de recursos) | facility_resource_reservations | /resource-reservations (4 rotas) | OK |
| 057 (RBAC approve) | accessModules.ts (codigo, nao migration) | niveis approve distribuidos na secao 0.2 da API | OK, pendencia de codigo corretamente sinalizada (nao e gap de doc) |
| 058 (Custo de frota -> AP) | facility_fines.accounts_payable_id + accounts_payable.category/cost_center_id (reutilizados) | POST /fines/:id/pay | OK - colunas category/cost_center_id confirmadas existentes em AccountPayable.ts |
| 059 (Sem exclusao fisica) | todas as tabelas novas | nenhuma rota DELETE no contrato | OK |
| 060 (Auditoria) | AuditLog (reutilizada) | mencao transversal na secao 1 da API | OK |

**60/60 RF-FAC com tabela e endpoint correspondentes, sem orfaos em
nenhuma das duas pontas**, depois das correcoes de nomenclatura abaixo.

---

## 2. Inconsistencias encontradas e corrigidas nesta auditoria

### 2.1 Nome de tabela: facility_correspondence (singular) vs. facility_correspondences (plural)
**Localizacao:** `server/migrations/20260807-000299-create-facility-correspondence.cjs`
(cria a tabela no singular) vs. `docs/business/BLOCO_4_FAC_API.md`,
secao "Convencao de nomes de tabela" e secao 13 (pendencia 1), que assumiam
o plural. Mesmo padrao de divergencia de prefixo ja visto no Bloco 3
(`docs/business/BLOCO_3_JUR_AUDITORIA.md`).
**Acao corretiva:** `BLOCO_4_FAC_API.md` corrigido para `facility_correspondence`
(singular), com nota explicita de reconciliacao; rota HTTP mantida no
plural (`/api/facilities/correspondences`, convencao REST de colecao - nao
precisa bater com o nome da tabela).
**Status:** [IMPLEMENTADO] (doc corrigido, migration ja estava certa).
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.2 Enum fuel_type divergente entre migration e contrato de API
**Localizacao:** `server/migrations/20260807-000290-...cjs` linha 93
(ENUM('gasoline', 'ethanol', 'diesel', 'flex', 'electric')) vs.
`docs/business/BLOCO_4_FAC_API.md` secao 2.3 (citava
flex/gasoline/diesel/electric/hybrid/other - omitindo ethanol,
relevante no mercado brasileiro/flex-fuel, e inventando hybrid/other
inexistentes no schema).
**Acao corretiva:** `BLOCO_4_FAC_API.md` corrigido para os 5 valores reais
do ENUM Postgres.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.3 Campo chassis (API) vs. coluna chassi (banco)
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secao 2.3 (payload de
exemplo de POST /vehicles) vs. `facility_vehicle_details.chassi`
(migration 000290, grafia em portugues sem "s" final).
**Acao corretiva:** payload de exemplo corrigido para `chassi`.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.4 Campos manufacture_year/model_year duplicados vs. coluna unica year
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secao 2.3 pedia dois
campos distintos no payload de criacao de veiculo; `facility_vehicle_details.year`
(migration 000290) e uma unica coluna, e o proprio Modelo de Dados
documenta a unificacao ("Ano de fabricacao/modelo, unificado - dado legado
tinha um unico valor", secao 2.2).
**Acao corretiva:** payload de exemplo reduzido a um unico campo `year`.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.5 Campo responsible_employee_id (API) vs. responsible_id (servico real de Asset)
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secao 2.3 vs.
`server/src/modules/assets/application/use-cases/CreateAssetUseCase.ts`
(interface CreateAssetInput.responsible_id) - o nome de campo inventado
pelo contrato nao existe no servico real que ele mesmo diz que vai chamar
(AssetService.create(...)).
**Acao corretiva:** payload de exemplo corrigido para `responsible_id`.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.6 Campo area_free_text (API) vs. coluna area (banco)
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secoes 9/9.1
(POST /cleaning-schedules) vs. `facility_cleaning_schedules.area`
(coluna ja existente desde a primeira entrega, mantida como fallback pela
migration 000297 - nunca renomeada para area_free_text).
**Acao corretiva:** payload de exemplo e descricao de rota corrigidos para
`area`.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.7 trip_id no payload de POST /fuel-records sem coluna correspondente
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secao 4.4 ja citava
`trip_id` no payload de abastecimento (vinculo opcional ao diario de uso em
andamento), mas nenhuma das 11 migrations criava essa coluna em
`facility_fuel_records` - API prometendo um campo que o banco nao
sustentava (achado direto do foco 2 desta auditoria).
**Acao corretiva:** adicionada a coluna `trip_id` (INTEGER nullable, FK ->
facility_vehicle_trips.id, ON DELETE SET NULL) a migration
`20260807-000294-add-full-tank-invoice-ref-to-facility-fuel-records.cjs`
(mesma migration que ja adicionava colunas a essa tabela - nao criada uma
migration nova para nao quebrar a numeracao sequencial). `node -c`
validado. `BLOCO_4_FAC_MODELO_DADOS.md` secao 5 e `BLOCO_4_FAC_API.md`
secao 4.4 atualizados com a mesma nota.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `AdmDBA` (schema incompleto).

### 2.8 Caminho de modulo do MaintenanceOrder nao confirmado
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secoes 0.3/13 assumia
`server/src/modules/manufacturing/` como "local provavel" do
model/use-cases de `maintenance_orders`, pedindo confirmacao explicita
antes da implementacao - o caminho real e `server/src/modules/maintenance/`
(CreateMaintenanceOrderUseCase.ts, SequelizeMaintenanceRepository.ts
etc.), confirmado por leitura direta do codigo. Ha inclusive precedente
direto de injecao de servico sobre o mesmo model a partir de outro modulo:
`server/src/modules/ti/application/services/MaintenanceOrderService.ts` +
`.../infrastructure/adapters/MaintenanceOrderServiceAdapter.ts`.
**Acao corretiva:** `BLOCO_4_FAC_API.md` secoes 0.3 e 13 corrigidas com o
caminho real e a referencia ao precedente de TI a ser replicado.
**Status:** [IMPLEMENTADO] (doc corrigido; codigo em si e tarefa do
programador, fora do escopo desta auditoria).
**Responsavel original:** `ArquitetoSoftwareAPI`.

### 2.9 authorizeModule OR authorizeModule - primitivo inexistente
**Localizacao:** `docs/business/BLOCO_4_FAC_API.md` secao 0.3 descrevia a
composicao OR de dois modulos de RBAC (`manutencao`/`facilities`) como se
fosse reuso de infraestrutura existente. `server/src/middlewares/auth.ts`
(authorizeModule, linha 213) so aceita UM moduleKey por chamada - nao ha
authorizeAnyModule([...]) nem precedente de composicao OR em nenhum outro
modulo do projeto (grep confirmado, zero ocorrencias).
**Acao corretiva:** `BLOCO_4_FAC_API.md` secao 0.3 corrigido para deixar
explicito que este e um middleware NOVO, a ser criado pelo `programador`,
nao reuso de primitivo existente.
**Status:** [IMPLEMENTADO] (doc corrigido - apontando pendencia real de
codigo, nao resolvida por esta auditoria).
**Responsavel original:** `ArquitetoSoftwareAPI` (implementacao: `programador`).

### 2.10 Contagem de prioridade RF incorreta em BLOCO_4_FAC_REQUISITOS.md
**Localizacao:** `docs/business/BLOCO_4_FAC_REQUISITOS.md` secao 0
(cabecalho) e secao 7 (Priorizacao Consolidada) declaravam "37 P0, 19 P1,
4 P2" - recontagem linha a linha da coluna "Prioridade" nas 12 subtabelas
da secao 1 resulta em **38 P0, 17 P1, 5 P2** (soma 60, batendo com o
total). Causa raiz: RF-FAC-042 esta marcado P0 na tabela de origem
(secao 1.8), mas o resumo narrativo da secao 7 o agrupava junto de
RF-FAC-043 (P1) e nao somava sua prioridade real ao total de P0.
**Acao corretiva:** `BLOCO_4_FAC_REQUISITOS.md` secoes 0 e 7 corrigidas com
os numeros reais e nota de reconciliacao explicando a causa raiz.
**Status:** [IMPLEMENTADO].
**Responsavel original:** `AnalistaNegocios`.

---

## 3. Migracao D-2 (20260807-000290) - avaliacao de risco especifica

Leitura linha a linha completa de up()/down().

**O que esta correto:**
- `assets.asset_type='vehicle'` e todos os 5 valores de `assets.status`
  usados (active/in_maintenance/decommissioned) ja existem no ENUM
  Postgres base (enum_assets_asset_type) - confirmado contra
  `server/src/models/Asset.ts` linha 22/50. Nenhum ALTER TYPE necessario,
  diferente do precedente de license (20260805-000002-...cjs).
- Nenhuma coluna NOT NULL de assets sem default e violada pelo INSERT da
  migration (tag, name, asset_type preenchidos; department_id,
  responsible_id, product_id, purchase_value etc. todos nullable) -
  confirmado contra o model.
- `tag='VEIC-<placa>'`: como plate ja e UNIQUE NOT NULL em
  facility_vehicles (migration 000200), a tag derivada tambem e unica;
  cabe em assets.tag VARCHAR(20) (VEIC- + ate 10 chars de placa = ate
  15 chars). Sem colisao possivel com tags manuais pre-existentes (modulo
  novo, nenhum veiculo cadastrado como Asset antes desta migracao).
- SELECT * de facility_vehicles (linha 123) e o INSERT em
  facility_vehicle_details (linhas 165-193) cobrem TODOS os 18 campos da
  tabela original (plate, brand, model, year, color, fuel_type, renavam,
  chassi, insurance_* (3), last_oil_change, next_oil_change_km,
  current_km, status, notes, created_at, updated_at) - confirmado campo a
  campo contra `20260807-000200-create-facilities-module.cjs` linhas
  70-97. Nenhum dado e descartado silenciosamente (RNF-FAC-03 cumprido no
  up()).
- DROP TYPE "enum_facility_vehicles_fuel_type"/"...status": nomes de enum
  confirmados identicos aos gerados pela migration original
  (queryInterface.createTable com Sequelize.ENUM(...) gera
  enum_<table>_<column> por convencao do dialeto Postgres do Sequelize) -
  confirmado por comparacao direta com o down() da propria migration
  000200, que usa exatamente os mesmos nomes.
- Migracao de facility_fuel_records.vehicle_id para asset_id: addColumn
  nullable -> backfill via mapa em memoria -> ALTER COLUMN ... SET NOT
  NULL -> removeIndex/removeColumn da coluna antiga -> addIndex da nova.
  Ordem correta (indice removido antes da coluna que ele indexa).
- Idempotencia: up() retorna cedo se facility_vehicles nao existe mais;
  blocos de createTable/addColumn sao condicionais a showAllTables()/
  describeTable().

**Riscos residuais (declarados no proprio Modelo de Dados, confirmados
por esta auditoria como reais e nao mitigaveis so por leitura de codigo):**
1. **Nao testada contra dados reais** - RNF-FAC-03 exige teste contra
   copia do banco antes de producao; ambiente de desenvolvimento atual
   nao tem facility_vehicles populada. Nenhuma migration de teste de
   carga/dado foi executada como parte desta auditoria (fora do escopo -
   e auditoria de documento, nao execucao de banco).
2. **down() nao distingue deactivated/sold depois de colapsados em
   decommissioned** - rollback e best-effort, documentado como tal nos 3
   artefatos de forma consistente. Aceitavel para reverter uma aplicacao
   recente, nao uma operacao de longo prazo.
3. **Transacao:** a migration NAO envolve todo o up() numa unica
   transacao Sequelize explicita (nao ha
   queryInterface.sequelize.transaction visivel) - cada INSERT/UPDATE/DDL
   roda como statement proprio. Para uma tabela com poucas linhas (frota
   administrativa, tipicamente <50 veiculos) o risco de estado
   intermediario orfao em caso de falha no meio do loop e baixo, mas nao
   e zero - uma falha na linha N do loop deixaria as linhas 1..N-1 ja
   migradas e a tabela original ainda nao dropada, exigindo
   reprocessamento manual (nao idempotente linha a linha: rodar de novo
   criaria assets duplicados para as linhas ja migradas, porque o loop
   nao verifica se aquela placa especifica ja tem um Asset). **Achado
   novo desta auditoria, nao estava declarado nos artefatos.**
4. **Nenhuma verificacao de unicidade de tag contra assets pre-existente**
   antes do INSERT - teoricamente inofensivo (modulo novo), mas se algum
   dado de teste/seed ja tiver criado um Asset com tag colidente com
   VEIC-<placa>, o INSERT falharia com SequelizeUniqueConstraintError nao
   tratado, interrompendo a migration no meio do loop (mesmo risco do
   item 3).

**Avaliacao de risco da D-2: MEDIO.** Correta em desenho e completa em
cobertura de campo, mas ainda nao exercitada contra dados reais e sem
protecao transacional/idempotencia por linha dentro do proprio up().
Recomendacao: antes de aplicar em qualquer ambiente com facility_vehicles
populada, envolver o loop de backfill (passo 2 do up()) em uma transacao
explicita por veiculo (ou uma transacao unica para a migration inteira) e
adicionar uma verificacao ON CONFLICT DO NOTHING/checagem de idempotencia
por plate antes do INSERT em assets. Isso e uma melhoria de robustez de
execucao, nao uma inconsistencia de documentacao - registrado como
pendencia real em docs/governance/TODO.md, nao corrigido diretamente
nesta auditoria por estar fora do foco de "documento vs. documento" (e
comportamento de execucao, mais proximo do escopo do auditor/programador).

---

## 4. Breaking changes - verificacao de aviso e plano de tela

`docs/business/BLOCO_4_FAC_API.md` secoes 2.1 e 12.1 sinalizam
explicitamente o breaking change de `id` do recurso vehicles (passa a ser
asset_id) e a secao 9 sinaliza o breaking change de RBAC de
cleaning-schedules (operate->approve). Confirmado que
`client/src/pages/facilities/FleetTab.tsx`, `FuelRecordsTab.tsx`,
`CleaningSchedulesTab.tsx` e `client/src/api/facilities.ts` existem e
serao os pontos de atualizacao - o proprio contrato ja declara que a tela
e atualizada "na mesma entrega" (RF-FAC-005 permite explicitamente essa
mudanca versionada). **Nenhuma divergencia entre os 3 artefatos quanto a
isso** - apenas registrado aqui como confirmacao de cobertura do foco 3 do
escopo desta auditoria, sem achado novo.

---

## 5. CHECK asset_id OU facility_area_id em maintenance_orders - verificacao de nao regressao

`server/src/modules/maintenance/application/use-cases/CreateMaintenanceOrderUseCase.ts`
(modulo MANUT existente, nao tocado por este bloco) ja rejeita
explicitamente com ValidationError qualquer criacao sem asset_id
(linha 35-37) - **mais restritivo** que o novo CHECK de banco
(asset_id IS NOT NULL OR facility_area_id IS NOT NULL). Ou seja, o
relaxamento de NOT NULL para facility_area_id opcional feito pela
migration 000296 nao quebra nenhum fluxo existente de MANUT, porque a
camada de aplicacao de MANUT ja e mais restrita do que o banco passa a
permitir - a unica forma de criar uma ordem so com facility_area_id sera
atraves de um use case novo do modulo facilities (ainda nao
implementado). **Confirmado sem regressao.**

**Achado residual (fora do escopo de correcao de doc, registrado como
pendencia de codigo):** `server/src/models/MaintenanceOrder.ts` linha 47
ainda declara `asset_id: { allowNull: false }` no nivel do model
Sequelize - depois da migration 000296 (ALTER COLUMN asset_id DROP NOT
NULL), o banco permite NULL, mas o model TypeScript continua exigindo o
campo. Isso nao quebra MANUT (que ja valida asset_id antes de chegar no
model), mas bloqueara silenciosamente qualquer tentativa do modulo
facilities de criar um chamado predial so com facility_area_id via esse
mesmo model, a menos que o programador atualize MaintenanceOrder.ts para
allowNull: true como parte da implementacao. Repassado a
docs/governance/TODO.md.

---

## 6. EXCLUDE USING gist / CREATE EXTENSION btree_gist - avaliacao de risco

Confirmado: `docker-compose.yml`/`docker-compose.prod.yml` usam a imagem
oficial postgres:16-alpine com `POSTGRES_USER: evok_admin` (ou
`${DB_ADMIN_USER}`) como bootstrap role do container - esse usuario
recebe privilegio de superusuario dentro do proprio Postgres gerenciado
pelo container, tanto em dev quanto no plano de producao documentado em
`docs/infra/DEPLOY_UBUNTU.md` (self-managed via Docker Compose em VPS, nao
um Postgres gerenciado tipo RDS/Cloud SQL). **Risco de permissao avaliado
como BAIXO** neste ambiente especifico - diferente do que o proprio
Modelo de Dados ja alertava de forma cautelosa (secao 10, "deve ser
confirmado antes de aplicar... onde o usuario da aplicacao nao seja
superuser"). Nenhuma mudanca feita - a migration ja traz o fallback
documentado corretamente (mover a checagem para validacao de aplicacao
com SELECT ... FOR UPDATE se CREATE EXTENSION falhar). Sem acao corretiva
necessaria; declarado aqui apenas como confirmacao, nao achado novo.

---

## 7. RBAC - nivel approve (RF-FAC-057) e chamado aberto a qualquer autenticado

- Confirmado: `authorizeModule()` (`server/src/middlewares/auth.ts`) e
  generico por moduleKey/requiredLevel, sem necessidade de alteracao de
  assinatura para suportar approve em facilities - ja usado por
  contabilidade/ti/sst/juridico com o mesmo padrao. A implementacao de
  RF-FAC-057 e so uso real do nivel nas rotas + remocao do comentario
  desatualizado em `accessModules.ts` (linhas 92-93, confirmado ainda
  presente: "todas as rotas usam authorizeModule('facilities',
  'operate')... nenhuma... approve"). Consistente entre Requisitos secao
  6.4, Modelo de Dados secao 12.3 e API secao 0 - os 3 artefatos
  concordam que e pendencia de codigo, nao de doc.
- Precedente de auto-servico "qualquer autenticado" para abertura de
  chamado (RF-FAC-040) citado no contrato como reuso do padrao de TI
  (authorizeSelfOrModule, Bloco 2) - confirmado que esse precedente
  existe e ja esta [IMPLEMENTADO] em TODO.md (entrada BLOCO 2 TI, linha
  3245). Consistente.

Nenhuma inconsistencia encontrada neste ponto entre os 3 artefatos.

---

## 8. Multas - prazo/estados/auto-transicao

`facility_fines.indication_status` (ENUM pending/indicated/expired_nic/
not_applicable) e `status` (ENUM open/paid/appealed/canceled) identicos
entre Requisitos secao 1.6, Modelo de Dados secao 6 e API secao 5.
`indication_deadline` e calculado em aplicacao (nao coluna gerada, porque
o prazo e parametrizavel) - consistente nos 3 artefatos. A transicao
automatica pending -> expired_nic e descrita de forma identica nos 3
documentos como "verificacao ao acessar o painel ou rotina agendada"
(RNF-FAC-02) - **nenhum dos 3 artefatos decide definitivamente entre job
agendado e checagem lazy-on-read**, o que e uma decisao de implementacao
em aberto, nao uma inconsistencia entre documentos (os 3 concordam em
deixar em aberto da mesma forma). Registrado como pendencia de
implementacao, nao de documentacao.

---

## 9. Riscos de seguranca/isolamento observados

Nenhum endpoint do contrato expoe coluna sensivel que a matriz de
privilegios trataria como restrita alem do ja decidido conscientemente
(dado pessoal de visitante mascarado em listagem, secao 8.2 da API,
document/phone truncados - RNF-FAC-04/LGPD). Nenhum servico externo com
acesso direto ao banco e introduzido por este bloco. RBAC de leitura
cruzada MANUT x FAC (secao 2.9 acima) e o unico ponto que precisa de
codigo novo (middleware OR) antes de poder ser considerado seguro - hoje
e so intencao de design. Recomenda-se que a implementacao do middleware
OR (secao 2.9) seja revisada pelo `auditor-seguranca` quando o codigo
existir - fora do escopo desta auditoria documento-vs-documento.

---

## Cobertura desta auditoria (autoavaliacao)

- [x] Rastreabilidade completa RF->Tabela->Endpoint (60/60, nao amostral).
- [x] Migracao D-2 lida linha a linha (up() e down()).
- [x] Reconciliacao de nomes de tabela/coluna/enum (8 inconsistencias
      encontradas e corrigidas).
- [x] Breaking changes verificados quanto a aviso explicito e plano de tela.
- [x] CHECK de maintenance_orders verificado contra codigo real de MANUT
      (sem regressao confirmada).
- [x] btree_gist/EXCLUDE avaliado quanto a permissao real do ambiente.
- [x] RBAC approve/auto-servico confirmados consistentes nos 3 artefatos.
- [x] Multas - estados e calculo de prazo confirmados consistentes.
- [ ] **Nao coberto (fora de escopo declarado):** execucao real da
      migration 000290 contra um banco com dados de facility_vehicles
      populados (RNF-FAC-03) - esta auditoria e de documento/schema, nao
      de execucao; recomendado como proximo passo antes do programador
      aplicar em qualquer ambiente com dado real.
- [ ] **Nao coberto:** revisao de seguranca do middleware OR de RBAC
      (secoes 2.9/9) quando implementado - repassado ao `auditor-seguranca`.

---

## Referencias

- `docs/business/BLOCO_4_FAC_REQUISITOS.md` (corrigido nesta auditoria)
- `docs/business/BLOCO_4_FAC_MODELO_DADOS.md` (corrigido nesta auditoria)
- `docs/business/BLOCO_4_FAC_API.md` (corrigido nesta auditoria)
- `docs/business/BLOCO_4_FAC_VERIFICACAO.md`
- `server/migrations/20260807-000290-*.cjs` a `20260807-000300-*.cjs`
  (`20260807-000294-*.cjs` corrigida - coluna trip_id adicionada)
- `server/src/models/Asset.ts`, `MaintenanceOrder.ts`
- `server/src/modules/maintenance/`, `server/src/modules/assets/`,
  `server/src/modules/ti/` (precedentes de adapter/servico confirmados)
- `server/src/middlewares/auth.ts` (authorizeModule)
- `docs/governance/TODO.md` - pendencias reais desta auditoria registradas
  na entrada "2026-08-07 - Auditoria Cruzada BLOCO 4 Facilities"

**Fim da Auditoria Cruzada BLOCO 4 Facilities.**
