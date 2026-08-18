# DEPENDENCY_INVENTORY.md â€” ERP-LEGACY-001, Passo 23 (Snapshot tÃ©cnico)

**MÃ©todo:** leitura direta de `package.json`/`package-lock.json` dos 4
workspaces independentes e `grep` no cÃ³digo-fonte para uso real. **Nenhum
comando executado (sem `npm audit`/`npm outdated`/`npm ls`), sem acesso a
rede/registry ao vivo.**

## Escopo confirmado

NÃ£o Ã© monorepo com workspace na raiz: nÃ£o hÃ¡ `package.json` na raiz do
repositÃ³rio, e nenhum dos 4 `package.json` encontrados declara campo
`"workspaces"`. SÃ£o 4 instalaÃ§Ãµes independentes, cada uma com seu prÃ³prio
`package-lock.json`:

- `server/package.json` + `server/package-lock.json`
- `client/package.json` + `client/package-lock.json`
- `mobile/package.json` + `mobile/package-lock.json`
- `tv/package.json` + `tv/package-lock.json`

Nenhum `.npmrc` encontrado em nenhum dos 4 â€” sem evidÃªncia de registry
alternativo configurado. Todas as entradas inspecionadas no lockfile
resolvem para `https://registry.npmjs.org/...`, sem sinal de dependency
confusion.

**Achado incidental fora de escopo:** `server/tmp/production-runtime-check/`
contÃ©m uma instalaÃ§Ã£o completa (`node_modules`, `package.json`,
`package-lock.json`) espelhando o manifest do server em um estado anterior
(ex.: `jest@29.7.0` vs `30.4.2` atual). `tmp` estÃ¡ no `.gitignore`, nÃ£o Ã©
fonte oficial nem rastreada â€” nÃ£o entra na contagem abaixo, registrado para
nÃ£o ser confundido com um 5Âº workspace real.

---

## InventÃ¡rio por workspace

### server (17 deps diretas + 18 devDeps + 2 overrides = 35, +2 overrides)

| Pacote | Range declarado | Resolvido (lockfile) | Nota |
|---|---|---|---|
| bcryptjs | ^2.4.3 | 2.4.3 | implementaÃ§Ã£o pura-JS de bcrypt; historicamente sem manutenÃ§Ã£o ativa â€” observaÃ§Ã£o de hardening, nÃ£o CVE conhecida sem evidÃªncia de scan |
| cors | ^2.8.5 | 2.8.6 | estÃ¡vel, baixa atividade |
| decimal.js | ^10.6.0 | 10.6.0 | ok |
| dotenv | ^16.3.1 | 16.6.1 | ok |
| express | ^4.18.2 | 4.22.2 | major 4 ainda suportado; sem major 5 aqui |
| express-rate-limit | ^8.6.1 | 8.6.1 | ok |
| helmet | ^8.3.0 | 8.3.0 | ok, engine `node>=18` |
| jsonwebtoken | ^9.0.2 | 9.0.3 | ok |
| multer | ^2.2.0 | 2.2.0 | ok (major 2 corrige CVEs de DoS do multer 1.x) |
| nodemailer | ^9.0.3 | 9.0.3 | alÃ©m do corte de conhecimento â€” estimativa nÃ£o confiÃ¡vel, marcar para verificaÃ§Ã£o com feed real |
| pdfkit | ^0.19.1 | 0.19.1 | prÃ©-1.0 hÃ¡ anos, cadÃªncia de release historicamente baixa |
| pg | ^8.13.1 | 8.22.0 | ok |
| pg-hstore | ^2.3.4 | 2.3.4 | **candidata a abandonada** â€” ver AUD-DEP-3 |
| qrcode | ^1.5.4 | 1.5.4 | estÃ¡vel, baixa atividade |
| sequelize | ^6.37.8 | 6.37.8 | major 6 Ã© a linha estÃ¡vel oficial |
| winston | ^3.19.0 | 3.19.0 | ok |
| zod | ^4.4.3 | 4.4.3 | **divergente do client (v3)** â€” ver AUD-DEP-4 |
| typescript (dev) | ^7.0.2 | â€” | **divergente de client/mobile/tv (v6.x)** â€” ver AUD-DEP-4 |
| @types/node (dev) | ^26.1.2 | â€” | major de tipos Ã  frente do runtime local documentado (Node 24.14) |
| jest (dev) | ^30.4.2 | â€” | ok |

**Overrides declarados em `server/package.json` (linhas 47-50):**
```
"overrides": {
  "uuid": "^11.1.1",
  "brace-expansion": "^5.0.8"
}
```
Sem comentÃ¡rio explicando a razÃ£o (package.json nÃ£o suporta comentÃ¡rios) â€”
inferido via lockfile:
- `uuid`: forÃ§ado para 11.1.1 sobre o que o Sequelize pede internamente
  (`sequelize` declara `uuid: ^8.3.2` â€” `server/package-lock.json:10255`). O
  override eleva todo o uso transitivo de v8 para v11.
- `brace-expansion`: forÃ§a 5.0.9 sobre 4 ranges conflitantes na Ã¡rvore
  (`^2.0.2`, `^2.0.2`, `^5.0.5`, `^1.1.7`), consistente com correÃ§Ã£o de uma
  vulnerabilidade de ReDoS historicamente associada a versÃµes antigas.

### client (33 deps diretas + 12 devDeps = 45)

- Todas as libs verificadas resolvem do registry oficial, licenÃ§as MIT/ISC
  (spot-check em axios, cmdk, lucide-react, next-themes, radix-ui,
  react-router, recharts, sonner, tailwindcss, tw-animate-css).
- `zod: ^3.25.76` (major 3) â€” diverge do server (major 4). Ver AUD-DEP-4.
- `typescript: ~6.0.2` â€” diverge do server (`^7.0.2`), alinhado com
  mobile/tv.
- `jsdom: ^27.4.0` (devDependency, usado por vitest) â€” **reconfirmaÃ§Ã£o do
  incidente conhecido**: `client/package.json` declara
  `"engines": {"node": "^20.19.0 || ^22.12.0 || >=24.0.0"}` â€” jsdom 27.4.0
  **jÃ¡ suporta Node 24 explicitamente**. A incompatibilidade registrada na
  memÃ³ria do projeto **nÃ£o se aplica mais Ã  versÃ£o atualmente instalada** â€”
  ou jÃ¡ foi corrigida a montante pelo mantenedor, ou a memÃ³ria se referia a
  uma versÃ£o anterior (26.x ou menor). Recomenda-se atualizar a memÃ³ria do
  projeto para nÃ£o repetir esse achado como se fosse ativo.
- **DependÃªncias `@radix-ui/react-*` possivelmente nÃ£o usadas** â€” 9 pacotes
  declarados em `dependencies` mas os wrappers de UI correspondentes
  importam do pacote agregador `radix-ui` em vez do individual. Ver
  AUD-DEP-2.

### mobile (14 deps diretas + 3 devDeps = 17)

Tudo resolve de `registry.npmjs.org`, licenÃ§as MIT nos itens verificados
(expo*, react-native, react-native-gesture-handler, react-native-reanimated,
react-native-safe-area-context, react-native-screens,
react-native-worklets). `react-native-gesture-handler`,
`react-native-reanimated`, `react-native-worklets`, `expo-camera`
confirmados em uso real.

### tv (11 deps diretas + 4 devDeps = 15)

- `"react-native": "npm:react-native-tvos@0.86.2-0"` Ã© um **alias npm
  intencional** â€” resolve corretamente para o pacote oficial
  `react-native-tvos` (registry oficial, MIT). NÃ£o Ã© dependency confusion;
  Ã© o padrÃ£o documentado para builds de TV com Expo. VersÃ£o bate com
  `react-native@0.86.2` do mobile â€” bom sinal de paridade de versÃ£o do
  core RN entre as duas plataformas.
- `@react-native-tvos/config-tv` (devDependency) â€” pacote de nicho,
  comunidade pequena, sem CVE conhecida na base de conhecimento â€”
  observaÃ§Ã£o de baixa base de mantenedores.

---

## Findings

### AUD-DEP-1 â€” `uuid@11.1.1` usado diretamente sem constar em `dependencies` (phantom dependency via override)

- **Severidade:** LOW Â· **ConfianÃ§a:** CONFIRMED
- **DescriÃ§Ã£o:** `server/package.json` declara `"uuid": "^11.1.1"` apenas em
  `overrides` (linha 48), nunca em `dependencies`/`devDependencies`. A
  resoluÃ§Ã£o efetiva (`server/package-lock.json:11261-11264`) sÃ³ existe
  porque `sequelize` (dependÃªncia direta) tambÃ©m requer `uuid: ^8.3.2`
  (`server/package-lock.json:10255`) e o override eleva essa resoluÃ§Ã£o
  transitiva para 11.1.1 em toda a Ã¡rvore.
- **EvidÃªncia:** `server/package.json:47-50` (overrides), ausÃªncia
  confirmada em 28-46 (dependencies); importado diretamente em
  `server/src/scripts/backfill/02b_product_to_item.ts`,
  `02c_bom_to_item_estrutura.ts`, `02b-bis_category_to_item_categoria.ts`.
- **Impacto:** scripts de backfill (migraÃ§Ã£o de dados) podem quebrar
  silenciosamente em builds futuras se a cadeia transitiva mudar, sem que
  `npm ls uuid --depth=0` acuse o problema antes disso.
- **RecomendaÃ§Ã£o:** adicionar `"uuid": "^11.1.1"` explicitamente em
  `dependencies` de `server/package.json` (aÃ§Ã£o de remediaÃ§Ã£o, nÃ£o
  executada nesta trilha).

### AUD-DEP-2 â€” 9 pacotes `@radix-ui/react-*` declarados sem import direto detectado

- **Severidade:** LOW Â· **ConfianÃ§a:** HIGH_CONFIDENCE
- **DescriÃ§Ã£o:** `client/package.json` declara individualmente
  `@radix-ui/react-{avatar,dropdown-menu,popover,progress,select,separator,switch,tabs,tooltip}`,
  ao lado do pacote agregador `"radix-ui": "^1.6.7"`. Todos os wrappers
  correspondentes importam de `radix-ui` (bundle), nÃ£o dos pacotes
  individuais. `@radix-ui/react-select` nÃ£o tem nem wrapper correspondente
  em `client/src/components/ui`.
- **EvidÃªncia:** `client/package.json:17-28,37`;
  `client/src/components/ui/{avatar,dropdown-menu,popover,progress,separator,switch,tabs,tooltip,breadcrumb}.tsx`
  importando de `"radix-ui"`.
- **Impacto:** superfÃ­cie de dependÃªncia maior que o necessÃ¡rio; risco de
  duplicaÃ§Ã£o de cÃ³digo empacotado se o bundler nÃ£o fizer dedupe correto.
- **RecomendaÃ§Ã£o:** confirmar com OpusCore se hÃ¡ migraÃ§Ã£o incompleta para
  o bundle `radix-ui`; se sim, remover os 9 pacotes individuais Ã³rfÃ£os.

### AUD-DEP-3 â€” `pg-hstore` Ã© candidata a dependÃªncia abandonada

- **Severidade:** INFO Â· **ConfianÃ§a:** MEDIUM_CONFIDENCE
- **DescriÃ§Ã£o:** `server` declara `"pg-hstore": "^2.3.4"` diretamente
  (exigido pelo Sequelize para o dialeto pg quando colunas hstore sÃ£o
  usadas). Pacote historicamente de manutenÃ§Ã£o mÃ­nima â€” sem evidÃªncia de
  scan/feed de vulnerabilidade disponÃ­vel para confirmar CVEs ativas.
- **EvidÃªncia:** `server/package.json:41`,
  `server/package-lock.json:9742-9748`.
- **RecomendaÃ§Ã£o:** incluir `pg-hstore` no prÃ³ximo `npm audit`; confirmar se
  hstore Ã© de fato usado em alguma coluna do schema atual.

### AUD-DEP-4 â€” VersÃµes major divergentes de `zod`/`typescript` entre workspaces

- **Severidade:** LOW Â· **ConfianÃ§a:** CONFIRMED
- **DescriÃ§Ã£o:** `server` usa `zod ^4.4.3` e `typescript ^7.0.2`; `client`
  usa `zod ^3.25.76` e `typescript ~6.0.2`; `mobile`/`tv` usam
  `typescript ~6.0.3` (sem zod). Sem workspace raiz compartilhando zod
  entre client/server â€” mas se algum contrato de API depender de
  comportamento de parsing do zod v3 vs v4, isso Ã© fonte plausÃ­vel de
  divergÃªncia de validaÃ§Ã£o entre o que o server espera e o que o client
  valida.
- **EvidÃªncia:** `server/package.json:45,69`; `client/package.json:47,59`;
  `mobile/package.json:24`; `tv/package.json:22`.
- **RecomendaÃ§Ã£o:** confirmar com OpusCore se hÃ¡ intenÃ§Ã£o de unificar major
  de zod/typescript entre workspaces, ou se a divergÃªncia Ã© deliberada.

---

## Lacunas declaradas (obrigatÃ³rio)

1. **Nenhuma evidÃªncia de `npm audit` persistida** para este projeto. Toda
   a classificaÃ§Ã£o acima Ã© baseada em leitura de manifest/lockfile e
   heurÃ­stica de grep â€” nÃ£o hÃ¡ cruzamento com CVE/GHSA reais. Nenhuma
   severidade acima de LOW/INFO foi atribuÃ­da por essa razÃ£o; se houver CVE
   ativa em qualquer pacote listado, a severidade real pode ser maior.
   **Recomenda-se rodar `npm audit --json` nos 4 workspaces** (aÃ§Ã£o
   futura, exige aprovaÃ§Ã£o humana por envolver execuÃ§Ã£o de comando).
2. **Cobertura de licenÃ§as Ã© parcial** (spot-check, nÃ£o exaustiva de toda a
   Ã¡rvore transitiva).
3. **VersÃµes "major muito antiga"** marcadas acima como estimativa dependem
   da base de conhecimento do agente (corte janeiro/2026); dado que hoje Ã©
   agosto/2026, qualquer pacote pode ter major mais recente desconhecido â€”
   sinalizado individualmente onde relevante.
4. Nenhuma ferramenta de execuÃ§Ã£o foi usada â€” nÃ£o foi rodado `npm audit`,
   `npm outdated`, `npm ls`, nem acessada rede/registry ao vivo. Tudo acima
   vem de leitura estÃ¡tica de `package.json`/`package-lock.json` e `grep`
   no cÃ³digo-fonte.

---

## Resumo de contagem de dependÃªncias diretas por workspace

| Workspace | dependencies | devDependencies | overrides | Total direto |
|---|---|---|---|---|
| server | 17 | 18 | 2 (uuid, brace-expansion) | 35 (+2 overrides) |
| client | 33 | 12 | 0 | 45 |
| mobile | 14 | 3 | 0 | 17 |
| tv | 11 | 4 | 0 | 15 |
| **Total** | **75** | **37** | **2** | **112 (+2 overrides)** |

---

*Produzido pelo agente `vericore-dependency-security-auditor` em modo
read-only reforÃ§ado (Read/Grep/Glob apenas, sem Write disponÃ­vel nesta
sessÃ£o); conteÃºdo persistido neste caminho pelo orquestrador a partir da
resposta do agente, sem ediÃ§Ã£o de conteÃºdo.*
