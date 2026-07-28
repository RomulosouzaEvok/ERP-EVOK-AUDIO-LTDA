# Modulo Tributario - ERP EVOK AUDIO

## Estrutura dos Documentos

```
docs/tributario/
├── 00-README.md                  <- Este arquivo (visao geral)
├── 01-REGIMES.md                 <- Regimes tributarios (SN, LP, LR)
├── 02-ICMS_ESTADOS.md            <- ICMS por estado, NCM, CFOP, importacao
└── 03-RECEITA_FEDERAL.md         <- SPED, NFe, DCTF, eSocial, Reinf
```

## Os 3 Regimes dos Clientes

O sistema atende clientes nos 3 regimes fiscais brasileiros:

| Regime | Sigla | Faturamento Maximo | PIS | COFINS | Apuracao |
|--------|-------|-------------------|-----|--------|----------|
| Simples Nacional | SN | R$ 4,8M | Incluso | Incluso | Mensal (DAS) |
| Lucro Presumido | LP | R$ 78M | 0,65% | 3,00% | Trimestral |
| Lucro Real | LR | Ilimitado | 1,65% | 7,60% | Trimestral/Anual |

## Campos do Cliente para Tributacao

```sql
-- Campos adicionados a tabela customers
tax_regime_customer ENUM('simples_nacional','lucro_presumido','lucro_real'),
ie VARCHAR(20),                                 -- Inscricao Estadual
im VARCHAR(20),                                 -- Inscricao Municipal
ind_final ENUM('0','1'),                        -- Consumidor final?
ind_ie ENUM('1','2','9'),                       -- Contribuinte ICMS?
cnae VARCHAR(10),                               -- CNAE fiscal
crt ENUM('1','2','3')                           -- CRT: 1=SN, 2=LP, 3=LR
```

## Integracao Receita Federal

1. **NF-e**: Emissao com validacao SEFAZ
2. **SPED Fiscal**: Envio mensal do arquivo
3. **SPED Contabil (ECD)**: Escrituracao anual
4. **ECF**: Declaracao anual
5. **DCTF**: Declaracao mensal
6. **eSocial**: Dados dos funcionarios
7. **Reinf**: Contribuicoes previdenciarias
8. **PGDAS-D/DEFIS**: Para Simples Nacional

## Fluxo de Tributacao no Sistema

```
Venda/Compra
    |
    v
Identifica Regime do Cliente (SN, LP, LR)
    |
    v
Identifica UF de Destino (ICMS)
    |
    v
Identifica NCM do Produto (IPI)
    |
    v
Calcula os Impostos:
  - ICMS (regime, UF, NCM)
  - IPI (NCM)
  - PIS (regime)
  - COFINS (regime)
  - IRPJ/CSLL (regime)
    |
    v
Gera NFe com todos os tributos
    |
    v
Contabiliza na apuracao mensal
    |
    v
Gera arquivos SPED, DCTF, etc.
