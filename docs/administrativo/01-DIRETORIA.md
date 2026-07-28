# Diretoria - Módulo Administrativo

## Departamento de Diretoria (DIR)

### Estrutura da Diretoria

| Nome | Cargo | Formação | Responsabilidades |
|------|-------|----------|-------------------|
| [Nome] | CEO / Diretor Presidente | Administração | Estratégia, resultados, inovação |
| [Nome] | Diretor Industrial | Engenharia | Produção, engenharia, qualidade |
| [Nome] | Diretor Comercial | Marketing/Vendas | Comercial, marketing, expansão |
| [Nome] | Diretor Adm-Financeiro | Ciências Contábeis | Finanças, RH, jurídico, TI |

### Funções da Diretoria

| Função | Descrição |
|--------|-----------|
| Planejamento Estratégico | Definir visão, missão, valores, objetivos |
| Definição de Metas | Estabelecer metas anuais por departamento |
| Aprovação de Investimentos | Autorizar CAPEX acima de R$ 50.000 |
| Relações com Investidores | Reportar resultados, captação |
| Compliance | Assegurar conformidade legal e fiscal |
| Inovação | Direcionar P&D e novos produtos |
| Gestão de Riscos | Identificar e mitigar riscos empresariais |

### Conselho de Administração

| Membro | Perfil |
|--------|--------|
| [Nome] - Presidente | Sócio fundador |
| [Nome] - Conselheiro | Representante dos investidores |
| [Nome] - Conselheiro | Independente (mercado de áudio) |

### Reuniões

| Tipo | Periodicidade | Participantes |
|------|--------------|---------------|
| Reunião de Diretoria | Semanal | Diretores |
| Comitê Comercial | Semanal | Diretor Com., Vendas, Marketing |
| Comitê Industrial | Semanal | Diretor Ind., ENG, PCP, Produção |
| Comitê Financeiro | Mensal | Diretor AF, Controller, Contador |
| Conselho de Administração | Trimestral | Conselheiros |
| Assembleia de Sócios | Anual | Sócios |

### Indicadores Estratégicos

| KPI | Meta 2024 | Responsável |
|-----|-----------|-------------|
| Faturamento | R$ 6.000.000 | Diretor Comercial |
| Margem Bruta | > 35% | Diretor Industrial |
| EBITDA | > 15% | Diretor Adm-Financeiro |
| Market Share | 5% mercado nacional | Diretor Comercial |
| NPS | > 80 | Diretor Comercial |
| OEE | > 75% | Diretor Industrial |
| Giro de Estoque | > 8x | Diretor Industrial |

### Tabelas SQL

```sql
-- PLANEJAMENTO ESTRATÉGICO
CREATE TABLE strategic_planning (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    objective VARCHAR(255) NOT NULL,
    department_id INT,
    kpi VARCHAR(100),
    target_value DECIMAL(15,2),
    actual_value DECIMAL(15,2),
    weight INT DEFAULT 1,                          -- Peso do objetivo
    status ENUM('not_started','in_progress','achieved','not_achieved'),
    responsible_id INT,
    created_at DATETIME,
    updated_at DATETIME
);

-- REUNIÕES E ATAS
CREATE TABLE meeting_minutes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    meeting_date DATETIME NOT NULL,
    meeting_type ENUM('directors','commercial','industrial','financial','board','general'),
    title VARCHAR(200) NOT NULL,
    participants TEXT,
    summary TEXT,
    decisions JSON,
    action_items JSON,
    file_path VARCHAR(255),
    created_by INT,
    created_at DATETIME
);

-- RISCOS EMPRESARIAIS
CREATE TABLE business_risks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    risk_category ENUM('operational','financial','market','regulatory','reputation','supply'),
    description TEXT NOT NULL,
    probability ENUM('low','medium','high','critical'),
    impact ENUM('low','medium','high','critical'),
    risk_score INT,                                -- probability x impact
    mitigation_actions TEXT,
    contingency_plan TEXT,
    responsible_id INT,
    review_date DATE,
    status ENUM('active','mitigated','accepted','closed'),
    created_at DATETIME,
    updated_at DATETIME
);
</content>

