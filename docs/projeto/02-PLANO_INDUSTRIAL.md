# Plano Industrial - ERP EVOK ÁUDIO
## Sistema de Gestão para Fabricação de Auto-Falantes em Larga Escala

---

## 1. Perfil da Empresa

**EVOK ÁUDIO** - Indústria de auto-falantes profissionais e automotivos
- **Porte:** Grande empresa
- **Produção:** Larga escala (série e lote)
- **Segmento:** Áudio profissional, automotivo, residencial

---

## 2. Módulos do Sistema

```
┌─────────────────────────────────────────────────────┐
│                   ERP EVOK ÁUDIO                     │
├─────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │   RH    │ │  Vendas  │ │ Produção │ │ Estoque  │ │
│ │ &       │ │  &       │ │ &        │ │ &        │ │
│ │Depar-   │ │Faturamento│ │  PCP     │ │ Almoxari-│ │
│ │tamentos │ │          │ │          │ │  fado    │ │
│ └─────────┘ └──────────┘ └──────────┘ └──────────┘ │
│ ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │Compras  │ │Financeiro│ │Qualidade │ │Engenharia│ │
│ │ &       │ │          │ │ &        │ │ do       │ │
│ │Suprimen-│ │          │ │Controle  │ │ Produto  │ │
│ │tos      │ │          │ │          │ │          │ │
│ └─────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 3. Estrutura Organizacional (Departamentos)

| ID | Departamento | Sigla | Gestor | Função | Documentação |
|----|-------------|-------|--------|--------|-------------|
| 01 | Diretoria | DIR | CEO | Gestão estratégica, governança, resultados | docs/administrativo/01-DIRETORIA.md |
| 02 | Recursos Humanos | RH | Gerente de RH | Adm. de pessoal, folha, treinamento, eSocial | docs/rh/ |
| 03 | Engenharia do Produto | ENG | Gerente de Engenharia | Projeto de auto-falantes, BOM, P&D, desenhos | docs/producao/01-ENGENHARIA.md |
| 04 | Planejamento e Controle da Produção | PCP | Supervisor de PCP | Programação da produção, MPS, MRP, capacidade | docs/producao/02-PCP.md |
| 05 | Produção / Manufatura | PROD | Gerente de Produção | Fabricação: injeção, montagem, testes, embalagem | docs/producao/03-MANUFATURA.md |
| 06 | Almoxarifado de Insumos | ALM | Almoxarife | Estoque de matérias-primas, insumos, EPIs | docs/patrimonio/04-ALMOXARIFADO_INSUMOS.md |
| 07 | Compras / Suprimentos | COMP | Gerente de Suprimentos | Aquisição de materiais, cotação, fornecedores | docs/suprimentos/01-COMPRAS.md |
| 08 | Vendas / Comercial | VEND | Gerente Comercial | Vendas, CRM, prospecção, pós-venda | docs/comercial/01-VENDAS.md |
| 09 | Financeiro | FIN | Gerente Financeiro | Contas a pagar/receber, fluxo de caixa | docs/financeiro/01-FINANCEIRO.md |
| 10 | Contabilidade | CONT | Contador | Escrita fiscal, contábil, balanço, DRE | docs/financeiro/02-CONTABILIDADE.md |
| 11 | Qualidade | QUAL | Gerente de Qualidade | Controle de qualidade, testes acústicos, ISO | docs/qualidade/ |
| 12 | Expedição / Logística | EXP | Supervisor de Logística | Expedição, estoque PA, transporte | docs/logistica/ |
| 13 | Manutenção | MANUT | Supervisor de Manutenção | Manutenção de máquinas e equipamentos | docs/patrimonio/03-MANUTENCAO.md |
| 14 | TI | TI | Analista de TI | Suporte técnico, sistemas, infraestrutura | docs/administrativo/02-TI.md |
| 15 | Marketing | MKT | Coordenador de Marketing | Comunicação, branding, campanhas, feiras | docs/comercial/02-MARKETING.md |
| 16 | Controladoria | CTR | Controller | Custos industriais, orçamento, DRE gerencial | docs/producao/05-CUSTOS.md |
| 17 | Tesouraria | TES | Tesoureiro | Conciliação bancária, pagamentos, aplicações | docs/financeiro/03-TESOURARIA.md |
| 18 | Comércio Exterior | COMEX | Analista de Comex | Importação de componentes, câmbio, desembaraço | docs/suprimentos/02-COMEX.md |
| 19 | Segurança do Trabalho | SST | Técnico de SST | NRs, PCMSO, PGR, EPIs, acidentes | docs/seguranca_trabalho/ |
| 20 | Jurídico | JUR | Assessor Jurídico | Contratos, propriedade intelectual, compliance | docs/juridico/ |
| 21 | Facilities / Serviços Gerais | FAC | Supervisor Adm. | Limpeza, frota, manutenção predial, vigilância | docs/administrativo/03-FACILITIES.md |

### Total de Funcionários Estimado: ~100-150 colaboradores
### Total de Departamentos: 21

---

## 4. Estrutura do Produto (Auto-Falante)

### 4.1. Componentes de um Auto-Falante

```
                    AUTO-FALANTE EVOK
                    ┌────────────────┐
                    │   Cone (Paper  │
                    │   / Poliprop.) │
                    ├────────────────┤
                    │   Surround     │
                    │   (Borracha)   │
                    ├────────────────┤
                    │   Spider       │
                    │   (Centrador)  │
                    ├────────────────┤
                    │   Voz (Voice   │
                    │   Coil)        │
                    ├────────────────┤
                    │   Magnet (Fer- │
                    │   rite / Neod.)│
                    ├────────────────┤
                    │   Estrutura /  │
                    │   Basket       │
                    ├────────────────┤
                    │   Terminal /   │
                    │   Bornes       │
                    └────────────────┘
```

### 4.2. Níveis da Estrutura (BOM - Bill of Materials)

| Nível | Tipo | Exemplo |
|-------|------|---------|
| 0 | Produto Acabado | Auto-falante EVOK 12" 300W |
| 1 | Subconjuntos | Cone + Voz montado, Conjunto magnético |
| 2 | Componentes | Cone, surround, spider, voice coil, imã, basket |
| 3 | Matéria-prima | Papel Kraft, fio de cobre, borracha, aço, ferrite |

---

## 5. Modelagem de Dados - Novas Tabelas

### 5.1. Departamentos e Funcionários

```sql
-- DEPARTAMENTOS
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    sigla VARCHAR(10) NOT NULL,
    description TEXT,
    manager_id INT NULL,
    active BOOLEAN DEFAULT true,
    created_at DATETIME,
    updated_at DATETIME
);

-- FUNCIONÁRIOS
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    department_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(20),
    pis_pasep VARCHAR(20),
    ctps VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    position VARCHAR(100),
    role VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE NOT NULL,
    dismissal_date DATE NULL,
    status ENUM('active','inactive','fired','vacation') DEFAULT 'active',
    shift ENUM('morning','afternoon','night','commercial'),
    work_regime VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME
);
```

### 5.2. Engenharia do Produto (BOM)

```sql
ALTER TABLE products ADD COLUMN (
    product_type ENUM('finished','semi_finished','component','raw_material') DEFAULT 'finished',
    weight DECIMAL(10,3),
    unit VARCHAR(10) DEFAULT 'un',
    lead_time INT DEFAULT 0,
    drawing_number VARCHAR(50),
    revision VARCHAR(10) DEFAULT '00'
);

CREATE TABLE product_bom (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    component_id INT NOT NULL,
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(10) DEFAULT 'un',
    level INT DEFAULT 1,
    operation_code VARCHAR(20),
    waste_percent DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME
);

CREATE TABLE manufacturing_routes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    operation_order INT NOT NULL,
    operation_code VARCHAR(20) NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    department_id INT,
    machine_code VARCHAR(50),
    setup_time INT DEFAULT 0,
    cycle_time INT DEFAULT 0,
    labor_time INT DEFAULT 0,
    description TEXT,
    created_at DATETIME
);
```

### 5.3. Produção (Ordens de Produção)

```sql
CREATE TABLE production_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    quantity_produced INT DEFAULT 0,
    priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
    status ENUM('planned','released','in_progress','completed','paused','canceled') DEFAULT 'planned',
    start_date DATE,
    due_date DATE NOT NULL,
    completion_date DATE,
    sales_order_id INT NULL,
    responsible_id INT,
    notes TEXT,
    created_by INT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE production_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    production_order_id INT NOT NULL,
    employee_id INT NOT NULL,
    operation_code VARCHAR(20),
    quantity_good INT NOT NULL,
    quantity_defective INT DEFAULT 0,
    machine_code VARCHAR(50),
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    downtime INT DEFAULT 0,
    downtime_reason VARCHAR(255),
    notes TEXT,
    created_at DATETIME
);
```

### 5.4. Qualidade

```sql
CREATE TABLE quality_inspections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    production_record_id INT NOT NULL,
    inspector_id INT NOT NULL,
    product_id INT NOT NULL,
    inspection_type ENUM('incoming','in_process','final','audit') NOT NULL,
    result ENUM('approved','rejected','rework') NOT NULL,
    defects_found JSON,
    notes TEXT,
    created_at DATETIME
);
```

### 5.5. Compras e Suprimentos

```sql
CREATE TABLE purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    requester_id INT,
    status ENUM('pending','approved','sent','partial','received','canceled'),
    order_date DATE NOT NULL,
    expected_date DATE,
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE purchase_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2),
    received_quantity DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending','partial','received','canceled') DEFAULT 'pending',
    created_at DATETIME
);

CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    trade_name VARCHAR(200),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    ie VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    payment_terms VARCHAR(100),
    delivery_time INT,
    rating INT DEFAULT 3,
    status ENUM('active','inactive','blocked') DEFAULT 'active',
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

---

## 6. Fluxo de Produção (Auto-Falante)

```
1. Venda / Previsão
       │
2. Planejamento (PCP) -> OP + Liberação materiais + Programação máquinas
       │
3. Injeção / Moldagem (Cone, Surround, Spider)
       │
4. Montagem Conjunto Mecânico (Colagem + Centralização)
       │
5. Montagem Conjunto Magnético (Imã + Placas + Magnetização)
       │
6. Montagem Final (MC+CM+Basket + Solda + Acabamento)
       │
7. Testes e Qualidade (Elétrico, Acústico, Vedação, Visual)
       │
8. Embalagem e Expedição (Individual + Caixa Master + Paletização)
```

---

## 7. Indicadores (KPI) Industriais

| KPI | Descrição | Fórmula |
|-----|-----------|---------|
| **OEE** | Overall Equipment Effectiveness | Disponibilidade x Performance x Qualidade |
| **Lead Time** | Tempo total de fabricação | Data fim - Data início |
| **Refugo** | % de peças defeituosas | (Peças refugadas / Total produzido) x 100 |
| **Produtividade** | Peças por hora | Total produzido / Horas trabalhadas |
| **Custo por peça** | Custo unitário de fabricação | Custo total / Peças produzidas |
| **Giro de Estoque** | Rotatividade dos materiais | Custo dos materiais / Estoque médio |
| **Nível de Serviço** | % entregas no prazo | Pedidos no prazo / Total de pedidos x 100 |

---

## 8. Relatórios Industriais

- **Relatório de Produção Diário** - OPs concluídas, paradas, refugo
- **Relatório de Eficiência por Máquina** - OEE individual
- **Relatório de Estoque** - Matéria-prima, WIP, produto acabado
- **Relatório de Custos** - Custo real vs. padrão
- **Relatório de Qualidade** - Defeitos por tipo, por fornecedor
- **Curva ABC** - Materiais mais consumidos / mais valiosos
- **Programa Mestre de Produção (MPS)** - OPs programadas

---

## 9. Resumo das Tabelas

### Novas Tabelas Industriais

| # | Tabela | Descrição |
|---|--------|-----------|
| 01 | departments | Departamentos da empresa |
| 02 | employees | Funcionários (com carteira, salário, turno) |
| 03 | product_bom | Estrutura do produto (BOM) |
| 04 | manufacturing_routes | Roteiro de fabricação |
| 05 | production_orders | Ordens de produção |
| 06 | production_records | Apontamento de produção |
| 07 | quality_inspections | Inspeção de qualidade |
| 08 | purchase_orders | Pedidos de compra |
| 09 | purchase_order_items | Itens do pedido de comp
