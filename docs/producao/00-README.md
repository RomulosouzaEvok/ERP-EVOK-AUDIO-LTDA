# Módulo Produção - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/producao/
├── 00-README.md              <- Visão geral do módulo Produção
├── 01-ENGENHARIA.md          <- Engenharia do Produto, BOM, P&D
├── 02-PCP.md                 <- Planejamento e Controle da Produção
├── 03-MANUFATURA.md          <- Manufatura (Injeção, Montagem, Testes)
├── 04-ROTEIROS.md            <- Roteiros de fabricação detalhados
├── 05-CUSTOS.md              <- Custo industrial (MP, MOD, CIF)
└── 06-BOM.md                 <- BOM (Bill of Materials), modelos, API, fluxos
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 03 | Engenharia do Produto | ENG | Gerente de Engenharia |
| 04 | Planejamento e Controle da Produção | PCP | Supervisor de PCP |
| 05 | Produção / Manufatura | PROD | Gerente de Produção |

## Fluxo Integrado de Produção

```
Engenharia (PROJETA)
    │
    ▼
PCP (PLANEJA)
    ├── Cria OP
    ├── Libera materiais
    └── Programa máquinas
    │
    ▼
Produção (EXECUTA)
    ├── Injeção/Moldagem
    ├── Montagem
    ├── Testes
    └── Acabamento
    │
    ▼
Qualidade (INSPECIONA)
    │
    ▼
Expedição (ENTREGA)
```

## Tabelas do Sistema (Novas)

```sql
-- JÁ EXISTENTES NO PLANO INDUSTRIAL
departments            - Departamentos
employees              - Funcionários
products               - Produtos (expandido)
product_bom            - Estrutura do produto
manufacturing_routes   - Roteiro de fabricação
production_orders      - Ordens de produção (OPs)
production_records     - Apontamento de produção

-- NOVAS (detalhadas neste módulo)
product_drawings       - Desenhos técnicos e documentos
work_centers           - Centro de trabalho (máquina+operador)
production_programs    - Programa mestre de produção (MPS)
material_requirements  - Necessidade de materiais (MRP)
product_costs          - Custo padrão do produto
cost_centers           - Centros de custo
time_records           - Apontamento de tempo por operação


---

**Última atualização:** 2026-08-06
