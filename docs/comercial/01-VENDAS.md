# Vendas e CRM - Módulo Comercial

## Departamento de Vendas (VEND)

### Estrutura da Equipe

| Cargo | Qtd | Função | Perfil |
|-------|-----|--------|--------|
| Gerente Comercial | 1 | Gestão, metas, estratégia, resultados | Administrativo |
| Supervisor de Vendas | 1 | Coordenação de equipe interna/externa | Liderança |
| Vendedor Interno | 3 | Vendas consultivas por telefone/email | Técnico-comercial |
| Vendedor Externo | 2 | Visitas a clientes, prospecção | Field sales |
| Vendedor Técnico | 1 | Suporte pré-venda, especificações | Engenharia |
| Analista de CRM | 1 | Pipeline, métricas, funil | Analítico |
| Assistente Comercial | 2 | Propostas, pedidos, pós-venda | Administrativo |

### Funções e Responsabilidades

| Função | Descrição |
|--------|-----------|
| Prospecção | Buscar novos clientes (lojas, montadoras, distribuidores) |
| Orçamento | Elaborar propostas técnicas e comerciais |
| Negociação | Condições comerciais, prazos, descontos |
| Pós-venda | Acompanhamento, satisfação, suporte |
| CRM | Manter base atualizada, histórico de contatos |
| Meta | Bater metas mensais/trimestrais de faturamento |

### Processo de Vendas

```
1. PROSPECÇÃO
   ├── Inbound (site, redes sociais, indicação)
   ├── Outbound (cold call, visita, email)
   └── Feiras e eventos (Expo Áudio, NAMM, feiras setoriais)
        │
        ▼
2. QUALIFICAÇÃO
   ├── Necessidade do cliente
   ├── Potencial de compra
   └── Timing de decisão
        │
        ▼
3. PROPOSTA
   ├── Especificação técnica do produto
   ├── Condições comerciais (preço, prazo, frete)
   └── Prazo de validade
        │
        ▼
4. NEGOCIAÇÃO
   ├── Descontos por volume
   ├── Prazo de pagamento
   └── Amostras / testes
        │
        ▼
5. FECHAMENTO
   ├── Pedido formal
   ├── Confirmação de estoque / produção
   └── Programação de entrega
        │
        ▼
6. PÓS-VENDA
   ├── Acompanhamento de entrega
   ├── Satisfação do cliente (NPS)
   └── Suporte técnico
```

### Tabelas Comissões e Metas

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> `commission_rules` e `sales_goals` **não existem** em `erp_evok_audio` —
> comissão e meta de vendedor não estão implementadas em lugar nenhum do
> schema. O bloco abaixo é rascunho em dialeto MySQL; este ERP roda
> **exclusivamente em PostgreSQL 16**.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- TABELA DE COMISSÕES
CREATE TABLE commission_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT,
    min_quantity INT DEFAULT 1,
    commission_percent DECIMAL(5,2) NOT NULL,
    valid_from DATE,
    valid_until DATE,
    created_at DATETIME
);

INSERT INTO commission_rules (product_id, min_quantity, commission_percent) VALUES
(NULL, 0, 3.00),   -- 3% para qualquer produto (padrão)
(1, 100, 4.00),    -- 4% para auto-falante 12" acima de 100 un
(2, 100, 4.00);    -- 4% para auto-falante 15" acima de 100 un

-- METAS DE VENDAS
CREATE TABLE sales_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesperson_id INT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    goal_amount DECIMAL(15,2) NOT NULL,
    achieved_amount DECIMAL(15,2) DEFAULT 0,
    bonus_percent DECIMAL(5,2),
    created_at DATETIME,
    updated_at DATETIME
);
```

### Indicadores Comerciais

| KPI | Fórmula | Meta |
|-----|---------|------|
| Conversão | (Vendas fechadas / Oportunidades) x 100 | > 25% |
| Ticket Médio | Receita total / Nº de vendas | > R$ 2.000 |
| Ciclo de Venda | Data fechamento - Data primeiro contato | < 30 dias |
| NPS | Pesquisa de satisfação | > 80 |
| Retenção | Clientes ativos / Total de clientes | > 85% |
| CPL (Custo por Lead) | Investimento marketing / Leads gerados | < R$ 50 |

### Segmentação de Clientes

| Segmento | Tipo | Exemplo | Estratégia |
|----------|------|---------|------------|
| A - Grande | B2B | Montadoras, distribuidores | Visitas mensais, condições especiais |
| B - Médio | B2B | Lojas de áudio, instaladores | Visitas trimestrais |
| C - Pequeno | B2B/B2C | Autônomos, pequenas lojas | Vendas online, telemarketing |
| D - Consumidor | B2C | Consumidor final | E-commerce |
