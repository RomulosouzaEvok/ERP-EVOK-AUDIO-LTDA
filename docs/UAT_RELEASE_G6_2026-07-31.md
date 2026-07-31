# Gate G6 - UAT, Canario e Aprovacao

**Projeto:** ERP EVOK AUDIO  
**Data:** 2026-07-31  
**Ambiente alvo:** homologacao local/isolada com PostgreSQL via Docker  
**Status:** preparado, bloqueado para conclusao por dependencia do smoke Docker da API no G5

## Objetivo

Registrar o roteiro executavel do Gate G6 para UAT, canario, rollback real,
reauditoria e aprovacao formal. Este gate nao libera producao enquanto qualquer
gate anterior estiver pendente ou enquanto houver risco P0/P1 sem aceite formal.

## Condicoes de entrada

| Condicao | Status | Evidencia |
|---|---|---|
| G1 aprovado | Aprovado | Validacoes de runtime seguro registradas no historico do gate |
| G2 aprovado | Aprovado com riscos residuais | Migrations baseline validadas em banco existente e banco vazio |
| G3 aprovado | Aprovado | Matriz RBAC e testes 401/403 validados anteriormente |
| G4 aprovado | Aprovado | Locks/idempotencia e suites de integridade validados anteriormente |
| G5 aprovado | Bloqueado | Smoke Docker da API pendente por falha HTTPS Node/npm no Docker Desktop |
| PostgreSQL Docker saudavel | Aprovado | `evok-postgres` em `running healthy`; `pg_isready` aceitando conexoes |

## Checklist REL-01 a REL-10

| ID | Item | Status | Evidencia requerida | Bloqueio atual |
|---|---|---|---|---|
| REL-01 | Restaurar backup em homologacao | Pendente | Log de restore e contagem de tabelas essenciais | backup homologado ainda nao fornecido |
| REL-02 | Executar UAT de vendas, compras, estoque, producao e financeiro | Preparado | Registro dos cenarios abaixo assinado por QA/Sponsor | exige ambiente API operacional |
| REL-03 | Validar dados iniciais, usuarios, roles e seed controlado | Preparado | Lista de usuarios/roles e seed auditado | exige API + banco aplicado |
| REL-04 | Executar deploy canario com volume e dados controlados | Bloqueado | Tag imutavel, container da API e healthcheck | depende do smoke Docker do G5 |
| REL-05 | Monitorar erros, latencia, conexoes e jobs | Preparado | Janela monitorada com logs e metricas | exige canario ativo |
| REL-06 | Executar teste real de rollback | Bloqueado | Evidencia de retorno para tag anterior aprovada | depende de imagem aprovada |
| REL-07 | Confirmar backup pre-janela | Pendente | Arquivo de backup, checksum e teste de leitura | exige janela definida |
| REL-08 | Obter aprovacao formal | Pendente | Assinaturas de Tech Lead, DBA, DevOps, QA e Sponsor | exige REL-01 a REL-07 |
| REL-09 | Executar reauditoria P0/P1 | Preparado | `docs/REAUDITORIA_P0_P1_2026-07-31.md` | G5 permanece aberto |
| REL-10 | Liberar producao somente com gates assinados | Bloqueado | Ata de release completa | G5/G6 ainda nao assinados |

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

O Gate G6 esta preparado para execucao, mas nao pode ser concluido nem liberar
producao enquanto o G5 nao comprovar a imagem final da API, readiness e rollback.
