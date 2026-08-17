# Segunda opinião Codex + comparação formal — `ERP-LEGACY-001-CASE-005`

```
CASE_ID:      ERP-LEGACY-001-CASE-005
FINDING_ID:   AUD-AUTHN-01
BASE:         CORETRIAD_MASTER_SPEC.md Parte VI §35
VEREDITO:     SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA
PERSISTIDO POR: sessão Claude Code, sob o hook org-isolation.js
               (o Codex devolve texto; não escreve — APR-2026-047 D3)
INDEPENDÊNCIA: preservada — o parecer foi formado sem acesso ao TRIAGE.md.
               A abertura para comparação foi autorizada pelo dono APÓS o
               fechamento do parecer.
```

> **Regra 15:** este documento **não altera** o `TRIAGE.md` da SanaCore. Ele é
> artefato próprio, do contraditório.
> **Regra 20:** onde há divergência, ela é **registrada**, não resolvida por
> votação entre engines.

---

## 1. O parecer recebido

`SEGUNDA_OPINIAO_CONCORDA_COM_RESSALVA`. Confirma a causa-raiz (`NODE_ENV`
default `'development'`) e acrescenta a ressalva de que **não é ponto único**:
é a combinação de `server/src/config/runtimeEnv.ts` (schema) com
`docker-compose.yml` (que reintroduz o default). Corrigir só um dos dois deixa
o problema voltar pelo outro caminho.

Teste de regressão sugerido: boot test que remove `NODE_ENV` do ambiente e
injeta `JWT_SECRET` placeholder — hoje passa; deveria falhar ao subir.

---

## 2. Comparação formal — a triagem cobria os dois pontos?

**Sim, e vai além.** Nenhuma ampliação de escopo de causa-raiz é necessária.

| Ponto do Codex | Correspondente na triagem | Situação |
|---|---|---|
| `runtimeEnv.ts` (schema) | **CR-1** — `:34` (default `'development'`) **+ `:72-75`** (`if (env.NODE_ENV !== 'production') return;`) | **Coberto, com mais precisão.** A triagem nomeia o *mecanismo*: não é só o default, é o early-return que transforma nove guardas em código morto |
| `docker-compose.yml` reintroduz o default | **CR-3** — `:43` | **Coberto, com leitura mais forte** — ver §3 |
| — | **CR-2** — `docker-compose.yml:54`, default versionado de chave de assinatura | **Não visto pelo Codex** |
| — | **CR-4** — `ENV_PLACEHOLDER_PATTERN` é denylist ancarada de dois prefixos | **Não visto pelo Codex**, e é o que torna o teste sugerido insuficiente sozinho (§4) |

**Conclusão:** a triagem é superconjunto do parecer no eixo de causa-raiz. Segue
para implementação **com os dois pontos no mesmo patch**, conforme determinado.

---

## 3. Divergência de leitura sobre o compose — registrada, e ela muda o patch

O Codex descreve `docker-compose.yml` como *"reintroduz o default"*. A triagem
lê diferente, e a diferença **não é semântica**:

`server/Dockerfile:21` declara `ENV NODE_ENV=production`. Logo `docker-compose.yml:43`
**não reintroduz um default omisso — ele rebaixa ativamente** o modo que a
própria imagem já declarava.

**Por que isso importa para quem implementa:** sob a leitura do Codex, a
correção óbvia é *"remover o default do compose"*. Sob a leitura da triagem,
**remover a linha `:43` não é neutro** — jogaria o ambiente de desenvolvimento
em `production` e derrubaria o boot em `DB_SSL` e `CORS_ORIGIN`.

**Prevalece a leitura da triagem**, e não por ser da SanaCore: por estar
ancorada em `Dockerfile:21`, que o parecer do Codex não cita. Evidência vence
(Regra 20).

**Premissa que sustenta CR-3 e permanece não provada — `A3`:** a precedência do
`environment:` do serviço sobre o `ENV` da imagem é semântica de plataforma, não
evidência do repositório. Docker está indisponível nesta máquina, então
`docker compose config` não foi executado. **Isto continua aberto**, e o parecer
do Codex não o fecha — ele não tocou no ponto.

---

## 4-ERRATA (2026-08-17, posterior à implementação) — a §4 abaixo está ERRADA

**O que a §4 afirma:** que o literal de `docker-compose.yml:54` escapa de
`ENV_PLACEHOLDER_PATTERN`, e que por isso o teste do Codex, sozinho, seria
falso-verde.

**É falso.** Medido depois, sem imprimir valor:

```
linha 43: temDefault=true  len=11  casaPlaceholder=false
linha 54: temDefault=true  len=45  casaPlaceholder=true   <-- casa
linha 57: temDefault=true  len=25  casaPlaceholder=true
padrão em runtimeEnv.ts:12 = /^(CHANGE_ME|dev-only-change-me)/i
```

O literal de `:54` **casa** com o padrão, pelo prefixo `dev-only-change-me`.

**Como o erro entrou:** conflei duas coisas distintas da triagem. `CR-4` diz que a
denylist é frágil e que **`.env.docker.example:16`** escapa dela; `CR-2` diz que
**`:54`** passa na guarda de *comprimento* sempre ativa (`:250`). Tratei as duas
como a mesma afirmação e concluí que `:54` escapava da denylist. **Não li a linha
54 — usei a síntese.** É exatamente a falha que a regra de método nº 1 deste run
existe para impedir: *confirmar literal lendo o arquivo, nunca por saída de
terceiro.* O `TRIAGE.md` §2.1/CR-2 estava certo; a comparação o contradisse e o
briefing de implementação herdou o erro.

**O que muda e o que não muda:**

- **Não muda o entregável.** `T1` e `T-CODEX` continuam obrigatórios e **ambos
  reprovam o `AUDIT_COMMIT`**, que é o critério inegociável. Confirmado na
  execução: 8 testes falham antes do patch, 19 passam depois.
- **Muda a justificativa.** Os dois exercitam a **mesma** guarda
  (`ENV_PLACEHOLDER_PATTERN`), não guardas distintas. **O `T-CODEX` nunca foi
  falso-verde** — a ressalva que levantei contra ele não procedia.
- **`CR-4` continua válida** como restrição de desenho (denylist ancarada é
  frágil), mas **não era** o buraco por onde este valor passava. O buraco era só
  o early-return de `:73-75`.

A §4 fica preservada abaixo, com o erro à vista (Regra 15 — evidência não se
apaga). Quem a citar deve citar esta errata junto.

---

## 4. O teste sugerido pelo Codex — entra, mas sozinho é falso-verde
> **⚠ SUPERADA PELA §4-ERRATA ACIMA.** A premissa desta seção é falsa.

Determinado pelo dono: incluir. **Incluído.** Com a ressalva abaixo, que é o
achado principal desta comparação.

Confirmado por leitura de arquivo:

- `runtimeEnv.ts:12` — `ENV_PLACEHOLDER_PATTERN = /^(CHANGE_ME|dev-only-change-me)/i`
- `runtimeEnv.ts:103` — `!env.JWT_SECRET || env.JWT_SECRET.length < 32 || ENV_PLACEHOLDER_PATTERN.test(env.JWT_SECRET)`

O teste do Codex usa **placeholder**. Um placeholder casa com a denylist e é
rejeitado assim que as guardas voltam a rodar. Mas o valor real de
`docker-compose.yml:54` — o que efetivamente sobe — **tem 45 caracteres e não
casa com nenhum dos dois prefixos ancorados**. Ele passa pela única guarda que
sempre esteve viva (`length < 32`) e passaria pela guarda de placeholder também.

**Consequência:** o teste do Codex prova *"as guardas voltaram a rodar"*. Ele
**não** prova *"o valor que o repositório realmente entrega é rejeitado"*. Ficar
só com ele produziria verde com o defeito de pé.

Por isso os **dois** testes entram, e cobrem guardas distintas:

| Teste | Injeta | Guarda exercitada | Estado no `AUDIT_COMMIT` |
|---|---|---|---|
| **T1** (triagem) | `delete NODE_ENV` + o literal real de `:54` | comprimento + presença — o caminho que escapa da denylist | **FALHA** (não lança) |
| **T-CODEX** | `delete NODE_ENV` + `JWT_SECRET` placeholder | `ENV_PLACEHOLDER_PATTERN` (`:103`) | **FALHA** (não lança) |

Os dois reprovam o estado anterior, que é o critério. Nenhum substitui o outro.

**Nota de forma para quem implementar `T-CODEX`:** o placeholder precisa casar
com `/^(CHANGE_ME|dev-only-change-me)/i` — **ancorado no início**. Um placeholder
que não case tornaria o teste verde por motivo errado. `runtime-env.test.ts:46`
já usa um valor válido para esse fim e serve de referência.

**Por que a suíte atual não pega nada disso:** os cinco testes de guarda de
`runtime-env.test.ts` setam `NODE_ENV = 'production'` **antes** — linhas 14, 29,
43, 57 e 71. O ramo default de `:34` **nunca é exercitado**. Verificado por
leitura direta do arquivo.

---

## 5. `T22-F02` — fora deste patch, por decisão do dono

> *"Trate `T22-F02` (garantir que o padrão não reapareça por outro boot path)
> como item de acompanhamento separado, não como parte deste patch."*

Registrado. A triagem recomendava o mesmo lote; **prevalece a decisão do dono**
(Regra 18).

**A ressalva da triagem acompanha o item e continua vinculante quando ele for
executado:** `T22-F02` exige job de CI **novo, próprio e bloqueante** — jamais
pendurado no `governance-detective-controls`, que carrega **`CD-CI-01`**
(`APR-2026-026` item 3, proíbe remover `continue-on-error`).

**Consequência declarada, não escondida:** sem `T22-F02`, este patch corrige o
estado atual mas **não impede a reintrodução** do padrão por outro boot path.
Isso é aceito por decisão, não por omissão.

---

## 6. Valor entregue pelo contraditório — registrado com honestidade

O parecer **não alterou o escopo de causa-raiz**: a triagem já era superconjunto.
Registrar isso importa tanto quanto registrar um achado — um contraditório que
sempre "descobre algo" está performando, não verificando.

O que ele **de fato** entregou:

1. **Confirmação independente** de que a causa não é ponto único — a conclusão
   mais importante da triagem, e a que divergia da hipótese que a fila
   registrava (`T18-F02` como causa única). Duas engines chegaram nela por
   caminhos separados.
2. **Um teste que a triagem não propôs**, cobrindo uma guarda distinta.
3. **Uma leitura mais fraca do compose** que, ao ser comparada, obrigou a
   explicitar `Dockerfile:21` como âncora — e a explicitar que remover `:43` não
   é neutro. O erro do contraditório produziu precisão no patch.

**Nenhum destes fecha finding, aprova patch ou libera reteste** (Regras 3 e 4).
