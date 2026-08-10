# Certificações e Normas - Módulo Qualidade

## Certificações da EVOK ÁUDIO

| Certificação | Status | Órgão | Última Auditoria | Próxima Auditoria |
|-------------|--------|-------|-----------------|-------------------|
| ISO 9001:2015 | ✅ Em vigor | Bureau Veritas | 2023-11 | 2024-11 |
| INMETRO | ✅ Em vigor | INMETRO | 2023-06 | 2025-06 |
| CE (Europa) | 🔧 Em implantação | - | - | 2024-12 |
| UL (EUA) | 🔧 Em estudo | - | - | 2025-06 |
| RoHS | ✅ Em vigor | Interno | 2024-01 | 2025-01 |
| REACH | ✅ Em vigor | Interno | 2024-01 | 2025-01 |

## ISO 9001:2015 - Sistema de Gestão da Qualidade

### Processos do SGQ

| Processo | Responsável | Indicador |
|----------|-------------|-----------|
| Gestão da Qualidade | Gerente Qualidade | % NC fechadas |
| Controle de Documentos | Analista Qualidade | Documentos atualizados |
| Auditoria Interna | Gerente Qualidade | Não conformidades |
| Ação Corretiva | Supervisores | Prazo de fechamento |
| Controle de Produto NC | Inspetores | % retrabalho |
| Satisfação do Cliente | Comercial | NPS |
| Calibração | Metrologista | Instrumentos calibrados |

### Documentos da Qualidade

| Documento | Código | Versão |
|-----------|--------|--------|
| Manual da Qualidade | MQ-001 | 5 |
| Procedimento - Controle de Documentos | PC-001 | 3 |
| Procedimento - Compras | PC-002 | 2 |
| Procedimento - Produção | PC-003 | 4 |
| Procedimento - Inspeção | PC-004 | 3 |
| Instrução de Trabalho - Injeção | IT-001 | 2 |
| Instrução de Trabalho - Colagem | IT-002 | 3 |
| Instrução de Trabalho - Testes | IT-003 | 2 |
| Formulário - Inspeção Incoming | FQ-001 | 1 |
| Formulário - Inspeção Final | FQ-002 | 2 |
| Formulário - NC | FQ-003 | 1 |

## Normas Aplicáveis a Auto-Falantes

| Norma | Descrição | Aplicação |
|-------|-----------|-----------|
| NBR NM 60335 | Segurança de aparelhos eletrodomésticos | Produto final |
| IEC 60268 | Equipamentos de sistemas de som | Testes acústicos |
| IEC 60065 | Equipamentos de áudio e vídeo | Segurança elétrica |
| ABNT NBR 15100 | Alto-falantes - Especificação | Especificação |
| ISO 3741 | Determinação de níveis de potência sonora | Laboratório |
| RoHS 2011/65/EU | Restrição de substâncias perigosas | Materiais |
| REACH | Registro de substâncias químicas | Insumos |

## Tabelas SQL

> ### ⚠️ DDL de projeto, NÃO é o schema implementado (verificado em 2026-08-10)
>
> `product_certifications` e `quality_audits` **não existem** em
> `erp_evok_audio` — não há módulo de certificação de produto nem de auditoria
> da qualidade no banco. O bloco abaixo é rascunho de modelagem em dialeto
> MySQL, e este ERP roda **exclusivamente em PostgreSQL 16**.
>
> Achado **P2-10** de
> `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`.

```sql
-- CERTIFICAÇÕES DE PRODUTOS
CREATE TABLE product_certifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    certification_type ENUM('inmetro','ce','ul','rohs','reach','iso','other'),
    certification_number VARCHAR(100),
    certificate_file VARCHAR(255),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    certifying_body VARCHAR(100),
    status ENUM('active','expired','suspended','cancelled'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- AUDITORIAS
CREATE TABLE quality_audits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audit_type ENUM('internal','external','supplier','certification'),
    audit_date DATE NOT NULL,
    auditor_name VARCHAR(200),
    audit_body VARCHAR(100),
    standard VARCHAR(50),                     -- ISO 9001, INMETRO, etc.
    result ENUM('approved','approved_with_observations','not_approved'),
    findings TEXT,
    score DECIMAL(5,2),
    next_audit_date DATE,
    created_at DATETIME,
    updated_at DATETIME
);
```

## Programa de Calibração

| Instrumento | Frequência | Última Calibração | Próxima | Status |
|-------------|-----------|-------------------|---------|--------|
| Paquímetro Digital (10 un) | Semestral | 2024-01-10 | 2024-07-10 | ✅ |
| Micrômetro Externo (5 un) | Semestral | 2024-01-10 | 2024-07-10 | ✅ |
| Multímetro Digital (5 un) | Anual | 2024-01-15 | 2025-01-15 | ✅ |
| Gaussmeter | Anual | 2023-12-01 | 2024-12-01 | ✅ |
| Microfone BK 4189 | Anual | 2023-11-15 | 2024-11-15 | ✅ |
| Analisador APx525 | Anual | 2023-12-20 | 2024-12-20 | ✅ |
| Balança Digital (3 un) | Anual | 2024-01-08 | 2025-01-08 | ✅ |
