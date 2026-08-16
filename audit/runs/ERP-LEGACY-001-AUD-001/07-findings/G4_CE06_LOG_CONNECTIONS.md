# `CE-06` — Retenção de evidência independente (`log_connections`)

```
RUN:          ERP-LEGACY-001-AUD-001
CRITÉRIO:     CE-06 da classe RC-PROC-01
AUTORIZAÇÃO:  decisão do dono, 2026-08-16 (APR-2026-027)
EXECUTOR:     orquestrador (o agente `docker` está em _deprecated/ e foi desarmado
              de Bash/Write por decisão do dono na mesma sessão — ver §5)
DATA:         2026-08-16
```

## 1. A decisão que originou este trabalho

O dono determinou, em texto direto:

> *"Decisão CE-06: implementar `log_connections` no PostgreSQL, não apenas aceitar por
> autorreporte. No banco de teste, ative imediatamente. No banco de produção, prepare o
> comando/procedimento e registre como pendência agendada para uma janela de manutenção — não
> execute contra produção sem minha confirmação explícita do dia/horário."*

Isso **recusou** a saída alternativa que o próprio critério oferecia ("aceitação registrada de que
o cumprimento é verificável apenas por declaração do agente") e escolheu o mecanismo — decisão
coerente com a tese da classe, que existe porque contenção por disciplina não é controle.

## 2. RESULTADO: a separação pedida é tecnicamente impossível nesta topologia

**Nada foi aplicado, nem no teste nem em produção.** A instrução "ative no teste, não toque em
produção" não pode ser cumprida como escrita, e a razão é do PostgreSQL, não de escolha de
implementação.

### 2.1 Evidência primária — contexto dos parâmetros

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -t -c \
  "SELECT name, setting, context, source FROM pg_settings
   WHERE name IN ('log_connections','log_disconnections','log_line_prefix') ORDER BY name;"

 log_connections    | off      | superuser-backend | default
 log_disconnections | off      | superuser-backend | default
 log_line_prefix    | %m [%p]  | sighup            | default
```

Versão: **PostgreSQL 16.14** (`SHOW server_version`), imagem `postgres:16-alpine`
(`docker-compose.yml`).

### 2.2 A tentativa de escopo por banco — RECUSADA pelo servidor

```
$ docker exec evok-postgres psql -U evok_admin -d postgres -c \
  "ALTER DATABASE erp_evok_audio_test SET log_connections = on;"

ERROR:  parameter "log_connections" cannot be set after connection start
```

O contexto `superuser-backend` permite fixar o valor **na abertura da conexão** — via
`postgresql.conf`, linha de comando do servidor, ou opções de conexão — mas **não** por
`ALTER DATABASE`, porque essa configuração seria aplicada depois do início do backend.

### 2.3 Estado do cluster após a tentativa — inalterado

```
 log_connections    | off     | default
 log_disconnections | off     | default
```

`pg_db_role_setting` está **vazio** — nenhuma configuração por banco existe no cluster. A tentativa
falhou de forma limpa, sem efeito colateral.

### 2.4 A consequência

O container `evok-postgres` hospeda **`erp_evok_audio` (PRODUÇÃO REAL, `APR-2026-016`) e
`erp_evok_audio_test` na mesma instância**. Como o parâmetro só admite escopo de cluster, **ligar o
log no banco de teste liga também em produção**. Isso viola diretamente a instrução do dono de não
tocar produção sem janela confirmada.

Pela regra que o próprio encargo fixou — *"se NÃO permitir escopo por banco, NÃO APLIQUE NADA"* —
nada foi aplicado.

## 3. Alternativas avaliadas e por que não servem

| Alternativa | Estado | Veredito |
|---|---|---|
| `ALTER DATABASE ... SET` | **testado, recusado pelo servidor** (§2.2) | impossível |
| `PGOPTIONS="-c log_connections=on"` na abertura | **testado, FUNCIONA** (`SHOW log_connections` → `on`) | **rejeitado como controle** — é opt-in do cliente: um agente que não queira ser registrado simplesmente omite a opção. Tem exatamente o defeito do autorreporte que o `CE-06` existe para eliminar |
| `pgaudit` | **testado, indisponível** — `pg_available_extensions` não retorna nenhuma extensão de auditoria na imagem `postgres:16-alpine` | exigiria trocar a imagem |
| `ALTER SYSTEM` + `pg_reload_conf()` | não executado | **é o mecanismo correto, e atinge os dois bancos** — vai para a janela |
| Instância PostgreSQL separada para teste | não executado | correção estrutural do problema de fundo (`.env.example` aponta dev para o banco real); fora do escopo autorizado |

## 4. Procedimento para a janela de manutenção — preparado, NÃO executado, NÃO agendado

**Escopo revisado:** a janela cobre a ativação **inteira**, não apenas produção — porque o teste não
pode ser ligado separadamente.

```sql
-- Como evok_admin, conectado a `postgres`:
ALTER SYSTEM SET log_connections    = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_line_prefix    = '%m [%p] user=%u db=%d host=%h ';
SELECT pg_reload_conf();
```

- **Reload, não restart.** `log_connections`/`log_disconnections` são `superuser-backend` e passam a
  valer para **conexões novas**; `log_line_prefix` é `sighup` e o reload basta. **Sem downtime.**
  Conexões já abertas (o pool do `evok-api`) não são afetadas retroativamente.
- **`log_line_prefix` é necessário.** O default do cluster é `%m [%p]` — só timestamp e PID. Sem
  usuário, banco e host, o log registra que houve conexão mas **não permite atribuí-la**, que é
  precisamente o que o `CE-06` exige.
- **Onde grava:** driver `json-file` do Docker, já configurado em `docker-compose.yml`
  (`max-size: 10m`, `max-file: 5` = até 50 MB rotacionados). Acessível por `docker logs
  evok-postgres`.
- **Volume esperado:** 1-2 linhas por conexão/desconexão. Com pool persistente do Sequelize, o
  regime estável é baixo; os picos são no boot do `evok-api` e em reconexão por falha de rede. Não
  é comparável a `log_statement=all`.

**Prova de efeito, a executar logo após o reload:**

```
docker exec -e PGPASSWORD=<AUDIT_DB_PASSWORD> evok-postgres \
  psql -U evok_audit -h 127.0.0.1 -d erp_evok_audio_test -c "SELECT 1;"
docker logs evok-postgres --since 2m | grep "connection authorized"
```

**Plano de reversão** — simétrico, imediato, sem downtime:

```sql
ALTER SYSTEM SET log_connections = off;
ALTER SYSTEM SET log_disconnections = off;
SELECT pg_reload_conf();
```

## 5. Proposta de retenção — decisão do dono, não do agente

O critério `CE-06` **não fixa prazo nem local**; isso é decisão humana. Proposta:

O rotation atual do Docker (50 MB / 5 arquivos) serve para disponibilidade operacional de curto
prazo, **mas não como evidência de auditoria**: roda por sobrescrita, sem cópia externa, e o próprio
container pode ser recriado. Proposta: job diário no host (fora do container) copiando
`docker logs evok-postgres --since 24h` para arquivo append-only fora do volume
(`/var/log/evok/postgres/YYYY-MM-DD.log`), retido **90 dias** em disco local e replicado para
armazenamento externo ao host de produção. 90 dias cobre a janela típica de investigação de
incidente sem crescer indefinidamente.

## 6. Nota de processo — por que o orquestrador executou

O encargo foi despachado ao agente `docker`, que voltou **sem executar nada**, corretamente:
`.claude/agents/_deprecated/docker.md` teve `Bash`, `Edit` e `Write` removidos por decisão do dono
nesta mesma sessão (`RC-PROC-01`, `CE-04`), ficando com `Read, Glob, Grep`. Ele **recusou-se a
fabricar saída de comando** e marcou explicitamente o que era documentação e o que seria evidência —
comportamento correto, e registrado aqui como tal.

O texto do procedimento de produção da §4 aproveita a análise que ele produziu; a evidência de
execução das §§2.1-2.3 e da §3 é do orquestrador, com saída literal.

**Efeito colateral do desarmamento, registrado para o Control Plane:** a decisão de tirar `Bash` dos
15 agentes depreciados foi correta e fechou o vetor do incidente original, mas deixou o programa sem
agente de infraestrutura na taxonomia CoreTriad. Trabalho de infra passou a depender do orquestrador
ou de um agente OpusCore. **Não é defeito da decisão — é consequência a nomear**, e a lacuna de
papel é decisão do dono.

## 7. Estado de `CE-06`

**NÃO SATISFEITO. NÃO BLOQUEADO POR DECISÃO — bloqueado por topologia.**

- Banco de teste: **não ativado**, por ser tecnicamente inseparável de produção.
- Produção: **não tocada**, conforme instrução.
- Procedimento: **pronto**, aguardando confirmação de dia e horário pelo dono.
- Retenção: **proposta**, aguardando decisão.

O que o dono precisa decidir, e que este documento não decide:

1. Confirmar a janela para a ativação **cluster-wide** (cobre os dois bancos de uma vez).
2. Aprovar, ajustar ou recusar a proposta de retenção de 90 dias da §5.
3. Se quiser separação real entre teste e produção — inclusive para este e outros controles —, a
   correção estrutural é **instância PostgreSQL separada**, que está fora do escopo autorizado e é
   trabalho próprio.

Nenhuma declaração de `AUDIT_PASSED`, `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui. O
fechamento de `CE-06` é do dono sobre evidência VeriCore (Regra 4).
