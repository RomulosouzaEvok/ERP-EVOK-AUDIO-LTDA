# Contratos - Módulo Jurídico

## Tipos de Contratos na EVOK ÁUDIO

### Contratos Trabalhistas

| Tipo | Descrição | Prazo |
|------|-----------|-------|
| CLT (Prazo Indeterminado) | Contrato padrão de trabalho | Indeterminado |
| CLT (Prazo Determinado) | Contrato temporário/sazonal | Até 2 anos |
| Contrato de Experiência | 45 ou 90 dias | Renovável 1x |
| Estágio | Estudantes | Até 2 anos |
| Aprendiz (Jovem Aprendiz) | 14-24 anos | Até 2 anos |

### Contratos Comerciais

| Tipo | Descrição |
|------|-----------|
| Contrato de Distribuição | Revendedores autorizados |
| Contrato de Representação Comercial | Representantes autônomos |
| Contrato de Fornecimento | Fornecedores de matéria-prima |
| Contrato de Prestação de Serviços | Manutenção, consultoria |
| Contrato de Confidencialidade (NDA) | Segredo industrial |
| Contrato de Licenciamento de Marca | Uso da marca EVOK |

### Cláusulas de Propriedade Intelectual

Nos contratos trabalhistas e com fornecedores, devem conter:
- Cessão de direitos de propriedade intelectual
- Confidencialidade de processos e fórmulas
- Não concorrência (pós-contrato)
- Propriedade de desenhos técnicos e projetos

## Tabelas SQL

```sql
-- ADITIVOS CONTRATUAIS
CREATE TABLE contract_addendums (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    addendum_number INT NOT NULL,
    description TEXT,
    change_type ENUM('term','value','clause','party','other'),
    new_end_date DATE,
    new_value DECIMAL(15,2),
    file_path VARCHAR(255),
    signed_date DATE,
    created_at DATETIME
);

-- GESTÃO DE PRAZOS CONTRATUAIS
CREATE TABLE contract_reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contract_id INT NOT NULL,
    reminder_type ENUM('renewal','expiration','notice','payment'),
    reminder_date DATE NOT NULL,
    days_before INT DEFAULT 30,
    notified BOOLEAN DEFAULT false,
    created_at DATETIME
);
