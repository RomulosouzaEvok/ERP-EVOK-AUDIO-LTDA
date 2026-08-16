# REMEDIATION_CASE  (CoreTriad → SanaCore)
CASE_ID: ERP-LEGACY-001-CASE-003
FINDING_ID: **N/A — este caso NÃO tem finding próprio e NÃO fecha nenhum finding existente.** Ver §"Vínculo e não-vínculo" abaixo. O objeto é um **vetor da classe de risco `RC-PROC-01`**, não o finding `AUD-PROC-CUSTODIA-01`.
RISK_CLASS: `RC-PROC-01` — `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md` (ABERTA em 2026-08-16; autoridade de encerramento: dono, sobre evidência VeriCore)
PROJECT_ID: ERP-LEGACY-001
AUDIT_ID: N/A — o objeto não veio de trilha de auditoria da run `ERP-LEGACY-001-AUD-001`; veio de leitura de código feita nesta sessão (agente `documentador`) e reconfirmada por leitura própria do `coretriad-director` antes deste registro.
AUDIT_COMMIT: N/A. Os fatos abaixo foram lidos no **HEAD do worktree principal em 2026-08-16** (branch `main`), não em commit imutável. A SanaCore **DEVE reconfirmar cada âncora de linha no HEAD do seu worktree** antes de editar — as linhas citadas são do estado lido nesta data.
SEVERITY: **NÃO ATRIBUÍDA.** Este documento é registro de Control Plane; atribuir severidade é autoridade VeriCore (Regras 2, 5 e 22 do `CLAUDE.md`). O que ampara a prioridade não é severidade: é a decisão humana registrada em §1.
CONFIDENCE: os fatos de §2 são **verificados por leitura direta do código versionado** pelo `coretriad-director` (Regra 7). Não houve execução — nenhum script foi rodado, nenhuma conexão de banco foi aberta (`APR-2026-016`).
PRIORIDADE: **PRIORITÁRIA**, por determinação do dono (§1).

---

## 1. AUTORIZAÇÃO HUMANA (Regra 18) — texto verbatim

O dono do CoreTriad determinou, nesta sessão, em texto direto:

> *"Aprovo a recomendação: estenda `limpar-dados-transacionais.cjs` e
> `seed-usuarios-departamentos.cjs` com a mesma checagem de sufixo `_test`/`_ci`
> em `DB_NAME` que já existe e funciona em `run-api-suite.cjs:530-536`,
> recusando rodar (fail-closed) se o banco não tiver esse sufixo — antes de
> qualquer DELETE. Encaminhe para a SanaCore como remediação prioritária de
> `RC-PROC-01`, com reteste independente da VeriCore depois."*

A autorização cobre: (a) o desenho da guarda, (b) o encaminhamento à SanaCore,
(c) a exigência de reteste VeriCore. **Não** cobre fechamento de finding, **não**
declara nenhum critério `CE-*` cumprido e **não** aceita risco algum.

---

## 2. OBJETO DO CASO — fatos verificados por leitura

### 2.1 `server/scripts/limpar-dados-transacionais.cjs` — DELETE sem guarda de nome de banco

Guardas que **existem** hoje (verificadas):

| # | Guarda | Âncora |
|---|---|---|
| G-a | Recusa se `NODE_ENV === 'production'` (`console.error` + `process.exit`) | `:199-200` |
| G-b | Modo **simulação por padrão**: sem `--confirmar` nada é gravado | `:204`, `:250-251` |
| G-c | Detecção **pós-fato** de perda colateral em tabela preservada (a versão com `CASCADE` apagou `departments` em silêncio; aqui a perda vira erro) | `:314-325` |

Guarda que **não existe**: nenhuma das três confere o **nome do banco**. O script
lê `process.env.DB_NAME` cru (`:207`, ecoado em `:219`) e o entrega ao
`Sequelize`. Os `DELETE` estão em `:269` (`DELETE FROM "<tabela>"`) e `:272`
(`DELETE FROM "<tabela>" WHERE <onde>`), sob `session_replication_role='replica'`,
dentro de transação com `rollback` em erro (`:300-301`).

Registre-se que o gap **já está documentado no próprio cabeçalho do script**
(`:75-88`), inclusive nomeando `run-api-suite.cjs:530-536` como o padrão ausente
e o resíduo `CE-03` de `RC-PROC-01`, com a ressalva explícita de que implementar
o reforço "é decisão de engenharia do dono, não implementada por esta nota".
**Esta decisão foi agora tomada (§1).** O caso converte a nota em trabalho.

### 2.2 `server/scripts/seed-usuarios-departamentos.cjs` — mesmo gap

- Única guarda: `NODE_ENV === 'production'` → `:459-462`.
- `DB_NAME` lido cru **e com default para o banco real**: `:315`
  (`process.env.DB_NAME || 'erp_evok_audio'`), ecoado em `:469` com o mesmo
  default. **Agravante próprio deste script:** com `DB_NAME` **ausente** do
  ambiente, ele conecta ao banco REAL por omissão — o `limpar-dados` ao menos
  falha sem `DB_NAME`.
- Escritas destrutivas no modo `--limpar` (`:464`, `:471-474`):
  `DELETE FROM users WHERE email LIKE :pattern` (`:340`),
  `DELETE FROM access_profile_permissions` (`:346`, `:402`),
  `DELETE FROM access_profiles WHERE nome IN (:perfis)` (`:354`).
- O cabeçalho (`:26`, `:47-54`) já descreve o gap, incluindo o risco de o
  `LIKE '%@teste.evokaudio'` remover todos os casados e a citação de
  `APR-2026-016`.

### 2.3 Por que a guarda de `NODE_ENV` NÃO cobre o vetor real

`server/.env.example` — o arquivo que o próprio repositório manda copiar para
`.env` (`:4-5`, `cp .env.example .env`) — traz simultaneamente:

- `NODE_ENV=development` (`:9`)
- `DB_NAME=erp_evok_audio` (`:15`) — o **banco REAL**, PRODUÇÃO REAL por
  `APR-2026-016`, **sem sufixo `_test`/`_ci`**

Isto é configuração **normal e correta** de dev local neste projeto, porque
**não existe banco de dev separado do real**. Consequência: a guarda `G-a`
cobre o deploy de produção e **não cobre** o vetor que de fato ocorre — estação
de trabalho de desenvolvedor, ou **agente automatizado**, com `.env` padrão.
Nesse ambiente, `--confirmar` apaga dado real de produção sem que nenhuma
guarda dispare.

### 2.4 Padrão a replicar — `server/scripts/run-api-suite.cjs:517-536`

O repositório **já tem** a guarda correta, fail-closed, com justificativa
escrita no comentário `:517-523` ("não existe isolamento de banco por código, só
por configuração… barato de checar, caro de não checar"):

- `:524-529` — `throw` se `NODE_ENV === 'production'` **ou** `/prod/i` casar em
  `DB_NAME` **ou** em `DB_HOST`;
- `:530-536` — `throw` se `!/(_test|_ci)$/i.test(process.env.DB_NAME || '')`,
  com mensagem que ecoa o `DB_NAME` recusado e instrui a apontar
  `server/.env.test`.

Note-se que `run-api-suite.cjs` cobre **três** variáveis (`NODE_ENV`, `DB_NAME`,
`DB_HOST`) e que a checagem de sufixo é **fail-closed por construção**: `DB_NAME`
ausente vira `''`, que não casa o regex, e o script recusa.

---

## 3. DESENHO APROVADO E A DIVERGÊNCIA QUE ELE CARREGA (Regra 20)

**Registram-se as duas instruções, na ordem em que foram dadas, sem
silenciamento — a divergência é material e o caso não a esconde:**

| # | Instrução do dono | Efeito |
|---|---|---|
| I-1 (anterior) | *"guarda com escape explícito"* — flag deliberada que contorna a guarda, preservando a capacidade de limpar o banco real antes do Go-Live | Guarda existe, mas é contornável por quem sabe o nome da flag |
| I-2 (posterior, verbatim em §1) | *"recusando rodar (fail-closed) se o banco não tiver esse sufixo"* — **sem escape** | Guarda incontornável por linha de comando |

**PREVALECE `I-2`: fail-closed, sem escape.** Critério: instrução humana mais
recente sobre o mesmo objeto (Regra 20 — o desempate é o responsável humano,
não votação nem preferência de agente).

**CONSEQUÊNCIA OPERACIONAL QUE O DONO PRECISA TER CIENTE, REGISTRADA AQUI PARA
NÃO SE PERDER:** com fail-closed puro, **limpar os dados transacionais do banco
real antes do Go-Live passará a exigir alteração de código naquele momento** —
não haverá caminho por flag, variável ou argumento. Isso é deliberado (é o
ponto da guarda), mas cria uma tarefa futura obrigatória e um momento de risco
próprio (editar guarda sob pressão de cronograma).

O orquestrador levou esta divergência ao dono. **Se houver retificação, ela
entra como EMENDA a este caso** — nova seção `EMENDA-01`, com o texto verbatim
da retificação e a data —, **nunca por reescrita do texto acima** (Regra 15).
Até que exista emenda, a SanaCore implementa `I-2`.

**Não decidir por conta própria (Regra 6):** a SanaCore **não** deve introduzir
escape, variável de ambiente de bypass, `--forçar`, `--eu-sei-o-que-estou-fazendo`
ou equivalente, ainda que pareça prudente. Se a implementação revelar que o
fail-closed puro quebra um fluxo legítimo hoje existente, a SanaCore **formula a
questão** ao Control Plane e para — não decide.

---

## 4. VÍNCULO E NÃO-VÍNCULO (registrar a distinção é parte do caso)

- **VINCULA-SE a:** `RC-PROC-01` — classe de risco "restrição categórica contida
  por disciplina do agente, não por mecanismo"
  (`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`).
  Este caso ataca **um vetor** da classe: script destrutivo que só é impedido de
  tocar o banco real pela disciplina de quem o executa.
- **NÃO se vincula, NÃO remedia e NÃO fecha:** o finding
  `audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-PROC-CUSTODIA-01.md`
  (HIGH, CONFIRMED por `T-30_VALIDACAO_AUD-PROC-CUSTODIA-01.md`). Aquele finding
  é o **incidente pontual de custódia** (conexão de agente ao banco de produção),
  com vetor próprio (`docker exec … psql`) e reteste próprio (`RT-CUST-*`).
  **São objetos distintos.** Concluir esta remediação **não** produz nenhum
  efeito sobre o status daquele finding.
- **Relação com os critérios `CE-*` da classe:** o gap aqui tratado é parente do
  resíduo citado em `CE-03`, mas **este caso NÃO declara `CE-01`…`CE-09`
  cumpridos, nem parcialmente.** O estado dos `CE-*` é do artefato da classe e
  sua evolução depende de evidência VeriCore + decisão do dono. O
  `coretriad-director` está vedado de declarar qualquer um deles.

---

## 5. FLUXO EXIGIDO — implementação SanaCore, reteste independente VeriCore

Determinação do dono (§1): *"com reteste independente da VeriCore depois"*.

- A SanaCore **implementa**. Ponto final da sua autoridade.
- **Nada** que decorra desta implementação constitui `RETEST_PASSED`,
  `FINDING CLOSED`, `REMEDIATION_ACCEPTED` ou fechamento de critério `CE-*`
  (Regras 3 e 4 do `CLAUDE.md`). A SanaCore pode declarar, no máximo,
  `REMEDIATION_COMPLETE` / `READY_FOR_RETEST` no seu próprio artefato.
- Teste escrito **pela SanaCore** é evidência de implementação, **não** é
  reteste. Reteste é execução independente pela VeriCore, por agente que não
  escreveu a correção (precedente `TEST-SEAL-001/002`, `APR-2026-014`).
- A VeriCore **não corrige** o objeto (Regra 2): se o reteste reprovar, volta
  para a SanaCore.

---

## 6. PRÉ-CONDIÇÃO OPERACIONAL BLOQUEANTE — worktree

**O hook bloqueia escrita de agente SanaCore em `server/` no worktree
principal.** Verificado por leitura direta de `.claude/hooks/org-isolation.js`
pelo `coretriad-director`: a regra `sanacore` (`:80-89`) declara
`deniedInMainWorktree: [/^(src|server|client|product|tests|mobile)\//]`, com
`mainWorktreeReason: 'SanaCore só escreve código em worktree
sana/<PROJECT>/<FINDING> — nunca no worktree principal.'`

**Consequência:** a implementação **exige** worktree/branch
`sana/ERP-LEGACY-001/CASE-003`. Tentar editar os dois scripts a partir do
worktree principal será bloqueado pelo hook, não por convenção (Regra 23).

**Ressalva de rastreabilidade (Regra 20, registrada por transparência):** o
insumo deste caso citou como evidência o "caso C19 do relatório de teste do
hook". O `coretriad-director` **não localizou `C19` em disco** —
`docs/coretriad/planning/SEGREGATION_TEST_REPORT_2026-08-16.md` (o relatório de
hook versionado) contém `TEST-HOOK-001`…`006` e não contém `C19`; `Grep` por
`C19` em `coretriad/` retorna zero. A pré-condição **não depende** dessa
citação: ela está provada pela leitura direta do hook, acima. Se o relatório com
`C19` existir e for persistido depois, anexe-o como evidência adicional.

---

## 7. ESCOPO — o que está dentro e o que está fora

**DENTRO (autorizado por §1):**
1. `server/scripts/limpar-dados-transacionais.cjs` — guarda de sufixo
   `_test`/`_ci` em `DB_NAME`, fail-closed, **antes de qualquer `DELETE`** e
   antes de abrir conexão, se possível.
2. `server/scripts/seed-usuarios-departamentos.cjs` — a mesma guarda, incluindo
   o tratamento do **default `|| 'erp_evok_audio'`** de `:315`/`:469`, que hoje
   faz o script apontar ao banco real por omissão.
3. Atualização das notas de cabeçalho dos dois scripts que hoje descrevem o gap
   como não corrigido (`limpar…:75-88`; `seed…:26,47-54`), para descreverem a
   guarda implementada e citarem este `CASE_ID` — o texto atual passará a ser
   **falso** após a correção.

**FORA (não autorizado — não faça, formule a questão se julgar necessário):**
- Qualquer outro script de `server/scripts/` não nomeado pelo dono. A
  determinação nomeia **dois** arquivos. Ampliar por analogia é exatamente o
  vício que `APR-2026-018` veda e que a ressalva de `D-2` em `RC-PROC-01`
  registra. **Se a SanaCore encontrar outros scripts destrutivos com o mesmo
  gap, LISTE-OS neste caso como observação — não os corrija.**
- Alterar `server/.env.example`, `docker-compose.yml` ou criar banco de dev
  separado. É a correção estrutural do problema de fundo e é **decisão aberta do
  dono**, não deste caso.
- Introduzir escape/bypass (§3).
- Executar os scripts contra qualquer banco (§8).

---

## 8. RESTRIÇÕES DE EXECUÇÃO (herdadas, invioláveis)

- **Banco:** qualquer execução dinâmica APENAS contra banco descartável com
  sufixo `_test`/`_ci` (convenção `server/.env.test`). **NUNCA** o banco real
  `erp_evok_audio` (PRODUÇÃO REAL — `APR-2026-016`). Vale com força redobrada
  aqui: o objeto do caso **é** um script que apaga dados.
- **Verificação do caminho feliz sem apagar nada:** o modo simulação de
  `limpar-dados-transacionais.cjs` (sem `--confirmar`) permite exercitar a
  guarda sem `DELETE`. Prefira-o.
- **Regras 3 e 4:** SanaCore não fecha o próprio trabalho.
- **Regra 11:** worktree/branch `sana/ERP-LEGACY-001/CASE-003` (§6).
- **Regra 15:** não reescrever evidência histórica de outra organização —
  inclusive não editar `audit/`, `coretriad/states/` nem `coretriad/locks/`
  (bloqueados por hook, `:82`).
- Nenhum commit em `main`.

---

## 9. RETEST_SPECIFICATION (proposta ao VeriCore — não vinculante)

O desenho final do reteste é **autoridade VeriCore**; o que segue é o mínimo que
o Control Plane entende como necessário para a determinação do dono ser
verificável. A VeriCore pode ampliar, e só ela declara o resultado.

| ID | Verificação | Critério de aprovação |
|---|---|---|
| `RT-CASE003-01` | Executar cada um dos dois scripts com `DB_NAME=erp_evok_audio` (banco real, **sem conectar** — a guarda deve disparar antes) e `NODE_ENV=development` | Ambos **recusam** e saem com código de erro; mensagem ecoa o `DB_NAME` recusado |
| `RT-CASE003-02` | Executar com `DB_NAME` **ausente** do ambiente | Ambos recusam — cobre o default `|| 'erp_evok_audio'` de `seed…:315` |
| `RT-CASE003-03` | Executar com `DB_NAME=erp_evok_audio_test` | Ambos **prosseguem** (a guarda não pode quebrar o uso legítimo) |
| `RT-CASE003-04` | Confirmar que a guarda precede **todo** `DELETE` — inclusive o modo `--limpar` do seed e o `--confirmar` do limpar | Nenhum caminho de código alcança `DELETE` sem passar pela guarda |
| `RT-CASE003-05` | Buscar **escape**: qualquer flag, env var ou argumento que contorne a guarda | **Nenhum encontrado.** Presença de escape = reteste REPROVADO (contraria `I-2`, §3) |
| `RT-CASE003-06` | Conferir que as notas de cabeçalho não afirmam mais que o gap está aberto | Texto consistente com o código |

---

## 10. O QUE ESTE CASE NÃO FAZ

Nenhum `RETEST_PASSED`, `FINDING CLOSED`, `AUDIT_PASSED`, `REMEDIATION_ACCEPTED`
ou critério `CE-*` é declarado aqui. Nenhuma severidade é atribuída ou alterada.
Nenhum finding é criado, promovido ou rebaixado. Nenhum comando foi executado e
nenhuma conexão de banco foi aberta na produção deste registro. Nenhum commit.
