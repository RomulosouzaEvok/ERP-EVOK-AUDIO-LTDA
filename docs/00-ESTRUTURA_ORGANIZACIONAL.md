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

| ID | Departamento | Sigla | Responsável | Módulo docs/ |
|----|-------------|-------|-------------|--------------|
| 01 | Diretoria | DIR | CEO | [administrativo](administrativo/00-README.md) |
| 03 | Engenharia do Produto | ENG | Gerente de Engenharia | [producao](producao/00-README.md) |
| 04 | Planejamento e Controle da Produção | PCP | Supervisor de PCP | [producao](producao/00-README.md) |
| 05 | Produção / Manufatura | PROD | Gerente de Produção | [producao](producao/00-README.md) |
| 07 | Compras / Suprimentos | COMP | Gerente de Suprimentos | [suprimentos](suprimentos/00-README.md) |
| 08 | Vendas / Comercial | VEND | Gerente Comercial | [comercial](comercial/00-README.md) |
| 09 | Financeiro | FIN | Gerente Financeiro | [financeiro](financeiro/00-README.md) |
| 10 | Contabilidade | CONT | Contador | [financeiro](financeiro/00-README.md) |
| 11 | Qualidade | QUAL | Gerente de Qualidade | [qualidade](qualidade/00-README.md) |
| 12 | Expedição / Logística | EXP | Supervisor de Logística | [logistica](logistica/00-README.md) |
| 13 | Jurídico | JUR | Assessor Jurídico | [juridico](juridico/00-README.md) |
| 14 | TI | TI | Analista de TI | [administrativo](administrativo/00-README.md) |
| 15 | Segurança do Trabalho | SST | Técnico de Segurança do Trabalho | [seguranca_trabalho](seguranca_trabalho/00-README.md) |
| - | Facilities | FAC | Supervisor Administrativo | [administrativo](administrativo/00-README.md) |
| - | Marketing | MKT | Coordenador de Marketing | [comercial](comercial/00-README.md) |
| - | Controladoria | CTR | Controller | [financeiro](financeiro/00-README.md) |
| - | Tesouraria | TES | Tesoureiro | [financeiro](financeiro/00-README.md) |
| - | Laboratório de Testes | LAB | Supervisor de Testes | [qualidade](qualidade/00-README.md) |
| - | Garantia da Qualidade | GQ | Analista da Qualidade | [qualidade](qualidade/00-README.md) |
| - | Comércio Exterior | COMEX | Analista de Comex | [suprimentos](suprimentos/00-README.md) |

> IDs `02` e `06` estão livres — ver observação sobre `rh` abaixo.

### Áreas sem tabela de departamento própria

- **[rh](rh/00-README.md)** — ainda não tem "Departamentos Cobertos"/cargos
  cadastrados nos docs. Pendência para uma rodada futura (exigiria levantar
  headcount real, não é reorganização de conteúdo existente).
- **[patrimonio](patrimonio/00-README.md)** — Patrimônio é transversal: os ativos
  (`assets.department_id`) pertencem a qualquer um dos departamentos acima, então não
  tem headcount próprio para listar aqui.
- **[tributario](tributario/00-README.md)** — conteúdo é sobre regimes fiscais/SPED,
  não é uma unidade organizacional com cargos.

## Departamentos por Área (agrupamento)

- **administrativo** → DIR, TI, FAC
- **comercial** → VEND, MKT
- **financeiro** → FIN, CONT, CTR, TES
- **juridico** → JUR
- **logistica** → EXP
- **producao** → ENG, PCP, PROD
- **qualidade** → QUAL, LAB, GQ
- **seguranca_trabalho** → SST
- **suprimentos** → COMP, COMEX
