# T-23 — DOCUMENTAÇÃO × CÓDIGO · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-documentation-audit-lead` (T-23 documentacao x codigo) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID:  ERP-LEGACY-001-AUD-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
TRILHA:    T-23 — DOCUMENTAÇÃO × CÓDIGO
TITULAR:   vericore-documentation-audit-lead
REGIME:    read-only reforçado (APR-2026-016) — nenhuma conexão de banco, nenhuma execução
COBERTURA EFETIVA:
  - 172 .md em escopo (E4 excluiu 58 de docs/coretriad/) + CLAUDE.md + 15 READMEs de módulo
    + READMEs client/mobile/tv
  - 100% cobertos para tier 1/tier 2 por leitura direta ou por verificação cruzada dos 5 itens
    escalados (que já cobrem financeiro/fiscal/estoque/autorização/casos de uso/API)
  - Varredura estrutural (grep) de citação de caminho aplicada a ~4.374 ocorrências em 182
    arquivos .md (inclui os 58 de docs/coretriad/, porque é o universo que o PRÓPRIO GUARD
    varre — não é auditoria desses 58, é resolução do RES-T20-01, que exige reproduzir
    exatamente o que o teste varre)
  - Lidos integralmente ou em amostra dirigida: ~40 documentos (ver lista no fim)
  - NÃO verificado citação-a-citação: os ~500 restantes de docs/governance/TODO.md
    (arquivo vivo, não teve banner R1) e a cauda de docs/coretriad/*.md — ver RES-T23-02
```

### Método aplicado
READ (documento + código/teste referenciado) → ANALYZE (o que o documento afirma) → VERIFY (confronto direto com arquivo real no disco / código real) → PROVE (âncora arquivo:linha) → CLASSIFY (conforme / divergente / SSOT falsa / lacuna de cobertura) → REPORT.

---

### 1. Os 5 itens escalados por outras trilhas — resolução nominal

#### 1. `RES-T20-01` — citação de caminho quebrada em `docs-path-reference-guard.test.ts` — **NÃO FECHADO** (mecanismo confirmado, causa raiz não localizada apesar de varredura extensa)

Reli o guard (`server/tests/unit/docs-path-reference-guard.test.ts:1-231`) e as convenções (`server/tests/helpers/docsGuardConventions.ts:1-175`) e apliquei manualmente as mesmas regras (R1 banner histórico / R2 citação `>` / R3 checklist fechado / R5 marcador de proposta / R6 glob-placeholder) a dezenas de candidatos extraídos da varredura estrutural. Todos os candidatos plausíveis que localizei estavam **corretamente exemptos**:

- `docs/producao/06-BOM.md:332` (`docs/BLACKBOX_CRONOGRAMA_CHECKLIST.md`) — dentro de bloco `>` (R2).
- `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md` (mesma citação, linhas 21/395) — arquivo inteiro tem banner `REGISTRO DATADO` (R1).
- `docs/governance/TODO.md:2356-2444` (4 citações órfãs: `BLACKBOX_CRONOGRAMA_CHECKLIST.md`, `CRONOGRAMA_CORRECAO_E_GO_LIVE_2026-07-30.md`, `DATABASE_DICTIONARY.md`, `UAT_RELEASE_G6_2026-07-31.md`) — todas dentro de um item `- [x]` fechado (R3).
- `docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md:164` (`docs/almoxarifado/00-README.md`, que **não existe**) — arquivo inteiro tem banner `REGISTRO DATADO` (R1).
- `docs/business/briefs/BRIEF_SST_2026-08-06.md:189` (`docs/rh/06-TREINAMENTOS.md`, que não existe) — linha contém "os arquivos não existem" (R5).
- `docs/business/BLOCO_6_RH_AUDITORIA.md:28` (`docs/business/pipeline-modulos-novos.md`, que não existe) — arquivo inteiro tem banner `REGISTRO DATADO` (R1).
- `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md:779,881,966,1058` (4 arquivos `docs/GO_LIVE_G6_*.md` que não existem) — todas as 4 linhas trazem `[A CRIAR NO GO-LIVE DAY — não existe hoje]` (R5), e há uma tabela dedicada (linhas 1330-1344) documentando exatamente essas 4 como "templates de processo", com decisão registrada de não criá-los agora.
- `docs/governance/HANDOFF_CODEX.md` (maior arquivo do corpus, **1.569** citações de caminho) — **arquivo inteiro exempto**, banner `REGISTRO APPEND-ONLY` (`:3`).
- `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (268 citações) — **arquivo inteiro exempto**, mesmo banner (`:3`).

**Conformidade T23-C01 (peso de finding):** a convenção de isenção (R1/R2/R3/R5/R6) está sendo aplicada de forma disciplinada e consistente em todo canto onde procurei — nenhum dos ~15 "quase-achados" que persegui era, de fato, uma citação viva quebrada. Isso é evidência forte de que a limpeza de 2026-08-11/2026-08-12 (que introduziu as guardas) foi bem-feita, não um sinal de que a guarda está com falso-positivo mascarado.

**O que não fechei:** eliminei os dois maiores arquivos do corpus (`HANDOFF_CODEX.md`, `DIARIO_BORDO_GO_LIVE_G6.md`, juntos 1.837 das ~4.374 ocorrências totais) por banner de arquivo inteiro, e verifiquei individualmente ~30 candidatos distintos nos demais. Não verifiquei citação-a-citação as ~500 restantes de `docs/governance/TODO.md` (arquivo vivo, sem banner de exclusão total, majoritariamente organizado em checklist — logo com boa cobertura de R3, mas não voguei linha a linha) nem a cauda dos 58 arquivos de `docs/coretriad/` (fora do meu escopo de auditoria por E4, mas dentro do universo que o próprio guard varre em `arquivosDeDocumentacao()` — `server/tests/helpers/docsGuardConventions.ts:108-115` lista `docs/**/*.md` sem excluir `coretriad/`). Ver `RES-T23-02` abaixo.

**Recomendação:** o caminho mais barato para fechar isto de vez é dinâmico, não mais estático — `DYN-T20-06` (já proposto por T-20: `npx jest tests/unit/docs-path-reference-guard.test.ts --runInBand`) produz a lista exata de linhas quebradas em segundos; meu esforço estático manual, embora extenso, não tem certeza de exaustividade contra ~4.374 citações.

#### 2. `DIAGRAMA_CLASSES_CAMADAS.md` cobre 10/48 módulos e documenta a espinha legada como camada intencionada — **CONFIRMADO**

Li `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:1-40`: o diagrama Mermaid lista `AuthController, UserController, ClientController, ProductController, SaleController, InventoryController, BomController, ProductionOrderController` e usa cases `LoginUseCase/RegisterUserUseCase/GetMeUseCase/ListUsersUseCase` — um recorte pequeno e antigo do sistema, consistente com "10 de 48". Confirmei também a contagem de READMEs: `server/src/modules/*/README.md` retorna exatamente **15** módulos (`accessProfiles, auth, bom, clients, financial, inventory, production, products, suppliers, users, purchases, comex, sales, quality, masterProduction`) — bate com o número de T-19. Confirmei também que **`server/` não tem `README.md` próprio** (`Glob server/README.md` → nenhum resultado) — a lacuna já registrada no inventário do plano, não repito como achado novo.

**`T23-F01` — Decisão arquitetural sobre a camada legada (`server/src/services/`) documentada corretamente pelo código, mas nunca formalizada como ADR**
**Severidade: MEDIUM · Confiança: ALTA**
T-19 já mediu o sinal invertido: aqui o documento está factualmente certo sobre o código (a espinha legada em `server/src/services/` de fato coexiste com os módulos novos em `server/src/modules/*`), mas essa coexistência intencional — que módulos ficam em arquitetura hexagonal nova e quais permanecem em serviço monolítico legado, e por quanto tempo — não tem registro formal de decisão (nenhum ADR encontrado em `docs/arquitetura/` tratando disso). Isso é um risco de manutenção: sem ADR, qualquer novo colaborador (ou agente) pode "corrigir" a divergência migrando serviços por iniciativa própria sem saber que é uma decisão deliberada, ou o inverso — presumir que é dívida técnica a eliminar quando pode não ser.
**Âncora:** `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md:1-40` (cobertura de 10/48); ausência de `docs/arquitetura/ADR-*.md` ou seção equivalente sobre a convivência services/modules.
**Fronteira:** não é finding de arquitetura de código (território de T-19) — é a lacuna de **registro de decisão**, que é objeto de documentação.

#### 3. `docs/tributario/02-ICMS_ESTADOS.md` diverge do código em 19/27 UFs, sem vigência/versionamento; `00-README.md:56-85` fluxograma materialmente incorreto — **CONFIRMADO E AMPLIADO**

Li `docs/tributario/02-ICMS_ESTADOS.md:1-40`: confirmei a ausência total de coluna de vigência/data-base na tabela de alíquotas — o único indício temporal é o título da seção ("2024"), sem data de atualização, sem histórico de mudança, sem nenhuma citação de norma (Convênio ICMS, Resolução do Senado) por UF. Isso é agravante em relação ao que T-08 já registrou (divergência de valor): mesmo que os 19/27 valores estivessem certos, o documento não tem como o leitor saber se ainda estão vigentes.

Li `docs/tributario/00-README.md:56-86`: confirmei que o fluxograma abre com `Identifica Regime do Cliente (SN, LP, LR)` como segundo passo — corrobora o achado de T-08: o cálculo de ICMS/IPI/PIS/COFINS/IRPJ/CSLL depende primariamente do **regime tributário do emitente** (a própria empresa), não do cliente (o regime do cliente afeta pontualmente substituição tributária e diferencial de alíquota, não o cálculo-base). Confirmei também a omissão: o fluxo termina em "Contabiliza na apuração mensal → Gera arquivos SPED, DCTF" sem nenhum ramo para cancelamento de NFe, negação de autorização (rejeição da SEFAZ) ou carta de correção — os três eventos fiscais mais comuns depois da emissão não têm lugar nenhum no único fluxograma do processo fiscal do sistema.

**`T23-F02` — Fluxograma único do processo fiscal (`docs/tributario/00-README.md:56-86`) inverte o sujeito do regime tributário e omite os 3 eventos pós-emissão mais comuns**
**Severidade: HIGH · Confiança: ALTA**
**Impacto:** qualquer leitor (humano ou agente) que use este fluxograma como especificação para implementar ou revisar cálculo fiscal implementa a lógica errada (regime do cliente em vez do emitente) e não sabe que precisa tratar cancelamento/negação/correção — são exatamente os três cenários que mais geram autuação fiscal quando mal tratados.
**Âncora:** `docs/tributario/00-README.md:56-86`; contraste com `docs/tributario/02-ICMS_ESTADOS.md:1-40` (achado original de T-08, aqui confirmado por leitura direta).

#### 4. `docs/arquitetura/API.md` omite 348/676 endpoints (51%) — **CONFIRMADO**

Grep dirigido em `docs/arquitetura/API.md` por `/api/sst`, `/api/ti/`, `/api/juridico`, `/api/facilities`, `/api/marketing`, `/api/rh` → **0 ocorrências** para todos os 6 padrões. O documento se autodeclara "a" documentação da API (título do arquivo) e nenhuma das 212 citações de caminho que ele contém (`docs/arquitetura/API.md`, medido na varredura estrutural) referencia os 6 `docs/business/BLOCO_{1,2,3,5,6}_*_API.md` que efetivamente documentam esses módulos — nenhum link, nenhuma nota "ver também". Confirmo o achado de T-17 e a caracterização de "SSOT falsa": um leitor que abre `API.md` esperando o contrato completo não descobre, pelo próprio documento, que 6 blocos inteiros de endpoints vivem em outro lugar.

**`T23-F03` — `API.md` se autodeclara documentação central da API sem nenhum ponteiro para os 6 documentos `BLOCO_*_API.md` que cobrem 51% dos endpoints**
**Severidade: HIGH · Confiança: ALTA** (mesma severidade atribuída por T-17 — Regra 22/20, não rebaixo)
**Âncora:** `docs/arquitetura/API.md` (arquivo inteiro, ausência); `docs/business/BLOCO_1_SST_API.md`, `BLOCO_2_TI_API.md`, `BLOCO_3_JUR_API.md`, `BLOCO_5_MKT_API.md`, `BLOCO_6_RH_API.md` (existem e documentam os endpoints omitidos).

#### 5. `docs/projeto/04-USE_CASES.md` SSOT de UC-01 a UC-73 omite UC-56, UC-57, UC-63 a UC-66; colisão de numeração UC-52/53/71 — **CONFIRMADO, com correção de nuance**

Grep por `^## UC-5[6-9]|^## UC-6[0-6]` em `04-USE_CASES.md` → único resultado: `UC-58 a UC-62` (bloco agrupado, título único de seção). Confirma ausência de seções dedicadas a UC-56, UC-57, UC-63 a UC-66. Encontrei, porém, que a colisão UC-52/53 **já está documentada explicitamente pelo próprio arquivo** (`:2370-2378`, seção "UC-52-JUR a UC-54-JUR", nota "Nota de numeração (dívida de documentação a resolver)": *"os documentos do Bloco 3 numeram os 5 casos de uso do módulo Jurídico como UC-52 a UC-56, sem saber que UC-52/UC-53 deste arquivo já haviam sido atribuídos, no mesmo dia (2026-08-07), aos módulos Facilities e Marketing"*) — isto é, a colisão é uma dívida **reconhecida e registrada**, não uma divergência silenciosa. Isso reduz (não elimina) a severidade em relação a uma SSOT que mente sem se dar conta: aqui a SSOT admite sua própria inconsistência, mas ainda não a resolveu.

**`T23-F04` — `04-USE_CASES.md` (SSOT declarada) tem lacunas reais (UC-56/57/63-66 sem seção) e uma colisão de numeração conhecida e não resolvida**
**Severidade: MEDIUM (rebaixada de HIGH em relação à leitura ingênua, porque a colisão é auto-declarada; a lacuna de UC-56/57/63-66 permanece sem mitigação e mantém a severidade média) · Confiança: ALTA**
**Âncora:** `docs/projeto/04-USE_CASES.md:2237` (única seção próxima, agrupa 58-62, sem 56/57); `:2370-2378` (nota de dívida sobre UC-52/53/56).

---

### 2. Achados adicionais (fora dos 5 itens escalados)

**`T23-F05` — Fence de código Markdown não fechado corrompe a renderização de `docs/rh/00-README.md`**
**Severidade: LOW · Confiança: ALTA**
O bloco ```` ``` ```` aberto na linha 89 (fluxo de admissão em ASCII) nunca é fechado antes do `---` da linha 116 — todo o texto entre o fluxograma e o final do arquivo (incluindo a seção "Última atualização") é engolido como bloco de código por qualquer renderizador Markdown estrito.
**Âncora:** `docs/rh/00-README.md:89-118`.

---

### 3. Conformidades registradas com o mesmo peso de finding

- **T23-C01** — a convenção de isenção de guarda documental (R1/R2/R3/R5/R6, `server/tests/helpers/docsGuardConventions.ts`) está aplicada com disciplina real em todo o corpus verificado: toda citação de caminho inexistente que encontrei estava corretamente marcada como histórica/proposta/fechada, nunca "esquecida".
- **T23-C02** — `docs/tributario/01-SST.md` (sic, achado por engano ao navegar `seguranca_trabalho/01-SST.md`) e os módulos de negócio (`BLOCO_*_MODELO_DADOS.md`, `BLOCO_*_API.md`, `BLOCO_*_AUDITORIA.md`) seguem um padrão consistente de cross-referência entre si (requisitos → modelo → API → auditoria), com citações que resolvem corretamente na quase totalidade dos casos amostrados.
- **T23-C03** — `docs/rh/00-README.md:30-38` é um exemplo exemplar de honestidade documental: lista explicitamente quais dos arquivos que o próprio índice do módulo promete **não existem** (`05-FERIAS.md`, `06-TREINAMENTOS.md`, `07-ESOCIAL.md`), com tabela dizendo onde o assunto vive de fato — o oposto do defeito "SSOT falsa".
- **T23-C04** — `docs/projeto/04-USE_CASES.md:2372-2378` reconhece por escrito sua própria colisão de numeração em vez de escondê-la (ver item 5 acima) — mitiga, mas não resolve, o achado T23-F04.

---

### 4. `RES-T23-nn` — lacunas de cobertura registradas nominalmente

- **`RES-T23-01`** — não determinei, dentro do esforço orçado (4S), a citação exata que faz `docs-path-reference-guard.test.ts` falhar hoje (ver item 1 acima). Eliminei os 2 maiores arquivos do corpus por banner de exclusão total e ~30 candidatos individuais, mas não voguei citação-a-citação as ~4.374 ocorrências totais. Recomendo `DYN-T20-06` (já proposto por T-20) para fechamento definitivo.
- **`RES-T23-02`** — não verifiquei individualmente as ~500 citações restantes de `docs/governance/TODO.md` (arquivo vivo, sem banner de exclusão total) nem a cauda dos 58 arquivos de `docs/coretriad/` (fora do meu escopo de auditoria por E4, mas dentro do universo varrido pelo próprio guard).
- **`RES-T23-03`** — dos 172 `.md` em escopo, li integralmente ou por amostra dirigida ~40; os ~130 restantes (majoritariamente `docs/business/briefs/*`, `docs/governance/agentes-legado-backup-2026-08-12/*`, e documentos de módulos de menor risco — comercial, patrimônio, suprimentos, qualidade além dos já citados) não foram lidos linha a linha, só tiveram suas citações de caminho varridas estruturalmente. Amostragem seguiu a regra declarada no plano: 100% tier1/tier2 coberto por via dos 5 itens escalados (financeiro/fiscal/estoque/autorização/casos de uso/API já são exatamente esse núcleo); o restante por prioridade de (a) citado como divergente por outra trilha, (b) autodeclaração de SSOT.
- **`RES-T23-04`** — não avaliei a paridade `.claude/agents/` × `.codex/agents/` (mencionada de passagem em `docs/governance/TODO.md:2445-2451` como pendência conhecida) — fora do escopo de documentação de produto desta trilha.
- **`RES-T23-05`** — não emiti finding formal sobre a mistura de idioma nos nomes de pastas de `docs/` (português vs. inglês, já registrada como pendência conhecida em `docs/governance/TODO.md:2363-2377` com decisão explicitamente pendente do dono) — é decisão de convenção, não divergência doc×código; registro aqui só para não parecer lacuna esquecida.

---

### 5. Arquivos lidos (lista para rastreabilidade)

`audit/runs/ERP-LEGACY-001-AUD-001/02-plan/AUDIT_PLAN.md`; `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-20_QUALIDADE_E_TESTES.md`; `server/tests/unit/docs-path-reference-guard.test.ts`; `server/tests/helpers/docsGuardConventions.ts`; `docs/producao/06-BOM.md`; `docs/governance/CRONOGRAMA_FRONTEND_2026-07-31.md`; `docs/governance/TODO.md` (parcial, ~7400 linhas via grep + trechos lidos); `docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md`; `docs/business/briefs/BRIEF_SST_2026-08-06.md`; `docs/business/BLOCO_6_RH_AUDITORIA.md`; `docs/governance/go-live/GO_LIVE_G6_CHECKLIST.md`; `docs/governance/HANDOFF_CODEX.md` (banner apenas); `docs/governance/go-live/DIARIO_BORDO_GO_LIVE_G6.md` (banner apenas); `docs/rh/00-README.md`; `docs/arquitetura/DIAGRAMA_CLASSES_CAMADAS.md`; `docs/tributario/02-ICMS_ESTADOS.md`; `docs/tributario/00-README.md`; `docs/arquitetura/API.md` (varredura por grep); `docs/projeto/04-USE_CASES.md` (trechos); `CLAUDE.md`. Confirmações de existência via `Glob` para ~50 caminhos candidatos (READMEs de módulo, `server/README.md`, `docs/almoxarifado/`, `docs/rh/06-TREINAMENTOS.md`, `docs/GO_LIVE_G6_*`, `docs/business/pipeline-modulos-novos.md`, entre outros).

### 6. Escalonamentos

- `RES-T23-01` → **vericore-audit-verification-runner**: executar `DYN-T20-06` (`npx jest tests/unit/docs-path-reference-guard.test.ts --runInBand`) para localizar definitivamente a citação quebrada — é o único jeito eficiente de fechar isto contra ~4.374 citações.
- `RES-T23-02`/`RES-T23-03` → **vericore-software-audit-director**: decidir se a leitura citação-a-citação de `docs/governance/TODO.md` completo e dos 130 documentos restantes justifica esforço além dos 4S orçados.
- `T23-F02` (fluxograma fiscal invertido/omisso) → também relevante para **T-08 (Tributário)**, que já tinha registrado o mesmo documento; não duplico o finding, apenas confirmo e adiciono a âncora exata.
- `T23-F01` (ADR ausente para camada legada) → **vericore-software-audit-director**/dono do produto: decisão de registrar formalmente (ou não) a convivência `services/`×`modules/` como arquitetura intencional.
