# `AUD-PAT-DEPRECIACAO-01` — `assets.current_value` afirma valor contábil e é cópia do valor de compra

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         T-35_C137_SEMANTICA_COLUNA_LOTE2.md (T35-PAT-F03)
VALIDAÇÃO:      T-36_VALIDACAO_T35.md — CONFIRMED, rebaixamento recomendado
SEVERIDADE:     MEDIUM  (HIGH proposta → MEDIUM aceita pelo dono, 2026-08-16)
ESTADO:         PROPOSED → CONFIRMED
AMBIENTE:       DEV / HOMOLOGAÇÃO
```

> **CLÁUSULA DE REAVALIAÇÃO AUTOMÁTICA.** Sem risco ativo hoje porque o módulo
> de patrimônio não está em produção. **Reavaliar automaticamente para
> bloqueante quando o módulo entrar em produção** — e, em especial, no momento
> em que qualquer relatório, balanço ou apólice passar a consumir
> `current_value`, porque é exatamente a ausência de consumidor que sustenta a
> severidade MEDIUM. Decisão do dono, 2026-08-16.

## 1. O defeito

`Asset.ts:56` — `current_value: DECIMAL(10,2), comment: 'Valor contábil atual'`.
`Asset.ts:7` — o cabeçalho do model afirma **"Suporta depreciação"**.

Escritores rastreados **exaustivamente**:

| Onde | O que grava |
|---|---|
| `CreateAssetUseCase.ts:83` | `current_value: purchase_value` — cópia na criação |
| `fixedAssetReceiptService.ts:79` | `current_value: line.unitPrice` — cópia no recebimento de NF |
| `UpdateAssetUseCase.ts:23` | campo editável manualmente |

**Nenhuma rotina de depreciação existe.** A busca foi ampliada na validação para
`amortiz`, `baixa`, `write_off`, jobs agendados e migrations com `UPDATE`, e
confirmou ausência total. `useful_life_months` (`Asset.ts:57`) é gravado
(`CreateAssetUseCase.ts:81`) e **nunca lido para cálculo**.

Portanto `current_value` **não é** valor contábil atual: é o valor de aquisição,
salvo digitação manual. O `comment` contradiz o uso real.

## 2. Dois agravantes encontrados na validação

1. **A conta contábil existe e não tem produtor.** `1.2.3 (-) Depreciação
   Acumulada` é semeada com `acceptEntries: true`
   (`20260807-000231:44`) — o plano de contas está preparado para receber
   lançamentos que nada emite.
2. **A documentação contradiz o código.** `20260810-000033:124` declara que
   *"valor contabil so existe apos a primeira depreciacao"*, enquanto
   `CreateAssetUseCase.ts:83` preenche o campo já na criação.

São **três declarações versionadas** de uma capacidade que não existe: o
cabeçalho do model, o `comment` da coluna e o texto da migration.

## 3. Por que MEDIUM e não HIGH — a refutação que procedeu

A proposta original equiparava este finding a `AUD-TES-SALDOMANUAL-01`
(saldo bancário digitado à mão e lido como posição de caixa) e a
`AUD-DB-T31-07`, tratando-o como **terceira ocorrência do mesmo padrão**.

A equiparação **falha em impacto**, e a diferença é verificável:

> `current_value` é **write-only em todo o repositório**: 3 escritores,
> **0 leitores**, **0 telas** — `client/src/pages/**` não o referencia em lugar
> algum.

No caso do saldo bancário existe consumidor: o número errado é exibido e usado
para decidir. Aqui, o número errado **não alimenta nada**. HIGH exige impacto
demonstrável, e não há caminho por onde o valor incorreto chegue a uma decisão.

O padrão semântico continua sendo o mesmo dos outros dois — **coluna que afirma
ser derivada e é digitada** —, e como *padrão* ele permanece registrado. O que
cai é a severidade deste caso, não o reconhecimento do padrão.

**Precisamente por isso a cláusula de reavaliação da §0 é mais estrita aqui:**
o dia em que aparecer o primeiro leitor, o fundamento do MEDIUM desaparece.

## 4. Gate humano que bloqueia a remediação (Regra 18)

**Implementar depreciação ou remover a coluna** — e, com ela, as três
declarações de capacidade da §2.

Não é decisão de engenharia. Depreciação envolve método, taxa e critério
contábil, que são regra de negócio; e "remover" significa assumir que o ERP não
faz controle patrimonial contábil. A SanaCore não pode escolher entre as duas
(Regra 6).

## 5. Critério de reteste (objetivo, estático)

Uma das duas alternativas, integralmente:

**(a)** Existe escritor de `current_value` derivado de `useful_life_months` +
`purchase_date` + método declarado, com lançamento na conta `1.2.3`, e teste que
o exercite; **ou**

**(b)** `assets.current_value` deixa de existir, ou é renomeada para o que de
fato guarda (`acquisition_value`), **e** as três declarações da §2 são
corrigidas — cabeçalho `Asset.ts:7`, `comment` da coluna e o texto de
`20260810-000033:124`.

Correção parcial não fecha: manter a coluna com nome novo e deixar o cabeçalho
afirmando "suporta depreciação" reproduz o mesmo defeito com outra redação.

## 6. Rastreabilidade

Mesmo padrão semântico de `AUD-TES-SALDOMANUAL-01` e `AUD-DB-T31-07`; **não é
duplicata** de nenhum dos dois — tabela distinta, impacto distinto, e a
diferença de impacto é o próprio fundamento da severidade.

Pedido de evidência dinâmica registrado e **não executado**: `DYN-T35-02`
(determina se há dano já ocorrido ou apenas risco latente).

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4).
