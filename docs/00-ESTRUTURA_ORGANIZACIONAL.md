# Estrutura Organizacional Completa - EVOK ÁUDIO

> **Fábrica de Alto-Falantes Profissionais e Automotivos**

Este documento é o índice mestre da estrutura organizacional. Os dados de cada
departamento são mantidos no `00-README.md` da sua área (fonte da verdade); aqui eles
só são consolidados para dar uma visão da empresa inteira.

## Departamento vs Cargo — Conceito

- **Departamento** é a unidade organizacional (a "caixinha" no organograma) — tem
  `ID`, `Sigla` e um responsável. Ex.: *Qualidade (QUAL)*, *Financeiro (FIN)*.
- **Cargo** é a função que uma pessoa exerce **dentro** de um departamento. Um
  departamento tem 1..N cargos. Ex.: dentro de *Qualidade*, existem os cargos
  *Gerente da Qualidade*, *Inspetor de Qualidade*, *Técnico de Laboratório Acústico*.

Cada `docs/<área>/00-README.md` traz as duas tabelas separadas: "Departamentos
Cobertos" (os departamentos daquela área) e a tabela de cargos, com uma coluna
`Departamento` indicando a qual departamento cada cargo pertence quando a área cobre
mais de um.

## Índice de Departamentos por Módulo

> **Fonte da verdade:** `server/src/config/seeds.ts` — 17 departamentos
> (códigos `01` a `17`), populados no primeiro boot do banco. Qualquer ID
> abaixo que não bater com o seed é bug de documentação, não do código.

| ID | Departamento | Sigla | Responsável | Módulo docs/ |
|----|-------------|-------|-------------|--------------|
| 01 | Diretoria | DIR | CEO | [administrativo](administrativo/00-README.md) |
| 02 | Recursos Humanos | RH | Gerente de RH | [rh](rh/00-README.md) |
| 03 | Engenharia do Produto | ENG | Gerente de Engenharia | [producao](producao/00-README.md) |
| 04 | Planejamento e Controle da Produção | PCP | Supervisor de PCP | [producao](producao/00-README.md) |
| 05 | Produção / Manufatura | PROD | Gerente de Produção | [producao](producao/00-README.md) |
| 06 | Almoxarifado | ALM | Almoxarife | [patrimonio](patrimonio/00-README.md) (`04-ALMOXARIFADO_INSUMOS.md`) |
| 07 | Compras / Suprimentos | COMP | Gerente de Suprimentos | [suprimentos](suprimentos/00-README.md) |
| 08 | Vendas / Comercial | VEND | Gerente Comercial | [comercial](comercial/00-README.md) |
| 09 | Financeiro | FIN | Gerente Financeiro | [financeiro](financeiro/00-README.md) |
| 10 | Qualidade | QUAL | Gerente de Qualidade | [qualidade](qualidade/00-README.md) |
| 11 | Expedição | EXP | Supervisor de Logística | [logistica](logistica/00-README.md) |
| 12 | Manutenção | MANUT | Supervisor de Manutenção | [patrimonio](patrimonio/00-README.md) (`03-MANUTENCAO.md`) |
| 13 | TI | TI | Analista de TI | [administrativo](administrativo/00-README.md) |
| 14 | Marketing | MKT | Coordenador de Marketing | [comercial](comercial/00-README.md) |
| 15 | Segurança do Trabalho | SST | Técnico de Segurança do Trabalho | [seguranca_trabalho](seguranca_trabalho/00-README.md) |
| 16 | Jurídico | JUR | Assessor Jurídico | [juridico](juridico/00-README.md) |
| 17 | Facilities | FAC | Supervisor Administrativo | [administrativo](administrativo/00-README.md) |

### Subáreas funcionais (não são departamentos no banco)

Estas seis funções aparecem nos docs departamentais como especialização de um
departamento pai, mas **não têm linha própria em `departments`** — se um dia
viraram departamento formal, atualize `server/src/config/seeds.ts` (novo
`code`/`sigla`) e esta tabela junto.

| Subárea | Sigla | Departamento pai (ID/sigla) | Módulo docs/ |
|---------|-------|------------------------------|--------------|
| Contabilidade | CONT | Financeiro (09/FIN) | [financeiro](financeiro/00-README.md) (`02-CONTABILIDADE.md`) |
| Controladoria | CTR | Financeiro (09/FIN) | [financeiro](financeiro/00-README.md) |
| Tesouraria | TES | Financeiro (09/FIN) | [financeiro](financeiro/00-README.md) (`03-TESOURARIA.md`) |
| Laboratório de Testes | LAB | Qualidade (10/QUAL) | [qualidade](qualidade/00-README.md) |
| Garantia da Qualidade | GQ | Qualidade (10/QUAL) | [qualidade](qualidade/00-README.md) |
| Comércio Exterior | COMEX | Compras / Suprimentos (07/COMP) | [suprimentos](suprimentos/00-README.md) (`02-COMEX.md`) |

### Áreas sem tabela de departamento própria

- **[tributario](tributario/00-README.md)** — conteúdo é sobre regimes fiscais/SPED,
  não é uma unidade organizacional com cargos.

### Nota sobre Almoxarifado e Manutenção em `docs/patrimonio/`

`patrimonio` não é um departamento do seed — é um módulo transversal (os
ativos, `assets.department_id`, pertencem a qualquer departamento). Mas dois
departamentos REAIS do seed (`06 ALM Almoxarifado` e `12 MANUT Manutenção`)
têm sua documentação funcional hospedada dentro de `docs/patrimonio/`
(`04-ALMOXARIFADO_INSUMOS.md` e `03-MANUTENCAO.md`, respectivamente) por
afinidade de conteúdo. Ver tabela "Departamentos Cobertos" em
[patrimonio/00-README.md](patrimonio/00-README.md).

## Departamentos por Área (agrupamento das pastas `docs/`)

Este agrupamento é **por pasta de documentação**, não por hierarquia — duas
coisas diferentes que já se confundiram. A hierarquia (quem responde a qual
diretoria) tem um dono só: [administrativo/05-ORGANOGRAMA_EXECUTIVO.md](administrativo/05-ORGANOGRAMA_EXECUTIVO.md).

- **administrativo** → DIR (01), TI (13), FAC (17)
- **comercial** → VEND (08), MKT (14)
- **financeiro** → FIN (09) + subáreas CONT, CTR, TES
- **juridico** → JUR (16)
- **logistica** → EXP (11)
- **patrimonio** → ALM (06), MANUT (12) — módulo transversal de ativos
- **producao** → ENG (03), PCP (04), PROD (05)
- **qualidade** → QUAL (10) + subáreas LAB, GQ
- **rh** → RH (02)
- **seguranca_trabalho** → SST (15)
- **suprimentos** → COMP (07) + subárea COMEX

## Hierarquia executiva (resumo)

Detalhe e diagrama em [administrativo/05-ORGANOGRAMA_EXECUTIVO.md](administrativo/05-ORGANOGRAMA_EXECUTIVO.md).
**Quatro diretorias** desde 2026-08-11 — a de Suprimentos & Logística é nova
e o cargo ainda está vago:

| Diretoria | Departamentos |
|---|---|
| CEO / Diretoria | DIR (01) |
| Industrial | ENG (03), PCP (04), PROD (05), QUAL (10), MANUT (12) |
| Suprimentos & Logística ⚠️ *vago* | COMP (07), ALM (06), EXP (11) |
| Comercial | VEND (08), MKT (14) |
| Administrativo-Financeiro | RH (02), FIN (09), JUR (16), TI (13), FAC (17) |
| Transversal | SST (15) |

## Consumo pelo código

A hierarquia **existe no banco** desde 2026-08-11: tabela `directorates`,
`departments.directorate_id` (NULL = transversal) e
`access_profiles.department_id` (n:1). Relatórios podem agregar por
diretoria; perfil não se liga mais a departamento por nome digitado.

A navegação espelha a mesma estrutura em `client/src/lib/departments.ts`, e
duas guardas **reprovam** divergência: `departments.seeds.test.ts` (nome,
código, sigla e a diretoria de cada departamento) e
`server/tests/unit/organizational-structure-guard.test.ts` (dono de cada
módulo RBAC). Antes de 2026-08-11 não havia vínculo nenhum entre este
documento e a tela — foi por isso que o menu passou meses agrupando
departamentos que não existiam.

---

**Última atualização:** 2026-08-11
