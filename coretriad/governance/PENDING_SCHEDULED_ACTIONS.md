# CORETRIAD — PENDÊNCIAS AGENDADAS E ITENS DE PERSISTÊNCIA EM ABERTO

Registro de Control Plane mantido pelo `coretriad-director`.

**Por que este arquivo existe:** a classe de risco `RC-PROC-01`
(`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`)
documenta, no incidente 4, que **artefato de governança envelhece
silenciosamente** e que pendência sem gatilho definido evapora. Um item
"aguardando janela de manutenção" é exatamente esse tipo de item. Aqui ele
tem ID, estado explícito, dono e condição de saída.

**O que este arquivo NÃO é:** não é finding, não é auditoria, não é
remediação, não fecha critério algum e não substitui `APPROVALS.md` —
a decisão vive lá; aqui vive apenas o **rastreio da execução pendente**.

**Regra de manutenção:** item só sai desta lista por **conclusão verificada**
(com evidência citada) ou por **decisão humana registrada em `APPROVALS.md`**.
Nunca por decurso de prazo, nunca por inferência de agente. Fechar item aqui
não fecha `CE-*` nem finding — essas autoridades são do dono e da VeriCore
(Regras 4, 5 e 18 do `CLAUDE.md`).

**Nota de reescrita (2026-08-16, mesma data do registro original):** este
arquivo foi reescrito integralmente por `Write` — única ferramenta de edição
disponível nesta sessão. Nenhum item existente foi apagado; itens resolvidos
passam a estado `RESOLVIDO`/`ATUALIZADO` com evidência citada e data,
preservando o texto original do problema. Onde uma frase do registro anterior
foi superada por fato posterior, ela é mantida e marcada como superada, nunca
removida (Regra 15 aplicada por analogia de método, já que este é artefato do
próprio `coretriad-director`, não de outra organização).

---

## Índice de estados

| Estado | Significado |
|---|---|
| `AGUARDANDO JANELA` | Depende de janela de manutenção a ser marcada pelo dono |
| `AGUARDANDO PERSISTÊNCIA` | Texto decidido e pronto; falta gravação no artefato canônico |
| `AGUARDANDO DECISÃO` | Depende de decisão humana ainda não tomada |
| `AGUARDANDO RECONCILIAÇÃO` | Divergência entre artefatos, detectada e não conciliada (Regra 20) |
| `AGUARDANDO REMEDIAÇÃO` | Decisão humana já tomada; falta ato de correção por SanaCore (ou organização nomeada) em worktree/branch próprios |
| `RESOLVIDO` | Conclusão verificada por evidência citada, ou decisão humana registrada que encerra o rastreio |
| `NÃO AUTORIZADO NESTA FASE` | Decisão humana explícita de não avançar; nenhum agente pode iniciar a ação |

---

## `PEND-2026-001` — `log_connections` — escopo passou de "produção" para **cluster-wide**

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | `APR-2026-027` (decisão D1 do dono) |
| Atualizado por | `APR-2026-028` §2, na mesma data |
| Critério vinculado | `RC-PROC-01` `CE-06` (auditabilidade da própria regra, §2.4) |
| Executor previsto | agente de infraestrutura despachado pelo orquestrador (na ausência de agente dedicado — ver `PEND-2026-006`) |
| **Estado** | **`AGUARDANDO JANELA — opções de data/horário propostas, aguardando escolha do dono`** |

**O que estava pendente originalmente:** ativação de `log_connections` (ou
equivalente de retenção de evidência independente) **no banco de produção
real** `erp_evok_audio`, com o banco de teste ativado "imediatamente" e de
forma isolada.

**Restrição vinculante, em texto do dono, que segue integralmente em vigor:**
*"prepare o comando/procedimento e registre como pendência agendada para uma
janela de manutenção — não execute contra produção sem minha confirmação
explícita do dia/horário."*

**Nenhum agente pode dispensar esta restrição.** Preparar o procedimento é
autorizado; executá-lo contra produção **não é**, até que exista confirmação
humana explícita de dia e horário, registrada em `APPROVALS.md`.

### Ressalva técnica registrada como CONDIÇÃO — PROVADA em 2026-08-16

O texto original desta seção dizia:

> A ressalva técnica registrada como CONDIÇÃO, não como resultado: o
> container `evok-postgres` hospeda o banco de teste e o banco de produção
> **na mesma instância**. `log_connections` é **parâmetro de servidor**; se
> o escopo efetivo for de cluster, ativá-lo "só no teste" **atinge produção
> também** — o que contrariaria a própria instrução do dono. Instrução dada
> ao agente de infraestrutura: 1) provar o escopo antes de aplicar; 2) não
> aplicar nada se a separação for tecnicamente impossível — nesse caso, a
> ativação **inteira** (teste + produção) vira item desta janela.
>
> **O resultado dessa prova ainda não existe nesta data.** Nada aqui afirma
> que o banco de teste foi ou será alterado.

**Esta última frase está SUPERADA a partir de 2026-08-16 (mesma data), pela
prova executada e registrada em
`audit/runs/ERP-LEGACY-001-AUD-001/07-findings/G4_CE06_LOG_CONNECTIONS.md`
e em `APPROVALS.md` (`APR-2026-028` §1):**

- `log_connections`/`log_disconnections`: `context = superuser-backend`,
  `source = default`, valor `off`. PostgreSQL 16.14, imagem `postgres:16-alpine`.
- `ALTER DATABASE <banco de teste> SET log_connections = on;` →
  `ERROR: parameter "log_connections" cannot be set after connection start`.
- `pg_db_role_setting` **vazio**; estado pós-tentativa **inalterado**.
- `PGOPTIONS="-c log_connections=on"` **funciona**, mas é **opt-in do
  cliente** — rejeitado como controle (tem o defeito de autorreporte que
  `CE-06` existe para eliminar).
- `pgaudit` **indisponível** na imagem em uso.

**Conclusão vinculante: o parâmetro só admite escopo de cluster.** A
separação "teste isolado" prevista pela D1 original de `APR-2026-027` **não
é executável**. Pela própria regra fixada na condição (item 2 acima), **nada
foi aplicado** — nem no teste, nem em produção.

### Estado atual, pós-prova (`APR-2026-028` §2)

**Decisão do dono, texto verbatim:** *"Confirmo: ativação cluster-wide de
`log_connections`. Teste imediato, produção agendada — proponha 2-3 opções
de data/horário de baixo movimento (fim de semana ou madrugada) para eu
escolher, antes de executar contra produção."*

- **Escopo do item passa de "produção" para `cluster-wide`.** Como teste e
  produção são o mesmo ato nesta topologia, "teste imediato" permanece
  tecnicamente inexecutável em isolamento — a ativação inteira entra na
  janela.
- **Sub-estado:** *"opções propostas, aguardando escolha do dono"*.
- **Nenhuma ativação foi executada.** A proibição de `APR-2026-027` D1.2
  segue integralmente em vigor: nenhum agente pode dispensá-la (Regra 18).

### Requisito de saída adicionado — retenção APROVADA

**Decisão do dono, texto verbatim (`APR-2026-028` §3):** *"Aprovo a
retenção proposta: cópia diária para arquivo append-only fora do container,
90 dias, replicado para fora do host."*

Deixa de ser proposta e passa a ser **requisito da janela**: o rotation do
Docker (50 MB / 5 arquivos) serve para disponibilidade operacional, **não**
como evidência de auditoria — roda por sobrescrita, sem cópia externa, e o
container pode ser recriado. `CE-06` não fecha só com o parâmetro ligado;
fecha com **retenção efetiva verificada pela VeriCore**.

**Condição de saída (atualizada):** confirmação humana de janela (dentre as
opções propostas) → execução cluster-wide na janela, incluindo
`log_line_prefix` (necessário para atribuir a conexão registrada, não só
constatá-la) → retenção efetiva (cópia diária append-only fora do container,
90 dias, replicada para fora do host) → verificação da VeriCore. Só então o
item fecha, e **ainda assim `CE-06` não fecha por este item isoladamente**
(ver `PEND-2026-002` e a §10/§11 do documento da classe).

---

## `PEND-2026-002` — persistência de `APR-2026-027` e da §10 de `RC-PROC-01`

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | limitação de ferramenta na sessão de registro |
| **Estado** | **`RESOLVIDO`** |
| Resolvido em | 2026-08-16, mesma data |
| Dono da ação | orquestrador da sessão |

**Motivo declarado, sem eufemismo, à época da abertura:** o
`coretriad-director` daquela sessão dispunha de `Read`/`Write`/`Grep`/`Glob`
e **não** de ferramenta de edição incremental. Gravar `APPROVALS.md`
(1.104 linhas) ou o documento da classe (497 linhas) por `Write` exigiria
**reescrever o arquivo inteiro**, com risco real de alterar evidência
histórica por transcrição — vedado pela Regra 15.

**Ação que estava pendente:** anexar por *append*, sem reescrever:

1. o bloco `APR-2026-027` ao fim de `coretriad/governance/APPROVALS.md`;
2. a §10 (adendo de `CE-06` e `CE-05`) ao fim de
   `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`.

**Executado.** Verificado por leitura direta nesta reescrita:

- `coretriad/governance/APPROVALS.md:1107-1256` contém `APR-2026-027`
  integralmente, por append.
- `coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`,
  §10 (linhas 500-598), contém o adendo de `CE-06`/`CE-05` por append,
  seguido de §11 (linhas 600-664) com o resultado da prova de escopo,
  também por append (ver `APR-2026-028`).

**Consequência:** a frase original *"enquanto este item estiver aberto,
qualquer citação a `APR-2026-027` é citação órfã"* **não se aplica mais** —
`APR-2026-027` está persistida e citável. A citação deixou de ser órfã.

---

## `PEND-2026-003` — divergência sobre a guarda de `apply-pending-migrations.cjs`

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | `APR-2026-027` (decisão D2), confrontada com artefato versionado |
| **Estado** | **`RESOLVIDO`** |
| Resolvido em | 2026-08-16, mesma data — por `APR-2026-028` §4 |

**A divergência original (Regra 7 — o artefato vence), mantida verbatim:** a
decisão D2 do dono descrevia a guarda de confirmação explícita como *"já
usada em `apply-pending-migrations.cjs`"*. **Leitura direta do arquivo
naquela data contradizia isso:** `server/scripts/apply-pending-migrations.cjs:17-25`
declarava, no próprio cabeçalho, *"⚠️ Sem guarda de ambiente … este NÃO
checa `NODE_ENV` nem sufixo de `DB_NAME`"*, e `:35` usava
`process.env.DB_NAME || 'erp_evok_audio'` — default no banco real. O reteste
da VeriCore
(`audit/runs/ERP-LEGACY-001-AUD-001/30-retest/RETEST_AUD-PROC-CUSTODIA-01.md`
§4, resíduo R2) registrava o mesmo, com a agravante de que esse script
**aplica DDL**, não `SELECT`.

**Consequência registrada então:** não existia, naquela data, guarda de
confirmação explícita a ser copiada. A intenção da decisão D2 era clara e
permanecia válida — `criar-aprovador.cjs` passaria a exigir confirmação
explícita contra o alvo —, mas **o padrão de referência precisava ser
criado, não replicado**, e o destino do próprio
`apply-pending-migrations.cjs` **não estava decidido**.

**Segunda divergência, verificada na mesma passada, mantida verbatim
(material para o escopo de D2):** a premissa *"`NODE_ENV` sozinho não cobre
o vetor real"* pressupunha que `criar-aprovador.cjs` tivesse guarda de
`NODE_ENV`. **Não tinha.** `Grep` por `NODE_ENV` no arquivo devolvia **uma
única ocorrência, na linha 18, dentro de comentário — e ela descrevia outro
script** (`seed-usuarios-departamentos.cjs`). As únicas recusas
implementadas eram de e-mail ausente/inválido (`:247-250`), domínio de teste
(`:251-257`) e chave de perfil desconhecida (`:258-262`); nenhuma olhava o
alvo do banco, e `connect()` (`:173-188`) usava
`process.env.DB_NAME || 'erp_evok_audio'`. **Esta caracterização estava
correta quando escrita** — preservada como tal, para o registro histórico.

**Pergunta que ficou aberta ao dono, não respondida por aquele registro:**
*"`apply-pending-migrations.cjs` também recebe a guarda de confirmação
explícita? O `coretriad-director` não amplia escopo por analogia
(precedente `APR-2026-018`)."*

### Resolução

**A pergunta havia sido respondida pelo dono na mesma sessão, antes daquele
registro** — o `coretriad-director` daquela passagem não dispunha dessa
informação quando escreveu o item. Ambos os scripts receberam a guarda:

| Script | Commit | Evidência |
|---|---|---|
| `apply-pending-migrations.cjs` | `8050506` | `remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_REPORT_EXTENSAO.md` — **`RETEST_PASSED`** pela VeriCore |
| `criar-aprovador.cjs` | `95aeff4` | `PROVA_GUARDA_CRIAR_APROVADOR.cjs`, 22/22 — **`RETEST_REQUIRED`**, reteste independente pendente |

Ambos na branch `sana/ERP-LEGACY-001/CASE-003`. `APR-2026-028` §4 é a
autorização nominal que resolve, retroativamente, tanto a pergunta em aberto
quanto a questão do padrão de referência (a criação, não a cópia, é o que
de fato ocorreu).

**Nota de rastreio:** a resolução desta pergunta abriu uma divergência nova
e distinta — a citação de autorização gravada no cabeçalho do script aponta
para a aprovação errada. Rastreada separadamente em `PEND-2026-005`.

---

## `PEND-2026-004` — reconciliação do estado de `CE-08` na §9.4

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | divergência detectada por leitura durante o registro de `APR-2026-027` |
| **Estado** | **`AGUARDANDO RECONCILIAÇÃO`** — inalterado nesta reescrita |

`RC-PROC-01` §9.4 registra `CE-08` como **`PENDENTE`**. Posteriormente, na
mesma data, a VeriCore emitiu
`audit/runs/ERP-LEGACY-001-AUD-001/30-retest/RETEST_AUD-PROC-CUSTODIA-01.md`,
que declara `AUD-PROC-CUSTODIA-01` como `RETEST_PASSED` / `FINDING CLOSED` (§5)
e afirma, no único ponto em que tem autoridade para opinar sobre a classe:
*"considero-o [`CE-08`] SATISFEITO por este documento. A conversão disso em
estado da classe é registro do `coretriad-director`."*

**Por que não foi convertido nesta passada:** a sessão que registrou
`APR-2026-027` foi escopada a `CE-06` e `CE-05`. Converter `CE-08` de carona,
sem despacho, seria decisão de agente sobre critério de encerramento de classe.
**Fica registrado como pendência explícita** — precisamente para não repetir o
incidente 4 da classe (Control Plane envelhecendo em silêncio).

**Nota:** a conversão, quando feita, **não** fecha `RC-PROC-01`; os critérios
são cumulativos (§6 do documento da classe).

Este item **não é resolvido por esta reescrita** — permanece exatamente
como estava, aguardando o ato explícito de conversão pelo
`coretriad-director` em despacho próprio.

---

## `PEND-2026-005` — NOVO, BLOQUEANTE — citação de autorização inválida no cabeçalho de `apply-pending-migrations.cjs`

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | Levantado pela VeriCore no reteste
(`remediation/cases/ERP-LEGACY-001-CASE-003/RETEST_REPORT_EXTENSAO.md`,
§ "PEND-EXT-05"), confrontado com `APPROVALS.md` |
| Critério vinculado | Rastreabilidade de autorização (Regras 7 e 18); não é `CE-*` |
| **Estado** | **`AGUARDANDO REMEDIAÇÃO`** |

**O achado, como levantado pela VeriCore:** o cabeçalho de
`server/scripts/apply-pending-migrations.cjs:22-23` atribui a extensão da
guarda (commit `8050506`) a **`APR-2026-026`**. Leitura integral de
`APR-2026-026` (`APPROVALS.md:1002-1104`) mostra que essa aprovação trata de
`CE-02` (evasão do hook) e de três achados de validação independente dos
verificadores (regex de conjugação, ambiguidade de `SYSTEM_MAP.md`,
downgrade em CI) — **não menciona `apply-pending-migrations.cjs`,
migrations, DDL nem `--confirmar-banco-real`**, e encerra, em `:1103`, com:
*"**Não** autoriza ampliação por analogia a nenhum outro controle ou
script."* `APR-2026-025` (`:991`) delimita ainda: *"exatamente os dois
scripts nomeados"* (que eram `limpar-dados-transacionais.cjs` e
`seed-usuarios-departamentos.cjs`, não este).

**A citação é órfã invertida:** a única autorização que o código cita para
si mesmo diz textualmente o oposto do que o próprio código fez.

**O que mudou desde o levantamento da VeriCore:** agora existe
`APR-2026-028` §4 (`APPROVALS.md:1326-1352`), que é a **autorização nominal**
faltante — cobre explicitamente os dois scripts (`apply-pending-migrations.cjs`
commit `8050506`, `RETEST_PASSED`; `criar-aprovador.cjs` commit `95aeff4`,
`RETEST_REQUIRED`) e nomeia, na própria seção, a ação decorrente: *"o
cabeçalho de `server/scripts/apply-pending-migrations.cjs:22-23` cita
`APR-2026-026`, que diz o oposto do que o script fez. Deve passar a citar
`APR-2026-028`. Correção só depois deste registro existir, nunca antes."*

**Ação pendente:** a SanaCore corrige o cabeçalho de
`apply-pending-migrations.cjs:22-23` para citar `APR-2026-028` em vez de
`APR-2026-026`. Este `coretriad-director` **não** faz a correção — está fora
de `coretriad/` e é ato de SanaCore, não de Control Plane (Regra 2 do
`CLAUDE.md`, ownership de `server/`).

**Bloqueante para:** a branch `sana/ERP-LEGACY-001/CASE-003` sair de
worktree. Não bloqueia, por si só, nenhum `CE-*` nem `RC-PROC-01`.

**Condição de saída:** commit da SanaCore corrigindo a citação, com evidência
de leitura do trecho corrigido citada aqui ou em despacho subsequente.
Reteste da correção não é automaticamente exigido por este item (é mudança
de comentário, não de lógica), mas cabe à VeriCore decidir se releva ou
retesta.

---

## `PEND-2026-006` — NOVO, sem prioridade — lacuna de papel de infraestrutura

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | `APR-2026-028` §6, decisão explícita do dono |
| **Estado** | **`AGUARDANDO DECISÃO`** — prioridade explicitamente **NENHUMA** |

**Decisão do dono, texto verbatim:** *"Registre a lacuna de papel
(infraestrutura sem agente CoreTriad dedicado após o desarmamento do
docker) como item de arquitetura pendente, sem prioridade imediata.
Continue com OpusCore/orquestrador cobrindo trabalho de infra por
enquanto."*

**Natureza do item:** desarmar os 15 agentes de `.claude/agents/_deprecated/`
fechou corretamente o vetor do incidente original (`CE-04`), mas teve como
efeito colateral deixar o programa **sem agente de infraestrutura na
taxonomia CoreTriad**. Não é defeito da decisão de desarmar — é lacuna de
papel resultante, nomeada explicitamente pelo próprio dono.

**Evidência concreta da lacuna, já observada em execução:** no despacho da
prova de escopo de `CE-06`, o agente `docker` foi despachado para o `CE-06`,
**voltou sem executar nada e corretamente se recusou a fabricar saída de
comando** — o orquestrador da sessão executou no lugar dele (ver
`APPROVALS.md`, `APR-2026-028` §1: *"executada pelo orquestrador; o agente
`docker` foi despachado, está em `_deprecated/` sem `Bash` desde `CE-04`, e
corretamente se recusou a fabricar saída de comando"*). A recusa foi conduta
correta do agente (não inventar evidência); o efeito prático é que não há,
hoje, agente de infraestrutura habilitado a executar esse tipo de trilha
dentro da taxonomia.

**Contorno autorizado, nomeado pelo dono:** OpusCore ou o orquestrador
cobrem trabalho de infraestrutura enquanto a lacuna não é resolvida.

**Condição de saída:** decisão humana futura sobre criar (ou não) um papel
de infraestrutura dedicado na taxonomia CoreTriad. Nenhum agente pode tomar
essa decisão por inferência ou por analogia.

---

## `PEND-2026-007` — NOVO, sem prioridade — instância PostgreSQL separada para teste (recomendação estrutural)

| Campo | Valor |
|---|---|
| Aberto em | 2026-08-16 |
| Origem | `APR-2026-028` §5, decisão explícita do dono |
| **Estado** | **`NÃO AUTORIZADO NESTA FASE`** — nenhum agente pode iniciá-la |

**Decisão do dono, texto verbatim:** *"Instância PostgreSQL separada fica
registrada como recomendação estrutural futura, fora do escopo autorizado
agora. Não avançar nisso nesta fase do programa."*

**Por que a recomendação existe:** é a correção de causa raiz de toda a
classe `RC-PROC-01` no eixo de banco de dados — teste e produção
compartilham a mesma instância PostgreSQL (`evok-postgres`), e
`.env.example` aponta o ambiente de desenvolvimento para o banco real. Essa
topologia é a razão estrutural pela qual `CE-06` (e qualquer controle futuro
de escopo semelhante) não consegue distinguir teste de produção: são o
mesmo cluster.

**Consequência prática registrada enquanto o item não avança:** enquanto
esta instância separada não existir, **controles com escopo de cluster
(como `CE-06`/`log_connections`) serão sempre indivisíveis entre teste e
produção** — qualquer ativação futura desse tipo de parâmetro repetirá
exatamente o mesmo achado de `PEND-2026-001`/`APR-2026-028` §1, e não há
mitigação de configuração que resolva isso; só a separação de instância.

**Estado explícito:** **não autorizado nesta fase.** Nenhum agente —
OpusCore, SanaCore, orquestrador ou `coretriad-director` — pode iniciar
trabalho nesta frente sem nova decisão humana explícita.

---

## Declaração de método

- Método: leitura direta de artefato versionado (`Read`/`Grep`/`Glob`).
  **Nenhum comando, script, teste ou conexão de banco foi executado.**
- Escrita restrita a `coretriad/governance/`. Nada foi escrito em `audit/`,
  `docs/`, `.claude/`, `server/` ou `client/` (Regras 15 e 16).
- Nenhum veredito: nenhuma severidade, nenhum `RETEST_PASSED`, nenhum
  `FINDING CLOSED`, nenhum `CE-*` declarado satisfeito, nenhum `RC-PROC-01`
  fechado (Regras 4 e 5).
- Nenhum item pré-existente foi apagado nesta reescrita: `PEND-2026-001` a
  `004` foram atualizados preservando o texto original do problema, com
  superação/resolução marcada e datada; `PEND-2026-005` a `007` são novos.
- Nenhum commit foi feito por este registro.
