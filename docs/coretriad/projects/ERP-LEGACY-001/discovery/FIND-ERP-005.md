# FINDING

FINDING_ID: FIND-ERP-005
AUDIT_ID: N/A — finding preliminar levantado durante discovery (passo 26), fora da sequência normal do passo 31, por autorização humana explícita (APR-2026-018)
PROJECT_ID: ERP-LEGACY-001
AUDIT_COMMIT: c9359be399c45191fe90e8e9707803125a5ba91d (tag `legacy-baseline-001`; tag anotada `ad8e26cc0779f98b31f8d31bc865862e7f6b9452`, verificada em `.git/packed-refs:15-16`)
TITLE: A alçada de aprovação de contrato jurídico (RF-JUR-003) é integralmente contornável — 4 falhas encadeadas: thresholds hard-coded contra o contrato de API, aprovação por presença de módulo em vez de nível, aditivo que eleva valor sem reabrir alçada, e autoaprovação dos dois lados por `admin`
DOMAIN: security / business-rules
SUBDOMAIN: authorization (broken access control — business-logic bypass de controle financeiro)
SEVERITY: CRITICAL
CONFIDENCE: CONFIRMED
STATUS: OPEN
AMBIENTE: **DEV/HOMOLOGAÇÃO — NÃO-PRODUÇÃO**
DETECTED_BY: vericore-business-rule-auditor (discovery passo 26 — BR-JUR-003, BR-JUR-D07, BR-JUR-D08, BR-JUR-D09); formalizado e reverificado por vericore-authorization-auditor

## Classificação de ambiente (obrigatória)

O módulo `juridico` está classificado **NÃO-PRODUÇÃO** em
`coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md:160` ("Sem evidência de dado real
carregado", confiança BAIXA). Não há contrato real, aditivo real nem aprovação real de alçada no
banco. **Não existe exposição em produção hoje.**

A severidade **CRITICAL não decorre de exposição atual**, e sim do fato de que o padrão auditado
é o que será promovido a produção junto com o módulo: os quatro defeitos estão no desenho do
controle (constantes de domínio, nível de RBAC na rota, ausência de reabertura de alçada,
ausência de segregação de identidade), não em dado ou configuração de ambiente. Nenhum deles é
corrigido pela mera mudança de ambiente. Ressalva relevante: a conta `admin` — vetor da falha 4 —
já está classificada **PRODUÇÃO REAL** por `APR-2026-016` (`PRODUCTION_STATUS_MAP.md:130`),
embora o módulo que ela destravaria não esteja.

Nenhuma remediação foi aplicada. A SanaCore não foi autorizada. VeriCore não corrige o objeto
auditado (Regra 2).

DESCRIPTION:
A alçada de aprovação por valor (RF-JUR-003) é o único controle financeiro do módulo Jurídico:
acima de R$ 50.000 exige `diretor`; acima de R$ 300.000 exige `diretor` **E** `financeiro`
(`juridico/domain/constants.ts:38-47`, com o gate em `ActivateContractUseCase.ts:61-73`). Quatro
falhas independentes, todas confirmadas por leitura direta no AUDIT_COMMIT, permitem contornar
esse controle por caminhos distintos. Nenhuma depende das outras; juntas, o controle não impõe
nada que um `juridico:operate` não possa desfazer.

### FALHA 1 — Thresholds hard-coded contrariando o contrato de API

`JUR_APPROVAL_THRESHOLD_DIRECTOR = 50000` e `..._FINANCE = 300000` são constantes de código
(`constants.ts:23,26`). `docs/business/BLOCO_3_JUR_API.md:370-383` especifica o oposto,
textualmente: tabela `jur_approval_thresholds` com `{contract_type, min_value, max_value,
required_level}`, a afirmação *"Nenhum valor de alçada é hard-coded no contrato de API — a rota
sempre consulta a configuração vigente"*, e os endpoints `GET`/`PUT
/api/jur/settings/approval-thresholds` declarados como algo que **"precisam existir antes de
`POST .../activate` poder checar a regra"**.

Verificado por grep exaustivo: `jur_approval_thresholds` e `approval-thresholds` aparecem
**exclusivamente em 4 arquivos de documentação** — **zero ocorrências em `server/src`, zero
migrations, zero model, zero rota**. Não existe a tabela, não existem os endpoints, e não existe
a dimensão `contract_type`.

Consequências: (i) alterar a alçada exige deploy; (ii) não há registro versionado de qual alçada
vigia em qual data — impossível auditar retroativamente sob qual regra um contrato foi ativado;
(iii) a diferenciação por tipo de contrato prometida ao jurídico não existe. Agravante: o próprio
§2.7 se autodeclara `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` — os valores nunca foram
validados por autoridade jurídica.

### FALHA 2 — Aprovação concedida por PRESENÇA do módulo, não por NÍVEL

A rota `POST /api/jur/contracts/:id/approve` é montada ANTES do gate geral e protegida por
`authorizeAnyModule([{moduleKey:'diretor'},{moduleKey:'financeiro'}])` (`juridico.ts:71`) —
**sem `requiredLevel`**. O parâmetro é opcional e o default é `'operate'`
(`authorizeAnyModule.ts:52,82`). Em seguida, o controller resolve o papel por **truthiness**:
`if (user?.permissions?.diretor) roles.push('diretor')` (`contractController.ts:52-53`).

`AccessModuleLevel` admite exatamente `'operate' | 'approve'` (`accessModules.ts:248`) e
`diretor` é módulo atribuível real, rotulado no catálogo como "Diretoria (aprovador de alçada,
RF-JUR-003)" (`accessModules.ts:342`). **Logo, um usuário com `diretor:operate` — o nível mais
baixo existente, explicitamente NÃO `approve` — registra a aprovação de diretoria.**

*Refinamento sobre o insumo, verificado neste finding:* para um contrato na faixa
R$ 50.000–300.000, o `diretor:operate` sozinho destrava **integralmente** a ativação (o único
papel exigido é `diretor`); para R$ 500.000, fornece **a metade `diretor`**, restando
`financeiro` — que a Falha 4 permite ao mesmo `admin` fornecer.

### FALHA 3 — Aditivo eleva o valor sem reabrir a alçada

`POST /api/jur/contracts/:id/addendums` está atrás apenas do gate geral
`authorizeModule('juridico','operate')` (`juridico.ts:83,96`).
`CreateContractAddendumUseCase.execute()` grava o aditivo e atualiza o contrato:
`if (input.new_value !== undefined && input.new_value !== null) contractUpdates.value =
input.new_value; ... await this.repository.update(input.contractId, contractUpdates)` (:59-64).

**O use case não importa nem chama `requiredApproverRoles`** (verificado: o único import de
domínio é `ContractTypes`, :13), **não invalida as aprovações já registradas, e não retorna o
contrato a `draft`/`in_approval`.** Um contrato ativado legitimamente por R$ 40.000 é elevado a
R$ 5.000.000 por qualquer `juridico:operate`, permanecendo `active` — sem que nenhum `diretor`
ou `financeiro` jamais tenha aprovado qualquer valor.

*Refinamento não registrado no insumo, verificado aqui:* a atualização de `value` na linha 61
**não é condicionada a `change_type === 'value'`**. A validação de :36-38 apenas exige
`new_value` quando `change_type === 'value'`; a recíproca não existe. **Um aditivo declarado
como `change_type='term'` que carregue `new_value` também altera o valor do contrato**,
escapando de qualquer futuro controle baseado no `change_type` declarado.

Agravante documental: `BLOCO_3_JUR_API.md:214` exige `approve` para *"assinatura de aditivo que
altera valor"*, enquanto a tabela de endpoints do **mesmo arquivo**, :233, lista o endpoint como
`operate`. **O documento contradiz a si mesmo e o código seguiu a versão mais permissiva.**

### FALHA 4 — `admin` autoaprova os dois lados

`resolveAvailableApproverRoles` devolve **os dois papéis** para `admin`:
`if (user?.role === 'admin') return ['diretor','financeiro']` (`contractController.ts:50`). O
único controle anti-duplicidade é por PAPEL, não por PESSOA:
`findByContractAndRole(input.contractId, role)` (`ApproveContractUseCase.ts:85-88`). Não há
comparação entre `approver_user_id` e o aprovador anterior, nem entre aprovador e criador.
**Um único `admin`, sozinho, registra a aprovação `diretor` e depois a `financeiro`.**

Agravante de intencionalidade: o repositório **já possui** o primitivo correto —
`shared/domain/segregationOfDuties.ts` — cujo cabeçalho declara que alçada e segregação são
*"controles diferentes e independentes"* e *"cumulativos"* (:20-28), e que **`admin` NÃO isenta**,
citando nominalmente o comportamento oposto: *"`resolveAvailableApproverRoles` trata `admin` como
se tivesse o papel `diretor`. Aqui, deliberadamente, não"* (:30-35), com a justificativa
*"identidade não é concedível: nenhum nível de permissão transforma uma pessoa em duas"*.
Verificado por grep: o módulo é chamado apenas em `purchases`, `purchaseRequisitions` e `comex`
— **nunca em `juridico`**. O controle existe, foi projetado com esta exata falha em mente, e não
foi aplicado aqui.

### AGRAVANTE TRANSVERSAL — a alçada pode ser pulada em silêncio por construção

O gate inteiro é condicionado a uma dependência opcional:
`if (requiredRoles.length > 0 && this.approvalRepository)` (`ActivateContractUseCase.ts:63`), com
`approvalRepository?: ContractApprovalRepository` opcional no construtor (:39,41). Se instanciado
sem o repositório, `requiredRoles` é calculado e **descartado** — a ativação prossegue sem
verificação e sem erro, log ou aviso. Em produção o controller injeta
(`contractController.ts:143`), mas a invariante depende do chamador, e o cabeçalho do arquivo
(:12-14) admite que a opcionalidade existe "apenas por compatibilidade retroativa de teste
unitário" — metade da suíte exercita o caminho onde o controle não existe.

EXPECTED_BEHAVIOR:
1. Limiares lidos de configuração versionada/consultável em runtime (`jur_approval_thresholds`,
   com `contract_type`), conforme `BLOCO_3_JUR_API.md:370-383`.
2. Registrar aprovação exige o nível `approve` do módulo do papel aprovador.
3. Aditivo que eleve o valor reabre a alçada: invalida aprovações incompatíveis e/ou exige nova
   ativação, com nível `approve` (`:214`).
4. As duas aprovações provêm de duas PESSOAS distintas, com `admin` não isento — padrão já
   decidido em `segregationOfDuties.ts:30-43` (D-K).

ACTUAL_BEHAVIOR:
1. Dois inteiros no código; tabela e endpoints inexistentes em `server/src`.
2. `diretor:operate` registra a aprovação de diretoria.
3. `juridico:operate` eleva o valor de um contrato `active` sem limite e sem reabrir nada —
   inclusive por aditivo declarado como `change_type='term'`.
4. Um único `admin` registra as duas aprovações.

EVIDENCE:
FILE: server/src/modules/juridico/domain/constants.ts
LINES: 23, 26 (constantes); 38-47 (`requiredApproverRoles`, única fonte); 5-7 (comentário admite "não tabela de configuração editável nesta rodada")
FILE: docs/business/BLOCO_3_JUR_API.md
LINES: 370-383 (§2.7 — tabela, "Nenhum valor hard-coded", endpoints "precisam existir", `[VERIFICAR COM ASSESSOR JURÍDICO]`); 214 (aditivo = `approve`); 233 (MESMO endpoint como `operate` — autocontradição)
FILE: server/src/modules/juridico/presentation/routes/juridico.ts
LINES: 71 (`authorizeAnyModule` sem `requiredLevel`); 83 (gate geral `operate`); 95-96
FILE: server/src/middlewares/authorizeAnyModule.ts
LINES: 52 (JSDoc: "nível padrão `'operate'`"); 82 (default efetivo); 39-43; 66-69 (curto-circuito `admin`)
FILE: server/src/modules/juridico/presentation/controllers/contractController.ts
LINES: 48-55; 50 (`admin` recebe os DOIS papéis); 52-53 (truthiness); 160-171; 143 (injeção); 188-198 (`addAddendum`, sem checagem de alçada)
FILE: server/src/modules/juridico/application/use-cases/contract/ApproveContractUseCase.ts
LINES: 61-63; 65-75 (desambiguação por `desiredRole`); 85-88 (anti-duplicidade por PAPEL); 90-95 (grava `approver_user_id` sem compará-lo a nada)
FILE: server/src/modules/juridico/application/use-cases/contract/CreateContractAddendumUseCase.ts
LINES: 59-64; 61 (`new_value` NÃO condicionado a `change_type === 'value'`); 10-13 (imports — `requiredApproverRoles` ausente); 28-41
FILE: server/src/modules/juridico/application/use-cases/contract/ActivateContractUseCase.ts
LINES: 61-73; 63 (`&& this.approvalRepository`); 39,41; 57 (aceita ativar a partir de `approved`, fora do fluxo documentado §2)
FILE: server/src/shared/domain/segregationOfDuties.ts
LINES: 20-28; 30-43 (`admin` NÃO isenta; cita nominalmente `resolveAvailableApproverRoles`)
FILE: server/src/shared/domain/accessModules.ts
LINES: 248; 229,241,342,356
FILE: coretriad/states/ERP-LEGACY-001/PRODUCTION_STATUS_MAP.md
LINES: 160 (`juridico` NÃO-PRODUÇÃO); 130 (`admin` PRODUÇÃO REAL)
GREP (negativo, exaustivo): `jur_approval_thresholds|approval-thresholds` → 4 arquivos, TODOS documentação; zero em `server/src`
GREP (negativo, exaustivo): `segregationOfDuties|segregation` em `server/src` → 5 arquivos (`purchases` ×2, `purchaseRequisitions`, `comex`, o próprio módulo); **zero em `juridico`**

RELATED_PROCESS: aprovação e ativação de contrato jurídico (UC-52)
RELATED_BUSINESS_RULE: BR-JUR-003, BR-JUR-D07, BR-JUR-D08, BR-JUR-D09; D-K (segregação, decidida para compras)
RELATED_REQUIREMENT: RF-JUR-003, RF-JUR-005, RF-JUR-008
RELATED_ACCEPTANCE_CRITERIA: nenhum AC formal encontrado para RF-JUR-003 (lacuna — ver L2)
RELATED_TEST: `juridico-contract-use-cases.test.ts:174-227` cobre as 3 faixas no gate de ativação. **AUSENTE: qualquer teste de `ApproveContractUseCase`, de `resolveAvailableApproverRoles`, de nível de rota, ou de aditivo × alçada. Nenhuma das 4 falhas é detectável pela suíte atual.**

BUSINESS_IMPACT: O único controle financeiro do módulo Jurídico não impõe o que declara. A
empresa pode ser vinculada contratualmente por valor arbitrário sem que qualquer diretor ou
responsável financeiro tenha efetivamente decidido — por três caminhos distintos. Rastreabilidade
também é perdida: não há registro de qual alçada vigia em qual data (Falha 1), e as aprovações
são gravadas por papel sem vínculo com o valor aprovado, de modo que uma aprovação dada para
R$ 60.000 continua válida para R$ 5.000.000 após um aditivo (Falha 3).
TECHNICAL_IMPACT: Regra de autorização decidida na apresentação sem reverificação de domínio
(padrão estrutural — `CURRENT_ARCHITECTURE.md` §4); controle condicionado a dependência opcional;
contrato de API divergente do código e internamente autocontraditório; cobertura verde que não
exercita nenhuma das 4 falhas.
SECURITY_IMPACT: OWASP A01:2021 Broken Access Control (business-logic bypass) e A04:2021 Insecure
Design. ASVS v4 V4.1.3 (imposição no servidor — Falha 2), V4.1.5 (fail-securely — o gate é pulado
sem erro quando a dependência opcional falta), V4.2.1 (regra sensível contornável por caminho
alternativo — Falha 3), V4.3.3 (segregação em transação de alto valor — Falha 4). **Não é IDOR
nem cross-tenant**: é escalada funcional dentro do próprio escopo do usuário.

REPRODUCTION (estática — ver L1):

*Falha 2 (destrave completo na faixa intermediária)*
1. Usuário `U` com `diretor: 'operate'` (sem `approve`, sem módulo `juridico`).
2. Contrato `C` em `draft`, `value = 200000` → `requiredApproverRoles` = `['diretor']`.
3. `POST /api/jur/contracts/C/approve` → `authorizeAnyModule` avalia
   `satisfies('operate','operate')` = `true` → passa. `resolveAvailableApproverRoles` retorna
   `['diretor']` por truthiness. Aprovação gravada.
4. Qualquer `juridico:operate` chama `activate` → gate encontra `diretor` aprovado, `missing`
   vazio → contrato de R$ 200.000 ativado sem ninguém com nível `approve`.

*Falha 3 (elevação pós-ativação)*
1. Contrato `C` criado com `value = 40000` → `requiredApproverRoles` = `[]` → ativado por
   `juridico:operate`, sem aprovação alguma.
2. `POST /api/jur/contracts/C/addendums` com
   `{ change_type: 'value', description: '...', new_value: 5000000 }`.
3. `:61-64` executa `repository.update(C, { value: 5000000 })`. Contrato permanece `active`, sem
   nenhuma aprovação. **Variante confirmada:** mesmo efeito com `change_type: 'term'` +
   `new_end_date` + `new_value`, pois :61 não consulta `change_type`.

*Falha 4 (autoaprovação dupla)*
1. Conta `admin`, contrato `C` com `value = 5000000` → requer `['diretor','financeiro']`.
2. `POST .../approve` com `{ "role": "diretor" }` → `resolveAvailableApproverRoles` retorna os
   dois papéis; grava `approver_role='diretor'`, `approver_user_id=<admin>`. *(Sem o `role` no
   body, `:74` lançaria `ValidationError` por ambiguidade — o corpo é necessário para
   desambiguar, nunca para conceder.)*
3. `POST .../approve` de novo, mesma sessão, `{ "role": "financeiro" }` →
   `findByContractAndRole(C,'financeiro')` não encontra nada → grava a segunda aprovação com o
   MESMO `approver_user_id`.
4. `activate` → `missing` vazio → contrato de R$ 5.000.000 ativado com uma única pessoa.

ROOT_CAUSE_HYPOTHESIS: A alçada foi entregue em 2026-08-08 como fechamento apressado de uma
pendência (`juridico.ts:12-16`; `constants.ts:2-7`), implementando o caminho feliz — registrar
aprovação e conferir na ativação — sem cobrir os caminhos laterais (aditivo), sem diferenciar
nível de presença de módulo, e sem reaproveitar o primitivo de segregação que só nasceria dois
dias depois (D-K, 2026-08-10) e jamais foi retro-aplicado ao Jurídico. A divergência da Falha 1
foi assumida conscientemente no comentário do código, mas o contrato de API nunca foi atualizado,
produzindo duas fontes autoritativas contraditórias (Regra 20).

REFERENCE: `BLOCO_3_JUR_API.md` §2 (:212-235) e §2.7 (:370-383); RF-JUR-003/005/008;
`BUSINESS_RULE_CANDIDATES_pessoas-governanca.md` §2 e LACUNA-2/LACUNA-3;
`segregationOfDuties.ts` (D-K); OWASP A01/A04; ASVS v4 V4.1.3, V4.1.5, V4.2.1, V4.3.3.

RECOMMENDATION (não vinculante; decisão de desenho é do dono, execução é da SanaCore):
As Falhas 1 e 3 dependem de decisão humana prévia registrada: (a) qual fonte prevalece — contrato
de API (tabela configurável com `contract_type`) ou implementação (constantes)? (b) aditivo que
eleva valor exige `approve` (:214) ou `operate` (:233)? (c) a segregação D-K vale para aprovação
de contrato? Nenhuma é respondível por artefato versionado hoje. As Falhas 2 e 4 **não** dependem
de decisão nova: a Falha 2 contraria o próprio rótulo do módulo `diretor` no catálogo e o padrão
`approve` já usado nas demais ações sensíveis; a Falha 4 contraria uma decisão já registrada e
implementada (D-K), apenas não aplicada aqui.
SUGGESTED_REMEDIATION_OWNER: SanaCore

## RETEST_SPECIFICATION

Cada bloco é independente; aprovar um não implica aprovar os demais. Todos exigem execução
dinâmica real (HTTP autenticado contra banco) — as Falhas 2 e 4 vivem parcialmente na camada de
rota/controller e são invisíveis a teste que instancie o use case diretamente.

**R1 — Alçada configurável (Falha 1)**
(a) Existe fonte consultada em runtime, com `contract_type`, e nenhum limiar permanece como
    literal em `constants.ts` (grep por `50000`/`300000` com semântica de alçada → zero).
(b) Alterar o limiar pela configuração muda o comportamento de `activate` **sem deploy**.
(c) Dois contratos de `contract_type` diferentes e mesmo valor recebem alçadas diferentes.
(d) A alçada vigente no momento da ativação fica registrada de forma recuperável a posteriori.
(e) `BLOCO_3_JUR_API.md` §2.7 e o código descrevem o MESMO mecanismo — ou, se a decisão for
    manter constantes, o §2.7 é corrigido e a decisão registrada em `APPROVALS.md`. Divergência
    residual entre doc e código **reprova**.

**R2 — Nível exigido (Falha 2)**
(a) `approve` com `diretor:operate` → **403**, nenhuma linha em `jur_contract_approvals`.
(b) Idem `financeiro:operate` → **403**, sem registro.
(c) `diretor:approve` → **201**, aprovação registrada.
(d) Contrato de R$ 200.000 com apenas a tentativa negada → `activate` por `juridico:operate`
    **falha** com `RF-JUR-003`; contrato permanece no status anterior.
(e) Vetores adversariais, todos rejeitados sem registro: `permissions.diretor` = `'read'`, `''`,
    `0`, `'Approve'`, `'APPROVE'`, `' approve '`, `true`, `['approve']`, `{}`, `null`.

**R3 — Aditivo reabre a alçada (Falha 3)**
(a) Contrato `active` com `value = 40000` + aditivo `change_type='value'`, `new_value=5000000` →
    não deixa o contrato `active` com valor elevado e sem aprovação.
(b) **Variante `change_type` cruzado**: aditivo `change_type='term'` com `new_end_date` **e**
    `new_value=5000000` → mesmo resultado de (a). Um reteste que cubra apenas
    `change_type='value'` **não** aprova este item.
(c) Aprovações da faixa antiga não são aceitas para a faixa nova (verificado lendo
    `jur_contract_approvals` após o aditivo).
(d) Nível de RBAC do endpoint coerente com a decisão registrada sobre a contradição :214 × :233,
    e o documento corrigido para uma única versão.
(e) Aditivo que **não** altera valor continua funcionando — sem regressão.

**R4 — Segregação (Falha 4)**
(a) `admin` registra `diretor` e tenta `financeiro` no MESMO contrato → **rejeitado**, com
    exatamente 1 linha para aquele contrato.
(b) Duas pessoas distintas (`diretor:approve` = A, `financeiro:approve` = B) → ambas registradas,
    ativação de R$ 5.000.000 permitida.
(c) A rejeição de (a) é por identidade, não por papel: dois `admin` **diferentes** aprovando
    papéis diferentes no mesmo contrato → **permitido**.
(d) Se a decisão estender D-K: o criador (`created_by`) não pode registrar nenhuma aprovação,
    mesmo tendo papel e nível. Se não estender, isso fica registrado em `APPROVALS.md` e este
    item é declarado fora de escopo — **nunca omitido em silêncio**.

**R5 — Fail-closed (agravante estrutural)**
(a) `ActivateContractUseCase` não pode ser construído sem a dependência que impõe a alçada — ou a
    ausência dela com `requiredRoles.length > 0` **lança erro** em vez de prosseguir (:63).
(b) Teste que comprove (a): instanciar sem o repositório e ativar contrato de R$ 5.000.000 → erro.

**R6 — Cobertura e integridade**
(a) Testes versionados cobrindo R2(a,c), R3(a,b), R4(a,b) e R5(b), referenciando `FIND-ERP-005` e
    `RF-JUR-003`.
(b) Suíte completa verde no REMEDIATION_COMMIT.
(c) Nenhuma regressão em `juridico-contract-use-cases.test.ts:174-227`.
(d) Reteste executado por `vericore-audit-verification-runner`, dinâmico e independente da suíte
    do projeto, contra o REMEDIATION_COMMIT identificado.

## LACUNAS DECLARADAS

| # | Lacuna | Consequência |
|---|---|---|
| L1 | **Prova dinâmica ausente.** Modo read-only reforçado, sem Bash e sem banco. Nenhuma requisição HTTP, nenhum teste executado. A REPRODUCTION é derivada de leitura estática determinística do fluxo rota → middleware → controller → use case → repositório. | As 4 falhas são `CONFIRMED` por evidência estática (o caminho não contém o `if` que faltaria); a confirmação **empírica** cabe ao reteste R1-R6. |
| L2 | **Matriz de autorização declarada inexistente.** Não há `AUTHORIZATION_MATRIX` versionada. A única declaração é `BLOCO_3_JUR_API.md:221-235`, que **contradiz a si mesma** (:214 × :233) e diverge do código. A ausência é finding em si. | Falhas 1 e 3 são divergência contra o único documento existente, não contra uma matriz oficial. |
| L3 | **Não determinável:** se D-K vale para aprovação de contrato. Hoje não vale; não há decisão registrada dizendo que não deve valer. | R4(d) fica condicionado a decisão humana; R4(a-c) **não** depende dela — impedir que a MESMA pessoa registre os DOIS papéis é exigência intrínseca de dupla aprovação. |
| L4 | **Sem OWNER nominal.** As regras citam "decisão do dono em 2026-08-08" em comentário, sem registro de aprovação (Regra 17). | Não há autoridade identificável para arbitrar L2/L3 sem escalada. |
| L5 | **Cobertura de escopo.** Cobre exclusivamente `jur_contracts × {approve, activate, addendum}`. As demais células do módulo (contencioso, prazos, procurações, PI, LGPD) **não foram classificadas**. | Não inferir conformidade das demais células a partir deste documento. |

## Decomposição da severidade (verificada, não aceita de partida)

- Falha 1 (hard-coded × contrato de API): **MEDIUM** isolada — divergência de mecanismo e perda
  de auditabilidade, não bypass. O código é internamente coerente e testado nas 3 faixas.
- Falha 2 (`operate` em vez de `approve`): **HIGH** isolada — escalada real, mitigada por
  `diretor` já ser módulo restrito.
- Falha 3 (aditivo eleva valor): **CRITICAL** isolada — o perfil mais baixo do módulo anula
  integralmente o controle financeiro por caminho lateral, sem precisar de papel de aprovador.
- Falha 4 (`admin` autoaprova): **CRITICAL** isolada — dupla aprovação que uma pessoa só satisfaz
  não é dupla aprovação; agravada por o repositório já ter o primitivo que nomeia exatamente este
  comportamento como o que não se deve fazer.

O agregado é CRITICAL porque 3 e 4 são bypasses completos e independentes: corrigir uma não fecha
a outra. O ambiente NÃO-PRODUÇÃO não rebaixa a severidade porque os quatro defeitos são de
desenho e viajam com o módulo para produção.

## Nota de procedimento

Finding **preliminar**, levantado no passo 26 e formalizado fora da sequência do passo 31 por
autorização humana explícita. Não pertence a nenhum `AUDIT_ID`. Por ser CRITICAL, deve passar
pelo `vericore-finding-validator` antes de consolidação. `STATUS: OPEN` — somente VeriCore pode
declarar `RETEST_PASSED` e `CLOSED` (Regra 4), e **nenhuma remediação foi autorizada ou
aplicada**.

---

*Produzido pelo agente `vericore-authorization-auditor` em modo read-only reforçado; conteúdo
persistido pelo orquestrador (hook bloqueia escrita VeriCore fora de `audit/`), sem edição.*

---

## Validação (finding-validator)

**VEREDITO: CONFIRMED — SEVERITY CRITICAL mantida, CONFIDENCE CONFIRMED mantida.** As 4 falhas
seguem para a SanaCore após 2 correções de texto obrigatórias.

BUSCA POR CONTROLE COMPENSATÓRIO (rota, middleware, controller, use case, repositório, constraint
de banco, trigger, cliente):
- **Falha 1** — grep próprio por `jur_approval_thresholds|approval-thresholds` no repo: 4 arquivos
  de documentação + o finding, **zero em `server/src`/`migrations`/`client`**. Confirmado.
- **Falha 2** — cadeia rota(`:71` sem `requiredLevel`) → middleware(`:82` default `'operate'`) →
  controller(`:52-53` truthiness) confirmada; `validatePermissions.ts:28-30` **permite**
  `diretor:operate` sem exceção. Confirmado.
- **Falha 3** — `:61` lido caractere a caractere: **não condiciona a `change_type`**; nenhuma das
  4 camadas abaixo reintroduz a guarda. Confirmado.
- **Falha 4** — a unicidade de banco `uq_jur_contract_approvals_contract_role`
  (migration `20260808-000002:40-44`) é sobre **(contrato, papel)**, não identidade — **o banco
  institucionaliza a falha em vez de compensá-la.** Confirmado.

**REFORÇO NÃO REGISTRADO NO FINDING:** `UpdateContractUseCase.ts:14,34-42` **bloqueia** a alteração
de `value` em contrato `active` (erro BR-JUR-007). Ou seja: a Falha 3 não é omissão de
funcionalidade — é **contorno de um controle que o próprio módulo implementa em outra rota**.

RESULTADO DA BUSCA: **nenhum controle compensatório em nenhuma camada.** Duas tentativas de
refutação encontraram o oposto (o banco confirma o dedup por papel; o PUT bloqueia o que o aditivo
libera). As 4 falhas são independentes e reproduzíveis por leitura estática determinística.

CORREÇÕES OBRIGATÓRIAS (defeito de evidência em finding CRITICAL, editoriais, não devolução):
1. **`RELATED_TEST` está factualmente errado.** O finding diz "AUSENTE: qualquer teste de
   `ApproveContractUseCase`" — **falso**: `juridico-contract-use-cases.test.ts:231-333` tem o
   bloco com 6 testes (`ApproveContractUseCase`) + o de aditivo. A conclusão substantiva sobrevive
   (`:272-279` exercita **papel**, nunca identidade; `:325-332` usa `objectContaining` que
   passaria mesmo se `value` fosse gravado, logo a variante cruzada da Falha 3 é indetectável).
   "Nenhuma das 4 falhas é detectável pela suíte" permanece verdadeiro; "não existe teste" é falso.
   R6(c) deve estender a não-regressão de `:174-227` para `:174-333`.
2. **Falha 2, redação:** "o `diretor:operate` sozinho destrava integralmente a **ativação**" →
   "elimina integralmente a **exigência de alçada** na faixa" (a ativação ainda exige
   `juridico:operate`; para `admin` a leitura forte é literalmente verdadeira).

JUSTIFICATIVA: tentativa de refutar cada falha separadamente, em todas as camadas onde um controle
poderia residir, e cada tentativa falhou de forma verificável por arquivo:linha. O ambiente
NÃO-PRODUÇÃO não rebaixa: os quatro defeitos são de desenho e viajam com o módulo, e a conta
`admin` (vetor da Falha 4) já é PRODUÇÃO REAL. Reproduzibilidade estática suficiente para
CONFIRMED; prova empírica delegada a R1-R6.

*Validação produzida pelo `vericore-finding-validator`; seção anexada pelo orquestrador.*
