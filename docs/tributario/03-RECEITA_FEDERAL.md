# Integracao com a Receita Federal - ERP EVOK AUDIO

## 1. SPED - Sistema Publico de Escrituracao Digital

### 1.1 SPED Fiscal (ICMS/IPI)
Arquivo digital mensal com todos os documentos fiscais.

**Registros principais:**
| Registro | Descricao | Origem no ERP |
|----------|-----------|---------------|
| C100 | Notas Fiscais emitidas | Tabela sales + nfe |
| C170 | Itens das notas | Tabela sale_items |
| C190 | Resumo ICMS por CST | Calculo dos tributos |
| C500 | Notas de entrada | Tabela purchase_orders + nfe |
| E100 | Periodo de apuracao | Gerado automaticamente |
| E200 | Apuracao ICMS | Calculo do periodo |
| E250 | Obrigacoes ICMS | Relatorio de apuracao |

### 1.2 ECD - Escrituracao Contabil Digital
**Informacoes:**
- Balanco Patrimonial
- DRE (Demonstrativo de Resultado)
- Livro Diario e Razao
- Balancetes mensais

### 1.3 ECF - Escrituracao Contabil Fiscal
Substitui a DIPJ. Obrigatoria para Lucro Real e Presumido.

---

## 2. NFe - Nota Fiscal Eletronica

### 2.1 Fluxo de Emissao

```
ERP Cria XML da NFe (validacao interna)
    |
    v
Assina Digitalmente (certificado A1)
    |
    v
Envia para SEFAZ via WebService
    |
    v
+---Autorizada: Retorna protocolo -> Imprime DANFE -> Baixa Estoque
|
+---Denegada: Retorna erro -> Corrige e reenvia
|
+---Contingencia (FS-DA): Regularizar em 24h
```

### 2.2 Estrutura XML da NFe (Auto-Falante)

```xml
<det nItem="1">
  <prod>
    <cProd>EVOK-12-300</cProd>
    <xProd>ALTO-FALANTE 12" 300W RMS</xProd>
    <NCM>85182100</NCM>
    <CFOP>5102</CFOP>
    <uCom>UN</uCom>
    <qCom>10.0000</qCom>
    <vUnCom>350.0000000000</vUnCom>
    <vProd>3500.00</vProd>
  </prod>
  <imposto>
    <ICMS><ICMS00><orig>0</orig><CST>00</CST>
      <vBC>3500.00</vBC><pICMS>18.00</pICMS><vICMS>630.00</vICMS>
    </ICMS00></ICMS>
    <IPI><IPITrib><CST>00</CST>
      <vBC>3850.00</vBC><pIPI>10.00</pIPI><vIPI>385.00</vIPI>
    </IPITrib></IPI>
    <PIS><PISOutr><CST>01</CST>
      <vBC>3500.00</vBC><pPIS>1.65</pPIS><vPIS>57.75</vPIS>
    </PISOutr></PIS>
    <COFINS><COFINSOutr><CST>01</CST>
      <vBC>3500.00</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>266.00</vCOFINS>
    </COFINSOutr></COFINS>
  </imposto>
</det>
```

### 2.3 Status da NFe no Sistema

| Status | Descricao | Acao |
|--------|-----------|------|
| pending | Criada, aguardando envio | Enviar manualmente |
| processing | Em validacao na SEFAZ | Aguardar |
| authorized | Autorizada | Imprimir DANFE |
| denied | Negada | Corrigir e reenviar |
| cancelled | Cancelada | Manter registro |
| contingencia | Em contingencia | Regularizar |

---

## 3. DCTW - Declaracao de Creditos e Debitos

### Periodo Mensal

| Tributo | Codigo DARF | Prazo |
|---------|------------|-------|
| IRPJ (LP) | 0220 | Ate dia 25 do mes seguinte ao trimestre |
| IRPJ (LR) | 0221 | Ate ultimo dia util do mes |
| CSLL | 2484 | Mesmo prazo IRPJ |
| PIS (LP) | 0571 | Ate dia 25 do mes seguinte |
| PIS (LR) | 6912 | Ate dia 25 do mes seguinte |
| COFINS (LP) | 0716 | Ate dia 25 do mes seguinte |
| COFINS (LR) | 5856 | Ate dia 25 do mes seguinte |
| IPI | 1097 | Ate dia 25 do mes seguinte |

---

## 4. eSocial

### Eventos Principais

| Evento | Descricao | Prazo |
|--------|-----------|-------|
| S-2200 | Admissao | Antes do inicio da atividade |
| S-2206 | Alteracao contratual | Ate o dia 15 do mes seguinte |
| S-2230 | Afastamento | Na ocorrencia |
| S-2299 | Desligamento | Ate 10 dias |
| S-1200 | Remuneracao mensal | Ate dia 7 do mes seguinte |
| S-1210 | Pagamentos | Mensal |
| S-1299 | Fechamento | Ate dia 15 |

---

## 5. Reinf

| Evento | Descricao | Periodo |
|--------|-----------|---------|
| R-2010 | Servicos tomados (retencao 11%) | Mensal |
| R-2020 | Servicos prestados | Mensal |
| R-2060 | Contribuicoes sobre receita bruta | Mensal |
| R-2098 | Reabertura | Mensal |
| R-2099 | Fechamento | Mensal |
| R-3010 | Processo trabalhista | Eventual |
| R-5001 | Totalizacao | Mensal |

---

## 6. Tabelas do Sistema para Integracao

```sql
-- CERTIFICADOS DIGITAIS
CREATE TABLE digital_certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    certificate_type ENUM('A1','A3') NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    issuer_name VARCHAR(255),
    serial_number VARCHAR(100) UNIQUE,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    certificate_file TEXT,
    password_encrypted VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME,
    updated_at DATETIME
);

-- LOG DE TRANSMISSOES NFE
CREATE TABLE nfe_transmission_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nfe_id INT NOT NULL,
    transmission_date DATETIME NOT NULL,
    status ENUM('sent','processing','authorized','denied','cancelled'),
    sefaz_response TEXT,
    protocol_number VARCHAR(50),
    error_code VARCHAR(10),
    error_message TEXT,
    attempt_number INT DEFAULT 1,
    created_at DATETIME
);

-- LIVROS FISCAIS (SPED)
CREATE TABLE tax_books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    book_type ENUM('sped_fiscal','ecd','ecf','dctf'),
    reference_month INT NOT NULL,
    reference_year INT NOT NULL,
    status ENUM('pending','generating','generated','sent','validated','error'),
    file_path VARCHAR(255),
    receipt_number VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME
);

-- APURACAO TRIBUTARIA
CREATE TABLE tax_settlement (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tax_type ENUM('irpj','csll','pis','cofins','ipi','icms') NOT NULL,
    tax_regime ENUM('simples','presumido','real') NOT NULL,
    reference_month INT NOT NULL,
    reference_year INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    tax_due DECIMAL(15,2) DEFAULT 0,
    tax_paid DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    payment_date DATE,
    darf_code VARCHAR(20),
    status ENUM('pending','calculated','paid','overdue'),
    created_at DATETIME,
    updated_at DATETIME
);
```

---

## 7. Obrigacoes por Regime

| Obrigacao | Simples Nacional | Lucro Presumido | Lucro Real |
|-----------|-----------------|-----------------|------------|
| PGDAS-D | Mensal | - | - |
| DEFIS | Anual | - | - |
| DCTF | - | Mensal | Mensal |
| ECD | - | Anual | Anual |
| ECF | Opcional | Anual | Anual |
| SPED Fiscal | Mensal | Mensal | Mensal |
| eSocial | Mensal | Mensal | Mensal |
| Reinf | Mensal | Mensal | Mensal |
| DIFAL | Mensal | Mensal | Mensal |
| GIA (SP) | Mensal | Mensal | Mensal |
