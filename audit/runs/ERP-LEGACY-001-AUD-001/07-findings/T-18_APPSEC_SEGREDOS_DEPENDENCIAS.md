# T-18 — APPSEC, SEGREDOS E DEPENDÊNCIAS · RELATÓRIO DE TRILHA

> **Nota de persistência.** Produzido pelo `vericore-appsec-auditor` (T-18 appsec, segredos e dependencias) e persistido
> **sem alteração de conteúdo** pelo orquestrador — o agente é read-only por
> desenho e não pode escrever em `audit/`. O juízo de auditoria é
> integralmente da trilha. Única transformação aplicada: promoção do
> cabeçalho a H1 e desescape de entidades HTML.

---

```
AUDIT_ID.......: ERP-LEGACY-001-AUD-001
TRILHA.........: T-18 — Segurança de Aplicação, Segredos e Dependências (onda W3)
TITULAR........: vericore-appsec-auditor
AUDIT_COMMIT...: c1311a6f76b512fef893f7e60d934179cae3409f (declarado; NÃO verificável — ver RES-T18-01)
REGIME.........: APR-2026-016 read-only; RESSALVA E6 respeitada (nenhum *.local.txt aberto)
ESFORÇO........: 4 S orçados / ~4 S consumidos
STATUS.........: FIELDWORK CONCLUÍDO COM LACUNAS DECLARADAS — nenhum veredito de aprovação emitido
```

### COBERTURA EFETIVA (honesta)

| Categoria ASVS (escopo §4.4) | Cobertura | Base |
|---|---|---|
| V5 Injeção (SQL) | **Alta** | varredura completa de `sequelize.query`/`literal` em `server/src` |
| V5 XSS (cliente) | **Alta** | varredura completa de `dangerouslySetInnerHTML`/`innerHTML`/`eval` em `client/src` |
| V5 Mass assignment / IDOR por body | **Parcial (~8%)** | 1 cadeia de 13 rastreada ponta a ponta — **RES-T18-04** |
| V12 Upload de arquivos | **Alta** | ambos os middlewares multer + `uploadService` + tabela de magic bytes + 5 chamadores |
| V13 SSRF | **Alta** | todos os `fetch` do servidor inspecionados |
| V4 CSRF | **Alta** | modelo de sessão (Bearer/localStorage, CORS sem `credentials`) |
| V14 Config / headers / CORS / rate limit | **Alta** | `app.ts` integral, `runtimeEnv.ts` integral, ambos os compose |
| V6 Criptografia / hashing | **Média** | hashing de senha e tokens de reset; **não** cobri criptografia de dados em repouso |
| V2 Gestão de segredos (código + config versionada) | **Média** | superfície estática coberta; **histórico git não verificável** — RES-T18-02 |
| V14.2 Dependências | **Média-baixa** | manifestos e locks lidos; **nenhuma consulta a CVE/advisory** — RES-T18-03 |

**Restrição estrutural desta trilha:** a ferramenta Bash está desabilitada nesta sessão. Isso não é escolha minha, é a condição do ambiente, e ela recorta a trilha em três pontos duros (RES-T18-01/02/03).

---

## FINDINGS

### T18-F01 — Mass assignment sem whitelist com sobrescrita do ID de caminho: contorna a alçada de aprovação de contratos e falsifica o log de auditoria
**Severidade: HIGH · Confiança: ALTA · ASVS V5.1.2 / V4.2.1**

Cadeia completa, entrada → sink, sem nenhum ponto de sanitização:

1. `server/src/modules/juridico/presentation/routes/juridico.ts:89` — `router.put('/contracts/:id', contractController.update)`: **nenhum middleware de validação de schema**; o gate é só `authenticate` (`:57`) + `authorizeModule('juridico','operate')`.
2. `server/src/modules/juridico/presentation/controllers/contractController.ts:87`
   ```ts
   .execute({ id: Number(req.params.id), ...req.body })
   ```
   O spread do corpo vem **depois** do `id`. Um `id` no body sobrescreve o da rota.
3. `server/src/modules/juridico/application/use-cases/contract/UpdateContractUseCase.ts:30` — `const { id, ...rest } = input;` consome exatamente o `id` já sobrescrito; `:44` — `return this.repository.update(id, rest);` sem whitelist de campos.
4. `server/src/modules/juridico/infrastructure/sequelize/SequelizeContractRepository.ts:63-67` — `contract.update(data)` com `data` arbitrário.
5. `server/src/models/JurContract.ts:84-91` — `status`, `approved_by`, `approved_at`, `signed_at` são atributos do modelo, portanto graváveis.

**Duas consequências independentes:**

- **Bypass de alçada.** `POST /contracts/:id/approve` é deliberadamente protegido por `authorizeAnyModule([diretor, financeiro])` (`juridico.ts:71`) porque é a alçada de aprovação por valor (RF-JUR-003). O `PUT` não tem essa proteção e grava `status`/`approved_by` diretamente. A guarda de `LOCKED_STATUSES` (`UpdateContractUseCase.ts:34`) só age sobre o estado **atual** — um contrato em `draft` transita para estado aprovado por escrita direta, sem passar pelo aprovador. Um usuário com `juridico:operate` aprova o próprio contrato.
- **Log de auditoria mente.** `contractController.ts:88` registra `entityId: Number(req.params.id)` — o id **da rota**, não o id efetivamente mutado. A trilha de auditoria aponta para o contrato errado exatamente no caso em que houve abuso.

**Impacto:** quebra do controle de alçada em módulo jurídico (contratos), com registro de auditoria não fidedigno.
**Padrão, não caso isolado:** o mesmo `{ id/…Id: req.params, ...req.body }` aparece em `contractController.ts:87,116,192,211`; `lgpdController.ts:71,117,187,199`; `legalCaseController.ts:72,111,131,161,171`; `ipAssetController.ts:60`; `corporateActController.ts:49`; `deadlineController.ts:55`; `ticketController.ts:100,140,200`; `accessRequestController.ts:122`; `productionOrderController.ts:210,255`. **Somente a cadeia de contratos foi rastreada até o sink** — ver RES-T18-04.
**Não é falso positivo por controle compensatório:** procurei e não há — nenhum middleware de validação no router (`juridico.ts:57-98`), nenhuma whitelist no use case, nenhuma no repositório, e o modelo declara os campos sensíveis.

---

### T18-F02 — `NODE_ENV` com default `development` transforma todo o bloco de guardas de produção em código morto (confirma e amplia `AUD-AUTHN-01`)
**Severidade: HIGH · Confiança: ALTA · ASVS V14.1.3 / V2.10**

Confirmo o achado T-02 por leitura própria e acrescento a causa raiz, que é de configuração e portanto minha:

- `server/src/config/runtimeEnv.ts:34` — `NODE_ENV: z.enum([...]).default('development')`.
- `server/src/config/runtimeEnv.ts:72-75` — `superRefine` faz `if (env.NODE_ENV !== 'production') return;`. **Todas** as guardas subsequentes (JWT placeholder `:103`, CORS real `:111`, DB_PASSWORD `:119`, ADMIN_SEED_PASSWORD `:127`, DB_SSL `:135`, DB_FORCE_SYNC `:143`, DB_AUTO_ALTER `:151`, DB_ALLOW_UNSAFE_ALTER `:159`, PRODUCTION_TRACKING_REQUIRED `:94`) ficam inalcançáveis.
- `docker-compose.yml:43` — `NODE_ENV: ${NODE_ENV:-development}`. O deploy que esquecer de exportar `NODE_ENV` sobe com **todas** as guardas desligadas, silenciosamente e sem log.
- `docker-compose.yml:54` — `JWT_SECRET` com valor default **versionado no repositório**. Não cito o valor; cito o fato decisivo: ele tem 44 caracteres, portanto **passa** na única checagem que roda fora de produção (`runtimeEnv.ts:250`, `length < 32`), e só é rejeitado pelo `ENV_PLACEHOLDER_PATTERN` (`:12`) dentro do ramo que nunca executa. Qualquer pessoa com acesso de leitura ao repositório forja um JWT válido para qualquer `id` de usuário nesse ambiente.
- `docker-compose.yml:57` — `ADMIN_SEED_PASSWORD` com o mesmo padrão de default versionado, e o seed roda com ele.

**Controle compensatório encontrado (que reduz a severidade, mas não a elimina):** `docker-compose.prod.yml:73` fixa `NODE_ENV: production` como literal e `:100,101,105` exigem `${VAR:?...}` sem default. É um bom arquivo. Mas o próprio cabeçalho (`docker-compose.prod.yml:1-8`) declara que ele **nunca foi exercitado**, e nada no repositório impede subir produção com `docker-compose.yml`. A guarda existe; a garantia de que ela é a usada, não.
**Impacto:** falsificação de identidade de qualquer usuário em qualquer ambiente que não exporte `NODE_ENV=production` explicitamente, incluindo homologação/UAT com dados reais.
**Regra 24:** não se aplica aqui — o `role` é resolvido server-side a partir do banco (`server/src/middlewares/auth.ts:77-78,118`), nunca do payload do token nem do body. Registro isso como **evidência de conformidade** com a Regra 24 (ver seção Conformidade).

---

### T18-F03 — Nove segredos e chaves de integração escapam da superfície de configuração validada
**Severidade: HIGH · Confiança: ALTA · ASVS V2.10 / V14.1.3**

`runtimeEnv.ts` é apresentado como a fonte única e validada de configuração. Não é. Lidos crus de `process.env`, fora do schema, sem fail-fast, sem guarda de placeholder e sem declaração em `.env.example`:

| Variável | Leitura | Declarada em `.env.example`? | Passada em `docker-compose.prod.yml`? |
|---|---|---|---|
| `FOCUS_NFE_TOKEN` | `FocusNfeProvider.ts:44` | **não** | **não** |
| `FOCUS_NFE_ENVIRONMENT` | `FocusNfeProvider.ts:49` | **não** | **não** |
| `ENOTAS_API_KEY` | `ENotasProvider.ts:35` | **não** | **não** |
| `ENOTAS_EMPRESA_ID` | `ENotasProvider.ts:36` | **não** | **não** |
| `FOCUS_NFE_WEBHOOK_SECRET` | `webhookController.ts:52` | **não** | **não** |
| `AUDIT_ALERT_WEBHOOK_URL` | `auditLogService.ts:76` (destino de `fetch`, `:79`) | **não** | **não** |
| `DEBUG_ERRORS` | `errorHandler.ts:41` | **não** | **não** |
| `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | `emailService.ts:63` | sim (`.env.example:65-69`) | **não** |
| `N8N_WEBHOOK_SECRET` | `ProcessN8nWebhookUseCase.ts:53` | sim (`:72`) | sim, mas com `:-` vazio (`prod.yml:106`) |

**Duas leituras do mesmo fato:**
1. **Segurança:** token da Focus NFe e API key da eNotas são credenciais de emissão fiscal em nome da empresa. Estão fora de qualquer validação, de qualquer inventário e de qualquer `.env.example` — quem provisiona o servidor não tem como saber que precisa defini-las nem que elas são sensíveis.
2. **Disponibilidade em produção:** como `docker-compose.prod.yml` não as repassa ao contêiner, subir por esse arquivo entrega emissão fiscal e e-mail **quebrados em silêncio**, e `/api/webhooks/focus-nfe` respondendo 503 permanente (`webhookController.ts:53-56`). O `N8N_WEBHOOK_SECRET` com default vazio (`prod.yml:106`) faz o webhook do n8n cair no mesmo 503 (`ProcessN8nWebhookUseCase.ts:54-58`) — falha fechada, o que é correto, mas indistinguível de configuração ausente.

---

### T18-F04 — Senha default de role de banco embutida em migration versionada
**Severidade: MEDIUM · Confiança: ALTA · ASVS V2.10.4**

`server/migrations/20260806-000080-create-app-role-least-privilege.cjs:36` declara a constante `DEV_DEFAULT_PASSWORD`, consumida em `:48` como fallback de `APP_DB_ROLE_PASSWORD` no `CREATE ROLE` da role `evok_app`. **Não reproduzo o valor.** O comentário do próprio arquivo (`:26-28`) reconhece o fallback e pede troca antes de produção — ou seja, o controle é uma instrução para um humano, não um mecanismo.

O agravante é a composição com `docker-compose.prod.yml:92`: a role `evok_app` é o usuário de runtime **padrão** em produção. Se a migration rodar sem `APP_DB_ROLE_PASSWORD` no ambiente, a role de aplicação nasce com senha conhecida por qualquer leitor do repositório, e o `prod.yml` exige a variável apenas para o contêiner da API — não para o passo de migration, que roda fora do compose (`prod.yml:27-31`). Os dois passos podem divergir sem que nada acuse.

---

### T18-F05 — Chave de rate limiting derivada de JWT **não verificado**: envenenamento de cota e DoS dirigido a um usuário
**Severidade: MEDIUM · Confiança: ALTA · ASVS V11.1.1**

`server/app.ts:74-90` — `apiRequestKey` faz `jwt.decode(...)` (`:79`), que **não valida assinatura**, e usa `decoded.id` como chave (`:82`). Essa chave alimenta o limiter global da API (`:114`, 300/15min) e o limiter de refresh (`:102`, 30/15min).

O comentário em `app.ts:70-73` antecipa a objeção e a responde parcialmente: "chave errada na pior hipótese isola mal um request não autenticado, nunca autoriza nada". A parte sobre autorização está correta. A conclusão sobre o pior caso, não: um atacante **não autenticado** monta um token com `alg:none` e `id` igual ao de uma vítima (os ids são inteiros sequenciais), dispara 300 requisições e a vítima recebe 429 por 15 minutos em toda a API — sem nunca ter uma credencial. O mesmo vale contra `/api/auth/refresh` com cota de 30, derrubando a renovação deslizante dos painéis de TV.
**Impacto:** negação de serviço dirigida, por usuário, sem autenticação.
**Controle compensatório que limita o alcance:** o limiter de login (`app.ts:48-52,57`) usa IP+e-mail e não depende de token, então o brute-force de credencial permanece contido.

---

### T18-F06 — Webhook Focus NFe: segredo compartilhado comparado sem tempo constante, sem HMAC e sem proteção de replay (confirma T-08)
**Severidade: MEDIUM · Confiança: ALTA · ASVS V13.4 / V6.2.3**

Confirmo por leitura própria. `server/src/modules/webhooks/presentation/controllers/webhookController.ts:57` — `if (req.header('X-Webhook-Secret') !== secret)`. Comparação `!==` de strings, com curto-circuito no primeiro byte divergente, sobre um segredo estático repetido em toda requisição.

A assimetria apontada por T-08 é real e é o ponto mais forte do achado: no **mesmo módulo**, `ProcessN8nWebhookUseCase.ts:60-63` faz HMAC-SHA256 sobre o corpo bruto e compara com `crypto.timingSafeEqual` **precedido de checagem de comprimento** (`:63`, correto — `timingSafeEqual` lança com buffers de tamanhos diferentes), e `:68-79` garante idempotência por `source`+`event_id`. O padrão certo existe, está escrito, está a 40 linhas de distância, e não foi aplicado ao segundo webhook.

**Controle compensatório real, que rebaixa a severidade:** `webhookController.ts:45-49,63-65` documenta e implementa que o payload recebido é usado **apenas** para extrair a referência — o status é sempre reconsultado na API da Focus. Um replay ou uma injeção de payload não altera estado fiscal diretamente. O que resta é: (a) vazamento do segredo por canal lateral de tempo, viabilizando forjar chamadas; (b) ausência de replay protection permitindo amplificação de reconsultas à API externa (custo/rate limit de terceiro).

---

### T18-F07 — O scanner de segredos do próprio projeto tem quatro pontos cegos que anulam boa parte do seu propósito
**Severidade: MEDIUM · Confiança: ALTA · ASVS V14.2 / V2.10**

`server/scripts/scan-tracked-secrets.cjs` (npm script `scan:secrets`, `server/package.json:27`):

1. **`:7` + `:24` — allowlist por substring de caminho inteiro.** `allowedFragments` inclui `'dist'` e `'tmp'`, e o teste é `relativePath.includes(fragment)`. Num ERP em português, `'dist'` é substring de `distribuicao`, `distribuidor`, `distrato`, `distribuidora`. Qualquer arquivo cujo caminho contenha essas palavras é **pulado silenciosamente** pelo scanner. O mesmo vale para `'.git'`, substring de `.github/`, o que exclui todos os workflows de CI — justamente onde segredos costumam vazar.
2. **`:16` — `git ls-files` cobre apenas o HEAD.** Nenhuma varredura de histórico. Um segredo commitado e depois removido não é detectado nunca.
3. **`:8-13` — quatro regexes apenas** (private key PEM, AKIA, ghp_, xox). Não cobre: JWT secret, senha de banco, `Bearer` hardcoded, token da Focus NFe, API key da eNotas, string de conexão Postgres, nem entropia genérica. Nenhum dos segredos que este projeto de fato manipula está no conjunto detectável.
4. **`:6` — `blockedFileNames` não inclui `*.local.txt`.** Se o `.gitignore` mudar, o scanner não é a rede de segurança.

**Impacto:** o gate dá verde e produz confiança injustificada. Um controle de segurança que sinaliza conformidade sem exercê-la é pior que a ausência do controle.

---

### T18-F08 — `OBS-INV-08`: a divergência de majors é real, mas o achado é outro — **não existe contrato compartilhado**
**Severidade: MEDIUM · Confiança: ALTA · ASVS V14.2.1 / V5.1.1**

Auditei a hipótese do plano e ela **não se sustenta na forma enunciada**. Registro a refutação parcial, conforme Regra 20.

Versões confirmadas em manifesto **e** em lock:

| Pacote | server | client | mobile / tv |
|---|---|---|---|
| `zod` | `^4.4.3` → lock **4.4.3** (`server/package-lock.json:11521-11525`) | `^3.25.76` → lock **3.25.76** (`client/package-lock.json:6039-6043`) | — |
| `typescript` | `^7.0.2` → lock **7.0.2** (`server/package-lock.json:11065-11069`) | `~6.0.2` → lock **6.0.3** (`client/package-lock.json:5674-5678`) | `~6.0.3` |
| `@types/node` | `^26.1.2` (`server/package-lock.json:3341-3345`) | `^24.13.3` (`client/package-lock.json:3476-3480`) | — |

**Onde o plano supôs errado:** procurei um artefato de schema compartilhado — `Glob` em `{shared,contracts,packages}/**/*.ts` retorna **zero arquivos**; nenhum import de `client/src` alcança `server/` exceto dois testes que leem código-fonte por `readFileSync` (`client/src/lib/departments.seeds.test.ts:34`, `client/src/layouts/AppLayout.navigation.test.tsx:90`). Nenhum schema Zod atravessa as duas majors, porque **nenhum schema atravessa nada**.

**O achado real, que é pior:** o contrato cliente↔servidor é redeclarado à mão. `from 'zod'` aparece em **40+ arquivos de `client/src/pages`** (limite da busca atingido), cada um com sua própria versão do schema, contra validadores independentes no servidor. Não há fonte única, não há geração, e não há teste que reprove divergência. As diferenças de comportamento entre Zod 3 e 4 (formato de `error.issues`, semântica de `.default()`/`.optional()`, validadores de string movidos para top-level, coerção) deixam de ser um risco de *runtime compartilhado* e viram um risco de *deriva silenciosa*: o cliente aceita o que o servidor rejeita, ou vice-versa, e nada acusa.

**Agravante próprio:** `@types/node` **^26** no servidor, com a memória do projeto registrando Node 24 como runtime local. Tipagem à frente do runtime deixa o `typecheck` verde para APIs que não existem em execução — exatamente a classe de bug que passa por typecheck e por 1400 testes. O `^` em `typescript` `^7` (compilador maior, não fixado) agrava a reprodutibilidade do build.

---

### T18-F09 — `/uploads`: autenticação sem autorização, nome previsível e **sem rate limit** (confirma `AUD-SEC-T04-02` e acrescenta o terceiro fator)
**Severidade: HIGH · Confiança: ALTA · ASVS V4.1.1 / V12.4 / V6.3.3**

Confirmo T-04 por leitura própria e acrescento um fator que muda o cálculo de explorabilidade:

- `server/app.ts:225` — `app.use('/uploads', authenticate, express.static('uploads'))`. Só `authenticate`. Nenhum `authorizeModule`. O próprio comentário (`:220-224`) confirma que o diretório guarda ASO, TRCT e contratos.
- `server/src/services/uploadService.ts:113-124` — `sanitizeFileName` compõe `Date.now()` + `Math.random().toString(36).substring(2,8)`. `Math.random()` é PRNG não criptográfico; o espaço efetivo de adivinhação por milissegundo conhecido é ~36^6, e o `Date.now()` de um documento é estimável a partir da data do registro exibida na própria UI.
- **Fator novo:** `app.ts:148` monta `apiLimiter` em `/api` apenas. `/uploads` está **fora de qualquer rate limiter**. A enumeração por força bruta do sufixo aleatório não encontra nenhum atrito no servidor.
- Subpastas conhecidas e fixas: `rh-trct` (`terminationController.ts:145`), `rh-employee-documents` (`employeeDocumentController.ts:81,103`), `marketing-materials`, `products`, `general`.

**Impacto:** exposição de documento LGPD-sensível e de rescisão trabalhista a qualquer usuário autenticado, independentemente de perfil de acesso, com enumeração ilimitada.

---

### T18-F10 — Tabela de magic bytes fraca em três pontos
**Severidade: LOW · Confiança: ALTA · ASVS V12.2.1**

`server/src/utils/validators.ts:187-198,207-222`:
- `:196-197` — `'7B': 'application/json'` e `'5B': 'application/json'`: assinaturas de **um único byte** (`{` e `[`). Qualquer arquivo começando com essas bytes é classificado como JSON.
- `:193` — `'52494646': 'image/webp'`: `RIFF` é contêiner genérico (WAV, AVI). Não há verificação do marcador `WEBP` no offset 8. Um `.wav` renomeado para `.webp` passa.
- `:191` — `'504446'` casa com um arquivo iniciado pelos bytes `PDF` sem o `%` inicial, o que não é PDF válido.
- `:216` e `:221` — a semântica de "lista vazia libera tudo" persiste na função. Ela hoje está neutralizada pelo `deriveAllowedMimes` em `uploadService.ts:168-169`, mas é uma armadilha para o próximo chamador que use `Validators.validateFileMagic` diretamente.

**Controle compensatório relevante contra XSS armazenado:** `app.ts:35` aplica `helmet()` com CSP default (`script-src 'self'`, sem `unsafe-inline`) e `X-Content-Type-Options: nosniff` também na rota `/uploads`. Isso reduz materialmente o risco de execução de conteúdo servido a partir de upload. Registro o controle porque ele é a razão de eu classificar como LOW e não MEDIUM.

---

### T18-F11 — Comentário de decisão de segurança contradiz o código: uploads de vídeo/apresentação são de fato **rejeitados**
**Severidade: LOW · Confiança: ALTA · divergência doc↔código**

`server/src/modules/marketing/application/use-cases/material/UploadMaterialFileUseCase.ts:11-19` documenta como "decisão consciente, documentada aqui para não ser 'corrigida' por engano em uma auditoria futura" que `allowedMimes` vazio faz a validação de magic bytes **não bloquear** mp4/mov/ppt/docx.

Isso deixou de ser verdade. `server/src/services/uploadService.ts:168-169` passou a derivar os mimes das extensões quando `allowedMimes` vem vazio. Para `MATERIAL_ALLOWED_EXTENSIONS` (`:27-32`), `deriveAllowedMimes` (`:52-60`) produz uma lista **não vazia** (jpeg/png/gif/webp/pdf). Um `.mp4` não casa nenhuma assinatura da tabela, cai em `validators.ts:221` com `allowedMimes.length !== 0` → `valid: false` → `uploadService.ts:174` lança 400.

Ou seja: `POST /api/marketing/materials/:id/file` com vídeo ou apresentação **falha**, contrariando o RF documentado, e o comentário instrui explicitamente auditores futuros a não mexer. Reporto como divergência, não como correção — a decisão de qual dos dois é a verdade é do dono do requisito.

---

### T18-F12 — `.JSON` na whitelist de extensões é código morto
**Severidade: LOW · Confiança: ALTA**

`server/src/services/uploadService.ts:22-23` lista `'.JSON'` em `ALLOWED_EXTENSIONS.documents`/`.all`, mas `:156` normaliza com `path.extname(...).toLowerCase()`. `'.json'` nunca casa `'.JSON'` em `:157`. Nenhum upload `.json` é aceito por nenhum caminho. Sem impacto de segurança direto (falha fechada), mas é sinal de que a whitelist não é exercitada por teste.

---

### T18-F13 — RESSALVA E6: três arquivos de credencial em texto claro no working tree
**Severidade: MEDIUM · Confiança: ALTA · ASVS V2.10 · fundamentado APENAS em metadados**

Existência confirmada por `Glob`, **sem abertura de nenhum deles**, conforme a ressalva:
- `server/CREDENCIAIS_TESTE.local.txt`
- `server/CREDENCIAIS_APROVADOR.local.txt`
- `server/ACESSOS_N8N.local.txt`

Metadados relevantes:
- `.gitignore:22-23` cobre `*.local.txt` com o comentário "Credenciais de teste geradas por `server/scripts/seed-usuarios-departamentos.cjs`". O ignore está correto e é um controle real.
- Mas: (a) são credenciais persistidas em **texto claro no disco do desenvolvedor**, geradas automaticamente por um script de seed, sem expiração, sem rotação e sem inventário; (b) `scan-tracked-secrets.cjs:6` **não** as inclui em `blockedFileNames`, então o gate não é a segunda linha de defesa se o ignore for alterado; (c) `ACESSOS_N8N.local.txt` sugere, pelo nome, credencial de sistema externo — não credencial de teste descartável — o que difere do propósito declarado no comentário do `.gitignore`.
- **Não afirmo nada sobre o histórico do git** (IN-08) — ver DYN-T18-02.

---

### T18-F14 — Higiene criptográfica: bcryptjs 2.4.3 com custo 10 e token de sessão em `localStorage`
**Severidade: LOW · Confiança: ALTA · ASVS V2.4.1 / V3.5**

- `server/src/models/User.ts:125` — `bcrypt.hash(user.password, 10)`. Custo 10 é o mínimo tolerável hoje, não o recomendado. `server/package-lock.json:4448-4452` fixa `bcryptjs` **2.4.3** (linha 2.x, implementação pura JS bem mais lenta que a nativa, o que na prática **reduz** o custo praticável) enquanto existe linha 3.x.
- `client/src/api/httpClient.ts:7,12,17` — token em `localStorage`. Decisão coerente com a ausência de cookies (e é o que elimina CSRF, ver Conformidade), mas expõe o token a qualquer XSS.
- **Pontos positivos verificados, registrados como conformidade:** token de recuperação de senha usa `crypto.randomBytes(32)` e é armazenado como SHA-256 (`ForgotPasswordUseCase.ts:45-46`, `ResetPasswordUseCase.ts:45`); senha temporária usa `crypto.randomBytes(9)` (`AccessProfileExecutionServiceAdapter.ts:42`).

---

## EVIDÊNCIA DE CONFORMIDADE (categorias verificadas sem finding)

- **SQL Injection (V5.3.4) — conforme.** Varredura completa de `sequelize.query`/`Sequelize.literal` em `server/src`. As duas ocorrências em código de runtime (`server/src/services/bomStructureProjection.ts:155,328`) usam SQL constante (`ACTIVE_STRUCTURE_SQL`, `ACTIVE_PRODUCT_STRUCTURE_SQL`) com `replacements` e `QueryTypes.SELECT`. Todo o restante está em `server/src/scripts/backfill/*` (scripts operacionais, sem entrada HTTP) e usa `replacements` nomeados. Nenhuma concatenação de entrada de usuário em SQL foi encontrada. `Validators.sanitizeSearch` (`validators.ts:163-166`) escapa `%`/`_` para `Op.like`.
- **XSS no cliente (V5.3.3) — conforme.** Única ocorrência de `dangerouslySetInnerHTML` em todo `client/src`: `client/src/components/ui/chart.tsx:95`, injetando CSS derivado do objeto `config` **estático do componente** (`:96-107`), não de dado do servidor. Zero ocorrências de `innerHTML`, `eval(`, `new Function(`.
- **SSRF (V13.1.3) — conforme.** Todos os `fetch` do servidor têm URL derivada de constante ou de env: `ENotasProvider.ts:82,114,133` (`BASE_URL` constante), `FocusNfeProvider.ts:100,132,151` (`this.baseUrl` de env), `auditLogService.ts:79` (`AUDIT_ALERT_WEBHOOK_URL` de env). Referências de terceiro passam por `encodeURIComponent`. Nenhum destino controlado por requisição do usuário.
- **CSRF (V4.2.2) — não aplicável por desenho, conforme.** `app.ts:29-33` configura CORS com lista de origens e **sem** `credentials: true`; a sessão é Bearer em `localStorage` (`httpClient.ts:7`), não cookie. Não há superfície CSRF clássica.
- **Regra 24 (papel declarado pelo cliente) — CONFORME.** Verificado diretamente: o payload do JWT contém apenas `{ id, passwordVersion }` (`server/src/middlewares/auth.ts:17-22`); `role` e `permissions` são carregados do banco a cada requisição (`:77-87,110,118`) e o mapa de permissões vem do `AccessProfile` (`:105-112`). Nenhum `role`/`isAdmin`/`perfil` é aceito de body, query ou header. Nenhuma violação da Regra 24 nesta trilha.
- **Vazamento de erro (V7.4.1) — conforme.** `server/src/middlewares/errorHandler.ts:99-111,134-139` nunca devolve mensagem crua de `DatabaseError` nem stack; o fallback é genérico em todos os ambientes.
- **Path traversal em `/uploads` (V12.3.1) — conforme.** `express.static` (`app.ts:225`) normaliza e bloqueia `..`. `uploadService.ts:182,194` grava sempre com nome sanitizado sob `path.resolve(process.cwd(), 'uploads/<subfolder>')`, com `subfolder` sempre literal nos 5 chamadores. `deleteFile` (`:223-229`) **não** tem containment check, mas seus dois chamadores (`UploadEntityPhotoUseCase.ts:46`, `UploadMaterialFileUseCase.ts:70`) passam um caminho lido do banco que foi gravado pelo próprio serviço — não entrada direta do cliente. Registro como conforme **hoje**, com a fragilidade anotada.
- **Rate limiting existe e é bem desenhado na camada de login (V11.1.1) — parcialmente conforme.** `app.ts:48-52` (chave IP+e-mail), `:122-127` (limiter próprio para recuperação de senha), `:138-148` (ordem correta após o body parser). O desenho aqui é acima da média. As falhas estão em T18-F05 e T18-F09.

---

## RESSALVAS DE COBERTURA

- **RES-T18-01 — `AUDIT_COMMIT` não verificado.** Sem shell, não pude executar `git rev-parse HEAD`. Todas as leituras são do working tree em `c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA/`. Se o working tree divergir de `c1311a6f…`, este relatório precisa de delta audit (Regra 14). **Escalono ao diretor.**
- **RES-T18-02 — IN-08 não atendido: histórico de commits não auditado.** Sem `git log`/`git grep`, **não afirmo** que qualquer segredo esteve ou não esteve no histórico. A auditoria de segredos aqui cobre exclusivamente o estado atual dos arquivos. Lacuna declarada, não fechada.
- **RES-T18-03 — Dependências: nenhuma verificação de vulnerabilidade conhecida.** `npm audit` é vedado (G4/não-execução) e não há base de CVE offline. Analisei versões, majors e coerência manifesto↔lock. **Não** posso afirmar que as dependências estão livres de CVE. `server/package.json:48-51` declara `overrides` para `uuid` e `brace-expansion`, o que sugere que CVEs transitivos já foram tratados no passado — sem verificação, isso é indício, não evidência.
- **RES-T18-04 — G3 violada por limitação de esforço: amostragem em mass assignment.** Identifiquei 13 endpoints com o padrão `{ id: req.params, ...req.body }` (lista em T18-F01) e rastreei **um** até o sink. G3 veda amostragem reduzida em segurança. **Escalono:** ou o diretor aloca esforço para os 12 restantes, ou T18-F01 fica registrado com cobertura declaradamente insuficiente.
- **RES-T18-05 — `mobile/` e `tv/` auditados apenas por manifesto.** Não li o código-fonte dos apps Expo. `expo-secure-store` está declarado em ambos, o que sugere armazenamento seguro de token, mas **não verifiquei o uso**.
- **RES-T18-06 — `tests/` não auditados.** Não avaliei se existe teste que reprove nenhuma das condições acima (notadamente T18-F01 e T18-F02). A ausência de asserção de segurança é hipótese, não achado.
- **RES-T18-07 — `server/tmp/production-runtime-check/` e `server/tmp/docker-runtime/` contêm `package-lock.json` e `node_modules` versionados no working tree.** Estão sob `.gitignore:11` (`server/tmp/`) e sob o allowlist do scanner (`scan-tracked-secrets.cjs:7`). **Não analisei** essas árvores. Registro a existência porque `tmp` estar na allowlist do scanner (T18-F07) e conter dependências completas é uma combinação que merece verificação dedicada.
- **RES-T18-08 — Criptografia de dados sensíveis em repouso não avaliada.** Não verifiquei se CPF, dados de ASO/prontuário e demais dados LGPD-sensíveis têm proteção em coluna. Matéria de fronteira com a trilha de dados/LGPD.

---

## PEDIDOS DE VERIFICAÇÃO DINÂMICA (`vericore-audit-verification-runner`)

| ID | Comando exato | Objetivo |
|---|---|---|
| `DYN-T18-01` | `git -C "c:/Sistema EvokAudio/ERP-Evok--Audio-LTDA" rev-parse HEAD` e `git status --porcelain` | Fechar RES-T18-01: confirmar que o working tree é `c1311a6f…` e está limpo |
| `DYN-T18-02` | `git log --all --diff-filter=A --name-only -- "*.local.txt" "*.env"` e `git log -p --all -S "dev-only-change-me" -- docker-compose.yml` | IN-08: provar por git se segredo/arquivo sensível esteve no histórico. **Sem imprimir valores** |
| `DYN-T18-03` | `npm audit --json --prefix server`, idem `client`, `mobile`, `tv` | Fechar RES-T18-03 |
| `DYN-T18-04` | `npm run scan:secrets --prefix server` | Confirmar T18-F07: o gate passa verde apesar dos pontos cegos |
| `DYN-T18-05` | `git -C … grep -n "\.\.\.req\.body" -- "server/src/modules/**/controllers/*.ts"` + rastreio dos 12 chamadores restantes | Fechar RES-T18-04 (G3) |
| `DYN-T18-06` | PoC estático-dinâmico de T18-F01 em ambiente descartável: `PUT /api/jur/contracts/<A>` com body contendo `id: <B>`, verificar qual registro mudou e qual id o `audit_logs` registrou | Provar a sobrescrita de id e a falsificação do log |
| `DYN-T18-07` | Subir com `docker compose -f docker-compose.yml up` **sem** `NODE_ENV` no `.env` e verificar que a API sobe e emite JWT | Provar T18-F02 (fail-open) |
| `DYN-T18-08` | `POST /api/marketing/materials/1/file` com `.mp4` válido | Provar T18-F11 (rejeição contrária à decisão documentada) |
| `DYN-T18-09` | 350 requisições a `/api/dashboard` com JWT `alg:none` forjado contendo `id` de vítima, seguidas de 1 requisição legítima da vítima | Provar T18-F05 (DoS dirigido) |
| `DYN-T18-10` | `docker compose -f docker-compose.prod.yml config` com `.env` de exemplo | Provar T18-F03: ausência de `FOCUS_NFE_*`/`ENOTAS_*`/`SMTP_*` no ambiente do contêiner |

---

## ESCALONAMENTOS (Regra 20 — divergência não se concilia em silêncio)

1. **Para `vericore-software-audit-director` — RES-T18-01 (AUDIT_COMMIT não verificável).** Bloqueia a asserção de que esta trilha auditou o objeto correto. Decisão necessária antes de consolidar.
2. **Para `vericore-software-audit-director` — RES-T18-04 (G3 vs. esforço).** T18-F01 é HIGH com 1/13 dos call sites rastreados. G3 veda amostragem em segurança. Preciso de alocação adicional ou de aceite explícito da lacuna.
3. **Para `vericore-finding-validator` (Regra 22):** T18-F01, T18-F02, T18-F03 e T18-F09 (HIGH) requerem validação antes de seguirem para remediação.
4. **Divergência com o plano §4.4 / `OBS-INV-08`:** a premissa "contratos compartilhados atravessando duas majors de Zod" é **refutada** — não há contrato compartilhado. Registro T18-F08 com o achado corrigido, e sinalizo que a `OBS-INV-08` original deve ser reformulada, não simplesmente fechada.
5. **Confirmações cruzadas (sem divergência):** confirmo por leitura própria `AUD-AUTHN-01` (T-02) → T18-F02; `AUD-SEC-T04-02` (T-04) → T18-F09, com fator agravante novo (ausência de rate limit em `/uploads`); achado de webhook (T-08) → T18-F06, com controle compensatório identificado que rebaixa a severidade para MEDIUM. Recomendo que T-08 avalie esse rebaixamento.
6. **Para a trilha de dados/LGPD:** RES-T18-08 (criptografia em repouso) e o conteúdo exposto por T18-F09 (ASO/TRCT) são fronteira compartilhada.

---

## ARQUIVOS LIDOS

Configuração e manifestos
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\.gitignore`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\.env.example`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docker-compose.yml`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docker-compose.prod.yml`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\mobile\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\tv\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\package-lock.json` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\package-lock.json` (parcial, por consulta)

Servidor — núcleo
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\app.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\config\runtimeEnv.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\middlewares\auth.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\middlewares\errorHandler.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\middlewares\imageUpload.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\services\uploadService.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\utils\validators.ts` (parcial: 150-225)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\scripts\scan-tracked-secrets.cjs`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\migrations\20260806-000080-create-app-role-least-privilege.cjs` (parcial, por consulta — valor de senha **não** lido)

Servidor — módulos
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\presentation\controllers\webhookController.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\webhooks\application\use-cases\ProcessN8nWebhookUseCase.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\presentation\controllers\contractController.ts` (parcial: 70-119)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\presentation\routes\juridico.ts` (parcial)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\application\use-cases\contract\UpdateContractUseCase.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\juridico\infrastructure\sequelize\SequelizeContractRepository.ts` (parcial)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\models\JurContract.ts` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\marketing\application\use-cases\material\UploadMaterialFileUseCase.ts`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\marketing\presentation\middlewares\materialFileUpload.ts`

Cliente
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\client\src\components\ui\chart.tsx` (parcial: 60-109)

**Não abertos, por escopo (RESSALVA E6):** `server\CREDENCIAIS_TESTE.local.txt`, `server\CREDENCIAIS_APROVADOR.local.txt`, `server\ACESSOS_N8N.local.txt` — apenas metadados de existência foram usados.
**Nenhum valor de segredo foi extraído, citado, mascarado ou reproduzido neste relatório. Nenhum arquivo foi criado ou alterado. Nenhum comando foi executado.**
