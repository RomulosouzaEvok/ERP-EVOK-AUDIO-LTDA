# NEW_OBSERVATIONS — SIM-001-AUD-001

AUDIT_ID: SIM-001-AUD-001
AUDIT_COMMIT: b736a1e733f802735b1b79348e3c6cc084bd466e
REGISTRADO_POR: vericore-software-audit-director
DATA: 2026-08-13
ORIGEM: fatos levantados pelo vericore-audit-verification-runner durante os retestes de
FIND-SIM-001-001 / -002 / -003 (ver `30-retest/RETEST_REPORT.md`).

## Natureza deste documento

Estas são **observações abertas**, NÃO findings fechados e NÃO findings confirmados.
Nenhuma delas foi absorvida no fechamento de FIND-SIM-001-001, -002 ou -003 — declarar
um finding CLOSED só cobre o que consta do `RETEST_SPECIFICATION` daquele finding.
Absorver fato novo dentro do fechamento de finding antigo seria alargar o escopo do
reteste retroativamente e destruir a rastreabilidade REQ→FIND→RETEST. Por isso ficam aqui,
com classificação e destino explícitos, aguardando decisão de escopo.

Nenhuma destas observações foi validada pelo vericore-finding-validator, e nenhuma delas
possui `FINDING_ID` alocado — a alocação de ID e a promoção a finding formal dependem da
decisão registrada abaixo em cada item e, quando aplicável, de nova rodada de escopo.

---

## OBS-SIM-001-A — `userRole` é autodeclarado pelo chamador

FATO: no SIM-001 não existe camada de autenticação. O parâmetro `userRole` recebido por
`cancelBooking` é fornecido pelo próprio chamador. Após a remediação aceita (`08b4323`),
a comparação `=== 'admin'` é estrita e fail-closed — porém quem afirma ser `admin` é a
própria requisição. A SanaCore registrou isto como RESIDUAL_RISK ao encerrar a
remediação e recomendou finding próprio.

RELAÇÃO COM FIND-SIM-001-001: o finding original já mencionava este agravante na
DESCRIPTION e no SECURITY_IMPACT, mas o `RETEST_SPECIFICATION` (a)-(e) **não** o incluía
como critério de aceite — os itens (a)-(c) tratam do comportamento da função dadas as
credenciais recebidas, não da procedência delas. Portanto o RETEST_PASSED de `08b4323` é
legítimo e este ponto permanece aberto, sem contradição.

CLASSIFICAÇÃO: **NOVO FINDING — a abrir**, severidade proposta HIGH (proposta, não
declarada), confiança proposta CONFIRMED por leitura. Domínio: security / authorization
(broken authentication). Escopo do produto SIM-001, portanto DENTRO do escopo desta
auditoria.

JUSTIFICATIVA: é um controle de segurança ausente e não uma preferência de projeto — a
autorização implementada é integralmente contornável por qualquer chamador que declare
`userRole: 'admin'`, o que reduz o ganho efetivo da remediação de FIND-SIM-001-001 em um
cenário com fronteira de confiança real. Não é, porém, o mesmo finding: o defeito original
era ausência total de verificação; este é ausência de fonte confiável de identidade.
Merece ID próprio, validação pelo finding-validator (Regra 22, por ser HIGH) e ciclo de
remediação próprio.

RESSALVA DE ESCOPO: SIM-001 é declaradamente "serviço único em memória, sem persistência,
sem transporte HTTP" (`SOFTWARE_RELEASE_PACKAGE.md` L16). A severidade final depende de
decisão explícita sobre se a fronteira de confiança é responsabilidade do módulo ou do
futuro chamador. **Não infiro essa decisão** (Regras 6 e 18) — requer requisito versionado
ou decisão humana registrada. Enquanto isso, a severidade acima é proposta, não declarada.

STATUS: **RISK_ACCEPTED (escopo SIM-001 apenas)** — decisão humana APR-2026-005; ver
seção de decisão logo abaixo.

STATUS ANTERIOR (preservado para rastreabilidade, Regra 15): *OPEN — aguardando decisão de
escopo do CoreTriad Director / responsável humano.*

### Decisão humana registrada — APR-2026-005

REGISTRADO_POR: vericore-software-audit-director. Este é um **registro de decisão humana
já tomada**, não uma decisão de auditoria: `RISK_ACCEPTED` é estado exclusivo do
responsável humano na state machine, e nenhum agente VeriCore pode declará-lo por
inferência (Regra 18).

| Campo | Valor |
|---|---|
| APROVAÇÃO | APR-2026-005 (`coretriad/governance/APPROVALS.md`) |
| APROVADOR | Gilwagno |
| DATA | 2026-08-13 |
| DECISÃO | `RISK_ACCEPTED` — **restrito ao escopo do simulado SIM-001** |

**Justificativa registrada pelo aprovador:** SIM-001 é ambiente fictício de validação do
CoreTriad — não é produto real, não possui dados reais, não possui usuário final e não
possui exposição (sem persistência, sem transporte HTTP, sem superfície de ataque). O
risco aceito não sai do ambiente do simulado.

#### ⚠ LIMITE DA ACEITAÇÃO — NÃO SE ESTENDE A NENHUM PROJETO REAL

Esta aceitação de risco vale **exclusivamente para SIM-001**. Ela **não** se estende a
nenhum outro projeto, presente ou futuro, **incluindo `ERP-LEGACY-001`**.

Em qualquer projeto real, o padrão **"papel/role declarado pelo cliente sem verificação
server-side"** é finding **CRITICAL bloqueante para release** — e **nunca** pode ser
tratado como `RISK_ACCEPTED` em produção.

Para que nenhum auditor futuro dependa deste arquivo para lembrar do padrão, a diretriz
foi normatizada em dois pontos de leitura obrigatória:
- **`CLAUDE.md` — Regra 24** (documento sempre carregado em contexto).
- **`docs/coretriad/CORETRIAD_MASTER_SPEC.md` — Parte IV §20**, trilha de
  Segurança/Autorização (padrão de finding obrigatório).

**Efeito no run:** OBS-SIM-001-A deixa de estar pendente de decisão de escopo e **não**
será promovida a finding formal dentro de SIM-001-AUD-001. Nenhum `AUDIT_PASSED` decorre
desta aceitação.

---

## OBS-SIM-001-B — cancelamento APÓS o início da reserva é aceito e taxado

FATO: cancelar uma reserva cujo horário de início já passou é aceito pelo serviço e cobra
taxa (observado na sondagem de -2h durante o reteste de FIND-SIM-001-002). Nenhuma BR do
SIM-001 trata deste caso. O comportamento é **pré-existente** ao AUDIT_COMMIT e não foi
introduzido por nenhuma das remediações.

RELAÇÃO COM FIND-SIM-001-002: nenhuma. O finding -002 tratava exclusivamente da alíquota
(10% vs 20%), cujo `RETEST_SPECIFICATION` foi integralmente satisfeito. Este ponto é
lacuna de **regra**, não erro de cálculo.

CLASSIFICAÇÃO: **LACUNA DE REQUISITO — backlog de produto, não finding de conformidade.**

JUSTIFICATIVA: um finding de auditoria afirma desvio entre o objeto auditado e uma fonte
autoritativa. Aqui não existe fonte autoritativa contra a qual medir: nenhuma BR define o
comportamento esperado para cancelamento pós-início. Classificar como defeito exigiria
que eu inventasse a regra de negócio ("deveria rejeitar" ou "deveria cobrar 100%"), o que
é vedado pela Regra 6. O que é auditavelmente verdadeiro é que **existe um caminho de
execução com efeito financeiro não governado por regra alguma** — e isso é registrável.

DESTINO RECOMENDADO: encaminhar ao responsável pelo produto para definição de BR. Se uma
BR for criada e o código divergir dela, aí sim caberá finding com ID próprio. Se a decisão
for manter o comportamento atual, deve ser documentada como regra explícita — não deixada
como comportamento implícito.

STATUS: **OPEN — backlog de requisito; sem finding aberto.**

---

## OBS-SIM-001-C — ordem de checagem em `cancelBooking`: status antes de autorização

FATO: em `cancelBooking`, a verificação de status da reserva ocorre ANTES da verificação
de autorização. Consequência: um usuário não autorizado que tente cancelar uma reserva já
cancelada recebe a mensagem `"not active"` em vez de `"not authorized"`.

RELAÇÃO COM FIND-SIM-001-001: nenhuma quanto ao controle em si — a autorização é aplicada
corretamente em todos os casos em que a reserva está `active`, que é o universo do
`RETEST_SPECIFICATION` e o único universo em que o cancelamento tem efeito. Nenhuma
reserva alheia foi cancelável por não autorizado em nenhum dos 10 vetores de regressão.

CLASSIFICAÇÃO: **OBSERVAÇÃO INFO — sem finding.**

JUSTIFICATIVA: não há bypass de autorização — a ordem das checagens não permite que
alguém não autorizado altere estado. O efeito é um **oráculo de estado de baixa
granularidade**: a mensagem de erro revela a um não autorizado que a reserva `BKG-N` existe
e já está cancelada. Combinado com os IDs sequenciais e enumeráveis (`BKG-${nextId++}`,
apontado no finding original), isso permite mapear quais IDs existem e em que estado —
vazamento de metadados, não elevação de privilégio. Severidade INFO/LOW isoladamente;
poderia subir se combinado com dados sensíveis, o que não é o caso aqui.

DESTINO RECOMENDADO: registrar como melhoria de hardening (checar autorização antes de
estado, e uniformizar mensagens de erro para o chamador não autorizado). Não bloqueia
release nem justifica ciclo de remediação próprio no estado atual do produto. Se
OBS-SIM-001-A for promovida a finding e o SIM-001 ganhar fronteira de confiança real,
este ponto deve ser reavaliado em conjunto.

STATUS: **OPEN — hardening/backlog; sem finding aberto.**

---

## Consolidação e declaração

| OBS | Fato | Classificação | Status | Destino |
|---|---|---|---|---|
| OBS-SIM-001-A | `userRole` autodeclarado, sem autenticação | Risco aceito por decisão humana (severidade HIGH proposta, nunca declarada) | **RISK_ACCEPTED (escopo SIM-001 apenas)** — APR-2026-005 | Encerrada no SIM-001; padrão normatizado como CRITICAL bloqueante em projeto real (CLAUDE.md Regra 24; Master Spec Parte IV §20) |
| OBS-SIM-001-B | Cancelamento pós-início aceito e taxado | Lacuna de requisito | OPEN | Backlog de produto — definir BR |
| OBS-SIM-001-C | Status checado antes de autorização | INFO — vazamento de metadados | OPEN | Hardening/backlog |

Declaro, como **vericore-software-audit-director**, que nenhuma destas três observações
foi considerada satisfeita, mitigada ou encerrada pelos `RETEST_PASSED` declarados em
`30-retest/RETEST_REPORT.md`, e que o `FINDING CLOSED` de FIND-SIM-001-001, -002 e -003
**não** as abrange. Nenhuma delas está declarada CLOSED.

OBS-SIM-001-A foi escalada ao responsável humano (Regras 20 e 21) e teve o risco aceito
por decisão humana explícita — **APR-2026-005, Gilwagno, 2026-08-13 — válida apenas dentro
do escopo SIM-001**. `RISK_ACCEPTED` não é `CLOSED`, não é remediação e não é veredito de
auditoria: registra que o responsável humano assumiu o risco no ambiente do simulado.
OBS-SIM-001-B e OBS-SIM-001-C permanecem **abertas e inalteradas** por esta decisão.
