# Módulo Administrativo - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/administrativo/
├── 00-README.md              <- Visão geral do módulo Administrativo
├── 01-DIRETORIA.md           <- Diretoria, planejamento estratégico
├── 02-TI.md                  <- TI, infraestrutura, suporte
└── 03-FACILITIES.md          <- Serviços gerais, frota, limpeza
```

## Departamentos Cobertos

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 01 | Diretoria | DIR | CEO |
| 14 | TI | TI | Analista de TI |
| - | Facilities | FAC | Supervisor Administrativo |

## Estrutura Administrativa

| Cargo | Departamento | Qtd | Função |
|-------|--------------|-----|--------|
| CEO / Diretor Presidente | DIR | 1 | Estratégia, resultados, visão |
| Diretor Industrial | DIR | 1 | Produção, engenharia, qualidade |
| Diretor Comercial | DIR | 1 | Vendas, marketing, expansão |
| Diretor Administrativo-Financeiro | DIR | 1 | Finanças, RH, jurídico |
| Analista de TI | TI | 1 | Sistemas, infraestrutura, suporte |
| Supervisor Administrativo | FAC | 1 | Facilities, frota, serviços |
| Recepcionista | FAC | 1 | Atendimento, telefone |
| Serviços Gerais | FAC | 2 | Limpeza, copa, manutenção predial |

## Organograma Executivo

```
                    ┌──────────────────┐
                    │      CEO         │
                    │  (Diretor Pres.) │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────┴─────┐        ┌────┴─────┐        ┌─────┴──────┐
   │  Diretor  │        │  Diretor  │        │  Diretor   │
   │ Industrial│        │ Comercial │        │  Admin-Fin │
   └────┬──────┘        └────┬──────┘        └──────┬─────┘
        │                    │                      │
   ┌────┼────┐         ┌────┼────┐           ┌──────┼──────┐
   │    │    │         │    │    │           │      │      │
  ENG  PCP  PROD     VEND  MKT  CRM        RH   FIN   CONT
   │    │    │                           JUR   TI   FAC
   │    │    │
  QUAL  MAN  EXP
