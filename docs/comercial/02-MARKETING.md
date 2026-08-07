# Marketing e Comunicação - Módulo Comercial

> **[IMPLEMENTADO em 2026-08-07]** As tabelas abaixo são reais em
> PostgreSQL (migration `20260807-000210-create-marketing-module.cjs`),
> com endpoints REST em `/api/marketing/*` e tela web em `/marketing`.
> Ver `server/src/modules/marketing/` (Clean Architecture) e
> `docs/database/DATABASE.md` (seção "Módulo Marketing"). Antes desta
> entrega, o departamento existia apenas como linha em `departments`
> (seed) — o bloco SQL que existia aqui era apenas um esboço em sintaxe
> MySQL, nunca migrado; foi substituído pelo contrato real (schema
> PostgreSQL + endpoints) na seção "Escopo implementado" abaixo.

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

### Escopo implementado (2026-08-07)

CRUD completo (create/list/get/update — **sem delete**, físico ou lógico)
para 3 entidades. RBAC via módulo `marketing` (`authorizeModule`), leitura
em nível padrão (`operate`) e escrita explicitamente em `operate` — sem
fluxo de aprovação (`approve`) neste módulo.

#### 1. Campanhas (`marketing_campaigns`)

Nome, descrição, tipo (`ads`/`social`/`email`/`event`/`trade`/`content`),
datas início/fim, orçamento previsto, custo real, público-alvo, canal,
contadores `leads_generated`/`conversions` (incrementados automaticamente
quando um lead é criado vinculado à campanha ou avança para `converted`),
ROI (informado manualmente — o backend não impõe fórmula de cálculo),
status (`planned`/`active`/`paused`/`completed`/`canceled`).

| Endpoint | Descrição |
|---|---|
| `GET /api/marketing/campaigns` | Lista paginada, filtros opcionais `status`/`campaign_type` |
| `GET /api/marketing/campaigns/:id` | Busca por id |
| `POST /api/marketing/campaigns` | Cria (422 se `end_date` anterior a `start_date`) |
| `PUT /api/marketing/campaigns/:id` | Atualiza |

#### 2. Leads (`marketing_leads`)

FK opcional `campaign_id` (lead pode não vir de uma campanha formal), nome,
email, telefone, empresa, interesse, origem (`website`/`instagram`/
`facebook`/`google`/`email`/`event`/`indication`/`other`), score,
`converted_to_customer_id` (FK opcional para `clients`, populada quando o
lead vira cliente real). O funil (`status`: `new -> contacted -> qualified
-> converted/lost`) é uma **ação dedicada**, não um `PUT` genérico
irrestrito — `lost` pode ser atingido de qualquer etapa aberta; `converted`/
`lost` são terminais; transições fora do mapa retornam 422.

| Endpoint | Descrição |
|---|---|
| `GET /api/marketing/leads` | Lista paginada, filtros opcionais `status`/`campaign_id`/`lead_source` |
| `GET /api/marketing/leads/:id` | Busca por id |
| `POST /api/marketing/leads` | Cria (404 se `campaign_id` informado e inexistente) |
| `PUT /api/marketing/leads/:id` | Atualiza dados cadastrais (não altera `status`) |
| `POST /api/marketing/leads/:id/status` | Avança o lead no funil (422 se transição inválida) |

#### 3. Materiais de divulgação (`marketing_materials`)

Título, tipo (`catalog`/`flyer`/`banner`/`video`/`manual`/
`technical_sheet`/`presentation`), FK opcional `product_id` → `items.id`
(**UUID**, não INT — material pode não ser de um produto específico, ex.
material institucional/de marca), caminho do arquivo, versão, aprovado. O
arquivo em si é enviado separadamente da criação dos metadados.

| Endpoint | Descrição |
|---|---|
| `GET /api/marketing/materials` | Lista paginada, filtros opcionais `material_type`/`product_id`/`approved` |
| `GET /api/marketing/materials/:id` | Busca por id |
| `POST /api/marketing/materials` | Cria os metadados (arquivo enviado depois) |
| `PUT /api/marketing/materials/:id` | Atualiza metadados |
| `POST /api/marketing/materials/:id/file` | Envia/substitui o arquivo (multipart, campo `file`; imagem/PDF/vídeo/apresentação/documento, até 50MB) |

### Fora do escopo desta entrega

- Cálculo automático de ROI (informado manualmente pelo usuário).
- Histórico multi-arquivo por material (só a versão atual é mantida —
  `version` é texto livre informativo, sem trilha de versões anteriores).
- Integração com ferramentas externas de email marketing/Ads (Google
  Ads, RD Station, etc.) — cadastro manual apenas.

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

---

**Última atualização:** 2026-08-07
