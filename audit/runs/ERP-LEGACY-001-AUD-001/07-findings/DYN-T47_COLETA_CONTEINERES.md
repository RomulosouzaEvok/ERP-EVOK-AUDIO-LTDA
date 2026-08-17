# DYN-T47 — Coleta dinâmica dos 6 contêineres genéricos (`DYN-T47-01` + `DYN-T47-02`)

| Campo | Valor |
|---|---|
| Run | `ERP-LEGACY-001-AUD-001` |
| Origem | `T-47_TABELAS_SEM_MODEL.md` §2.4 e §9 |
| Autorização | `APR-2026-041` (lida integralmente antes da execução, inclusive a limitação metodológica) |
| Executor | `vericore-audit-verification-runner` |
| Banco alvo | **`erp_evok_audio_test`** — provado por `SELECT current_database()` (§2) |
| Produção | **NENHUMA conexão.** `APR-2026-016` íntegra |
| Natureza | Somente leitura, em transação `READ ONLY`, encerrada com `ROLLBACK` |
| Commit no momento da execução | `db415d33283b28b853821a2bf63fe999ff67aa15` (ver §7 sobre o movimento de HEAD) |
| Data/hora | 2026-08-17 |

> **Nota de persistência.** O executor não dispõe de ferramenta de escrita (por desenho do agente). Persistido pelo orquestrador **sem alteração de conteúdo**. O juízo é integralmente da trilha.

---

## 1. Comandos literais

Dois scripts read-only, gravados **fora do repositório** (scratchpad da sessão), executados a partir da raiz do repositório:

```
node ".../scratchpad/dyn-t47-collect.cjs"
node ".../scratchpad/dyn-t47-estrutura.cjs"
```

Credenciais carregadas de `server/.env.test` (`DB_NAME=erp_evok_audio_test`). Nenhum segredo é reproduzido aqui.

**Trava de alvo, antes de qualquer conexão** (recusa dupla — no env e no banco já conectado):

```js
if (!/(_test|_ci)$/i.test(DB)) {
  console.error(`RECUSADO: DB_NAME="${DB}" nao termina em _test/_ci. Nenhuma conexao aberta.`);
  process.exit(2);
}
...
await c.query('SET default_transaction_read_only = on');
await c.query('BEGIN READ ONLY');
...
if (!/(_test|_ci)$/i.test(p.db)) { console.error('ABORTADO: banco conectado nao e de teste.'); process.exit(2); }
```

SQL efetivamente emitido por alvo (`{tab}`/`{col}` substituídos pelos 7 pares):

```sql
SELECT current_database(), current_user, current_setting('transaction_read_only'), version();
SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name=$1;
SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2;
SELECT count(*)::bigint FROM public.{tab};
SELECT count(*)::bigint FROM public.{tab} WHERE {col} IS NOT NULL;
-- jsonb:  WHERE {col} IS NOT NULL AND {col}::text NOT IN ('null','{}','[]','""')
-- texto:  WHERE {col} IS NOT NULL AND btrim({col}) <> ''
SELECT DISTINCT k FROM public.{tab} t,
  LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(t.{col})='object' THEN t.{col} ELSE '{}'::jsonb END) k ORDER BY k;
SELECT count(*)::bigint FROM public.{tab} WHERE {col_texto} ILIKE $1;   -- 19x por alvo, um por termo
ROLLBACK;
```

Nenhum `SELECT` retorna valor de conteúdo: o único `SELECT` que retorna string é `jsonb_object_keys` (**chave**, nunca valor), e ele voltou vazio.

## 2. Prova de alvo (saída literal)

```
=== PROVA DE ALVO ===
current_database = erp_evok_audio_test
current_user     = evok_admin
transaction_read_only = on
server           = PostgreSQL 16.14 on x86_64-pc-linux-musl
```

O sufixo `_test` está confirmado **pelo próprio servidor**, não pelo arquivo de configuração. Registro ainda que uma tentativa minha de `grep` contendo o nome de produção (sem sufixo) foi **bloqueada pelo hook** `.claude/hooks/org-isolation.js` durante a preparação — o enforcement técnico de `APR-2026-016` está ativo e foi observado funcionando.

## 3. Saída literal — `DYN-T47-01` e `DYN-T47-02`

```
--- auditoria_eventos.antes (jsonb) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = jsonb
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo distintas (0) = (nenhuma)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- auditoria_eventos.depois (jsonb) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = jsonb
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo distintas (0) = (nenhuma)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- webhooks_eventos.payload (jsonb) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = jsonb
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo distintas (0) = (nenhuma)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- webhooks_eventos.resposta (jsonb) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = jsonb
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo distintas (0) = (nenhuma)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- hr_candidates.notes (text) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = text
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo: N/A (coluna textual)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- hr_performance_reviews.notes (text) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = text
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo: N/A (coluna textual)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

--- sst_estornos_entrega_epi.motivo (text) ---
1. tabela EXISTE? SIM | coluna EXISTE? SIM | data_type = text
2. linhas (total) = 0
3. nao-nulas = 0 | nao-vazias = 0
4. chaves de topo: N/A (coluna textual)
5. termos que casaram = NENHUM (0 linhas casam qualquer termo dos 2 lexicos)

=== FIM — nenhuma escrita executada (transacao READ ONLY, encerrada com ROLLBACK) ===
```

Léxicos aplicados por `ILIKE '%termo%'`, 19 termos × 7 alvos = **133 contagens**, todas 0.
Clínico (11): `cid`, `exame`, `laudo`, `atestado`, `aptid`, `lesao`, `medic`, `saude`, `aso`, `acidente`, `afast`.
Biométrico (8): `biometri`, `foto`, `photo`, `facial`, `digital`, `assinat`, `signat`, `evidenc`.

## 4. Saída literal — coleta estrutural complementar

```
=== A. Coluna: tipo, nulidade, default ===
auditoria_eventos.antes | jsonb | nullable=YES | default=(sem default)
auditoria_eventos.depois | jsonb | nullable=YES | default=(sem default)
hr_candidates.notes | text | nullable=YES | default=(sem default)
hr_performance_reviews.notes | text | nullable=YES | default=(sem default)
sst_estornos_entrega_epi.motivo | text | nullable=NO | default=(sem default)
webhooks_eventos.payload | jsonb | nullable=NO | default=(sem default)
webhooks_eventos.resposta | jsonb | nullable=YES | default=(sem default)

=== B. CHECK constraints nas 5 tabelas ===
(nenhum CHECK)

=== C. Atividade DML acumulada nesta base de teste (pg_stat_user_tables) ===
auditoria_eventos | ins=0 upd=0 del=0 live=0 dead=0
hr_candidates | ins=0 upd=0 del=0 live=0 dead=0
hr_performance_reviews | ins=0 upd=0 del=0 live=0 dead=0
sst_estornos_entrega_epi | ins=0 upd=0 del=0 live=0 dead=0
webhooks_eventos | ins=0 upd=0 del=0 live=0 dead=0

=== D. COMMENT declarado nas 5 tabelas ===
auditoria_eventos | DEPRECATED (2026-08-06): tabela orfa do schema-fantasma em portugues criado pelo 01_schema.sql baseline. 0 linhas, 0 models Sequelize, 0 uso em codigo vivo (confirmado por auditoria). NAO usar em codigo novo. Equivalente ativo em ingles com PKs INTEGER. [...]
hr_candidates | (sem comment)
hr_performance_reviews | (sem comment)
sst_estornos_entrega_epi | (sem comment)
webhooks_eventos | DEPRECATED (2026-08-06): [...] mesmo texto [...]
```

## 5. Resultado por coluna — fato

| # | Coluna | 1. existe | 2. total | 3. não-nula / não-vazia | 4. chaves de topo | 5. léxico |
|---|---|---|---|---|---|---|
| 1 | `auditoria_eventos.antes` | SIM (`jsonb`) | 0 | 0 / 0 | nenhuma | 0 |
| 2 | `auditoria_eventos.depois` | SIM (`jsonb`) | 0 | 0 / 0 | nenhuma | 0 |
| 3 | `webhooks_eventos.payload` | SIM (`jsonb`, `NOT NULL`) | 0 | 0 / 0 | nenhuma | 0 |
| 4 | `webhooks_eventos.resposta` | SIM (`jsonb`) | 0 | 0 / 0 | nenhuma | 0 |
| 5 | `hr_candidates.notes` | SIM (`text`) | 0 | 0 / 0 | N/A | 0 |
| 6 | `hr_performance_reviews.notes` | SIM (`text`) | 0 | 0 / 0 | N/A | 0 |
| 7 | `sst_estornos_entrega_epi.motivo` | SIM (`text`, `NOT NULL`) | 0 | 0 / 0 | N/A | 0 |

**Nenhum valor de conteúdo foi lido, transportado ou copiado** — a regra de privacidade de `APR-2026-041` foi cumprida por construção: só houve `count(*)` e `jsonb_object_keys`, e este último voltou vazio.

## 6. Interpretação — hipótese, separada do fato

*Fato*: as 7 colunas existem com o tipo declarado em `T-47` §2.4; as 5 tabelas estão vazias no banco de teste; nunca receberam um único `INSERT` na vida desta base (`n_tup_ins=0`).

*Interpretação, minha, não veredito*:

1. **A forma está confirmada e é permissiva.** Não há **nenhum** `CHECK` nas 5 tabelas e nenhum contrato de formato nas 4 colunas `jsonb`. O schema, portanto, **não impede** que qualquer uma delas receba dado clínico ou biométrico — a preocupação de §2.4 é estruturalmente válida, e isso a coleta prova.
2. **`n_tup_ins=0` reforça a tese de "capacidade sem gravador"** de `T-47` §2.4/§4.1 — nesta base, nem a aplicação nem qualquer script jamais escreveu nessas tabelas. É evidência sobre o banco de teste, **não** sobre produção.
3. **A afirmação de 2026-08-06 dos `COMMENT`s ("0 linhas") continua não verificada onde importa.** Ela foi confirmada apenas em `erp_evok_audio_test`. Em produção permanece uma **declaração documental de 11 dias atrás**, exatamente como `T-47` §9 registrou.
4. Os falsos positivos previsíveis dos termos curtos (`cid` em "de**cid**ido", `aso` em "c**aso**", "r**azão** social") e a ausência de tratamento de acento (`lesao`/`lesão`, `saude`/`saúde`) **não afetaram este resultado**, porque o denominador é 0 em todos os alvos. Ficam registrados como cuidado obrigatório caso a mesma bateria seja algum dia autorizada contra uma base povoada.

## 7. Nota de estado do repositório

Antes da execução o working tree tinha `M coretriad/governance/APPROVALS.md` (não produzido pelo executor — ele não possui `Write`/`Edit`). Ao final, o tree estava **limpo** e HEAD havia avançado de `fdf7de75…` para `db415d33…` — um commit de outro agente, concorrente à coleta. **A execução não criou, alterou nem removeu nenhum arquivo do repositório**; os dois scripts vivem no scratchpad da sessão, fora do repositório. Nenhuma migration, seed ou limpeza foi executada.

## 8. Limitação metodológica — declarada, com as palavras do executor

O banco `erp_evok_audio_test` **não contém os dados de produção**. Ele é construído a partir do baseline; é uma base vazia, e a estatística `n_tup_ins=0` mostra que é literalmente virgem quanto a estas 5 tabelas.

Logo: **"zero linhas no teste" não é, nem de longe, "zero linhas em produção".** É "o banco de teste não tem o dado" — que é uma frase muito mais fraca. O resultado responde **com força** à pergunta de **estrutura e forma** (as colunas existem? de que tipo? o schema restringe o conteúdo? há gravador?) e responde **de forma essencialmente vazia** à pergunta de **conteúdo real**, que é justamente a pergunta que `T-47` §2.4 formulou e a única que fecharia a condicionalidade.

Sublinha-se, como `APR-2026-041` exige e por honestidade de método: essa limitação foi **registrada antes** da coleta, na própria aprovação. Não é justificativa construída depois para acomodar o desfecho.

## 9. Veredito sobre a condicionalidade de `RES-T47-02`

**NÃO FECHA. Fecha parcialmente apenas na dimensão estrutural, e a dimensão estrutural não era a que estava em aberto.**

- **O que fecha:** que as 7 colunas existem com o tipo esperado, sem restrição de conteúdo, e que no ambiente de teste elas nunca receberam escrita. Isso corrobora — não decide — a leitura de `T-47` §2.4 de que são contêineres sem gravador.
- **O que não fecha, e é o essencial:** a pergunta "estes contêineres **contêm**, em produção, dado de categoria especial?" segue sem resposta. `DYN-T47-01` e `DYN-T47-02` foram formulados esperando que "zero linhas também responde"; **essa expectativa não se realiza**, porque o zero obtido é o zero do banco errado para a pergunta.
- **Consequência formal, conforme `APR-2026-041`:** a condicionalidade é **rebaixada** de *"não decidível estaticamente"* para *"não decidível sem acesso a produção"*. São coisas diferentes. A segunda depende de uma inspeção de dado real que **não está autorizada** — e que, pela regra permanente de segurança de dado real (`APR-2026-016`), exigiria aprovação humana explícita, caso a caso, jamais por extensão de `APR-2026-041`.
- Portanto os censos de `T-47` §3.1 e §3.2 permanecem fechados **nos termos em que foram declarados**, com a condicionalidade de §2.4 **aberta e agora mais precisamente qualificada**. A decisão sobre incluir ou não os 6 contêineres continua sendo do dono (Regra 6), e continua sem a evidência que a resolveria.

Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED`. Nenhum finding próprio emitido, nenhuma severidade alterada. Nenhuma trilha existente foi tocada (Regra 15).
