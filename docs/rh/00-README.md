# Modulo RH - ERP EVOK AUDIO

## Estrutura dos Documentos

```
docs/rh/
├── 00-README.md           <- Visao geral do modulo RH
├── 01-FUNCIONARIOS.md     <- Cadastro, admissao, demissao
├── 02-FOLHA_PAGAMENTO.md  <- Calculo salarial, INSS, IRRF, FGTS
├── 03-BENEFICIOS.md       <- VT, VR, plano de saude
├── 04-FREQUENCIA.md       <- Ponto, horas extras, atrasos
├── 05-FERIAS.md           <- Ferias, afastamentos
├── 06-TREINAMENTOS.md     <- Cursos, certificacoes, habilidades
└── 07-ESOCIAL.md          <- Integracao com eSocial
```

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
