# Documentação de Banco de Dados — ERP EVOK ÁUDIO

**Dono:** DBA/Arquiteto de Dados (`AdmDBA`) — qualquer alteração de schema (nova
migration) DEVE atualizar os arquivos relevantes desta pasta **no mesmo
ciclo de trabalho**, não como tarefa pontual futura. Isso vale sobretudo
para `03-MODELO_FISICO.md`/`schema.sql` (regenerar via `pg_dump`) e
`04-DICIONARIO_DADOS.md` (regenerar via `docs/database/gen_dict.py` — ver
nota no topo desse arquivo).

**Auditoria de origem:** 2026-08-06, introspecção real do PostgreSQL 16
local (81 tabelas incl. `SequelizeMeta`, 80 tabelas de negócio, 175
foreign keys, 66 migrations aplicadas) — não apenas leitura de código/models.
**Reconferido no mesmo dia** (rodada pós-módulo COMEX/Importação,
migration `20260806-000090-create-import-processes.cjs`): schema.sql,
dicionário e contagem de migrations batem 1:1 com o banco real; achado de
nomenclatura isolado (`access_profiles.nome`/`descricao`) registrado em
[04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md#accessprofiles) e
[03-MODELO_FISICO.md](03-MODELO_FISICO.md).

## Os 7 documentos

1. **[01-MODELO_CONCEITUAL.md](01-MODELO_CONCEITUAL.md)** — Modelo
   Entidade-Relacionamento (MER) de negócio: entidades e relações, sem
   tecnologia. Nível "validar com a diretoria".
2. **[02-MODELO_LOGICO.md](02-MODELO_LOGICO.md)** — DER técnico (Mermaid
   `erDiagram`): tabelas, PKs, FKs, cardinalidade, cobrindo os módulos
   principais (Item, Fornecedor, Venda, OP, Requisição/Pedido de Compra,
   Financeiro, RFQ, Centros de Custo, COMEX/Importação etc.).
3. **[03-MODELO_FISICO.md](03-MODELO_FISICO.md)** — Como o DDL real é
   gerado e mantido; aponta para `schema.sql` (anexo, `pg_dump
   --schema-only` do banco local real).
4. **[04-DICIONARIO_DADOS.md](04-DICIONARIO_DADOS.md)** — Catálogo
   coluna-a-coluna de todas as 80 tabelas (tipo, nulabilidade, default,
   PK/FK/UNIQUE), gerado por introspecção real + descrição de negócio
   curada para as tabelas ativas.
5. **[05-ACESSOS_E_ISOLAMENTO.md](05-ACESSOS_E_ISOLAMENTO.md)** — Matriz
   de privilégios (realidade atual: usuário único superusuário) e
   política de isolamento de serviços externos (n8n, integrações).
6. **[06-ESTRUTURAS_PROGRAMAVEIS.md](06-ESTRUTURAS_PROGRAMAVEIS.md)** —
   Procedures/functions/triggers (confirmado: nenhum no banco; decisão
   arquitetural documentada).
7. **[07-DISASTER_RECOVERY.md](07-DISASTER_RECOVERY.md)** — Rotinas de
   backup (realidade vs aspiracional) e processo de restore.

## Anexo

- **[schema.sql](schema.sql)** — DDL completo (`pg_dump --schema-only
  --no-owner --no-privileges`) do banco local real em 2026-08-06. Não
  editar manualmente; regenerar a cada mudança relevante de schema (ver
  comando em `03-MODELO_FISICO.md`).

## Relação com `docs/DATABASE.md`

`docs/DATABASE.md` continua existindo como **changelog histórico
narrativo** de cada migration/decisão de modelagem desde 2026-07-31 (a
"memória" de por que cada tabela existe do jeito que existe). Esta pasta
(`docs/database/`) é a **documentação de referência estruturada e sempre
atual** — comece por aqui se quiser saber "o que existe hoje", vá para
`docs/DATABASE.md` se quiser saber "por que foi decidido assim".
