# Diretoria - Módulo Administrativo

Este documento descreve o desenho de negócio (governança, comitês, KPIs) e o
schema **real** do módulo Diretoria, implementado em 2026-08-12.

## O que existe hoje no backend

- **Hierarquia (`directorates`)** — migration
  `server/migrations/20260811-000043-create-directorates-hierarchy.cjs`, model
  `server/src/models/Directorate.ts`. CEO/Diretoria + 4 diretorias
  (Industrial, Suprimentos & Logística, Comercial, Administrativo-Financeiro),
  cada uma com `manager_id` opcional (FK `employees`, `NULL` = cargo vago —
  hoje é o caso de Suprimentos & Logística). Ver
  [05-ORGANOGRAMA_EXECUTIVO.md](05-ORGANOGRAMA_EXECUTIVO.md) para a árvore
  completa.
- **Governança (`strategic_plannings`, `meeting_minutes`, `business_risks`)**
  — migration
  `server/migrations/20260812-000046-create-directorate-governance.cjs`,
  models `StrategicPlanning`/`MeetingMinute`/`BusinessRisk`. É a
  implementação real das três tabelas que este documento descrevia em SQL
  MySQL aspiracional até 2026-08-11 (nunca aplicadas) — a modelagem final
  segue o padrão PostgreSQL/Sequelize do projeto (ENUM nativo, DECIMAL(15,2),
  JSONB para `decisions`/`action_items`, FK `RESTRICT`), não a sintaxe MySQL
  original.
- **Módulo de aplicação** — `server/src/modules/directorate/` (Clean
  Architecture: `domain/repositories`, `domain/services/riskScore.ts`,
  `infrastructure/sequelize`, `application/use-cases`,
  `presentation/{controllers,routes,validators}`), montado sob
  `/api/directorate` em `server/app.ts`. Endpoints completos, RBAC e payloads
  em [docs/arquitetura/API.md](../arquitetura/API.md) (seção "Diretoria").

### Regras de negócio implementadas

- **Organograma é público a qualquer autenticado.** `GET
  /api/directorate/org-chart` não passa por `authorizeModule` — a hierarquia
  CEO→diretorias→departamentos não é segredo interno, é a mesma informação
  que já aparece na navegação do frontend.
- **Provimento de cargo valida o funcionário.** `PATCH
  /api/directorate/directorates/:id/manager` recusa (422) prover um
  funcionário com `status !== 'active'` no cargo de diretor — o banco não
  pode dizer que alguém desligado/afastado dirige uma área da empresa.
  `manager_id: null` vaga o cargo sem nenhuma validação extra.
- **Um objetivo estratégico pertence a UMA diretoria OU a UM departamento,
  nunca aos dois.** `strategic_plannings.directorate_id` e `.department_id`
  são mutuamente exclusivos (CHECK `strategic_plannings_owner_xor_ck` no
  banco + validação no use case). Os dois `NULL` ao mesmo tempo é um
  objetivo da empresa inteira (ex.: "faturar R$ 40MM no ano").
- **O realizado tem endpoint próprio, separado da edição do plano.**
  `PATCH /api/directorate/strategic-plannings/:id/actual` registra
  `actual_value` e — quando o objetivo tem `target_value` — deriva
  `status` automaticamente (`achieved` se realizado ≥ meta, senão
  `in_progress`). Editar o plano em si (`objective`, `kpi`, `weight`,
  `responsible_id`, ou forçar `status = 'not_achieved'`) é
  `PUT /api/directorate/strategic-plannings/:id`, um ato distinto.
- **Ata de reunião é imutável após criação.** O módulo não expõe
  `PUT`/`DELETE` de conteúdo de `meeting_minutes` — se a ata está errada,
  registra-se uma ata retificadora nova (mesmo princípio de atas societárias
  reais). Nada na camada de banco impede um `UPDATE` SQL direto (não há
  trigger); a garantia vive na ausência da rota HTTP, mesmo desenho de
  `AuditLog` neste projeto.
- **`risk_score` é sempre calculado no servidor.** `probability × impact`
  (mapeados `low=1, medium=2, high=3, critical=4`, escala 1–16), nunca
  aceito do payload — os schemas Zod de criação/atualização de risco nem
  declaram o campo (`.strict()` rejeita a tentativa com 400).

### O que ficou de fora desta entrega (e por quê)

- **Conselho de Administração e Assembleia de Sócios** (tabelas abaixo) não
  viraram schema: são reuniões societárias, não operacionais — o dono do
  produto não pediu rastreamento estruturado delas ainda. Uma ata desse tipo
  de reunião pode ser registrada em `meeting_minutes` com
  `meeting_type = 'board'` ou `'general'` hoje, sem campos dedicados de
  conselheiro/sócio.
- **`action_items` sem dono/prazo estruturado.** É um array JSON de texto
  livre (`meeting_minutes.action_items`), não uma entidade própria com
  responsável e data — decisão consciente de manter a primeira versão
  simples; virar entidade é evolução futura se o volume de reuniões pedir
  cobrança automática de pendência.
- **Aprovação de CAPEX** (linha "Aprovação de Investimentos" na tabela de
  funções abaixo) não tem endpoint dedicado — é regra de processo, ainda sem
  contrapartida em código.

## Departamento de Diretoria (DIR)

### Estrutura da Diretoria

| Nome | Cargo | Formação | Responsabilidades |
|------|-------|----------|-------------------|
| [Nome] | CEO / Diretor Presidente | Administração | Estratégia, resultados, inovação |
| [Nome] | Diretor Industrial | Engenharia | Produção, engenharia, qualidade |
| [Nome] | Diretor Comercial | Marketing/Vendas | Comercial, marketing, expansão |
| [Nome] | Diretor Adm-Financeiro | Ciências Contábeis | Finanças, RH, jurídico, TI |
| *(vago)* | Diretor de Suprimentos & Logística | Supply Chain / Logística | Compras, almoxarifado, expedição |

> **Diretor de Suprimentos & Logística** — cargo definido pelo dono em
> 2026-08-11 e **ainda não provido** (`directorates.manager_id IS NULL` para
> `code = 'SUP'`, refletido em `GET /api/directorate/org-chart` como
> `vacant: true`). Até ser preenchido, Compras (07), Almoxarifado (06) e
> Expedição (11) reportam à Diretoria. Ver
> [05-ORGANOGRAMA_EXECUTIVO.md](05-ORGANOGRAMA_EXECUTIVO.md).

### Funções da Diretoria

| Função | Descrição |
|--------|-----------|
| Planejamento Estratégico | Definir visão, missão, valores, objetivos — `strategic_plannings` |
| Definição de Metas | Estabelecer metas anuais por departamento — `strategic_plannings` |
| Aprovação de Investimentos | Autorizar CAPEX acima de R$ 50.000 — sem endpoint dedicado ainda |
| Relações com Investidores | Reportar resultados, captação |
| Compliance | Assegurar conformidade legal e fiscal |
| Inovação | Direcionar P&D e novos produtos |
| Gestão de Riscos | Identificar e mitigar riscos empresariais — `business_risks` |

### Conselho de Administração

| Membro | Perfil |
|--------|--------|
| [Nome] - Presidente | Sócio fundador |
| [Nome] - Conselheiro | Representante dos investidores |
| [Nome] - Conselheiro | Independente (mercado de áudio) |

### Reuniões

| Tipo | Periodicidade | Participantes | `meeting_type` |
|------|--------------|---------------|-----------------|
| Reunião de Diretoria | Semanal | Diretores | `directors` |
| Comitê Comercial | Semanal | Diretor Com., Vendas, Marketing | `commercial` |
| Comitê Industrial | Semanal | Diretor Ind., ENG, PCP, Produção | `industrial` |
| Comitê Financeiro | Mensal | Diretor AF, Controller, Contador | `financial` |
| Conselho de Administração | Trimestral | Conselheiros | `board` |
| Assembleia de Sócios | Anual | Sócios | `general` |

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

Cada linha acima pode virar um registro em `strategic_plannings`
(`kpi`/`target_value`/`actual_value`), com `directorate_id` apontando para o
responsável.

## Schema real (referência rápida)

Dicionário de dados completo (colunas, tipos, comentários) em
[docs/database/04-DICIONARIO_DADOS.md](../database/04-DICIONARIO_DADOS.md).

```
directorates            id, code (CEO|IND|SUP|COM|ADM), name, position_title,
                         manager_id -> employees (NULL = vago), active

strategic_plannings      id, year, objective, directorate_id -> directorates (nullable),
                         department_id -> departments (nullable, XOR com directorate_id),
                         kpi, target_value, actual_value, weight,
                         status (not_started|in_progress|achieved|not_achieved),
                         responsible_id -> employees, created_by -> users

meeting_minutes          id, meeting_date, meeting_type
                         (directors|commercial|industrial|financial|board|general),
                         title, participants, summary, decisions (jsonb),
                         action_items (jsonb), file_path, created_by -> users
                         -- IMUTÁVEL apos criacao (sem rota de update/delete)

business_risks           id, risk_category
                         (operational|financial|market|regulatory|reputation|supply),
                         description, probability/impact (low|medium|high|critical),
                         risk_score (calculado no servidor), mitigation_actions,
                         contingency_plan, responsible_id -> employees, review_date,
                         status (active|mitigated|accepted|closed), created_by -> users
```

---

**Última atualização:** 2026-08-12
