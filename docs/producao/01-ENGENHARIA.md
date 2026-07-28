# Engenharia do Produto - Módulo Produção

## Departamento de Engenharia (ENG)

### Estrutura do Departamento

| Cargo | Função | Responsabilidades |
|-------|--------|-------------------|
| Gerente de Engenharia | Coordenar equipe | Projetos, P&D, cronogramas |
| Engenheiro de Produto Sr. | Projetar auto-falantes | Especificações técnicas, desenhos |
| Engenheiro de Processos | Otimizar manufatura | Layout, métodos, tempos |
| Engenheiro Acústico | Projetar resposta sonora | Simulação, teste acústico |
| Técnico em Mecânica | Prototipagem | CAD, impressão 3D, moldes |
| Técnico em Eletrônica | Circuitos e crossovers | Projetar filtros, divisores |
| Desenhista / Projetista | CAD 3D | Desenhos técnicos, BOM |
| Analista de P&D | Pesquisa de novos materiais | Inovação, benchmarking |

### Funções-Chave na Engenharia

| Função | Descrição | Habilidades |
|--------|-----------|-------------|
| Projetista de Cones | Geometria, material, perfil do cone | CAD, FEA, acústica |
| Projetista de Magnetos | Circuito magnético, gap, fluxo | Simulação magnética (FEA) |
| Projetista de Bobina (VC) | Fio, altura, impedância, potência | Conhecimento em eletromagnetismo |
| Especialista em Spider | Compliância, ressonância, material | Conhecimento mecânico |
| Engenheiro de NPI | New Product Introduction | Gestão de projetos, DFM |

### Processo de Desenvolvimento de Produto (PDP)

```
Fase 1: Concepção
├── Briefing de mercado
├── Especificações alvo (T/S parameters)
├── Análise de concorrência
└── Viabilidade técnica

Fase 2: Projeto Conceitual
├── Simulação acústica (LEAP, FINE)
├── Projeto do circuito magnético
├── Definição de materiais
└── Protótipo virtual

Fase 3: Projeto Detalhado
├── Desenhos técnicos (CAD)
├── BOM preliminar
├── Plano de testes
└── Protótipo físico

Fase 4: Homologação
├── Testes elétricos (impedância, potência)
├── Testes acústicos (SPL, THD, resposta)
├── Testes de vida (durabilidade)
├── Testes ambientais (calor, umidade)
└── Certificações

Fase 5: Industrialização
├── DFM (Design for Manufacturing)
├── Moldes e ferramentais
├── Roteiro de fabricação
├── BOM final
└── Liberação para produção
```

### Parâmetros T/S (Thiele-Small) de Auto-Falantes

| Parâmetro | Descrição | Unidade | Exemplo (12") |
|-----------|-----------|---------|---------------|
| Fs | Frequência de ressonância | Hz | 45 Hz |
| Qms | Fator mecânico | - | 5.5 |
| Qes | Fator elétrico | - | 0.45 |
| Qts | Fator total (Qms x Qes / Qms + Qes) | - | 0.42 |
| Vas | Volume equivalente de ar | litros | 85 L |
| Sd | Área efetiva do cone | cm² | 530 cm² |
| Xmax | Excursão linear máxima | mm | ±6 mm |
| Re | Resistência DC da bobina | ohms | 6.5 Ω |
| Le | Indutância da bobina | mH | 1.2 mH |
| BL | Fator de força | Tm | 18.5 Tm |
| Mms | Massa móvel total | g | 85 g |
| Cms | Compliância mecânica | mm/N | 0.15 mm/N |
| Spl | Sensibilidade | dB SPL | 97 dB |

### Tabelas SQL

```sql
-- DESENHOS TÉCNICOS
CREATE TABLE product_drawings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    drawing_number VARCHAR(50) UNIQUE NOT NULL,
    revision VARCHAR(10) DEFAULT '00',
    title VARCHAR(200) NOT NULL,
    drawing_type ENUM('assembly','detail','exploded','schematic','bom'),
    file_path VARCHAR(255),
    cad_file VARCHAR(255),
    material_spec TEXT,
    dimensions TEXT,
    tolerances TEXT,
    approved_by INT,
    approval_date DATE,
    status ENUM('draft','released','obsolete','canceled'),
    created_at DATETIME,
    updated_at DATETIME
);

-- PROJETOS DE P&D
CREATE TABLE engineering_projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_type ENUM('new_product','improvement','customization','research'),
    product_id INT,
    project_manager_id INT,
    start_date DATE,
    target_date DATE,
    completion_date DATE,
    budget DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    stage ENUM('concept','design','prototype','testing','homologation','production'),
    status ENUM('active','paused','completed','canceled'),
    priority ENUM('low','normal','high','critical'),
    notes TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- MATERIAIS ESPECIFICADOS
CREATE TABLE material_specifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    material_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    material_type ENUM('cone','surround','spider','voice_coil','magnet','basket','terminal',
                        'adhesive','chemical','fabric','wire','paper','foam','rubber'),
    supplier_id INT,
    specifications JSON,
    safety_datasheet VARCHAR(255),
    rohs_compliant BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at DATETIME,
    updated_at DATETIME
);
```

### Materiais Utilizados na EVOK ÁUDIO

| Componente | Material | Fornecedores Típicos |
|------------|----------|---------------------|
| Cone | Papel Kraft, Polipropileno, Fibra de Vidro, Kevlar | Empresa de Papel, Poliplast |
| Surround | Borracha (butil), Espuma (PU), Poliéster | BorrachaTech, PoliFlex |
| Spider | Tecido impregnado (Nomex, algodão) | SpiderTech, Têxtil Industrial |
| Voice Coil | Fio de cobre esmaltado (2 camadas, 4 camadas) | CobreTech, EletroFio |
| Magnet | Ferrite (cerâmico), Neodímio (N35-N52) | Ferrite Brasil, MagnaTech |
| Basket | Aço estampado, Alumínio fundido | AçoFort, MetalBasket |
| Terminal | Latão niquelado, Plástico ABS | TerminalPlast, EloTerm |
| Cola | Epóxi, Cianoacrilato, PU | Adesivos Brasil, ColaFort |
