# Organograma Executivo Consolidado - EVOK ÁUDIO

> Consolida em um único diagrama o agrupamento "Departamentos por Área" de
> `docs/00-ESTRUTURA_ORGANIZACIONAL.md`. Os IDs entre parênteses são os
> códigos reais de `server/src/config/seeds.ts` (fonte da verdade). Onde o
> nome usado no dia a dia difere da sigla do banco, a sigla vem entre `[ ]`.

## Diagrama

```
                              ┌────────────────────┐
                              │        CEO          │
                              │  Diretor Presidente  │
                              │     Diretoria (01)   │
                              └──────────┬───────────┘
                                         │
        ┌────────────────────────────────┼─────────────────────────────────┐
        │                                │                                 │
┌───────┴────────┐              ┌────────┴─────────┐              ┌────────┴─────────┐
│Diretor Industrial│              │ Diretor Comercial │              │Diretor Admin-Fin.│
└───────┬────────┘              └────────┬─────────┘              └────────┬─────────┘
        │                                │                                 │
   ┌────┼────┬────────┬────────┐    ┌────┴────┐              ┌────────┬────┼────┬────────┬────────┐
   │    │    │        │        │    │         │              │        │    │    │        │        │
  ENG  PCP  PROD    QUAL     MANUT VEND      MKT             RH      FIN  JUR   TI      FAC      ALM
 (03) (04) (05)    (10)      (12) (08)      (14)            (02)    (09) (16) (13)     (17)      (06)
        │                     │                                     │
        │                     └── inclui EXP (11) — Expedição/       ├── FIN inclui subáreas:
        │                         Logística sob Diretor Industrial,      CONT, CTR, TES
        │                         quando há supervisor de fábrica dedicado.
        │
        └── QUAL inclui subáreas: LAB, GQ
```

> **Nota sobre EXP (11 — Expedição/Logística) e ALM (06 — Almoxarifado):**
> por natureza de fluxo de materiais (entrada de insumos → produção → saída
> de produto acabado), ambos costumam responder ao Diretor Industrial na
> prática operacional da fábrica, mas o seed não define hierarquia entre
> departamentos (apenas `department_id` plano em `Employee`/`Asset`). Este
> desenho é uma convenção de organograma para leitura executiva, não uma
> regra de negócio codificada.

## Tabela de agrupamento (mesma fonte de `00-ESTRUTURA_ORGANIZACIONAL.md`)

| Diretoria | Departamentos (ID/sigla) | Subáreas funcionais |
|-----------|--------------------------|----------------------|
| CEO / Diretoria | Diretoria (01/DIR) | — |
| Diretor Industrial | Engenharia (03/ENG), PCP (04/PCP), Produção (05/PROD), Qualidade (10/QUAL), Manutenção (12/MANUT), Expedição (11/EXP), Almoxarifado (06/ALM) | LAB, GQ (sob Qualidade) |
| Diretor Comercial | Vendas (08/VEND), Marketing (14/MKT) | — |
| Diretor Administrativo-Financeiro | RH (02/RH), Financeiro (09/FIN), Jurídico (16/JUR), TI (13/TI), Facilities (17/FAC) | CONT, CTR, TES (sob Financeiro) |
| Transversal (sem diretoria fixa) | Segurança do Trabalho (15/SST) | — reporta tipicamente à Diretoria/RH, varia por porte de empresa |
| Transversal (módulo, não departamento) | Compras/Suprimentos (07/COMP) | COMEX — pode responder ao Diretor Industrial (fábrica) ou Administrativo-Financeiro, a depender da governança de compras da empresa |

## Cargos de Diretoria (`docs/administrativo/01-DIRETORIA.md`)

| Cargo | Departamento (banco) | Responsabilidades |
|-------|------------------------|---------------------|
| CEO / Diretor Presidente | Diretoria (01/DIR) | Estratégia, resultados, inovação |
| Diretor Industrial | Diretoria (01/DIR) | Produção, engenharia, qualidade, manutenção |
| Diretor Comercial | Diretoria (01/DIR) | Vendas, marketing, expansão |
| Diretor Administrativo-Financeiro | Diretoria (01/DIR) | Finanças, RH, jurídico, TI, facilities |

> No banco (`employees.department_id`), todos os quatro cargos de diretoria
> pertencem ao mesmo departamento **Diretoria (01)** — o "reporte" a Produção/
> Comercial/Administrativo-Financeiro é apenas organizacional (função do
> cargo), não uma FK para departamentos diferentes.

## Divergências conhecidas com `docs/projeto/02-PLANO_INDUSTRIAL.md`

O plano industrial original descreve **21 departamentos** com IDs `01`-`21`
(incluindo Controladoria=16, Tesouraria=17, Comex=18 como departamentos
plenos). O seed real implementado (`server/src/config/seeds.ts`) tem apenas
**17 departamentos**; os 6 que não entraram como linha própria em
`departments` foram rebaixados a **subáreas funcionais** de um departamento
pai (ver `docs/00-ESTRUTURA_ORGANIZACIONAL.md` § Subáreas funcionais). O
plano industrial é mantido como documento histórico de concepção e não foi
reescrito nesta rodada — não usar seus IDs para nada que dependa do banco.

---

**Última atualização:** 2026-08-06
