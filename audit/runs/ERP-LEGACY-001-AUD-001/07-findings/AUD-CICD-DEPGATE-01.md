# FINDING

```
FINDING_ID:   AUD-CICD-DEPGATE-01
AUDIT_ID:     ERP-LEGACY-001-AUD-001
PROJECT_ID:   ERP-LEGACY-001
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
```

> **Nota de persistência.** O agente titular (`vericore-cicd-auditor`) é read-only e não possui
> ferramenta de escrita. Conteúdo persistido pelo orquestrador **sem alteração** — mesmo padrão de
> ressalva de transparência já aplicado nos passos 23 e 24.

**TITLE:** O único gate automatizado de vulnerabilidade de dependência do repositório
(`.github/workflows/server-ci.yml:75-77`) exclui por opção (`--omit=dev`) a árvore de
desenvolvimento — **640 das 854 entradas de pacote do lock de `server` (75%) não são observadas
por controle automatizado algum** — e o gate roda **depois** de `npm ci` (`:51-53`), quando o
código dessas dependências já executou no agente de CI.

**DOMAIN:** ci-cd-security / pipeline-as-risk-vector
**SUBDOMAIN:** security-gate-scope / supply-chain-observability
**SEVERITY:** **MEDIUM** — fundamentada em §5 pelo alcance real *deste* pipeline (sem segredo de
produção, sem registry, sem job de deploy, runner efêmero). **Sobe para HIGH** se `DYN-CICD-03`
confirmar `GITHUB_TOKEN` com permissão de escrita por default e ausência de branch protection.
**CONFIDENCE:** `CONFIRMED` quanto ao escopo do gate, à ausência de qualquer outro gate e à ordem
dos passos (leitura integral do único workflow existente) · `MEDIUM_CONFIDENCE` quanto ao número
de pacotes (contagem de entradas do mapa `packages` do lock, não resolução `npm ls` — ver §3) ·
`NOT_VERIFIED` quanto a permissões efetivas do token e branch protection (configuração
server-side, não versionada)
**STATUS:** `PROPOSED`
**DETECTED_BY:** identificado como achado estrutural embutido em `AUD-DEP-JSYAML-01` §4.2 e §6 →
**promovido a finding próprio** por `vericore-cicd-auditor` (esta análise, leitura estática própria
e integral)

## CABEÇALHO NORMATIVO OBRIGATÓRIO

1. **Autorização humana explícita (Regra 18).** A promoção foi determinada por **decisão direta do
   dono do CoreTriad nesta sessão**, em texto: *"Promova como finding separado o gap estrutural:
   `npm audit --omit=dev` deixa toda a árvore de dependências de desenvolvimento sem gate de
   segurança no CI."* Não é inferência de agente. A decisão autoriza a **promoção**; **não fixa a
   severidade** — a classificação permanece juízo técnico de auditoria, fundamentada em §5.
2. **Regra 22 — validação adversarial NÃO OCORREU.** Este finding **não passou** pelo
   `vericore-finding-validator`. Classificado MEDIUM, não entra no regime obrigatório da Regra 22;
   **se o validador ou o director elevarem a HIGH (§5.3), a passagem pelo validador torna-se
   obrigatória antes de qualquer remediação**. Nada aqui declara a validação como feita.
3. **Regra 2 — nada foi corrigido.** Nenhum workflow, `package.json` ou `package-lock.json` foi
   alterado. Todos apenas lidos.
4. **Regras 4 e 14 — nenhum `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED` é declarado.**
5. **Delta (Regra 14):** fato do orquestrador —
   `git diff --stat c1311a6..HEAD -- server/src client/src server/migrations server/database`
   retorna **vazio**. Registro próprio: `.github/`, `server/package.json` e
   `server/package-lock.json` **não estão nesse conjunto de caminhos**; o diff citado **não** prova
   ausência de mudança neles. Todas as leituras abaixo são do working tree. **Ressalva mantida**,
   herdada de `RES-T18-01`.
6. **Nenhum valor de segredo foi reproduzido.** Apenas nomes de variáveis são citados (§4.2).

---

## 1. O FATO — leitura integral do único workflow do repositório

`.github/workflows/server-ci.yml` foi lido integralmente (**124 linhas**). O passo de auditoria de
dependências é **único** e literal:

```yaml
      - name: Production dependency audit          # :75
        run: npm audit --omit=dev --audit-level=moderate   # :76
        working-directory: server                  # :77
```

Fatos, cada um com âncora:

| Fato | Âncora |
|---|---|
| Existe **um único** passo de audit em todo o repositório | grep `npm audit` fora de `node_modules/`, `audit/` e `*.md` → **1 ocorrência**: `.github/workflows/server-ci.yml:76` |
| **Bloqueante:** sem `continue-on-error`, sem `if:` condicional | grep `continue-on-error` em `.github/` → **zero ocorrências**; único `if:` do workflow é `if: always()` em `:122` (limpeza do contêiner de smoke) |
| **Escopo 1 — só `server`:** `working-directory: server` | `:77` |
| **Escopo 2 — só árvore de produção:** `--omit=dev` | `:76` |
| **Escopo 3 — só `moderate` ou acima:** advisories `low` da árvore de produção também não reprovam | `:76` (`--audit-level=moderate`) |
| Nenhum outro script do projeto executa audit | `server/package.json` — não há script `audit`; scripts lidos: `typecheck:9`, `build:10`, `migration:up:12`, `migration:down:13`, `test:unit:strict:23`, `test:api:strict:26`, `scan:secrets:27` |

**O que o passo de fato cobre:** exclusivamente as dependências de runtime de `server` — as 16 de
`server/package.json:29-47` e sua árvore transitiva não marcada `dev`.
**O que ele de fato não cobre:** toda a árvore de desenvolvimento de `server`, e **todo**
`client/`, `mobile/`, `tv/` e a raiz.

### 1.1 O gate é posicionalmente incapaz de prevenir — só de relatar

A ordem dos passos é determinante e está ancorada:

| # | Passo | Linha |
|---|---|---|
| 1 | `actions/checkout@v4` | `:43` |
| 2 | `actions/setup-node@v4` | `:45-49` |
| **3** | **`npm ci`** (`working-directory: server`) | **`:51-53`** |
| 4 | `npm run scan:secrets` | `:55-57` |
| 5 | `npm run typecheck` | `:59-61` |
| 6 | `npm run build` | `:63-65` |
| 7 | `npm run test:unit:strict` | `:67-69` |
| 8 | `npm run test:api:strict` | `:71-73` |
| **9** | **`npm audit --omit=dev`** | **`:75-77`** |
| 10-14 | `docker build`, migrations, smoke, cleanup | `:79-123` |

`npm ci` (passo 3) instala e executa scripts de ciclo de vida de **toda** a árvore, dev inclusive,
e os passos 5-8 (`tsc`, `jest`/`@swc`) **carregam e executam** esse código no agente. O audit
ocorre no passo **9**. Mesmo que o `--omit=dev` fosse removido amanhã, o gate continuaria sendo um
**relatório post-mortem dentro do mesmo job** — ele nunca impede a execução que pretende cobrir;
ele só decide se o job termina vermelho. Isso não anula o valor de corrigir o escopo (o sinal
existiria, e o merge seria barrado), mas delimita honestamente o que a correção compra.

---

## 2. MATRIZ COMPLETA DE COBERTURA — projeto × gate

Varredura própria: `Glob .github/**/*` retorna **exatamente um arquivo** —
`.github/workflows/server-ci.yml`. `Glob {.gitlab-ci.yml, azure-pipelines.yml, Jenkinsfile,
.husky/**, .pre-commit-config.yaml}` → **zero arquivos**. Não existe segundo mecanismo de CI, nem
hook de pre-commit, em nenhum ponto do repositório.

| Projeto | Existe gate de dependência? | Escopo do gate | Bloqueante? | Entradas no lock | Entradas `"dev": true` | Entradas observadas por gate |
|---|---|---|---|---|---|---|
| `server` | **sim, parcial** (`:75-77`) | só árvore de produção, só `moderate+` | **sim** | **854** | **640** | **214** |
| `client` | **não** — nenhum job o referencia | — | — | **361** | 114 | **0** |
| `mobile` | **não** | — | — | **570** | 1 | **0** |
| `tv` | **não** | — | — | **565** | 11 | **0** |
| raiz | **não** | — | — | **58** | 0 | **0** |
| **TOTAL** | — | — | — | **2.408** | **766** | **214 (8,9%)** |

Âncoras das contagens: grep `^    "node_modules/` (chaves do mapa `packages`) e
`^      "dev": true` em `package-lock.json` de `server`, `client`, `mobile`, `tv` e raiz.
`devOptional` → **zero ocorrências** em `server/package-lock.json`.

Confirmação independente de que nenhum job toca os demais projetos: o único `working-directory` do
workflow é `server` (`:53,57,61,65,69,73,77,84,92`); os únicos passos sem `working-directory` são
`docker build ./server` (`:80`) e o smoke (`:94-123`), ambos sobre `server`. Nenhuma string
`client`, `mobile` ou `tv` aparece no workflow.

**Delimitação obrigatória — não duplicar `T22-F05`.** A coluna "não" de `client`/`mobile`/`tv`
**já é finding**: `T22-F05` (HIGH, `T-22_PLATAFORMA.md:76`) cobre a ausência total de pipeline para
esses três projetos. **Este finding não os reemite e não os subsome** — a matriz acima existe para
dimensionar o alcance, e o eixo próprio de `AUD-CICD-DEPGATE-01` é **o escopo do gate que
existe**, no projeto onde ele existe. Ver §6.

---

## 3. ALCANCE DO PONTO CEGO — o que se sustenta e o que não se sustenta

**Sustentado por leitura:** `server/package-lock.json` tem **854** entradas no mapa `packages`
(excluída a raiz `""`), das quais **640 carregam `"dev": true`** — pacotes que, por definição de
`--omit=dev`, **nunca entram no conjunto avaliado pelo passo `:76`**. É **75,0%** das entradas do
lock do backend.

**Não sustentado, e a lacuna é declarada:** esse número é uma **contagem de entradas do lock**, não
a saída de `npm ls --all` nem de `npm audit --json`. Não é idêntico ao número de pacotes distintos
instalados, porque (a) o mesmo pacote em versões diferentes aparece como entradas distintas em
caminhos aninhados, e (b) o lock descreve o grafo, não a resolução final em disco. O agente é
read-only e não executa comandos: não pode produzir o número exato. `DYN-CICD-01`/`02` (§8) fecham
essa lacuna por execução. **Nenhum número deste finding foi estimado ou arredondado para efeito
retórico** — todos vêm de contagem de grep sobre arquivo versionado, com o padrão declarado acima.

**Prova concreta de que o ponto cego é real, não teórico:** `AUD-DEP-JSYAML-01` estabeleceu que
`js-yaml@3.15.0` (`server/package-lock.json:8878`, `"dev": true` em `:8881`) está numa faixa de
advisory ativa e **passa invisível pelo passo `:76`**, enquanto `npm audit` sem `--omit=dev` o
acusa (`DYN_VERIFICACAO_BATERIA_01.md:114`). Um pacote vulnerável já existe hoje dentro dos 640, e
o gate está verde.

---

## 4. CONSEQUÊNCIA DE SEGURANÇA CONCRETA NESTE PIPELINE

Hipótese avaliada: uma vulnerabilidade **com execução de código** numa ferramenta de build (ou um
pacote dev comprometido via `postinstall`) executa no agente durante `npm ci` (`:52`) ou durante
`typecheck`/`build`/`test` (`:60,64,68,72`). Pergunta de auditoria: **acesso a quê?**

### 4.1 O que o job NÃO alcança — e isso é o que segura a severidade

| Ativo | Verificação | Âncora |
|---|---|---|
| Segredos do GitHub (`secrets.*`) | **Nenhum é injetado.** grep `secrets\.` em `.github/` → **zero ocorrências** | ausência confirmada em arquivo lido integralmente |
| Credencial de registry de container | **Não existe.** grep `docker login`, `docker push`, `ghcr` → **zero ocorrências**; a imagem `erp-evok-audio-server:${{ github.sha }}` (`:80`) é construída, usada no smoke (`:111`) e destruída (`:123`) | `:79-123` |
| Job/credencial de deploy | **Não existe job de deploy** no workflow (jobs: apenas `validate`, `:11`) | `:10-11` |
| Runner self-hosted / rede interna | **Não.** `runs-on: ubuntu-latest` (`:12`), efêmero e descartado; grep `self-hosted` → zero | `:12` |

Consequência: **um comprometimento de dependência dev neste pipeline não alcança produção, não
alcança registry e não rouba credencial de nuvem — porque nenhum desses existe no job.** Registrado
explicitamente para não inflar o finding.

### 4.2 O que o job ALCANÇA — nomes de variáveis apenas, jamais valores

Variáveis de ambiente definidas no escopo do job (`:28-40`), **citadas por nome, com valor
deliberadamente não reproduzido**: `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `DB_SSL`, `DB_LOGGING`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_SEED_PASSWORD`. O
serviço Postgres (`:13-26`) define `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`. O passo de
smoke (`:94-111`) repassa o mesmo conjunto por `-e` ao contêiner.

**Juízo:** todos esses são valores literais de CI, escritos no arquivo, apontando para um Postgres
efêmero do próprio job — **não são credenciais de produção** e seu roubo não tem valor. É por isso
que a superfície é limitada. *(Que esses literais estejam em texto plano num arquivo que o scanner
de segredos do projeto pula por desenho — `scan-tracked-secrets.cjs:7` inclui `'.git'` em
`allowedFragments` e `:24` testa `relativePath.includes(fragment)`, de modo que **todo `.github/`
é ignorado** — é fato de `T18-F07` (`T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:144`), aqui **confirmado
por leitura própria e citado, não reemitido**.)*

Restam **dois** ativos reais:

1. **`GITHUB_TOKEN` do job.** `actions/checkout@v4` (`:43`) é usado sem `persist-credentials:
   false` (grep → zero ocorrências), portanto o token fica gravado na configuração git do runner e
   legível por qualquer processo do job — inclusive por um `postinstall` de dependência dev. **O
   workflow não declara bloco `permissions:`** (grep `permissions:` em `.github/` → **zero
   ocorrências**), logo vale o default do repositório/organização. **Esse default é configuração
   server-side não versionada — `NOT_VERIFIED` por leitura de artefato.** Se for "read and write"
   (o default histórico do GitHub), código executado por uma ferramenta de build pode **escrever no
   próprio repositório**: alterar `server/src`, alterar o próprio `server-ci.yml`, e assim se
   auto-perpetuar. Esse é o caminho de dano material — e é exatamente o que nenhum controle do
   repositório observa hoje.
2. **O `docker build` (`:80`).** Roda no runner com acesso ao daemon Docker do job. Como não há
   push (§4.1), o alcance termina no próprio job — mas confirma que o agente tem privilégio de
   construção de imagem, não apenas de teste.

**Formulação precisa da consequência, sem generalidade:** *neste* pipeline, uma RCE em dependência
dev não vaza segredo de produção nem envenena artefato publicado (não há nenhum dos dois); ela vale
**acesso de escrita potencial ao repositório via `GITHUB_TOKEN`** — o que, num modelo de supply
chain, é o ativo mais valioso que o job de fato custodia. A confirmação depende de `DYN-CICD-03`.

---

## 5. FUNDAMENTAÇÃO DA SEVERIDADE — por que **MEDIUM**

**5.1 O que empurra para cima:** a lacuna é **estrutural e total** (não há gate parcial,
informativo ou manual sobre os 640 pacotes — há ausência); é **silenciosa por desenho** (o job
termina verde, produzindo confiança injustificada — o mesmo vício que `T18-F07:149` descreve: *"um
controle que sinaliza conformidade sem exercê-la é pior que a ausência do controle"*); e **já tem
caso concreto materializado** (`AUD-DEP-JSYAML-01`), o que a tira do terreno hipotético.

**5.2 O que segura em MEDIUM:** o alcance real deste pipeline é contido, e a auditoria tem que
classificar o sistema real, não o cenário genérico. Nenhum segredo de produção é injetado (§4.1,
grep `secrets\.` = zero); nenhuma imagem é publicada; não há job de deploy; o runner é efêmero; o
gate de produção — o que protege o runtime que atende usuários — **está corretamente desenhado e é
bloqueante**. O único vetor de dano material (escrita no repo via token) depende de uma
configuração que **não pôde ser verificada** e que, se hoje estiver restrita, torna o dano quase
nulo. Classificar HIGH apoiado numa premissa `NOT_VERIFIED` seria inflação de severidade.

**5.3 Gatilho explícito de reclassificação para HIGH** — registrado para que a MEDIUM não seja lida
como dispensa permanente. Qualquer um destes eleva:
(a) `DYN-CICD-03` mostrar `GITHUB_TOKEN` com `contents: write` por default **e** ausência de branch
protection com review obrigatório em `main`/`master` (pendência já aberta em `DYN-T22-01`,
`T-22_PLATAFORMA.md:90`);
(b) o pipeline passar a publicar imagem em registry ou a injetar qualquer `secrets.*` (fecha o gap
de `T22-F01`, mas cria o ativo que hoje não existe);
(c) surgir job de deploy no mesmo workflow.
**Nesse caso a Regra 22 passa a ser obrigatória antes de qualquer remediação.**

**SEVERIDADE ATRIBUÍDA: MEDIUM.** Confiança no fato do escopo: `CONFIRMED`. Confiança na
quantificação: `MEDIUM_CONFIDENCE` (§3). Confiança na consequência via token: `NOT_VERIFIED` quanto
à permissão efetiva.

---

## 6. RELAÇÃO COM FINDINGS EXISTENTES — correlação sem duplicação

| Finding | Objeto dele | Objeto deste | Veredito |
|---|---|---|---|
| `T18-F07` (MEDIUM) — `T-18_APPSEC_SEGREDOS_DEPENDENCIAS.md:139-149` | Pontos cegos **internos do script** `scan-tracked-secrets.cjs` (allowlist por substring, só HEAD, 4 regexes) | Escopo de um **passo diferente** (`npm audit`), controle diferente, arquivo diferente | **Não subsume.** Mesma *família* de patologia ("gate verde que não exerce o controle"), eixos disjuntos. `scan-tracked-secrets.cjs:7,24` confirmado por leitura própria e **citado**, não reemitido |
| `T22-F02` (MEDIUM) — `T-22_PLATAFORMA.md:44` | Ausência de validação de `docker-compose*.yml` pelo CI | Escopo do audit de dependências | **Não subsume.** Objetos auditados distintos |
| `T22-F05` (HIGH) — `T-22_PLATAFORMA.md:76` | **Ausência total de pipeline** para `client`/`mobile`/`tv` | Escopo do pipeline **que existe**, em `server` | **Subsome parcialmente §2.** As linhas `client`/`mobile`/`tv` da matriz são **consequência de `T22-F05`** e ficam **atribuídas a ele** — este finding as apresenta como dimensionamento, e **declara que não emite achado próprio sobre elas** |
| `T22-F01` (HIGH) — `T-22_PLATAFORMA.md:38` | Imagem de CI nunca publicada; sem cadeia commit→produção | — | **Complementar e, aqui, mitigante:** é justamente a ausência de publicação que impede a RCE em dependência dev de envenenar artefato de produção (§4.1). Registrada a tensão: **corrigir `T22-F01` sem corrigir este finding aumenta o risco deste**, porque cria o artefato publicável que hoje não existe. **Recomendado ao director tratá-los como par ordenado** |
| `AUD-DEP-JSYAML-01` (LOW) | O pacote `js-yaml@3.15.0` | O gate que não o vê | **Origem.** Este finding é a **promoção do achado estrutural de §4.2/§6 daquele**, autorizada pelo dono. `AUD-DEP-JSYAML-01` permanece válido no seu próprio escopo; o item 4 de sua §7 passa a ser **objeto deste finding**, e não recomendação subordinada |
| `RES-T18-03` (`T-18:260`) | Nenhuma consulta a CVE/advisory na trilha | — | **Não fecha.** Permanece aberta |

**Nenhum finding existente torna este redundante.** O eixo — *escopo do gate de dependências que
existe* — não é objeto de nenhum outro ID desta run.

---

## 7. IMPACTO

**BUSINESS_IMPACT:** O relatório de CI verde é hoje o principal artefato de evidência de
conformidade do projeto perante revisão de terceiro (cliente, due diligence, auditoria externa).
Ele afirma "dependency audit: pass" sobre 8,9% das entradas de dependência do repositório (§2).
Numa revisão externa, a descoberta de que o gate exclui 75% do backend por opção custa mais
credibilidade do que a ausência de gate teria custado.

**TECHNICAL_IMPACT:** Nenhuma vulnerabilidade em ferramenta de build (jest, tsc, swc, eslint, e as
demais das 640 entradas) gera sinal em qualquer ponto do processo de merge. A detecção depende de
alguém executar `npm audit` manualmente — que é literalmente como `AUD-DEP-JSYAML-01` surgiu, por
bateria de auditoria e não por pipeline.

**SECURITY_IMPACT:** O pipeline é vetor de risco não observado. Código de terceiro não auditado
executa no agente de CI a cada push e a cada PR (`:4-8`), com `GITHUB_TOKEN` persistido pelo
checkout e permissões default não declaradas (§4.2). O dano possível é contido hoje pela pobreza de
ativos do job (§4.1) — o que é uma mitigação **acidental**, não um controle: ela desaparece no dia
em que o pipeline ganhar publicação de imagem ou deploy, sem que nada no repositório sinalize a
mudança de risco.

**Vetor adicional de bypass, registrado com sua incerteza:** o workflow dispara em `pull_request`
(`:8`) e o GitHub executa, nesse gatilho, a versão do workflow **presente no HEAD do PR**. Um PR
pode, portanto, **editar ou remover o próprio passo `:75-77`** e ainda assim reportar o check
`server-ci`. Só branch protection com required checks e review obrigatório impede isso —
**configuração server-side, `NOT_VERIFIED`**, já solicitada em `DYN-T22-01`
(`T-22_PLATAFORMA.md:90`). Não se afirma que o bypass é explorável hoje; afirma-se que **nenhum
artefato versionado o impede**.

---

## 8. REPRODUÇÃO E ESPECIFICAÇÃO DE RETESTE

**Reprodução estática (determinística, nenhum comando executado):**

1. Ler `.github/workflows/server-ci.yml` integralmente → passo `Production dependency audit` em
   `:75-77`, flags `--omit=dev --audit-level=moderate`, `working-directory: server`, sem
   `continue-on-error`.
2. `Glob .github/**/*` → **um único arquivo**. Nenhum outro CI no repositório.
3. grep `^      "dev": true` em `server/package-lock.json` → **640**; grep `^    "node_modules/` →
   **854**.
4. grep `secrets\.`, `permissions:`, `docker push`, `docker login`, `self-hosted`,
   `continue-on-error`, `persist-credentials` em `.github/` → **zero em todos**.
5. Ler `server/scripts/scan-tracked-secrets.cjs:7,24` → `.github/` excluído do scanner de segredos
   por `includes('.git')`.

**Evidência dinâmica solicitada ao `vericore-audit-verification-runner` via director (NÃO
executada por este agente):**

| ID | Comando / verificação | Objetivo |
|---|---|---|
| `DYN-CICD-01` | `npm audit --json --prefix server` **vs.** `npm audit --omit=dev --json --prefix server` | Prova direta do ponto cego: o gate retorna limpo enquanto a árvore completa acusa achado. Fecha §3 por execução |
| `DYN-CICD-02` | `npm ls --all --prefix server \| wc -l` ou `npm audit --json` (campo `metadata.dependencies`) | Número exato de pacotes dev vs. prod, substituindo a contagem de entradas de lock de §3 |
| `DYN-CICD-03` | GitHub API: permissões default de `GITHUB_TOKEN` do repositório/org; branch protection de `main`/`master` (required checks, reviewers) | **Determina a severidade final** (§5.3). Converge com `DYN-T22-01`/`DYN-T22-02` — executar em conjunto, não duplicar |

**RETEST_SPECIFICATION** (a ser executada **por VeriCore** após remediação da SanaCore — Regras 3 e
4):

(a) `.github/workflows/server-ci.yml` contém passo que audita a árvore **completa** de `server`
(sem `--omit=dev`), com política de bloqueio explicitamente decidida e registrada (bloqueante, ou
informativo com justificativa versionada).
(b) O passo bloqueante de produção existente (`:75-77` no `AUDIT_COMMIT`) **permanece**, com escopo
e nível preservados — a correção não pode ser feita substituindo o gate de produção pelo de árvore
completa.
(c) Existe evidência de execução mostrando que o novo passo **acusa** o caso concreto de
`AUD-DEP-JSYAML-01` enquanto ele existir, ou o acusaria se reintroduzido.
(d) A cobertura de `client`, `mobile`, `tv` e raiz é resolvida **no reteste de `T22-F05`**, não
neste — este finding fecha apenas quanto ao escopo do gate de `server`. Fechar este sem `T22-F05`
deixa 1.554 entradas de lock sem observação, e isso deve constar do veredito.
(e) Existe bloco `permissions:` explícito no workflow (mínimo necessário), **ou** decisão humana
registrada em `PROJECT_EVENT_LOG.md` aceitando o default — Regra 18, não inferência.
(f) Se a resposta adotada for **aceitação formal de risco** em vez de correção: decisão humana
explícita registrada, com escopo declarado ("a árvore de dev de `server` permanece sem gate"),
responsável e prazo de reavaliação. A vedação de `RISK_ACCEPTED` da Regra 24 é específica de papel
declarado pelo cliente e **não se aplica** aqui.

---

## 9. RASTREABILIDADE

**RELATED_PROCESS:** pipeline de CI / gestão de dependências / supply chain de build
**RELATED_REQUIREMENT:** OWASP ASVS V14.2.1 e V14.2.4; SLSA (nível de proveniência de build);
**nenhum NFR versionado do ERP fixa política de dependência ou de escopo de gate de CI — lacuna de
requisito registrada**, converge com `T14-F05`/`T15-F06` sem duplicá-los
**RELATED_ACCEPTANCE_CRITERIA:** N/A — não existe AC formal de "zero vulnerabilidade conhecida em
dependência" nem de cobertura de pipeline
**RELATED_TEST:** nenhum. Não há teste que reprove a remoção do passo de audit
**RELATED_FINDINGS:** `AUD-DEP-JSYAML-01` (origem) · `T18-F07`, `T22-F02` (convergentes, não
duplicados) · `T22-F05` (subsome a parte `client`/`mobile`/`tv` da matriz) · `T22-F01`
(complementar; par ordenado de remediação) · `RES-T18-03` (permanece aberta)
**SUGGESTED_REMEDIATION_OWNER:** SanaCore, com **decisão de política de CI pertencente ao
dono/director** (Regra 18) quanto a bloquear ou apenas informar

**ROOT_CAUSE_HYPOTHESIS:** O gate foi desenhado com a pergunta certa para o ativo errado em relação
ao seu próprio ambiente de execução: `--omit=dev` é a escolha correta quando o objeto protegido é a
**imagem de produção** (e o `Dockerfile:16` de fato faz `npm prune --omit=dev`, coerentemente). O
que não foi considerado é que o **agente de CI executa a árvore completa** — o mesmo job que valida
também roda 640 pacotes que ele decidiu não olhar. A causa raiz é a ausência de um modelo de ameaça
escrito para o próprio pipeline, agravada pela inexistência de qualquer requisito versionado de
cobertura de CI.

---

## 10. DECLARAÇÃO DE MÉTODO E LIMITES

- **Método:** READ → ANALYZE → VERIFY → PROVE → CLASSIFY → REPORT. Nenhum passo de correção.
- **Nenhum comando executado.** Nenhum `npm audit`, `npm ci`, `npm ls`, build, teste ou disparo de
  pipeline. Toolset restrito a Read/Grep/Glob.
- **Nenhum arquivo alterado.** Workflow, `package.json` e `package-lock.json` apenas lidos
  (Regra 2).
- **Nenhum valor de segredo lido, citado, mascarado ou reproduzido.** Apenas nomes de variáveis
  (§4.2).
- **Todo número foi obtido por contagem própria nesta sessão**, com o padrão de busca declarado;
  nada foi herdado de contexto injetado sem releitura.
- **Limites:** permissões efetivas de `GITHUB_TOKEN`, branch protection, required checks e
  existência de CODEOWNERS **não são inferíveis de artefato versionado** e permanecem
  `NOT_VERIFIED`. O escopo desta análise é o único workflow existente; não constitui inventário de
  vulnerabilidades das dependências dev.

---

## Nota ao director (fora do finding)

1. **Nenhum finding redundante foi emitido.** A parte `client`/`mobile`/`tv` da matriz de cobertura
   está atribuída a `T22-F05`, não reemitida. O eixo próprio deste ID é o escopo do gate que
   existe.
2. **`T22-F01` e este finding são um par ordenado.** Corrigir `T22-F01` (publicar imagem em
   registry) **antes** deste eleva o risco: cria o artefato envenenável que hoje não existe. Se
   ambos entrarem em remediação, a ordem importa.
3. **`DYN-CICD-03` é o que decide MEDIUM vs. HIGH** e se sobrepõe a `DYN-T22-01`/`02` — vale um
   único pedido consolidado ao `vericore-audit-verification-runner`.
