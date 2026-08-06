# Módulo Suprimentos - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/suprimentos/
├── 00-README.md              <- Visão geral do módulo Suprimentos
├── 01-COMPRAS.md             <- Aquisição de materiais diretos e indiretos
└── 02-COMEX.md               <- Importação, câmbio, desembaraço aduaneiro
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).
> `COMEX` é subárea funcional de Compras/Suprimentos — não tem linha própria
> em `departments` (ver `docs/00-ESTRUTURA_ORGANIZACIONAL.md` § Subáreas
> funcionais).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 07 | Compras / Suprimentos | COMP | Gerente de Suprimentos |
| - | Comércio Exterior (subárea de COMP) | COMEX | Analista de Comex |

## Estrutura do Departamento

| Cargo | Departamento | Qtd | Função |
|-------|--------------|-----|--------|
| Gerente de Suprimentos | COMP | 1 | Gestão de fornecedores, estratégia |
| Comprador (materiais diretos) | COMP | 1 | Matéria-prima, componentes |
| Comprador (materiais indiretos) | COMP | 1 | EPIs, manutenção, escritório |
| Analista de Comércio Exterior | COMEX | 1 | Importação, câmbio, desembaraço |
| Assistente de Compras | COMP | 1 | Cotações, pedidos, arquivo |

## Funções do Departamento

| Função | Descrição |
|--------|-----------|
| Cotação | Solicitar cotações para novos materiais |
| Negociação | Condições de preço, prazo, pagamento |
| Emissão de Pedidos | Criar purchase_orders |
| Acompanhamento | Follow-up de entregas |
| Recebimento | Conferência de NF e materiais |
| Qualificação | Avaliar e auditar fornecedores |
| Importação | Processo completo de importação |

## Principais Fornecedores da EVOK ÁUDIO

| Fornecedor | Material | Prazo Entrega | Condição Pagamento |
|------------|----------|--------------|-------------------|
| ConeTech Indústria | Cones (papel e PP) | 15 dias | 28 dias |
| WireBrasil | Fio de cobre esmaltado | 20 dias | 28 dias |
| Ferrite Brasil | Imãs de ferrite | 30 dias | 45 dias |
| AçoFort | Baskets estampados | 20 dias | 28 dias |
| Adesivos Brasil | Colas epóxi e cianoacrilato | 10 dias | 14 dias |
| MagnaTech (China) | Imãs de Neodímio | 60 dias | 30 dias (importação) |
| Têxtil Spider | Spiders | 25 dias | 28 dias |
| BorrachaTech | Surrounds | 20 dias | 28 dias |

## Tabelas SQL

```sql
-- AVALIAÇÃO DE FORNECEDORES
CREATE TABLE supplier_evaluations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator_id INT,
    criteria_quality INT DEFAULT 3,
    criteria_delivery INT DEFAULT 3,
    criteria_price INT DEFAULT 3,
    criteria_service INT DEFAULT 3,
    total_score DECIMAL(5,2),
    classification ENUM('a','b','c','d'),
    last_order_id INT,
    notes TEXT,
    created_at DATETIME
);

-- CATEGORIAS DE COMPRA
CREATE TABLE purchase_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    lead_time_days INT DEFAULT 15,
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);

---

**Última atualização:** 2026-08-06
