# Facilities - Módulo Administrativo

> **[PENDENTE]** As tabelas `fleet_vehicles`, `fuel_records`,
> `cleaning_schedule` e `facility_areas` abaixo são planejamento — não
> existem no schema real (ver `docs/database/DATABASE.md`). O que **é real hoje**: o
> departamento Facilities (código `17` em `departments`,
> `server/src/config/seeds.ts`) e o módulo de Patrimônio (`assets`, ver
> `docs/patrimonio/00-README.md`) para controle de máquinas/equipamentos/
> veículos como ativos.

## Departamento de Facilities (FAC)

| Cargo | Qtd | Função |
|-------|-----|--------|
| Supervisor Administrativo | 1 | Gestão de facilities, frota |
| Serviços Gerais | 2 | Limpeza, copa, manutenção predial |
| Motorista | 2 | Entregas, transporte executivo |
| Vigilante | 1 (terceirizado) | Segurança patrimonial |

## Funções

| Função | Descrição |
|--------|-----------|
| Limpeza | Higienização da fábrica e escritórios |
| Manutenção Predial | Elétrica, hidráulica, pintura |
| Frota | Manutenção veículos, combustível, seguro |
| Segurança | CFTV, alarme, controle de acesso |
| Copa | Café, água, refeições |
| Jardinagem | Área externa |
| Controle de EPIs | Estoque e distribuição |

## Tabelas SQL

```sql
-- CONTROLE DE FROTA
CREATE TABLE fleet_vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plate VARCHAR(10) UNIQUE NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    year INT,
    color VARCHAR(30),
    fuel_type ENUM('gasoline','ethanol','diesel','flex','electric'),
    renavam VARCHAR(30),
    chassi VARCHAR(50),
    insurance_company VARCHAR(100),
    insurance_policy VARCHAR(50),
    insurance_expiry DATE,
    last_oil_change DATE,
    next_oil_change_km INT,
    current_km INT,
    status ENUM('active','maintenance','deactivated','sold'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- ABASTECIMENTO
CREATE TABLE fuel_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    date DATETIME NOT NULL,
    km_at_refuel INT,
    liters DECIMAL(10,2),
    price_per_liter DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    fuel_station VARCHAR(100),
    driver_id INT,
    created_at DATETIME
);

-- CONTROLE DE LIMPEZA
CREATE TABLE cleaning_schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    area VARCHAR(100) NOT NULL,
    frequency ENUM('daily','alternate','weekly','biweekly','monthly'),
    responsible_person VARCHAR(100),
    last_cleaning DATE,
    next_cleaning DATE,
    notes TEXT,
    created_at DATETIME
);

-- ÁREA FÍSICA DA FÁBRICA
CREATE TABLE facility_areas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    area_type ENUM('production','warehouse','office','lab','amenities','external'),
    square_meters DECIMAL(10,2),
    department_id INT,
    capacity_persons INT,
    notes TEXT,
    created_at DATETIME
);
```

---

**Última atualização:** 2026-08-06
