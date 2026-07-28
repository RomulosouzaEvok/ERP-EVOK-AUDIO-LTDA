# Depreciacao de Ativos - ERP EVOK AUDIO

## Metodo Linear

```
Depreciacao Anual = (Valor Aquisicao - Valor Residual) / Vida Util (anos)
Depreciacao Mensal = Depreciacao Anual / 12

Exemplo Injetora:
  Valor: R$ 180.000,00
  Residual (10%): R$ 18.000,00
  Vida Util: 10 anos
  Dep. Anual: (180.000 - 18.000) / 10 = R$ 16.200,00
  Dep. Mensal: R$ 1.350,00
  Apos 5 anos -> R$ 81.000 depreciado
  Valor Contabil: R$ 99.000,00
```

## Taxas Fiscais (Receita Federal)

| Grupo | Taxa Anual | Vida Util |
|-------|------------|-----------|
| Maquinas equipamentos | 10% | 10 anos |
| Instalacoes | 10% | 10 anos |
| Moveis e utensilios | 10% | 10 anos |
| Veiculos | 20% | 5 anos |
| Computadores | 20% | 5 anos |
| Ferramentas | 20% | 5 anos |
| Edificios | 4% | 25 anos |

## Tabelas SQL

```sql
CREATE TABLE asset_depreciation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    reference_date DATE NOT NULL,
    acquisition_value DECIMAL(15,2),
    residual_value DECIMAL(15,2),
    accumulated_before DECIMAL(15,2),
    monthly_depreciation DECIMAL(10,2),
    accumulated_after DECIMAL(15,2),
    book_value DECIMAL(15,2),
    created_at DATETIME
);

CREATE TABLE asset_depreciation_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    asset_id INT NOT NULL,
    method ENUM('linear','accelerated') DEFAULT 'linear',
    useful_life_months INT NOT NULL,
    residual_percent DECIMAL(5,2) DEFAULT 10.00,
    start_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at DATETIME
);
```

## Simulacao EVOK AUDIO

| Ativo | Valor | Residual | Vida Util | Dep. Anual | Dep. Mensal |
|-------|-------|----------|-----------|------------|-------------|
| Injetora Cone | R$ 180.000 | 10% | 10 anos | R$ 16.200 | R$ 1.350 |
| Bobinadeira | R$ 55.000 | 10% | 5 anos | R$ 9.900 | R$ 825 |
| Prensa Surround | R$ 65.000 | 10% | 10 anos | R$ 5.850 | R$ 488 |
| Teste Acustico | R$ 250.000 | 10% | 10 anos | R$ 22.500 | R$ 1.875 |
| Empilhadeira | R$ 90.000 | 10% | 5 anos | R$ 16.200 | R$ 1.350 |
| Fiorino | R$ 80.000 | 10% | 5 anos | R$ 14.400 | R$ 1.200 |
| Computadores | R$ 50.000 | 0% | 5 anos | R$ 10.000 | R$ 833 |
| **Total** | **R$ 770.000** | | | **R$ 95.050** | **R$ 7.921** |
