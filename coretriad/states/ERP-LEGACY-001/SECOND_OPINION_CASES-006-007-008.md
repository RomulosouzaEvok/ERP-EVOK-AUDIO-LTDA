# Segunda opinião — `CASE-006`, `CASE-007`, `CASE-008` (implementados pelo Codex)

```
DATA:        2026-08-17
REVISOR:     Claude Code (sessão principal), papel de segunda opinião (APR-2026-051)
NATUREZA:    PARECER. Nenhum RETEST_PASSED, FINDING CLOSED ou
             REMEDIATION_COMPLETE é declarado (Regras 3 e 4).
DETERMINAÇÃO: revisão obrigatória ANTES do reteste da VeriCore, mesmo atrasada.
```

> **Limitação de método, declarada de saída.** Os três revisores independentes
> despachados para este trabalho **morreram no limite semanal da conta** antes de
> produzir qualquer conteúdo. Esta revisão foi feita pela sessão principal,
> diretamente, e é **mais rasa do que a planejada**: verificação dirigida às
> perguntas de maior risco, não leitura integral dos 30 arquivos do `CASE-006`.
> **O que não foi medido está nomeado na §5.**

---

## 1. `CASE-007` — `AUD-AUTHN-03` · `REVISAO_APROVA_COM_RESSALVA`

### Decisões vinculantes — conferidas uma a uma, lendo o arquivo

| | Exigido | Encontrado | |
|---|---|---|---|
| **D1** | 1600 req/min por IP | `RATE_LIMIT_IP_MAX_PER_MINUTE = readPositiveIntegerEnv(..., 1600)`, janela `ONE_MINUTE_MS` | ✅ |
| **D2** | combinada IP **E** usuário; 300/15min | camada IP (`:114-117`) + camada usuário autenticado (`:128-129`, `FIFTEEN_MINUTES_MS`, 300) | ✅ |
| **D4** | 429 observável | `logger.warn('rate_limit_exceeded', {...})` via `rateLimitHandler`, em **todos** os limiters | ✅ |
| **D3** | `TRUST_PROXY` no escopo | **ver ressalva R1** | ⚠️ |

Constantes **nomeadas e configuráveis**, como o mandato exigia.

### O acerto arquitetural — merece registro

`auth.ts` trocou `next()` por `await applyAuthenticatedRateLimits(req, res, next)`.
Isso é **exatamente** a separação que a triagem pediu: limitar por **IP antes** de
autenticar, por **usuário depois**. Não caiu na armadilha de *"trocar `decode` por
`verify`"*, que quebraria a proteção pré-autenticação. **A causa-raiz foi
entendida, não só o sintoma.**

Proibições respeitadas: `runtimeEnv.ts` **não** tocado; `server/package.json` **não**
tocado; os testes novos **não** importam `app.ts` (armadilha do banco de produção).

### Ressalvas

**R1 — `D3` não foi endereçado por código novo.** A única linha de `TRUST_PROXY` é
a **pré-existente** (`app.set('trust proxy', runtimeEnv.trustProxy)`); `rateLimitPolicy.ts`
não a menciona. O mecanismo funciona (o `express-rate-limit` usa `req.ip`, que
respeita `trust proxy`), mas o **default continua `0`** — com proxy na frente, a
fábrica inteira conta como um IP e o teto de 1600 vira teto global. **`D3` dizia
que isso entrava no escopo.** Não entrou.

**R2 — configuração fora do schema validado.** `readPositiveIntegerEnv` lê `process.env`
**direto**, contornando o `runtimeEnv.ts` (zod), que é o padrão do projeto para
**toda** variável. É contorno pragmático do conflito de território com o `CASE-005`
— defensável —, mas cria **segundo caminho de configuração**, sem validação de
schema e sem aparecer no inventário de env vars. Deve ser reconciliado quando o
`CASE-005` mesclar.

**R3 — risco no ponto mais sensível do sistema.** `applyAuthenticatedRateLimits` é
**aguardado dentro do `try`** de `authenticate`, cujo `catch` trata
`TokenExpiredError` e devolve `401`. Se o limiter — ou qualquer middleware que ele
invoque por `next()` de forma síncrona — lançar, o erro cai nesse `catch` e pode
virar **`401` em vez de `429`/`500`**. `auth.ts:69` é o **único** `jwt.verify` em
produção; envolvê-lo é de altíssimo risco. **Item para a VeriCore exercitar.**

### Execução

`case007-rate-limit-policy` + `case007-rate-limit-source`: **7/7 passam**.
**Não verifiquei se reprovam o `AUDIT_COMMIT`** — ver §5.

---

## 2. `CASE-008` — `AUD-DB-02` · `REVISAO_APROVA`

### A pergunta central: as +161 linhas ficaram na Opção C?

**Ficaram.** Verificado por medição, não por afirmação do implementador:

| Verificação | Resultado |
|---|---|
| Call sites tocados (dos 268) | **zero** — o diff não contém nenhum |
| Assinatura de `logAction` | **inalterada** (`req: Request, params: LogActionParams`) |
| Linha nova com `throw` | **nenhuma** — segue sem propagar erro ao chamador |
| Webhook conectado (proibido por `D4`) | **não** — 4 ocorrências antes, 4 depois; o diff só acrescenta o **contador** `webhookFailures`, que é da própria Opção C |

O que explica as 161 linhas: `safeJsonStringify`, contadores de falha, o par
`logAction`/`performLogAction` (necessário para rastrear a promessa em voo) e a
maquinaria de dreno. **Tudo dentro do escopo autorizado.**

### O `:67` foi corrigido melhor do que o mandato pedia

O mandato dizia *"fechar o `try`"*. A implementação foi à **causa**:

```
- console.error(JSON.stringify(entry));
+ const serializedEntry = safeJsonStringify(entry);
+ console.error(serializedEntry);
```

Payload não-serializável deixa de poder lançar, em vez de ser capturado depois.
**Corrigiu a origem, não o sintoma.**

### A armadilha do volume foi fechada corretamente

`Dockerfile`: `mkdir -p /app/uploads` → `mkdir -p /app/uploads /app/logs`, **antes**
do `chown -R evok:evok /app`. É exatamente — e **somente** — o que o mandato
autorizou. `docker-compose.yml`: só a seção de volumes (`app_logs:/app/logs` +
declaração), com comentário explicando o motivo. **Nenhuma outra linha tocada**,
preservando o território do `CASE-005`.

O dreno tem **timeout** (`setTimeout` + `clearTimeout` em `index.ts`), como o
mandato exigia — *"dreno que trava o shutdown vira incidente pior"*.

### Execução

`case008-audit-log-runtime` + `case008-audit-log-static`: **6/6 passam**.
**Não verifiquei se reprovam o `AUDIT_COMMIT`** — ver §5.

---

## 3. `CASE-006` — `AUD-INTEG-03` + `T32-SUP-F03` · `REVISAO_APROVA_COM_RESSALVA`

### O desenho da correção é coerente

`manualStockAdjustmentService.ts` (novo) é consumido por **três** use cases —
`BatchScanUseCase`, `ScanItemUseCase`, `RegisterProductMovementUseCase`. Isso
**canaliza toda escrita de saldo por um caminho único**, que é a forma correta de
impedir saldo fantasma: não basta corrigir a rota apontada se as outras continuam
escrevendo direto. Extração de serviço aqui é **remediação, não refatoração
estética**.

### Ressalvas

**R4 — `mobile/package-lock.json` (+242) é escopo alheio.** `mobile/package.json`
**não mudou** — nenhuma dependência declarada foi alterada, então é
ressincronização de lockfile. Mas ela **introduz pacotes transitivos novos**
(`@babel/plugin-transform-react-jsx-self` e outros, `peer: true`) numa árvore que
não passou por análise de dependência. Cadeia de suprimentos tem trilha própria
(`vericore-dependency-security-auditor`). **Não pertence a uma remediação de
integridade de estoque.**

**R5 — o teste de concorrência foi alterado, e o motivo importa.**
`product-movement-concurrency.test.ts` ganhou um *seed* (`type: 'in', quantity: 5`,
`warehouse_code: 'INSUMOS'`) antes do cenário. Leitura: o teste **antigo fazia
`type: 'out'` sem estoque prévio** — ou seja, **dependia do próprio defeito** (saldo
fantasma) para rodar. Ajustá-lo é **correto e necessário**, não maquiagem.
**Mas** a VeriCore precisa confirmar que a **propriedade de concorrência** continua
sendo exercitada, e não só o novo caminho feliz.

**R6 — tipagem perdida.** `manualStockAdjustmentService` é importado via
`require(...)` com `: any` em `BatchScanUseCase.ts:12` e `ScanItemUseCase.ts:13`.
O serviço é agora o **ponto único de escrita de saldo**; `any` nele remove
verificação de tipo exatamente onde ela mais vale.

### Execução

`case006-stock-write-contract` + `case006-mobile-batch-contract`: **5/5 passam**.

---

## 4. Conformidade com regras invioláveis — os três casos

| | `006` | `007` | `008` |
|---|---|---|---|
| Nada escrito em `audit/`, `coretriad/`, `.claude/` | ✅ | ✅ | ✅ |
| `server/package.json` intocado | ✅ | ✅ | ✅ |
| `runtimeEnv.ts` intocado (território `CASE-005`) | ✅ | ✅ | ✅ |
| Nenhum segredo em código/teste/doc | ✅ | ✅ | ✅ |
| Testes novos sem import de `app.ts` | — | ✅ | ✅ |

---

## 5. O QUE NÃO FOI MEDIDO — limite desta revisão

**Nenhum dos testes novos foi executado contra o `AUDIT_COMMIT`.** Portanto **não
posso afirmar que reprovam o estado anterior** — o critério que este programa trata
como inegociável, e que já pegou um guard test *"verdadeiro por acaso"* no
`CASE-005`. Todos passam no HEAD; isso é metade da prova.

Também não medido: leitura integral dos 30 arquivos do `CASE-006`; se o teste de
integração `caso-de-estoque--scan-mobile-fura-quarentena` **perdeu cobertura** ao
encolher 213 linhas (minha contagem de casos falhou e **não a substituí por
suposição**); suíte unitária completa das três worktrees; comportamento de `R3`
sob exceção real.

**Nada disso vira aprovação por omissão.** É trabalho que a VeriCore precisa fazer,
e está nomeado abaixo.

---

## 6. Para a VeriCore — o que verificar no reteste

1. **Os testes novos reprovam o `AUDIT_COMMIT`?** Nos três casos. Prioridade máxima.
2. **`CASE-007` / R3:** exceção dentro de `applyAuthenticatedRateLimits` vira `401`
   em vez de `429`/`500`? Exercite o caminho.
3. **`CASE-007` / R1:** `TRUST_PROXY` continua `0` por padrão — o teto de 1600 vira
   global atrás de proxy. `D3` foi satisfeita?
4. **`CASE-006` / R5:** a propriedade de **concorrência** ainda é exercitada, ou só
   o novo caminho feliz?
5. **`CASE-006` / R4:** os pacotes transitivos novos do lockfile precisam de trilha
   de dependência própria.
6. **`CASE-006`:** cobertura perdida no teste de integração que encolheu.

Nenhum destes é bloqueio declarado por mim — **julgar suficiência de remediação é
autoridade da VeriCore** (Regra 4).
