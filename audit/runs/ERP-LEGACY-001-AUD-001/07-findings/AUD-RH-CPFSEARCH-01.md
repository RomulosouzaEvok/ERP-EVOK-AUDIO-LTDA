# FINDING

```
FINDING_ID:   AUD-RH-CPFSEARCH-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** CPF de funcionário é **reconstruível dígito a dígito** por qualquer usuário
autenticado, via `GET /api/employees?search=`. A máscara protege a **saída**; o filtro
`LIKE %...%` sobre a coluna `cpf` transforma a **entrada** em oráculo, e o `name` — que
permanece visível — confirma cada acerto.

**DOMAIN:** segurança de aplicação / privacidade
**SUBDOMAIN:** controle de acesso a dado pessoal · vazamento por canal lateral de consulta
**SEVERITY:** **HIGH** — **fixada por decisão humana do dono nesta sessão**. Não
reavaliada por este agente.
**CONFIDENCE:** `CONFIRMED` quanto ao **fato de código** (rota, máscara, filtro,
sanitizador e limitador lidos linha a linha nesta sessão) · `HIGH` quanto à
**explorabilidade prática** — a viabilidade do refinamento é derivada por análise
estática do custo de requisições (§3.3), **não** por execução.
**STATUS:** `PROPOSED`
**ENVIRONMENT:** **DEV/HOMOLOGAÇÃO** — `employees` = **0 registros** medidos; nenhum CPF
real existe hoje no banco (§4).
**GATILHO DE REAVALIAÇÃO NOMEADO:** **na primeira carga real de funcionários na tabela
`employees` — isto é, na promoção do módulo `rh`/`employees` a produção real — esta
severidade passa a BLOQUEANTE de release.** O gatilho **não** é o Go-Live formal: por
`APR-2026-016`, dado real de negócio conta como produção **independentemente do rótulo
de Go-Live**. Basta **um** funcionário real cadastrado para o gatilho disparar.
**DETECTED_BY:** `T-33_RASOS_BLOCO_A.md` §`T33-A-F03` (fieldwork de fechamento dos 43
endpoints rasos) → **promovido a finding formal** por
`vericore-audit-evidence-controller` (esta análise, releitura própria integral).

---

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** Promoção a finding formal **e severidade
   HIGH** determinadas por decisão direta do dono do CoreTriad nesta sessão. **Este
   agente não reavalia a severidade para baixo.** A evidência lida a sustenta; a única
   ressalva que registro é de **confiança sobre explorabilidade** (§3.3), não de mérito.
2. **Regra 22 — validação adversarial NÃO OCORREU.** Sendo HIGH, a passagem pelo
   `vericore-finding-validator` é **obrigatória antes de qualquer remediação**. Nada
   aqui a declara feita.
3. **Vínculo determinado pelo dono:** `FIND-ERP-006` (LGPD — HIGH, `APR-2026-018`,
   `coretriad/governance/APPROVALS.md:435`). Vínculo **conferido em disco** e mantido
   (§7).
4. **Separação de findings determinada pelo dono e cumprida.** A divergência documental
   (`BRIEF_RH_2026-08-06.md` declarando BR-RH-020 *"REMEDIADO"*) foi registrada como
   **finding próprio e separado** — `AUD-PROC-DOCDRIFT-01` — **sem fusão**, porque um é
   defeito de produto e o outro é defeito de governança documental.
5. **Regra 2 — nada foi corrigido.** `server/` foi **apenas lido**.
6. **Regras 4 e 14 — nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED`.**
7. **Nenhum comando executado, nenhuma conexão de banco.** **Nenhum CPF, nome de pessoa
   ou qualquer dado pessoal foi lido, consultado, citado ou reproduzido** — este agente é
   fiel depositário de evidência e está vedado de reproduzir dado sensível na evidência
   persistida. Toda a análise é sobre **código**, nunca sobre **dados**.

---

## 1. DESCRIPTION — os quatro fatos, cada um reverificado

### 1.1 A rota exige **apenas** sessão autenticada

`server/src/modules/employees/presentation/routes/employees.ts`:

```
:19   router.get('/',    authenticate, employeeController.list);
:20   router.get('/:id', authenticate, employeeController.getById);
:21   router.post('/',   authenticate, authorize('admin'), employeeController.create);
:22   router.put('/:id', authenticate, authorize('admin'), employeeController.update);
:23   router.delete('/:id', authenticate, authorize('admin'), employeeController.remove);
```

As **escritas** exigem `admin` (`:21-23`). A **leitura** exige só `authenticate`
(`:19-20`) — **nenhum `authorizeModule('rh')`**. O próprio JSDoc do arquivo declara a
decisão de desenho (`:6-17`): *"a segregação de campos sensíveis de RH ... acontece
dentro dos use cases ..., **não no roteamento**: a rota continua liberada para
consumidores legítimos que só precisam de nome/departamento/cargo"*.

**Registro de precisão, não de acusação:** a decisão de desenho é **defensável** e está
documentada — existem consumidores legítimos (seletor de operador do apontamento,
resolução do departamento do usuário logado). **O defeito não é a rota estar aberta. O
defeito é que a borda de segregação foi colocada só na saída.**

### 1.2 A máscara de saída existe, funciona, e é boa

`server/src/modules/employees/domain/services/employeeSensitiveFields.ts`:

- `:36-51` — `SENSITIVE_EMPLOYEE_FIELDS` = 14 campos: `cpf`, `rg`, `pis_pasep`, `ctps`,
  `salary`, `salary_type`, `bank_name`, `bank_agency`, `bank_account`,
  `bank_account_type`, `pix_key`, `address`, `phone`, `pcd`.
- `:66-70` — `hasFullEmployeeAccess(user)`: `admin` sempre vê; qualquer outro só se
  `user.permissions?.rh` existir, em qualquer nível.

**Conformidade a registrar com o mesmo peso de finding (para não virar falso positivo):**
esta lista é **cuidadosa e evoluiu por auditoria anterior** — o JSDoc `:28-34` registra
que `pcd` foi adicionado por achado de auditoria cruzada, porque *"sem esta adição, a
condição de PCD de qualquer funcionário ficaria visível a todo autenticado"*. **A
máscara de resposta não é o defeito. Ela funciona.** O defeito é que ela é a **única**
borda.

### 1.3 O filtro de entrada fica **fora** dessa borda

`server/src/modules/employees/infrastructure/sequelize/SequelizeEmployeesRepository.ts`:

```ts
:18   const { search, status, department_id, user_id } = filters as any;
:19   const where: any = {};
:20   if (search) {
:21     const s = Validators.sanitizeSearch(search);
:22     where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { cpf: { [Op.like]: `%${s}%` } }];
:23   }
...
:32-38  return Employee.findAndCountAll({ where, include: [...Department...], limit, offset, order: [['name','ASC']] });
```

`cpf` é **critério de busca** por substring, para **qualquer** requisitante autenticado —
inclusive quem não tem `permissions.rh` e portanto **jamais verá o campo na resposta**.

### 1.4 O sanitizador **não** ajuda aqui — verificado, não presumido

Poderia haver a hipótese de que `sanitizeSearch` neutralizasse buscas por dígitos. **Não
neutraliza.** `server/src/utils/validators.ts:163-166`:

```ts
static sanitizeSearch(str?: string | null): string {
  if (!str) return '';
  return String(str).replace(/[%_]/g, '\\$&');
}
```

Ele escapa **exclusivamente** os coringas `%` e `_` do `LIKE` — defesa correta contra
injeção de wildcard, **e nada mais**. Dígitos passam intactos. **Verifiquei esta
hipótese refutadora explicitamente porque, se ela se confirmasse, o finding seria falso
positivo.** Ela não se confirma.

---

## 2. O MECANISMO DE RECONSTRUÇÃO

O ataque **não** lê o CPF. Ele o **adivinha com confirmação**, um dígito por vez:

1. O atacante autenticado (qualquer perfil, sem `rh`) envia `?search=0`, `?search=1`, …
   `?search=9`.
2. Para cada consulta a API responde com a lista de funcionários cujo `name` **ou** `cpf`
   contém aquele fragmento — com `cpf` removido, mas **com `name` presente**.
3. O `name` funciona como **oráculo de identidade**: o atacante sabe *qual pessoa* casou
   com o fragmento, mesmo sem ver o número.
4. Fixado o alvo, ele refina por prefixo — `?search=1`, `?search=12`, `?search=123`, … —
   e observa em qual refinamento o alvo **permanece** no resultado.
5. Por ser `LIKE %...%` (substring, não prefixo), o oráculo é ainda mais permissivo: o
   atacante pode testar fragmentos internos e ancorar o número por pedaços.

**Os três elementos que, juntos, fecham o vazamento:**

| Elemento | Sozinho é problema? | Âncora |
|---|---|---|
| Rota aberta a todo autenticado | Não — é decisão de desenho documentada | `employees.ts:19` |
| `cpf` filtrável por `LIKE %...%` | Não — se a rota fosse restrita a `rh` | `SequelizeEmployeesRepository.ts:22` |
| `name` visível na resposta | Não — é o dado que os consumidores legítimos precisam | `employeeSensitiveFields.ts:36-51` (`name` **não** está na lista) |

**A composição dos três é o achado.** Nenhum deles isoladamente seria finding — e é
exatamente por isso que passou por todas as revisões anteriores.

---

## 3. EXPLORABILIDADE REAL — o que sustenta e o que limita

### 3.1 Quem consegue

**Qualquer usuário autenticado**, com qualquer perfil de acesso, inclusive um sem
nenhum módulo atribuído. Não precisa de `admin`, não precisa de `rh`, não precisa
explorar falha nenhuma de autenticação. Basta um token válido.

### 3.2 Ordem de grandeza do esforço (derivada, não medida)

CPF tem 11 dígitos, dos quais 2 são verificadores calculáveis a partir dos 9 primeiros —
o atacante só precisa reconstruir **9**. Com refinamento por prefixo, ~10 consultas por
dígito ⇒ **ordem de 90–110 requisições por funcionário-alvo**. É trabalho de script, não
de força bruta pesada.

### 3.3 O que **limita** — registrado com honestidade, e é o motivo da confiança `HIGH` e não `CONFIRMED` no eixo de explorabilidade

Existe limitador de taxa global na API — `server/app.ts:105-116`:

```ts
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: runtimeEnv.nodeEnv === 'test' ? 100000 : 300,
  keyGenerator: apiRequestKey,
  ...
});
```

**300 requisições por janela de 15 minutos** fora de `NODE_ENV=test`.

**Leitura honesta desse número: é mitigação parcial, e fraca para este vetor.** O
orçamento de ~110 requisições por alvo **cabe folgadamente** dentro de uma única janela
de 300. O limitador tornaria custosa a extração *em massa* de centenas de CPFs, mas
**não impede** a reconstrução do CPF de um alvo específico — que é o cenário de dano
mais provável (um funcionário determinado, por um colega). Registro o limitador porque
**omiti-lo inflaria o finding**; registro sua insuficiência porque **superestimá-lo o
esvaziaria**.

**Por que o eixo de explorabilidade é `HIGH` e não `CONFIRMED`:** a viabilidade do
refinamento é derivada por leitura de código e aritmética de requisições. **Nenhuma
requisição foi feita**, nenhum banco foi consultado (`APR-2026-016`). A confirmação
definitiva depende de execução dinâmica autorizada contra `erp_evok_audio_test` com
dados **sintéticos** — proposta em §6 como `DYN-RH-01`, **não executada**.

### 3.4 O que **não** limita

- **Não há trilha de auditoria deste acesso.** A rota é `GET`; não há `logAction` no
  caminho de leitura. A enumeração seria **invisível** ao `auditLogs` — que é módulo de
  **produção real** por `APR-2026-016`. Converge com a família de achados de `T-03`
  (`AUD-DB-04`…`-09`) e `T18A-F01`…`F11` **sem duplicá-la** (Regra 15).
- **Não há teste que cubra o vetor.** `T33-A-F03` registra que
  `employees-use-cases.test.ts` cobre a máscara da resposta (`:103,117,178`) e **não**
  cobre o filtro — fato herdado da trilha de origem, **não** reverificado por mim
  (declarado como lacuna em §8).

---

## 4. AMBIENTE — verificação própria da premissa do dono (Regra 20)

Instruído a verificar eu mesmo, li `coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md`:

| Módulo | Classificação em disco | Âncora |
|---|---|---|
| `employees` | **NÃO-PRODUÇÃO** — *"0 registros medidos"*, confiança **ALTA** | `PRODUCTION_STATUS_MAP.md:135` |
| `rh` | **NÃO-PRODUÇÃO** — *"Depende de `employees` (0)"*, confiança **ALTA** | `:162` |

Evidência primária de dados (`:96`, tabela medida em 2026-08-12): `employees` = **0
registros**, nota da fonte *"sem apontamento nominal de produção"*.

**CONCLUSÃO: a premissa do dono se confirma. NENHUMA CONTRADIÇÃO A REGISTRAR.** Com zero
funcionários cadastrados, **não existe CPF a reconstruir hoje**. O risco é integralmente
prospectivo.

**Registro obrigatório de fronteira (a parte que o encargo mandou não esquecer):** por
`APR-2026-016` (`APPROVALS.md:339-344`) e `PRODUCTION_STATUS_MAP.md:130,132`, a conta
`admin` de `users` e o módulo `auditLogs` **SÃO produção real**. Isso é materialmente
relevante para **este** finding por dois motivos, e por isso não é nota de rodapé:

1. **O atacante hipotético autentica-se contra `auth`, que é produção real** (`:131`) — o
   vetor atravessa um módulo de produção mesmo que o dado-alvo esteja num módulo vazio.
2. **A ausência de trilha de auditoria (§3.4) é ausência num módulo de produção real.**
   Quando `employees` receber dado real, a enumeração ocorrerá sem registro no
   `auditLogs` que **já hoje** é tratado como produção.

Ambos reforçam o **gatilho de reavaliação nomeado**: o disparo é a primeira linha real em
`employees`, não uma cerimônia de Go-Live.

---

## 5. IMPACTO

**PRIVACY_IMPACT (o eixo principal):** CPF é dado pessoal sob a LGPD (Lei 13.709/2018).
A cadeia relevante: **art. 6º, VII (segurança)** e **art. 46** (medidas técnicas aptas a
proteger o dado de acessos não autorizados) — o controle existe na saída e **não** na
entrada, o que é falha de adequação da medida técnica; e **art. 6º, III (necessidade)** —
a busca por CPF não é necessária a um requisitante que sequer pode ver CPF. A trilha de
origem cita ainda o art. 5º (definição de dado pessoal). **Não faço juízo jurídico sobre
sanção ou enquadramento sancionatório** — isso é matéria de decisão humana com assessoria
jurídica (Regra 6); registro os dispositivos porque a evidência os endereça diretamente.

**BUSINESS_IMPACT:** o cenário concreto de dano é interno e mundano — um colega de outro
setor, com acesso legítimo ao ERP para outra finalidade, obtém o CPF de um funcionário
específico. Não requer sofisticação, não deixa rastro, e derrota exatamente o controle
que a empresa construiu e documentou como implantado. É também o tipo de achado que uma
auditoria externa de LGPD encontra em primeira passagem.

**SECURITY_IMPACT:** classe **"o dado protegido na saída é recuperável pela entrada"** —
canal lateral por parâmetro de consulta. O achado é estrutural e vale como **padrão a
varrer**: qualquer campo em `SENSITIVE_EMPLOYEE_FIELDS` que também seja filtrável tem o
mesmo problema. **Verifiquei este ponto e o registro com precisão: no `AUDIT_COMMIT`,
apenas `cpf` é filtrável** (`SequelizeEmployeesRepository.ts:22` — os demais filtros são
`status`, `department_id`, `user_id`, `:24-31`). **Nenhum outro campo sensível é
filtrável hoje.** O risco de reincidência é de manutenção futura, não de superfície
atual — e essa distinção importa para dimensionar a remediação.

---

## 6. RECOMMENDATION

**SUGGESTED_REMEDIATION_OWNER: SanaCore** (Regra 3), **após** validação adversarial
obrigatória (Regra 22).

Opções, com o custo de cada uma declarado — **a escolha é da SanaCore com o dono, não
deste agente**:

1. **Condicionar o filtro por `cpf` à mesma função que já governa a saída.** Aplicar
   `hasFullEmployeeAccess(user)` (`employeeSensitiveFields.ts:66-70`) também na
   construção do `where`: quem não pode ver `cpf` não pode filtrar por `cpf`. **Menor
   custo, reusa o controle existente, preserva o desenho documentado da rota.** Custo:
   exige propagar o contexto do usuário até o repositório, que hoje recebe só `filters`.
2. **Remover `cpf` do `Op.or` e criar busca por CPF em endpoint próprio** com
   `authorizeModule('rh')`. Mais limpo arquiteturalmente; quebra qualquer consumidor
   atual que dependa de buscar por CPF na listagem geral — **levantar consumidores antes**.
3. **Exigir `rh` na rota inteira** (`employees.ts:19`). **Contraindicado sem análise:**
   contraria a decisão de desenho documentada em `:6-17` e quebraria os consumidores
   legítimos ali nomeados (seletor de operador, resolução de departamento).
4. **Independente da opção — instrumentar a trilha.** Registrar acesso de listagem com
   `search` no `auditLogs`, ao menos para buscas que casem padrão numérico. Endereça
   §3.4 e é o item que impede que a próxima variante do vetor seja invisível.

**Verificação estrutural que a remediação deveria incluir:** um teste que reprove
qualquer campo de `SENSITIVE_EMPLOYEE_FIELDS` que venha a ser adicionado ao `where` de
busca — transformando o achado pontual em invariante.

**Reprodução dinâmica proposta (NÃO executada; exige autorização do director e o banco
`erp_evok_audio_test` com dados SINTÉTICOS — jamais o banco real, `APR-2026-016`):**

| ID sugerido | Cenário | Asserção |
|---|---|---|
| `DYN-RH-01` | Usuário autenticado **sem** `permissions.rh`; funcionário sintético com CPF conhecido; sequência de `GET /api/employees?search=<prefixo>` | O conjunto-resposta discrimina prefixo correto de incorreto ⇒ o oráculo existe. Fecha o eixo de explorabilidade de `HIGH` para `CONFIRMED` |
| `DYN-RH-02` | Mesma sequência, contando requisições até esgotar o `apiLimiter` | Mede se ~110 requisições cabem na janela de 300 — quantifica a mitigação de §3.3 |
| `DYN-RH-03` | Inspecionar `audit_logs` após `DYN-RH-01` | Confirma que a enumeração não deixa rastro (§3.4) |

**Nenhum desses cenários pode usar CPF real.**

---

## 7. RASTREABILIDADE

**RELATED_PROCESS:** consulta de funcionários / proteção de dado pessoal de RH
**RELATED_BUSINESS_RULE:** **`BR-RH-020`** — *"Dados de RH (salário, CPF, dados
bancários, CID, dependentes) são pessoais/sensíveis: acesso segregado por perfil próprio
de RH"* (`docs/business/briefs/BRIEF_RH_2026-08-06.md:158`). **A regra existe, está
versionada, e é exatamente a que este caminho viola.** O mesmo artefato a declara
*"REMEDIADO"* — divergência tratada em finding **separado**, `AUD-PROC-DOCDRIFT-01`.
**RELATED_REQUIREMENT:** LGPD arts. 6º III, 6º VII e 46; OWASP ASVS V4 (controle de
acesso a nível de função e de dado). **Nenhum NFR versionado do ERP** fixa política de
exposição de dado pessoal por parâmetro de consulta — lacuna de requisito registrada.
**RELATED_USE_CASE:** `ListEmployeesUseCase` (o use case aplica a máscara; **não**
governa o filtro).
**RELATED_ACCEPTANCE_CRITERIA:** nenhum AC formal versionado.
**RELATED_TEST:** `server/tests/.../employees-use-cases.test.ts` — cobre a **máscara**
(`:103,117,178`), **não** cobre o **filtro**. **Fato herdado de `T33-A-F03`, não
reverificado por mim** (§8).

**RELATED_FINDINGS:**
- **Origem:** `T33-A-F03` (`T-33_RASOS_BLOCO_A.md:71-91`) — esta é a **promoção formal**.
- **Vinculado por decisão do dono:** **`FIND-ERP-006`** (LGPD — sem cadastro de DPO;
  retenção sem enforcement — HIGH, `APR-2026-018`, `APPROVALS.md:435`). Vínculo conferido
  e mantido. **Registro a diferença material, para não fundir indevidamente:**
  `FIND-ERP-006` trata de **governança de privacidade** (DPO, retenção); este trata de
  **um caminho técnico concreto de vazamento**. São o mesmo domínio de conformidade, não
  o mesmo defeito. O vínculo é de **cluster LGPD**, não de subsunção.
- **Separado por determinação do dono, NÃO fundido:** `AUD-PROC-DOCDRIFT-01` — a
  divergência documental.
- **Convergente, não duplicado:** família de ausência de trilha de auditoria — `AUD-DB-03`
  e `AUD-DB-04`…`-09` (T-03), `T18A-F01`…`F11`, `T27-SST-F06`. Eixos distintos;
  **não se duplica severidade sobre trilha alheia** (Regra 15, conforme o precedente
  `C-20`/`C-21` de `T-26_CONSOLIDACAO_RODADA2.md:532-533`).
- **Vizinho, não coberto aqui:** `T33-A-F04` (BR-RH-024 não implementada no DELETE) —
  mesmo módulo, defeito distinto.

**REFERENCE:** `T-33_RASOS_BLOCO_A.md:71-91`; `PRODUCTION_STATUS_MAP.md:96,135,162`;
`APPROVALS.md:318-351,435`; `BRIEF_RH_2026-08-06.md:23,158,178,219`;
`CLAUDE.md` Regras 2, 4, 6, 14, 15, 18, 20, 22.

**ROOT_CAUSE_HYPOTHESIS:** A remediação de `BR-RH-020`, executada em 2026-08-06, modelou
o problema como **"campo sensível na resposta"** e construiu, com cuidado real, uma borda
de saída — `SENSITIVE_EMPLOYEE_FIELDS` + `hasFullEmployeeAccess`, aplicada nos use cases.
A **borda de entrada** (o `where` montado no repositório) ficou numa camada diferente,
abaixo do use case, e **não foi alcançada pela mesma abstração**. A separação em Clean
Architecture, que é correta, colocou o controle e o vazamento em camadas distintas: o use
case sabe **quem pergunta**, o repositório sabe **o que é perguntado**, e nenhum dos dois
sabe as duas coisas. Não houve teste que atravessasse as duas camadas com um requisitante
sem `rh`, e por isso a lacuna sobreviveu à remediação, à suíte e à declaração de
conclusão.

**RETEST_SPECIFICATION** (a ser executada **por VeriCore**, após remediação da SanaCore —
Regra 4; nada aqui declara reteste feito):

(a) **Prova negativa do oráculo.** Requisitante autenticado **sem** `permissions.rh` e
**sem** `role='admin'`: `GET /api/employees?search=<fragmento numérico que casa o CPF de
um funcionário sintético>` **não** retorna aquele funcionário por conta do CPF. Repetir
com fragmento que casa o `name` — **deve** retornar, provando que a busca por nome
permanece funcional e que a correção **discrimina**, não bloqueia indiscriminadamente.
(b) **Prova positiva do caminho legítimo.** Requisitante **com** `permissions.rh` (e,
separadamente, `admin`) continua podendo buscar por CPF e continua vendo os campos
sensíveis — a correção não pode ter quebrado RH.
(c) **Consumidores legítimos preservados.** Os casos nomeados no JSDoc de
`employees.ts:6-17` (seletor de operador do apontamento; resolução de `department_id` por
`user_id`) continuam funcionando para requisitante sem `rh`.
(d) **Invariante estrutural.** Existe teste automatizado que **falha** se qualquer campo
de `SENSITIVE_EMPLOYEE_FIELDS` (`employeeSensitiveFields.ts:36-51`) for adicionado ao
`where` de busca sem verificação de acesso. Um teste que apenas exercite `cpf` **não
satisfaz** este item.
(e) **Trilha.** Se o item 4 de §6 for adotado: existe evidência de execução mostrando que
uma sequência de enumeração **aparece** no `audit_logs`.
(f) **Documentação.** O reteste **não** pode ser declarado satisfeito enquanto
`BRIEF_RH_2026-08-06.md` estiver em estado que induza a mesma falsa confiança — cruzar
obrigatoriamente com `AUD-PROC-DOCDRIFT-01`. **Este item cria dependência entre os dois
findings sem fundi-los.**
(g) **Não regressão.** Suíte de `employees` e `server-ci.yml` completos passam.

---

## 8. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **Âncoras reverificadas por leitura própria nesta sessão:** `employees.ts:19-23`;
  `employeeSensitiveFields.ts:36-51,66-70`; `SequelizeEmployeesRepository.ts:18-38`;
  `validators.ts:163-166`; `app.ts:105-116`; `BRIEF_RH_2026-08-06.md:158`;
  `PRODUCTION_STATUS_MAP.md:96,135,162`.
- **Fatos herdados de `T33-A-F03` e NÃO reverificados por mim, declarados como lacuna:**
  (i) o conteúdo de `employees-use-cases.test.ts:103,117,178` — a afirmação de que a
  suíte cobre a máscara e não o filtro é **de terceiro**; (ii) o enquadramento em
  dispositivos específicos da LGPD, que reproduzo como citação da trilha de origem com
  meu próprio raciocínio de adequação, **sem parecer jurídico**.
- **Nenhum comando executado**, nenhuma conexão de banco, nenhuma requisição HTTP.
- **Nenhum arquivo do objeto auditado criado ou alterado** (Regra 2).
- **Nenhum CPF, nome de pessoa, credencial ou valor de segredo foi lido, citado,
  mascarado ou reproduzido.** Toda a evidência é sobre estrutura de código.
- **Limite de escopo:** cobre **exclusivamente** o vetor `?search=` sobre `cpf` em
  `GET /api/employees`. **Não** constitui varredura de outros endpoints por vetor
  equivalente (filtro sobre campo mascarado) — **essa varredura permanece lacuna aberta**
  e é recomendada como trilha própria.

**ARQUIVOS LIDOS NESTA ANÁLISE (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\employees\presentation\routes\employees.ts` (integral)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\employees\infrastructure\sequelize\SequelizeEmployeesRepository.ts` (parcial: 1-45)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\modules\employees\domain\services\employeeSensitiveFields.ts` (parcial: 25-79)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\src\utils\validators.ts` (parcial, por consulta dirigida: 161-177)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\app.ts` (parcial: 103-124 + grep)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\business\briefs\BRIEF_RH_2026-08-06.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-33_RASOS_BLOCO_A.md` (parcial: 1-111)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\states\ERP-LEGACY-001\PRODUCTION_STATUS_MAP.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\governance\APPROVALS.md` (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\AUD-DEP-JSYAML-01.md` (referência de estrutura)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`

---

*Produzido e persistido por `vericore-audit-evidence-controller` — ponto único de
persistência de evidência em `audit/` (§23 do Master Spec). STATUS permanece `PROPOSED`.
A validação adversarial pelo `vericore-finding-validator` **não ocorreu** e é
**obrigatória** antes de qualquer remediação (Regra 22).*
