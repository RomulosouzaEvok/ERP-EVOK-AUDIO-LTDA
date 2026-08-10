# Testes Acústicos - Módulo Qualidade

## Laboratório de Testes Acústicos

### Equipamentos do Laboratório

| Equipamento | Função | Marca/Modelo | Última Calibração |
|-------------|--------|-------------|-------------------|
| Câmara Anecoica | Teste acústico isolado | Própria (2x2x2m) | 2024-01 |
| Analisador de Áudio | Medir THD, resposta | Audio Precision APx525 | 2024-01 |
| Microfone de Medição | Captar SPL | Brüel & Kjær 4189 | 2024-01 |
| Amplificador de Potência | Fornecer sinal | QSC PL380 | - |
| Multímetro Digital | Medir resistência | Fluke 87V | 2024-01 |
| Medidor de Impedância | Curva de impedância | Dayton DATS V3 | 2024-01 |
| Gerador de Sinais | Sinais de teste | APx525 integrado | 2024-01 |
| Osciloscópio | Ver forma de onda | Tektronix TDS2024 | 2024-01 |
| Gaussmeter | Medir campo magnético | Lake Shore 410 | 2024-01 |

### Tipos de Teste

| Teste | Descrição | Equipamento | Duração |
|-------|-----------|-------------|---------|
| Impedância | Curva de impedância x frequência | DATS / LMS | 30s |
| Resposta em Frequência | SPL x Hz (20Hz-20kHz) | APx + Mic | 60s |
| THD | Distorção harmônica total | APx | 30s |
| Potência RMS | Potência máxima contínua | APx + Amp | 2h |
| Potência de Pico | Potência máxima instantânea | APx + Amp | 1s |
| Teste de Vida | Durabilidade acelerada | Câmara + Sinal | 100h |
| Polaridade | Fase do alto-falante | Verificador | 5s |
| Teste de Ruído | Chiado, batendo | Ouvido treinado | 10s |

### Parâmetros de Teste

#### Curva de Resposta em Frequência (12" 300W)

```
Frequência (Hz)  │ SPL (dB) │ Especificação
──────────────────┼──────────┼───────────────
        20       │    85    │ > 80 dB
        50       │    92    │ > 90 dB
       100       │    97    │ > 95 dB
       500       │    97    │ > 95 dB
      1000       │    97    │ > 95 dB
      2000       │    95    │ > 90 dB
      5000       │    90    │ > 85 dB
     10000       │    85    │ > 80 dB
     20000       │    75    │ > 70 dB
──────────────────┴──────────┴───────────────
Faixa útil: 45 Hz - 18 kHz (± 3 dB)
```

#### Limites de THD (12" 300W)

```
Frequência │ THD Máximo
───────────┼────────────
 20-100 Hz │ < 10%
100-500 Hz │  < 5%
500 Hz-5kHz│  < 3%
 5k-20kHz  │  < 5%
```

### Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> O bloco SQL abaixo é **rascunho de modelagem em dialeto MySQL** — este ERP
> roda **exclusivamente em PostgreSQL 16**. Confronto contra `erp_evok_audio`
> nesta data:
>
> - `acoustic_test_results` **existe**, mas: **não** tem coluna
>   `product_code`; o ENUM real de `test_type` é
>   `impedance | frequency_response | thd | power_rms | power_peak | life | polarity | noise | thiele_small`
>   (o rascunho traz `power` — que não existe — e omite `thiele_small`); e a
>   tabela real também tem `lot_number`, `production_order_id`,
>   `non_conformity_id`, `consumed_quantity` e `updated_at`. Desde o commit
>   `0d5812e` (gap G8) uma reprovação **sempre** abre RNC, preenchendo
>   `non_conformity_id`;
> - `test_certificates` **não existe**.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- RESULTADOS DE TESTE ACÚSTICO
CREATE TABLE acoustic_test_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    test_date DATETIME NOT NULL,
    tester_id INT NOT NULL,
    serial_number VARCHAR(50),
    test_type ENUM('impedance','frequency_response','thd','power','life','polarity','noise'),
    parameters JSON,
    result DECIMAL(10,4),
    unit VARCHAR(20),
    specification_min DECIMAL(10,4),
    specification_max DECIMAL(10,4),
    passed BOOLEAN NOT NULL,
    curve_data JSON,                          -- Dados da curva (arrays de frequência x SPL)
    notes TEXT,
    created_at DATETIME
);

-- CERTIFICADO DE TESTE
CREATE TABLE test_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    inspection_id INT,
    test_results JSON,                        -- Referência aos testes realizados
    conclusion ENUM('approved','approved_with_restrictions','rejected'),
    certificate_date DATE,
    valid_until DATE,
    issued_by INT,
    digital_signature VARCHAR(255),
    created_at DATETIME
);
```

### Relatório de Teste (Exemplo)

```
═══════════════════════════════════════════════════════
    CERTIFICADO DE TESTE - EVOK ÁUDIO
═══════════════════════════════════════════════════════
Produto: Auto-falante 12" 300W
Modelo: EVOK-12-300
Código: 85182100
Lote: PROD-2024-0100
Data: 15/01/2024
Técnico: João S.

TESTES REALIZADOS:
┌────────────────────┬────────────┬──────────┬────────┐
│ Teste              │ Resultado  │ Especificação│Status │
├────────────────────┼────────────┼──────────┼────────┤
│ Resistência DC     │ 6,3 Ω      │ 6,5±0,3  │ ✅    │
│ Impedância Nominal │ 8,2 Ω      │ 8,0±0,5  │ ✅    │
│ Polaridade         │ Positiva   │ Positiva │ ✅    │
│ Curto-circuito     │ OK         │ OK       │ ✅    │
│ SPL (1W/1m)        │ 96,5 dB    │ 97±2 dB  │ ✅    │
│ THD (100Hz)        │ 2,8%       │ < 5%     │ ✅    │
│ THD (1kHz)         │ 1,2%       │ < 3%     │ ✅    │
│ Potência RMS (2h)  │ 315W       │ 300W min │ ✅    │
│ Fs (Ressonância)   │ 42 Hz      │ 45±5 Hz  │ ✅    │
│ Teste de Vedação   │ OK         │ OK       │ ✅    │
│ Inspeção Visual    │ Aprovado   │ OK       │ ✅    │
└────────────────────┴────────────┴──────────┴────────┘

CONCLUSÃO: ✅ APROVADO

────────────────────────────────────────────────────────
