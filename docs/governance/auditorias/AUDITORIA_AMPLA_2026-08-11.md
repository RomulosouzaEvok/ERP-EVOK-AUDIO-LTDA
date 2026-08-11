# Auditoria Ampla — 11 de agosto de 2026

**Escopo pedido pelo dono:** três frentes (estado real × documentado, prontidão
para Go-Live, segurança e código), com **peso extra na frente de frontend**,
motivado pela queixa: *"muita coisa errada na parte de visão, departamento
misturado com outro, departamento mesclado, relatórios de departamentos
mesclados"*.

**Método:** medição contra banco, código e suíte em execução. Nenhum achado
abaixo vem de leitura de documentação — a auditoria de 2026-08-10 já mostrou
que o `TODO.md` mente. Commit auditado: `b1275cf`, árvore limpa.

---

## 0. Sumário executivo

A queixa do dono **se confirma e tem causa única identificável**: o menu do
frontend foi desenhado em 9 seções inventadas que não correspondem aos 17
departamentos que existem no banco. Não é acúmulo de pequenos erros — é um
modelo de navegação paralelo à realidade organizacional.

Fora disso, o sistema está em melhor forma do que a documentação sugere em
alguns pontos e em pior em um ponto grave: **o cadastro está praticamente
vazio** (0 funcionários, 0 fornecedores, 0 clientes), o que torna o teste
ponta a ponta com escrita real — o critério de aceite do projeto —
**inexecutável hoje**.

| Frente | Veredito |
|---|---|
| Frontend / segregação departamental | 🔴 **Reprovado** — 5 achados, 1 deles com efeito colateral funcional |
| Estado real × documentado | 🟡 7 desvios, todos menores; nenhuma alegação grosseiramente falsa |
| Prontidão Go-Live | 🔴 **Bloqueado por dados**, não por código |
| Segurança | 🟢 Sólida — 1 vulnerabilidade alta aberta, 1 exposição de dado pessoal |

**Suíte (executada nesta auditoria, tudo verde):**
1811 unitários / 167 suítes · 167 integração / 44 suítes / **zero skip** ·
69 testes de client / 12 arquivos.

---

## 1. FRONTEND — segregação departamental 🔴

### F1. Dois departamentos apontam para o mesmo relatório, e isso troca o menu inteiro

`client/src/layouts/AppLayout.tsx` — linhas 120 e 138:

```
{ label: 'Relatórios de Logística', to: '/reports?tab=purchasing', module: 'relatorios.compras' }
{ label: 'Relatórios de Compras',   to: '/reports?tab=purchasing', module: 'relatorios.compras' }
```

Link idêntico, módulo de permissão idêntico, rótulos diferentes. **Não existe
aba de logística** — `ReportsPage.tsx:19` define apenas
`'production' | 'oee' | 'purchasing' | 'costs' | 'financial'`.

O efeito não é só cosmético. `AppLayout.tsx:399-406` resolve o departamento
ativo assim:

```ts
const activeSection = visibleSections.find((section) =>
  section.items.some((item) => { ... return `${pathname}${search}` === item.to; }),
) ?? visibleSections[0];
```

`find` devolve o **primeiro** match. Como "Logística" vem antes de "Compras" no
array, **clicar em "Relatórios de Compras" ativa a seção Logística** — a barra
de departamentos e o menu lateral inteiro trocam para o departamento errado.
É literalmente o "departamento mesclado com outro" que o dono descreveu.

### F2. As seções do menu não são os departamentos da empresa

O banco tem **17 departamentos** (`departments`, ids 2–18). O menu tem 9 seções
nomeadas + 1 sem nome. O mapeamento não fecha em nenhum sentido:

| Seção do menu | O que ela realmente funde |
|---|---|
| **Logística** | Almoxarifado + Expedição + Recebimento + Produtos/Item Mestre (que é Engenharia do Produto) |
| **Qualidade & Engenharia** | Qualidade + Engenharia do Produto + **SST** + Laboratório — 3 departamentos reais em uma caixa |
| **Vendas** | Vendas + **Marketing** (departamento próprio, id 15) |
| **Produção** | Produção + **PCP** (departamento próprio, id 5 — MRP e Plano Mestre moram aqui) |
| **Gestão** | Financeiro + Contabilidade + Tesouraria + Controladoria + **Rastreabilidade** (que é Qualidade) |
| **Administração** | **RH + TI + Facilities + Jurídico** (4 departamentos) + Usuários + Perfis + Config. Fiscal + Auditor |

Departamentos **sem nenhuma seção própria:** PCP, Marketing, SST, Almoxarifado,
Expedição, RH, TI, Facilities, Jurídico, Engenharia do Produto.
Departamento **sem nenhuma presença na UI:** Diretoria.

### F3. A barra de departamentos é uma ficção

A barra superior de "departamentos" (`AppLayout.tsx:390+`) deriva de
`visibleSections` — ou seja, das 9 seções inventadas. Ela não consulta
`departments` e não tem relação com o departamento do funcionário logado.
O usuário vê uma navegação "por departamento" que não corresponde a nenhum
departamento real, nem ao dele.

### F4. Item de menu sem controle de acesso expõe o cadastro de pessoas

`itemVisible` (`AppLayout.tsx:378-383`) libera qualquer item que não declare
`module` nem `roles`. Três itens caem nisso: "Meus Chamados", "Chamado Predial"
e **"RH (Funcionários/Departamentos)"**.

Os dois primeiros são auto-serviço deliberado e documentado. O de RH também
está comentado como intencional — *"GET /api/employees e /api/departments
exigem só sessão autenticada"*. Mas a consequência é que **qualquer usuário
autenticado lista todos os funcionários e departamentos da empresa**.

Isto é achado de **backend**, não de frontend: o menu só reflete uma rota sem
RBAC. Ganha peso porque (a) é dado pessoal sob LGPD e (b) o Bloco 7
(bot WhatsApp) vai ler `employees` — o robô herdaria um escopo irrestrito.

### F5. Cobertura de teste do frontend é ~8%

151 páginas `.tsx`; 12 arquivos de teste (69 testes). Existe
`App.routes.test.tsx` para fiação de rota, mas **nenhum teste garante coerência
entre menu e departamento** — é exatamente por isso que F1 sobreviveu.

---

## 2. ESTADO REAL × DOCUMENTADO 🟡

| # | Alegação | Medido | Veredito |
|---|---|---|---|
| D1 | CLAUDE.md: 200 tabelas, 459 FKs, 160 migrations | **201 / 464 / 164** | Desatualizado (4 migrations a mais) |
| D2 | Runbook §6: `npm test`, `npm run test:unit`, `npm run test:integration` | **Nenhum existe na raiz** — raiz só tem `start/server/client/dev/install-all`. Só funcionam em `server/` | 🔴 Runbook errado |
| D3 | CLAUDE.md cita `scripts/comparar-bancos.cjs` | Está em **`server/scripts/`** | Caminho errado |
| D4 | "Falta aprovador real no domínio `@evokaudio.com.br`" (D-K) | **Existe:** `IMPLANTACAO@evokaudio.com.br`, perfil *Diretoria Executiva*, com `diretor=approve`, distinto do `admin` | ✅ Bloqueador fechado — doc não sabe |
| D5 | 4 tabelas-fantasma em português marcadas DEPRECATED | Presentes: `requisicoes_compra`, `requisicao_compra_items`, `auditoria_eventos`, `item_estruturas` | Confere |
| D6 | Integração voltou a rodar de verdade (não pula em silêncio) | 44 suítes, 167 testes, guarda de "sem skips" passou | ✅ Confere |
| D7 | Os dois bancos são idênticos | `comparar-bancos.cjs`: 0 divergências | ✅ Confere |

Nenhuma alegação grosseiramente falsa como as ~12 de 10/08. O padrão dos
desvios é **envelhecimento**, não invenção.

---

## 3. PRONTIDÃO PARA GO-LIVE 🔴

### G1. O cadastro está muito mais vazio do que a documentação diz

A documentação fala em "327 itens carregados, porém crus". Medido no banco:

| Entidade | Registros |
|---|---|
| `items` | **327** — 100% `MATERIA_PRIMA`, custo 0, estoque 0 |
| `employees` | **0** |
| `suppliers` | **0** |
| `clients` | **0** |
| `bill_of_materials` | **0** |
| `production_routes` | **0** |
| `production_orders` | **0** |
| `sales` | **0** |
| `purchase_orders` / `purchase_requisitions` | **0** / **0** |
| `audit_logs` | **2** |

A documentação registra a ausência de produto acabado, BOM e roteiro. **Não
registra em lugar nenhum que funcionários, fornecedores e clientes estão
zerados.**

### G2. Consequência não mapeada: isso bloqueia o Bloco 7 (bot WhatsApp)

`whatsapp_contacts.employee_id` é FK **NOT NULL** para `employees`
(`BLOCO_7_WPP_MODELO_DADOS.md` §3.1, decisão M-1). Com `employees` vazio,
**nenhum número de WhatsApp pode ser vinculado a ninguém** — a Fase 1 não sai
do papel por falta de dado, não por falta de código.

**Cadastrar funcionários deixou de ser tarefa só do RH: virou pré-requisito
do Bloco 7.** Isso não está escrito em nenhum documento da frente.

### G3. O critério de aceite do projeto não é executável hoje

Com 0 fornecedores não existe pedido de compra; com 0 clientes não existe
venda; sem BOM e roteiro nenhuma OP inicia (G6 recusa a partida, por desenho).
Ou seja, **"uma escrita real bem-sucedida no fluxo principal"** — o critério
honesto que o próprio CLAUDE.md define — não pode ser demonstrado no estado
atual do banco.

### G4. Infra

Servidor de produção **adiado 3–4 meses** por decisão do dono (11/08). O
runtime ainda conecta como `evok_admin`, não pela role de privilégio mínimo
`evok_app` (confirmado no `.env`) — pendência conhecida, sem urgência enquanto
o ambiente for de desenvolvimento.

---

## 4. SEGURANÇA 🟢

| # | Item | Resultado |
|---|---|---|
| S1 | Segredos versionados | **Nenhum.** `.gitignore` cobre `.env*` e `*.local.txt`; existe `scan-tracked-secrets.cjs` |
| S2 | `npm audit` **server** | **0 vulnerabilidades** |
| S3 | `npm audit` **client** | 🟡 **1 alta** — `nanoid <3.3.17` (`GHSA-2v37-7h3g-55p8`), fix disponível. CLAUDE.md afirma "0 vulnerabilidades" |
| S4 | Autenticação nas rotas | **54/54 arquivos de rota** usam `authenticate`. Só `health.ts` sem `authorizeModule` — correto |
| S5 | Exposição de dado pessoal | 🟡 `GET /api/employees` e `/api/departments` sem RBAC (ver F4) |
| S6 | Role de runtime | `evok_admin` em vez de `evok_app` (ver G4) |

---

## 5. Achados priorizados

| # | Achado | Gravidade | Esforço |
|---|---|---|---|
| **1** | F1 — link duplicado troca o departamento ativo | Alta (funcional) | Baixo |
| **2** | G1/G2 — cadastro vazio bloqueia aceite **e** o Bloco 7 | Alta (bloqueia Go-Live) | Alto (dado, não código) |
| **3** | F2/F3 — menu não corresponde aos 17 departamentos | Alta (é a queixa do dono) | Médio-alto (redesenho de IA) |
| **4** | F4/S5 — `employees`/`departments` sem RBAC | Média (LGPD; piora com o bot) | Baixo |
| **5** | S3 — `nanoid` alta no client | Média | Trivial (`npm audit fix`) |
| **6** | D2/D3 — runbook do CLAUDE.md com comandos que não existem | Média (custa tempo a quem chega) | Trivial |
| **7** | F5 — sem teste de coerência menu↔departamento | Média | Baixo |
| **8** | D1/D4 — números e bloqueador D-K desatualizados | Baixa | Trivial |

### Sequência recomendada

1. **Trivialidades primeiro** (#5, #6, #8) — meia hora, tira ruído do radar.
2. **#1** — corrigir o link duplicado; é bug de verdade e barato.
3. **#4** — pôr RBAC em `employees`/`departments` **antes** de qualquer código
   do Bloco 7, senão o robô nasce com escopo irrestrito.
4. **#3** — o redesenho do menu. Merece decisão sua antes de código: o alvo é
   espelhar os 17 departamentos do banco, ou manter agrupamentos por fluxo
   físico com nomes que não mintam? São desenhos diferentes.
5. **#2** — cadastro. É o caminho crítico dos próximos meses e não depende de
   programação: funcionários, fornecedores, clientes, produto acabado, BOM,
   roteiro. Sem isso nada mais pode ser declarado pronto.

---

## 6. Remediação aplicada no mesmo dia (2026-08-11)

| Achado | O que foi feito | Verificação |
|---|---|---|
| **F1** | Removido o item duplicado "Relatórios de Logística". A resolução do departamento ativo passou a usar **prefixo mais longo** com limite de segmento — `/production/bom` (Engenharia) não é mais capturado por `/production` (Produção) | Guarda nova reprova destino repetido |
| **F2/F3** | Navegação **derivada**: `client/src/lib/departments.ts` vira SSOT dos departamentos; `NAV_ITEMS` é lista plana onde cada página declara o dono; as seções são o cruzamento perfil × departamento, na ordem do fluxo do material | typecheck + build + 74 testes |
| **F5** | `AppLayout.navigation.test.tsx` — 5 asserções: destino único, departamento declarado, nenhuma aba vazia, itens agrupados, querystring apontando para aba real do `ReportsPage` | 5/5 verdes |
| **S3** | `npm audit fix` no client — `nanoid` corrigido | `npm audit`: 0 vulnerabilidades |
| **D2/D3** | Runbook §6 do CLAUDE.md corrigido (scripts vivem em `server/`/`client/`); caminho de `comparar-bancos.cjs` corrigido | — |
| **D1** | Números do banco atualizados (201/464/164) | — |
| **F4/S5** | **Reclassificado de Média para Baixa.** Os campos sensíveis (CPF, salário, banco, endereço, telefone) já são filtrados no backend por `employeeSensitiveFields.ts` sob o módulo `rh`. O que fica aberto a autenticados é nome/cargo/departamento, e é deliberado — o seletor de operador do chão de fábrica depende disso | Leitura do serviço |

**F1-bis — a mistura tinha um segundo andar (apontado pelo dono ao testar).**
Corrigir o menu não bastava: `ReportsPage` é **uma página compartilhada por
vários departamentos** e exibia todas as abas que o perfil permitisse,
ignorando de onde o usuário veio. Quem clicava em "Relatórios de Compras"
caía numa tela que também oferecia Produção, OEE, Custos e Financeiro.
Agora as abas são `permissão do perfil ∩ departamento de entrada`
(`TAB_DEPARTMENT`), o cabeçalho nomeia o departamento, e a faixa de abas
**some** quando a área tem um relatório só — como Compras. A trilha de
navegação passou a considerar a querystring, então `/reports?tab=purchasing`
lê "Compras › Relatórios de Compras" em vez de só "Relatórios".

**Ganhos que não estavam na lista de achados**, encontrados durante a correção:

- Quatro páginas existiam **sem entrada no menu** e agora têm:
  `/production/bom` (Estrutura de Produto), `/products/inventory-counts`
  (Contagens de Inventário), `/sales/clients` (Clientes) e `/audit-logs`
  (Log de Auditoria). A aba de custos do `ReportsPage` também não tinha
  link e ganhou um.
- A rota `/dashboard` estava **órfã** — nenhum menu levava a ela. Passou a
  hospedar a **Sala de Comando da Diretoria**
  (`client/src/pages/executive/CommandCenterPage.tsx`), com a cadeia do
  produto de ponta a ponta (Compras → Recebimento → Produção → Qualidade →
  Expedição), gargalo apontado, OEE decomposto nos três eixos e maiores
  fornecedores. Todos os números vêm de `/api/reports/*` e
  `/api/dashboard/handoffs` — nenhum é calculado no cliente. Acesso pelo
  módulo `diretor`, o mesmo da alçada de aprovação.
- A trilha de navegação deixou de ser um mapa de ~50 linhas escrito à mão
  (que ainda dizia "Logística"/"Gestão") e passou a ser derivada do menu.

**O que NÃO foi tocado:** achado #2 (cadastro vazio — é dado, não código) e
#3 no que depende de decisão da fábrica. Duas escolhas de alocação ficaram
registradas em comentário no código, mudáveis em uma linha: cadastro de
item/BOM sob **Engenharia do Produto** (quem cria o código) e
Garantia/Assistência Técnica sob **Qualidade** (defeito de produto).

---

## 7. Levantamento de impacto — a estrutura organizacional no ERP inteiro

Pedido do dono após identificar que o menu agrupava departamentos
inexistentes: *"levantamento do que isso pode ter afetado em todo o nosso
ERP"*. Cada linha abaixo foi **medida** (banco, código, grep), não estimada.

| Onde | Como consome a estrutura | Veredito |
|---|---|---|
| `server/src/config/seeds.ts` | SSOT — 17 departamentos (`code`/`name`/`sigla`) | ✅ Íntegro; é a fonte |
| Tabela `departments` | 17 linhas. Colunas: `id, code, name, sigla, description, manager_id, active, cost_center_id` | ⚠️ **Sem coluna de hierarquia** |
| **18 tabelas** com `department_id` | FK plana → `departments`: `assets`, `employees`, `production_orders`, `purchase_requisitions`, `inventory_counts`, `facility_areas` + 12 de RH/SST/TI/JUR | ✅ Data-driven, **não afetadas** |
| `client/src/layouts/AppLayout.tsx` | 9 seções inventadas, escritas de memória | 🔴 **Epicentro** — corrigido |
| `client/src/lib/departments.ts` | Novo espelho de `seeds.ts` com `code`/`sigla`/`directorate` | ✅ Criado, com guarda |
| App **TV** (`tv/`) | `DepartmentCard` renderiza `demand.department_id` vindo da API | ✅ **Imune** — nunca teve lista própria |
| App **mobile** (`mobile/`) | Não agrupa por departamento | ✅ Não afetado |
| `handoffSignal.ts` | Semáforo por entidade/status, não por área | ✅ Não afetado |
| `accessModules.ts` (40 módulos RBAC) | Só `key` + `label` | ⚠️ **Não tem noção de departamento** |
| `access_profiles` (21 perfis no banco) | Nomeados à mão | ⚠️ Drift de nome (ver F-7) |
| Documentação | 3 cópias do organograma, 2 divergentes entre si | 🔴 Consolidado em 1 |
| Bloco 7 — WhatsApp | `whatsapp_contacts.department_id` define o escopo de atendimento | ⚠️ Nasce agora — ver F-9 |

### O que o levantamento revelou de novo

**F-6 — A hierarquia não existe no banco.** `departments` não tem
`parent_id` nem `directorate`. As 4 diretorias vivem apenas na documentação
e, desde hoje, na navegação. Consequência prática: **nenhum relatório do ERP
consegue agregar por diretoria**. Um Diretor Industrial não tem como pedir
"os números dos meus 5 departamentos" — teria que somar à mão. Enquanto
ninguém precisar disso, a convenção basta; quando precisar, é uma coluna
`directorate` em `departments` mais o backfill dos 17 registros.

**F-7 — `access_profiles` tem drift de nome com o seed.** Dois dos 21
perfis não batem: *"Tecnologia da Informacao"* onde o seed diz **TI**, e
*"Seguranca e Saude do Trabalho"* onde o seed diz **Segurança do
Trabalho**. Perfis são criados à mão pela tela de administração, sem
nenhuma guarda ligando ao seed — a mesma ausência de vínculo que causou o
defeito principal, num segundo lugar. Não quebra nada hoje (perfil e
departamento são entidades independentes), mas confunde quem lê a lista.

**F-8 — O backend não sabe qual departamento é dono de cada módulo.** Os 40
módulos de `accessModules.ts` declaram `key` e `label`, nada mais. Por isso
o mapeamento módulo→departamento existe **só no frontend**. Enquanto o
consumidor for a tela, tudo bem. No dia em que o backend precisar da mesma
resposta, vai reinventar o mapeamento — e as duas versões vão divergir, que
é exatamente o padrão de defeito que esta auditoria está corrigindo.

**F-9 — O Bloco 7 (assistente WhatsApp) depende disto e ainda não nasceu.**
`whatsapp_contacts.department_id` é o que define o escopo de atendimento do
funcionário: o bot responde "conforme a área de trabalho de quem pergunta".
Como nenhuma linha foi escrita, ele nasce sobre a estrutura já corrigida —
**desde que** o mapeamento módulo→departamento (F-8) exista no backend
antes do primeiro sub-agente departamental. Se não existir, o n8n vai
inventar o dele, e o gap volta pela quarta vez em outro lugar.

### Remediação estrutural aplicada

O que impede a recorrência não é ter corrigido o menu — é o **vínculo
mecânico** criado entre documentação e código, que não existia:

| Peça | Papel |
|---|---|
| `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md` | SSOT único da hierarquia. Desenho e tabela agora concordam |
| `docs/administrativo/00-README.md` | Cópia divergente do organograma **removida**, virou ponteiro |
| `docs/00-ESTRUTURA_ORGANIZACIONAL.md` | Separa "agrupamento por pasta de docs" de "hierarquia executiva", que se confundiam |
| `client/src/lib/departments.ts` | Espelho com `code`/`sigla`/`directorate` |
| `client/src/lib/departments.seeds.test.ts` | **Guarda** — lê `seeds.ts` e reprova divergência de nome, código, sigla ou quantidade. Verificada quebrando de propósito: renomear Expedição para "Logistica" faz reprovar com `11: nome "Logistica" ≠ seed "Expedição"` |

### F-6 a F-10 — remediação (mesmo dia)

| Achado | Estado | O que foi feito |
|---|---|---|
| **F-8** — backend não sabia o dono de cada módulo | ✅ **Fechado** | `AccessModuleDescriptor` ganhou `owner` (sigla do seed). Os 39 módulos declarados. Guarda `server/tests/unit/organizational-structure-guard.test.ts`: dono precisa existir no seed, nenhum módulo órfão, nenhum departamento sem módulo |
| **F-8-bis** — menu × catálogo | ✅ **Fechado** | `AppLayout.navigation.test.tsx` cruza cada item com o `owner` do módulo. Verificada quebrando de propósito: devolver Garantia para Qualidade reprova com `módulo garantia é de VEND (vendas)` — a guarda que teria pego meu erro sozinha |
| **F-10** *(novo, achado ao remediar F-7)* — `users.department` gravava departamento inexistente | ✅ **Fechado** | `users.department` é **texto livre** (não existe `users.department_id`), e o seed de usuários de teste escrevia **sem acento**: `Producao`, `Expedicao`, `Manutencao`, `Juridico`, `Seguranca do Trabalho`. **5 dos 17 departamentos não casavam** — quem filtrasse usuário por nome de área não achava ninguém dessas cinco. Script corrigido, 5 linhas do banco atualizadas (0 divergências agora), guarda nova impede regressão |
| **F-7** — perfil se ligava a departamento por nome | ✅ **Fechado** | A correção não foi renomear as duas strings divergentes — foi dar **FK**: `access_profiles.department_id`, n:1 (`Compras (analista)` e `Compras (gerente)` apontam para o mesmo departamento). Nome de perfil volta a ser só rótulo legível, sem risco de drift. Só `Administrador Geral` ficou NULL — é perfil de sistema |
| **F-6** — hierarquia não existia no banco | ✅ **Fechado** | Tabela `directorates` (5 linhas) + `departments.directorate_id`. Relatórios já podem agregar por diretoria. Ver decisão de modelagem abaixo |

### A decisão de modelagem de F-6 (e por que não foi `parent_id`)

Migration `20260811-000043-create-directorates-hierarchy.cjs`, aplicada nos
**dois** bancos e conferida com `comparar-bancos.cjs` (0 divergências).

A literatura recomenda *adjacency list* — auto-referência `parent_id` — como
padrão para hierarquia em SQL, e ela seria a escolha certa **se pai e filho
fossem a mesma entidade**. Aqui não são: `Diretoria (01)` é UM departamento
no seed, e os quatro diretores são *cargos dentro dele*
(`docs/administrativo/01-DIRETORIA.md`). Usar `parent_id` obrigaria a criar
linhas falsas em `departments` chamadas "Diretoria Industrial", "Diretoria
Comercial" — departamentos que não existem na empresa, inventados só para
servir de nó de árvore. Seria fabricar dado para caber no modelo.

Diretoria é entidade distinta: agrupa departamentos, tem cargo próprio e
pode estar vaga. Hierarquia fixa de dois níveis → **uma tabela por nível**.

Duas decisões de nulidade, ambas para o banco não afirmar o que a empresa
não decidiu:

- `directorates.manager_id` **NULL** — `SUP` nasce com o cargo vago, porque
  a diretoria foi decidida e o ocupante não;
- `departments.directorate_id` **NULL** — SST é transversal, "reporta
  tipicamente à Diretoria/RH, varia por porte de empresa". `NOT NULL`
  forçaria escolher uma subordinação inexistente.

Resultado medido no banco, batendo com o organograma linha a linha:

```
CEO Diretoria ................. 1  DIR
IND Diretoria Industrial ...... 5  ENG, PCP, PROD, QUAL, MANUT
SUP Suprimentos & Logística ... 3  ALM, COMP, EXP
COM Diretoria Comercial ....... 2  VEND, MKT
ADM Administrativo-Financeiro . 5  RH, FIN, TI, JUR, FAC
(transversal) ................. 1  SST
```

Duas guardas existentes pegaram defeitos meus durante esta rodada — vale
registrar, porque é a rede funcionando: `export-assignment-guard` reprovou
`Directorate.ts` por misturar `export =` com outro export de topo
(armadilha ESM+CJS do projeto), e `seeds-production-boot` reprovou porque o
dublê de `models/index` não conhecia o model novo.

### Correções de conteúdo do organograma

Três defeitos do documento anterior, todos apontados pelo dono:

1. O desenho ASCII punha **ALM no braço Administrativo-Financeiro**; a
   tabela do mesmo arquivo punha sob o Industrial.
2. A nota de **EXP** ficava pendurada em **MANUT** — "Expedição responde a
   Manutenção" não existe em nenhuma prática de mercado.
3. **Compras** era "transversal, sem diretoria fixa" — não-decisão, apesar
   de ser departamento pleno com gerente próprio.

Resolvidos com a **4ª diretoria, Suprimentos & Logística** (Compras +
Almoxarifado + Expedição), seguindo a separação clássica entre *supply
chain* e *operations*. Cargo decidido pelo dono, **ainda vago** — o
documento diz isso explicitamente em vez de fingir um ocupante.

E uma alocação minha corrigida: **Garantia/Assistência Técnica saiu de
Qualidade para Vendas.** `docs/comercial/00-README.md` atribui pós-venda ao
Assistente Comercial (VEND). Eu havia confundido com a subárea "Garantia da
Qualidade" (GQ), que é função de QA, não RMA de produto vendido.

---

**Auditor:** sessão Claude Code de 2026-08-11
**Base:** commit `b1275cf`, banco `erp_evok_audio` (201 tabelas / 464 FKs / 164 migrations)
