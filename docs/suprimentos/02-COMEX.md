# Comércio Exterior (COMEX) - Módulo Suprimentos

## Departamento de COMEX

### Estrutura

| Cargo | Qtd | Função |
|-------|-----|--------|
| Analista de Comex | 1 | Processo completo de importação |
| Assistente de Comex | 1 | Documentação, acompanhamento |

### Funções

| Função | Descrição |
|--------|-----------|
| Importação de Componentes | Imãs de neodímio, bobinas especiais, fio importado |
| Câmbio | Contratação de câmbio, hedge |
| Desembaraço Aduaneiro | Processo na Receita Federal |
| Documentação | BL, fatura comercial, packing list |
| Drawback | Regime especial para exportação |

### Processo de Importação

```
1. Negociação com Fornecedor Externo
   ├── Proforma Invoice
   ├── Incoterm (FOB, CIF, DDP)
   └── Prazo de pagamento
        │
        ▼
2. Emissão do Pedido (PO Internacional)
        │
        ▼
3. Provider / Forwarder
   ├── Booking - Reserva no navio/avião
   └── Coleta no fornecedor
        │
        ▼
4. Embarque
   ├── BL (Bill of Lading) - marítimo
   └── AWB (Air Waybill) - aéreo
        │
        ▼
5. Chegada ao Brasil
   ├── Desconsolidação do container
   ├── Registro da DI (Declaração de Importação)
   └── Pagamento de tributos
        │
        ▼
6. Desembaraço Aduaneiro
   ├── Parametrização (verde, amarelo, vermelho)
   └── Liberação da RFB
        │
        ▼
7. Transporte Interno
   ├── Retirada do terminal
   └── Entrega na fábrica
        │
        ▼
8. Recebimento no Almoxarifado
   ├── Conferência física
   └── Inspeção de qualidade
```

### Aprovação da diretoria e segregação de função

O sistema trava a saída de `draft` (registro de embarque) até a diretoria
aprovar o processo — **G11-COMEX**, decisão D-G
(`POST /api/comex/import-processes/:id/approve`, papel `diretor`, em
qualquer valor: importação nunca tem faixa de isenção).

**Segregação de função (D-K, 2026-08-10):** o analista que **registrou** o
processo (`import_processes.created_by`) **não** aprova o próprio processo,
ainda que tenha o papel `diretor` ou seja `admin`. Erro **422** com
`details.rule = "D-K-COMEX"`, nada gravado, e mensagem dizendo a quem pedir a
aprovação.

Por que aqui a regra é mais importante do que em qualquer outro ponto: este
gate é o **único** controle da importação antes do embarque. Sem ele, um
processo na casa de R$ 1 milhão sairia com uma única pessoa envolvida do
cadastro ao desembaraço.

### Contratação de Câmbio

| Tipo | Prazo | Custo |
|------|-------|-------|
| Câmbio Pronto | D+2 | Spread 1-2% |
| Câmbio Futuro | 30-180 dias | Spread + taxa forward |
| Carta de Crédito (LC) | 30-180 dias | 3-5% ao ano |

### Tributos na Importação

| Tributo | Alíquota | Base de Cálculo |
|---------|----------|----------------|
| II | 10-20% | Valor Aduaneiro (FOB + Frete + Seguro) |
| IPI | 10% | Valor Aduaneiro + II |
| PIS Imp | 2,10% | Valor Aduaneiro + II + IPI + ICMS |
| COFINS Imp | 9,65% | Valor Aduaneiro + II + IPI + ICMS |
| ICMS Imp | 18% (SP) | Valor Aduaneiro + II + IPI + PIS + COFINS + ICMS |
| AFRMM | 25% | Frete internacional |

## Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL** — este ERP
> roda **exclusivamente em PostgreSQL 16**. Confronto contra `erp_evok_audio`
> nesta data:
>
> - `imports` e `import_items` **não existem**. As tabelas reais do módulo
>   COMEX são **`import_processes`** e **`import_process_items`** (UC-19,
>   migration `20260806-000090`), com colunas bem diferentes:
>   `process_number`, `fob_currency`, `exchange_rate`, `freight_value`,
>   `insurance_value`, `other_expenses_value`, `shipped_at`, `arrived_at`,
>   `customs_cleared_at`, `received_at`; e por item `fob_unit_price`,
>   `ii_rate`/`ipi_rate`/`pis_rate`/`cofins_rate`/`icms_rate` (informadas
>   manualmente, **sem integração Siscomex/NCM**), `customs_value`, os
>   `*_value` calculados e `nationalized_unit_cost`;
> - o ENUM real de status é
>   `draft | shipped | arrived | customs_cleared | received | cancelled` —
>   **não** `ordered | shipped | arrived | clearance | delivered`;
> - **não existem** `incoterm`, `shipping_method`, `container_number`,
>   `bill_of_lading`, `di_number`, `di_date`, `country_of_origin`,
>   `gross_weight`, `net_weight`, nem `purchase_order_id` ligando a
>   importação a um pedido de compra;
> - desde o commit `9df39c7` (gap G14) o recebimento da importação grava
>   `inventory_movements.reference_type = 'import'` e
>   `product_cost_ledgers.source_type = 'import'` (antes gravava `'purchase'`
>   com `reference_id` de `import_processes`, o que fazia a consulta reversa
>   de auditoria devolver um pedido de compra alheio).
>
> Ver `docs/arquitetura/API.md` §32. Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- IMPORTAÇÕES
CREATE TABLE imports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    import_number VARCHAR(20) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    purchase_order_id INT,
    incoterm VARCHAR(10),
    shipping_method ENUM('sea','air','road'),
    container_number VARCHAR(50),
    bill_of_lading VARCHAR(100),
    invoice_foreign VARCHAR(100),
    invoice_value_fob DECIMAL(15,2),
    freight_value DECIMAL(15,2),
    insurance_value DECIMAL(15,2),
    total_cif DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,4),
    di_number VARCHAR(50),
    di_date DATE,
    arrival_date DATE,
    clearance_date DATE,
    status ENUM('ordered','shipped','arrived','clearance','delivered'),
    created_at DATETIME,
    updated_at DATETIME
);

-- ITENS DA IMPORTAÇÃO
CREATE TABLE import_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    import_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price_fob DECIMAL(15,4),
    ncm_code VARCHAR(10),
    country_of_origin VARCHAR(100),
    gross_weight DECIMAL(10,3),
    net_weight DECIMAL(10,3),
    created_at DATETIME
);
