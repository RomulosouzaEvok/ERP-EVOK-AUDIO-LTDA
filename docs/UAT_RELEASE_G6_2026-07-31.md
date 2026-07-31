# Gate G6 - UAT, Canario e Aprovacao

**Projeto:** ERP EVOK AUDIO  
**Data:** 2026-07-31  
**Ambiente alvo:** homologacao local/isolada com PostgreSQL via Docker  
**Status:** G0-G5 tecnicamente aprovados em 2026-07-31 (segunda rodada de execucao).
G6 depende agora apenas de acoes humanas/organizacionais (UAT de negocio, ambiente
de homologacao real, aprovacao formal) - nao ha mais bloqueio tecnico conhecido.

## Objetivo

Registrar o roteiro executavel do Gate G6 para UAT, canario, rollback real,
reauditoria e aprovacao formal. Este gate nao libera producao enquanto qualquer
gate anterior estiver pendente ou enquanto houver risco P0/P1 sem aceite formal.

## Condicoes de entrada

| Condicao | Status | Evidencia |
|---|---|---|
| G1 aprovado | Aprovado | typecheck/build/testes reproduzidos com sucesso em 2026-07-31 |
| G2 aprovado | Aprovado | 10 migrations `up`, backup/restore real validado (`docs/BACKUP_RESTORE_G2_2026-07-31.md`), rollback de migration testado |
| G3 aprovado | Aprovado | RBAC em todas as rotas de escrita critica (incl. `clients`/`suppliers`), SEC-10 (invalidacao de sessao por `password_version`) e SEC-11 (JWT `issuer`/`audience`) implementados e testados |
| G4 aprovado | Aprovado | bug real de lock pessimista corrigido (outer join + `FOR UPDATE`), 3 novos testes de concorrencia real (venda, OP, compra) |
| G5 aprovado | Aprovado | build da imagem principal (`docker build ./server`) concluido, container roda como `uid=999(evok)`, `/health/live` e `/health/ready` respondem 200, shutdown gracioso via `SIGTERM` confirmado |
| PostgreSQL Docker saudavel | Aprovado | `evok-postgres` em `running healthy`; `pg_isready` aceitando conexoes |

## Checklist REL-01 a REL-10

| ID | Item | Status | Evidencia requerida | Bloqueio atual |
|---|---|---|---|---|
| REL-01 | Restaurar backup em homologacao | Tecnicamente comprovado | Restore executado em container isolado `evok-postgres-restore-test`, contagens de `users`/`products`/`bill_of_material_items` identicas (`docs/BACKUP_RESTORE_G2_2026-07-31.md`) | falta apenas repetir em um ambiente de homologacao formal (fora da maquina local do desenvolvedor), se a empresa exigir isso |
| REL-02 | Executar UAT de vendas, compras, estoque, producao e financeiro | Preparado, com evidencia tecnica de suporte | Todos os fluxos do roteiro abaixo ja tem teste automatizado de integracao real passando (concorrencia de venda/OP/compra/estoque, pagamento/recebivel, rastreabilidade) | falta a assinatura humana de QA/Sponsor confirmando que o comportamento reflete a operacao real do negocio |
| REL-03 | Validar dados iniciais, usuarios, roles e seed controlado | Preparado | Seed roda sem erro (`npm start`/container), RBAC valida por role | falta decisao do negocio sobre quais usuarios/roles reais entram em producao |
| REL-04 | Executar deploy canario com volume e dados controlados | Depende de ambiente real | Imagem builda e sobe localmente com sucesso (`docs/EXECUCAO_GATES_PRODUCAO_2026-07-31.md`, secao G5) | falta um ambiente de hospedagem real (servidor/nuvem) definido pela empresa; nao pode ser simulado localmente |
| REL-05 | Monitorar erros, latencia, conexoes e jobs | Preparado | Logs estruturados com `requestId`/`correlationId` ja implementados | exige canario ativo (REL-04) |
| REL-06 | Executar teste real de rollback | Tecnicamente comprovado | `migration:down` testado com sucesso em banco isolado (`docs/BACKUP_RESTORE_G2_2026-07-31.md`) | falta testar o rollback combinado com a troca de imagem, que depende de um orquestrador de deploy real (REL-04) |
| REL-07 | Confirmar backup pre-janela | Pronto para execucao | Script `scripts/backup-postgres.ps1`/`.sh` criado e validado | e uma acao operacional a ser executada no dia da janela real, nao antes |
| REL-08 | Obter aprovacao formal | Pendente — acao humana | Tabela de assinaturas abaixo | exige decisao formal de Tech Lead, DBA, DevOps, QA e Sponsor; nenhuma IA pode assinar por essas pessoas |
| REL-09 | Executar reauditoria P0/P1 | Concluido | `docs/REAUDITORIA_P0_P1_2026-07-31.md` + correcoes de G2-G5 desta sessao | nenhum |
| REL-10 | Liberar producao somente com gates assinados | Bloqueado | Ata de release completa | depende exclusivamente de REL-04 (ambiente real) e REL-08 (aprovacao humana) |

## Roteiro de UAT

Cada cenario deve registrar operador, data/hora, payload principal, resultado
esperado, resultado observado e evidencia de auditoria/log quando aplicavel.

| Area | Cenario minimo | Resultado esperado |
|---|---|---|
| Autenticacao | Login com usuario ativo e tentativa com usuario inativo | Usuario ativo recebe token; inativo recebe 401/403 |
| Usuarios e roles | Operador sem permissao tenta escrita critica | API retorna 403 sem alterar dados |
| Vendas | Criar venda, consultar, cancelar uma vez e repetir cancelamento | Cancelamento idempotente sem duplicar estoque |
| Compras | Criar compra, receber itens e repetir recebimento | Estoque entra uma unica vez por item recebido |
| Estoque | Criar movimento manual permitido e validar saldo | Movimento transacionado e saldo consistente |
| Producao | Criar ordem, iniciar, concluir e consultar rastreabilidade | Consumo/producao registrados sem divergencia |
| Financeiro | Baixar recebivel/pagavel e repetir operacao | Baixa idempotente sem duplicidade financeira |
| Auditoria | Conferir evento critico apos escrita | Evento rastreavel por usuario/correlation ID |
| Healthcheck | Consultar `/health/live` e `/health/ready` | Live e ready retornam 200 no canario |

## Roteiro de canario

1. Confirmar tag imutavel da API e registrar digest da imagem.
2. Restaurar backup homologado em banco isolado.
3. Executar migrations aprovadas antes de subir a API.
4. Subir API com a tag candidata e volume/dados controlados.
5. Validar `/health/live`, `/health/ready`, login e escrita simples.
6. Rodar UAT minimo por area.
7. Monitorar logs por periodo definido pela equipe.
8. Encerrar canario com decisao: aprovar, reprovar ou aceitar risco formal.

## Criterios de abortagem

Abortar o G6 e voltar para correcao se ocorrer qualquer item abaixo:

- Readiness falhar ou oscilar.
- Erro 5xx recorrente durante UAT.
- Divergencia de estoque, compra, venda ou financeiro.
- Falha de autenticacao, autorizacao ou invalidacao de token.
- Migration falhar, ficar parcialmente aplicada ou impedir rollback.
- Log expor segredo ou dado sensivel.
- Rollback real nao puder ser executado dentro do RTO acordado.

## Registro de aprovacao

| Papel | Nome | Decisao | Data/hora | Observacao |
|---|---|---|---|---|
| Tech Lead | Pendente | Pendente | Pendente |  |
| DBA | Pendente | Pendente | Pendente |  |
| DevOps | Pendente | Pendente | Pendente |  |
| QA | Pendente | Pendente | Pendente |  |
| Sponsor | Pendente | Pendente | Pendente |  |

## Decisao atual

O Gate G6 esta tecnicamente desbloqueado: G0 a G5 foram comprovados nesta sessao
com evidencia real (testes, build, backup/restore, healthcheck, rollback de
migration). O que falta para liberar producao nao e mais trabalho de codigo -
sao tres acoes que so a EVOK AUDIO pode tomar:

1. Definir e disponibilizar um ambiente real de hospedagem para o deploy canario (REL-04).
2. Executar o UAT de negocio com os cenarios do roteiro abaixo e registrar o aceite (REL-02/REL-03).
3. Coletar as assinaturas formais de Tech Lead, DBA, DevOps, QA e Sponsor (REL-08).

Nenhuma IA pode substituir essas tres acoes. Ate que elas aconteçam, a decisao
permanece: **nao liberar producao**.
