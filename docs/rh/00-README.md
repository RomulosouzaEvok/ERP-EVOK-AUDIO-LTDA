# Modulo RH - ERP EVOK AUDIO

## Estrutura dos Documentos

```
docs/rh/
├── 00-README.md           <- Visao geral do modulo RH
├── 01-FUNCIONARIOS.md     <- Cadastro, admissao, demissao
├── 02-FOLHA_PAGAMENTO.md  <- Calculo salarial, INSS, IRRF, FGTS
└── 03-BENEFICIOS.md       <- VT, VR, plano de saude
```

**Documentos previstos que ainda NAO existem** (a auditoria de 2026-08-11
encontrou os 4 listados no indice como se existissem — nao existem no disco):

| Documento previsto | Estado | Onde o assunto vive hoje |
|---|---|---|
| `04-FREQUENCIA.md` (ponto, horas extras, atrasos) | `[PENDENTE]` | `hr_time_sheet_summaries` + `hr_absences` (BLOCO 6); ponto eletronico e decisao BUY/INTEGRAR, ver `docs/business/BLOCO_6_RH_MODELO_DADOS.md` |
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

## Tabelas Principais

```sql
-- JA EXISTE (revisado)
departments     - Departamentos da empresa
employees       - Funcionarios

-- NOVAS
payroll_items        - Itens da folha (proventos/descontos)
payroll_headers      - Cabecalho da folha mensal
benefits             - Beneficios concedidos
time_records         - Registros de ponto
vacations            - Ferias concedidas
absences             - Afastamentos
trainings            - Treinamentos realizados  
training_courses     - Cursos disponiveis
employee_documents   - Documentos do funcionario (exames, fotos)
```

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

**Última atualização:** 2026-08-06
