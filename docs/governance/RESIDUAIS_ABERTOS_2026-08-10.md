# Residuais Abertos â€” fechamento da etapa "cadeia do produto"

**Data:** 10 de agosto de 2026
**Objetivo:** saber o que sobrou antes de abrir a prÃ³xima frente (n8n + IA +
integraÃ§Ã£o Meta), para nÃ£o deixar nada para trÃ¡s.
**MÃ©todo:** cada item foi **medido** contra o banco, o cÃ³digo ou a suÃ­te â€” nÃ£o
copiado do `TODO.md`. Onde o `TODO.md` diverge da realidade, estÃ¡ marcado.

---

## 1. Estado verificado hoje (medido, nÃ£o declarado)

| O que | Resultado | Como foi medido |
|-------|-----------|-----------------|
| Migrations | **164 aplicadas**, Ãºltima `20260810-000041` | `npm run migration:status` |
| Dev Ã— Teste | **Bancos idÃªnticos** â€” 0 divergÃªncia de coluna, tipo, Ã­ndice ou constraint | `node server/scripts/comparar-bancos.cjs` |
| SuÃ­te de integraÃ§Ã£o real | **43 suÃ­tes, 166 testes, 100% passando, sem skips** | `npm run test:integration` |
| `purchase_orders.requester_id` | **NOT NULL** | `information_schema.columns` |
| Telas de Roteiro e Plano Mestre | **Existem** (`ProductionRoutesPage.tsx`, `MasterProductionPlanPage.tsx`) | `ls client/src/pages/production/` |
| Aprovadores distintos do solicitante | **Existem** (Diretor, Gerente de Compras) | `users` + `access_profile_permissions` |

**ConclusÃ£o:** a cadeia do produto (os 17 gaps) estÃ¡ de fato fechada, e a rede
de seguranÃ§a de integraÃ§Ã£o estÃ¡ armada e verde. O que falta nÃ£o Ã© cÃ³digo de
domÃ­nio â€” Ã© **dado real, infraestrutura e aceite**.

---

## 2. Por que o `TODO.md` estÃ¡ desatualizado

**NÃºmeros:** 6.942 linhas, 66 entradas datadas, 738 caixas de seleÃ§Ã£o â€” **190
ainda abertas** (`- [ ]`) e 548 fechadas.

**Causa raiz:** o arquivo acumula duas funÃ§Ãµes incompatÃ­veis.

1. **DiÃ¡rio append-only** â€” o registro do que foi feito em cada entrega, que
   por definiÃ§Ã£o *nÃ£o deve* ser reescrito depois. EstÃ¡ correto assim.
2. **Checklist vivo** â€” a lista do que ainda falta, que *precisa* refletir o
   presente.

A caixa `- [ ]` pertence Ã  segunda funÃ§Ã£o, mas Ã© escrita dentro da primeira. No
momento em que Ã© escrita, Ã© verdadeira. Quando um commit posterior resolve
aquilo, ninguÃ©m volta 2.000 linhas atrÃ¡s para marcar `- [x]` â€” porque a entrada
antiga Ã© tratada (com razÃ£o) como histÃ³rico congelado.

**Nada valida essas caixas.** Existem quatro guardas automÃ¡ticas para o
*cÃ³digo* (`schema-model-drift-guard`, `column-name-drift-guard`,
`enum-literal-guard`, `cross-database-drift-guard`) e **zero** para a
documentaÃ§Ã£o. NÃ£o hÃ¡ CI que pergunte "esta pendÃªncia ainda existe?".

### Exemplos concretos de divergÃªncia

| `TODO.md` afirma | Realidade medida hoje |
|------------------|------------------------|
| "MIGRATION NÃƒO APLICADA â€” `20260810-000032/33/34/35`" (4 ocorrÃªncias) | Todas aplicadas |
| "Banco reproduzÃ­vel â€” a raiz ainda de pÃ© (BLOQUEIA a compra do servidor)" | Baseline congelado; os dois bancos idÃªnticos |
| "`purchase_orders.requester_id` Ã© NULL-able" | `NOT NULL` desde a migration `000040` |
| "Tela web do roteiro em `client/` (backend pronto, sem UI)" | `ProductionRoutesPage.tsx` existe |
| "Tela web pendente (Plano Mestre)" | `MasterProductionPlanPage.tsx` existe |
| "G4 (apontamento obrigatÃ³rio) segue nÃ£o iniciado" | Entregue em `b954fa5` |

### A correÃ§Ã£o proposta â€” guarda automÃ¡tica âœ… IMPLEMENTADA em 2026-08-12

> **Status:** a parte automatizÃ¡vel desta proposta **foi implementada em
> 2026-08-12**. A separaÃ§Ã£o editorial `TODO.md` Ã— diÃ¡rio (abaixo) continua
> aberta â€” Ã© decisÃ£o de processo, nÃ£o de cÃ³digo.
>
> O que entrou:
>
> | Guarda | Onde | O que reprova |
> |---|---|---|
> | `docs-reality-drift-guard` (ampliada) | `server/tests/integration/docs-reality-drift-guard.test.ts` | Migration citada como pendente em **qualquer** doc vivo (`docs/**/*.md` + `CLAUDE.md` + `AGENTS.md`) que jÃ¡ conste em `SequelizeMeta`; e divergÃªncia do total de migrations nos **dois pontos de mediÃ§Ã£o canÃ´nica** (`CLAUDE.md` Â§1 e `docs/database/00-INDICE.md`) |
> | `docs-path-reference-guard` (nova, unitÃ¡ria) | `server/tests/unit/docs-path-reference-guard.test.ts` | Caminho de arquivo citado em crase num doc vivo que **nÃ£o existe no disco** â€” a classe de drift que a auditoria de 2026-08-11 achou em 12+ arquivos (D3: `scripts/comparar-bancos.cjs` sem o prefixo `server/`) |
>
> A convenÃ§Ã£o de isenÃ§Ã£o (banner de arquivo histÃ³rico, citaÃ§Ã£o `>`, caixa
> `- [x]`, marcador `(a criar)`) estÃ¡ documentada em
> `server/tests/helpers/docsGuardConventions.ts`. Nenhuma das duas guardas
> carrega lista de arquivos isentos: um documento se declara histÃ³rico
> escrevendo o banner no prÃ³prio topo, Ã  vista do leitor.

Separar os dois papÃ©is em dois arquivos:

- `DIARIO_BORDO_GO_LIVE_G6.md` â€” jÃ¡ existe e jÃ¡ Ã© append-only. O histÃ³rico das
  entregas vai inteiro para lÃ¡, **sem caixas de seleÃ§Ã£o**.
- `TODO.md` â€” vira sÃ³ o presente: pendÃªncias abertas, curto, reescrito a cada
  fechamento. Uma pendÃªncia resolvida **sai do arquivo** em vez de ganhar um
  `[x]`.

E uma guarda barata: um teste que falha se `TODO.md` passar de N linhas ou se
citar migration que jÃ¡ consta em `SequelizeMeta`. DocumentaÃ§Ã£o sem guarda
desatualiza â€” Ã© a mesma liÃ§Ã£o que o cÃ³digo jÃ¡ aprendeu quatro vezes.

---

## 3. O que realmente falta

### 3.1 ðŸ”´ Cadastro real â€” a frente maior, recÃ©m-iniciada

Ver `docs/carga-inicial/GUIA_CARGA_INICIAL.md` para o passo a passo.

| PendÃªncia | ResponsÃ¡vel | Bloqueia |
|-----------|-------------|----------|
| Conferir os 59 insumos marcados (5 bobinas com identificaÃ§Ã£o suspeita) | Engenharia | BOM |
| Corrigir 22 unidades de medida (cola, cordoalha) | Compras + Engenharia | Custo e MRP |
| Preencher custo padrÃ£o (327 itens em zero) | Compras + Controladoria | Custeio, preÃ§o, balanÃ§o |
| NCM/CEST de cada item | Contador | EmissÃ£o de NF-e |
| Cadastrar os ~22 produtos acabados | Engenharia | OP e venda |
| Montar a BOM | Engenharia | MRP, custo, baixa de estoque |
| InventÃ¡rio fÃ­sico de abertura | Almoxarifado | Tudo |

### 3.2 ðŸ”´ Cadastro mestre de itens nÃ£o tem trilha de auditoria (achado novo)

Descoberto ao conferir a carga dos 327 insumos de hoje: as 327 criaÃ§Ãµes via
`POST /api/items` **nÃ£o geraram um Ãºnico registro** em `audit_logs`. A tabela
inteira tinha 2 linhas depois da carga â€” os dois logins.

**Medido:** `itemController.ts` nÃ£o chama `logAction` nenhuma vez. Para
comparaÃ§Ã£o, o `productController` legado chama 6 vezes e o de BOM, 4. No total,
**63 dos 98 controllers** registram auditoria; o do item mestre estÃ¡ entre os
35 que nÃ£o registram.

**Por que importa:** `items` Ã© o cadastro canÃ´nico que alimenta MRP, BOM,
custeio e rastreabilidade. Hoje Ã© impossÃ­vel responder quem mudou o custo
padrÃ£o de um insumo, quem inativou um item ou quando â€” exatamente as perguntas
que uma auditoria fiscal ou de ISO 9001 faz. O risco cresce assim que a
Controladoria comeÃ§ar a preencher os custos (etapa 4 do guia de carga).

**CorreÃ§Ã£o sugerida:** chamar `logAction` em `create`, `update` e `inactivate`
de `itemController`, no mesmo padrÃ£o jÃ¡ usado por `productController`. Ã‰
trabalho pequeno e localizado. **NÃ£o implementado** â€” fora do escopo pedido.

### 3.2b ðŸŸ¡ `purchase_receipts` nÃ£o tem nenhuma foreign key (P1-07, promovido em 2026-08-12)

Estava enterrado como caixa `- [ ]` no `TODO.md` desde a auditoria de
2026-08-09 e nunca subiu para esta lista. **Continua aberto** â€” a auditoria
documental de 2026-08-12 remediu e confirmou.

**Medido em `pg_constraint` (2026-08-12), banco `erp_evok_audio`:**

| Tabela | FKs esperadas | FKs existentes |
|---|---|---|
| `purchase_receipts` | `purchase_id` â†’ `purchase_orders`, `received_by` â†’ `users` | **nenhuma** |
| `product_cost_ledgers` | `product_id` â†’ `products`, `created_by` â†’ `users` | sÃ³ `created_by` |

**Por que importa:** contradiz frontalmente a decisÃ£o arquitetural registrada
em `CLAUDE.md` Â§7 ("Foreign Keys ObrigatÃ³rias â€” integridade referencial
obrigatÃ³ria, 467 FKs"). SÃ£o as **duas Ãºnicas exceÃ§Ãµes conhecidas**, e uma delas
estÃ¡ no caminho do recebimento de compra â€” o evento que dispara entrada de
estoque **e** nascimento de conta a pagar (G13). Sem FK, um recebimento pode
apontar para um pedido que nÃ£o existe e nada reclama.

**MitigaÃ§Ã£o atual (por que nÃ£o Ã© ðŸ”´):** as duas tabelas tÃªm **0 linhas** hoje,
entÃ£o nÃ£o hÃ¡ Ã³rfÃ£o para limpar. A correÃ§Ã£o Ã© uma migration aditiva simples,
sem backfill â€” e o custo de fazÃª-la sÃ³ cresce depois da carga inicial.

**CorreÃ§Ã£o:** migration adicionando as 3 FKs faltantes (`ON DELETE RESTRICT`,
padrÃ£o do projeto), aplicada nos dois bancos na mesma rodada. **Fazer antes de
o recebimento comeÃ§ar a gravar dado real.**

### 3.3 ðŸ”´ PrÃ©-requisitos de configuraÃ§Ã£o da produÃ§Ã£o

- **`work_centers` tem 1 centro ("Montagem Final") com `cost_per_hour = 0`.**
  Custo de mÃ£o de obra sai zerado. Medido no banco hoje.
- **Nenhum produto tem roteiro ativo.** Desde o G6, iniciar OP sem roteiro
  falha (`G6-START-NO-ROUTE`) â€” correto, mas significa que **nenhuma OP pode
  comeÃ§ar** enquanto os roteiros nÃ£o forem cadastrados.
- **`production_cost_settings` jÃ¡ tem API** em `/api/production/cost-settings`.
  O fallback global de mÃ£o de obra, a base de rateio e o percentual de overhead
  agora sÃ£o editÃ¡veis pela aplicaÃ§Ã£o.

### 3.4 ðŸŸ¡ Infraestrutura de produÃ§Ã£o

- Servidor de produÃ§Ã£o **nÃ£o adquirido** â€” bloqueia reverse proxy/TLS,
  `docker-compose.prod.yml` exercitado e cron de backup.
- **Credencial de runtime ainda Ã© `evok_admin`**, nÃ£o a role de privilÃ©gio
  mÃ­nimo `evok_app` (que jÃ¡ existe â€” migration `000041`). Troca pendente.
- Sem rotaÃ§Ã£o de log (`LOG_FILE` sem logrotate).

### 3.5 ðŸŸ¡ Funcionalidades incompletas (com decisÃ£o de negÃ³cio pendente)

- **CNAB** (boleto/remessa/retorno) â€” sÃ³ OFX foi implementado.
- **HistÃ³rico multi-NF-e por pedido** â€” `Sale.nfe_*` guarda sÃ³ a mais recente.
- **Bloco K (SPED)** â€” a obrigaÃ§Ã£o de apontamento existe, mas a **geraÃ§Ã£o do
  arquivo** K200/K230/K235/K280 nÃ£o foi iniciada.
- **Bloco K (preview)** - ja existe preview estruturado/export CSV em
  `/api/fiscal/bloco-k`; o arquivo oficial do leiaute Ato COTEPE continua
  pendente.
- **AP automÃ¡tica dos tributos de importaÃ§Ã£o** â€” depende de decisÃ£o sobre
  moeda estrangeira.
- **Mapeamento departamento â†’ centro de custo** na AP automÃ¡tica.
- **PCP sem data de entrega prometida** â€” `sales` nÃ£o tem a coluna, entÃ£o o
  Plano Mestre trabalha com demanda consolidada, sem baldes de tempo.

### 3.6 ðŸŸ¡ GovernanÃ§a e pessoas

- **UsuÃ¡rios reais.** Os 21 usuÃ¡rios sÃ£o de teste (`@teste.evokaudio`, senha
  aleatÃ³ria). O Go-Live exige pelo menos um aprovador real em
  `@evokaudio.com.br`. Ã‰ decisÃ£o de pessoa, nÃ£o de cÃ³digo.
- **UAT** com os departamentos e **aprovaÃ§Ã£o formal G6** â€” o gate final.

### 3.7 â¸ï¸ Deixado de lado por decisÃ£o do dono (10/08)

- ValidaÃ§Ã£o de `mobile/` e `tv/` em hardware real. Ambos entregues e validados
  sÃ³ por typecheck/bundle.

---

## 4. RecomendaÃ§Ã£o sobre a prÃ³xima frente (n8n + IA + Meta)

Ela **nÃ£o depende** de nada da seÃ§Ã£o 3 para comeÃ§ar: o webhook jÃ¡ existe
(`POST /api/webhooks/n8n`, exercitado na suÃ­te de integraÃ§Ã£o de hoje) e a API
estÃ¡ estÃ¡vel.

Duas ressalvas, para nÃ£o criar dÃ­vida nova:

1. **A integraÃ§Ã£o vai ler e escrever dados que ainda nÃ£o existem.** Um fluxo de
   n8n que consulte estoque ou preÃ§o hoje recebe zero. Vale comeÃ§ar pelos
   fluxos que nÃ£o dependem do cadastro (atendimento, captura de lead,
   notificaÃ§Ã£o) e deixar os de estoque/pedido para depois da carga.
2. **Credencial de integraÃ§Ã£o.** O webhook nÃ£o deve usar o token de uma pessoa.
   Vale criar um perfil de acesso dedicado, de escopo mÃ­nimo, antes do primeiro
   fluxo em produÃ§Ã£o â€” senÃ£o a segregaÃ§Ã£o de funÃ§Ã£o (D-K) fica furada por um
   robÃ´ com poderes de admin.

