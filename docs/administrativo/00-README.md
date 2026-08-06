# Módulo Administrativo - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/administrativo/
├── 00-README.md               <- Visão geral do módulo Administrativo
├── 01-DIRETORIA.md            <- Diretoria, planejamento estratégico
├── 02-TI.md                   <- TI, infraestrutura, suporte
├── 03-FACILITIES.md           <- Serviços gerais, frota, limpeza
├── 04-PERFIS_ACESSO.md        <- RBAC + Perfis de Acesso configuráveis (real, /api/access-profiles)
└── 05-ORGANOGRAMA_EXECUTIVO.md <- Organograma executivo consolidado (todas as diretorias)
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 01 | Diretoria | DIR | CEO |
| 13 | TI | TI | Analista de TI |
| 17 | Facilities | FAC | Supervisor Administrativo |

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

> Versão resumida. Diagrama completo, com IDs do banco e notas de
> divergência, em [05-ORGANOGRAMA_EXECUTIVO.md](05-ORGANOGRAMA_EXECUTIVO.md).

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
   ┌────┼────┬────┬────┐   ┌─┴──┐            ┌──────┼──────┬──────┐
   │    │    │    │    │   │    │            │      │      │      │
  ENG  PCP  PROD QUAL MANUT VEND MKT        RH    FIN    JUR    TI/FAC
   │                    │                          │
   └── EXP, ALM (fluxo de materiais)          └── CONT, CTR, TES (subáreas)
```

**Última atualização:** 2026-08-06
