# Despacho de segunda opinião Codex — `ERP-LEGACY-001-CASE-005`

```
CASE_ID:      ERP-LEGACY-001-CASE-005
FINDING_ID:   AUD-AUTHN-01
BASE:         CORETRIAD_MASTER_SPEC.md Parte VI §35 — "Codex como segunda engine"
AUTORIZAÇÃO:  APR-2026-047 D3/D4
AGENTE:       .codex/agents/coretriad-rootcause-review-sanacore.toml
ESTADO:       NÃO EXECUTADO — Codex CLI ausente do PATH nesta máquina
AUTOR:        sessão orquestradora (Claude Code), em nome do processo
```

> **Este documento foi escrito ANTES do retorno da triagem da SanaCore.** Isso é
> deliberado e é o ponto todo: o §35 exige que a segunda engine **não receba a
> conclusão do primeiro modelo** quando a independência importa. Escrever o
> despacho depois da triagem contaminaria a independência que ele existe para
> produzir.

---

## 1. Por que não executou

O Codex CLI **não está no PATH** desta máquina (`codex` não resolve). A perna
Codex do §35 **não rodou** — não foi simulada, não foi substituída por outro
agente Claude, e não deve ser lida como cumprida.

**Isto não bloqueia a remediação.** A SanaCore implementa normalmente via Claude
Code. O que fica pendente é o contraditório independente **antes do reteste da
VeriCore**.

## 2. Ordem de execução — e a janela que se fecha

| Momento | Efeito na independência |
|---|---|
| **Antes de a triagem retornar** | ideal — parecer cego, independência plena |
| **Depois da triagem, sem mostrar o TRIAGE.md** | aceitável — o agente forma hipótese lendo o código primeiro |
| **Depois, com o TRIAGE.md junto** | degradado — vira revisão, não segunda opinião; **deve ser declarado no parecer** |

A janela ideal se fecha quando a triagem retorna. Se o Codex for instalado
depois disso, use a rota do meio: **despache sem anexar o `TRIAGE.md`**, e só
compare depois que o parecer estiver fechado.

## 3. O despacho, literal

Invoque com o **sandbox de leitura** do Codex ativo. O arquivo `.toml` sozinho
não impõe read-only — e do lado Codex **não existe o hook `org-isolation.js`**
(`APR-2026-047` D2). A restrição de escrita é reforço de prompt, não mecanismo.

Prompt a passar ao agente `coretriad-rootcause-review-sanacore`:

```text
Segunda opinião independente de causa-raiz — CoreTriad, papel SanaCore (§35).

CASO:    ERP-LEGACY-001-CASE-005
FINDING: AUD-AUTHN-01 — run ERP-LEGACY-001-AUD-001
COMMIT:  c1311a6f76b512fef893f7e60d934179cae3409f
POSIÇÃO: estrato 1, posição 2 — CRITICAL, produção real

Leia primeiro, e só isso:
  audit/runs/ERP-LEGACY-001-AUD-001/07-findings/AUD-AUTHN-01.md
  audit/runs/ERP-LEGACY-001-AUD-001/07-findings/T-39_FILA_REMEDIACAO_EXPOSICAO.md  (§2.1 e §3)

NÃO leia remediation/cases/ERP-LEGACY-001-CASE-005/TRIAGE.md antes de
formar a sua própria hipótese de causa-raiz. Se você já o leu, diga isso
na primeira linha do parecer.

Forme sua hipótese lendo o código do repositório. Depois responda:

1. Qual é a causa-raiz de AUD-AUTHN-01, com arquivo e linha?

2. A fila registra a hipótese de que a causa-raiz é T18-F02 — NODE_ENV
   com default 'development' em compose/runtimeEnv. Ela se sustenta no
   código? É causa ÚNICA ou há segunda causa somada? Corrigir só ela
   deixa o defeito reproduzível por outro caminho? Se sim, nomeie o
   caminho com arquivo e linha.

3. Blast radius: outros consumidores do mesmo middleware de autenticação;
   segundo ponto onde a decisão de autenticação é tomada; o mesmo padrão
   em outro compose ou ambiente; caminho de UI que produza o estado sem
   passar pela API analisada.

4. T-22 recomenda T22-F02 (validação automatizada dos composes) como
   pré-requisito do fechamento definitivo. Concorda? Mesmo lote ou item
   separado?

5. Como um teste de regressão REPROVARIA o estado anterior? Se você não
   consegue afirmar que reprova, diga que não consegue.

Restrições absolutas:
- SOMENTE LEITURA. Nenhuma escrita, nenhum patch, nenhum commit.
- NENHUMA conexão de banco. erp_evok_audio (sem sufixo) é PRODUÇÃO REAL
  (APR-2026-016) — proibido inclusive "só para contar linhas".
- Nunca copie valor de segredo. Só nome de variável ou de role.
- Você NÃO fecha finding, NÃO declara RETEST_PASSED nem
  REMEDIATION_COMPLETE (Regras 2, 3, 4).
- Confirme literal LENDO O ARQUIVO, nunca por saída de grep.
- Declare o que PROVOU e o que ASSUMIU, separadamente.

Termine com exatamente um veredito de parecer:
SEGUNDA_OPINIAO_CONCORDA | SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA |
SEGUNDA_OPINIAO_DIVERGE | INCONCLUSIVO
```

## 4. O que o parecer NÃO faz

Nenhum dos quatro vereditos libera o reteste, aprova o patch ou vincula a
SanaCore. O parecer é **insumo** do responsável humano e da VeriCore.

**Divergência entre engines não se resolve por votação** (Regra 20). Se o Codex
divergir da SanaCore, a divergência é **registrada com evidência** e escalada —
"os dois modelos concordaram" nunca é fundamento, e "dois contra um" muito menos.

## 5. Persistência

O Codex devolve **texto**. Quem persiste é a sessão Claude Code, sob o hook
`org-isolation.js` — o parecer entra como
`CODEX_SECOND_OPINION.md` neste mesmo diretório, e **não** substitui nem edita
o `TRIAGE.md` da SanaCore (Regra 15).
