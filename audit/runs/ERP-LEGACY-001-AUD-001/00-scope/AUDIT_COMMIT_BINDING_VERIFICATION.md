# VERIFICAÇÃO DE AMARRAÇÃO AO `AUDIT_COMMIT`

**Run:** `ERP-LEGACY-001-AUD-001`
**Data:** 2026-08-14
**Executado por:** orquestrador (CoreTriad Director), a pedido expresso de três
trilhas que declararam não poder fechar o resíduo por falta de shell.

## Por que este documento existe

Os tipos de agente auditor da VeriCore são **read-only por desenho** e a maioria
não tem shell. Três trilhas registraram, corretamente, que **não podiam provar**
que a árvore que leram corresponde ao `AUDIT_COMMIT`, e se recusaram a afirmar
o que não podiam demonstrar:

| Resíduo | Trilha | Texto da declaração |
|---|---|---|
| `RES-T17-02` | T-17 contrato de API | "sem shell, a árvore lida não foi amarrada criptograficamente ao `AUDIT_COMMIT`" — declarado como **bloqueante da formalização dos findings HIGH** |
| `RES-T18-01` | T-18 appsec | "`AUDIT_COMMIT` não verificado… se o working tree divergir, este relatório precisa de delta audit (Regra 14)" |
| `RES-T13-01` | T-13 dados e schema | "`IN-08` não pôde ser satisfeito em nenhum ponto" |

A recusa das três em afirmar sem prova é **conduta correta** e está registrada
como tal. O resíduo é de ferramental do orquestrador, não de rigor da trilha.

## Verificação executada

```
$ git rev-parse HEAD
68cdf42fa9dab238347e6ad726566058181477a1

AUDIT_COMMIT declarado em AUDIT_SCOPE.md
c1311a6f76b512fef893f7e60d934179cae3409f
```

HEAD **não** é o `AUDIT_COMMIT` — o que era esperado e é irrelevante por si só.
A pergunta que importa é outra: **o objeto auditado mudou entre os dois?**

```
$ git diff --name-only c1311a6f76b512fef893f7e60d934179cae3409f HEAD -- \
    server client mobile tv docs/arquitetura docs/business docs/projeto \
    docs/tributario docker-compose.yml docker-compose.prod.yml .github
(vazio — 0 arquivos)
```

**Zero arquivos do objeto auditado foram alterados entre o `AUDIT_COMMIT` e o
HEAD.** A árvore de trabalho que as trilhas leram é, para todo o objeto
auditado, **byte a byte idêntica** ao `AUDIT_COMMIT`.

Universo completo das alterações no período, por diretório:

| Diretório | Arquivos | Natureza |
|---|---|---|
| `audit/` | 27 | Evidência desta própria auditoria |
| `coretriad/` | 4 | Control plane (estado, log, aprovações) |
| `docs/coretriad/` | 2 | Artefatos de governança — **excluídos do escopo por E4** |
| `remediation/` | 2 | Triagens SanaCore dos CASE-001 e CASE-002 |

Nenhum é objeto auditado. Nenhum é código, schema, teste, contrato de API ou
documentação de produto.

## Vereditos

1. **`RES-T17-02` — FECHADO.** A amarração existe e é provada acima. A condição
   que T-17 impôs para a formalização de `T17-F01`, `T17-F02` e `T17-F03`
   (HIGH) está **satisfeita**. Os três seguem ao `vericore-finding-validator`
   sem essa ressalva.
2. **`RES-T18-01` — FECHADO.** Nenhum delta audit é necessário (Regra 14): não
   há delta no objeto auditado.
3. **`RES-T13-01` — PARCIALMENTE FECHADO.** A amarração está provada. O que
   `IN-08` exige adicionalmente — prova por `git log`/`git show` para
   **atribuição de origem** de trecho de código — continua não executado, porque
   nenhuma trilha fez afirmação de proveniência temporal. **`IN-08` foi cumprido
   por abstenção**, que é a forma que a regra exige: ela proíbe afirmar sem
   prova, não obriga a afirmar.

## Achado colateral, que confirma correção já registrada

`docs/coretriad/projects/ERP-LEGACY-001/BR_CATALOG.md` **consta entre os
arquivos alterados após o `AUDIT_COMMIT`**. É a prova documental de que
`BR-FIN-003` **não pertence ao objeto auditado** (Regra 14), confirmando a
correção de contagem 165 → **164** e a ressalva que T-15 levantou sobre o
estatuto de `T14-F03`. O arquivo está, de todo modo, sob a exclusão **E4**.

## Limite deste documento

Isto é **verificação de escopo executada pelo orquestrador**, não auditoria.
Não valida, confirma ou fecha nenhum finding. Não emite `AUDIT_PASSED`,
`FINDINGS_CONFIRMED` nem `RETEST_PASSED` — todos fora da autoridade de quem
orquestra (Regra 5). Serve exclusivamente para remover uma ressalva de método
que impedia trilhas read-only de formalizar findings que elas próprias
produziram.
