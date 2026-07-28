# ICMS por Estado e NCM - ERP EVOK AUDIO

## Aliquots Internas de ICMS por UF (2024)

### Tabela Geral

| UF | Estado | Aliquota Interna | Aliquota Interestadual (SP->UF) | Aliquota Interestadual (UF->SP) |
|----|--------|-----------------|-------------------------------|-------------------------------|
| AC | Acre | 17% | 7% | 7% |
| AL | Alagoas | 17% | 7% | 7% |
| AP | Amapa | 18% | 7% | 7% |
| AM | Amazonas | 18% | 12% (ZFM) | 7% |
| BA | Bahia | 18% | 7% | 7% |
| CE | Ceara | 18% | 7% | 7% |
| DF | Distrito Federal | 18% | 12% | 12% |
| ES | Espirito Santo | 17% | 12% | 12% |
| GO | Goias | 17% | 12% | 12% |
| MA | Maranhao | 18% | 7% | 7% |
| MT | Mato Grosso | 17% | 12% | 12% |
| MS | Mato Grosso do Sul | 17% | 12% | 12% |
| MG | Minas Gerais | 18% | 12% | 12% |
| PA | Para | 17% | 7% | 7% |
| PB | Paraiba | 18% | 7% | 7% |
| PR | Parana | 18% | 12% | 12% |
| PE | Pernambuco | 18% | 7% | 7% |
| PI | Piaui | 18% | 7% | 7% |
| RJ | Rio de Janeiro | 18% | 12% | 12% |
| RN | Rio Grande do Norte | 18% | 7% | 7% |
| RS | Rio Grande do Sul | 18% | 12% | 12% |
| RO | Rondonia | 17,5% | 7% | 7% |
| RR | Roraima | 17% | 7% | 7% |
| SC | Santa Catarina | 17% | 12% | 12% |
| SP | Sao Paulo | 18% | - | - |
| SE | Sergipe | 18% | 7% | 7% |
| TO | Tocantins | 18% | 7% | 7% |

### Regra Geral de Interestadual

```
SP para Sul e Sudeste (exc ES):    12%
SP para Norte, Nordeste, CO e ES:  7%
SP para exterior:                   0%
```

## DIFAL - Diferencial de Aliquota

Desde 2024, o DIFAL e devido para operacoes com consumidor final nao contribuinte.

### Calculo do DIFAL

```
DIFAL = Base x (Aliquota Interna Destino - Aliquota Interestadual Origem)
Parte Origem (SP) = 20% do DIFAL (2024)
Parte Destino (UF) = 80% do DIFAL (2024)

Exemplo: Venda SP -> RJ para consumidor final
  Valor: R$ 1.000,00
  ICMS Origem (12%): R$ 120,00
  ICMS Destino (18%): R$ 180,00
  DIFAL: R$ 60,00
  Para SP (20%): R$ 12,00
  Para RJ (80%): R$ 48,00
```

## NCM e IPI para Auto-Falantes

### NCMs do Capitulo 8518

Todas as NCMs aplicaveis a industria de auto-falantes:

| NCM | Descricao | IPI (%) | CEST (se houver) |
|-----|-----------|---------|------------------|
| 8518.10.00 | Microfones e seus suportes | 10% | - |
| 8518.21.00 | Alto-falante unico montado em caixa | 10% | - |
| 8518.22.00 | Alto-falantes multiplos montados em caixa | 10% | - |
| 8518.29.00 | Outros alto-falantes (drivers, tweeters) | 10% | - |
| 8518.30.00 | Fones de ouvido e auriculares | 10% | - |
| 8518.40.00 | Amplificadores eletricos de audio | 15% | - |
| 8518.50.00 | Conjuntos de alto-falantes (kits) | 10% | - |
| 8518.90.10 | Partes: cones | 10% | - |
| 8518.90.20 | Partes: bobinas (voice coil) | 10% | - |
| 8518.90.30 | Partes: imas | 10% | - |
| 8518.90.40 | Partes: armações (baskets) | 10% | - |
| 8518.90.50 | Partes: spiders (centradores) | 10% | - |
| 8518.90.90 | Outras partes para alto-falantes | 10% | - |

### CFOPs (Codigo Fiscal de Operacoes) para Industria de Auto-Falantes

| CFOP | Descricao | Tipo |
|------|-----------|------|
| 5.102 | Venda de mercadoria industrializada (dentro do estado) | Saida |
| 5.401 | Venda de mercadoria industrializada (fora do estado) | Saida |
| 5.102 | Venda de producao do estabelecimento | Saida |
| 5.901 | Remessa para industrializacao | Saida |
| 1.101 | Compra para industrializacao | Entrada |
| 1.201 | Compra de materia-prima | Entrada |
| 1.102 | Compra para comercializacao | Entrada |
| 2.101 | Devolucao de venda | Entrada |
| 3.101 | Compra do exterior (importacao) | Importacao |
| 6.101 | Venda ao exterior (exportacao) | Exportacao |

## ICMS ST (Substituicao Tributaria) para Auto-Falantes

Auto-falantes (NCM 8518) estao sujeitos a ST em alguns estados:

### Estados com ST para NCM 8518

| UF | ICMS ST | Observacao |
|----|---------|------------|
| SP | Nao | Geralmente sem ST para auto-falantes |
| MG | Sim | Quando destinado a consumidor final |
| RJ | Sim | Protocolo ICMS 10/2019 |
| RS | Nao | Sem ST especifica |
| PR | Sim | Produto sujeito a ST em alguns protocolos |

### Calculo do ICMS ST

```
MVA (Margem de Valor Agregado): depende do produto e estado
Base ST = (Valor Produto + IPI + Frete) x (1 + MVA/100)
ICMS ST = Base ST x Aliquota Interna - ICMS Proprio

Exemplo SP -> SP:
  Valor Produto: R$ 1.000,00
  IPI (10%): R$ 100,00
  MVA (50%): 
  Base ST = (1.000 + 100) x 1,50 = R$ 1.650,00
  ICMS Total = 1.650,00 x 18% = R$ 297,00
  ICMS Proprio = 1.000,00 x 18% = R$ 180,00
  ICMS ST = 297,00 - 180,00 = R$ 117,00
```

## Tabela de Aliquots ICMS por Regiao (Resumo)

### Para industria localizada em SP:

| Regiao Destino | Aliquota Interestadual | Diferencial |
|---------------|----------------------|-------------|
| SP (mesmo estado) | 18% | 0% |
| Sul (PR, SC, RS) | 12% | 6% |
| Sudeste (MG, RJ, ES) | 12% | 6% |
| Centro-Oeste (DF, GO, MT, MS) | 12% | 6% |
| Nordeste | 7% | 11% |
| Norte (AC, AP, AM, PA, RO, RR, TO) | 7% | 11% |
| Exterior | 0% | 18% |

## Importacao de Componentes

### Tributos na Importacao de Pecas para Auto-Falantes

| Tributo | Aliquota | Base |
|---------|----------|------|
| II - Imposto de Importacao | 10-20% | Valor Aduaneiro |
| IPI | 10% | (Valor Aduaneiro + II) |
| PIS Importacao | 2,10% | (Valor Aduaneiro + II + IPI + ICMS) |
| COFINS Importacao | 9,65% | (Valor Aduaneiro + II + IPI + ICMS) |
| ICMS Importacao | 18% | (Valor Aduaneiro + II + IPI + PIS + COFINS + ICMS) |
| AFRMM | 25% | Frete internacional |

### Exemplo de Calculo de Importacao

```
Componente: Voice Coil (R$ 10.000,00 FOB China)
  Frete: R$ 1.500,00
  Seguro: R$ 500,00
  Valor Aduaneiro: R$ 12.000,00
  
  II (15%): R$ 1.800,00
  IPI (10%): R$ 1.380,00           (12.000 + 1.800) x 10%
  PIS Imp (2,10%): R$ 318,78       (12.000 + 1.800 + 1.380 + ICMS?) x 2,10%
  COFINS Imp (9,65%): R$ 1.464,26
  
  ICMS Imp (18%): R$ 3.196,18      Calculo por dentro
  
  Total Tributos: R$ 8.159,22
  Custo Total Nacionalizado: R$ 20.159,22
