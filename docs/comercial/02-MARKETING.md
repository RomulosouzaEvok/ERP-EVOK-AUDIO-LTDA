# Marketing e Comunicação - Módulo Comercial

## Departamento de Marketing (MKT)

### Estrutura do Departamento

| Cargo | Qtd | Função |
|-------|-----|--------|
| Coordenador de Marketing | 1 | Estratégia, planejamento, budget |
| Analista de Marketing | 1 | Redes sociais, conteúdo, campanhas |
| Designer Gráfico | 1 | Catálogos, banners, materiais gráficos |
| Analista de SEO/Tráfego | 1 | Google Ads, SEO, analytics |

### Funções de Marketing na EVOK ÁUDIO

| Função | Descrição |
|--------|-----------|
| Branding | Gestão da marca EVOK, posicionamento |
| Marketing Digital | Site, redes sociais, Google Ads, email marketing |
| Marketing de Conteúdo | Blog, vídeos técnicos, tutoriais, cases |
| Catálogo Técnico | Fichas técnicas, manuais, especificações |
| Feiras e Eventos | Participação em feiras, workshops, eventos |
| Relações Públicas | Assessoria de imprensa, influenciadores |
| Trade Marketing | Materiais PDV, treinamento de revendedores |
| Pesquisa de Mercado | Benchmarking, tendências, concorrência |

### Canais de Marketing

| Canal | Público | Investimento Mensal |
|-------|---------|-------------------|
| Site institucional | B2B / B2C | R$ 2.000 (manutenção + SEO) |
| Google Ads | B2B (busca por alto-falantes) | R$ 5.000 |
| Instagram / Facebook | B2C / Profissionais de som | R$ 3.000 (impulsionamento) |
| YouTube | Técnicos, instaladores | R$ 1.000 (produção) |
| LinkedIn | B2B (distribuidores, montadoras) | R$ 2.000 |
| Email Marketing | Base de clientes | R$ 500 (ferramenta) |
| Feiras (2x ano) | Todos | R$ 30.000 (por evento) |

### Catálogo de Produtos

| Produto | Código | Aplicação | Preço Sugerido |
|---------|--------|-----------|----------------|
| Auto-falante 12" 300W | EVOK-12-300 | Profissional, som automotivo | R$ 149,90 |
| Auto-falante 15" 500W | EVOK-15-500 | Profissional, subwoofer | R$ 249,90 |
| Tweeter 1" 100W | EVOK-TW-100 | Profissional, linha de som | R$ 49,90 |
| Mid-range 6" 200W | EVOK-MR-200 | Profissional, line array | R$ 89,90 |
| Driver de Compressão | EVOK-DR-250 | Profissional (caixas acústicas) | R$ 199,90 |
| Subwoofer 18" 1000W | EVOK-SW-18 | PSW, grandes eventos | R$ 599,90 |

### Tabelas SQL

```sql
-- CAMPANHAS DE MARKETING
CREATE TABLE marketing_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    campaign_type ENUM('ads','social','email','event','trade','content'),
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    target_audience VARCHAR(255),
    channel VARCHAR(100),
    leads_generated INT DEFAULT 0,
    conversions INT DEFAULT 0,
    roi DECIMAL(10,2),
    status ENUM('planned','active','paused','completed','canceled'),
    created_at DATETIME,
    updated_at DATETIME
);

-- LEADS DE MARKETING
CREATE TABLE marketing_leads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(200),
    interest VARCHAR(255),
    lead_source ENUM('website','instagram','facebook','google','email','event','indication','other'),
    lead_score INT DEFAULT 0,
    status ENUM('new','contacted','qualified','converted','lost'),
    converted_to_customer_id INT,
    created_at DATETIME
);

-- MATERIAL DE DIVULGAÇÃO
CREATE TABLE marketing_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    material_type ENUM('catalog','flyer','banner','video','manual','technical_sheet','presentation'),
    product_id INT,
    file_path VARCHAR(255),
    version VARCHAR(10) DEFAULT '01',
    approved BOOLEAN DEFAULT false,
    created_at DATETIME
);
```

### Eventos e Feiras do Setor de Áudio

| Evento | Local | Periodicidade | Foco |
|--------|-------|---------------|------|
| Expo Áudio & Pro | São Paulo | Anual (outubro) | Áudio profissional |
| NAMM Show | Califórnia (EUA) | Anual (janeiro) | Música e áudio |
| Eletrolar Show | São Paulo | Anual (julho) | Eletroeletrônicos |
| Feira do Som Automotivo | Vários | Regional | Som automotivo |
| Sãound | Salvador | Anual (agosto) | Áudio profissional |

### Calendário de Marketing

| Mês | Ação | Responsável |
|-----|------|-------------|
| Janeiro | Planejamento anual, definição de metas | Coordenador MKT |
| Fevereiro | Campanha de carnaval (som automotivo) | Analista MKT |
| Março | Preparação de material para feiras | Designer |
| Abril | Participação em evento regional | Equipe |
| Maio | Campanha dia das mães (som residencial) | Analista MKT |
| Junho | Lançamento de novos produtos | Coordenador MKT |
| Julho | Eletrolar Show | Equipe |
| Agosto | Campanha de inverno | Analista MKT |
| Setembro | Preparação Expo Áudio | Equipe |
| Outubro | Expo Áudio & Pro | Equipe |
| Novembro | Black Friday | Analista MKT |
| Dezembro | Balanço, planejamento do próximo ano | Coordenador MKT |
