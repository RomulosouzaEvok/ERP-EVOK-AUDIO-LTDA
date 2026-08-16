# FINDING

```
FINDING_ID:   AUD-DEP-JSYAML-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

**TITLE:** `js-yaml` 3.15.0 vulnerável presente no lock de `server` — dependência
**exclusivamente de desenvolvimento** (`dev: true`), com um único pai
(`@istanbuljs/load-nyc-config`), alcançável apenas sob `jest --coverage` e apenas se
existir um `.nycrc.yml`/`.nycrc.yaml` — que **não existe** no `AUDIT_COMMIT`.

**DOMAIN:** supply-chain / dependency-security
**SUBDOMAIN:** transitive-dependency / known-vulnerability / dev-tree
**SEVERITY:** **LOW** — ver §4; o rótulo **HIGH** é do scanner (`npm audit`), não do sistema real
**CONFIDENCE:** `CONFIRMED` quanto à **presença e versão** (leitura direta do lock) ·
`MEDIUM_CONFIDENCE` quanto à **identidade do CVE** (não verificável por leitura de
artefato do repositório — lacuna declarada em §2.3)
**STATUS:** `PROPOSED`
**DETECTED_BY:** `vericore-audit-verification-runner` (`DYN-T18-03`, evidência de
execução) → registrado como observação não promovida `OBS-T26-01` por
`vericore-audit-consolidator` → **promovido a finding formal** por
`vericore-dependency-security-auditor` (esta análise, leitura estática própria)

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** A promoção deste achado a finding formal
   foi determinada por **decisão direta do dono do CoreTriad nesta sessão**, em texto:
   *"Promova o achado js-yaml HIGH a finding formal e priorize para a SanaCore avaliar a
   atualização da dependência, independente da decisão sobre o G3."* Não é inferência de
   agente. A decisão autoriza a **promoção e a priorização**; **não fixa a severidade** — a
   classificação de severidade permanece juízo técnico de auditoria, e está fundamentada
   abaixo pela explorabilidade real.
2. **Regra 22 — validação adversarial NÃO OCORREU.** Este finding **não passou** pelo
   `vericore-finding-validator`. Se a severidade for contestada e restabelecida em HIGH, a
   passagem pelo validador é **obrigatória antes de seguir à remediação**. Nada aqui
   declara a validação como feita.
3. **Regra 2 — nada foi corrigido.** Nenhum arquivo do objeto auditado foi alterado.
   `package.json` e `package-lock.json` foram **apenas lidos**. Nenhum `npm install`,
   `npm audit`, `npm audit fix` ou qualquer comando foi executado por este agente (sem
   toolset de execução).
4. **Regras 4 e 14 — nenhum `FINDING CLOSED`, `RETEST_PASSED` ou `AUDIT_PASSED` é
   declarado.**
5. **Delta (Regra 14):** fato fornecido pelo orquestrador —
   `git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database`
   retorna **vazio**. Registro adicional próprio: `server/package.json` e
   `server/package-lock.json` **não estão nesse conjunto de caminhos**, portanto o diff
   citado **não** prova ausência de mudança nos manifestos. Todas as leituras abaixo são do
   working tree. **Ressalva mantida**, herdada de `RES-T18-01`.

---

## 1. DESCRIPTION — o fato, estabelecido por leitura própria

### 1.1 `js-yaml` NÃO é dependência direta de `server`

`server/package.json` foi lido integralmente (72 linhas). `js-yaml` **não aparece** em
nenhuma das três listas:

- `dependencies` — `server/package.json:29-47` (16 pacotes: `bcryptjs`, `cors`,
  `decimal.js`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`,
  `multer`, `nodemailer`, `pdfkit`, `pg`, `pg-hstore`, `qrcode`, `sequelize`, `winston`,
  `zod`)
- `devDependencies` — `server/package.json:52-71`
- `overrides` — `server/package.json:48-51` (apenas `uuid: ^11.1.1` e
  `brace-expansion: ^5.0.8`)

Grep dirigido por `js-yaml` em `server/package.json`: **zero ocorrências**. É
**dependência transitiva**.

### 1.2 Versão instalada e classificação de árvore

`server/package-lock.json:8877-8890`:

```json
"node_modules/js-yaml": {
  "version": "3.15.0",
  "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-3.15.0.tgz",
  "integrity": "sha512-ttBQIIQPDeLjpPOohtUdXuXUVoA2uIB6fEH9HyJ7234s5mBJ5wTx20njxplLZQgLaOfpmPQA7X2t5AX6tIPbog==",
  "dev": true,
  ...
}
```

Fatos, cada um com âncora:

| Fato | Âncora |
|---|---|
| Versão resolvida: **3.15.0** | `server/package-lock.json:8878` |
| **`"dev": true`** — pertence exclusivamente à árvore de desenvolvimento | `server/package-lock.json:8881` |
| Registry oficial (`registry.npmjs.org`), integridade `sha512` presente | `server/package-lock.json:8879-8880` |
| Existe **uma única** entrada `node_modules/js-yaml` no lock inteiro (sem duplicação em versões conflitantes) | grep `js-yaml` em `server/package-lock.json` → 4 ocorrências: `:1225`, `:8877`, `:8879`, `:8888` |

**Nenhum `.npmrc` existe em nenhum ponto do repositório** (Glob `**/.npmrc` → zero
arquivos). Não há registry alternativo configurado; o `Dockerfile:4` parametriza
`ARG NPM_REGISTRY=https://registry.npmjs.org/` com default oficial e declara
explicitamente (`Dockerfile:2-3`) que a integridade segue validada pelos hashes do lock.
**Sem sinal de dependency confusion, typosquatting ou registry não oficial neste pacote.**

### 1.3 Cadeia de pais — completa, com um único caminho

Rastreada por grep no lock, elo a elo:

```
server/package.json:65   devDependencies → "jest": "^30.4.2"
  └─ node_modules/babel-jest@30.4.1            (dev)  server/package-lock.json:4306-4320
  │    └─ "babel-plugin-istanbul": "^7.0.1"           server/package-lock.json:4315
  └─ node_modules/@jest/transform@30.4.1       (dev)  server/package-lock.json:2494-2512
       └─ "babel-plugin-istanbul": "^7.0.1"           server/package-lock.json:2504
            └─ node_modules/babel-plugin-istanbul@7.0.1   server/package-lock.json:4328-4347
                 └─ "@istanbuljs/load-nyc-config": "^1.0.0"   server/package-lock.json:4339
                      └─ node_modules/@istanbuljs/load-nyc-config@1.1.0   server/package-lock.json:1215-1231
                           └─ "js-yaml": "^3.13.1"    server/package-lock.json:1225
                                └─ RESOLVIDO: js-yaml@3.15.0  server/package-lock.json:8877-8890
```

**`@istanbuljs/load-nyc-config` é o único dependente declarado de `js-yaml` em todo o lock
de `server`** — grep por `"js-yaml":` retorna exatamente uma linha de declaração de
dependência (`:1225`) além da própria entrada do pacote (`:8877`) e do seu `bin` (`:8888`).
Não há segundo consumidor.

**Todos os elos da cadeia são `dev: true`**: `@istanbuljs/load-nyc-config` (`:1219`),
`@jest/transform` (`:2498`), `babel-plugin-istanbul` (`:4332`), `babel-jest` (`:4310`),
`js-yaml` (`:8881`). A raiz é `jest`, `devDependencies` (`server/package.json:65`).

---

## 2. A VULNERABILIDADE — o que é evidência e o que é lacuna

### 2.1 O que a evidência dinâmica registrou

Fonte citada como **origem**, sem reexecução por este agente:

`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/DYN_VERIFICACAO_BATERIA_01.md:114`
(`DYN-T18-03`, `npm audit --json`):

> `server` tem 1 vulnerabilidade **HIGH** ativa hoje: `js-yaml 3.0.0–3.15.0` —
> *"Quadratic CPU consumption in `!!omap` resolution"*, `CVE-2026-59870`, correção não
> retroportada, fix disponível via `npm audit fix` (dependência transitiva,
> `node_modules/js-yaml`).

Tabela do mesmo pedido (`DYN_VERIFICACAO_BATERIA_01.md:106-112`): `server` = 0 CRITICAL /
**1 HIGH** / 0 MODERATE / total 1.
Registro cruzado: `audit/runs/ERP-LEGACY-001-AUD-001/24-coverage/AUDIT_COVERAGE_EXECUTED.md:476`.
Registro como observação não promovida:
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-26_CONSOLIDACAO.md:828` (`OBS-T26-01`),
com herdeiro natural declarado **T-18**.

**Cruzamento que eu posso fazer e faço:** a versão que li no lock (**3.15.0**,
`server/package-lock.json:8878`) **cai dentro** da faixa vulnerável registrada
(`3.0.0–3.15.0`), no seu limite superior. O achado do scanner é **consistente com o
artefato versionado**.

### 2.2 Natureza da falha

Pelo texto do advisory reproduzido na evidência: **consumo quadrático de CPU na resolução
do tipo `!!omap`** — classe **DoS por complexidade algorítmica**, disparado por *conteúdo
YAML*. **Não** é execução remota de código, **não** é escrita de arquivo, **não** é
exfiltração. A gravidade depende inteiramente de o parser receber YAML de origem não
confiável e de o processo ser sensível a bloqueio de CPU.

### 2.3 LACUNA DECLARADA — não presuma o que não li

- **Não posso confirmar o identificador `CVE-2026-59870` por leitura de nenhum artefato do
  repositório.** Não há base de CVE offline, `npm audit` está vedado a este agente e não há
  acesso a feed externo. O identificador, a faixa afetada e o texto do advisory são
  **citados de `DYN_VERIFICACAO_BATERIA_01.md:114` como evidência de origem** — não
  verificados de forma independente.
- **Não posso determinar a versão corrigida.** A evidência é internamente tensa: registra
  *"correção não retroportada"* **e** *"fix disponível via `npm audit fix`"*. Se a correção
  não foi retroportada para a linha 3.x, então não existe `3.15.1+` corrigido e o
  `npm audit fix` só resolveria por salto de major (4.x) e/ou `--force`. **Não adjudico**
  essa contradição — ela é matéria para a SanaCore verificar contra o registry no momento
  da remediação, e está registrada em §7 como risco de quebra.
- Esta lacuna é a mesma que `T-18` declarou em `RES-T18-03`
  (`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:260`) e a razão pela qual a trilha classificou a
  categoria V14.2 Dependências como cobertura **Média-baixa** (`:34`): *"manifestos e locks
  lidos; nenhuma consulta a CVE/advisory"*. **Este finding fecha parcialmente `RES-T18-03`
  — apenas para este pacote, e apenas na medida da evidência dinâmica de origem.**

---

## 3. EXPLORABILIDADE REAL NESTE SISTEMA — a parte que separa finding de alerta de scanner

Quatro perguntas, quatro respostas ancoradas.

### 3.1 `js-yaml` é carregado em algum código do `server`?

**Não, em nenhum ponto do código de aplicação.**

- Grep case-insensitive por `js-yaml|jsyaml|yaml` em **todo `server/src`**: **zero
  ocorrências**.
- Grep case-insensitive por `yaml|\.yml|\.yaml` em **todos os `*.ts` de `server/`**: **zero
  ocorrências**.

Nenhum `import`/`require` de `js-yaml`, e nenhuma manipulação de YAML de qualquer espécie,
existe no servidor. **Não há caminho de request, de webhook, de upload ou de job que
alcance um parser YAML.**

### 3.2 Onde, então, o pacote é efetivamente carregado?

Em **um único ponto**, dentro da ferramenta de cobertura de testes. Verificado por leitura
da árvore instalada:

`server/node_modules/@istanbuljs/load-nyc-config/index.js:59-83`:

```js
async function actualLoad(configFile) {
  ...
  const configExt = path.extname(configFile).toLowerCase();
  switch (configExt) {
    case '.js':  ...
    case '.cjs': return require(configFile);        // :74
    case '.mjs': ...
    case '.yml':
    case '.yaml':
      return require('js-yaml').load(await readFile(configFile, 'utf8'));   // :80
    default:
      return JSON.parse(await readFile(configFile, 'utf8'));
  }
}
```

O conjunto de arquivos candidatos é fechado e literal —
`server/node_modules/@istanbuljs/load-nyc-config/index.js:19-27`:

```js
const standardConfigFiles = [
  '.nycrc', '.nycrc.json', '.nycrc.yml', '.nycrc.yaml',
  'nyc.config.js', 'nyc.config.cjs', 'nyc.config.mjs'
];
```

Ou seja: **o único YAML que `js-yaml` chega a parsear neste projeto é um arquivo de
configuração de cobertura chamado `.nycrc.yml` ou `.nycrc.yaml`, procurado no disco a
partir do `cwd`** (`index.js:38-40`, via `find-up`). O invocador é `babel-plugin-istanbul`
(`server/node_modules/babel-plugin-istanbul/lib/index.js:26-31,68` — `loadNycConfig`).

### 3.3 O YAML processado é de origem não confiável?

**Não. E o arquivo sequer existe.**

- **Glob `**/.nycrc*` em todo o repositório:** todas as ocorrências são `.nycrc` (**JSON**,
  não YAML) **dentro de `node_modules/` de terceiros** (`hasown`, `qs`, `get-intrinsic`,
  `object-inspect`, `side-channel*`, etc.). **Não existe nenhum `.nycrc.yml` nem
  `.nycrc.yaml` em lugar nenhum do repositório** — nem em `server/`, nem na raiz, nem em
  qualquer projeto. O ramo `case '.yml'` de `index.js:78-80` é, no `AUDIT_COMMIT`,
  **inalcançável**.
- **Nenhum upload, request, header ou config remota** chega a esse caminho: o único insumo
  é um arquivo de disco encontrado por `find-up` a partir do `cwd` do processo de teste.
- **`load()` vs. `safeLoad`:** o call site usa `.load()` (`index.js:80`), a variante de
  schema completo na linha 3.x da biblioteca — o que, em tese, é a forma menos restrita.
  **Registro isso como precisão técnica, não como agravante material**, por dois motivos:
  (a) o CVE em questão é de **consumo de CPU**, não de desserialização perigosa; (b) o
  mesmo carregador **`require()` diretamente** `nyc.config.js`/`.cjs` (`index.js:74`) — ou
  seja, **quem consegue plantar um arquivo de configuração no projeto já tem execução
  arbitrária de código por desenho, sem precisar de nenhum CVE**. O parser YAML não amplia
  essa superfície em nada.

### 3.4 O caminho chega a executar?

**Praticamente nunca, e nunca em produção.** Quatro barreiras independentes, cada uma
suficiente:

| # | Barreira | Âncora |
|---|---|---|
| **B1** | **Fora da imagem de produção.** O build faz `npm prune --omit=dev` antes de copiar `node_modules` para o estágio de runtime. Como `js-yaml` é `dev: true`, **ele não existe no contêiner que roda em produção** | `server/Dockerfile:16` (prune) → `:25` (cópia de `node_modules` do estágio `build`); `server/package-lock.json:8881` (`dev: true`) |
| **B2** | **O transform de teste não é o Babel.** O Jest do projeto usa `@swc/jest`, não `babel-jest`. A instrumentação do `babel-plugin-istanbul` só é aplicada quando `options.coverageProvider === 'babel'` | `server/jest.config.cjs:4-6`; `server/node_modules/@jest/transform/build/index.js:529,545` |
| **B3** | **Cobertura nunca roda em CI.** `.github/workflows/server-ci.yml` executa `test:unit:strict` (`:68`) e `test:api:strict` (`:72`) — **nenhum passo usa `--coverage`**. `test:coverage` (`server/package.json:21`) é script manual, sem chamador em nenhum workflow | `.github/workflows/server-ci.yml` (124 linhas, lidas integralmente) |
| **B4** | **O arquivo YAML alvo não existe.** Sem `.nycrc.yml`/`.nycrc.yaml`, `actualLoad` cai no ramo `default` (JSON) ou não é chamado | Glob `**/.nycrc*` — zero YAML fora de `node_modules` de terceiros |

**Cadeia de exploração completa que seria necessária:** um atacante precisaria (1) obter
**write access ao repositório ou à máquina do desenvolvedor**, (2) plantar um `.nycrc.yml`
com payload `!!omap` patológico, e (3) esperar que alguém rode `npm run test:coverage`
**e** com `coverageProvider: 'babel'`. No passo (1) ele já poderia, mais simplesmente,
plantar `nyc.config.js` e obter **execução de código arbitrária** via `index.js:74` — ou
alterar o próprio código-fonte do ERP. **O CVE não adiciona capacidade alguma a um atacante
que já satisfaça sua pré-condição.**

---

## 4. FUNDAMENTAÇÃO DA SEVERIDADE — por que **LOW**, e não HIGH

**O rótulo HIGH é o CVSS base do advisory, atribuído ao pacote isolado, sem conhecimento do
sistema.** Este é um relatório de auditoria de um sistema real; a severidade tem que
refletir o sistema real.

| Fator que sustentaria HIGH | Estado verificado neste sistema |
|---|---|
| Parser exposto a entrada não confiável | **Refutado.** Zero referências a YAML em `server/src`; o único insumo possível é um arquivo de config de cobertura, de disco, que não existe |
| Presente no runtime de produção | **Refutado.** `dev: true` + `npm prune --omit=dev` (`Dockerfile:16`) |
| Impacto de confidencialidade/integridade | **Refutado.** A falha é consumo quadrático de CPU (DoS), não RCE nem desserialização |
| Alcançável no fluxo normal | **Refutado.** Quatro barreiras independentes (B1–B4); o ramo de código é inalcançável no `AUDIT_COMMIT` |
| Pré-condição do atacante é barata | **Refutado.** Exige write access ao repo/máquina de dev — nível em que já existe RCE por desenho no mesmo carregador (`index.js:74`) |

**O que resta, e sustenta LOW em vez de INFO — risco real, ainda que pequeno:**

1. **É higiene de cadeia de suprimentos de agente de build.** A árvore de dev roda em CI
   (`server-ci.yml:52`, `npm ci`) e nas máquinas de dois desenvolvedores. Uma
   vulnerabilidade de esgotamento de CPU num agente de build é uma condição de degradação
   real, ainda que sem impacto sobre dados do ERP.
2. **Existe um ponto cego de gate declarado, e ele é o achado estrutural mais útil deste
   finding.** `.github/workflows/server-ci.yml:75-77` roda
   `npm audit --omit=dev --audit-level=moderate` — **`--omit=dev` significa que a árvore de
   desenvolvimento nunca é auditada por gate nenhum.** Este `js-yaml` é a prova concreta de
   que existe uma classe inteira de dependências do projeto que **nenhum controle
   automatizado observa**. O gate de produção está corretamente desenhado; a lacuna é que a
   árvore de dev não tem gate algum, nem sequer informativo.
3. **A versão está no limite exato da faixa afetada (3.15.0 de 3.0.0–3.15.0)**, o que
   significa que qualquer republicação futura de advisory sobre a linha 3.x provavelmente
   também a alcançará.

**SEVERIDADE ATRIBUÍDA: LOW.**
**Confiança na presença do pacote e da versão: `CONFIRMED`** (leitura direta de
`server/package-lock.json:8877-8890`).
**Confiança na identidade do CVE: `MEDIUM_CONFIDENCE`** (dependente de evidência de
terceiro, não verificável por artefato do repositório — §2.3).

**Registro obrigatório, para não haver leitura silenciosa:** a decisão do dono determinou
**promoção e priorização**, e ela está integralmente cumprida — este finding existe, tem
ID, e vai à SanaCore com prioridade. A decisão **não determinou severidade**, e classificar
em HIGH um defeito cuja narrativa de dano está refutada em cinco eixos seria exatamente a
inflação de severidade que esta run existe para não cometer (mesmo critério aplicado pelo
consolidador em `T-26_CONSOLIDACAO.md` §3.2 ao rebaixar `T13-F01` e `T13-F04`: *"a
refutação é de explorabilidade, não de fato… impacto reduzido, severidade reduzida"*).

**Custo declarado deste rebaixamento:** ao ficar LOW, este finding **não entra** no regime
obrigatório da Regra 22. Registro para que isso não seja lido como dispensa: **se o
`vericore-finding-validator` ou o director restabelecerem HIGH, a validação adversarial
passa a ser obrigatória antes de qualquer remediação.** Recomendo que o validador o examine
de qualquer modo, porque a discordância com o scanner é o próprio mérito do finding.

---

## 5. VERIFICAÇÃO DE `client/`, `mobile/` e `tv/` — não misturar naturezas distintas

Grep por `js-yaml` em **todos** os `package-lock.json` do repositório (Glob
`**/package-lock.json` → 7 locks: raiz, `client`, `server`, `mobile`, `tv`,
`server/tmp/production-runtime-check`, `server/tmp/docker-runtime`):

| Projeto | `js-yaml` presente? | Versão | Pai | Na faixa vulnerável (3.0.0–3.15.0)? |
|---|---|---|---|---|
| `server` | **sim** | **3.15.0** (`server/package-lock.json:8878`) | `@istanbuljs/load-nyc-config` (`:1225`) | **SIM** — objeto deste finding |
| `client` | **não** | — | — | não aplicável |
| `mobile` | sim | **4.3.1** (`mobile/package-lock.json:4542`) | `@expo/xcpretty@4.4.4` → `js-yaml: ^4.1.0` (`mobile/package-lock.json:1568`) | **NÃO** — fora da faixa |
| `tv` | sim | **4.3.1** (`tv/package-lock.json:4520`) | `@expo/xcpretty@4.4.4` → `js-yaml: ^4.1.0` (`tv/package-lock.json:1469`) | **NÃO** — fora da faixa |
| raiz, `server/tmp/*` | **não** (zero ocorrências de `js-yaml`) | — | — | não aplicável |

**Declaração de separação, conforme exigido:** os **14 HIGH de `mobile`** e os **12 HIGH de
`tv`** registrados em `DYN_VERIFICACAO_BATERIA_01.md:106-114` e em
`T-26_CONSOLIDACAO.md:828` estão, segundo a própria evidência de origem, *"concentrados na
cadeia `@expo/*`/`metro`/`react-native*`"* e **não foram investigados individualmente** por
aquela bateria. **Nenhum deles é este `js-yaml`** — o `js-yaml` de `mobile`/`tv` é 4.3.1,
fora da faixa afetada. **Este finding não os cobre, não os subsome e não deve ser usado
como registro deles.** Permanecem como lacuna aberta, herdeiro natural T-18, e merecem
finding próprio após evidência de scan com detalhamento por pacote.

**Observação lateral, sem promoção a finding:** `mobile` e `tv` declaram `js-yaml` sem
marcação `dev` no lock (as entradas em `:4540` e `:4518` não têm `"dev": true`, ao
contrário da de `server`), o que significa que em Expo o pacote está na árvore de produção.
Como a versão está fora da faixa afetada, isso não gera achado hoje; registro porque muda o
cálculo caso um advisory futuro alcance a linha 4.x.

---

## 6. IMPACTO

**BUSINESS_IMPACT:** Nenhum impacto direto sobre dados, processos ou operação do ERP.
Nenhum fluxo de negócio (estoque, financeiro, fiscal, RH, jurídico) toca YAML. O impacto de
negócio é indireto e de governança: um item HIGH aberto em `npm audit` do `server` é um
bloqueador reputacional/documental em qualquer revisão de segurança de terceiro (cliente,
auditoria externa, due diligence), e custa tempo de resposta repetido enquanto não for
resolvido ou formalmente aceito.

**TECHNICAL_IMPACT:** Degradação potencial de CPU num processo de **teste com cobertura**, e
apenas mediante um arquivo `.nycrc.yml` malicioso que hoje não existe. Nenhum efeito sobre
o processo de runtime da API — o pacote não é instalado na imagem de produção
(`server/Dockerfile:16`).

**SECURITY_IMPACT:** Marginal quanto a este pacote. O impacto de segurança **material** é
estrutural e não é sobre `js-yaml`: **a árvore de desenvolvimento de `server` não é coberta
por nenhum gate automatizado de vulnerabilidade** (`.github/workflows/server-ci.yml:75-77`
usa `--omit=dev`), de modo que qualquer vulnerabilidade futura em ferramenta de build —
inclusive uma com execução de código em agente de CI, que seria grave — passaria pelo
pipeline sem sinal. Este finding é o primeiro caso concreto que evidencia esse ponto cego.
Converge, como sintoma de família, com `T18-F07`
(`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:139-149` — *"um controle de segurança que sinaliza
conformidade sem exercê-la é pior que a ausência do controle"*) e com `T22-F02` (ausência
de gate de CI que impeça recorrência), **sem duplicá-los**: aqueles tratam do scanner de
segredos e da configuração; este trata do escopo do gate de dependências.

---

## 7. RECOMMENDATION — o que a remediação precisa considerar

**SUGGESTED_REMEDIATION_OWNER: SanaCore** (Regra 3 — SanaCore corrige, VeriCore não; nenhuma
correção foi aplicada aqui).

Ordem sugerida, do mais barato e seguro ao mais estrutural:

1. **Antes de qualquer alteração, resolver a contradição da evidência (§2.3).** Determinar,
   contra o registry, **se existe versão corrigida na linha 3.x**. Se *"correção não
   retroportada"* estiver correto, **não existe upgrade in-place** e as opções 2 e 3 são as
   únicas.
2. **Caminho preferencial — subir a cadeia, não forçar o filho.** Verificar se existe
   versão de `@istanbuljs/load-nyc-config` (hoje 1.1.0, `server/package-lock.json:1216`) ou
   de `babel-plugin-istanbul` (hoje 7.0.1, `:4329`) que já dependa de `js-yaml` 4.x. **Este
   é o caminho sem dívida técnica.** Advertência: `babel-plugin-istanbul@7.0.1` é versão
   recente e ainda declara `@istanbuljs/load-nyc-config: ^1.0.0` (`:4339`) — **há chance
   real de que a correção upstream ainda não exista**, e nesse caso `npm audit fix` sem
   `--force` não resolverá.
3. **Caminho alternativo — `overrides`, com risco explícito.** O projeto **já usa esse
   mecanismo**: `server/package.json:48-51` declara `overrides` para `uuid` e
   `brace-expansion` — precedente interno do próprio time para exatamente esta classe de
   problema. Um `"js-yaml": "^4"` forçaria a versão. **Riscos de quebra a verificar antes,
   sem executá-los aqui:**
   - `@istanbuljs/load-nyc-config` declara `js-yaml: ^3.13.1`
     (`server/package-lock.json:1225`). Um override para `^4` **viola a faixa declarada
     pelo pai** — npm aceita, mas nenhuma garantia de compatibilidade permanece.
   - **Compatibilidade de API do call site:** o único uso é `require('js-yaml').load(...)`
     (`server/node_modules/@istanbuljs/load-nyc-config/index.js:80`). O método `load`
     existe nas duas linhas, mas **a semântica muda** — na 3.x `load` usa o schema completo;
     na 4.x `load` é o comportamento seguro e `safeLoad` foi removido. Para este call site
     específico a mudança é benigna ou benéfica, mas a verificação tem que ser feita, não
     presumida.
   - **Risco de regressão da suíte:** se algum outro pacote da árvore vier a depender de
     `js-yaml` 3.x no futuro, o override o quebra silenciosamente. Hoje **não há segundo
     dependente** (§1.3), o que torna o override tecnicamente de baixo risco **neste
     momento** — e essa condição precisa ser reconfirmada no momento da remediação, não
     herdada deste relatório.
   - **`npm audit fix --force` é contraindicado sem análise prévia:** ele pode saltar major
     de `jest`/`babel-jest`/`@jest/transform`, que sustentam **toda** a suíte de testes do
     servidor (`server/package.json:15-26`, 12 scripts de teste) e são pré-condição de dois
     passos obrigatórios de CI (`server-ci.yml:68,72`). O custo de uma regressão aqui é
     desproporcional ao risco corrigido.
4. **Corrigir o ponto cego do gate — é o item de maior valor deste finding.** Avaliar
   acrescentar ao `server-ci.yml` um passo de auditoria da árvore **completa** (sem
   `--omit=dev`), ainda que **não bloqueante** (`continue-on-error` / `--audit-level=high`
   informativo), preservando o passo bloqueante já existente para produção (`:75-77`). Sem
   isso, esta classe de achado continua invisível ao pipeline por desenho, e a remediação de
   hoje não impede a recorrência de amanhã. **Decisão de política de CI é do dono /
   director — registro como recomendação, não como requisito.**
5. **Alternativa legítima que precisa ser decidida por humano, não por agente:** dado que a
   explorabilidade é a descrita em §3, **aceitar formalmente o risco com registro** é uma
   resposta defensável — desde que combinada com o item 4, para que a aceitação seja de
   *este* pacote e não, silenciosamente, de toda a árvore de dev. **Não recomendo nem
   descarto**; é decisão do dono (Regra 18). **Nota:** a vedação de `RISK_ACCEPTED` da Regra
   24 é específica de papel declarado pelo cliente e **não se aplica** aqui.

---

## 8. REPRODUCTION (estática, determinística — nenhum comando executado)

1. Abrir `server/package.json` → confirmar que `js-yaml` **não** consta em `dependencies`
   (`:29-47`), `devDependencies` (`:52-71`) nem `overrides` (`:48-51`).
2. Abrir `server/package-lock.json:8877-8890` → ler `"version": "3.15.0"` e `"dev": true`.
3. `grep '"js-yaml":' server/package-lock.json` → única declaração de dependência em
   `:1225`, dentro de `node_modules/@istanbuljs/load-nyc-config` (`:1215-1231`).
4. Seguir os pais: `:4339` (`babel-plugin-istanbul` → `load-nyc-config`), `:2504` e `:4315`
   (`@jest/transform` e `babel-jest` → `babel-plugin-istanbul`), até `jest` em
   `server/package.json:65`.
5. `grep -i 'yaml' server/src` → zero resultados. `glob **/.nycrc.y*ml` → zero resultados
   fora de `node_modules` de terceiros.
6. Ler `server/Dockerfile:16` (`npm prune --omit=dev`) e
   `.github/workflows/server-ci.yml:75-77` (`npm audit --omit=dev`).

**Reprodução dinâmica, se e quando o director autorizar (pedido ao
`vericore-audit-verification-runner`, NÃO executado):**

| ID sugerido | Comando | Objetivo |
|---|---|---|
| `DYN-DEP-01` | `npm ls js-yaml --prefix server --all` | Confirmar por resolução real da árvore que `@istanbuljs/load-nyc-config` é o **único** dependente, fechando §1.3 por execução |
| `DYN-DEP-02` | `npm audit --json --prefix server` (reexecução) e `npm audit --omit=dev --json --prefix server` | Provar que o gate de CI (`--omit=dev`) retorna **limpo** enquanto a árvore completa acusa 1 HIGH — evidência direta do ponto cego de §6 |
| `DYN-DEP-03` | `npm view js-yaml versions` / `npm audit fix --dry-run --prefix server` | Fechar a lacuna de §2.3: existe correção na linha 3.x? `audit fix` resolve sem `--force`? |

---

## 9. RASTREABILIDADE

**RELATED_PROCESS:** gestão de dependências / pipeline de build e CI
**RELATED_BUSINESS_RULE:** nenhuma — defeito de cadeia de suprimentos, sem regra de negócio
associada
**RELATED_REQUIREMENT:** OWASP ASVS V14.2.1 (componentes de terceiros atualizados) e
V14.2.4; nenhum NFR versionado do ERP fixa política de dependência — **lacuna de requisito
registrada**, converge com `T14-F05`/`T15-F06` (governança) sem duplicá-los
**RELATED_USE_CASE:** N/A
**RELATED_ACCEPTANCE_CRITERIA:** N/A — não existe AC formal de "zero vulnerabilidade
conhecida em dependência" no repositório
**RELATED_TEST:** nenhum. O único controle automatizado é
`.github/workflows/server-ci.yml:75-77`, e ele **exclui por opção** (`--omit=dev`) a árvore
onde este pacote vive

**RELATED_FINDINGS:**
- **Origem:** `OBS-T26-01` (`T-26_CONSOLIDACAO.md:828`) — esta é a **promoção formal** dessa
  observação. `OBS-T26-01` deve ser marcada como **PROMOVIDA a `AUD-DEP-JSYAML-01`**, não
  como fechada.
- **Fecha parcialmente:** `RES-T18-03` (`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:260`) — apenas
  quanto a este pacote; a ressalva permanece aberta para o restante das árvores de `server`,
  `client`, `mobile` e `tv`.
- **Convergente, não duplicado:** `T18-F07` (`:139-149`) e `T22-F02` — família "gate de CI
  que sinaliza conformidade sem exercê-la". Eixos distintos (scanner de segredos × escopo do
  audit de dependências).
- **Não relacionado:** os 14 HIGH de `mobile` e 12 HIGH de `tv` (§5) — natureza distinta, sem
  finding emitido, lacuna aberta.

**REFERENCE:** `DYN_VERIFICACAO_BATERIA_01.md:106-114` (`DYN-T18-03`);
`AUDIT_COVERAGE_EXECUTED.md:476`; `T-26_CONSOLIDACAO.md:828`;
`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:34,260`; OWASP ASVS V14.2; `CLAUDE.md` Regras 2, 4,
14, 18, 22.

**ROOT_CAUSE_HYPOTHESIS:** Dependência transitiva de 5 níveis de profundidade, inteiramente
dentro da toolchain de teste, cuja versão é fixada por uma faixa `^3.13.1` declarada por um
pacote (`@istanbuljs/load-nyc-config@1.1.0`) que **não recebe atualização de major** e que,
portanto, ancora toda a subárvore na linha 3.x do `js-yaml`. O projeto não tem política de
dependência versionada nem gate que observe a árvore de dev — a combinação faz com que esse
tipo de ancoragem só se torne visível quando um advisory novo é publicado e alguém executa
`npm audit` manualmente, que é exatamente como este achado surgiu.

**RETEST_SPECIFICATION** (a ser executada **por VeriCore**, após remediação da SanaCore —
Regra 4):

(a) `server/package-lock.json` não contém nenhuma entrada `js-yaml` com `version` dentro de
`3.0.0–3.15.0`; a entrada, se existir, está em versão declarada corrigida pelo advisory.
(b) `npm ls js-yaml --prefix server --all` mostra a nova versão resolvida e nenhuma
duplicação em versões conflitantes.
(c) `npm audit --prefix server` (árvore **completa**, sem `--omit=dev`) retorna zero HIGH.
(d) **Não regressão obrigatória:** `npm run test:unit:strict` e `npm run test:api:strict`
(`server/package.json:23,26`) passam, e o `server-ci.yml` completo passa — inclusive
`Build`, `Build immutable Docker image` e o smoke container (`:79-119`). Este item é a defesa
contra o risco de `--force` descrito em §7.3.
(e) Se a resposta adotada for **aceitação de risco** em vez de atualização: existe decisão
humana explícita registrada em `PROJECT_EVENT_LOG.md`, com escopo limitado a este pacote e
com prazo de reavaliação.
(f) Se o item 4 de §7 for adotado: `server-ci.yml` tem passo que audita a árvore completa, e
existe evidência de execução mostrando que o passo **acusaria** este achado se ele
reaparecesse.

---

## 10. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método seguido:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de
  correção.
- **Nenhum número deste relatório foi copiado de contexto injetado sem releitura direta da
  fonte.** As versões `3.15.0`, `4.3.1`, `1.1.0`, `7.0.1`, `30.4.1` e todas as linhas citadas
  foram lidas nesta sessão nos arquivos indicados. Os únicos dados **não** verificados por
  leitura própria são o identificador do CVE, a faixa afetada e o texto do advisory —
  declarados como citação de `DYN_VERIFICACAO_BATERIA_01.md:114` em §2.3, com a lacuna
  explícita.
- **Nenhum comando foi executado.** Nenhum `npm audit`, `npm install`, `npm ls`, teste ou
  acesso a rede. Toolset restrito a Read/Grep/Glob.
- **Nenhum arquivo do objeto auditado foi criado ou alterado.** `server/package.json` e
  `server/package-lock.json` foram apenas lidos.
- **Nenhum valor de segredo ou credencial foi lido, citado, mascarado ou reproduzido.**
- **Limite de escopo desta análise:** cobre **exclusivamente** o pacote `js-yaml` nas quatro
  árvores. **Não** constitui inventário completo de dependências de risco de `server`, e
  **não** classifica as demais dependências diretas
  (ok/vulnerável/abandonada/suspeita/licença-a-decidir) — esse critério de conclusão do
  mandato de dependências permanece **não atendido**, e `RES-T18-03` permanece aberta para o
  restante.

**ARQUIVOS LIDOS NESTA ANÁLISE (caminhos absolutos):**

- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\CLAUDE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\package.json`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\package-lock.json` (parcial, por consulta
  dirigida: 1205-1241, 2492-2512, 4303-4347, 8870-8894)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\mobile\package-lock.json` (parcial: 1558-1572,
  4540-4546)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\tv\package-lock.json` (parcial: 1459-1473,
  4518-4524)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\jest.config.cjs`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\Dockerfile`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\.github\workflows\server-ci.yml`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\node_modules\@istanbuljs\load-nyc-config\index.js`
  (1-100)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\node_modules\@jest\transform\build\index.js`
  (consulta dirigida)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\server\node_modules\babel-plugin-istanbul\lib\index.js`
  (consulta dirigida)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-26_CONSOLIDACAO.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\07-findings\DYN_VERIFICACAO_BATERIA_01.md`
  (parcial: 95-124)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\audit\runs\ERP-LEGACY-001-AUD-001\24-coverage\AUDIT_COVERAGE_EXECUTED.md`
  (parcial, por consulta)
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\coretriad\templates\FINDING_TEMPLATE.md`
- `c:\Sistema EvokAudio\ERP-Evok--Audio-LTDA\docs\coretriad\projects\ERP-LEGACY-001\discovery\FIND-ERP-002.md`
  (referência de estrutura)

---

*Produzido pelo agente `vericore-dependency-security-auditor` em modo read-only. O agente não
possui ferramenta de escrita; este conteúdo foi persistido pelo orquestrador em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-DEP-JSYAML-01.md` **sem edição de
conteúdo**. STATUS permanece `PROPOSED`. A validação adversarial pelo
`vericore-finding-validator` **não ocorreu**.*
