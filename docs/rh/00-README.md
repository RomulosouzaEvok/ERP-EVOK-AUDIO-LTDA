# Modulo RH - ERP EVOK AUDIO

> **Estado em 2026-08-12 — o modulo saiu do papel.** Os 10 grupos do BLOCO 6
> tem backend real (`server/src/modules/rh/`, rotas `/api/rh/*`) e **tela
> web** (`client/src/pages/hr/HrPage.tsx`, 10 abas): Funcionarios,
> Departamentos, Admissao, Contratos de experiencia, Demissao, Ferias,
> Afastamentos, Beneficios, Treinamentos e (NOVO, mesmo dia) Frequencia —
> importador de ponto via AEJ (decisao tomada em 2026-08-12: INTEGRAR com o
> software da administradora dos REPs RWTech/Pointline, nao administrar o
> ponto — ver `04-FREQUENCIA.md`, implementado). Todos os endpoints de
> escrita gravam trilha em `audit_logs` (guarda
> `server/tests/unit/audit-coverage-guard.test.ts`). O que segue **sem**
> implementacao: folha de pagamento propria (existe so importacao de folha
> externa — `hr_payroll_import_batches`) e envio real ao eSocial (hoje o
> sistema registra confirmacoes manuais dos eventos). Detalhes de contrato de
> API em `docs/business/BLOCO_6_RH_API.md`; execucao registrada em
> `docs/governance/HANDOFF_CODEX.md` (entradas 2026-08-12).

## Estrutura dos Documentos

```
docs/rh/
├── 00-README.md           <- Visao geral do modulo RH
├── 01-FUNCIONARIOS.md     <- Cadastro, admissao, demissao
├── 02-FOLHA_PAGAMENTO.md  <- Calculo salarial, INSS, IRRF, FGTS
├── 03-BENEFICIOS.md       <- VT, VR, plano de saude
└── 04-FREQUENCIA.md       <- Ponto eletronico: especificacao do importador (decisao INTEGRAR, 2026-08-12)
```

**Documentos previstos que ainda NAO existem** (a auditoria de 2026-08-11
encontrou 4 listados no indice como se existissem; `04-FREQUENCIA.md` foi
criado em 2026-08-12 como especificacao aprovada):

| Documento previsto | Estado | Onde o assunto vive hoje |
|---|---|---|
| `05-FERIAS.md` (ferias, afastamentos) | `[PENDENTE]` | `hr_vacation_accrual_periods` / `hr_vacation_schedules` / `hr_absences` (BLOCO 6) |
| `06-TREINAMENTOS.md` (cursos, certificacoes, habilidades) | `[PENDENTE]` | `hr_training_courses` / `hr_job_position_trainings` / `hr_employee_trainings` (BLOCO 6) |
| `07-ESOCIAL.md` (integracao eSocial) | `[PENDENTE]` | fila eSocial do modulo SST (`server/src/modules/sst/`) e `docs/tributario/03-RECEITA_FEDERAL.md` |

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 02 | Recursos Humanos | RH | Gerente de RH |

> Cargos/headcount detalhado do departamento RH ainda não foram levantados
> nos docs (pendência conhecida, não é reorganização de conteúdo existente —
> exige dado real de headcount).

## Funcionalidades do Modulo RH

1. **Cadastro de Funcionarios** - Dados pessoais, CTPS, exames
2. **Departamentos e Cargos** - Estrutura organizacional
3. **Folha de Pagamento** - Calculo automatico de proventos e descontos
4. **Beneficios** - VT, VR, VA, plano de saude, seguro de vida
5. **Ponto Eletronico** - Registro de frequencia, horas extras, banco de horas
6. **Ferias** - Programacao, concessao, abono pecuniario
7. **Treinamentos** - Cursos internos/externos, certificacoes
8. **eSocial** - Envio de eventos ao governo
9. **Relatorios** - Folha, encargos, custos por departamento

## Tabelas Principais (nomes reais do schema PostgreSQL)

```
departments                  - Departamentos da empresa
employees                    - Funcionarios
hr_admission_processes       - Processos de admissao (ASO, checklist, eSocial)
hr_termination_processes     - Processos de demissao (ASO, TRCT, ativos)
hr_employee_documents        - Documentos do funcionario (ASO, atestados, TRCT)
hr_vacation_accrual_periods  - Periodos aquisitivos de ferias
hr_vacation_schedules        - Agendamentos de ferias
hr_absences                  - Afastamentos (com CID de acesso restrito rh+sst)
hr_benefit_types             - Catalogo de tipos de beneficio
hr_employee_benefits         - Adesoes de beneficio por funcionario
hr_training_courses          - Catalogo de cursos (normativos e livres)
hr_job_position_trainings    - Treinamento exigido por cargo
hr_employee_trainings        - Conclusoes de treinamento (valid_until)
hr_payroll_import_batches    - Importacao de folha externa (nao ha motor de calculo proprio)
```

> Versoes antigas deste doc citavam tabelas de planejamento (`payroll_headers`,
> `time_records`, `vacations`...) que nunca foram criadas com esses nomes — o
> schema real usa o prefixo `hr_*` acima (migrations `20260808-0000xx`).

## Fluxo de Admissao

```
Criacao da vaga
    |
    v
Entrevista e selecao
    |
    v
Aprovacao
    |
    v
Exame admissional
    |
    v
Coleta de documentos (CTPS, RG, CPF, PIS, titulo, residencia)
    |
    v
Cadastro no sistema (employees)
    |
    v
Envio do evento S-2200 (eSocial)
    |
    v
Cadastro de ponto biometrico
    |
    v
Integracao com o departamento

---

**Última atualização:** 2026-08-12 (backend + 10 abas web entregues, incluindo o importador de ponto AEJ; tabela de nomes reais `hr_*`)
