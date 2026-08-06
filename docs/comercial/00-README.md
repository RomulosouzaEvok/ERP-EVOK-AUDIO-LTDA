# Módulo Comercial - ERP EVOK ÁUDIO

## Estrutura dos Documentos

```
docs/comercial/
├── 00-README.md              <- Visão geral do módulo Comercial
├── 01-VENDAS.md              <- Vendas, CRM, pós-venda
└── 02-MARKETING.md           <- Marketing, comunicação, branding
```

## Departamentos Cobertos

> Códigos conforme o seed oficial do banco (`server/src/config/seeds.ts`, 17 departamentos).

| ID | Departamento | Sigla | Responsável |
|----|-------------|-------|-------------|
| 08 | Vendas / Comercial | VEND | Gerente Comercial |
| 14 | Marketing | MKT | Coordenador de Marketing |

## Estrutura Comercial EVOK ÁUDIO

| Cargo | Departamento | Qtd | Função |
|-------|--------------|-----|--------|
| Gerente Comercial | VEND | 1 | Gestão da equipe, metas, estratégia |
| Supervisor de Vendas | VEND | 1 | Coordenar vendedores |
| Vendedor Interno (Inside Sales) | VEND | 3 | Vendas por telefone/email |
| Vendedor Externo (Field Sales) | VEND | 2 | Visitas técnicas, prospecção |
| Vendedor Técnico | VEND | 1 | Suporte técnico pré-venda |
| Analista de CRM | VEND | 1 | Gestão de clientes e funil |
| Assistente Comercial | VEND | 2 | Propostas, pedidos, pós-venda |
| Coordenador de Marketing | MKT | 1 | Estratégia de marketing |
| Analista de Marketing | MKT | 1 | Redes sociais, campanhas |
| Designer | MKT | 1 | Catálogos, materiais gráficos |

## Canais de Venda

| Canal | Tipo | % Faturamento |
|-------|------|--------------|
| Venda Direta (fábrica) | B2B | 40% |
| Representantes Comerciais | B2B | 30% |
| E-commerce / Loja Virtual | B2C/B2B | 10% |
| Distribuidores | B2B | 15% |
| OEM (montadoras) | B2B | 5% |

## Tabelas SQL (Novas)

```sql
-- FUNIL DE VENDAS (oportunidades)
CREATE TABLE sales_pipeline (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    salesperson_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    product_id INT,
    quantity INT DEFAULT 1,
    estimated_value DECIMAL(10,2),
    stage ENUM('prospecting','qualification','proposal','negotiation','closing','won','lost'),
    probability INT DEFAULT 0,                  -- % de chance
    expected_close_date DATE,
    lost_reason VARCHAR(255),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- COMISSÕES
CREATE TABLE sales_commissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    salesperson_id INT NOT NULL,
    commission_percent DECIMAL(5,2),
    commission_value DECIMAL(10,2),
    payment_status ENUM('pending','calculated','paid'),
    payment_date DATE,
    created_at DATETIME
);
```


---

**Última atualização:** 2026-08-06
