# Propriedade Intelectual - Módulo Jurídico

## Ativos de Propriedade Intelectual da EVOK ÁUDIO

### Marcas

| Marca | Classe | Situação | Órgão | Nº Registro | Validade |
|-------|--------|----------|-------|-------------|----------|
| EVOK ÁUDIO | 9 (som/imagem) | ✅ Registrada | INPI | 900.000.001 | 2033 |
| EVOK PRO | 9 | ✅ Registrada | INPI | 900.000.002 | 2033 |
| EVOK SOUND | 9 | ✅ Registrada | INPI | 900.000.003 | 2033 |
| Logotipo EVOK | 9 | ✅ Registrada | INPI | 900.000.004 | 2033 |

### Patentes

| Patente | Descrição | Situação | Prazo |
|---------|-----------|----------|-------|
| Sistema de Centralização Magnética (MU-9000000-1) | Sistema de alinhamento de gap | ✅ Concedida | 2032 |
| Método de Bobinagem Multicamadas (PI-9000000-2) | Processo de bobinagem | 🔧 Em análise | - |
| Dispositivo de Vedação Acústica (MU-9000000-3) | Anel de vedação | ✅ Concedida | 2032 |

### Desenhos Industriais

| Desenho | Produto | Situação | Prazo |
|---------|---------|----------|-------|
| Design Cone 12" EVOK | DI-900000-1 | ✅ Registrado | 2034 |
| Design Basket EVOK | DI-900000-2 | ✅ Registrado | 2034 |
| Design Grade Proteção | DI-900000-3 | 🔧 Em registro | - |

### Segredo Industrial

| Segredo | Descrição | Acesso Restrito |
|---------|-----------|----------------|
| Fórmula da Cola | Composição do adesivo proprietário | Engenharia + Diretoria |
| Tratamento Térmico | Processo de cura do cone | Produção (liderança) |
| Setup de Injeção | Parâmetros de processo | Supervisores |
| Composição de Fios | Liga especial para bobina | Engenharia |

## Tabelas SQL

```sql
-- REGISTRO DE PROPRIEDADE INTELECTUAL
CREATE TABLE intellectual_property (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ip_type ENUM('trademark','patent','industrial_design','copyright','trade_secret'),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    registration_number VARCHAR(50),
    filing_date DATE,
    grant_date DATE,
    expiration_date DATE,
    owner VARCHAR(200) DEFAULT 'EVOK ÁUDIO LTDA',
    status ENUM('filed','examined','granted','expired','abandoned'),
    jurisdiction VARCHAR(50) DEFAULT 'BR',
    created_at DATETIME,
    updated_at DATETIME
);
