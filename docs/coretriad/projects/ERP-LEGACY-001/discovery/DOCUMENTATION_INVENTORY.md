# DOCUMENTATION_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico, trilha Documentação)

**Modo:** read-only reforçado. Nenhum arquivo do repositório foi alterado por
esta trilha (o próprio arquivo produzido por ela não havia sido persistido —
gravado posteriormente pelo `coretriad-director`/orquestrador a partir do
texto de resposta do agente, sem qualquer edição de conteúdo).
**Método:** READ (leitura de ~40 arquivos representativos + varredura
mecânica dos 191 `.md` de `docs/**` + `CLAUDE.md` + READMEs de app) → ANALYZE
(classificação por grupo documental e por convenção de vivo/histórico) → não
avancei para VERIFY/PROVE de divergência de conteúdo — isso é o Passo 31
(auditoria de divergência), fora do escopo deste snapshot.
**Convenção usada para classificar vivo × histórico:**
`server/tests/helpers/docsGuardConventions.ts` (R1: banner `SUPERADO`/
`DOCUMENTO HISTÓRICO`/`REGISTRO APPEND-ONLY`/`REGISTRO DATADO` nas primeiras
30 linhas isenta o arquivo inteiro; R2: linha citada com `>`; R3: item de
checklist fechado `- [x]`). Este é o critério mecânico real do projeto — não
inventado pelo agente.

---

## 1. Onde a documentação vive — mapa de diretórios

| Raiz | Conteúdo | Nº arquivos `.md` |
|---|---|---|
| `CLAUDE.md` (raiz do repo) | Regras operacionais permanentes do CoreTriad + ponteiro para o SSOT do produto | 1 |
| `docs/project-memory/product/ERP_SSOT.md` | SSOT do produto (status, roadmap, gaps, runbook, decisões) — era o `CLAUDE.md` até 2026-08-12 | 1 |
| `docs/project-memory/` (resto) | `README.md`, `architecture/adrs/0000-template.md` | 2 |
| `docs/coretriad/` | Especificação mestre do CoreTriad + pasta `planning/` (bootstrap, gaps, matrizes de autoridade/permissão, relatórios de validação SIM-001/SIM-002, handoff 2026-08-13) | 19 |
| `docs/database/` | Modelo de dados estruturado (7 docs numerados) + changelog narrativo + setup + auditorias de schema | 12 |
| `docs/governance/` | Pendências vivas, diário histórico, handoffs, subpastas `auditorias/` e `go-live/`, e backup de 21 agentes legados | 42 |
| `docs/arquitetura/` | Requisitos funcionais/não funcionais, contrato de API, diagramas | 8 |
| `docs/business/` | Blocos de requisitos/dados/API/auditoria/verificação por departamento novo (SST/TI/JUR/FAC/MKT/RH/WhatsApp) + briefs + regras de negócio de RBAC | 37 |
| `docs/projeto/` | Plano de arquitetura, plano industrial, casos de uso formais (SSOT de UC) | 4 |
| 17 pastas departamentais (`rh/`, `financeiro/`, `producao/`, `qualidade/`, `logistica/`, `patrimonio/`, `suprimentos/`, `comercial/`, `juridico/`, `seguranca_trabalho/`, `tributario/`, `administrativo/`, `infra/`) | Documentação funcional por área de negócio, padrão `00-README.md` + `NN-TEMA.md` | ~60 |
| `docs/manual/`, `docs/carga-inicial/`, `docs/omnichannel/`, `docs/incidentes/`, `docs/design/` | Manual do usuário, guia de carga inicial (gate de Go-Live), conceito WhatsApp, registro de incidente, referência visual | 5 |
| `docs/00-ESTRUTURA_ORGANIZACIONAL.md`, `docs/README.md` | Índices mestres de navegação | 2 |
| `client/README.md` | Boilerplate genérico do template Vite/React — **não descreve o produto** | 1 |
| `mobile/README.md` | Vivo e detalhado: escopo, decisões técnicas, o que foi validado (`tsc`, `expo-doctor`, `expo export`) e o que falta (dispositivo real) | 1 |
| `tv/README.md` | Vivo e detalhado: mesma estrutura do mobile, com validações headless explícitas e lista de pendências que exigem hardware real | 1 |
| `server/` | **Nenhum README.md** — lacuna de cobertura documental (ver §4) | 0 |

**Total de arquivos `.md` relevantes mapeados nesta passada: 195** (191 em
`docs/**` + `CLAUDE.md` + 3 READMEs de app; `server/` sem README contado como
lacuna, não como documento).

Fora do escopo deste inventário (documentação do próprio CoreTriad como
organização, não do produto ERP, mas existente no repo): `coretriad/`
(raiz, fora de `docs/`), `product/SIM-001`, `product/SIM-002`, `audit/`,
`organizations/`, `.claude/agents/**/*.md`, `.claude/skills/**/*.md` —
citados aqui só para registrar que existem e não foram confundidos com
documentação do ERP.

---

## 2. O que cada grupo alega ser sua função (primeira impressão, não verificação)

### Requisitos
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de RFs por
  módulo, alega derivar de leitura real de rotas (`server/app.ts`,
  `client/src/App.tsx`), com tags `[IMPLEMENTADO]`/`[PENDENTE]`/`[PARCIAL]`.
  Revisado 2026-08-12 por auditoria documental (11 alegações falsas
  corrigidas, segundo o próprio texto).
- `docs/projeto/04-USE_CASES.md` — alega ser o SSOT de casos de uso (UC-01 a
  UC-73).
- `docs/business/01-USE_CASES.md` — alega ter sido consolidado em
  `04-USE_CASES.md`, mantido "como registro histórico" — **mas não usa
  nenhum dos 4 marcadores da convenção mecânica** (ver §3, achado de
  cobertura).
- `docs/business/BUSINESS_RULES.md` — alega ser "requisito especificado...
  NÃO implementado ainda" (RBAC por área).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNFs dedicados.
- `docs/business/BLOCO_*_REQUISITOS.md` (7 blocos: SST/TI/JUR/FAC/MKT/RH/WPP)
  — requisitos por módulo novo.

### Dados
- `docs/database/00-INDICE.md` — porta de entrada, alega listar "os 7
  documentos" oficiais (conceitual/lógico/físico/dicionário/acessos/
  estruturas/DR) e ostenta uma "medição canônica" (169 migrations, 207
  tabelas, 478 FKs) que se autodeclara um dos dois únicos pontos de medição
  canônica do projeto (o outro é `CLAUDE.md`).
- `docs/business/BLOCO_*_MODELO_DADOS.md` — modelo de dados por módulo novo,
  explicitamente **não propagado** para `02-MODELO_LOGICO.md`/
  `04-DICIONARIO_DADOS.md` por convenção declarada da pasta.
- `docs/database/DATABASE.md` — changelog narrativo (o "porquê"), distinto
  do "o que existe hoje".

### Arquitetura
- `docs/arquitetura/DIAGRAMA_CLASSES*.md`, `DIAGRAMAS_SEQUENCIA.md`,
  `DIAGRAMA_CASOS_DE_USO_BPMN.md`, `DIAGRAMA_ARQUITETURA_INFRAESTRUTURA.md`
  — diagramas Mermaid.
- `docs/projeto/01-PLANO.md`, `02-PLANO_INDUSTRIAL.md` — plano de
  arquitetura/industrial.

### Segurança
- `docs/database/05-ACESSOS_E_ISOLAMENTO.md` — alega ser auditoria real de
  `pg_roles` (2026-08-06) + varredura de código, com achado de risco
  (superusuário único) e remediação no mesmo dia.
- `docs/administrativo/04-PERFIS_ACESSO.md` — alega documentar "o que existe
  de fato no código" (RBAC + Perfis de Acesso Configuráveis), com fontes
  citadas (`accessModules.ts`, middlewares).

### APIs
- `docs/arquitetura/API.md` — contrato de endpoints, payloads, formatos de
  erro (dois formatos convivendo, segundo o próprio texto).
- `docs/business/BLOCO_*_API.md` — contratos por módulo novo.

### Operações
- `docs/infra/DEPLOY.md`, `DEPLOY_UBUNTU.md`, `DOCKER_POSTGRES_SETUP.md`,
  `BACKUP_RESTORE_G2_2026-07-31.md` — deploy, docker, backup.
- `docs/database/07-DISASTER_RECOVERY.md` — alega distinguir "implementado"
  de "aspiracional".
- `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`,
  `PLANO_IMPLEMENTACAO_4_BLOQUEADORES.md`, `DIARIO_BORDO_GO_LIVE_G6.md` —
  plano de Go-Live e diário append-only.
- `docs/carga-inicial/GUIA_CARGA_INICIAL.md` — gate operacional de Go-Live,
  guia não técnico.

### Testes/Verificação
- `docs/governance/auditorias/*` (9 arquivos) — relatórios de auditoria
  datados: pré-produção (2026-08-02), conformidade, levantamento, CONT/TES/
  CTR, ampla e varredura dupla/escrita real (2026-08-11), classe de defeito
  de verificação (2026-08-10), consistência da cadeia de produto
  (2026-08-10).
- **Não há documento dedicado a "estratégia de testes"/"cobertura de
  testes" fora desses relatórios de auditoria** — a suíte é descrita
  indiretamente (contagens de testes, guardas específicas) dentro do
  `ERP_SSOT.md` e dos relatórios acima. Registrado como possível lacuna a
  confirmar no passo de auditoria adversarial.

### Consistência (meta-documentação)
- `docs/README.md` — mapa de navegação de `docs/`, com convenções
  declaradas (tags de status, proibição de novos relatórios soltos, onde
  registrar pendência).
- `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` — autodeclarado "fonte
  de pendências", medido contra banco/código/suíte, com precedência
  explícita sobre `TODO.md`.
- `docs/governance/TODO.md` — autodeclarado "diário histórico", não
  confiável como lista de pendências (o próprio `ERP_SSOT.md` cita ~12
  alegações falsas encontradas nele em 2026-08-10).
- `server/tests/helpers/docsGuardConventions.ts` — não é documentação, é a
  implementação mecânica que **impõe** a convenção de vivo/histórico sobre
  toda a documentação acima.

---

## 3. Primeira impressão: vivo vs. histórico/possivelmente obsoleto

**Autodeclarados históricos pela convenção mecânica (banner R1 nas primeiras
30 linhas), amostrados e confirmados por leitura direta:**
`docs/governance/HANDOFF_CODEX.md` (REGISTRO APPEND-ONLY),
`docs/governance/auditorias/AUDITORIA_AMPLA_2026-08-11.md`,
`VARREDRA_DUPLA_2026-08-11.md`, `VARREDURA_ESCRITA_REAL_2026-08-10.md`,
`CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`,
`AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-10.md`,
`LEVANTAMENTO_ERP_2026-08-02.md`, `AUDITORIA_CONT_TES_CTR_2026-08-07.md`,
`AUDITORIA_PRE_PRODUCAO_2026-08-02.md`, `CONFORMIDADE_CHECK_2026-08-02.md`,
`docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`,
`ESTADO_SESSAO_2026-08-09.md`, `ESTADO_SESSAO_2026-08-07.md`,
`docs/governance/go-live/PLANO_IMPLEMENTACAO_4_BLOQUEADORES.md`,
`docs/infra/BACKUP_RESTORE_G2_2026-07-31.md`,
`docs/business/BLOCO_2_TI_AUDITORIA.md`, `BLOCO_4_FAC_AUDITORIA.md`,
`BLOCO_6_RH_AUDITORIA.md`, `docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md`,
`docs/governance/VALIDACAO_CADEIA_PRODUTO_2026-08-10.md`.

Mais os 21 arquivos de
`docs/governance/agentes-legado-backup-2026-08-12/` — mas estes são backups
de definições de agente pré-CoreTriad, **não documentação do produto ERP**;
contá-los como "documento do produto marcado obsoleto" distorceria a
métrica.

**Total autodeclarado histórico via banner mecânico (só documentação de
produto/processo, excluindo backup de agentes): 19 arquivos.**

**Achado de cobertura (não é fix, é registro para o passo 31):**
`docs/business/01-USE_CASES.md` tem um banner de topo (`⚠️ CONSOLIDADO em
docs/projeto/04-USE_CASES.md — NÃO EDITAR AQUI`) e diz "mantido como
registro histórico", mas **não contém nenhum dos 4 termos exatos** que a
guarda mecânica reconhece (`SUPERADO`, `DOCUMENTO HISTÓRICO`, `REGISTRO
APPEND-ONLY`, `REGISTRO DATADO`). Confirmado por leitura direta e por
ausência do arquivo na varredura `grep` desses termos sobre `docs/`. Na
prática, este documento **parece** histórico para um leitor humano mas
**não está isento** da guarda mecânica — as linhas não citadas/não em
checklist fechado dele continuam sob auditoria de drift. Isso é uma
divergência entre convenção declarada e convenção aplicada, a ser tratada
como finding formal no passo de auditoria de consistência (não corrigido
aqui).

**Vivos, com evidência de manutenção ativa e cross-referência (amostra
lida):** `CLAUDE.md`, `docs/project-memory/product/ERP_SSOT.md`,
`docs/database/00-INDICE.md`, `docs/database/05-ACESSOS_E_ISOLAMENTO.md`,
`docs/arquitetura/API.md`, `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md`,
`docs/administrativo/04-PERFIS_ACESSO.md`, `docs/README.md`,
`docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md`,
`docs/coretriad/CORETRIAD_MASTER_SPEC.md`,
`docs/coretriad/planning/HANDOFF_2026-08-13.md`, `mobile/README.md`,
`tv/README.md`, `docs/00-ESTRUTURA_ORGANIZACIONAL.md`,
`docs/carga-inicial/GUIA_CARGA_INICIAL.md`,
`docs/omnichannel/CONCEITO_ASSISTENTE_WHATSAPP.md`.

**Vivo mas com status interno de "não implementado ainda" (requisito, não
histórico):** `docs/business/BUSINESS_RULES.md` — não é obsoleto, é
especificação aguardando construção. Não deve ser contado junto com
"possivelmente obsoleto".

**Não é documentação do produto — boilerplate genérico não mantido:**
`client/README.md` (template padrão do Vite, sem qualquer referência ao
ERP). Não tem banner de histórico porque nunca foi escrito sobre o produto;
ainda assim, é uma lacuna de cobertura (ver §4): não existe README de
`client/` que documente o app real, ao contrário de `mobile/` e `tv/`.

**Registro pontual (não histórico no sentido de "superado", mas também não
é fonte viva de estado):** `docs/incidentes/2026-08-06-tela-branca-applayout.md`
— post-mortem de incidente único, por natureza não se atualiza; convenção
própria da pasta (`docs/README.md` diz "não reorganizar").

---

## 4. Lacunas de cobertura documental (documento inexistente ≠ não auditado)

1. **`server/README.md` não existe.** Único dos quatro componentes de
   runtime (`server/`, `client/`, `mobile/`, `tv/`) sem README próprio —
   quem chega ao backend depende inteiramente de `CLAUDE.md`/`ERP_SSOT.md`
   e `docs/arquitetura/API.md` para orientação de setup/estrutura.
2. **`client/README.md` é boilerplate genérico**, não documentação do
   produto — na prática equivale a "sem README real" para fins de auditoria
   de cobertura, mesmo o arquivo existindo.
3. **Nenhum documento dedicado a estratégia/cobertura de testes** foi
   encontrado fora dos relatórios de auditoria pontuais — a existir, está
   implícito e disperso (não centralizado), o que dificulta rastrear "o que
   a suíte prova" como fonte viva única.
4. **`docs/business/01-USE_CASES.md`** não segue a convenção mecânica de
   banner apesar de se autodeclarar histórico em prosa — ver §3.
5. **Não avaliado aqui**: existência/ausência de documentação de segurança
   para os módulos SST/TI/JUR/FAC/MKT/RH/WPP fora dos "Blocos" (ex.:
   política de retenção LGPD centralizada, se existe fora do que está
   espalhado em `jur_lgpd_*` e nos blocos individuais) — fica registrado
   como área a confirmar no passo 31, sem tempo de leitura completa dos 7
   blocos neste passo.
6. Este inventário **não conferiu** os ~60 arquivos das 17 pastas
   departamentais (`rh/`, `financeiro/`, `producao/` etc.) individualmente
   além do índice (`docs/README.md`) e de amostras de cabeçalho — cobertos
   por localização e propósito declarado no índice mestre, mas não lidos um
   a um. Registrado explicitamente como cobertura por amostragem, não por
   leitura exaustiva.

---

## 5. Contagens finais

- **Documentos relevantes mapeados:** **195** (191 arquivos em
  `docs/**/*.md` + `CLAUDE.md` + `client/README.md` + `mobile/README.md` +
  `tv/README.md`), mais o registro explícito de que `server/` não tem
  README (lacuna, não documento).
- **Marcados como possivelmente obsoletos/históricos nesta primeira
  impressão:** **19** documentos de produto/processo autodeclarados via
  banner mecânico da convenção do projeto (relatórios de auditoria datados,
  diários de estado de sessão, handoffs append-only, cronograma executado)
  — **mais 1 caso limítrofe** (`docs/business/01-USE_CASES.md`) que se
  comporta como histórico em prosa mas não cumpre a convenção mecânica,
  portanto fica **fora** da contagem de 19 e é reportado à parte como
  achado de consistência a validar no passo 31. Os 21 backups de agentes
  legados em `docs/governance/agentes-legado-backup-2026-08-12/` também
  carregam o banner, mas foram excluídos da contagem por não serem
  documentação do produto ERP.

---

*Produzido pelo agente `vericore-documentation-audit-lead` em modo read-only
reforçado (nenhum arquivo do repositório alterado por esta trilha); conteúdo
persistido neste caminho pelo orquestrador após a resposta do agente não ter
sido gravada em disco por ele mesmo.*
