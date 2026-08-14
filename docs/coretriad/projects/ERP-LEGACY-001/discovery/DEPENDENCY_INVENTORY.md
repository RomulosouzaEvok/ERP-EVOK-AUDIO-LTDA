# DEPENDENCY_INVENTORY.md — ERP-LEGACY-001, Passo 23 (Snapshot técnico)

**Método:** leitura direta de `package.json`/`package-lock.json` dos 4
workspaces independentes e `grep` no código-fonte para uso real. **Nenhum
comando executado (sem `npm audit`/`npm outdated`/`npm ls`), sem acesso a
rede/registry ao vivo.**

## Escopo confirmado

Não é monorepo com workspace na raiz: não há `package.json` na raiz do
repositório, e nenhum dos 4 `package.json` encontrados declara campo
`"workspaces"`. São 4 instalações independentes, cada uma com seu próprio
`package-lock.json`:

- `server/package.json` + `server/package-lock.json`
- `client/package.json` + `client/package-lock.json`
- `mobile/package.json` + `mobile/package-lock.json`
- `tv/package.json` + `tv/package-lock.json`

Nenhum `.npmrc` encontrado em nenhum dos 4 — sem evidência de registry
alternativo configurado. Todas as entradas inspecionadas no lockfile
resolvem para `https://registry.npmjs.org/...`, sem sinal de dependency
confusion.

**Achado incidental fora de escopo:** `server/tmp/production-runtime-check/`
contém uma instalação completa (`node_modules`, `package.json`,
`package-lock.json`) espelhando o manifest do server em um estado anterior
(ex.: `jest@29.7.0` vs `30.4.2` atual). `tmp` está no `.gitignore`, não é
fonte oficial nem rastreada — não entra na contagem abaixo, registrado para
não ser confundido com um 5º workspace real.

---

## Inventário por workspace

### server (17 deps diretas + 18 devDeps + 2 overrides = 35, +2 overrides)

| Pacote | Range declarado | Resolvido (lockfile) | Nota |
|---|---|---|---|
| bcryptjs | ^2.4.3 | 2.4.3 | implementação pura-JS de bcrypt; historicamente sem manutenção ativa — observação de hardening, não CVE conhecida sem evidência de scan |
| cors | ^2.8.5 | 2.8.6 | estável, baixa atividade |
| decimal.js | ^10.6.0 | 10.6.0 | ok |
| dotenv | ^16.3.1 | 16.6.1 | ok |
| express | ^4.18.2 | 4.22.2 | major 4 ainda suportado; sem major 5 aqui |
| express-rate-limit | ^8.6.1 | 8.6.1 | ok |
| helmet | ^8.3.0 | 8.3.0 | ok, engine `node>=18` |
| jsonwebtoken | ^9.0.2 | 9.0.3 | ok |
| multer | ^2.2.0 | 2.2.0 | ok (major 2 corrige CVEs de DoS do multer 1.x) |
| nodemailer | ^9.0.3 | 9.0.3 | além do corte de conhecimento — estimativa não confiável, marcar para verificação com feed real |
| pdfkit | ^0.19.1 | 0.19.1 | pré-1.0 há anos, cadência de release historicamente baixa |
| pg | ^8.13.1 | 8.22.0 | ok |
| pg-hstore | ^2.3.4 | 2.3.4 | **candidata a abandonada** — ver AUD-DEP-3 |
| qrcode | ^1.5.4 | 1.5.4 | estável, baixa atividade |
| sequelize | ^6.37.8 | 6.37.8 | major 6 é a linha estável oficial |
| winston | ^3.19.0 | 3.19.0 | ok |
| zod | ^4.4.3 | 4.4.3 | **divergente do client (v3)** — ver AUD-DEP-4 |
| typescript (dev) | ^7.0.2 | — | **divergente de client/mobile/tv (v6.x)** — ver AUD-DEP-4 |
| @types/node (dev) | ^26.1.2 | — | major de tipos à frente do runtime local documentado (Node 24.14) |
| jest (dev) | ^30.4.2 | — | ok |

**Overrides declarados em `server/package.json` (linhas 47-50):**
```
"overrides": {
  "uuid": "^11.1.1",
  "brace-expansion": "^5.0.8"
}
```
Sem comentário explicando a razão (package.json não suporta comentários) —
inferido via lockfile:
- `uuid`: forçado para 11.1.1 sobre o que o Sequelize pede internamente
  (`sequelize` declara `uuid: ^8.3.2` — `server/package-lock.json:10255`). O
  override eleva todo o uso transitivo de v8 para v11.
- `brace-expansion`: força 5.0.9 sobre 4 ranges conflitantes na árvore
  (`^2.0.2`, `^2.0.2`, `^5.0.5`, `^1.1.7`), consistente com correção de uma
  vulnerabilidade de ReDoS historicamente associada a versões antigas.

### client (33 deps diretas + 12 devDeps = 45)

- Todas as libs verificadas resolvem do registry oficial, licenças MIT/ISC
  (spot-check em axios, cmdk, lucide-react, next-themes, radix-ui,
  react-router, recharts, sonner, tailwindcss, tw-animate-css).
- `zod: ^3.25.76` (major 3) — diverge do server (major 4). Ver AUD-DEP-4.
- `typescript: ~6.0.2` — diverge do server (`^7.0.2`), alinhado com
  mobile/tv.
- `jsdom: ^27.4.0` (devDependency, usado por vitest) — **reconfirmação do
  incidente conhecido**: `client/node_modules/jsdom/package.json` declara
  `"engines": {"node": "^20.19.0 || ^22.12.0 || >=24.0.0"}` — jsdom 27.4.0
  **já suporta Node 24 explicitamente**. A incompatibilidade registrada na
  memória do projeto **não se aplica mais à versão atualmente instalada** —
  ou já foi corrigida a montante pelo mantenedor, ou a memória se referia a
  uma versão anterior (26.x ou menor). Recomenda-se atualizar a memória do
  projeto para não repetir esse achado como se fosse ativo.
- **Dependências `@radix-ui/react-*` possivelmente não usadas** — 9 pacotes
  declarados em `dependencies` mas os wrappers de UI correspondentes
  importam do pacote agregador `radix-ui` em vez do individual. Ver
  AUD-DEP-2.

### mobile (14 deps diretas + 3 devDeps = 17)

Tudo resolve de `registry.npmjs.org`, licenças MIT nos itens verificados
(expo*, react-native, react-native-gesture-handler, react-native-reanimated,
react-native-safe-area-context, react-native-screens,
react-native-worklets). `react-native-gesture-handler`,
`react-native-reanimated`, `react-native-worklets`, `expo-camera`
confirmados em uso real.

### tv (11 deps diretas + 4 devDeps = 15)

- `"react-native": "npm:react-native-tvos@0.86.2-0"` é um **alias npm
  intencional** — resolve corretamente para o pacote oficial
  `react-native-tvos` (registry oficial, MIT). Não é dependency confusion;
  é o padrão documentado para builds de TV com Expo. Versão bate com
  `react-native@0.86.2` do mobile — bom sinal de paridade de versão do
  core RN entre as duas plataformas.
- `@react-native-tvos/config-tv` (devDependency) — pacote de nicho,
  comunidade pequena, sem CVE conhecida na base de conhecimento —
  observação de baixa base de mantenedores.

---

## Findings

### AUD-DEP-1 — `uuid@11.1.1` usado diretamente sem constar em `dependencies` (phantom dependency via override)

- **Severidade:** LOW · **Confiança:** CONFIRMED
- **Descrição:** `server/package.json` declara `"uuid": "^11.1.1"` apenas em
  `overrides` (linha 48), nunca em `dependencies`/`devDependencies`. A
  resolução efetiva (`server/package-lock.json:11261-11264`) só existe
  porque `sequelize` (dependência direta) também requer `uuid: ^8.3.2`
  (`server/package-lock.json:10255`) e o override eleva essa resolução
  transitiva para 11.1.1 em toda a árvore.
- **Evidência:** `server/package.json:47-50` (overrides), ausência
  confirmada em 28-46 (dependencies); importado diretamente em
  `server/src/scripts/backfill/02b_product_to_item.ts`,
  `02c_bom_to_item_estrutura.ts`, `02b-bis_category_to_item_categoria.ts`.
- **Impacto:** scripts de backfill (migração de dados) podem quebrar
  silenciosamente em builds futuras se a cadeia transitiva mudar, sem que
  `npm ls uuid --depth=0` acuse o problema antes disso.
- **Recomendação:** adicionar `"uuid": "^11.1.1"` explicitamente em
  `dependencies` de `server/package.json` (ação de remediação, não
  executada nesta trilha).

### AUD-DEP-2 — 9 pacotes `@radix-ui/react-*` declarados sem import direto detectado

- **Severidade:** LOW · **Confiança:** HIGH_CONFIDENCE
- **Descrição:** `client/package.json` declara individualmente
  `@radix-ui/react-{avatar,dropdown-menu,popover,progress,select,separator,switch,tabs,tooltip}`,
  ao lado do pacote agregador `"radix-ui": "^1.6.7"`. Todos os wrappers
  correspondentes importam de `radix-ui` (bundle), não dos pacotes
  individuais. `@radix-ui/react-select` não tem nem wrapper correspondente
  em `client/src/components/ui`.
- **Evidência:** `client/package.json:17-28,37`;
  `client/src/components/ui/{avatar,dropdown-menu,popover,progress,separator,switch,tabs,tooltip,breadcrumb}.tsx`
  importando de `"radix-ui"`.
- **Impacto:** superfície de dependência maior que o necessário; risco de
  duplicação de código empacotado se o bundler não fizer dedupe correto.
- **Recomendação:** confirmar com OpusCore se há migração incompleta para
  o bundle `radix-ui`; se sim, remover os 9 pacotes individuais órfãos.

### AUD-DEP-3 — `pg-hstore` é candidata a dependência abandonada

- **Severidade:** INFO · **Confiança:** MEDIUM_CONFIDENCE
- **Descrição:** `server` declara `"pg-hstore": "^2.3.4"` diretamente
  (exigido pelo Sequelize para o dialeto pg quando colunas hstore são
  usadas). Pacote historicamente de manutenção mínima — sem evidência de
  scan/feed de vulnerabilidade disponível para confirmar CVEs ativas.
- **Evidência:** `server/package.json:41`,
  `server/package-lock.json:9742-9748`.
- **Recomendação:** incluir `pg-hstore` no próximo `npm audit`; confirmar se
  hstore é de fato usado em alguma coluna do schema atual.

### AUD-DEP-4 — Versões major divergentes de `zod`/`typescript` entre workspaces

- **Severidade:** LOW · **Confiança:** CONFIRMED
- **Descrição:** `server` usa `zod ^4.4.3` e `typescript ^7.0.2`; `client`
  usa `zod ^3.25.76` e `typescript ~6.0.2`; `mobile`/`tv` usam
  `typescript ~6.0.3` (sem zod). Sem workspace raiz compartilhando zod
  entre client/server — mas se algum contrato de API depender de
  comportamento de parsing do zod v3 vs v4, isso é fonte plausível de
  divergência de validação entre o que o server espera e o que o client
  valida.
- **Evidência:** `server/package.json:45,69`; `client/package.json:47,59`;
  `mobile/package.json:24`; `tv/package.json:22`.
- **Recomendação:** confirmar com OpusCore se há intenção de unificar major
  de zod/typescript entre workspaces, ou se a divergência é deliberada.

---

## Lacunas declaradas (obrigatório)

1. **Nenhuma evidência de `npm audit` persistida** para este projeto. Toda
   a classificação acima é baseada em leitura de manifest/lockfile e
   heurística de grep — não há cruzamento com CVE/GHSA reais. Nenhuma
   severidade acima de LOW/INFO foi atribuída por essa razão; se houver CVE
   ativa em qualquer pacote listado, a severidade real pode ser maior.
   **Recomenda-se rodar `npm audit --json` nos 4 workspaces** (ação
   futura, exige aprovação humana por envolver execução de comando).
2. **Cobertura de licenças é parcial** (spot-check, não exaustiva de toda a
   árvore transitiva).
3. **Versões "major muito antiga"** marcadas acima como estimativa dependem
   da base de conhecimento do agente (corte janeiro/2026); dado que hoje é
   agosto/2026, qualquer pacote pode ter major mais recente desconhecido —
   sinalizado individualmente onde relevante.
4. Nenhuma ferramenta de execução foi usada — não foi rodado `npm audit`,
   `npm outdated`, `npm ls`, nem acessada rede/registry ao vivo. Tudo acima
   vem de leitura estática de `package.json`/`package-lock.json` e `grep`
   no código-fonte.

---

## Resumo de contagem de dependências diretas por workspace

| Workspace | dependencies | devDependencies | overrides | Total direto |
|---|---|---|---|---|
| server | 17 | 18 | 2 (uuid, brace-expansion) | 35 (+2 overrides) |
| client | 33 | 12 | 0 | 45 |
| mobile | 14 | 3 | 0 | 17 |
| tv | 11 | 4 | 0 | 15 |
| **Total** | **75** | **37** | **2** | **112 (+2 overrides)** |

---

*Produzido pelo agente `vericore-dependency-security-auditor` em modo
read-only reforçado (Read/Grep/Glob apenas, sem Write disponível nesta
sessão); conteúdo persistido neste caminho pelo orquestrador a partir da
resposta do agente, sem edição de conteúdo.*
