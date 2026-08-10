# Manufatura - Produção de Auto-Falantes

## Departamento de Produção (PROD)

### Estrutura Hierárquica

| Cargo | Qtd | Função |
|-------|-----|--------|
| Gerente de Produção | 1 | Gestão geral da fábrica |
| Supervisor de Produção | 2 | Coordenar turnos (diurno/noturno) |
| Líder de Linha | 4 | Liderar equipe por célula |
| Operador de Injetora | 8 | Operar máquinas de injeção (cone/surround/spider) |
| Operador de Bobinadeira | 6 | Bobinar voice coils |
| Montador de Auto-falante | 20 | Montagem manual e semiautomática |
| Soldador | 4 | Solda de terminais e conexões |
| Operador de Testes | 4 | Testes elétricos e acústicos |
| Auxiliar de Produção | 10 | Abastecimento, limpeza, suporte |
| Ajudante Geral | 6 | Serviços gerais na linha |

### Funções Operacionais na Manufatura

| Função | Descrição Habilidades |
|--------|----------------------|
| Injetor de Cone | Operar injetora, controlar temperatura, pressão, ciclo |
| Injetor de Surround | Moldar borda de borracha/espuma, controle de cura |
| Operador de Bobinadeira | Bobinar fio de cobre em former, controle de tensão |
| Montador de Conjunto Mecânico | Colar cone + bobina + spider, centralizar gap |
| Montador de Conjunto Magnético | Montar imã + placas, magnetizar |
| Montador Final | Conjunto mecânico + magnético + basket, parafusar |
| Soldador de Terminais | Soldar fios da bobina no terminal, teste de continuidade |
| Operador de Teste Elétrico | Medir impedância, frequência, polaridade |
| Operador de Teste Acústico | Validar resposta em frequência, THD, ruído |
| Inspetor Visual | Verificar acabamento, cola, alinhamento |

### Células de Produção (Layout)

```
Célula 1: Injeção
┌─────────────────────────────────────────────────────┐
│ [Injetora 1] [Injetora 2] [Injetora 3] [Injetora 4] │
│ Cone 12"     Cone 15"     Surround      Spider       │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
Célula 2: Conjunto Mecânico
┌─────────────────────────────────────────────────────┐
│ [Colagem Cone] [Colagem VC] [Colagem Spider] [GAP]  │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
Célula 3: Conjunto Magnético
┌─────────────────────────────────────────────────────┐
│ [Montagem Imã] [Cola Placas] [Magnetização]         │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
Célula 4: Montagem Final
┌─────────────────────────────────────────────────────┐
│ [União MC+CM] [Solda] [Acabamento] [Inspeção Visual]│
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
Célula 5: Testes
┌─────────────────────────────────────────────────────┐
│ [Teste Elétrico] [Teste Acústico] [Teste Vedação]   │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
Célula 6: Embalagem
┌─────────────────────────────────────────────────────┐
│ [Embalagem] [Caixa Master] [Paletização] [Expedição]│
└─────────────────────────────────────────────────────┘
```

### Turnos de Trabalho

| Turno | Horário | Supervisor | Efetivo |
|-------|---------|------------|---------|
| Matutino | 06:00 - 14:00 | 1 | 35 operadores |
| Vespertino | 14:00 - 22:00 | 1 | 30 operadores |
| Noturno | 22:00 - 06:00 | 0 (líder) | 15 operadores |

### Capacidade Produtiva (Estimada)

| Produto | Capacidade/Hora | Capacidade/Dia | Capacidade/Mês |
|---------|----------------|----------------|----------------|
| Auto-falante 12" 300W | 80 un | 1.600 un | 35.200 un |
| Auto-falante 15" 500W | 50 un | 1.000 un | 22.000 un |
| Tweeter | 200 un | 4.000 un | 88.000 un |
| Mid-range | 120 un | 2.400 un | 52.800 un |

### Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL** — este ERP
> roda **exclusivamente em PostgreSQL 16**. Ele **não** descreve o banco real.
> Confronto contra `erp_evok_audio` nesta data:
>
> - `daily_production` **não existe** — o apontamento real é
>   `production_order_tracking` (por etapa da rota, com `quantity_good` /
>   `quantity_scrapped`, ENUM de status
>   `pending | in_progress | paused | completed | skipped`);
> - `machine_downtime` **não existe**. A tabela real é
>   **`production_downtimes`**, ligada a `work_centers` (não a `assets`) e
>   opcionalmente a `production_orders`, com `started_at`/`finished_at` e
>   `reason` no ENUM em português
>   `setup | manutencao_corretiva | manutencao_preventiva | falta_material | falta_operador | qualidade | outros`
>   — **sem** `breakdown`, `adjustment` nem `cleaning`. Existe índice UNIQUE
>   parcial `(work_center_id) WHERE finished_at IS NULL` (uma parada aberta
>   por centro de trabalho).
>
> Fonte da verdade do schema: `docs/database/04-DICIONARIO_DADOS.md`. Achado
> **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- APONTAMENTO DIÁRIO DE PRODUÇÃO
CREATE TABLE daily_production (
    id INT PRIMARY KEY AUTO_INCREMENT,
    production_date DATE NOT NULL,
    work_center_id INT NOT NULL,
    product_id INT NOT NULL,
    shift ENUM('morning','afternoon','night'),
    supervisor_id INT,
    planned_qty INT,
    produced_qty INT DEFAULT 0,
    defective_qty INT DEFAULT 0,
    rework_qty INT DEFAULT 0,
    available_minutes INT DEFAULT 480,
    downtime_minutes INT DEFAULT 0,
    downtime_reason VARCHAR(255),
    notes TEXT,
    created_at DATETIME
);

-- PARADA DE MÁQUINA
CREATE TABLE machine_downtime (
    id INT PRIMARY KEY AUTO_INCREMENT,
    machine_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_minutes INT,
    reason_category ENUM('setup','breakdown','maintenance','material_lack',
                         'operator','quality','adjustment','cleaning','other'),
    reason_detail TEXT,
    operator_id INT,
    created_at DATETIME
);
```

### Principais Máquinas e Equipamentos

| Máquina | Função | Operadores | Capacidade |
|---------|--------|------------|------------|
| Injetora de Cone (Hidráulica 80t) | Moldar cone | 1 | 100 un/h |
| Injetora de Cone (Hidráulica 120t) | Moldar cone grande | 1 | 60 un/h |
| Prensa de Surround (Pneumática) | Prensar borda | 1 | 150 un/h |
| Bobinadeira Automática | Bobinar voice coil | 1 | 200 un/h |
| Máquina de Colagem (Spider) | Colar centrador | 1 | 120 un/h |
| Centralizadora de Gap | Alinhar bobina/imã | 1 | 80 un/h |
| Magnetizadora (Pulso) | Magnetizar imã | 1 | 100 un/h |
| Solda Ultrassônica | Soldar terminais | 1 | 200 un/h |
| Esteira de Montagem | Transporte | 3 | 80 un/h |
| Câmara Acústica | Teste de som | 1 | 60 un/h |
| Teste de Impedância (LMS) | Medir parâmetros | 1 | 120 un/h |
