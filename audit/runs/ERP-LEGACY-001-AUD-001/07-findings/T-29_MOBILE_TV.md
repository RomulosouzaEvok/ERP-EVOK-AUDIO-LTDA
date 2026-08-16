# T-29 — `mobile/` (C-134) e `tv/` (C-135) — Fieldwork complementar

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Trilha | **T-29** — fieldwork complementar (extensão `APR-2026-024`) |
| Células | **C-134** (`mobile/`, nível E nos 3 eixos) · **C-135** (`tv/`, triagem estática 100%) |
| `AUDIT_COMMIT` | `c1311a6f76b512fef893f7e60d934179cae3409f` |
| Agente | `vericore-frontend-auditor` |
| Método | READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT |
| Evidência | 100% leitura estática própria, com âncora `arquivo:linha`. **Nenhuma execução** (build, teste, `npm`, banco) |
| Origem | Fecha a exceção `N-08` deixada por T-21 |

> **Nota de persistência.** O agente titular não dispunha de ferramenta `Write` nesta sessão.
> Conteúdo persistido pelo orquestrador **sem alteração** — mesmo padrão de ressalva de
> transparência já aplicado nos passos 23 e 24.

**Regra 4:** nada aqui declara `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`.
**Regra 2:** nenhum arquivo de `mobile/`, `tv/`, `client/` ou `server/` foi alterado.

---

## 1. Inventário próprio (não herdado)

Enumeração própria por glob, **excluindo `node_modules/`**.

### 1.1 `mobile/` — 16 arquivos-fonte `.ts`/`.tsx`

| # | Arquivo | Papel |
|---|---|---|
| 1 | `mobile/app/_layout.tsx` | Providers globais (`AuthProvider`, SafeArea, GestureHandler) |
| 2 | `mobile/app/index.tsx` | Rota `/` — decide login × home pela sessão |
| 3 | `mobile/app/login.tsx` | Tela de login |
| 4 | `mobile/app/(app)/_layout.tsx` | **Guard de sessão** do grupo autenticado |
| 5 | `mobile/app/(app)/home.tsx` | Scan + formulário de movimentação de estoque |
| 6 | `mobile/app/(app)/history.tsx` | Histórico paginado de movimentações |
| 7 | `mobile/app/(app)/counts/index.tsx` | Lista "Minhas contagens" + "Pool" |
| 8 | `mobile/app/(app)/counts/[id].tsx` | Execução da contagem (start/contar/submeter) |
| 9 | `mobile/src/api/client.ts` | Wrapper `fetch`, `ApiError`, handler global de 401 |
| 10 | `mobile/src/api/auth.ts` | `POST /auth/login`, `POST /auth/refresh` |
| 11 | `mobile/src/api/mobileInventory.ts` | `POST /mobile-inventory/scan`, `GET /movements` |
| 12 | `mobile/src/api/inventoryCounts.ts` | 5 endpoints de `/inventory-counts` |
| 13 | `mobile/src/api/types.ts` | DTOs espelhados do backend |
| 14 | `mobile/src/context/AuthContext.tsx` | Sessão + SecureStore + refresh silencioso |
| 15 | `mobile/src/components/QrScannerModal.tsx` | Câmera / leitura de código |
| 16 | `mobile/src/config/env.ts` | `EXPO_PUBLIC_API_URL` |

Config adicionais lidos: `app.json`, `package.json`, `babel.config.js`, `.env.example`, `README.md`.

### 1.2 `tv/` — 15 arquivos-fonte `.ts`/`.tsx` (+ `babel.config.js`)

| # | Arquivo | Papel |
|---|---|---|
| 1 | `tv/app/_layout.tsx` | Providers globais |
| 2 | `tv/app/index.tsx` | Rota `/` |
| 3 | `tv/app/login.tsx` | Login "10-foot UI" (D-pad) |
| 4 | `tv/app/(app)/_layout.tsx` | Guard de sessão |
| 5 | `tv/app/(app)/dashboard.tsx` | Painel único de demandas |
| 6 | `tv/src/api/client.ts` | Cópia adaptada do client mobile |
| 7 | `tv/src/api/auth.ts` | `login` + `refresh` |
| 8 | `tv/src/api/dashboard.ts` | `GET /dashboard/department-demands` |
| 9 | `tv/src/api/useDepartmentDemands.ts` | Polling 60s + tratamento de 401/403 |
| 10 | `tv/src/api/types.ts` | DTOs |
| 11 | `tv/src/components/DepartmentCard.tsx` | Card por departamento |
| 12 | `tv/src/components/FocusablePressable.tsx` | Foco por D-pad |
| 13 | `tv/src/config/env.ts` | `EXPO_PUBLIC_API_URL` + intervalo de refresh |
| 14 | `tv/src/context/AuthContext.tsx` | Sessão + refresh **proativo** 12h |
| 15 | `tv/src/types/react-native-tv.d.ts` | Augmentação de tipos (sem lógica) |

Config adicionais lidos: `app.json`, `package.json`, `tsconfig.json`, `babel.config.js`,
`.env.example`, `README.md`.

### 1.3 Divergência de medição (Regra 20 — registrada, não conciliada)

| Item | Medição do orquestrador | Medição própria | Tratamento |
|---|---|---|---|
| Arquivos `mobile/` | 16 | **16 `.ts`/`.tsx`** — coincide | Sem divergência |
| Arquivos `tv/` | 16 | **15 `.ts`/`.tsx`**; chega a 16 se `babel.config.js` for contado | Diferença de **base de contagem**, não de fato. Não material |
| Linhas (`~2.238` / `~1.361`) | declaradas | **não verificadas** | Contagem de linhas exigiria execução de ferramenta; **lacuna declarada**, não material — a cobertura foi por arquivo, e todos foram lidos integralmente |

**Cobertura efetiva: 16/16 arquivos de `mobile/` e 15/15 de `tv/` lidos integralmente**, mais os
arquivos de configuração de ambos.

---

## 2. Eixo 1 (C-134) — Origem do papel/permissão no `mobile/` (Regra 24)

**Resultado: nenhuma violação da Regra 24 em `mobile/` nem em `tv/`.** Registro a conformidade com
o mesmo peso de um finding, com a cadeia completa de prova.

### 2.1 O que o cliente envia

Varredura exaustiva de `role`/`isAdmin`/`perfil` em `mobile/src` retorna **três ocorrências, todas
inertes**:

- `mobile/src/api/types.ts:12` — `role: string` no tipo `AuthUser` (campo **recebido** do login).
- `mobile/src/api/auth.ts:6` — comentário do contrato.
- `mobile/src/api/mobileInventory.ts:12` — comentário citando `estoque:operate`.

O único cabeçalho de identidade montado pelo cliente é `Authorization: Bearer <token>`
(`mobile/src/api/client.ts:108-110`; idêntico em `tv/src/api/client.ts:109-111`). **Nenhum corpo,
query ou header das 8 chamadas do app carrega papel, perfil ou id de usuário.** Verificado chamada
a chamada: `auth.ts:18-24,48-53`, `mobileInventory.ts:27-31,41-44`,
`inventoryCounts.ts:49-52,60-63,68,78,93-96,102`.

### 2.2 O que o servidor faz com isso

- `server/src/middlewares/auth.ts:17-22` — o payload do JWT declara **apenas**
  `{ id, passwordVersion, iat, exp }`. **Papel não trafega no token.**
- `server/src/middlewares/auth.ts:77-87` — `authenticate` relê usuário e perfil de acesso **do
  banco, a cada requisição**.
- `server/src/middlewares/auth.ts:114-126` — `role`, `permissions` e `accessProfileName` de
  `req.user` vêm **exclusivamente** dessa leitura.
- `server/src/middlewares/auth.ts:99-103` — token com `passwordVersion` obsoleta é rejeitado antes
  disso.

### 2.3 O ponto de maior risco, verificado especificamente

`StartInventoryCountUseCase.ts:74` decide o override de admin por `role !== 'admin'`. Rastreada a
origem desse `role`: `inventoryCountController.ts:155` → `(req as any).user.role` →
`middlewares/auth.ts:117` → `user.role` do banco. **O `role` que libera o override nunca passa pelo
cliente.**

> **Conformidade `T29-C01` — Regra 24 NÃO é violada por `mobile/` nem por `tv/`.** Confiança:
> **ALTA** (cadeia estática completa, sem elo inferido). Escopo: os dois apps no `AUDIT_COMMIT`;
> não estende veredito ao `client/` web.

---

## 3. Eixo 2 (C-134) — Tabela controle-de-UI × controle-de-backend

| # | Controle visível na UI | Âncora UI | Contraparte server-side | Âncora backend | Veredito |
|---|---|---|---|---|---|
| 1 | Rotas `(app)/*` exigem sessão | `mobile/app/(app)/_layout.tsx:22-24` | `authenticate` em todas as rotas consumidas | `mobileInventory.ts:17-19`; `inventoryCounts.ts:23-31` | **CONFORME** |
| 2 | Botão "Registrar movimentação" | `home.tsx:185-195` | `authorizeModule('estoque','operate')` | `mobileInventory.ts:17` | **CONFORME** |
| 3 | Mensagem "sem permissão" em 403 | `home.tsx:76-78` | 403 real com código de motivo | `middlewares/auth.ts:260-282` | **CONFORME** |
| 4 | Histórico é leitura | `history.tsx:35` | `authorizeModule('estoque')` | `mobileInventory.ts:19` | **CONFORME** |
| 5 | "Iniciar contagem" só em `draft` | `[id].tsx:227,244-247` | `status !== 'draft'` ⇒ `BusinessRuleError` | `StartInventoryCountUseCase.ts:67-69` | **CONFORME** |
| 6 | 409 "já foi pega por outro funcionário" | `[id].tsx:156-160` | `ConflictError` sob `SELECT … FOR UPDATE` | `StartInventoryCountUseCase.ts:63,71-76` | **CONFORME** |
| 7 | Campo desabilitado fora de `counting` | `[id].tsx:226,265,89,94` | `status !== 'counting'` ⇒ `BusinessRuleError` | `CountInventoryItemUseCase.ts:55-57` | **CONFORME** |
| 8 | "Enviar" só com 0 pendentes | `[id].tsx:192-195` | Recontagem de `pending` no servidor | `SubmitInventoryCountUseCase.ts:41-44` | **CONFORME** |
| 9 | Aprovar/rejeitar ausente do app | `types.ts:93`; `README.md:107` | `authorizeModule('contagens','approve')` | `inventoryCounts.ts:30-31` | **CONFORME** |
| 10 | Quantidade > 0 e numérica no scan | `home.tsx:57-60` | `qty <= 0` apenas; **`NaN` passa** | `ScanItemUseCase.ts:51-54` | **DIVERGENTE** → `T29-MOB-F02` |
| 11 | "A contagem é minha depois do claim" | `counts/index.tsx:178`; `[id].tsx:157` | **Nenhuma checagem de `assigned_to`** | `CountInventoryItemUseCase.ts:42-73`; `SubmitInventoryCountUseCase.ts:28-46` | **DIVERGENTE** → `T29-MOB-F03` |
| 12 | Painel de TV exige sessão | `tv/app/(app)/_layout.tsx:22-24` | `authenticate` | `dashboard.ts:29` | **CONFORME** |
| 13 | Tela "sem permissão para o painel" | `dashboard.tsx:84-100`; `useDepartmentDemands.ts:80-85` | `authorizeModule('dashboard')` | `dashboard.ts:29` | **CONFORME** |

**Leitura:** 13 pares, **11 conformes, 2 divergentes**. Nenhuma divergência é de autorização por
papel — as duas são de regra/validação existente só de um lado. Os pares 6, 7, 8 e 9 são defesa em
profundidade correta.

---

## 4. Eixo 3 (C-134) — Fluxo de estoque no `mobile/`

### 4.1 O que o app faz do seu lado

`home.tsx:64-69` monta exatamente `{ product_code, quantity, type: 'in'|'out', description? }`. O
`type` vem de estado de UI com dois botões (`:152-171`), **não é hard-coded** — o padrão de
`FIND-ERP-008` (`tipo:'inicial'` fixo no cliente) **não se repete aqui**.

O app **nunca envia** depósito, lote, localização nem `warehouse_id` — não existe campo desses em
nenhuma tela (`home.tsx` inteiro; `types.ts:22-27`). `[id].tsx:233` e `counts/index.tsx:58` apenas
imprimem `warehouse_id` cru ("Depósito: 3").

### 4.2 Corroboração dos achados existentes (não reauditados)

| Achado existente | O que o lado cliente acrescenta | Efeito |
|---|---|---|
| **`AUD-INTEG-03`** (CRITICAL) | **Corrobora e mostra a causa a montante:** o app não tem como informar depósito/lote porque nem UI nem contrato têm o campo (`types.ts:22-27`; `home.tsx:120-181`). A correção server-side não terá dado de entrada sem mudança de contrato **e** de tela | Corroborado + restrição de remediação registrada |
| **`AUD-INTEG-02`** (HIGH) | **Corrobora com sintoma visível:** o operador escolhe "Entrada"/"Saída" (`home.tsx:152-171`) e o histórico do próprio app renderiza **"Ajuste"** (`history.tsx:11-15,110`), porque `adjust` grava `'adjustment'` (`inventoryService.ts:360`). A tela contradiz o botão apertado | Corroborado + sintoma de UI documentado |
| **`AUD-INTEG-09`** (LOW) | Ver `T29-MOB-F02`: o cliente é a **única** barreira contra `NaN` | Estendido no eixo UI×backend |

### 4.3 Nota de not-a-finding

`ScanItemUseCase.ts:63-64` checa saldo fora de lock. **Não reportado**: verificado por leitura
própria que `validateAndLock` (`inventoryService.ts:343-347,142-150`) relê sob `FOR UPDATE` e
rejeita com 422. Registrado para que não seja tratado como buraco.

---

## 5. Findings propostos (todos `PROPOSED`)

### `T29-MOB-F01` — Fallback silencioso para API em HTTP quando `EXPO_PUBLIC_API_URL` falta no build

**Severidade: MEDIUM · Confiança: ALTA (código) / MÉDIA (impacto)**

`mobile/src/config/env.ts:13` define `DEFAULT_API_URL = 'http://192.168.0.10:5000/api'`; `:15` lê a
variável; `:17` avisa **apenas se `__DEV__`**; `:27` faz `rawApiUrl || DEFAULT_API_URL`.

Um build de release sem a variável injetada compila silenciosamente apontando para IP local **em
texto claro** — canal pelo qual trafegam a senha do funcionário (`auth.ts:18-24`) e o JWT em todas
as requisições seguintes (`client.ts:108-110`). Sem aviso, sem erro de build, sem indicação em
tela.

Agravantes verificados: `.env.example:11` documenta que produção é
`https://api.evokaudio.com.br/api` (**o default contradiz a intenção do projeto**); e **não existe
`eas.json` nem configuração de build versionada** em `mobile/` — a injeção da variável é passo
manual não registrado no repositório.

Idêntico em `tv/src/config/env.ts:14,16,18,28` → `T29-TV-F01`. **Lacuna:** provar o bundle real
exige `DYN-T29-01`.

### `T29-MOB-F02` — A única barreira contra quantidade não-numérica está no cliente

**Severidade: MEDIUM · Confiança: ALTA**
**Relação: estende `AUD-INTEG-09` (LOW) no eixo UI×backend — não é duplicata; o diretor decide se
consolida.**

`mobile/app/(app)/home.tsx:57-60`:

```js
if (!quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
  setErrorMessage('Informe uma quantidade válida (maior que zero).');
```

O app rejeita vazio, `NaN` e `<= 0`. O servidor (`ScanItemUseCase.ts:48-54`) rejeita **duas**
dessas:

```ts
if (!product_code || quantity === undefined || !type) { … }
const qty = parseInt(String(quantity), 10);
if (qty <= 0) { throw new ValidationError(…) }
```

**`NaN <= 0` é `false`.** Um corpo com `quantity: null`, `"abc"` ou `{}` — espalhado cru, sem Zod,
por `mobileInventoryController.ts:26` — produz `qty = NaN`, atravessa a guarda e chega a
`InventoryService.adjust` (`ScanItemUseCase.ts:67-74`). Em `adjust`, `validateAndLock(productId,
NaN)` (`inventoryService.ts:343-347`) também não barra, porque `available < NaN` é `false`
(`:142`), seguindo para `product.increment('quantity', { by: NaN })` (`:351`).

É a definição de regra que só existe no cliente: falar direto com a API contorna a única validação
de tipo do campo. **Lacuna:** o desfecho final (erro do driver × gravação × 500) exige
`DYN-T29-02`; a ausência da guarda é estática e está provada.

### `T29-MOB-F03` — Exclusividade do claim de contagem é prometida na UI e não é imposta nas etapas seguintes

**Severidade: MEDIUM · Confiança: ALTA**

A UI constrói explicitamente o modelo de posse: separa "**Minhas** contagens" de "Disponíveis
(pool)" (`counts/index.tsx:178-179`) e, ao tentar iniciar contagem já tomada, exibe **"Esta
contagem já foi pega por outro funcionário."** devolvendo o operador à lista (`[id].tsx:156-160`).

O backend impõe a exclusividade **exatamente uma vez**, no `start`
(`StartInventoryCountUseCase.ts:63,71-76`, sob `FOR UPDATE`). Depois disso ela desaparece:

- `CountInventoryItemUseCase.ts:42-73` valida quantidade, existência, `status === 'counting'` e
  pertinência do item. **Não compara `count.assigned_to` com `userId`**, embora receba `userId` e o
  grave em `counted_by` (`:70`).
- `SubmitInventoryCountUseCase.ts:28-46` **nem recebe `userId`**; `inventoryCountController.ts:260`
  chama `execute({ id })`. Qualquer usuário com `contagens:operate` envia para aprovação a contagem
  de outro.
- `GetInventoryCountByIdUseCase` é chamado sem filtro de posse
  (`inventoryCountController.ts:128`) — navegar até contagem alheia por id é trivial.

Consequência: a contagem física é controle de **segregação** — quem conta responde pelo número. Um
funcionário pode registrar quantidades e fechar contagem de terceiro, ficando `counted_by` do
intruso em itens cujo `assigned_to` é de outro, sem barreira nem sinalização.

**Cruzamento de mandato:** o veredito de autorização é do `authorization-auditor`; reporta-se aqui
a discrepância UI × backend. `AUD-INTEG-04` (HIGH) trata da **ausência de transação/lock** em
`submit`; este é **ausência de checagem de titularidade** — eixo distinto, mesmo endpoint.
Recomendada remediação conjunta.

### `T29-MOB-F04` — Resolução do código escaneado aceita id numérico, permitindo casar produto errado

**Severidade: MEDIUM · Confiança: ALTA (código) / MÉDIA (exploração real)**

`server/src/modules/mobileInventory/infrastructure/sequelize/SequelizeMobileInventoryRepository.ts:13-17`:

```ts
return Product.findOne({
  where: { [Op.or]: [{ code }, { id: isNaN(code as any) ? undefined : code }] }
});
```

- A tela oferece **um único campo rotulado "Código do produto"** (`home.tsx:120-130`), alimentado
  com o resultado bruto do leitor (`QrScannerModal.tsx:37` → `home.tsx:34-39`), aceitando 7
  simbologias — `qr`, `ean13`, `ean8`, `code128`, `code39`, `upc_a`, `upc_e`
  (`QrScannerModal.tsx:25`) — **todas numéricas ou potencialmente numéricas**.
- O backend, para qualquer código numérico, casa **por `code` OU por `id`**. Um código curto (ex.:
  `45`) casa com o produto de `id = 45`. `findOne` devolve o primeiro que o Postgres retornar, sem
  ordem determinística e sem sinalizar ambiguidade.
- Nada na tela informa qual critério casou: o operador só vê `lastResult.product.name` **depois** da
  movimentação gravada (`home.tsx:110-118`) — confirmação **posterior ao efeito**.

Observação secundária, mantida separada por confiança menor: para código não-numérico (o caso
comum), `isNaN` é verdadeiro e o `where` recebe `{ id: undefined }`. O tratamento de `undefined` em
`where` varia por versão do Sequelize. **O desfecho não é afirmado** — `DYN-T29-03`.

### `T29-MOB-F05` — `role` do usuário persistido no dispositivo sem nenhum uso pela UI

**Severidade: LOW · Confiança: ALTA**

`AuthContext.tsx:97` grava o `AuthUser` inteiro em SecureStore, incluindo `role` (`types.ts:8-13`).
A varredura do §2.1 prova que **nenhuma tela lê `user.role`** — `home.tsx:102-103` usa apenas
`name` e `email`.

Dado além do necessário à tela, retido no dispositivo. **Sem consequência de autorização** (não
gateia nada no cliente; o servidor não confia nele), o que mantém LOW. Registrado pela minimização
e porque um `role` já persistido é exatamente o insumo que uma futura tela "só admin vê isto"
usaria — criando a violação de Regra 24 que hoje não existe.

### `T29-TV-F01` — `tv/`: mesmo fallback HTTP, em dispositivo de sessão perpétua

**Severidade: MEDIUM · Confiança: ALTA (código) / MÉDIA (impacto)**

`tv/src/config/env.ts:14,16,18,28` reproduz literalmente o defeito de `T29-MOB-F01` (mesmo default
`http://192.168.0.10:5000/api`, aviso restrito a `__DEV__`). `tv/` também **não tem `eas.json`**
versionado.

Agravante específico: `tv/src/context/AuthContext.tsx:113-118` renova o token proativamente a cada
12h **indefinidamente**, por desenho declarado ("logar UMA VEZ no aparelho e nunca mais pedir
login", `:8-10`). Um canal em texto claro que carrega o mesmo `Authorization` a cada 60s
(`useDepartmentDemands.ts:100` × `DASHBOARD_REFRESH_INTERVAL_MS = 60_000`, `env.ts:31`) é **~1.440
exposições/dia do token**, por tempo indeterminado, em Wi-Fi de chão de fábrica.

### `T29-TV-F02` — Painel exibe referência e nome de produto de OPs abertas em tela sem controle de audiência

**Severidade: LOW · Confiança: ALTA**

`tv/src/components/DepartmentCard.tsx:68-77` renderiza até 3 itens por métrica com `reference`,
`label` e `due_date`. Cruzando com a origem (`SequelizeDashboardRepository.ts:170-171`),
`reference` é `production_orders.order_number` e **`label` é `products.name`** (via `LEFT JOIN
products`); para requisições, `label` é prioridade (`:181`); para contagens, o tipo (`:190`).

O backend autentica e autoriza corretamente (`dashboard.ts:29`) — **o controle de acesso não é o
problema**. O ponto é que o consumidor autorizado é uma **tela de parede**, e não há minimização
para essa audiência: quem passa em frente lê números de OP, nomes de produto e prazos sem
autenticação alguma. `dashboard.tsx:107` ainda imprime o nome do usuário da sessão de serviço.

Não há dado pessoal nem financeiro no payload (verificado campo a campo em
`SequelizeDashboardRepository.ts:220-226`), o que sustenta LOW. Registrado porque **a fronteira de
confidencialidade deste app é física e nenhum controle do sistema a modela**.

### `T29-TV-F03` — Corroboração de `AUD-AUTHN-05`: `tv/` é o consumidor que torna a renovação ilimitada um estado permanente

**Sem severidade nova · Confiança: ALTA**

`AUD-AUTHN-05` (MEDIUM, T-02) já registra "sessão sem logout server-side, sem revogação individual,
sem vida absoluta", citando `RefreshTokenUseCase.ts:47-50`.

**Nenhum finding novo é reportado.** Acrescenta-se a evidência de consumidor que T-02 não tinha:
`tv/src/context/AuthContext.tsx:37-38,113-118` implementa laço de renovação a cada 12h que **nunca
termina**, declarado como requisito de produto (`:8-10`). `RefreshTokenUseCase.ts:47-50` regera o
token a partir de `userId` + `passwordVersion` sem limite de cadeia. Resultado: credencial viva por
tempo indeterminado em aparelho **fisicamente acessível e sem supervisão**, cuja única revogação é
troca de senha (`middlewares/auth.ts:99-103`, revogação coletiva). Isso eleva o **impacto real** de
`AUD-AUTHN-05` sem mudar seu enunciado — decisão sobre reavaliar severidade é do diretor (Regra 22
se houver promoção).

---

## 6. Conformidades registradas (mesmo peso dos findings)

| ID | Conformidade | Âncora |
|---|---|---|
| `T29-C01` | **Regra 24 não é violada**: papel nunca sai do cliente nem entra no token | §2; `middlewares/auth.ts:17-22,77-87,114-126` |
| `T29-C02` | **`userId` do servidor não é sobrescrevível pelo corpo**: `userId: user.id` vem **depois** do spread de `req.body`. Contraste explícito com `T16-F04a`/`T18A-F09`, onde a ordem invertida gerou finding | `mobileInventoryController.ts:26,41` |
| `T29-C03` | Token em `expo-secure-store` (Keychain/Keystore), nunca `AsyncStorage` | `mobile/AuthContext.tsx:19,96-97`; `tv/AuthContext.tsx:27,133-134` |
| `T29-C04` | **Nenhum segredo embarcado** nos 31 arquivos-fonte; apenas `.env.example` com URL de exemplo; **nenhum `.env` versionado** | Enumeração própria; `mobile/.env.example`; `tv/.env.example` |
| `T29-C05` | **401 global limpa a sessão** e devolve ao login nos dois apps | `mobile/client.ts:149-151` + `AuthContext.tsx:85-90`; `tv/` `:150-152`, `:120-126` |
| `T29-C06` | **`GET /movements` não vaza dado de usuário**: `attributes: ['id','name']` para `User`, `['id','name','code']` para `Product` — sem e-mail, hash ou perfil | `SequelizeMobileInventoryRepository.ts:23-24`; consumo em `history.tsx:128` |
| `T29-C07` | **403 tratado como estado definitivo na TV**, com saída explícita, sem mascarar nem reencenar permissão localmente | `useDepartmentDemands.ts:80-85`; `dashboard.tsx:84-100` |
| `T29-C08` | **Nenhuma tela escondida por permissão de UI** em nenhum dos apps: não há render condicional por papel/perfil. O único gate de UI é `isAuthenticated`. Não existe a classe "rota escondida no cliente e aberta no backend" a auditar aqui | `mobile/app/(app)/_layout.tsx:22`; `tv/app/(app)/_layout.tsx:22`; §2.1 |
| `T29-C09` | **`type` de movimentação vem de escolha do usuário, não hard-coded** — o padrão de `FIND-ERP-008` não se repete | `home.tsx:26,152-171,64-69` |
| `T29-C10` | Erros exibidos com mensagem tratada; **`details`/stack do backend nunca renderizados**. `ApiError.details` é capturado (`client.ts:72`) e nunca lido por tela alguma | `client.ts:64-84`; `home.tsx:72-83`; `[id].tsx:127-129,203-205` |
| `T29-C11` | Nenhum cache/estado de cliente com dado sensível além do par token+usuário em SecureStore. **Zero uso de `AsyncStorage`, `localStorage` ou cache em disco** | Varredura própria dos 31 arquivos |
| `T29-C12` | O guard de UI não é o único controle: cada endpoint consumido tem `authenticate` próprio. **Remover o guard não abriria dado nenhum** | `mobileInventory.ts:17-19`; `inventoryCounts.ts:23-31`; `dashboard.ts:29` |

---

## 7. Pedidos de verificação dinâmica (`vericore-audit-verification-runner`)

| ID | O que provar | Procedimento sugerido | Critério de aceite | Finding |
|---|---|---|---|---|
| `DYN-T29-01` | Que um bundle de release sai com `http://192.168.0.10:5000/api` sem a variável | `npx expo export --platform android` em `mobile/` **sem** `.env`; grep da string no bundle | String presente ⇒ confirmado | `T29-MOB-F01`, `T29-TV-F01` |
| `DYN-T29-02` | Desfecho de `quantity` não-numérica no scan | `POST /api/mobile-inventory/scan` com `{"product_code":"<válido>","quantity":"abc","type":"in"}`, JWT `estoque:operate`, contra **`erp_evok_audio_test`** | `products.quantity` e `inventory_movements` antes/depois; qualquer coisa ≠ 400 confirma a lacuna | `T29-MOB-F02` |
| `DYN-T29-03` | Comportamento de `{ id: undefined }` no `where` para código alfanumérico | `POST /scan` com `product_code` alfanumérico existente, contra `erp_evok_audio_test` | 500 ⇒ defeito funcional adicional; 200 ⇒ só a ambiguidade numérica permanece | `T29-MOB-F04` |
| `DYN-T29-04` | Que um usuário conta e submete contagem alheia | A faz `start`; B (outro id, `contagens:operate`) chama `POST /:id/items/:itemId/count` e `POST /:id/submit` | Ambas em 200 confirmam ausência de checagem de titularidade | `T29-MOB-F03` |

**Nenhuma sondagem toca `erp_evok_audio` (produção)** — todos os pedidos contra
`erp_evok_audio_test`, respeitando `APR-2026-016`.

---

## 8. Declaração de cobertura alcançada

### 8.1 Coberto

- **`C-134` (`mobile/`) — nível E nos três eixos da EMENDA-02:**
  - *Origem do papel/permissão*: **exaustivo** — varredura completa de `role`/`isAdmin`/`perfil`,
    inspeção das 8 chamadas de API uma a uma, rastreamento do `role` até a fonte no banco. Nenhum
    elo inferido.
  - *Autenticação*: **exaustivo** — login, persistência, restauração, refresh silencioso, handler
    global de 401, guard de rota; os 5 arquivos envolvidos lidos integralmente.
  - *Fluxos de estoque*: **exaustivo** — as 4 telas e os 2 clients lidos integralmente e cruzados
    com 6 arquivos de backend (rotas, controllers, 4 use cases, service, repositório).
- **`C-135` (`tv/`) — triagem estática 100%**: 15/15 arquivos-fonte lidos integralmente + 6 de
  configuração/documentação (acima do exigido para triagem).
- **Tabela UI × backend (§3)**: 13 pares verificados dos dois lados.

### 8.2 Fora de cobertura, e por quê

| Não coberto | Motivo | Materialidade |
|---|---|---|
| Evidência dinâmica (4 pedidos, §7) | Proibição expressa de executar; mandato do `verification-runner` | **Material** para o desfecho de `T29-MOB-F02`/`F04`; **não** para a existência das lacunas |
| Comportamento em dispositivo real (D-pad, câmera, SecureStore no aparelho) | Exigiria interação real com hardware — lacuna registrada | Baixa; nenhum finding depende disso |
| `node_modules` de ambos (13.806+ arquivos) | Fora do código-fonte do projeto; dependências são mandato de T-18 | Nenhuma para C-134/C-135 |
| Contagem de linhas declarada pelo orquestrador | Exigiria execução de ferramenta | Nenhuma — cobertura por arquivo é 100% |
| Veredito final sobre a matriz de permissões implicada por `T29-MOB-F03` | Mandato do `authorization-auditor` (cruzamento registrado no finding) | Discrepância reportada; decisão não é do titular desta trilha |
| `client/` web | Fora das células C-134/C-135 | — |

### 8.3 Exceção `N-08`

`N-08` foi declarada porque `mobile/` e `tv/` não haviam sido explorados "nem como varredura
estrutural". Com este documento, **os dois diretórios estão integralmente lidos e cruzados com o
backend**. O encerramento de `N-08` é decisão do diretor da run; registra-se apenas que a causa
material que a originou não subsiste.

---

## 9. Resumo para o diretor

| Métrica | Valor |
|---|---|
| Arquivos-fonte lidos | **31** (16 `mobile/` + 15 `tv/`), 100% de ambos |
| Findings propostos | **7** — `T29-MOB-F01..F05`, `T29-TV-F01..F02` |
| Por severidade | MEDIUM ×5 (`MOB-F01/F02/F03/F04`, `TV-F01`) · LOW ×2 (`MOB-F05`, `TV-F02`) |
| Corroborações sem finding novo | **4** — `AUD-INTEG-03`, `AUD-INTEG-02`, `AUD-INTEG-09`, `AUD-AUTHN-05` (`T29-TV-F03`) |
| Conformidades registradas | **12** (`T29-C01` … `T29-C12`) |
| **CRITICAL / HIGH** | **Nenhum.** Nenhum finding desta trilha entra no `finding-validator` por severidade (Regra 22) |
| **Regra 24** | **Não violada** em `mobile/` nem em `tv/` — conformidade provada, não presumida (`T29-C01`) |

**Resposta à pergunta que motivou a trilha:** o `mobile/` tira o papel do usuário **exclusivamente
da resposta do login, guarda-o sem usar e nunca o devolve ao servidor**; o servidor relê papel e
permissões do banco a cada requisição e não confia em nada que o cliente diga sobre si. **A
hipótese mais grave que a extensão foi contratada para testar está refutada com prova estática
completa.** Restam cinco divergências UI × backend de severidade média ou baixa: `T29-MOB-F02` e
`T29-MOB-F03` são regra que só existe no cliente; `T29-MOB-F04` é regra que só existe no servidor e
que a UI não deixa o operador conferir antes do efeito.
