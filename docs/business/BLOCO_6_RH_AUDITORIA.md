# BLOCO 6 — Modulo RH — Auditoria Cruzada Requisito x Banco x API

**Departamento:** 02 - RH.
**Auditor:** AuditorIntegrador.
**Data:** 2026-08-09.
**Escopo:** auditoria cruzada DOCUMENTO<->DOCUMENTO dos tres artefatos do
Bloco 6 antes de qualquer implementacao -- `docs/business/BLOCO_6_RH_REQUISITOS.md`
(81 RF-RH, RNF-RH-01 a 05, UC-67 a UC-71), `docs/business/BLOCO_6_RH_MODELO_DADOS.md`
+ 16 migrations `server/migrations/20260808-000010-*.cjs` a
`20260808-000025-*.cjs` (nao aplicadas), `docs/business/BLOCO_6_RH_API.md`
(~90 endpoints, 15 grupos + alteracoes em `employees` existente). Este e o
sexto e ultimo bloco do pipeline (`docs/business/pipeline-modulos-novos.md`).

**Status:** Auditoria concluida em profundidade para os fluxos P0/de
maior risco legal (Admissao, Demissao, Ferias, Contrato de Experiencia,
Afastamentos, Historico Contratual, Beneficios) e para todos os itens
cruzados explicitamente pelo `documentador` no prompt desta auditoria.
Cobertura parcial declarada (ver secao 5) para as tabelas P1/P2 de menor
risco legal que nao foram lidas coluna-a-coluna na migration bruta
(`hr_job_positions`, `hr_job_vacancies`/`hr_candidates`,
`hr_training_courses`/`hr_job_position_trainings`/`hr_employee_trainings`,
`hr_time_sheet_summaries`, `hr_payroll_import_batches`/`items`,
`hr_performance_reviews`, `hr_vacation_accrual_periods`) -- auditadas apenas
via a tabela-resumo do Modelo de Dados, nao via leitura direta do arquivo
`.cjs`. Por essa razao o veredito e REPROVADO COM RESSALVAS, nao
APROVADO, mesmo apos as correcoes aplicadas.

---

## Veredito

**[REPROVADO COM RESSALVAS]**

Cinco lacunas objetivas de schema (endpoint prometendo campo que a tabela
nao sustentava) foram encontradas e corrigidas diretamente nas
migrations e no Modelo de Dados nesta auditoria (secao 2, achados 1-5) -- o
trio de documentos esta consistente para essas tabelas apos a correcao.
Uma inconsistencia interna de logica no proprio contrato de API (secao 2,
achado 6) tambem foi corrigida. Dois erros de contagem/aritmetica nos
documentos foram corrigidos (secao 2, achados 7-8).

O que impede APROVADO: (a) quatro decisoes de arquitetura/negocio reais
ficaram sem dono (RBAC de `rh:approve` com semantica dupla, fronteira
RH x SST em treinamento normativo, reconciliacao de `DELETE
/api/employees/:id` com o novo `TerminationProcess`, adicao de `pcd` a
lista de campos sensiveis) -- nenhuma foi decidida nesta auditoria, todas
documentadas como pendencia explicita nos tres artefatos, conforme
instrucao; (b) a cobertura de auditoria nao foi 100% exaustiva no nivel de
coluna para as 7 tabelas de menor risco listadas acima -- apenas
verificacao de rastreabilidade RF->tabela->endpoint, nao comparacao
campo-a-campo com a migration bruta.

---

## 1. Rastreabilidade RF-RH -> Tabela(s) -> Endpoint(s)

Todas as 81 linhas de RF-RH foram cruzadas contra a tabela de
rastreabilidade secao 12 do Modelo de Dados e secao 19 do contrato de API.
Nenhum RF ficou sem tabela e sem endpoint (100% de cobertura ou
justificativa explicita de "fora de escopo/ja implementado/sem tabela
dedicada, e KPI derivado").

| RF-RH | Tabela(s) | Endpoint(s) | Status |
|---|---|---|---|
| 001-005 | employees/departments (ja existentes) | /api/employees, /api/departments | OK - sem mudanca |
| 006 | segregacao de campo (employeeSensitiveFields.ts, ja em producao-candidata) | GET /api/employees | OK - referencia |
| 007-012 | hr_admission_processes | Grupo 2 (secao 4 API) | OK - corrigido (achado 1: colunas faltantes) |
| 013-016 | hr_employee_contracts | Grupo 3 (secao 5 API) | OK |
| 017-023 | hr_termination_processes (+ employees.status/dismissal_date/user_id) | Grupo 4 (secao 6 API) | OK - corrigido (achado 5: trct_paid_at) |
| 024-026 | hr_job_positions + hr_job_position_trainings | Grupo 1 (secao 3 API) | OK - nao auditado coluna-a-coluna (secao 5) |
| 025 | employees.job_position_id | PUT /api/employees (secao 18 API) | OK |
| 027-030 | hr_employee_documents | Grupo 5 (secao 7 API) | OK |
| 031-034, 041-043 | hr_vacation_accrual_periods | Grupo 6 (secao 8 API) | OK - nao auditado coluna-a-coluna (secao 5) |
| 035-040 | hr_vacation_schedules | Grupo 6 (secao 8 API) | OK - divergencia de nomenclatura nao bloqueante (achado 9) |
| 044-049 | hr_absences | Grupo 7 (secao 9 API) | OK - corrigido (achado 2: extended_program) |
| 050-054 | hr_benefit_types + hr_employee_benefits | Grupo 8 (secao 10 API) | OK - corrigido (achado 3: suspended_days) |
| 055-059 | hr_training_courses + hr_job_position_trainings + hr_employee_trainings | Grupo 9 (secao 11 API) | OK - fronteira SST pendente de decisao (achado 12) |
| 060-063 | hr_time_sheet_summaries | Grupo 10 (secao 12 API) | OK - nao auditado coluna-a-coluna (secao 5) |
| 064-066 | hr_employee_job_history | Grupo 11 (secao 13 API) | OK - corrigido (achado 4: pending_aso_risk_change) |
| 067-069 | employees.pcd (+ work_regime='aprendiz' ja existente) | GET /api/rh/dashboard | OK - pendencia de segregacao de campo (achado 11) |
| 070-073 | hr_payroll_import_batches + hr_payroll_import_items | Grupo 13 (secao 15 API) | OK - nao auditado coluna-a-coluna (secao 5) |
| 074-076 | painel agregado, sem tabela dedicada | GET /api/rh/dashboard | OK |
| 077-081 | hr_performance_reviews, hr_job_vacancies + hr_candidates | Grupo 15 (secao 17 API) | OK - nao auditado coluna-a-coluna (secao 5) |

Nenhum dos 19 RF-RH marcados P0 ficou sem tabela + endpoint - cobertura
P0 100% confirmada (a contagem original do documento estava errada, ver
achado 8).

---

## 2. Inconsistencias encontradas

### Achado 1 [P1 - CORRIGIDO] hr_admission_processes nao sustentava o payload de POST /admission-processes
**Localizacao:** server/migrations/20260808-000015-create-hr-admission-processes.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 4.1.
O contrato de API exige/aceita department_id, job_position_id,
candidate_cpf e planned_start_date no POST /admission-processes
(inclusive department_id/planned_start_date como obrigatorios, com
erro 400 VALIDATION_ERROR dedicado se ausentes), mas nenhuma dessas 4
colunas existia na tabela - a API prometia um dado que o banco nao
sustentava.
**Correcao aplicada:** 4 colunas adicionadas a migration (department_id
INTEGER NOT NULL FK->departments RESTRICT, job_position_id INTEGER NULL
FK->hr_job_positions RESTRICT, candidate_cpf VARCHAR(14) NULL,
planned_start_date DATEONLY NOT NULL) + indice em department_id +
tabela secao 4.1 do Modelo de Dados atualizada.
**Responsavel original:** AdmDBA (omissao na modelagem).

### Achado 2 [P1 - CORRIGIDO] hr_absences sem coluna para extended_program (Empresa Cidada)
**Localizacao:** server/migrations/20260808-000020-create-hr-absences.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 9.1 (RF-RH-046).
A API descreve um campo opcional extended_program: boolean que estende a
licenca-maternidade de 120 para 180 dias; a tabela nao tinha essa coluna.
**Correcao aplicada:** coluna extended_program BOOLEAN NOT NULL default
false adicionada a migration + tabela secao 7 do Modelo de Dados atualizada.
**Responsavel original:** AdmDBA.

### Achado 3 [P1 - CORRIGIDO] hr_employee_benefits sem coluna para suspended_days
**Localizacao:** server/migrations/20260808-000021-create-hr-benefits.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 9.1 (RF-RH-047).
A API descreve que POST /absences deve, na mesma transacao, gravar
suspended_days no vinculo de beneficio VT/VR ao suspender o custeio
durante o afastamento - coluna inexistente.
**Correcao aplicada:** coluna suspended_days INTEGER NOT NULL default
0 adicionada a migration + secao 8.1 do Modelo de Dados atualizada.
**Responsavel original:** AdmDBA.

### Achado 4 [P2 - CORRIGIDO] hr_employee_job_history sem coluna para pending_aso_risk_change
**Localizacao:** server/migrations/20260808-000013-create-hr-employee-job-history.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 13.1 (RF-RH-066).
A API descreve que POST /employee-job-history marca
pending_aso_risk_change: true no registro quando ha ASO de mudanca de
risco pendente - coluna inexistente, e a lista de colunas mutaveis do
trigger de imutabilidade (hr_lock_job_history) tambem nao a
contemplava.
**Correcao aplicada:** coluna adicionada (BOOLEAN NOT NULL default
false) + trigger hr_lock_job_history atualizado para permitir sua
mudanca pos-INSERT (junto de effective_to/esocial_event_confirmed_*) +
secao 3.1 do Modelo de Dados atualizada.
**Responsavel original:** AdmDBA.

### Achado 5 [P2 - CORRIGIDO] hr_termination_processes sem marcador de pagamento de TRCT
**Localizacao:** server/migrations/20260808-000016-create-hr-termination-processes.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 6.2 (RF-RH-018/021).
A API preve POST /termination-processes/:id/trct com { paid: true }
opcional, e o GET .../termination-processes?payment_deadline_at_risk
menciona explicitamente trct_confirmed_paid_at como criterio - coluna
inexistente.
**Correcao aplicada:** coluna trct_paid_at TIMESTAMPTZ NULL adicionada +
secao 4.2 do Modelo de Dados atualizada. (Nome final trct_paid_at, nao
trct_confirmed_paid_at - mantido mais curto por consistencia com o
padrao *_confirmed_at usado so para eventos eSocial neste bloco; o
programador deve usar este nome exato.)
**Responsavel original:** AdmDBA.

### Achado 6 [P1 - CORRIGIDO] Contradicao interna no contrato de API sobre o papel de SstAsoService
**Localizacao:** docs/business/BLOCO_6_RH_API.md secao 2 (texto original) vs.
secoes 4.3/6.2/7.1/9.2 (mesmo documento).
A secao 2 (versao original) afirmava que SstAsoService era usado por
ConcludeAdmissionUseCase, ConcludeTerminationUseCase e
ConfirmReturnFromAbsenceUseCase - mas as secoes que detalham o gate real
desses tres use cases (4.3, 6.2, 7.1/9.2 - hasValidAso, checagem de
EmployeeDocument) descrevem uma checagem de snapshot ja armazenado,
nunca uma chamada sincrona ao servico no momento da conclusao. Isso
tambem resolve a duvida levantada no briefing desta auditoria (ASO
snapshot vs. consulta ao SST, item 2 da lista de divergencias
conhecidas): nao e conflito real entre o AdmDBA e o ArquitetoSoftwareAPI
- o AdmDBA modelou corretamente (snapshot, sem FK cross-modulo) e o
ArquitetoSoftwareAPI ja havia descrito o gate real corretamente nas
secoes de detalhe; so o paragrafo de arquitetura de servicos (secao 2)
estava desalinhado com o resto do proprio documento.
**Correcao aplicada:** secao 2 reescrita para restringir o uso de
SstAsoService a RequestAsoUseCase (admissao e demissao, no momento em
que o RH solicita o exame - uso informativo, nao de gate) e para
instruir explicitamente que ConcludeAdmissionUseCase/
ConcludeTerminationUseCase/ConfirmReturnFromAbsenceUseCase nao devem
injetar SstAsoService.
**Responsavel original:** ArquitetoSoftwareAPI (inconsistencia interna do
proprio documento, nao do cruzamento com o AdmDBA).

### Achado 7 [P2 - CORRIGIDO] Contagem de tabelas novas errada no Modelo de Dados
**Localizacao:** docs/business/BLOCO_6_RH_MODELO_DADOS.md secao 0.
Texto original: "18 tabelas novas". Contagem real da enumeracao das
secoes 2 a 9: 20 nomes distintos (confirmado contra os 16 arquivos de
migration no disco, que agrupam mais de uma tabela por arquivo em 4
casos - hr_job_vacancies+hr_candidates,
hr_benefit_types+hr_employee_benefits,
hr_training_courses+hr_job_position_trainings+hr_employee_trainings,
hr_payroll_import_batches+hr_payroll_import_items).
**Correcao aplicada:** secao 0 corrigida para "20 tabelas novas" com a
lista completa.
**Responsavel original:** AdmDBA.

### Achado 8 [P1 - CORRIGIDO] Contagem de prioridade (P0/P1/P2) errada no documento de Requisitos
**Localizacao:** docs/business/BLOCO_6_RH_REQUISITOS.md secoes 0 e 7.
Texto original: "25 P0, 40 P1, 12 P2" (repetido em duas secoes).
Contagem real, obtida por grep deterministico de todas as 81 linhas
RF-RH-NNN da secao 1: 19 P0, 49 P1, 8 P2 (mais 5 RFs legados
renumerados sem tag de prioridade propria; 19+49+8+5=81, bate com o
total). Este erro tambem havia sido herdado textualmente na descricao
da tarefa desta auditoria - os numeros corretos precisam se propagar
para qualquer changelog/handoff que cite este bloco.
**Correcao aplicada:** secoes 0 e 7 corrigidas com a contagem real e a
memoria de calculo.
**Responsavel original:** AnalistaNegocios.

### Achado 9 [P2 - NAO CORRIGIDO, apenas documentado] Divergencia de nomenclatura em hr_vacation_schedules
**Localizacao:** server/migrations/20260808-000019-create-hr-vacation-schedules.cjs
vs. docs/business/BLOCO_6_RH_API.md secao 8.3.
A tabela usa notice_sent_at/fractioning_justification/superseded_by_id/
revision_reason; o contrato de API usa aviso_em/
override_team_limit_justification/superseded_schedule_id/reason (nomes
de campo do payload JSON, nao de coluna). Nao e um bug - o projeto ja
usa mapeamento explicito request<->coluna em todos os modulos (nao ha
convencao de payload JSON = nome de coluna 1:1 neste ERP) - mas e o
tipo de divergencia que o programador precisa mapear corretamente linha
a linha no use case, sem assumir camelCase/snake_case automatico.
Registrado aqui para nao ser esquecido na implementacao; nenhuma acao de
correcao de artefato e necessaria.
**Responsavel sugerido:** programador (apenas atencao na implementacao).

### Achado 10 [PENDENCIA DE DECISAO - P0, RBAC] rh:approve usado com dois significados nao relacionados
**Localizacao:** docs/business/BLOCO_6_RH_API.md secao 0.
Ja detalhado no corpo do contrato (marcado nesta auditoria com aviso
explicito, nao decidido): rh:approve e usado tanto para autorizar acoes
de alto impacto (concluir demissao, decidir rescisao de contrato de
experiencia) quanto como nivel de leitura reforcada para dado de saude
(Absence.cid) e dado financeiro individual
(PayrollImportItem.bruto/liquido). Isso cria uma correlacao nao pedida
por nenhum RF: quem pode concluir uma demissao automaticamente enxerga
CID e salario liquido individual de qualquer funcionario.
**Opcoes levantadas nesta auditoria (nao implementadas):**
- Opcao A: novo nivel no catalogo (AccessModuleLevel hoje e so
  'operate' | 'approve'); maior blast radius (arquivo compartilhado por
  todos os modulos).
- Opcao B: intersecao de modulo (rh E financeiro/admin, ja descrita
  para PayrollImportItem; estender para Absence.cid como rh E sst).
- Opcao C (recomendacao do AuditorIntegrador): manter rh:approve so
  para as 2 acoes de alto impacto e usar intersecao de modulo (Opcao B)
  apenas para os 2 campos sensiveis - menor mudanca estrutural, sem
  retrofit de perfis ja configurados.
**Decisao pendente:** dono do produto, antes do passo 4 (programador).

### Achado 11 [PENDENCIA DE DECISAO/IMPLEMENTACAO - P1, LGPD] employees.pcd nao foi adicionado a SENSITIVE_EMPLOYEE_FIELDS
**Localizacao:** server/src/modules/employees/domain/services/employeeSensitiveFields.ts
(codigo ja em producao-candidata) vs. docs/business/BLOCO_6_RH_REQUISITOS.md
RF-RH-067 (marca pcd como sensivel).
SENSITIVE_EMPLOYEE_FIELDS hoje lista cpf, rg, pis_pasep, ctps, salary,
salary_type, bank_*, pix_key, address, phone - nao inclui pcd. Como GET
/api/employees continua aberto a qualquer autenticado (RF-RH-006), sem
essa adicao a condicao de PCD de qualquer funcionario fica visivel a
todo mundo assim que a coluna existir, mesmo com authorizeModule('rh')
protegendo as 15 entidades novas - a rota antiga nao passa por esse
gate. Nenhum dos tres artefatos deste bloco instruia explicitamente
essa alteracao de codigo.
**Correcao aplicada:** nota adicionada em BLOCO_6_RH_API.md secao 21
item 7, instruindo o programador a adicionar 'pcd' a
SENSITIVE_EMPLOYEE_FIELDS na mesma migration/PR que cria a coluna.
**Responsavel sugerido:** programador (implementacao obrigatoria, nao e
decisao de negocio - e fechar um gate LGPD ja desenhado para o resto do
Employee).

### Achado 12 [PENDENCIA DE DECISAO - P1, arquitetura] Risco real de duplicacao RH x SST em treinamento normativo
**Localizacao:** server/src/modules/sst/domain/repositories/TrainingRepository.ts
(findMatrixByPositionAndNorma, findBlocklist, ja em producao) vs.
docs/business/BLOCO_6_RH_API.md secao 11 (RF-RH-055 a 059).
Confirmado por leitura de codigo: o SST ja mantem sua propria matriz
funcao x norma e seu proprio blocklist de "quem nao pode operar" por NR
vencida/ausente. O Bloco 6 cria, para os mesmos cursos normativos
(is_normative=true), um segundo registro de conclusao
(hr_employee_trainings) e um segundo relatorio "quem nao pode operar"
(RF-RH-058), sem nenhum mecanismo de sincronizacao automatica - o
proprio contrato de API ja registra isso como "copia manual" na
ausencia de integracao sincrona (secao 11), mas trata a duplicacao de
estrutura como nao-duplicacao (catalogo mais amplo) sem enderecar a
duplicacao de dado para o subconjunto normativo. Duas fontes de
verdade independentes para "fulano esta apto a operar a maquina X
conforme a NR-12?" e o mesmo padrao de risco ja visto na duplicacao de
modulo do Bloco 3 (Juridico) antes da correcao.
**Recomendacao do AuditorIntegrador** (documentada em
BLOCO_6_RH_API.md secao 21 item 9, nao implementada): para
is_normative=true, RF-RH-058 deveria delegar a checagem para GET
/api/sst/trainings/blocklist (via adapter, mesmo padrao de
SstAsoService) em vez de calcular a partir de hr_employee_trainings; e
hr_employee_trainings deveria aceitar normativos apenas como espelho de
leitura, nao fonte primaria.
**Decisao pendente:** dono do produto / ArquitetoSoftwareAPI, antes do
passo 4.

### Achado 13 [PENDENCIA DE DECISAO - P1, integracao] DELETE /api/employees/:id (ja em producao) nao e reconciliado com o novo TerminationProcess
**Localizacao:** server/src/modules/employees/application/use-cases/DeactivateEmployeeUseCase.ts
(ja em producao, seta status='inactive' + dismissal_date) vs.
docs/business/BLOCO_6_RH_REQUISITOS.md RF-RH-022 (novo fluxo formal de
demissao, seta status='fired').
Nenhum dos tres artefatos deste bloco cita ou reconcilia a rota DELETE
ja existente com o novo TerminationProcess. Sem decisao explicita, o
ERP passa a ter dois caminhos concorrentes de desligamento, com status
finais diferentes (inactive vs fired) e sem os gates do novo fluxo (ASO
demissional, devolucao de ativos, prazo de verbas) no caminho antigo.
**Correcao aplicada:** nota adicionada em BLOCO_6_RH_API.md secao 21
item 8 com duas opcoes (bloquear DELETE quando TerminationProcess
existir, ou manter as duas rotas com distincao documentada) - nao
decidido.
**Decisao pendente:** dono do produto, antes do passo 4.

### Achado 14 [INFORMATIVO - confirmado sem conflito] Prefixo hr_ vs "nenhum prefixo assumido" pela API
Divergencia apontada como possivel problema no briefing desta auditoria
(item 1 da lista de divergencias conhecidas). Confirmado que nao e
conflito real: BLOCO_6_RH_API.md secao 20 item 8 ja declarava
explicitamente "este contrato usa PascalCase (nome de entidade) nos
payloads e nao assume um prefixo especifico" - o contrato nunca vaza
nomes de tabela para o cliente HTTP (nenhum payload JSON contem
hr_employee_contracts, por exemplo), entao a escolha de prefixo do
AdmDBA (hr_, justificada por employees/departments ja serem em ingles)
nao colide com nada no contrato de API. Nenhuma correcao necessaria -
apenas confirmar para o programador que os tableName dos models
Sequelize devem usar hr_* literalmente.

### Achado 15 [INFORMATIVO - risco superestimado no proprio contrato] PUT /api/employees/:id e hire_date
**Localizacao:** client/src/api/employees.ts linha 159 (comentario ja
existente) + server/src/modules/employees/application/use-cases/UpdateEmployeeUseCase.ts
ALLOWED_FIELDS (codigo ja em producao) vs. docs/business/BLOCO_6_RH_API.md
secao 18.
Confirmado por leitura de codigo: hire_date ja nao esta em
ALLOWED_FIELDS hoje - qualquer tentativa de edita-lo via PUT
/api/employees/:id ja e silenciosamente ignorada pelo backend atual (o
proprio client documenta isso). O contrato de API descreve RF-RH-010
como "rejeita com 422 quando existe AdmissionProcess sem
esocial_s2200_confirmed_at" como se fosse um bloqueio novo sobre um
campo hoje editavel - na pratica, para essa trava fazer sentido, o
programador primeiro precisa adicionar hire_date a ALLOWED_FIELDS (hoje
inexistente) e so entao aplicar a guarda condicional. O risco de
regressao e menor do que o texto original sugere (nao existe hoje
nenhum fluxo em producao que edite hire_date via essa rota, porque o
campo ja e ignorado), mas a ordem de implementacao ("abrir o campo +
guardar" em vez de apenas "guardar um campo ja aberto") precisa ficar
clara para o programador. Nenhuma correcao de artefato foi necessaria
alem desta nota - registrada aqui para o handoff.

---

## 3. Verificacoes padrao - resultado

- Anti-spoofing (regra P0 do projeto): PASS. Varredura de todo
  BLOCO_6_RH_API.md nao encontrou nenhum endpoint aceitando
  created_by/approved_by/requester/reviewer_id/concluded_by/
  importado_por/esocial_*_confirmed_by no corpo da requisicao - todos
  documentados explicitamente como vindos de req.user.id.
- LGPD (sanitizacao de employees): RESSALVA - ver achado 11 (pcd nao
  incluido em SENSITIVE_EMPLOYEE_FIELDS). Fora isso, GET
  /api/employees/:id permanecem inalterados (confirmado por leitura de
  employeeSensitiveFields.ts), e as 15 entidades novas usam
  authorizeModule('rh') bloqueando rota inteira (mais restritivo que o
  padrao atual de Employee).
- Folha e ponto sao BUY, nao build: PASS. Nenhum endpoint de
  hr_time_sheet_summaries/hr_payroll_import_* calcula HE, adicional
  noturno, banco de horas, INSS/IRRF/FGTS/13o - apenas envelope de
  importacao (secoes 12/15 API), consistente com RNF-RH-03.
- Migrations - up/down funcionais, sem "comment:" em addColumn: PASS.
  Confirmado nas 16 migrations: todas tem async down implementado (drop
  de tabela + DROP TYPE de enums); nenhuma usa a sintaxe comment: (bug
  conhecido do projeto) - todas usam COMMENT ON COLUMN via SQL bruto.
- FKs - RESTRICT por padrao, CASCADE/SET NULL so com justificativa:
  PASS. Unico padrao de SET NULL encontrado e em FKs nullable/
  auto-referenciais com justificativa explicita no comentario da
  migration (job_vacancy_id/candidate_id em admissao,
  zeroed_from_period_id/superseded_by_id em ferias, document_id/
  accrual_period_impact_id em afastamentos) - nenhum CASCADE encontrado
  nas 16 migrations.
- Tipos e precisao: PASS (conforme declarado). Todas as PK/FK novas sao
  INTEGER autoIncrement (confirmado nas 16 migrations, nenhuma UUID);
  valores monetarios sao DECIMAL(12,2), expostos como string no JSON
  conforme secao 0 do cabecalho da API (nao verificado em runtime, pois
  nao ha codigo ainda - verificacao e de contrato, nao de
  implementacao).

---

## 4. Riscos de seguranca/isolamento observados

1. Achado 10 (RBAC rh:approve com semantica dupla) e o risco de maior
   impacto potencial: um perfil configurado apenas para aprovar
   demissoes (acao operacional recorrente de RH) herda, sem intencao
   explicita, acesso a CID e salario liquido individual de toda a
   empresa - dado de saude e dado financeiro de alta sensibilidade LGPD.
2. Achado 11 (pcd fora de SENSITIVE_EMPLOYEE_FIELDS) expoe condicao de
   PCD via a rota ja aberta GET /api/employees a qualquer usuario
   autenticado, assim que a coluna existir - se nao corrigido antes do
   deploy da migration 000011.
3. Achado 13 (dois caminhos de desligamento) tem uma dimensao de
   auditoria/compliance, nao so de dado sensivel: um desligamento pela
   rota antiga (DELETE) escapa dos gates de ASO demissional e devolucao
   de ativos que o novo fluxo formal exige - risco operacional, nao so
   de RBAC.

---

## 5. Cobertura declarada como parcial (nao amostral, mas nao exaustiva)

Auditadas em profundidade coluna-a-coluna (migration bruta lida
integralmente): hr_admission_processes, hr_termination_processes,
hr_absences, hr_employee_benefits/hr_benefit_types,
hr_employee_job_history, hr_vacation_schedules, hr_employee_contracts
(via Modelo de Dados + leitura cruzada de trigger).

Nao auditadas coluna-a-coluna nesta rodada (apenas via tabela-resumo do
Modelo de Dados secao 12, sem leitura do .cjs): hr_job_positions,
hr_job_vacancies/hr_candidates, hr_training_courses/
hr_job_position_trainings/hr_employee_trainings,
hr_time_sheet_summaries, hr_payroll_import_batches/items,
hr_performance_reviews, hr_vacation_accrual_periods. Sao as tabelas de
menor risco legal do bloco (P1/P2, sem trigger de imutabilidade na
maioria dos casos) - mas o mesmo padrao de "coluna referenciada pela
API e ausente no schema" encontrado 5 vezes nas tabelas auditadas
(achados 1-5) pode se repetir nelas. Recomenda-se uma segunda passada,
ainda que mais rapida, antes do programador iniciar a implementacao
dessas 7 tabelas especificamente.

---

## 6. Resumo de correcoes aplicadas nesta auditoria

| Arquivo | Mudanca |
|---|---|
| server/migrations/20260808-000015-create-hr-admission-processes.cjs | + candidate_cpf, department_id, job_position_id, planned_start_date + indice |
| server/migrations/20260808-000020-create-hr-absences.cjs | + extended_program |
| server/migrations/20260808-000021-create-hr-benefits.cjs | + suspended_days |
| server/migrations/20260808-000013-create-hr-employee-job-history.cjs | + pending_aso_risk_change + ajuste no trigger hr_lock_job_history |
| server/migrations/20260808-000016-create-hr-termination-processes.cjs | + trct_paid_at |
| docs/business/BLOCO_6_RH_MODELO_DADOS.md | secoes 0, 3.1, 4.1, 4.2, 7, 8.1 atualizadas para refletir as colunas acima |
| docs/business/BLOCO_6_RH_API.md | secao 0 (nota de conflito RBAC), secao 2 (escopo real de SstAsoService), secao 21 (itens 7, 8, 9 adicionados) |
| docs/business/BLOCO_6_RH_REQUISITOS.md | secoes 0 e 7 (contagem de prioridade P0/P1/P2 corrigida) |

---

## 7. Pendencias para o dono do produto (nao decididas nesta auditoria)

1. RBAC rh:approve com semantica dupla (achado 10) - recomendacao:
   Opcao C (intersecao de modulo so para os 2 campos sensiveis, manter
   approve so para as 2 acoes de alto impacto).
2. Fronteira RH x SST em treinamento normativo (achado 12) -
   recomendacao: RF-RH-058 delega ao blocklist do SST para cursos
   is_normative=true.
3. Reconciliacao DELETE /api/employees/:id x TerminationProcess (achado
   13) - recomendacao: bloquear DELETE para desligamento real assim que
   TerminationProcess estiver implantado, documentando a distincao se
   ambos forem mantidos.
4. Adicionar pcd a SENSITIVE_EMPLOYEE_FIELDS (achado 11) - nao e bem
   uma "decisao", e um item obrigatorio de implementacao ja sinalizado
   para o programador; incluido aqui para garantir que nao seja
   esquecido antes do deploy da migration 000011.

---

## Referencias

- docs/business/BLOCO_6_RH_REQUISITOS.md
- docs/business/BLOCO_6_RH_MODELO_DADOS.md
- docs/business/BLOCO_6_RH_API.md
- server/migrations/20260808-000010-*.cjs a 20260808-000025-*.cjs
- server/src/modules/employees/domain/services/employeeSensitiveFields.ts
- server/src/modules/employees/application/use-cases/UpdateEmployeeUseCase.ts, DeactivateEmployeeUseCase.ts
- server/src/modules/sst/domain/repositories/TrainingRepository.ts
- server/src/shared/domain/accessModules.ts
- client/src/api/employees.ts

Fim da auditoria cruzada do BLOCO 6 - RH (ultimo bloco do pipeline).
