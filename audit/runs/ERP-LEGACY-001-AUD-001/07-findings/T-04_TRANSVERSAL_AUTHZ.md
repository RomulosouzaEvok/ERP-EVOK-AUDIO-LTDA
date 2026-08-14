# T-04 — TRANSVERSAL AUTHZ — RELATÓRIO DE TRILHA

**AUDIT_COMMIT lido:** `c1311a6f76b512fef893f7e60d934179cae3409f` (verificado
como HEAD de `main`, árvore idêntica). Toda evidência é leitura própria VeriCore
nesse commit; a `TRIAGE.md` da SanaCore **não é citada como prova** em nenhum
ponto.

> **Nota de persistência.** Conteúdo produzido pelo `vericore-appsec-auditor`
> (trilha T-04) e persistido **sem alteração** pelo orquestrador, porque a
> sessão do agente expôs apenas `Read`/`Grep`/`Glob` — sem `Write` e sem `Bash`.
> Nenhum arquivo do objeto auditado foi tocado (Regra 2). O juízo de auditoria é
> integralmente da trilha VeriCore.

---

## 1. Veredito sobre `CAND-AUTHZ-01`

### 1.1 Adjudicação individual das 3 âncoras

| Âncora | Veredito | Evidência própria (arquivo:linha, AUDIT_COMMIT) |
|---|---|---|
| **A1** `purchaseController.ts:54` | **CONFIRMADA** (literal) | `return user?.permissions?.diretor ? ['diretor'] : [];` |
| **A2** `purchases.ts:48` | **CONFIRMADA** (literal) | `router.post('/:id/approve', authenticate, authorizeModule('diretor'), purchaseController.approveAuthority);` — `requiredLevel` omitido ⇒ default `'operate'` (`middlewares/auth.ts:215`) |
| **A3** `importProcesses.ts:34` | **CONFIRMADA** (literal) | idem, `authorizeModule('diretor')` |

**Âncora A4 — não declarada pela fonte, descoberta por leitura própria:**
`comex/presentation/controllers/importProcessController.ts:56` —
`return user?.permissions?.diretor ? ['diretor'] : [];`. O insumo externo listou
3 âncoras / 4 linhas; **são 4 âncoras**. Registro de divergência, não de ajuste.

### 1.2 Teste das duas hipóteses concorrentes

**Hipótese (b) — defeito no default do middleware: REFUTADA.**
`authorizeModule(moduleKey, requiredLevel = 'operate')` (`auth.ts:213-216`) e
`satisfies()` (`authorizeAnyModule.ts:39-43`) implementam **corretamente** a
semântica declarada em `auth.ts:186-200`: `'approve'` inclui `'operate'`;
`'operate'` isolado nunca satisfaz `'approve'`. Não há falha lógica.

**Recontagem dos call sites de `authorizeAnyModule` (a contagem da fonte externa
está errada):** são **7 call sites reais** — `juridico.ts:71`, `juridico.ts:79`,
`comex/importProcesses.ts:33`, `facilities.ts:86`, `facilities.ts:87`,
`purchases.ts:49`, `marketing.ts:56`. Destes: **5 GET + 2 POST** (não "6 GET"), e
**6 dependem do default** (não 5) — apenas `marketing.ts:56` declara
`requiredLevel`. Dos 6 dependentes, 5 são leituras legítimas. Alterar o default
quebraria essas 5 leituras; a correção correta é no call site.

**Hipótese (a) — defeito no call site: CONFIRMADA.** O contrato do próprio
sistema (`auth.ts:181-184`) define `level='approve'` como *gestor*, e o projeto
**sabe escrever a checagem estrita** — 5 pontos com comparação estrita correta:
`purchaseRequisitionController.ts:159`, `juridico/contractController.ts:39`,
`juridico/legalCaseController.ts:39`, `facilities/tripController.ts:76`,
`ti/accessRequestController.ts:85,100`. Nos 4 pontos de alçada por **papel**
(`diretor`/`financeiro`) usa-se **truthiness** e nível default.

### 1.3 Veredito consolidado

> **`CAND-AUTHZ-01` — CONFIRMADO quanto ao fato, RECLASSIFICADO quanto à causa.**
> O padrão existe, verbatim, nas 3 âncoras declaradas + 1 não declarada, e
> alcança **módulos de PRODUÇÃO** (`purchases`, `comex`). O defeito é de **call
> site** (nível não declarado + truthiness em módulo-papel), **não** do
> middleware. Efeito concreto: um perfil com `diretor: 'operate'` registra
> **aprovação de alçada de diretoria** em pedido de compra real
> (`ApprovePurchaseUseCase.ts:126-131`) e em processo de importação real — o grau
> `operate` é **inerte** para módulos-papel, de modo que a escolha de menor
> privilégio do administrador não é honrada nem detectável.

**Severidade proposta: MEDIUM · Confiança: HIGH.** Justificativa explícita de por
que **NÃO** é HIGH/CRITICAL — conclusão própria, contrária ao que a analogia com
`FIND-ERP-005` sugeriria:

1. **Não há escalada a partir de conta sem privilégio.** A pré-condição é ato
   administrativo: conceder o módulo `diretor`, rotulado no SSOT como
   *"Diretoria (aprovador de alçada, RF-JUR-003)"* (`accessModules.ts:342`).
2. **Não existe misconfiguração de baseline.** `config/seeds.ts` **não cria
   nenhum `AccessProfile`** — nenhum perfil sai de fábrica com `diretor`.
3. **CRUD de perfis é exclusivo de `admin`** (`accessProfiles.ts:21-26`), com
   `level` obrigatório e validado (`validatePermissions.ts:28`).
4. **Controles compensatórios reais e verificados** em `ApprovePurchaseUseCase.ts`:
   segregação D-K (`assertApproverIsNotRequester`, 86-92), gate de status
   `pending` (78-83), papel por origem/valor (`purchases/domain/constants.ts:162-176`),
   unicidade de papel (121-124), trilha de auditoria (`purchaseController.ts:257-264`).
5. **Resíduo real que sustenta o MEDIUM:** ASVS **V4.1.3** e **V4.1.5** — a
   dimensão `level` é silenciosamente inoperante para módulos-papel.

T-09/T-10 podem elevar para HIGH **se** apresentarem evidência de impacto de
controle interno. **Refutação parcial registrada com a mesma formalidade:** a
leitura da fonte externa sobre a **semântica** ("o middleware está errado")
**não se sustenta**; e a contagem de call sites da fonte está **errada**.

---

## 2. Censo dos atos aprovatórios (100%, recontado)

**Universo verificado:** 53 route files, **681 declarações de rota** — confirma
o `API_INVENTORY.md`.

**Correção material ao inventário (novo achado):** o router
`financial/presentation/routes/cnab.ts` (**8 endpoints**) **não é montado em
lugar nenhum** — não há `require` em `app.ts` nem em `finance.ts` (que monta
apenas `reconciliation`, `finance.ts:59`). **Endpoints alcançáveis = 673, não
681.** W2/W3 auditariam 8 rotas inexistentes.

**Nível efetivo `approve` na rota: 63 endpoints** — 61 com
`authorizeModule(..., 'approve')` (66 ocorrências brutas menos 5 comentários) +
2 com `authorizeSelfOrModule('ti','approve', ...)`.

> **Divergência com o alvo declarado "~55": a contagem correta é 63 endpoints em
> nível `approve`, e a superfície total de ato aprovatório examinada é ~83.**

### Classe C — ato aprovatório em `operate` sem controle de nível (lacuna)

| # | Endpoint | Módulo/nível | Ambiente | Origem do papel |
|---|---|---|---|---|
| C1 | `purchases.ts:48` `POST /:id/approve` | `diretor` / **operate** | **PRODUÇÃO** | truthiness (`purchaseController.ts:54`) |
| C2 | `importProcesses.ts:34` `POST /:id/approve` | `diretor` / **operate** | **PRODUÇÃO** | truthiness (`importProcessController.ts:56`) |
| C3 | `juridico.ts:71` `contracts/:id/approve` | `diretor` OU `financeiro` / **operate** | NÃO-PRODUÇÃO | já é `FIND-ERP-005` Falha 2, reconfirmado. Agravante próprio: `financeiro` é módulo de **domínio** amplamente concedido — concedê-lo cria aprovador de alçada por efeito colateral |
| C4-C6 | `masterProductionPlans.ts:37,38,39` | `mrp` / operate explícito | PRODUÇÃO | ausência assumida, `FIND-ERP-009` §6 — não promovido |
| C7 | `sst.ts:127` work-permits/close | `sst` / operate | — | encerramento de PT (NR-33/NR-35) |
| C8 | `facilities.ts:59` drivers/authorize | operate | — | ato literalmente de autorização em nível operador |
| C9-C12 | `rh.ts:79` · `marketing.ts:68` · `finance.ts:36` payable/pay · `finance.ts:30` receivable/pay | operate | — | desembolso/baixa sem nível gestor |
| C13-C16 | `juridico.ts:126` · `juridico.ts:157` · `productionOrders.ts:32` · `sales.ts:46` | operate | — | materialidade menor |

### Classe B — rota em `operate` com controle compensatório efetivo (5) — não são findings

`purchaseRequisitions.ts:27` (comparação estrita em `purchaseRequisitionController.ts:157-162`);
`rh.ts:87` (nível **dinâmico** `decision === 'rescindir' ? 'approve' : 'operate'`,
não explorável — `z.enum` fecha); `purchases.ts:46`; `juridico.ts:95`;
`importProcesses.ts:36`.

---

## 3. Findings propostos (T-04)

| ID | Título | Sev. | Conf. | ASVS | Âncora |
|---|---|---|---|---|---|
| **AUD-SEC-T04-01** | Ato aprovatório de alçada de diretoria autorizado por **presença** do módulo-papel `diretor`, em nível `operate`, em módulos de PRODUÇÃO | **MEDIUM** | HIGH | V4.1.3, V4.1.5 | `purchases.ts:48`; `importProcesses.ts:34`; `purchaseController.ts:54`; `importProcessController.ts:56` |
| **AUD-SEC-T04-02** | `/uploads` servido com **autenticação sem autorização** — qualquer usuário autenticado (inclusive sem nenhum módulo) lê ASO, TRCT, contratos e documentos LGPD-sensíveis se obtiver/adivinhar o nome do arquivo | **MEDIUM** | HIGH | V4.1.1, V8.3, V12.4 | `app.ts:225` (`app.use('/uploads', authenticate, express.static('uploads'))`); nome previsível em `uploadService.ts:113-124` (`Date.now()` + `Math.random().toString(36)` — PRNG não criptográfico) |
| **AUD-SEC-T04-03** | Router `financial/routes/cnab.ts` (8 endpoints) **não montado** — inventário de 681 inclui rotas inalcançáveis | **LOW** (alto impacto de método p/ W2/W3) | HIGH | — | `cnab.ts` × ausência de `require` em `app.ts` e `finance.ts:59` |
| **AUD-SEC-T04-04** | Nível de autorização derivado de campo mutável do corpo antes da validação de esquema | **LOW** | HIGH | V4.1.3 | `rh.ts:67-69` |
| **AUD-SEC-T04-05** | 4º mecanismo de authZ não declarado: middleware ad-hoc `requireSstOrRh` em arquivo de rotas | **LOW** | HIGH | V1.4.1 | `sst.ts:145-153` |
| **AUD-SEC-T04-06** | `x-request-id` do cliente ecoado e logado sem validação | **LOW** | MEDIUM | V7.1.1 | `requestContext.ts:21-37` |
| **AUD-SEC-T04-07** | Comparação de segredo de webhook sem tempo constante | **LOW** | HIGH | V6.2.2 | `webhookController.ts:57` — contraste com o caminho correto em `ProcessN8nWebhookUseCase.ts:60-63` (HMAC + `timingSafeEqual`) |

Nenhum finding CRITICAL/HIGH por T-04 ⇒ nada segue ao `vericore-finding-validator`
por esta trilha (Regra 22 por não aplicabilidade).

**Conformidades registradas:** `errorHandler.ts` não vaza stack (39-140);
`authenticate` valida assinatura + `issuer`/`audience` + `passwordVersion`
contra o banco a cada request (`auth.ts:69-103`); permissões recarregadas do
banco, nunca do JWT (`auth.ts:77-112`); CRUD de perfis e usuários exclusivo de
`admin`; `authorizeSelfOrModule` resolve posse por callback, nunca por parâmetro
de rota; negativas 403 sempre auditadas.

---

## 4. Veredito da Regra 24 na camada de middleware e montagem

> **REGRA 24 — NÃO VIOLADA NESTA CAMADA. Veredito próprio, por varredura
> exaustiva; a conclusão SanaCore não foi adotada nem herdada.**

Toda decisão lê `req.user`, populado exclusivamente por `authenticate` a partir
de `User.findByPk` + `AccessProfilePermission` no banco (`auth.ts:77-128`). O
JWT carrega apenas `{id, passwordVersion}` (`auth.ts:17-22`). Varredura de
`req.body.(role|userRole|isAdmin|perfil|permissions)`, `req.query` e headers
`x-*`: **duas ocorrências**, ambas legítimas. `authorize(...roles)` compara
contra `req.user.role` vindo da coluna do banco (`auth.ts:158`).

**Ressalva formal:** `rh.ts:67-69` deriva o **nível exigido** (não o papel) de
`req.body.decision` — não enquadra na Regra 24, não é explorável hoje, fica como
AUD-SEC-T04-04.

---

## 5. Ordem de montagem em `app.ts` — 65 `app.use` auditados (100%)

- **Não existe gate global de `authenticate`.** A autenticação é de cada router —
  desenho frágil, mas **verificado como completo**: reconciliação exata de 681 =
  390 (10 routers com `router.use(authenticate)`) + 286 inline + **5 públicos
  intencionais** (`auth.ts:13,19,20`; `webhooks.ts:12,13`, protegidos por HMAC).
  > **Resultado: zero endpoints não autenticados por descuido em 681.**
- **Nos 10 routers com gate, nenhuma rota é declarada antes do
  `router.use(authenticate)`** — a Falha 2 de `FIND-ERP-005` **não se repete
  quanto a autenticação**.
- **Único router com gate de autorização de nível de router:** `juridico.ts:83`,
  com **3 rotas montadas deliberadamente antes dele** — `:64` (compensada por
  checagem OR inline), `:71` (**C3**, o vetor conhecido) e `:79`. O padrão "rota
  antes do gate" existe e é intencional, mas é exatamente onde o nível de
  aprovação se perdeu.
- **Sombreamento de prefixo:** verificado nos 3 pares de risco — nenhuma rota de
  módulo mais privilegiado é capturada por prefixo de módulo menos privilegiado.
- `apiLimiter` em `/api` montado depois do body parser e antes dos routers;
  `express.json` guarda `rawBody` para HMAC.

---

## 6. Mapa authZ dos 681 endpoints — formato reutilizável por W2/W3

Formato canônico: `MÉTODO caminho | autenticação | mecanismo | módulo | nível
declarado | nível efetivo | exceção`.

**Mecanismos existentes — são 4, não 3** (o `CURRENT_ARCHITECTURE.md` declara 3;
**divergência registrada**): (1) `authorizeModule(module, level='operate')`;
(2) `authorizeAnyModule([...])` OR, 7 call sites; (3) `authorizeSelfOrModule`, 7
call sites em `ti`; (4) `requireSstOrRh` ad-hoc, `sst.ts:145` (3 call sites).
Mais `authorize(...roles)` (RBAC global por `users.role`) como 3ª via
coexistente.

| Faixa | Qtd | Como identificar |
|---|---|---|
| Público (sem `authenticate`) | **5** | `auth.ts:13,19,20`; `webhooks.ts:12,13` |
| Autenticado, **sem** autorização de módulo | **≈16** | `auth.ts:14,16,17,18`; `employees.ts:19,20`; `categories.ts:12,13`; `departments.ts:12,13`; `directorate.ts:35`; `facilities.ts:89`; `ti.ts:34,39,40`; `juridico.ts:64` |
| Autenticado + módulo nível `operate` | **≈597** | restante |
| Autenticado + módulo nível **`approve`** | **63** | §2 Classe A |
| Autenticado + `authorize('admin')` | **23** | `accessProfiles` 6, `users` 7, `employees` 3, `categories` 3, `departments` 3, `auth` 1 |
| Autorização por **posse** | **7** | `ti.ts:42,49,50,52,53,82,83` |
| Composição OR | **7** | §1.2 |
| Exceção `sst`\|`rh` ad-hoc | **3** | `sst.ts:62,98,115` |
| **Inalcançáveis (não montados)** | **8** | `financial/routes/cnab.ts` |

**Consumo por W2/W3:** o nível efetivo é o declarado na linha `router.*`; onde
não houver `requiredLevel`, é `'operate'`; onde o router tiver gate (só
`juridico`), aplica-se salvo às 3 rotas de `juridico.ts:64,71,79`. Filtro de
campo sensível existe **fora** da borda HTTP em
`employees/domain/services/employeeSensitiveFields.ts:68-69` e
`rh/domain/services/rhSensitiveFields.ts:63-64` — **a afirmação "authZ 100% na
borda HTTP" do `CURRENT_ARCHITECTURE.md` é imprecisa**: há decisão de
autorização em serviços de domínio e em 8 controllers.

---

## 7. Pedidos DYN (`vericore-audit-verification-runner`, `erp_evok_audio_test`)

| ID | Pedido | Critério de aceite |
|---|---|---|
| **DYN-04.1** | Perfil `diretor:'operate'` (sem `compras`) → `POST /api/purchases/:id/approve` em pedido `pending` de **outro** usuário | 201 ⇒ AUD-SEC-T04-01 confirmado; ou 403 |
| **DYN-04.2** | Mesmo perfil → `POST /api/comex/import-processes/:id/approve` | idem |
| **DYN-04.3** | Mesmo perfil, aprovador = solicitante | 4xx `D-K-ALCADA` (confirma compensatório) |
| **DYN-04.4** | `financeiro:'operate'` (sem `juridico`) → `POST /api/jur/contracts/:id/approve` | mede o alcance de C3 |
| **DYN-04.5** | `requisicoes:'operate'` → `PATCH /api/purchase-requisitions/:id/status {approved}` | 403 esperado |
| **DYN-04.6** | `decision` como array/objeto, perfil `rh:'operate'` | 400 do Zod, nunca 200 |
| **DYN-04.7** | Token de usuário **sem nenhum módulo** → `GET /uploads/<doc de RH>` | 200 ⇒ confirma AUD-SEC-T04-02 |
| **DYN-04.8** | `role`/`isAdmin`/`permissions` em body, query e header em 3 rotas de aprovação | nenhum efeito (confirma Regra 24) |
| **DYN-04.9** | `GET /api/finance/banking-config`, `POST /api/finance/remittances` | 404 ⇒ confirma AUD-SEC-T04-03 |
| **DYN-04.10** | `ti:'operate'` não gestor → `POST /api/ti/access-requests/:id/approve` | 403 (confirma `approverEligibilityService`) |

**Nenhuma sondagem toca `erp_evok_audio`.** Nesta trilha nenhuma conexão de
banco foi aberta; toda evidência é estática.

---

## 8. Lacunas de verificação dinâmica declaradas

1. Ordem de resolução real do Express não observada em runtime — inferida por
   leitura; DYN pode confirmar.
2. Não foi possível observar quais perfis **existem em operação**; o MEDIUM de
   AUD-SEC-T04-01 assume que `diretor:'operate'` é configurável mas não é
   baseline — **se o dono informar que existe perfil real com `diretor:'operate'`,
   a severidade deve ser reavaliada para HIGH**.
3. Previsibilidade real dos nomes em `/uploads` não foi medida empiricamente.
4. Entregáveis não persistidos pelo agente por ausência de ferramenta de escrita.

---

## 9. Esforço medido × estimado (obrigação G11 opção c)

| | Estimado | Real | Desvio |
|---|---|---|---|
| T-04 | **6 sessões** (5 + 1 da EMENDA-01) | **~1 sessão** (~35 chamadas, passada contínua) | **-83%** |

**Leitura honesta do desvio (a lição do SIM-002 corta nos dois sentidos):** a
estimativa foi ~6× conservadora porque a superfície é **enumerável e regular** —
53 arquivos de rota com uma linha por endpoint tornam D1/D3 verificáveis por
varredura sistemática. Ressalvas que impedem generalizar: (a) a **profundidade
D4** foi verificada **por amostra dirigida** nos pontos de alçada, não
exaustivamente — trilhas que precisem de D4 exaustivo não terão este ganho; (b)
a persistência/formalização e o cruzamento com `FIND-ERP-009` custam esforço
adicional real; (c) o censo (o +1 S da EMENDA-01) foi o item **mais barato**, não
o mais caro — a hipótese de custo da emenda estava invertida. **Sugestão ao
director:** realocar 3-4 das sessões liberadas para D4 exaustivo nos ~15
endpoints da Classe C.
