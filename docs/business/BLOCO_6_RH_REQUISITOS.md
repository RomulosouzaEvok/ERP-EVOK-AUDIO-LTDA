# BLOCO 6 — Módulo RH (Recursos Humanos, lacunas) — Requisitos Formais

**Departamento:** 02 — RH, conforme `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.
**Natureza deste documento:** greenfield sobre lacunas de um módulo que já
existe parcialmente. `employees`/`departments` (cadastro, CRUD, RBAC básico)
já estão em produção; este bloco formaliza **apenas o que falta**, conforme
`docs/business/briefs/BRIEF_RH_2026-08-06.md`. Este é o **sexto e último
bloco** do pipeline de módulos novos (`docs/business/pipeline-modulos-novos.md`
— checkpoint em memória do agente): Bloco 0 (LGPD em employees) → Bloco 1
(SST) → Bloco 2 (TI) → Bloco 3 (Jurídico) → Bloco 4 (Facilities) → **Bloco 5
(Marketing) → Bloco 6 (RH, este documento)**.
**Insumo:** `docs/business/briefs/BRIEF_RH_2026-08-06.md` (seções (a)-(g):
17 lacunas priorizadas, 9 processos P1-P9, 15 entidades novas, 24 regras
BR-RH-001 a 024, 9 integrações, 11 KPIs, priorização P0/P1/P2, recomendação
explícita BUY/INTEGRAR para Folha de Pagamento e Ponto Eletrônico, 6 itens
`[VERIFICAR COM RH DA EMPRESA]`).
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-07.
**Status:** 🟡 Especificação de requisitos pronta para modelagem de
banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código foi alterado
neste passo.**

**Prefixo de módulo:** `RH` — já em uso desde a origem do projeto
(`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §9, "RH (RF-RH)"), com 5
requisitos catalogados em formato legado de 2 dígitos (`RF-RH-01` a
`RF-RH-05`). Este bloco **não reaproveita** os números de 2 dígitos (para
não colidir por leitura visual com o padrão de 3 dígitos usado por todos os
blocos SST/TI/JUR/FAC/MKT); em vez disso, renumera os 5 requisitos legados
para o padrão de 3 dígitos (`RF-RH-001` a `RF-RH-005`) na tabela de
mapeamento §1.0 e continua a partir de `RF-RH-006`. Quando este bloco for
consolidado pelo `documentador`, a seção "9. RH (RF-RH)" do índice executivo
deve ser **substituída inteiramente** pela numeração deste documento (não
apenas complementada), citando explicitamente a renumeração para não deixar
`RF-RH-01..05` e `RF-RH-001..005` coexistindo como se fossem requisitos
diferentes.

**Numeração de Casos de Uso:** o maior UC formal já atribuído em qualquer
documento do projeto é `UC-66` (Bloco 5 MKT,
`docs/business/BLOCO_5_MKT_REQUISITOS.md`, confirmado por busca em todo
`docs/` — nenhuma ocorrência de UC-67 em diante antes deste bloco). Os casos
de uso deste bloco começam em **UC-67**.

**Catálogo RBAC verificado:** `server/src/shared/domain/accessModules.ts` já
tem a chave `rh`, adicionada em 2026-08-06 (BR-RH-020) e **já remediada em
produção-candidata** — não é segregação por rota inteira
(`authorizeModule`), é segregação de campo: `GET /api/employees` continua
acessível a qualquer autenticado (necessário para seletor de operador do
apontamento, resolução de departamento do usuário logado etc.), mas os
campos sensíveis (salário, CPF, dados bancários, endereço, telefone pessoal)
só aparecem na resposta se `req.user.permissions.rh` ou `role==='admin'`
(`server/src/modules/employees/domain/services/employeeSensitiveFields.ts`).
Este bloco **reaproveita esse desenho já correto** para todas as novas
entidades de RH que carregam dado sensível (salário em `EmployeeJobHistory`,
CID em `Absence`, dado bancário em nenhuma nova entidade). Apenas duas
exceções mais restritivas, no padrão de `sst`/`juridico` (rota inteira
bloqueada, não campo): `Absence.cid` (dado de saúde, LGPD art. 5º II) e
`PayrollImportItem` (bruto/líquido, dado financeiro individual de alta
sensibilidade) — ver §3 e §6.4.

---

## 0. Sumário do que este bloco cobre

| Área (processo do brief) | Decisão do brief | Prioridade | RF-RH |
|---|---|---|---|
| Cadastro/Departamento/Turno (já existente) | Renumerar apenas | — | 001–005 |
| Segregação de acesso a dado sensível (BR-RH-020) | Já remediado — referência | P0 ✅ | 006 |
| Admissão (workflow, P1) | Desenvolver (workflow leve) | P1 | 007–012 |
| Contrato de experiência (P2) | Desenvolver | **P0** | 013–016 |
| Demissão/rescisão (P3) | Desenvolver workflow; INTEGRAR cálculo | P1 | 017–023 |
| Cargos — `JobPosition` (item 4 do brief) | Desenvolver | P2 | 024–026 |
| Documentos do funcionário (P1.5, EmployeeDocument) | Desenvolver | P1 | 027–030 |
| Férias (P4) | Desenvolver | **P0** | 031–043 |
| Afastamentos (P5) | Desenvolver registro; INTEGRAR envio eSocial | P1 | 044–049 |
| Benefícios (P6) | Desenvolver cadastro/adesão; INTEGRAR desconto | P1 | 050–054 |
| Treinamentos com validade (P7) | Desenvolver | P1 | 055–059 |
| Espelho de ponto consolidado — importação (P8) | Desenvolver importação; **NÃO desenvolver** ponto em si | P1 | 060–063 |
| Transferência/histórico contratual (P9) | Desenvolver | P1 | 064–066 |
| Quotas legais PCD/aprendiz (indicador) | Desenvolver (indicador) | P1 | 067–069 |
| Custo importado da folha — `PayrollImport` | Desenvolver importação; **NÃO desenvolver** cálculo | P1 | 070–073 |
| KPIs/painel de RH | Desenvolver | P1 | 074–076 |
| Avaliação de desempenho / Recrutamento mínimo | Desenvolver (P2) | P2 | 077–081 |
| **Folha de pagamento** (cálculo INSS/IRRF/FGTS/13º) | **BUY/INTEGRAR — NÃO desenvolver** | fora de build | ver §6.1 (RNF, não RF) |
| **Ponto eletrônico (REP)** | **BUY/INTEGRAR — NÃO desenvolver** | fora de build | ver §6.2 (RNF, não RF) |

**Total: 81 RF-RH catalogados** (3 já implementados/renumerados, 1 já
remediado, **19 P0, 49 P1, 8 P2** — números corrigidos pelo
`AuditorIntegrador` em 2026-08-09: a versão original deste documento dizia
"25 P0, 40 P1, 12 P2", mas a contagem real de linhas `RF-RH-NNN` marcadas
com cada prioridade em §1 é 19/49/8 (mais os 5 legados renumerados de
§1.0, que não carregam tag de prioridade própria — 19+49+8+5=81, confere
com o total). Detalhamento exato em §7 — ambas as seções foram corrigidas
juntas para não deixar dois números divergentes no mesmo documento.

---

## 1. Requisitos Funcionais (RF-RH)

Cada RF referencia o processo do brief (P1-P9) e a(s) regra(s) de negócio
`BR-RH-NNN` aplicável(is), com base legal citada no brief §(d). Prioridade
conforme brief §(g), preservada sem reinterpretação.

### 1.0 Renumeração do catálogo legado (sem mudança de escopo)

| RF (novo) | RF (legado) | Descrição | Status |
|---|---|---|---|
| RF-RH-001 | RF-RH-01 | Cadastro de funcionário (CTPS, PIS, dados bancários) | `[IMPLEMENTADO]` — UC-11, `/api/employees`, tela `/hr` |
| RF-RH-002 | RF-RH-02 | Departamentos com hierarquia e gestor | `[IMPLEMENTADO]` — `/api/departments` |
| RF-RH-003 | RF-RH-03 | Controle de turnos e regime de trabalho | `[IMPLEMENTADO]` — modelo `Employee` |
| RF-RH-004 | RF-RH-04 | Folha de pagamento (Payroll) | **`[PENDENTE]` → recategorizado como fora de escopo de build (BUY/INTEGRAR)**, ver §6.1. Não existe mais como RF de desenvolvimento; o que o ERP constrói é `PayrollImportBatch`/`Item` (RF-RH-070 a 073) |
| RF-RH-005 | RF-RH-05 | Benefícios (Benefit) | **`[PENDENTE]` → absorvido por RF-RH-050 a 054** (cadastro/adesão passam a ser build; desconto/cálculo permanece integração) |

### 1.1 Segregação de Acesso a Dado Sensível de RH (BR-RH-020)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-006 | ✅ **Já remediado em produção-candidata** (2026-08-06): `GET /api/employees` permanece acessível a qualquer autenticado, mas campos sensíveis (salário, CPF, dados bancários, endereço, telefone pessoal) só retornam com `req.user.permissions.rh` ou `role==='admin'` — este bloco não reabre a implementação, apenas fixa como pré-requisito de todo o restante (nenhuma entidade nova deste bloco pode expor dado sensível sem passar pelo mesmo crivo) | P0 ✅ | BR-RH-020 |

### 1.2 Admissão — Workflow (Processo P1)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-007 | Criar **AdmissionProcess**: origem (vaga aprovada opcional — `JobVacancy`, ou avulsa), candidato/dados iniciais, checklist de documentos obrigatórios (RG, CPF, CTPS digital, PIS, comprovante de residência, foto), status (`documentos_pendentes`/`aso_pendente`/`aguardando_esocial`/`concluida`/`cancelada`) | P1 | processo P1.1-P1.3 |
| RF-RH-008 | RH solicita ASO admissional à SST (integração — consome apenas status de aptidão + validade do módulo `sst`, nunca o laudo clínico) e o `AdmissionProcess` fica bloqueado em `aso_pendente` até a confirmação | P1 | BR-RH-021, integração SST→RH (brief §e) |
| RF-RH-009 | Conclusão do `AdmissionProcess` cria (ou finaliza) o registro em `employees` + o `EmployeeContract` inicial (RF-RH-013) + o `EmployeeJobHistory` inicial (RF-RH-064) em uma única transação | P1 | processo P1.3 |
| RF-RH-010 | Campo de confirmação `esocial_s2200_confirmed_at`/`confirmed_by` no `AdmissionProcess`: a **data de início efetiva** do funcionário fica bloqueada para edição livre enquanto este campo não for preenchido pelo RH (confirmando que o provedor de folha transmitiu o evento) — o ERP nunca transmite o S-2200, apenas cobra a confirmação | P1 | BR-RH-017 |
| RF-RH-011 | Conclusão do `AdmissionProcess` gera pendências encaminháveis (não bloqueantes do cadastro): adesão a benefícios (RF-RH-050), treinamentos obrigatórios do cargo (RF-RH-055), cadastro no sistema de ponto externo (fora do ERP, apenas checklist) | P1 | processo P1.5 |
| RF-RH-012 | `AdmissionProcess` nunca é excluído fisicamente; cancelamento usa `status='cancelada'` com motivo — mesmo padrão de não-exclusão física já adotado nos Blocos SST/TI/JUR/FAC/MKT | P1 | CLAUDE.md §7 |

### 1.3 Contrato de Experiência (Processo P2) — P0

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-013 | Criar **EmployeeContract**: `employee_id`, `type` (`indeterminado`/`experiencia`/`aprendiz`/`estagio`), `start_date`, para experiência: `period_1_end_date`, `period_2_end_date` (nullable — só existe se houver prorrogação), `effective_end_date`, `status` (`ativo`/`prorrogado`/`efetivado`/`indeterminado_automatico`/`rescindido`). Registro histórico imutável — nova alteração relevante gera novo registro, nunca `UPDATE` destrutivo do anterior | P0 | BR-RH-001, BR-RH-022 |
| RF-RH-014 | Duração total de contrato de experiência (`period_1` + `period_2`, se houver) não pode exceder 90 dias corridos a partir de `start_date` — validação bloqueante na gravação | P0 | BR-RH-001 |
| RF-RH-015 | Contrato de experiência admite **no máximo uma** prorrogação (`period_2_end_date` só pode ser preenchido uma vez; tentativa de segunda prorrogação é rejeitada) | P0 | BR-RH-002 |
| RF-RH-016 | Alertas automáticos em D-10 e D-3 antes do vencimento de cada período de experiência ativo, direcionados ao gestor de RH e ao gestor da área; período vencido sem decisão (prorrogar/efetivar/rescindir) muda `status` automaticamente para `indeterminado_automatico`, gera alerta crítico e atualiza `work_regime` do funcionário para refletir a efetivação de fato | P0 | BR-RH-002, processo P2.3 |

### 1.4 Demissão / Rescisão (Processo P3)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-017 | Criar **TerminationProcess**: `employee_id`, `termination_type` (`pedido`/`sem_justa_causa`/`justa_causa`/`termino_experiencia`/`acordo`), `notice_date`, `notice_modality` (`trabalhado`/`indenizado`), `termination_date`, `payment_deadline` (calculado), `trct_file_path`, `s2299_confirmed_at`, checklist (ASO demissional, devolução de EPI/ativos) | P1 | processo P3.1 |
| RF-RH-018 | `payment_deadline` calculado automaticamente como `termination_date + 10 dias corridos`; alerta ao Financeiro em D-3 e no vencimento sem confirmação de pagamento | P1 | BR-RH-015 |
| RF-RH-019 | Aviso prévio proporcional calculado a partir do tempo de casa: 30 dias + 3 dias por ano completo trabalhado, limitado a 90 dias — usado para sugerir `notice_date`, ajustável manualmente pelo RH | P1 | BR-RH-016 |
| RF-RH-020 | `TerminationProcess` solicita ASO demissional à SST (mesmo padrão de integração de RF-RH-008) — bloqueante para concluir o processo | P1 | BR-RH-021 |
| RF-RH-021 | Cálculo das verbas rescisórias **não é feito pelo ERP** (integração — provedor de folha); o ERP apenas anexa o TRCT recebido e controla o prazo (RF-RH-018) | P1 | escopo BUY §6.1 |
| RF-RH-022 | Conclusão do `TerminationProcess` seta `employees.status='fired'` + `dismissal_date` e desativa **no mesmo ato transacional** o `user_id` vinculado (login do sistema) | P1 | BR-RH-024 |
| RF-RH-023 | Checklist de devolução de ativos/EPI vinculados ao funcionário integra com Patrimônio (`Asset.responsible_id`) — pendência bloqueante para `status='concluido'` do `TerminationProcess`, exceto quando não há ativo vinculado | P1 | integração RH↔Patrimônio (brief §e) |

### 1.5 Cargos — `JobPosition` (item 4 do brief)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-024 | Criar **JobPosition**: `department_id`, `name`, `cbo_code`, `description`, `salary_range_min`/`max` 🔒, `requirements`, `active` | P2 | item 4 do brief |
| RF-RH-025 | `Employee.position` (hoje texto livre) passa a aceitar referência opcional a `JobPosition` (`job_position_id`, nullable) sem quebrar registros existentes com texto livre — migração incremental, não obrigatória retroativa | P2 | item 4 do brief |
| RF-RH-026 | `JobPosition` associa-se a `TrainingCourse` obrigatórios (N:N) — usado pela matriz de treinamento por cargo (RF-RH-056) | P2 | processo P7.2 |

### 1.6 Documentos do Funcionário (`EmployeeDocument`)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-027 | Criar **EmployeeDocument**: `employee_id`, `doc_type` (`rg`/`cpf`/`ctps`/`aso_admissional`/`aso_periodico`/`aso_retorno`/`aso_mudanca_risco`/`aso_demissional`/`contrato`/`certificado`/`outro`), `file_path` (reutiliza infraestrutura Multer já existente no ERP), `valid_until` (nullable — nem todo documento vence), `origin` (`rh`/`sst`) | P1 | processo P1.5, entidade (c) |
| RF-RH-028 | Para documentos do tipo `aso_*`: apenas **aptidão (apto/inapto/apto com restrição) e validade** são armazenados no ERP — o laudo clínico permanece exclusivamente com a SST/médico do trabalho, nunca replicado em `EmployeeDocument` | P1 | LGPD art. 5º II, BR-RH-021 |
| RF-RH-029 | Alertas automáticos de vencimento de `EmployeeDocument.valid_until` em 60/30/7 dias (janelas parametrizáveis, não hard-code) — mesmo padrão de alerta escalonado já usado em SST/TI/JUR/FAC | P1 | RNF-RH-02 |
| RF-RH-030 | Fluxos que dependem de ASO (admissão, retorno de afastamento >30 dias, mudança de função) ficam bloqueados até existir `EmployeeDocument` do tipo correspondente com aptidão confirmada e dentro da validade | P1 | BR-RH-021 |

### 1.7 Férias (Processo P4) — P0, maior risco legal do bloco

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-031 | Criar **VacationAccrualPeriod** (período aquisitivo): abertura **automática** de um novo período a cada 12 meses de vigência de contrato, a partir de `hire_date` (na admissão) e a cada aniversário subsequente — sem ação manual do RH para abrir o período | P0 | BR-RH-003 |
| RF-RH-032 | Cálculo de `dias_direito` = 30 dias corridos reduzidos conforme a escala legal de faltas injustificadas (>5 faltas começa a reduzir; >32 faltas = 0 dias), usando `faltas_injustificadas` do `TimeSheetSummary` importado (RF-RH-060) do período aquisitivo correspondente | P0 | BR-RH-003 |
| RF-RH-033 | `fim_concessivo` calculado automaticamente como `fim_aquisitivo + 12 meses` — o limite legal para conceder as férias sem gerar dobra | P0 | BR-RH-004 |
| RF-RH-034 | Alertas escalonados do período concessivo em **6, 3 e 1 mês** antes de `fim_concessivo`, direcionados ao RH; concessivo vencido sem gozo integral muda `status` para `vencido_dobra` automaticamente e gera **alerta crítico ao RH e ao CFO** — nunca vence silenciosamente | P0 | BR-RH-004 |
| RF-RH-035 | Criar **VacationSchedule** (programação): até 3 frações por período aquisitivo, sendo uma com ≥14 dias e as demais com ≥5 dias cada; qualquer fracionamento exige registro de concordância do empregado (`employee_agreement_confirmed`) | P0 | BR-RH-005 |
| RF-RH-036 | Abono pecuniário (`abono=true`) limitado a 1/3 dos dias do período aquisitivo; requerimento (`requested_at`) só é aceito até 15 dias antes do fim do período aquisitivo correspondente — após esse prazo, o campo fica bloqueado para edição | P0 | BR-RH-006 |
| RF-RH-037 | `VacationSchedule.aviso_em` deve anteceder `data_início` em pelo menos 30 dias corridos (comunicação ao empregado); gravação com antecedência menor é aceita apenas com justificativa e não dispensa o RH de registrar o aviso formal | P0 | BR-RH-007 |
| RF-RH-038 | Alerta ao Financeiro/provedor de folha para confirmar pagamento até 2 dias antes de `data_início` de cada `VacationSchedule` — o ERP não processa o pagamento, apenas cobra o prazo | P0 | BR-RH-007 |
| RF-RH-039 | Visão de calendário de férias por departamento, com validação de **percentual máximo simultâneo da equipe em férias** (parâmetro por departamento, `[VERIFICAR COM RH DA EMPRESA]` o valor padrão) — alerta ao planejar programação que ultrapasse o limite, sem bloquear de forma rígida (decisão operacional do RH pode override com justificativa) | P0 | processo P4.3 |
| RF-RH-040 | Fracionamento e abono nunca excluídos fisicamente; alteração de programação já aprovada gera novo registro com motivo, preservando o histórico da versão anterior | P0 | CLAUDE.md §7, BR-RH-017 (padrão geral do projeto) |
| RF-RH-041 | Afastamento previdenciário (`Absence.type='inss'`) com duração acumulada > 6 meses (mesmo que descontínua, somando registros do mesmo funcionário) **zera** o período aquisitivo em curso automaticamente, abrindo um novo período a partir do retorno | P0 | BR-RH-008 |
| RF-RH-042 | KPI dedicado "Férias vencidas e a vencer (60/90 dias)" — contagem de `VacationAccrualPeriod` por `status`, meta explícita **zero dobra**, visível no painel de RH (RF-RH-074) | P0 | processo (f) do brief |
| RF-RH-043 | Nenhuma ação de férias (abertura de período, programação, abono) é executável sem os campos de dado sensível (salário para cálculo de 1/3 e abono) respeitarem a mesma segregação de RF-RH-006 | P0 | BR-RH-020 |

### 1.8 Afastamentos (Processo P5)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-044 | Criar **Absence**: `employee_id`, `type` (`doenca_ate_15d`/`auxilio_doenca_inss`/`acidente_trabalho`/`maternidade`/`paternidade`/`licenca_outras`), `start_date`, `expected_end_date`, `actual_end_date`, `cid` 🔒 (dado de saúde — acesso mais restrito que `rh` genérico, ver §6.4), `document` (`EmployeeDocument`), `s2230_confirmed_at` | P1 | processo P5.1 |
| RF-RH-045 | Registro de `Absence` atualiza `employees.status='license'` automaticamente enquanto o afastamento está em curso, e reverte para `active` no `actual_end_date` (ou status anterior aplicável) | P1 | processo P5.2 |
| RF-RH-046 | Licença-maternidade default de 120 dias corridos (CLT art. 392) e paternidade default de 5 dias (ADCT art. 10 §1º), ambos ajustáveis manualmente por adesão a programas específicos (ex.: Empresa Cidadã) `[VERIFICAR COM RH DA EMPRESA se há adesão]` | P1 | BR-RH-023 |
| RF-RH-047 | Suspensão automática de benefícios de VT/VR nos dias de afastamento, conforme a regra de custeio de cada `BenefitType` (RF-RH-051) | P1 | processo P5.2 |
| RF-RH-048 | Afastamento com `actual_end_date - start_date > 30 dias` bloqueia o retorno efetivo do funcionário até existir `EmployeeDocument` tipo `aso_retorno` com aptidão confirmada (mesma trava de RF-RH-030) | P1 | NR-7, BR-RH-021 |
| RF-RH-049 | Impacto de `Absence` sobre o período aquisitivo de férias em curso é calculado automaticamente a partir das regras do art. 133 da CLT (RF-RH-041 para o caso de zeramento) — campo `impacto_aquisitivo` derivado, não editável manualmente | P1 | BR-RH-008 |

### 1.9 Benefícios (Processo P6)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-050 | Criar **BenefitType** (catálogo): `name`, `category` (`vt`/`vr`/`va`/`saude`/`odonto`/`vida`/`outros`), `funding_rule` (`percentual`/`fixo`), `supplier` | P1 | processo P6.1 |
| RF-RH-051 | Criar **EmployeeBenefit**: `employee_id`, `benefit_type_id`, `enrollment_status` (`ativo`/`cancelado`), `enrolled_at`/`canceled_at`, `discount_value` 🔒, `company_cost_value`, `dependents` (JSON, apenas para saúde/odonto) | P1 | processo P6.2 |
| RF-RH-052 | Adesão/cancelamento de VT exige formalização de opt-in/opt-out (registro explícito, não apenas ausência de registro); desconto do empregado limitado a 6% do salário-base — validação bloqueante na gravação de `discount_value` para `category='vt'` | P1 | BR-RH-014 |
| RF-RH-053 | Cálculo/execução do desconto em folha **não é feito pelo ERP** — o ERP gera mensalmente um relatório/arquivo de descontos e custos por funcionário para o provedor de folha (desconto) e para o Financeiro (custo por centro de custo, via `Department.cost_center_id`) | P1 | processo P6.4, escopo BUY §6.1 |
| RF-RH-054 | `EmployeeBenefit` nunca excluído fisicamente; cancelamento usa `enrollment_status='cancelado'` com `canceled_at`, preservando histórico de custeio | P1 | CLAUDE.md §7 |

### 1.10 Treinamentos com Validade (Processo P7)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-055 | Criar **TrainingCourse**: `name`, `is_normative` (bool), `nr_code` (nullable, ex.: "NR-12"), `validity_months` (nullable — NULL = sem vencimento; **valor informado pela SST**, RH apenas administra o cadastro), `workload_hours` | P1 | processo P7.1 |
| RF-RH-056 | Matriz `JobPosition` × `TrainingCourse` obrigatório (N:N, RF-RH-026) — usada para determinar quais treinamentos são exigidos por cargo | P1 | processo P7.2 |
| RF-RH-057 | Criar **EmployeeTraining**: `employee_id`, `training_course_id`, `completed_at`, `instructor_or_provider`, `certificate_file_path`, `valid_until` (calculado a partir de `completed_at + validity_months`, quando aplicável) | P1 | processo P7.3 |
| RF-RH-058 | Alertas de reciclagem em D-60 e D-30 antes de `EmployeeTraining.valid_until`; relatório "quem não pode operar" por departamento (funcionários com treinamento normativo obrigatório vencido para o cargo/atividade) — insumo para PCP e SST | P1 | processo P7.4 |
| RF-RH-059 | Validade de treinamento de NR (`validity_months`) é sempre informada/atualizada pela SST (integração `sst`→`rh`, mesmo padrão de RF-RH-008); RH não define esse valor de forma independente | P1 | fronteira brief §(a) item 13 |

### 1.11 Espelho de Ponto Consolidado — Importação (Processo P8)

**Nota de escopo:** este grupo cobre apenas a **importação e consumo** dos
dados de ponto — o registro/tratamento de ponto em si é BUY/INTEGRAR, ver
§6.2.

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-060 | Criar **TimeSheetSummary**: `employee_id`, `competencia` (ano-mês), `horas_normais`, `he_50`, `he_100`, `adicional_noturno_horas`, `faltas_injustificadas`, `atrasos_min`, `saldo_banco_horas`, `data_limite_compensacao_banco` (BR-RH-010), `fonte` (`arquivo`/`manual`), `importado_em`, `importado_por` | P1 | processo P8.1 |
| RF-RH-061 | Importação em lote (upload de arquivo do programa de tratamento de ponto do fornecedor — formato definido com o fornecedor, `[VERIFICAR COM RH DA EMPRESA]`), com relatório de linhas aceitas/rejeitadas por competência | P1 | processo P8.1 |
| RF-RH-062 | `TimeSheetSummary` nunca recalcula regra legal de ponto — é consumido apenas para: (a) KPIs de absenteísmo/HE, (b) redução de férias por faltas (RF-RH-032), (c) alerta de banco de horas próximo do limite de compensação (`data_limite_compensacao_banco < 60 dias`) | P1 | BR-RH-010, escopo BUY §6.2 |
| RF-RH-063 | Divergência entre `TimeSheetSummary` importado e o custo de HE/adicional recebido em `PayrollImportItem` (RF-RH-070) gera pendência de conferência para o RH, sem bloquear nenhum fluxo | P1 | processo P8.3 |

### 1.12 Transferência / Alteração Contratual — Histórico (Processo P9)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-064 | Criar **EmployeeJobHistory**: `employee_id`, `job_position_id` (nullable, quando `JobPosition` não formalizado), `department_id`, `salary` 🔒, `effective_from`/`effective_to`, `reason` (`admissao`/`promocao`/`transferencia`/`reajuste`), `esocial_event_confirmed_at` | P1 | processo P9.1, entidade (c) |
| RF-RH-065 | Toda alteração de salário, cargo ou departamento do funcionário **cria um novo registro** em `EmployeeJobHistory` (`effective_from` = data da mudança, fecha `effective_to` do registro anterior) — nunca `UPDATE` direto e destrutivo de `employees.salary`/`position`/`department_id` sem rastro | P1 | BR-RH-022, CLT art. 468 |
| RF-RH-066 | Mudança de `department_id`/`job_position_id` dispara verificação de: ASO de mudança de risco pendente (bloqueia a efetivação da mudança até confirmação da SST, mesmo padrão de RF-RH-030) e treinamentos obrigatórios do novo cargo (gera pendência, não bloqueante) | P1 | processo P9.3 |

### 1.13 Quotas Legais — PCD e Aprendiz (Indicador)

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-067 | Adicionar campo `pcd` (bool) 🔒 a `Employee` (extensão do modelo existente, campo novo nullable — não quebra registros atuais); `work_regime='aprendiz'` já existe e é reaproveitado para o indicador de aprendiz, sem campo novo | P1 | BR-RH-018, BR-RH-019 |
| RF-RH-068 | Dashboard/indicador: quota PCD exigida (2% de 100 a 200 empregados, escala legal) vs. realizado (`count(pcd=true) / count(status='active')`); quota de aprendiz exigida (5% a 15% das funções que demandam formação profissional) vs. realizado | P1 | BR-RH-018, BR-RH-019 |
| RF-RH-069 | Indicador de quota é somente informativo (não bloqueia nenhuma operação de RH) — decisão de contratação para atingir a quota é de negócio, fora do sistema | P1 | processo (f) do brief |

### 1.14 Custo Importado da Folha — `PayrollImport`

**Nota de escopo:** este grupo cobre apenas a **importação** do resultado
já calculado pelo provedor de folha — o cálculo em si é BUY/INTEGRAR, ver
§6.1.

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-070 | Criar **PayrollImportBatch** (cabeçalho: `competencia`, `importado_em`, `importado_por`, `fonte`) e **PayrollImportItem** (`employee_id`, `bruto` 🔒, `encargos`, `liquido` 🔒, `custo_total`, `department_id`/`cost_center_id`) | P1 | processo (b) entidade PayrollImport |
| RF-RH-071 | Rateio de `custo_total` por `cost_center_id` reaproveitando Centros de Custo já existente no ERP (`Department.cost_center_id`, CLAUDE.md §1) — alimenta relatório financeiro de custo de pessoal | P1 | integração RH→Financeiro (brief §e) |
| RF-RH-072 | Acesso de leitura a `bruto`/`liquido` de `PayrollImportItem` é **mais restrito** que a segregação padrão de `rh` (RF-RH-006): exige módulo `rh` **e** nível equivalente a `financeiro` ou `admin` — dado financeiro individual de alta sensibilidade, mesmo racional do tratamento de contencioso em `juridico` (ver `accessModules.ts`, comentário do módulo `juridico`) | P1 | LGPD art. 5º/6º, decisão de reforço §6.4 |
| RF-RH-073 | `PayrollImportItem` alimenta o KPI "Custo de pessoal por centro de custo" (RF-RH-074) sem expor valores individuais fora do nível de acesso de RF-RH-072 (agregação por centro de custo é visível a `financeiro` sem o detalhamento por funcionário) | P1 | processo (f) do brief |

### 1.15 Painel/KPIs de RH

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-074 | Painel de RH consolidando os KPIs do brief §(f): turnover mensal, absenteísmo, férias vencidas/a vencer (RF-RH-042), HE por departamento, saldo de banco de horas próximo do limite, custo de pessoal por centro de custo (agregado), treinamentos vencidos/a vencer, contratos de experiência vencendo, quota PCD/aprendiz, headcount por departamento/turno, ASOs/documentos vencidos | P1 | brief §(f) |
| RF-RH-075 | Nenhum KPI do painel expõe dado individual sensível além do nível de acesso já definido para a entidade de origem (RF-RH-006/RF-RH-072) — agregações (contagens, somas por centro de custo) são sempre seguras para exibição a `rh:operate`; drill-down para dado individual exige o nível específico | P1 | LGPD art. 6º (minimização) |
| RF-RH-076 | Alertas de vencimento (férias, experiência, ASO/documentos, CNH — quando aplicável via Facilities, treinamentos) seguem o mesmo padrão "não podem ser esquecidos silenciosamente" já adotado em RNF-JUR-05/RNF-SST-04/RNF-FAC-02: verificação ativa ao acessar o painel, mesmo sem rotina agendada | P0 | RNF geral §3 |

### 1.16 P2 — Avaliação de Desempenho e Recrutamento Mínimo

| RF | Descrição | Prioridade | BR |
|---|---|---|---|
| RF-RH-077 | Criar **PerformanceReview** (mínimo viável): `employee_id`, `period`, `reviewer_id`, `score`/`notes`, `status` (`rascunho`/`concluida`) — sem workflow de calibração ou múltiplas etapas nesta rodada | P2 | brief §(a) item 14 |
| RF-RH-078 | Criar **JobVacancy**: `job_position_id`, `department_id`, `status` (`aberta`/`em_triagem`/`fechada`/`cancelada`), `opened_at`, `closed_at` | P2 | brief §(a) item 15 |
| RF-RH-079 | Criar **Candidate**: `job_vacancy_id`, `name`, `contact`, `resume_file_path`, `stage` (`triagem`/`entrevista`/`aprovado`/`reprovado`), `notes` | P2 | brief §(a) item 15 |
| RF-RH-080 | `Candidate` aprovado pode originar um `AdmissionProcess` (RF-RH-007) pré-preenchido com os dados já coletados — conveniência, não obrigatório | P2 | integração interna |
| RF-RH-081 | Ferramenta de ATS de mercado permanece alternativa válida a este RF (`[PRÁTICA DE MERCADO]`, citado no brief); RF-RH-078/079 cobrem apenas o mínimo viável caso a decisão seja construir internamente | P2 | brief §(a) item 15 |

---

## 2. Entidades — Referência Rápida

Modelagem de campo definitiva é responsabilidade do `AdmDBA`.

| Entidade | Tipo | Observação |
|---|---|---|
| `Employee` (`employees`) | reutilizada, estendida | + `pcd` (RF-RH-067), + `job_position_id` opcional (RF-RH-025) |
| `Department` (`departments`) | reutilizada | sem alteração |
| `JobPosition` | nova | RF-RH-024 a 026 |
| `AdmissionProcess` | nova | RF-RH-007 a 012 |
| `EmployeeContract` | nova | RF-RH-013 a 016 |
| `TerminationProcess` | nova | RF-RH-017 a 023 |
| `EmployeeDocument` | nova | RF-RH-027 a 030 |
| `VacationAccrualPeriod` | nova | RF-RH-031 a 034, 041 a 043 |
| `VacationSchedule` | nova | RF-RH-035 a 040 |
| `Absence` | nova | RF-RH-044 a 049 (🔒 reforçado, `cid`) |
| `BenefitType` / `EmployeeBenefit` | novas | RF-RH-050 a 054 |
| `TrainingCourse` / `EmployeeTraining` | novas | RF-RH-055 a 059 |
| `TimeSheetSummary` | nova | RF-RH-060 a 063 |
| `EmployeeJobHistory` | nova | RF-RH-064 a 066 |
| `PayrollImportBatch` / `PayrollImportItem` | novas | RF-RH-070 a 073 (🔒 reforçado, `bruto`/`liquido`) |
| `PerformanceReview` | nova | RF-RH-077 (P2) |
| `JobVacancy` / `Candidate` | novas | RF-RH-078/079 (P2) |
| `Asset` (`assets`) | reutilizada | checklist de devolução no desligamento (RF-RH-023) |
| `CostCenter` (`cost_centers`) / `Department.cost_center_id` | reutilizada | RF-RH-071 |
| `AccessModules` (`rh`) | reutilizada | RF-RH-006, 072 |

---

## 3. Requisitos Não Funcionais Específicos de RH (RNF-RH)

Não duplica `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`; o Bloco 0 (LGPD
em `employees`) e a segregação de campo de `rh` (BR-RH-020) já estão
tratados e referenciados, não repetidos aqui.

| RNF | Descrição | Referência relacionada |
|---|---|---|
| RNF-RH-01 | Dado sensível de saúde (`Absence.cid`) exige acesso **mais restrito** que a segregação padrão de campo do módulo `rh`: leitura completa exige `authorizeModule('rh', ...)` bloqueando a rota (não basta ser autenticado, nem basta ter `rh:view` — decisão exata de nível cabe ao `ArquitetoSoftwareAPI`), mesmo padrão já usado em `sst` para ASO/Acidente/CAT | LGPD art. 5º II; precedente `sst`/`juridico` em `accessModules.ts` |
| RNF-RH-02 | Alertas de prazo legal (férias/concessivo, contrato de experiência, CNH — quando integrado a Facilities, documentos/ASO, treinamentos normativos) seguem o mesmo padrão "não podem ser esquecidos silenciosamente" já adotado em RNF-JUR-05/RNF-SST-04/RNF-FAC-02 — verificação ativa ao acessar o painel de RH, mesmo sem rotina agendada de background job | RNF geral §3 |
| RNF-RH-03 | Nenhum cálculo de folha de pagamento (INSS/IRRF/FGTS/13º/rescisão) ou de regra legal de ponto (HE, adicional noturno, banco de horas) é implementado dentro do ERP — são consumidos como dado importado de sistemas terceiros homologados (ver §6.1/6.2). Esta é uma restrição de escopo, não apenas uma recomendação: nenhum RF deste bloco pode ser interpretado como autorização para construir motor de cálculo trabalhista/fiscal | Decisão explícita do brief §(g) |
| RNF-RH-04 | Histórico contratual (`EmployeeContract`, `EmployeeJobHistory`, `VacationAccrualPeriod`, `TerminationProcess`) é imutável por natureza de auditoria trabalhista — alterações sempre geram novo registro com vigência, nunca sobrescrevem o anterior | CLT art. 468; CLAUDE.md §7 ("Sem Soft Delete Padrão") |
| RNF-RH-05 | `PayrollImportItem.bruto`/`liquido` e `Absence.cid` não podem aparecer em nenhum export/relatório agregado sem passar pelo controle de nível de acesso reforçado (RF-RH-072, RNF-RH-01) — inclui exports CSV/PDF do painel de RH | LGPD art. 6º (minimização), art. 46 (segurança) |

---

## 4. Casos de Uso — Fluxos Principais

Atores conforme perfis reais do projeto: perfil de acesso configurável por
módulo (`rh` — segregação de campo, mais os níveis reforçados de RNF-RH-01/
RF-RH-072), papéis funcionais do brief (Analista/Gestor de RH), e
integrações com SST, Financeiro, Patrimônio e Auth conforme brief §(e).

### UC-67: Gerenciar Período Aquisitivo e Concessivo de Férias com Alertas de Dobra

**Ator principal:** Analista de RH (perfil `rh`).
**Atores secundários:** CFO (recebe alerta crítico de dobra iminente),
Financeiro (confirma pagamento), gestor de departamento (concordância de
programação/fracionamento).

**Pré-condições:**
- Funcionário ativo com `hire_date` registrada.
- `TimeSheetSummary` do período aquisitivo disponível para cálculo de
  faltas (RF-RH-032) — na ausência, o sistema assume zero faltas e sinaliza
  a lacuna, não bloqueia a abertura do período.

**Fluxo Principal:**
1. Sistema abre automaticamente um `VacationAccrualPeriod` na admissão e a
   cada aniversário de 12 meses de contrato (RF-RH-031).
2. Sistema calcula `dias_direito` a partir das faltas injustificadas do
   período (RF-RH-032) e `fim_concessivo` (RF-RH-033).
3. RH programa a fração de férias (`VacationSchedule`): datas, dias, abono
   opcional, respeitando o limite de fracionamento (RF-RH-035) e a
   antecedência de aviso de 30 dias (RF-RH-037).
4. Sistema valida o percentual máximo simultâneo da equipe em férias do
   departamento antes de confirmar a programação (RF-RH-039).
5. Sistema notifica o Financeiro/provedor de folha para confirmar o
   pagamento até 2 dias antes do início (RF-RH-038).
6. Funcionário goza as férias; RH confirma o gozo, atualizando
   `dias_gozados` do período.

**Fluxos Alternativos:**
- **A1 (Abono pecuniário):** RH registra `abono=true` até 15 dias antes do
  fim do período aquisitivo, respeitando o limite de 1/3 (RF-RH-036).
- **A2 (Afastamento zera o aquisitivo):** afastamento previdenciário >6
  meses zera o período em curso e abre um novo a partir do retorno
  (RF-RH-041).

**Fluxo de Exceção:**
- **E1 (Concessivo a vencer):** alertas escalonados em 6/3/1 mês antes de
  `fim_concessivo` (RF-RH-034) — "O QUE" (período concessivo se aproxima
  do limite), "POR QUE" (CLT art. 134 — descumprir gera dobra), "O QUE
  FAZER" (programar férias imediatamente ou justificar).
- **E2 (Concessivo vencido):** `status` muda automaticamente para
  `vencido_dobra`, gera alerta crítico ao RH e ao CFO — nunca vence
  silenciosamente (RF-RH-034, RNF-RH-02).

**Pós-condições:**
- `VacationAccrualPeriod` com status refletindo a realidade
  (`em_curso`/`programado`/`gozado`/`vencido_dobra`).
- KPI "Férias vencidas e a vencer" sempre calculável e atualizado
  (RF-RH-042).

---

### UC-68: Controlar Contrato de Experiência com Alerta de Vencimento

**Ator principal:** Analista de RH (perfil `rh`).
**Atores secundários:** Gestor da área (decide prorrogar/efetivar/rescindir).

**Pré-condições:**
- Funcionário admitido em regime CLT com `EmployeeContract.type='experiencia'`.

**Fluxo Principal:**
1. Na admissão, RH registra o contrato de experiência com `period_1_end_date`
   (RF-RH-013), respeitando o limite total de 90 dias (RF-RH-014).
2. Sistema agenda alertas D-10 e D-3 antes de `period_1_end_date`
   (RF-RH-016).
3. Gestor decide: prorrogar (`period_2_end_date`, uma única vez —
   RF-RH-015), efetivar (`status='efetivado'`) ou rescindir (encaminha para
   UC-69, `TerminationProcess` tipo `termino_experiencia`).

**Fluxos Alternativos:**
- **A1 (Prorrogação):** sistema recalcula o novo alerta D-10/D-3 sobre
  `period_2_end_date`, ainda respeitando o teto de 90 dias totais
  (RF-RH-014).

**Fluxo de Exceção:**
- **E1 (Vencimento sem decisão):** `status` muda automaticamente para
  `indeterminado_automatico`, `work_regime` é atualizado para refletir a
  efetivação de fato, e é gerado alerta crítico ao gestor de RH — "O QUE"
  (contrato de experiência venceu sem decisão registrada), "POR QUE" (CLT
  art. 445/451 — silêncio vira prazo indeterminado), "O QUE FAZER"
  (regularizar a documentação de efetivação imediatamente) — RF-RH-016.
- **E2 (Tentativa de segunda prorrogação):** sistema rejeita a gravação —
  RF-RH-015.

**Pós-condições:**
- Nenhum contrato de experiência ultrapassa 90 dias sem que o sistema
  tenha registrado uma decisão explícita ou o alerta crítico automático.

---

### UC-69: Executar Admissão com Gate de ASO e Confirmação de eSocial

**Ator principal:** Analista de RH (perfil `rh`).
**Atores secundários:** SST (fornece status de aptidão do ASO admissional),
provedor de folha (confirma transmissão do S-2200, fora do ERP).

**Pré-condições:**
- Vaga aprovada (opcional) ou processo avulso; candidato com documentos
  mínimos disponíveis.

**Fluxo Principal:**
1. RH abre `AdmissionProcess` com checklist de documentos (RF-RH-007).
2. RH solicita ASO admissional; processo entra em `aso_pendente` até a SST
   confirmar aptidão (RF-RH-008).
3. RH cadastra `employees` + `EmployeeContract` inicial + `EmployeeJobHistory`
   inicial (RF-RH-009).
4. RH aguarda confirmação do provedor de folha de que o S-2200 foi
   transmitido; registra `esocial_s2200_confirmed_at` (RF-RH-010).
5. Sistema encaminha pendências não bloqueantes: adesão a benefícios,
   treinamentos obrigatórios (RF-RH-011).

**Fluxos Alternativos:**
- **A1 (Candidato veio de `Candidate` aprovado):** dados pré-preenchidos a
  partir do processo seletivo (RF-RH-080).

**Fluxo de Exceção:**
- **E1 (ASO inapto):** processo não avança para conclusão; RH registra a
  decisão (não contratar / adiar) — "O QUE" (candidato inapto no ASO
  admissional), "POR QUE" (NR-7/PCMSO), "O QUE FAZER" (encerrar ou aguardar
  reavaliação conforme orientação da SST) — RF-RH-008/030.
- **E2 (Data de início sem confirmação de S-2200):** sistema bloqueia a
  edição da data de início efetiva até o campo de confirmação ser
  preenchido — RF-RH-010.

**Pós-condições:**
- `AdmissionProcess` concluído com todos os gates respeitados;
  `employees`/`EmployeeContract`/`EmployeeJobHistory` consistentes entre si.

---

### UC-70: Executar Demissão com Checklist e Prazo de Verbas

**Ator principal:** Analista de RH (perfil `rh`).
**Atores secundários:** SST (ASO demissional), Financeiro (prazo de
pagamento), Patrimônio (devolução de ativos), Auth (desativação de usuário).

**Pré-condições:**
- Funcionário ativo com decisão de desligamento formalizada.

**Fluxo Principal:**
1. RH abre `TerminationProcess`: tipo, `notice_date`, modalidade de aviso
   (RF-RH-017), com aviso prévio proporcional sugerido (RF-RH-019).
2. RH solicita ASO demissional à SST (RF-RH-020).
3. RH confere o checklist de devolução de ativos/EPI com Patrimônio
   (RF-RH-023).
4. Provedor de folha calcula as verbas e devolve o TRCT; RH anexa o
   arquivo (RF-RH-021).
5. Sistema calcula `payment_deadline` = `termination_date + 10 dias` e
   alerta o Financeiro (RF-RH-018).
6. RH conclui o processo: `employees.status='fired'` + `dismissal_date`,
   `user_id` desativado no mesmo ato (RF-RH-022).
7. RH confirma `s2299_confirmed_at` quando o provedor de folha informar o
   envio.

**Fluxos Alternativos:**
- **A1 (Término de experiência):** `termination_type='termino_experiencia'`
  vem diretamente de UC-68 E1 (rescisão como decisão do gestor).

**Fluxo de Exceção:**
- **E1 (Prazo de pagamento em risco):** alerta ao Financeiro em D-3 antes
  de `payment_deadline`; se vencer sem confirmação, alerta crítico — "O
  QUE" (verbas rescisórias não confirmadas como pagas), "POR QUE" (CLT
  art. 477 §6º — multa ao empregador), "O QUE FAZER" (Financeiro confirma
  o pagamento ou escala urgência ao provedor de folha) — RF-RH-018.
- **E2 (Checklist de ativos pendente):** processo não pode ser marcado
  `concluido` enquanto houver ativo/EPI vinculado ao funcionário sem
  devolução registrada — RF-RH-023.

**Pós-condições:**
- `TerminationProcess` concluído, `employees` e `user_id` refletindo o
  desligamento, TRCT anexado, nenhuma pendência de ativo em aberto.

---

### UC-71: Registrar Afastamento com Impacto em Férias e Retorno Condicionado a ASO

**Ator principal:** Analista de RH (perfil `rh`, com acesso reforçado a
`Absence.cid` — RNF-RH-01).
**Atores secundários:** SST (ASO de retorno ao trabalho, quando aplicável),
Financeiro (impacto em benefícios).

**Pré-condições:**
- Funcionário ativo; documentação médica do afastamento disponível
  (atestado/CAT/laudo do INSS).

**Fluxo Principal:**
1. RH registra `Absence`: tipo, datas, `cid` (campo de acesso reforçado)
   (RF-RH-044).
2. Sistema atualiza `employees.status='license'` automaticamente
   (RF-RH-045).
3. Sistema suspende VT/VR nos dias afastados conforme regra de custeio do
   benefício (RF-RH-047).
4. Sistema calcula o impacto sobre o período aquisitivo de férias em curso
   (RF-RH-049), incluindo o zeramento automático quando aplicável
   (RF-RH-041).
5. No retorno, se o afastamento superou 30 dias, RH confirma a existência
   de `EmployeeDocument` tipo `aso_retorno` com aptidão válida antes de
   reverter `employees.status` (RF-RH-048).
6. RH confirma `s2230_confirmed_at` quando o provedor de folha informar o
   envio do evento.

**Fluxos Alternativos:**
- **A1 (Licença-maternidade/paternidade):** duração default aplicada
  automaticamente (120/5 dias), ajustável conforme adesão a programa
  específico (RF-RH-046).

**Fluxo de Exceção:**
- **E1 (Retorno sem ASO após afastamento longo):** sistema bloqueia a
  reversão de `employees.status` para `active` até existir o ASO de
  retorno válido — "O QUE" (funcionário não pode retornar ao posto), "POR
  QUE" (NR-7 — ASO de retorno obrigatório para afastamento >30 dias), "O
  QUE FAZER" (SST agenda e confirma o exame) — RF-RH-048.
- **E2 (Acesso a `cid` sem nível reforçado):** usuário com `rh:view`
  padrão, mas sem o nível reforçado de RNF-RH-01, recebe o registro de
  `Absence` sem o campo `cid` — nunca 403 total no restante do registro,
  apenas omissão do campo sensível, mesmo padrão de segregação de campo já
  usado em `rh` (RF-RH-006).

**Pós-condições:**
- `Absence` completo, com impacto sobre férias já refletido, retorno
  condicionado a ASO válido quando aplicável.

---

## 5. Regras de Negócio — Mapeamento (BR-RH → RF)

As regras de negócio já estão formalizadas com base legal em
`docs/business/briefs/BRIEF_RH_2026-08-06.md`, seção (d) — `BR-RH-001` a
`BR-RH-024`. Este bloco não as reescreve; a Matriz de Rastreabilidade (§8)
amarra cada uma ao(s) RF(s) e UC(s) correspondentes. Quando este bloco for
consolidado, as regras devem ser transcritas em
`docs/business/BUSINESS_RULES.md`, mantendo os códigos originais — mesmo
procedimento dos Blocos 1 (SST), 2 (TI), 3 (JUR), 4 (FAC) e 5 (MKT).

**Nota:** `BR-RH-020` já está marcada `✅ REMEDIADO em 2026-08-06` no
próprio brief — este bloco não gera um novo RF de correção para ela, apenas
referencia (RF-RH-006).

---

## 6. Decisões e Pendências para Arquitetos

### 6.1 Folha de Pagamento — Recomendação BUY/INTEGRAR (não construir)

**Decisão:** o ERP **não implementa** motor de cálculo de folha (INSS,
IRRF, FGTS, 13º salário, provisões, DCTFWeb, eSocial S-1200/S-1210). Esta é
uma decisão de escopo herdada integralmente do brief §(g), fundamentada em:
1. **Complexidade regulatória viva** — tabelas mudam ao menos anualmente
   (as documentadas em `docs/rh/02-FOLHA_PAGAMENTO.md` são de 2024, já
   defasadas em 2026).
2. **Risco** — erro de folha gera passivo trabalhista e autuação fiscal
   auditável pelo eSocial; o ERP acabou de sair de remediação P0 de
   go-live (CLAUDE.md §5) e não deve assumir um domínio de altíssimo risco
   fora do core de manufatura.
3. **Custo** — bureau de folha/SaaS especializado é mais barato que manter
   um motor de cálculo trabalhista/fiscal em produção `[PRÁTICA DE MERCADO]`.

**O que o ERP expõe/consome para viabilizar a integração** (não é RF de
desenvolvimento de folha, é contrato de dados):
- **Saída (ERP → provedor de folha):** "arquivo de movimento" mensal —
  admissões (`AdmissionProcess` concluído), desligamentos
  (`TerminationProcess`), afastamentos (`Absence`), férias
  (`VacationSchedule`), adesões/descontos de benefícios (`EmployeeBenefit`),
  totais de ponto (`TimeSheetSummary`). Formato exato do arquivo:
  `[VERIFICAR COM RH DA EMPRESA]` junto ao provedor contratado — ainda não
  existe contrato assinado no momento deste bloco (ver priorização P0 do
  brief, "contratação do provedor de folha").
- **Entrada (provedor de folha → ERP):** custo por funcionário/centro de
  custo, líquidos a pagar, guias (INSS/FGTS/IRRF), confirmações de eventos
  eSocial — consumido via `PayrollImportBatch`/`Item` (RF-RH-070 a 073).
- Este contrato de integração (endpoints, formato de arquivo, autenticação)
  é responsabilidade do `ArquitetoSoftwareAPI` quando o provedor for
  contratado; nenhum RF deste bloco assume a existência de uma API externa
  específica.

### 6.2 Ponto Eletrônico (REP) — Recomendação BUY/INTEGRAR (não construir)

**Decisão:** o ERP **não implementa** REP (Registrador Eletrônico de
Ponto) nem o programa de tratamento de ponto. Fundamentação herdada do
brief §(g):
1. Barreira regulatória objetiva — Portaria MTP 671/2021 exige REP
   certificado/registrado (REP-C/REP-A/REP-P), inviável para
   desenvolvimento de uso interno único.
2. O programa de tratamento de ponto também é regulado (gera AEJ para
   fiscalização) — comprar relógio + software homologados do mesmo
   fornecedor elimina o risco.

**O que o ERP expõe/consome:** apenas a **importação** do espelho
consolidado mensal (RF-RH-060/061), nunca o registro de marcação em si nem
o cálculo de HE/adicional noturno/banco de horas — esses são consumidos
como dado já calculado pelo sistema de ponto externo.

### 6.3 Reforço de acesso a dado financeiro individual (`PayrollImportItem`)

O desenho padrão de `rh` (segregação de campo, não de rota — BR-RH-020) é
adequado para salário/CPF/dados bancários de `Employee`, mas
`PayrollImportItem.bruto`/`liquido` é um dado agregado de folha (inclui
proventos e descontos que `Employee.salary` sozinho não revela).
Recomenda-se ao `ArquitetoSoftwareAPI` avaliar se o nível de acesso correto
é: (a) reaproveitar `rh` com um sub-nível adicional (`rh:payroll`, análogo a
`approve` em outros módulos), ou (b) exigir módulo `rh` **e**
`role==='admin'`/`financeiro` simultaneamente (como descrito em RF-RH-072),
seguindo o precedente já usado para o relatório de contencioso em
`juridico` (`BR-JUR-050`, ver comentário em `accessModules.ts`). Decisão
final de implementação cabe ao arquiteto; a exigência funcional (acesso
mais restrito que o padrão `rh`) é o que este bloco fixa.

### 6.4 `Absence.cid` — mesmo racional de reforço

Idêntico ao 6.3, mas para dado de saúde (CID). Recomenda-se seguir
exatamente o padrão já usado por `sst` para ASO/Acidente/CAT: leitura
completa do campo `cid` exige `authorizeModule` bloqueando o acesso, não
apenas checagem de flag dentro do use case. Decisão final de nível
(`rh` reforçado vs. reaproveitar `sst`, já que o dado é de mesma natureza)
cabe ao `ArquitetoSoftwareAPI` — este bloco não assume que `Absence`
pertence ao módulo `sst` só porque o dado é de saúde: o registro de
afastamento em si é um evento de RH (impacta férias, contrato, folha), a
SST participa apenas do ASO de retorno (já tratado como integração em
RF-RH-020/048).

### 6.5 Itens `[VERIFICAR COM RH DA EMPRESA]` — parametrização obrigatória

Repassados do brief (não resolvidos por este bloco, apenas mantidos como
configuração obrigatória, nunca hard-code):

1. Versão vigente do Manual de Orientação do eSocial (MOS) junto à
   contabilidade — usada para os prazos exatos de S-2200/S-2206/S-2230/
   S-2299 (RF-RH-010, RF-RH-020, RF-RH-064, RF-RH-023).
2. Percentual máximo de equipe simultaneamente em férias por departamento
   (RF-RH-039) — parâmetro, não hard-code.
3. Formato do "arquivo de movimento" com o provedor de folha (RF-RH-053,
   §6.1) — depende de contrato ainda não assinado.
4. Adesão (ou não) ao programa Empresa Cidadã para licença-paternidade
   estendida (RF-RH-046).
5. Confirmação se a organização já está de fato na faixa de quota PCD/
   aprendiz (100-150 colaboradores é limítrofe conforme a contagem exata
   no momento da implementação) — RF-RH-068.
6. Estado atual do controle de ponto (manual/planilha/relógio já
   homologado?) — calibra a transição para importação (RF-RH-060/061), sem
   impacto de modelagem.

### 6.6 Fora de escopo deste bloco (herdado do brief, reforçado)

Cálculo de folha de pagamento em si (§6.1); registro/tratamento de ponto
eletrônico em si (§6.2); mensageria eSocial (o ERP cobra confirmação, nunca
transmite); definição de periodicidade de ASO/PCMSO e validade de NR
(SST); lançamento contábil de provisões de férias/13º (Financeiro executa,
RH origina o dado); ATS completo de mercado (RF-RH-078/079 cobrem apenas o
mínimo viável). Nenhum RF acima cobre esses itens.

---

## 7. Priorização Consolidada

**Nota de correção (`AuditorIntegrador`, 2026-08-09):** os totais por
prioridade abaixo foram recontados diretamente das 81 linhas `RF-RH-NNN`
de §1 (grep determinístico, não estimativa) — a versão original desta
seção citava 25/40/12, que não batia com a contagem real de tags `P0`/
`P1`/`P2` em cada linha. Números corretos: **19 P0, 49 P1, 8 P2** (mais 5
RFs legados renumerados em §1.0, sem tag de prioridade própria — total
19+49+8+5=81).

### P0 — bloqueante (risco legal imediato), 19 RFs
Segregação de acesso já remediada (RF-RH-006); Contrato de experiência
completo (RF-RH-013 a 016, 4 RFs); Férias completo (RF-RH-031 a 043, 13
RFs); Alertas "nunca esquecidos silenciosamente" como princípio geral
(RF-RH-076). Total: 1+4+13+1 = 19.

### P1 — eficiência/controle/conformidade, 49 RFs
Admissão/demissão como workflow com gates (RF-RH-007 a 012, 017 a 023);
Documentos do funcionário (RF-RH-027 a 030); Afastamentos (RF-RH-044 a
049); Benefícios (RF-RH-050 a 054); Treinamentos com validade (RF-RH-055 a
059); Espelho de ponto importado (RF-RH-060 a 063); Transferência/histórico
contratual (RF-RH-064 a 066); Quotas PCD/aprendiz (RF-RH-067 a 069);
PayrollImport (RF-RH-070 a 073); Painel de KPIs (RF-RH-074/075).

### P2 — conveniência/valor gerencial sem prazo legal, 8 RFs
Cargos formais — `JobPosition` (RF-RH-024 a 026); Avaliação de desempenho
(RF-RH-077); Recrutamento mínimo (RF-RH-078 a 081).

### Fora de build (BUY/INTEGRAR) — não contabilizado como RF de desenvolvimento
Folha de pagamento (§6.1); Ponto eletrônico/REP (§6.2). Tratados como
RNF-RH-03 (restrição de escopo) e como pré-requisitos organizacionais
("contratação do provedor de folha + REP", citada no brief como item P0 de
negócio, não de sistema).

---

## 8. Matriz de Rastreabilidade — Processo → BR → RF → UC

| Processo do brief | BR-RH | RF-RH | UC |
|---|---|---|---|
| Cadastro/Departamento/Turno (já existente) | — | 001–005 | UC-11 (já registrado) |
| Segregação de acesso (transversal) | 020 (✅ remediado) | 006, 072, 075 | referenciado em todos |
| P1 — Admissão | 017, 021 | 007–012 | UC-69 |
| P2 — Contrato de experiência | 001, 002 | 013–016 | UC-68 |
| P3 — Demissão | 015, 016, 021, 024 | 017–023 | UC-70 |
| item 4 — Cargos (`JobPosition`) | — | 024–026 | sem UC dedicado (P2, ver §9) |
| P1.5 — Documentos do funcionário | 021 | 027–030 | UC-69 (ASO admissional), UC-71 (ASO retorno) |
| P4 — Férias | 003–008 | 031–043 | UC-67 |
| P5 — Afastamentos | 008, 023 | 044–049 | UC-71 |
| P6 — Benefícios | 014 | 050–054 | sem UC dedicado (P1, ver §9) |
| P7 — Treinamentos com validade | — | 055–059 | sem UC dedicado (P1, ver §9) |
| P8 — Espelho de ponto (importação) | 009–011 | 060–063 | sem UC dedicado (P1, ver §9) |
| P9 — Transferência/histórico contratual | 022 | 064–066 | sem UC dedicado (P1, ver §9) |
| item 16 — Quotas PCD/aprendiz | 018, 019 | 067–069 | sem UC dedicado (P1, ver §9) |
| PayrollImport (custo importado) | 017 | 070–073 | sem UC dedicado (P1, ver §9) |
| Painel de KPIs (transversal) | — | 074–076 | referenciado em todos |
| item 14/15 — Avaliação/Recrutamento (P2) | — | 077–081 | sem UC dedicado (P2, ver §9) |
| Folha de pagamento (BUY) | 017 | fora de RF, ver §6.1 | — |
| Ponto eletrônico (BUY) | 009–012 | fora de RF, ver §6.2 | — |

---

## 9. Pendência declarada — Casos de Uso não detalhados neste bloco

Este bloco detalha (com fluxo principal/alternativo/exceção completos) os 5
fluxos de maior prioridade legal e de maior complexidade transacional:
férias (UC-67, o núcleo de risco legal do bloco), contrato de experiência
(UC-68), admissão (UC-69), demissão (UC-70) e afastamentos (UC-71).
**Cargos (`JobPosition`, P2), Benefícios (P1), Treinamentos com validade
(P1), Espelho de ponto/importação (P1), Transferência/histórico contratual
(P1), Quotas PCD/aprendiz (P1) e Avaliação/Recrutamento (P2) ficam sem UC
formal detalhado nesta passada** — são majoritariamente CRUDs de
complexidade moderada, com as regras não triviais já cobertas pelos RFs
correspondentes (§1) e por precedentes de outros módulos do pipeline (ex.:
alerta de vencimento já documentado em UC-58/UC-59 de Facilities e em SST/
TI/JUR). Recomenda-se que a próxima passada do `AnalistaNegocios` no
pipeline de RH formalize UC-72 (Benefícios), UC-73 (Treinamentos) e UC-74
(Transferência/histórico contratual) antes da modelagem definitiva, caso o
`ArquitetoSoftwareAPI` julgue necessário fluxo documentado além do RF —
mesmo critério já usado no Bloco 4 (Facilities) para Reserva de
Recursos/Correspondência.

---

## Referências

- `docs/business/briefs/BRIEF_RH_2026-08-06.md` — brief de domínio
  (insumo primário).
- `docs/business/BLOCO_1_SST_REQUISITOS.md`,
  `docs/business/BLOCO_2_TI_REQUISITOS.md`,
  `docs/business/BLOCO_3_JUR_REQUISITOS.md`,
  `docs/business/BLOCO_4_FAC_REQUISITOS.md`,
  `docs/business/BLOCO_5_MKT_REQUISITOS.md` — mesmo padrão de entregável.
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` §9 — índice executivo de RF
  por módulo (seção "RH" a substituir integralmente pela renumeração deste
  bloco quando consolidado).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNF gerais do projeto.
- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — UC-01 a
  UC-66 (numeração continuada a partir de UC-67 neste bloco).
- `server/src/models/Employee.ts`, `Department.ts`, `WorkCenterShift.ts`,
  `Asset.ts` — âncoras de integração/precedente.
- `server/src/modules/employees/` — código atual do módulo (CRUD básico +
  segregação de campo sensível já implementada).
- `server/src/shared/domain/accessModules.ts` — catálogo RBAC, chave `rh`
  já existente (comentário de origem, BR-RH-020).
- `docs/administrativo/04-PERFIS_ACESSO.md` §"Caso especial: módulo `rh`" —
  descrição da segregação de campo já em produção-candidata.
- `docs/rh/00-README.md`, `docs/rh/02-FOLHA_PAGAMENTO.md` — documentação
  departamental atual (04-FREQUENCIA, 05-FERIAS, 06-TREINAMENTOS,
  07-ESOCIAL listados no índice mas ainda não escritos — pendência de
  consolidação documental para depois da implementação, fora do escopo
  deste bloco de requisitos).
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamento 02 (RH).

**Fim do BLOCO 6.**
