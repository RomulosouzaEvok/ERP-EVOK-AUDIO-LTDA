# Regimes Tributarios no Brasil - ERP EVOK AUDIO

## Sumario
1. Simples Nacional
2. Lucro Presumido
3. Lucro Real
4. Tabela Comparativa

---

## 1. SIMPLES NACIONAL

### Quem pode aderir
- ME (Microempresa): faturamento ate R$ 360.000,00/ano
- EPP (Empresa de Pequeno Porte): faturamento ate R$ 4.800.000,00/ano

### Anexo II - Industria (onde a EVOK Audio se enquadra se for SN)

**Faixas de faturamento e aliquotas:**

| Faixa | Receita Bruta em 12 meses (R$) | Aliquota Nominal | Valor a Deduzir (R$) |
|-------|-------------------------------|-----------------|---------------------|
| 1a | Ate 180.000,00 | 4,50% | 0,00 |
| 2a | De 180.000,01 a 360.000,00 | 7,30% | 5.040,00 |
| 3a | De 360.000,01 a 720.000,00 | 10,60% | 16.920,00 |
| 4a | De 720.000,01 a 1.800.000,00 | 14,30% | 43.560,00 |
| 5a | De 1.800.000,01 a 3.600.000,00 | 21,50% | 173.160,00 |
| 6a | De 3.600.000,01 a 4.800.000,00 | 30,00% | 478.440,00 |

### Calculo do DAS (Documento de Arrecadacao do Simples Nacional)

```
Valor DAS = (RBT12 x Aliquota Nominal - Valor a Deduzir) / RBT12 x Receita do Mes

Onde:
  RBT12 = Receita Bruta dos ultimos 12 meses
```

**Exemplo pratico:**
- Receita acumulada 12 meses: R$ 850.000,00 (4a faixa)
- Receita do mes: R$ 80.000,00
- Aliquota efetiva = (850.000,00 x 14,30% - 43.560,00) / 850.000,00 = 9,17%
- DAS do mes = 80.000,00 x 9,17% = R$ 7.336,00

### Reparticao dos Tributos no Anexo II

| Faixa | IRPJ | CSLL | COFINS | PIS/PASEP | CPP | IPI | ICMS |
|-------|------|------|--------|-----------|-----|-----|------|
| 1a | 5,50% | 3,50% | 12,74% | 2,76% | 43,40% | 7,50% | 24,60% |
| 2a | 5,50% | 3,50% | 12,74% | 2,76% | 43,40% | 7,50% | 24,60% |
| 3a | 5,50% | 3,50% | 12,74% | 2,76% | 43,40% | 7,50% | 24,60% |
| 4a | 5,50% | 3,50% | 12,74% | 2,76% | 43,40% | 7,50% | 24,60% |
| 5a | 5,50% | 3,50% | 14,05% | 3,04% | 44,80% | 5,00% | 24,11% |
| 6a | 13,50% | 10,00% | 7,50% | 1,62% | 41,50% | 0,00% | 25,88% |

### Obrigacoes do Simples Nacional
- **PGDAS-D**: Programa Gerador do DAS - declaracao mensal
- **DEFIS**: Declaracao de Informacoes Socioeconomicas e Fiscais - anual
- **NF-e**: Nota Fiscal Eletronica (obrigatorio para industria)
- **ECF**: Escrituracao Contabil Fiscal (se optante)

---

## 2. LUCRO PRESUMIDO

### Quem pode aderir
- Empresas com faturamento anual ate R$ 78.000.000,00
- Nao obrigadas ao Lucro Real

### Presuncao do Lucro (Industria)

| Tipo de Atividade | % Presuncao IRPJ | % Presuncao CSLL |
|-------------------|-----------------|-----------------|
| Industria (venda de mercadorias) | 8% | 12% |
| Transporte de cargas | 8% | 12% |
| Servicos em geral | 32% | 32% |
| Servicos hospitalares | 8% | 32% |

### Aliquotas dos Tributos (Lucro Presumido)

| Tributo | Aliquota | Base de Calculo |
|---------|----------|-----------------|
| IRPJ | 15% | Lucro Presumido |
| IRPJ Adicional | 10% | Lucro Presumido que exceder R$ 20.000,00/mes |
| CSLL | 9% | Lucro Presumido |
| PIS | 0,65% | Faturamento Bruto |
| COFINS | 3,00% | Faturamento Bruto |
| IPI | Variavel (10% auto-falantes) | Valor do Produto |
| ICMS | Variavel (18% SP) | Valor da Operacao |

### Calculo Completo (Exemplo: R$ 500.000,00/mes)

```
Faturamento Bruto:              R$ 500.000,00
(-) IPI (10%):                  R$  50.000,00
Receita Bruta Vendas:           R$ 450.000,00

--- IRPJ ---
Base Presumida (8%):            R$  36.000,00
IRPJ (15%):                     R$   5.400,00
Adicional IRPJ (10% s/ 16k):    R$   1.600,00
IRPJ Total:                     R$   7.000,00

--- CSLL ---
Base Presumida (12%):           R$  54.000,00
CSLL (9%):                      R$   4.860,00

--- PIS e COFINS (Cumulativos) ---
PIS (0,65%):                    R$   2.925,00
COFINS (3,00%):                 R$  13.500,00

--- IPI ---
IPI (10%):                      R$  50.000,00

--- ICMS ---
ICMS (18% SP):                  R$  90.000,00

TOTAL TRIBUTOS (sem INSS):      R$ 168.285,00
Carga Tributaria Efetiva:       33,66%
```

### Obrigacoes do Lucro Presumido

| Obrigacao | Periodicidade | Descricao |
|-----------|--------------|-----------|
| DARF IRPJ/CSLL | Trimestral | Pagamento do IRPJ e CSLL |
| DARF PIS/COFINS | Mensal | Pagamento PIS e COFINS |
| DCTF | Mensal | Declaracao de Creditos e Debitos |
| ECD | Anual | Escrituracao Contabil Digital |
| ECF | Anual | Escrituracao Contabil Fiscal |
| SPED Fiscal | Mensal | Escrituracao ICMS/IPI |
| NF-e | Eventual | Nota Fiscal Eletronica |

---

## 3. LUCRO REAL

### Quem e obrigado ao Lucro Real
- Empresas com faturamento superior a R$ 78.000.000,00/ano
- Instituicoes financeiras e equiparadas
- Empresas com lucros oriundos do exterior
- Empresas com beneficios fiscais

### Aliquotas dos Tributos (Lucro Real)

| Tributo | Aliquota | Base de Calculo |
|---------|----------|-----------------|
| IRPJ | 15% | Lucro Liquido Ajustado (LAIR) |
| IRPJ Adicional | 10% | LAIR que exceder R$ 20.000,00/mes |
| CSLL | 9% | LAIR |
| PIS (Nao Cumulativo) | 1,65% | Receita Bruta - Creditos |
| COFINS (Nao Cumulativo) | 7,60% | Receita Bruta - Creditos |
| IPI | 10% (auto-falantes) | Valor do Produto |
| ICMS | 18% (SP) | Valor da Operacao |

### PIS/COFINS Nao Cumulativo - Creditos Permitidos

A grande vantagem do Lucro Real e o aproveitamento de creditos:

**Podem gerar creditos de PIS/COFINS:**
- Aquisicao de materias-primas (bobinas, cones, imas, baskets)
- Aquisicao de embalagens
- Energia eletrica consumida na producao
- Alugueis de predios, maquinas e equipamentos
- Depreciacao de maquinas e equipamentos
- Frete na venda de produtos
- Armazenagem e frigorifico
- Contraprestacao de arrendamento mercantil (leasing)
- Comissoes pagas a intermediarios

### Exemplo PIS/COFINS Nao Cumulativo

```
Receita Bruta do Mes: R$ 500.000,00

PIS Debito (1,65%):                R$ 8.250,00
Creditos PIS (estimado 0,50%):     (R$ 2.500,00)
PIS a Recolher:                    R$ 5.750,00

COFINS Debito (7,60%):             R$ 38.000,00
Creditos COFINS (estimado 3,00%):  (R$ 15.000,00)
COFINS a Recolher:                 R$ 23.000,00
```

### Apuracao no Lucro Real

**1. Trimestral:**
```
Apuracao a cada trimestre (31/03, 30/06, 30/09, 31/12)
Pagamento em quota unica ou 3 quotas mensais
```

**2. Anual com Balancetes Mensais:**
```
Apuracao anual (31/12)
Pagamento mensal por estimativa (base 8% receita bruta)
Ajuste no final do ano
```

### Obrigacoes do Lucro Real

| Obrigacao | Periodicidade |
|-----------|--------------|
| DCTF | Mensal |
| ECD | Anual |
| ECF | Anual |
| SPED Fiscal | Mensal |
| eSocial | Mensal |
| Reinf | Mensal |
| NF-e | Eventual |
| DIFAL | Mensal |

---

## 4. TABELA COMPARATIVA

### Qual regime escolher?

| Situacao da EVOK Audio | Melhor Regime |
|------------------------|--------------|
| Faturamento ate R$ 4,8M | Simples Nacional (Anexo II) |
| Faturamento entre R$ 4,8M e R$ 78M | Lucro Presumido |
| Faturamento acima de R$ 78M | Lucro Real (obrigatorio) |
| Margem de lucro muito baixa | Lucro Real (compensa pelos creditos) |
| Margem de lucro alta | Lucro Presumido |
| Muitos creditos de PIS/COFINS | Lucro Real |

### Carga Tributaria por Regime (Industria Auto-Falantes)

| Faixa Faturamento (R$/mes) | Simples Nacional | Lucro Presumido | Lucro Real |
|---------------------------|-----------------|-----------------|------------|
| 100.000 | 4,50% a 7,30% | ~28% | ~25% |
| 500.000 | ~9,17% | ~33% | ~28% |
| 1.500.000 | ~13,50% | ~33% | ~28% |
| 5.000.000 | ~21,50% | ~33% | ~30% |

### Resumo das Diferencas

| Caracteristica | Simples Nacional | Lucro Presumido | Lucro Real |
|---------------|-----------------|-----------------|------------|
| Complexidade | Baixa | Media | Alta |
| Carga Tributaria | Menor (ate 4,8M) | Intermediaria | Pode ser menor |
| Creditos PIS/COFINS | Nao se aplica | Nao (cumulativo) | Sim (nao cumulativo) |
| Planejamento Tributario | Limitado | Possivel | Avancado |
| Burocracia | Reduzida | Moderada | Elevada |
| Ideal para | Micro/Pequenas empresas | Medias empresas | Grandes empresas |

---

## Referencias
- Lei Complementar 123/2006 (Simples Nacional)
- Lei 9.249/95 (Lucro Presumido e Real)
- Decreto 8.850/2016 (Anexos SN)
- RICMS SP - Decreto 45.490/2000
- TIPI - Decreto 8.950/2016
