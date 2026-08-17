# `AUD-ALOG-01` — Desativação lógica sem trilha de auditoria em 8 de 13 casos de uso

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         T-03_RETIFICACAO_01.md §6 (autor de origem do T-03)
ESTADO:         PROPOSED → CONFIRMED
REGRA 22:       despachado ao vericore-finding-validator
```

> **ESTE FINDING NÃO É HOMOGÊNEO.** Dois dos oito endpoints estão **em uso real
> hoje**, confirmado pelo dono em 2026-08-16, e recebem severidade e prioridade
> próprias. Os outros seis seguem a classificação normal do run. Tratar os oito
> com uma severidade única esconderia exatamente o que importa.

## 1. Sumário de severidade e ambiente

| # | Endpoint / ponto | Severidade | Ambiente | Loga? |
|---|---|---|---|---|
| **A** | `DELETE /api/employees/:id` — desligamento de funcionário | **CRITICAL** | **PRODUÇÃO REAL** | não |
| **B** | `PATCH /api/items/:id/inactivate` — inativação de insumo | **HIGH** | **PRODUÇÃO REAL** | não |
| C | `itemController.ts:205` — fornecedor de item | HIGH | DEV / HOMOLOGAÇÃO | não |
| D | `supplierController.ts:121` | HIGH | DEV / HOMOLOGAÇÃO | não |
| E | `clientController.ts:80` | HIGH | DEV / HOMOLOGAÇÃO | não |
| F | `categoryController.ts:66` | HIGH | DEV / HOMOLOGAÇÃO | não |
| G | `departmentController.ts:65` | HIGH | DEV / HOMOLOGAÇÃO | não |
| H | `assetController.ts:81` | HIGH | DEV / HOMOLOGAÇÃO | não |
| — | `saleController.ts:347` | HIGH | DEV / HOMOLOGAÇÃO | **parcial** — verbo `delete` em vez de `soft_delete`, e **sem** `oldValues`/`newValues` |

Severidade dos itens **A** e **B** fixada pelo dono em 2026-08-16, com
declaração de ambiente. Os demais seguem a classificação da trilha.

**Placar completo dos 13 casos de uso de desativação lógica:**
**4 logam completo · 1 loga incompleto · 8 não logam nada.**

## 2. O que torna A e B diferentes de tudo que este run produziu até aqui

Quase todos os findings deste run estão em **DEV/HOMOLOGAÇÃO**, com cláusula de
reavaliação para quando o módulo entrar em produção. **Estes dois não têm
cláusula porque não há o que aguardar: o dano é possível hoje.**

### 2.1 `DELETE /api/employees/:id` — CRITICAL, produção real

`employeeController.ts:94-103`. Desligamento de funcionário: grava
`dismissal_date`, muda `status` para `'inactive'`, responde **200 com "desligado
com sucesso"** e **não deixa registro de quem fez, quando, nem de onde**.

Por que CRITICAL e não HIGH:

- **É ato de efeito trabalhista.** Desligamento tem consequência jurídica,
  previdenciária e financeira; a exigência probatória é a mais alta do escopo.
- **Está em uso real hoje**, confirmado pelo dono — não é risco latente.
- **Não há reconstituição possível.** Combinado com `AUD-DB-06` (sem
  `CORRELATION_ID`) e `FIND-ERP-002` (trilha não imutável), não existe caminho
  alternativo para responder "quem desligou este funcionário".
- **O ator pode encobrir o próprio rastro** — quem tem permissão de escrita
  desliga alguém e o sistema não produz evento algum.

Agravante já registrado em `T33-A-F04`: esta mesma rota legada grava
`dismissal_date` **sem passar pelo fluxo formal de desligamento** que a
`BR-RH-024` descreve. O finding do processo e este, da trilha, são
**independentes e cumulativos**: um diz que o rito não é seguido, este diz que
nem o desvio fica registrado.

### 2.2 `PATCH /api/items/:id/inactivate` — HIGH, produção real

`itemController.ts:135-146`. Inativação de insumo **tier 1**, no universo dos
**327 insumos reais** carregados no sistema, confirmado pelo dono como módulo em
uso.

Um insumo sai da operação — deixa de aparecer para requisição, compra e
estrutura de produto — **sem registro de autoria**. Efeito prático: uma BOM que
dependa dele quebra, ou uma compra deixa de ser planejada, e não há como
responder quem retirou o item nem quando.

Não é CRITICAL pela razão que o próprio dono delimitou: o efeito é operacional e
reversível — reativar o insumo restaura o estado —, enquanto o desligamento de
funcionário não é reversível por `UPDATE`.

## 3. Evidência

**Os 8 mudos:** `itemController.ts:135-146` e `:205`; `employeeController.ts:94-103`;
`supplierController.ts:121`; `clientController.ts:80`; `categoryController.ts:66`;
`departmentController.ts:65`; `assetController.ts:81`.
**O parcial:** `saleController.ts:342-360`.

**Contraprova de que o padrão correto existe no mesmo repositório** — e portanto
a ausência é omissão, não convenção: `productController.ts:197-205`,
`bomController.ts:211-219`, `DeactivateUserUseCase.ts:46-54`, todos emitindo
`action: 'soft_delete'` com par `oldValues`/`newValues`.

**Controle compensatório procurado e inexistente:** não há middleware global de
auditoria de mutação, interceptor de rota nem hook de model. O caminho único de
escrita é `logAction` → `AuditLog.create`, invocado **explicitamente** pelo call
site. Onde não foi escrito, não existe captura implícita.

`logAction` restrito aos módulos `clients`, `items`, `categories`, `departments`,
`suppliers`, `assets`, `employees`, `sales` retorna **um único arquivo** —
`saleController.ts`. Nos outros sete módulos é **zero em qualquer camada**, o que
descarta o controle de camada que `AUD-DB-03:54-57` identificara para
`users`/`accessProfiles`.

## 4. Comportamento esperado

Master Spec §20: toda ação crítica sobre cadastro mestre gera registro com
`USER`, `TIMESTAMP`, `ACTION`, `ENTITY`, `ENTITY_ID`, `OLD_VALUE`/`NEW_VALUE`,
`SOURCE`, `IP`/`SESSION`, `CORRELATION_ID`. **Desativação lógica é mutação de
cadastro mestre** — a asserção contrária que dispensava essa classe foi
retificada em `T-03_RETIFICACAO_01` e `AUD-DB-09_RETIFICACAO_01`.

## 5. Prioridade de remediação — determinada pelo dono

> **A e B vão à frente de todo achado apenas DEV/HOMOLOGAÇÃO na fila de
> remediação**, por já estarem em uso real sem trilha. Determinação do dono,
> 2026-08-16.

Isso os coloca acima, inclusive, de findings de severidade nominal igual ou
superior cujo módulo ainda não está em produção. **O critério de ordenação é
exposição real, não severidade nominal** — e essa é a primeira vez neste run que
o critério se aplica.

Os outros 6 seguem a fila normal.

## 6. Recomendação (endereçada à SanaCore, não executada — Regra 2)

1. Emitir `logAction` com `action: 'soft_delete'` e par `oldValues`/`newValues`
   nos 8 call sites.
2. Corrigir `saleController.ts:350` — verbo `soft_delete` e valores presentes.
3. **A e B primeiro**, em ordem: `employees`, depois `items`.

Nota de escopo para quem remediar: `logAction` **não existe em nenhuma camada**
de sete desses módulos. A correção não é acrescentar uma chamada a um padrão já
instalado — é **instalar o padrão** naqueles módulos. Estimar como
"uma linha por endpoint" subestima o trabalho.

## 7. Critério de reteste

**Estático:** `logAction` presente nos 13 call sites, com `action: 'soft_delete'`
e par `oldValues`/`newValues`.

**Dinâmico** (`DYN-T03-07`, fila G4, **`erp_evok_audio_test` apenas** — nunca
contra produção): exercitar os 13 endpoints e verificar 13 linhas
correspondentes em `audit_logs`. **Não executado.**

Para A e B, o reteste deve incluir verificação de que o registro identifica
`USER` e origem — um `logAction` que grave a ação sem o autor não fecha este
finding, porque autoria é exatamente o que falta.

## 8. Relação com findings existentes — declarada, não resolvida

**Sobrepõe-se materialmente a `AUD-DB-03` (HIGH)**, que já lista sete desses
módulos como "rota de escrita e zero `logAction`". O autor de origem **declarou
a sobreposição em vez de contar um HIGH novo sobre o mesmo risco** e deixou a
decisão ao `vericore-finding-validator`:

- **(a)** consolidar como emenda de caracterização de `AUD-DB-03`; ou
- **(b)** manter autônomo, porque atinge também `sales`, que **não** está entre
  os 13 módulos de `AUD-DB-03`.

**A decisão de ambiente e severidade tomada pelo dono é argumento novo para (b)
e não existia quando a sobreposição foi declarada:** `AUD-DB-03` é um finding
DEV/HOMOLOGAÇÃO de amplitude; A e B são **produção real com prioridade de fila**.
Absorvê-los num finding de amplitude arriscaria diluir a prioridade que o dono
determinou. O validador decide — este parágrafo é insumo, não veredito.

Relaciona-se ainda a `AUD-DB-06` (sem `CORRELATION_ID`), `FIND-ERP-002` (trilha
não imutável) e `T33-A-F04` (rota legada de desligamento fora do rito formal).

## 9. Resíduo declarado

`RES-T03-05`: a cobertura foi medida sobre os call sites de `Deactivate*UseCase`.
Um `update` genérico que grave `active: false` por outra via — por exemplo o
`PUT` de edição — **não foi enumerado**, e está declarado como **não coberto**,
não como conforme. Foi exatamente esse tipo de extrapolação que produziu o erro
retificado em `T-03_RETIFICACAO_01`.

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4).
