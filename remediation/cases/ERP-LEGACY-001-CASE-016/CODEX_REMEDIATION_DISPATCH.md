# Despacho Codex — `ERP-LEGACY-001-CASE-016`

```
CASE_ID:      ERP-LEGACY-001-CASE-016
FINDING_ID:   ERP-LEGACY-001-AUD-001 / AUD-DB-03 (HIGH), caracterizado em
              AUD-ALOG-01 (itens C-H e remanescente)
BASE:         remediation/cases/ERP-LEGACY-001-CASE-016/TRIAGE.md (versão RETIFICADA)
HEAD verificado: baab7df (branch `main`)
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
DESTINO:      sanacore-remediation-engineer / Codex
BRANCH:       sana/ERP-LEGACY-001/CASE-016
ESCOPO REAL:  o finding cobre 13 módulos, em 3 classes. Este despacho autoriza
              5 deles (Fase 2). Ver §1.
STATUS:       Fase 2 EXECUTÁVEL. Fases 1, 3 e 4 bloqueadas por D1/D2/D3/D4.
RETIFICADO:   2026-08-18 — corrige 3 erros factuais da versão anterior
              (ver TRIAGE.md §0)
```

## 0. Retificação — leia antes de qualquer coisa

A versão anterior deste despacho estava **factualmente errada** em três pontos,
e o prompt literal abaixo foi reescrito por causa disso. O registro completo
está em `TRIAGE.md` §0. Em resumo:

1. Afirmava que `employees` e `items` já tinham saído de `DEBITO_CONHECIDO` em
   `main` e que o escopo era de 11 módulos. **Falso:** a lista tem 13 entradas
   e as duas estão nela. A remediação do `CASE-004` está em branch **não
   mesclada**. Causa: leitura de worktree não mesclada reportada como `main`.
2. Afirmava que `users` e `accessProfiles` tinham **0** `logAction`. **Falso:**
   têm 5 e 3 call sites em `application/use-cases`. Constam do débito por
   cegueira de camada **da guarda**, que é a fragilidade (b) registrada no
   próprio finding. Causa: inversão do sentido do finding.
3. Contava ocorrências de `logAction` sem restringir a `.ts`, capturando
   README. Causa: varredura sem `--include=*.ts`.

**Consequência prática:** o escopo autorizado deste despacho é **menor** e mais
preciso que o da versão anterior. Não execute nenhum prompt da versão antiga.

## 1. Escopo autorizado

O finding cobre os **13** módulos de `DEBITO_CONHECIDO`
(`server/tests/unit/audit-coverage-guard.test.ts:49-63`). Eles não são o mesmo
problema:

| Classe | Módulos | Tratamento |
|---|---|---|
| **I** — a guarda está cega, o módulo já audita | `users`, `accessProfiles` | **Nenhum código de produção.** Bloqueado por **D1** |
| **II** — remediação já existe em branch não mesclada | `employees`, `items` | **NÃO TOCAR.** `CASE-004` (branch `sana/ERP-LEGACY-001/CASE-004`, HEAD `2c10a80`, não mesclada) e `CASE-014` item C |
| **III-a** — mudos, produção real, já reivindicados | `categories`, `departments` | Bloqueado por **D4** (`CASE-014` itens F/G) |
| **III-b** — mudos, exceção arquitetural | `webhooks`, `mobileInventory` | Bloqueado por **D2** / **D3** |
| **III-c** — mudos, CRUD padrão, NÃO-PRODUÇÃO | `clients`, `suppliers`, `assets`, `nonConformities`, `serviceOrders` | **AUTORIZADO — é o escopo deste despacho** |

**Você implementa 5 módulos: `clients`, `suppliers`, `assets`,
`nonConformities`, `serviceOrders`.** Nada além disso.

## 2. Decisões humanas pendentes (não são suas)

Nenhuma delas bloqueia a Fase 2 autorizada. Nenhuma delas pode ser decidida por
você, e nenhuma pode ser inferida.

- **D1** — `users`/`accessProfiles`: (i) ampliar `temAuditoria` para varrer
  `application/` e remover as duas entradas por correção da guarda, sem tocar
  código de produção; ou (ii) duplicar `logAction` no controller, produzindo
  duas linhas de trilha por ação. Triagem recomenda (i); decide o dono.
- **D2** — `webhooks`: rotas não autenticadas, trilha ficaria sem autor.
- **D3** — `mobileInventory`: qual `entityType` e granularidade de `POST /batch`.
- **D4** — sequenciamento com `CASE-014` (`categories`, `departments`).
- **D5** — comportamento em falha de `logAction`.

Detalhamento e consequências de cada opção: `TRIAGE.md` §5.

---

## 3. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente a Fase 2 do CASE-016.

CASE_ID: ERP-LEGACY-001-CASE-016
FINDING_ID: ERP-LEGACY-001-AUD-001 / AUD-DB-03 (HIGH), caracterizado em AUD-ALOG-01
AUDIT_COMMIT: c1311a6f76b512fef893f7e60d934179cae3409f
BASE DE TRIAGEM: remediation/cases/ERP-LEGACY-001-CASE-016/TRIAGE.md (versão retificada)
DATA: 2026-08-18

ESCOPO AUTORIZADO — exatamente 5 módulos, nem um a mais:
  clients, suppliers, assets, nonConformities, serviceOrders

Estes 5 são os módulos que (a) têm rota de escrita, (b) têm ZERO chamadas de
logAction em qualquer camada, (c) são CRUD padrão sem exceção arquitetural,
(d) têm PK INTEGER, e (e) não são reivindicados por nenhum outro caso aberto.

Trabalhe exclusivamente na worktree/branch:
  branch: sana/ERP-LEGACY-001/CASE-016
Se a worktree ainda não existir, crie-a a partir de main, sem tocar em main.

---

REGRAS ABSOLUTAS — violação invalida o trabalho inteiro:

1. Banco de dados:
   - NUNCA conecte no banco de produção erp_evok_audio. Nem para "só contar
     linhas", nem para "só confirmar comportamento". Sem psql, sem docker exec,
     sem script de diagnóstico contra ele.
   - Testes rodam com auditLogService MOCKADO. Se precisar de banco, apenas
     erp_evok_audio_test.
   - Regra permanente de dado real (APR-2026-016) integralmente observada.

2. Autoridade:
   - NÃO declare FINDING CLOSED. NÃO declare RETEST_PASSED. Essa autoridade é
     EXCLUSIVA da VeriCore. O máximo que você registra é REMEDIATION_COMPLETE.

3. Evidência:
   - Capture o OUTPUT REAL de cada comando que executar (teste, typecheck,
     build) e cole no pacote de evidência. Alegação em texto do tipo "os testes
     passaram" sem output colado é rejeitada no reteste.

4. Commit:
   - Commit na branch sana/ERP-LEGACY-001/CASE-016. NUNCA em main.

5. Escopo — o que NÃO tocar, por nenhum motivo:
   - NÃO toque em employees nem items. A remediação deles existe na branch
     sana/ERP-LEGACY-001/CASE-004 (HEAD 2c10a80), que NÃO está mesclada em main.
     Você vai VER as duas entradas em DEBITO_CONHECIDO na sua árvore: isso é
     esperado e NÃO significa que estão sem remediação. Não as remova, não as
     reimplemente.
   - NÃO toque em users nem accessProfiles. Eles JÁ auditam, em
     application/use-cases (users: 5 arquivos; accessProfiles: 3). Constam do
     débito por cegueira de camada da guarda, não por falta de auditoria.
     A correção deles depende da decisão D1 do dono, que não foi tomada.
   - NÃO toque em categories nem departments (reivindicados por CASE-014,
     decisão D4 pendente).
   - NÃO toque em webhooks nem mobileInventory (exceções arquiteturais,
     decisões D2/D3 pendentes).
   - NÃO toque em sales.
   - NÃO altere a função temAuditoria em audit-coverage-guard.test.ts. Ampliar
     a varredura para application/ é a opção (i) da decisão D1, que NÃO foi
     aprovada. Você só remove entradas da lista DEBITO_CONHECIDO.
   - NÃO toque em audit/, coretriad/, .claude/, docs/.
   - NÃO toque em server/src/middlewares/auth.ts,
     server/src/services/auditLogService.ts, server/src/models/AuditLog.ts.
   - NENHUMA migration. NENHUMA alteração de model Sequelize. NENHUMA mudança
     de contrato HTTP (status code, payload, comportamento observável).

---

LEITURA OBRIGATÓRIA ANTES DE EDITAR:

1. remediation/cases/ERP-LEGACY-001-CASE-016/TRIAGE.md — integralmente,
   sobretudo §0 (retificação: os erros que você não deve repetir), §2 (tabela
   dos 13 módulos), §4.2 (coordenação de merge) e §4.3 (privacidade).

2. Padrão de referência, já implementado e funcionando:
   - server/src/modules/products/presentation/controllers/productController.ts
     linhas 133-140 (create), e também 165, 197, 235.
   - server/src/modules/bom/presentation/controllers/bomController.ts
     linhas 137, 182, 211.
   Copie ESTE padrão. Não invente outro.

3. Leitura apenas, sem alterar:
   - server/src/services/auditLogService.ts (assinatura de logAction)
   - server/src/models/AuditLog.ts (como autoria/ip/rota são extraídos de req)

4. Para cada um dos 5 módulos:
   - server/src/modules/<M>/presentation/routes/*.ts — liste os handlers de
     escrita reais antes de editar.
   - server/src/modules/<M>/presentation/controllers/*.ts — onde você implementa.

5. server/tests/unit/audit-coverage-guard.test.ts — leia os TRÊS testes, não
   só a lista. O terceiro (linhas 106-113) é catraca reversa: reprova se a
   lista contiver módulo que já audita.

---

ROTAS DE ESCRITA ESPERADAS (confirme lendo os arquivos; se divergir, pare e
escale antes de implementar):

  clients          POST /   PUT /:id   DELETE /:id
  suppliers        POST /   PUT /:id   DELETE /:id
  assets           POST /   PUT /:id   DELETE /:id   POST /:id/photo
  nonConformities  POST /   PUT /:id   DELETE /:id
  serviceOrders    POST /   PUT /:id   DELETE /:id

Nota sobre clients e suppliers: os README desses módulos
(server/src/modules/clients/README.md:165 e suppliers/README.md:146) dizem
literalmente "Nenhum endpoint deste módulo chama logAction". São documentação,
descrevem a AUSÊNCIA. Ao terminar, atualize esses dois README para refletir o
novo estado — é o único doc que você tem autorização de tocar, porque é doc de
módulo dentro do seu escopo de código.

Nota sobre assets: POST /:id/photo é upload, não CRUD de entidade. Audite como
'update' do Asset, com entityId do asset e SEM colocar conteúdo/caminho de
arquivo em oldValues/newValues.

---

IMPLEMENTAÇÃO, por módulo M em {clients, suppliers, assets, nonConformities, serviceOrders}:

Passo 1 — Ler routes/*.ts e mapear cada rota de escrita ao seu handler no controller.

Passo 2 — Em cada handler de escrita, após o sucesso do use-case e antes de
responder, chamar logAction seguindo o padrão de productController:

  logAction(req, {
    action: 'create' | 'update' | 'soft_delete',
    entityType: '<ModelName>',        // Client, Supplier, Asset, NonConformity, ServiceOrder
    entityId: entidade.id,            // INTEGER — nenhum destes 5 tem PK UUID
    entityDescription: <código ou nome comercial>,
    oldValues: { <apenas campos mutáveis não-sensíveis> },   // só em update/delete
    newValues: { <apenas campos mutáveis não-sensíveis> },
    description: `<frase curta em português descrevendo a ação>`
  });

Para update e soft_delete, leia o estado anterior com o repositório JÁ
instanciado no controller, para preencher oldValues. Não instancie repositório
novo, não adicione dependência.

Mantenha o comportamento externo idêntico: mesmo status code, mesmo payload.
Siga o padrão de products quanto a await — não mude a semântica de erro.

RESTRIÇÃO DE PRIVACIDADE (AUD-DB-08 / BR-RH-020) — obrigatória:
  Permitido em oldValues/newValues: status, active, código, nome comercial,
  department_id, datas de negócio, e campos estruturais equivalentes.
  PROIBIDO: CPF, CNPJ de pessoa física, salário, dado bancário, endereço
  pessoal, telefone pessoal, e-mail pessoal.
  PROIBIDO: { ...entidade.toJSON() } ou qualquer spread da entidade inteira.
  entityDescription NUNCA usa CPF nem e-mail pessoal.
  Antes de commitar, varra o diff final por chave E por valor procurando dado
  sensível.

Passo 3 — Em server/tests/unit/audit-coverage-guard.test.ts, remover da lista
DEBITO_CONHECIDO EXATAMENTE as 5 entradas dos módulos que você implementou:
'clients', 'suppliers', 'assets', 'nonConformities', 'serviceOrders'.

  - Não remova nenhuma outra entrada. As 8 restantes (accessProfiles,
    categories, departments, employees, items, mobileInventory, users,
    webhooks) FICAM.
  - Não altere a função temAuditoria.
  - Para cada remoção, deixe comentário de rastreabilidade no padrão do CASE-004:
    // '<mod>' SAIU em 2026-08-18 (SanaCore `ERP-LEGACY-001-CASE-016` Fase 2,
    // `AUD-DB-03`/`AUD-ALOG-01`): handlers de escrita passaram a chamar `logAction`.

REGRA DE COORDENAÇÃO DE MERGE (obrigatória, não é opcional):
  Três casos editam esta mesma lista: CASE-004 (employees, items), CASE-014
  (items, categories, departments) e este. Antes de editar, confira o estado
  atual da lista na sua base. Se alguma entrada já foi removida por outro caso,
  NÃO a reintroduza e NÃO a remova de novo. Registre no pacote de evidência o
  estado em que você ENCONTROU a lista (quantas entradas, quais) e o estado em
  que a deixou. Isso é rastreabilidade de coordenação entre casos.

---

TESTES:

Para cada um dos 5 módulos, crie teste unitário novo cobrindo:
  - logAction é chamado uma vez por handler de escrita
  - action correto (create / update / soft_delete)
  - entityType igual ao nome do model
  - entityId presente, typeof number, não NaN
  - oldValues/newValues NÃO contêm campo sensível (asserção explícita e
    negativa, por nome de campo)
  - req é repassado (garantia de autoria)

O auditLogService DEVE ser mockado. Nenhum teste abre conexão de banco.

PROVA VERMELHA, antes de implementar:
  1. Escreva os testes novos contra o código atual.
  2. Execute e capture o output REAL mostrando que falham.
  3. Só então implemente.
  4. Execute de novo e capture o output REAL verde.

VALIDAÇÃO ao terminar, com output real colado de cada comando:
  1. Os 5 testes novos — verdes.
  2. audit-coverage-guard.test.ts — os TRÊS testes verdes. Atenção ao terceiro
     (catraca reversa, linhas 106-113): se você removeu uma entrada de módulo
     que na verdade não audita, ou deixou na lista um módulo que passou a
     auditar, é ele que reprova.
  3. Suíte unitária de cada um dos 5 módulos — nenhuma regressão, nenhuma
     asserção antiga removida ou afrouxada.
  4. npm run typecheck e npm run build, se disponíveis na worktree.

---

EVIDÊNCIA OBRIGATÓRIA:

Gere remediation/cases/ERP-LEGACY-001-CASE-016/REMEDIATION_EVIDENCE_PACKAGE.md
contendo:
  - Escopo executado: os 5 módulos, e a declaração explícita de que
    users/accessProfiles/employees/items/categories/departments/webhooks/
    mobileInventory NÃO foram tocados e por quê (uma linha cada).
  - FILES_AFFECTED: lista real de arquivos alterados (git diff --stat colado).
  - Rotas de escrita encontradas por módulo e o logAction correspondente,
    com arquivo:linha.
  - Estado de DEBITO_CONHECIDO ENCONTRADO (nº de entradas e quais) e estado
    DEIXADO — para coordenação com CASE-004/CASE-014.
  - Prova vermelha: output real, colado.
  - Prova verde: output real, colado, dos 4 itens de validação.
  - Varredura de privacidade: como você conferiu que nenhum oldValues/newValues
    carrega dado sensível, e o resultado.
  - Declaração de conformidade com APR-2026-016: nenhuma conexão com
    erp_evok_audio foi aberta em nenhum momento.
  - Status: REMEDIATION_COMPLETE (Fase 2). FINDING CLOSED: não — autoridade
    exclusiva da VeriCore. RETEST_PASSED: não declarado.

---

COMMIT:

Branch sana/ERP-LEGACY-001/CASE-016, nunca main. Mensagem:

  remediation(CASE-016 Fase 2): logAction em 5 modulos de escrita mudos

  Implementa logAction nos handlers de escrita de clients, suppliers, assets,
  nonConformities e serviceOrders, no padrao de productController. Remove as
  5 entradas correspondentes de DEBITO_CONHECIDO em audit-coverage-guard.test.ts.

  Escopo do finding AUD-DB-03 sao 13 modulos; esta fase cobre 5. Fora do escopo,
  por motivo registrado em TRIAGE.md: users/accessProfiles (ja auditam em
  application/use-cases; pendente decisao D1), employees/items (remediados em
  sana/ERP-LEGACY-001/CASE-004, nao mesclada), categories/departments
  (CASE-014, decisao D4), webhooks/mobileInventory (excecoes arquiteturais,
  decisoes D2/D3).

  Nenhuma migration, nenhum model, nenhum contrato HTTP alterado.
  Nenhuma conexao com banco de producao. FINDING CLOSED nao declarado.

Depois do commit: PARE. Aguarde segunda opinião e reteste da VeriCore. Não
declare FINDING CLOSED nem RETEST_PASSED.

---

SE ENCONTRAR DIVERGÊNCIA:

Se qualquer premissa deste prompt não se confirmar na árvore (rota que não
existe, módulo que já tem logAction, PK que não é INTEGER, entrada de
DEBITO_CONHECIDO em estado diferente do descrito), PARE e escale antes de
implementar. Não ajuste a premissa por conta própria — foi exatamente esse
tipo de ajuste silencioso que produziu os 3 erros factuais retificados em
TRIAGE.md §0.
```

---

## 4. Bloqueadores

| ID | Bloqueia | Natureza |
|---|---|---|
| **D1** | `users`, `accessProfiles` (Fase 1) | Decisão do dono: corrigir a guarda (i) ou duplicar trilha (ii). Recomendação técnica registrada: (i) |
| **D2** | `webhooks` (Fase 4) | Desenho de trilha para rota não autenticada |
| **D3** | `mobileInventory` (Fase 4) | `entityType` e granularidade de lote |
| **D4** | `categories`, `departments` (Fase 3) | Sequenciamento com `CASE-014` |
| **D5** | transversal, não bloqueia | Comportamento em falha de `logAction` |
| **merge** | `employees`, `items` | Coordenação com `CASE-004` (não mesclada) e `CASE-014` |

**A Fase 2 (5 módulos) não depende de nenhum desses.** É o que este despacho
libera.

## 5. Regras invioláveis observadas neste despacho

1. **Regra 3** — SanaCore corrige, mas não fecha o próprio finding.
2. **Regra 4** — `RETEST_PASSED` e `FINDING CLOSED` são exclusivos da VeriCore.
3. **Regra 6** — nenhuma regra de negócio inventada: D1-D5 ficam abertas para
   decisão humana, com consequências registradas e sem escolha embutida.
4. **Regra 15** — nada em `audit/` foi alterado; o finding é citado, não editado.
5. **Regra 12/13/14** — `AUDIT_COMMIT` fixo; o HEAD de leitura (`baab7df`) está
   declarado, e a distinção entre `main` e branch de remediação é explícita.
6. **`APR-2026-016`** — nenhuma conexão de banco em nenhuma fase desta triagem.

---

**Produzido por:** sanacore-remediation-triage
**Retificado em:** 2026-08-18, contra `main` @ `baab7df`
**Status:** Fase 2 liberada para o Codex. Fases 1/3/4 aguardando D1-D4.
