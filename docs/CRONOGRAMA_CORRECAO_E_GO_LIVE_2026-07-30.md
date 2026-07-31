# Cronograma de Correcao e Go-Live - ERP EVOK AUDIO

**Versao:** 1.0  
**Data-base:** 2026-07-30  
**Status:** Plano de execucao - producao bloqueada  
**Documento de origem:** `docs/AUDITORIA_PRODUCAO_2026-07-30.md`

## 1. Objetivo

Transformar os achados da auditoria em um plano executavel, priorizado por risco,
com tarefas pequenas, dependencias claras, evidencias verificaveis e gates de
aprovacao. O objetivo e colocar o ERP em producao com um artefato reproduzivel,
banco versionado, controles de acesso, integridade de estoque/financeiro e
capacidade real de rollback e restauracao.

Este documento nao substitui a auditoria. A auditoria descreve o risco; este
documento define a ordem para corrigir, testar e aprovar.

## 2. Decisao atual

**Go-live: BLOQUEADO.**

Nenhum deploy com dados reais deve ocorrer antes de todos os gates G0 a G6
estarem aprovados. O fato de `npm test` passar nao libera o deploy enquanto as
suites de integracao estiverem puladas ou enquanto nao houver evidencia de
restore do banco.

## 3. Estrategia de execucao rapida

O cronograma assume uma equipe minima trabalhando em paralelo:

| Papel | Responsabilidade principal |
|---|---|
| Tech Lead | Decisoes, integracao, aceite tecnico e reauditoria |
| Backend/Auth | Entrypoint, RBAC, JWT, concorrencia e auditoria |
| DBA | Migrations, TLS, backup e restore |
| DevOps | Build, imagem, CI/CD, secrets, healthcheck e rollback |
| QA/UAT | Testes de integracao, concorrencia, seguranca e aceite funcional |
| Sponsor do negocio | Aprovacao da matriz de permissoes e UAT |

### Caminho critico

1. Congelar o estado atual e preparar branch de remediacao.
2. Consolidar runtime, configuracao e banco sem operacao destrutiva.
3. Fechar autorizacao e integridade dos fluxos criticos.
4. Automatizar build, testes, migrations, deploy e rollback.
5. Provar integracao, concorrencia, backup/restore e UAT.
6. Executar canario, reauditoria e liberar por aprovacao formal.

Estimativa: **10 dias uteis com trabalho paralelo**. Se apenas uma pessoa atuar
em todas as frentes, o prazo deve ser recalculado; nao se deve reduzir gates
para compensar falta de capacidade.

### Matriz de execucao

| Prefixo | Dono primario | Dependencia minima | Evidencia de conclusao |
|---|---|---|---|
| `P0` | Tech Lead, Backend e DevOps | Baseline G0 | Diff revisado, build limpo e teste de boot |
| `DB` | DBA | P0-08 e P0-09 | Migrations, logs de aplicacao e restore validado |
| `SEC` | Backend/Auth e Sponsor | Baseline G0 | Matriz aprovada e testes 401/403/200 |
| `INT` | Backend e QA | DB-02 a DB-08 | Testes transacionais e concorrentes |
| `OPS` | DevOps | P0-01 a P0-06 | CI, imagem, healthcheck e rollback |
| `QA` | QA | SEC, INT e OPS | Relatorio sem skips obrigatorios |
| `REL` | QA, DevOps e Sponsor | G1 a G5 | UAT, canario, aceite e ata de release |

Cada tarefa deve ser registrada no quadro com: status, responsavel nominal,
pull request, evidencia, data de conclusao e risco residual. O dono primario
nao elimina a revisao obrigatoria pelo Tech Lead.

## 4. Regras que nao podem ser quebradas

- O stack padrao deste projeto e obrigatoriamente `Docker + PostgreSQL`.
- Nao homologar execucao local, teste, CI, deploy ou operacao fora do baseline `Docker + PostgreSQL`, salvo aprovacao tecnica formal registrada.
- Nao usar `sequelize.sync({ force: true })` em producao.
- Nao usar `sequelize.sync({ alter: true })` como mecanismo de migration.
- Nao mover apenas `tsx` para `dependencies`; o runtime deve executar o artefato compilado.
- Nao considerar teste pulado como teste aprovado.
- Nao liberar escrita em estoque, financeiro, compras ou producao somente com `authenticate`.
- Nao executar migration destrutiva sem backup verificado e plano de rollback.
- Nao publicar secrets no repositorio, na imagem Docker ou nos logs.
- Nao fazer deploy manual fora do artefato gerado pelo CI.

## 5. Cronograma executivo

### Dia 0 - Congelamento e baseline

**Objetivo:** preservar o estado atual e tornar o trabalho rastreavel.

- [ ] Criar branch `remediation/production-readiness` a partir do commit auditado.
- [ ] Registrar o commit base, versao do Node, versao do npm e resultado dos testes atuais.
- [ ] Registrar que `npm test` possui suites puladas e que isso nao e criterio de aceite.
- [ ] Confirmar proprietarios de cada tarefa e canal de decisao tecnica.
- [ ] Congelar novas features ate o Gate G1.
- [ ] Criar quadro de tarefas usando os IDs deste documento.

**Saida obrigatoria:** baseline versionado e lista de responsaveis aprovada.

### Dias 1 e 2 - Fundacao segura do runtime

**Objetivo:** garantir que o mesmo aplicativo testado seja o aplicativo executado.

- [ ] `P0-01` Consolidar `server/app.ts` como factory/configuracao unica.
- [ ] `P0-02` Reduzir `server/index.ts` a bootstrap de configuracao, banco e `listen`.
- [ ] `P0-03` Remover rotas e middlewares duplicados.
- [ ] `P0-04` Mover `zod` para `dependencies` por ser usado em runtime.
- [ ] `P0-05` Alterar `start` para executar `node dist/index.js`.
- [ ] `P0-06` Criar build reproducivel e testar `npm ci --omit=dev` na imagem final.
- [ ] `P0-07` Criar validacao de ambiente no boot para producao.
- [ ] `P0-08` Bloquear `DB_FORCE_SYNC` e `DB_AUTO_ALTER` em producao com erro claro.
- [ ] `P0-09` Exigir TLS no banco em producao e validar certificado/CA.
- [ ] `P0-10` Remover defaults de senha de ambientes compartilhados.

**Gate G1 - Runtime seguro:** build limpo, imagem minima, boot previsivel, sem
flags destrutivas e sem divergencia entre teste e producao.

### Dias 2 a 4 - Banco, migrations e recuperacao

**Objetivo:** tornar o schema e os dados operaveis sem depender de sincronizacao
automatica.

- [ ] `DB-01` Inventariar tabelas, colunas, indices, constraints e enums usados pelo codigo.
- [ ] `DB-02` Definir ferramenta e formato de migrations versionadas.
- [ ] `DB-03` Criar migration baseline para banco novo.
- [ ] `DB-04` Criar migrations incrementais para o schema existente.
- [ ] `DB-05` Adicionar tabela/controle de versao das migrations.
- [ ] `DB-06` Validar todas as migrations em banco vazio.
- [ ] `DB-07` Validar todas as migrations em copia representativa do banco atual.
- [ ] `DB-08` Proibir DDL automatico durante o boot da aplicacao.
- [ ] `DB-09` Definir usuario de aplicacao com privilegio minimo.
- [ ] `DB-10` Configurar backup automatico, retencao e armazenamento separado.
- [ ] `DB-11` Executar restore completo em ambiente isolado.
- [ ] `DB-12` Medir e registrar RPO, RTO e tempo real de restauracao.
- [ ] `DB-13` Documentar rollback de migration compativel com rollback da aplicacao.

**Gate G2 - Dados protegidos:** migrations reproduziveis, backup restaurado com
sucesso e nenhum deploy depende de `sync alter/force`.

### Dias 3 a 5 - Autorizacao e ciclo de sessao

**Objetivo:** impedir que autenticacao seja confundida com autorizacao.

- [ ] `SEC-01` Aprovar matriz de permissoes por role com o sponsor do negocio.
- [ ] `SEC-02` Proteger escrita de produtos por role autorizada.
- [ ] `SEC-03` Proteger movimentacao e ajuste de estoque por role autorizada.
- [ ] `SEC-04` Proteger criacao, alteracao, recebimento e cancelamento de compras.
- [ ] `SEC-05` Proteger alteracoes de vendas e cancelamentos.
- [ ] `SEC-06` Proteger todas as operacoes financeiras de escrita com `admin/financial`.
- [ ] `SEC-07` Revisar producao, BOM, MRP, inventario ciclico e rastreabilidade.
- [ ] `SEC-08` Garantir que cada rota tenha teste `401`, `403` e sucesso autorizado.
- [ ] `SEC-09` Implementar troca de senha autenticada.
- [ ] `SEC-10` Implementar invalidacao de sessoes por `password_version` ou mecanismo equivalente.
- [ ] `SEC-11` Definir expiracao adequada, issuer e audience do JWT.
- [ ] `SEC-12` Definir processo de reset de senha e revogacao emergencial.
- [ ] `SEC-13` Validar secrets obrigatorios no boot, nunca no primeiro request.

**Gate G3 - Acesso controlado:** nenhuma rota de escrita critica fica acessivel
apenas com `authenticate`; a matriz aprovada esta coberta por testes.

### Dias 4 a 6 - Integridade transacional e auditoria

**Objetivo:** impedir duplicidade, perda de estoque e alteracoes sem rastreio.

- [ ] `INT-01` Usar lock pessimista na leitura da venda antes de alterar status.
- [ ] `INT-02` Tornar transicoes de status idempotentes e protegidas contra corrida.
- [ ] `INT-03` Revisar concorrencia em vendas, compras, producao e inventario.
- [ ] `INT-04` Garantir que estoque e movimento sejam alterados na mesma transacao.
- [ ] `INT-05` Validar que pagamentos nao possam ser aplicados duas vezes.
- [ ] `INT-06` Adicionar constraints e indices necessarios no banco.
- [ ] `INT-07` Definir eventos de auditoria obrigatorios para dinheiro, estoque e permissoes.
- [ ] `INT-08` Decidir quais logs devem participar da mesma transacao do negocio.
- [ ] `INT-09` Impedir falha silenciosa de auditoria; emitir alerta e criterio de retry.
- [ ] `INT-10` Garantir que logs nao armazenem senhas, tokens ou dados excessivos.
- [ ] `INT-11` Testar duas ou mais requisicoes simultaneas para cada fluxo critico.

**Gate G4 - Integridade comprovada:** testes concorrentes demonstram que uma
operacao de negocio produz exatamente um efeito de estoque/financeiro.

### Dias 5 a 7 - CI/CD, observabilidade e operacao

**Objetivo:** transformar o deploy em processo repetivel e reversivel.

- [ ] `OPS-01` Criar Dockerfile multi-stage para build e runtime.
- [ ] `OPS-02` Executar a imagem como usuario nao-root.
- [ ] `OPS-03` Usar tag imutavel por commit/versao, nunca apenas `latest`.
- [ ] `OPS-04` Criar CI com install limpo, typecheck, build e testes.
- [ ] `OPS-05` Fazer CI falhar quando suites obrigatorias forem puladas.
- [ ] `OPS-06` Subir PostgreSQL de teste e executar API de teste isolada.
- [ ] `OPS-07` Rodar testes de integracao com token e URL de teste controlados.
- [ ] `OPS-08` Executar secret scan e dependency scan no CI.
- [ ] `OPS-09` Criar healthcheck de liveness e readiness com dependencia do banco.
- [ ] `OPS-10` Implementar shutdown gracioso em `SIGTERM` e `SIGINT`.
- [ ] `OPS-11` Configurar logs estruturados com request/correlation ID.
- [ ] `OPS-12` Definir alertas para erro 5xx, indisponibilidade, banco e auditoria.
- [ ] `OPS-13` Documentar deploy, rollback, incidente e rotacao de secrets.
- [ ] `OPS-14` Definir rate limit distribuido se houver mais de uma instancia.

**Gate G5 - Operacao reproduzivel:** o CI gera o artefato, o deploy usa esse
artefato, healthcheck confirma readiness e rollback pode ser executado.

### Dias 7 e 8 - Testes completos e correcao de regressao

- [ ] `QA-01` Rodar typecheck sem erros.
- [ ] `QA-02` Rodar build sem erros.
- [ ] `QA-03` Rodar testes unitarios sem falhas.
- [ ] `QA-04` Rodar todas as suites de integracao sem skips.
- [ ] `QA-05` Rodar testes edge sem skips indevidos.
- [ ] `QA-06` Executar testes de RBAC por role e por operacao.
- [ ] `QA-07` Executar testes de expiracao e invalidacao de JWT.
- [ ] `QA-08` Executar concorrencia em cancelamento de venda.
- [ ] `QA-09` Executar concorrencia em baixa/entrada de estoque.
- [ ] `QA-10` Executar concorrencia em recebimento e pagamento.
- [ ] `QA-11` Validar payloads, limites de pagina, filtros e erros.
- [ ] `QA-12` Executar smoke test contra a imagem final, sem `devDependencies`.
- [ ] `QA-13` Comparar schema esperado pelo codigo com schema real.
- [ ] `QA-14` Registrar cobertura e riscos residuais aceitos formalmente.

### Dias 9 e 10 - UAT, canario e aprovacao

- [ ] `REL-01` Restaurar backup em ambiente de homologacao.
- [ ] `REL-02` Executar UAT de vendas, compras, estoque, producao e financeiro.
- [ ] `REL-03` Validar dados iniciais, usuarios, roles e seed controlado.
- [ ] `REL-04` Executar deploy canario com volume e dados controlados.
- [ ] `REL-05` Monitorar erros, latencia, conexoes e jobs por periodo definido.
- [ ] `REL-06` Executar teste real de rollback em homologacao.
- [ ] `REL-07` Confirmar backup imediatamente antes da janela de producao.
- [ ] `REL-08` Obter aprovacao formal de Tech Lead, DBA, DevOps, QA e sponsor.
- [ ] `REL-09` Executar reauditoria dos itens P0/P1.
- [ ] `REL-10` Liberar producao somente com todos os gates assinados.

## 6. Criterios tecnicos de aceite

### Runtime e build

- [ ] `npm ci` e `npm run build` funcionam em ambiente limpo.
- [ ] O comando de producao executa `dist`, nao `tsx`.
- [ ] A imagem final inicializa com `npm ci --omit=dev`.
- [ ] `zod` e qualquer outro pacote importado em runtime estao em `dependencies`.
- [ ] `app.ts` e `index.ts` nao possuem rotas duplicadas.

### Configuracao e banco

- [ ] Boot de producao falha se faltar secret obrigatorio.
- [ ] Boot de producao falha se TLS do PostgreSQL nao estiver configurado corretamente.
- [ ] `DB_FORCE_SYNC` e `DB_AUTO_ALTER` nunca executam DDL em producao.
- [ ] Migrations possuem identificador, ordem, log e procedimento de rollback.
- [ ] Restore foi executado e os dados essenciais foram validados.

### Seguranca

- [ ] Toda rota de escrita critica possui autorizacao por role.
- [ ] Usuarios inativos nao conseguem usar tokens existentes.
- [ ] Troca de senha invalida sessoes conforme a politica aprovada.
- [ ] CORS, proxy confiavel, rate limit e HTTPS estao definidos para o ambiente real.
- [ ] Nenhum secret aparece em logs, imagem, Git ou artefato de CI.

### Integridade

- [ ] Operacoes de estoque possuem transacao e lock adequados.
- [ ] Cancelamento repetido nao duplica entrada de estoque.
- [ ] Pagamento repetido nao duplica baixa financeira.
- [ ] Evento critico sem audit log gera falha/alerta conforme politica definida.
- [ ] Testes de concorrencia passam em banco PostgreSQL real.

## 7. Comandos minimos do pipeline

Executar a partir de `server/` em ambiente limpo:

```text
npm ci
npm run typecheck
npm run build
npm run test:unit -- --ci
npm run test:integration -- --ci
npm run test:edge -- --ci
npm audit --omit=dev
```

O pipeline deve falhar quando ocorrer qualquer uma das situacoes abaixo:

- typecheck ou build falhar;
- teste falhar;
- suite obrigatoria for pulada;
- migration falhar;
- secret scan encontrar credencial;
- imagem nao executar como usuario esperado;
- healthcheck de readiness falhar;
- dependencia de runtime estiver ausente na imagem final.

## 8. Checklist de janela de deploy

### Antes da janela

- [ ] Tag e commit aprovados registrados.
- [ ] CI verde no mesmo artefato que sera implantado.
- [ ] Backup concluido e restauracao mais recente conhecida.
- [ ] Migrations revisadas e ordenadas.
- [ ] Rollback definido e testado.
- [ ] Secrets e certificados validos e com data de expiracao conhecida.
- [ ] Equipe de plantao e contatos confirmados.
- [ ] Janela, impacto e criterio de abortagem comunicados.

### Durante a janela

- [ ] Colocar sistema em modo de manutencao, se aplicavel.
- [ ] Executar backup pre-deploy.
- [ ] Executar migrations aprovadas.
- [ ] Implantar imagem imutavel.
- [ ] Validar readiness e conectividade com banco.
- [ ] Executar smoke tests de login, consulta, escrita e auditoria.
- [ ] Monitorar logs e metricas pelo periodo definido.
- [ ] Abortar se houver erro de schema, perda de dados, 5xx anormal ou falha de readiness.

### Depois da janela

- [ ] Confirmar login por cada role.
- [ ] Confirmar venda, cancelamento, estoque, compra, recebimento e financeiro.
- [ ] Confirmar registro de auditoria dos eventos criticos.
- [ ] Confirmar backup pos-deploy.
- [ ] Registrar resultado, metricas, incidentes e riscos residuais.
- [ ] Obter aceite formal do sponsor.

## 9. Criterios de rollback

Executar rollback imediatamente quando ocorrer:

- migration irreversivel ou schema incompatível;
- duplicidade ou divergencia de estoque;
- baixa financeira incorreta;
- falha de autenticacao ou autorizacao;
- perda de audit log em operacao critica;
- erro 5xx persistente acima do limite acordado;
- readiness ou conexao com banco instavel;
- impossibilidade de restaurar o servico dentro do RTO.

O rollback deve restaurar aplicacao e banco de forma compativel. Reverter apenas
a imagem sem avaliar migrations pode deixar o sistema em estado inconsistente.

## 10. Reauditoria obrigatoria

A reauditoria deve validar, com evidencia anexada ao ticket de release:

- [ ] `AUD-0001` a `AUD-0004` encerrados com teste reproducivel.
- [ ] `AUD-0005` encerrado com matriz de RBAC e testes 403.
- [ ] `AUD-0006` encerrado com teste concorrente real.
- [ ] `AUD-0007` e `AUD-0009` consolidados e encerrados com teste de revogacao.
- [ ] `AUD-0008` resolvido ou aceito formalmente conforme topologia real.
- [ ] `AUD-0010` encerrado com CI, imagem e rollback funcionais.
- [ ] `AUD-0011` encerrado sem suites obrigatorias puladas.
- [ ] `AUD-0012` resolvido ou aceito por risco com justificativa tecnica.
- [ ] RBAC de escrita, migrations, backup/restore, audit log e readiness incluidos na nova auditoria.

## 11. Registro de aprovacao

| Gate | Responsavel | Evidencia | Status | Data |
|---|---|---|---|---|
| G0 Baseline | Tech Lead | Commit e inventario | Pendente | |
| G1 Runtime seguro | Tech Lead/DevOps | Build e imagem | Pendente | |
| G2 Dados protegidos | DBA | Migration e restore | Pendente | |
| G3 Acesso controlado | Backend/Sponsor | Matriz e testes RBAC | Pendente | |
| G4 Integridade | Backend/QA | Testes concorrentes | Pendente | |
| G5 Operacao | DevOps | CI, healthcheck e rollback | Pendente | |
| G6 UAT e release | QA/Sponsor | UAT e canario | Pendente | |
| Reauditoria | Principal Engineer | Relatorio final | Pendente | |

## 12. Definicao final de pronto

O ERP somente esta pronto para producao quando:

1. Todos os gates estao aprovados.
2. Nenhum P0/P1 permanece aberto sem aceite formal de risco.
3. O artefato de producao foi gerado pelo CI e validado em homologacao.
4. Migrations, backup, restore e rollback foram comprovados.
5. Testes de integracao e concorrencia foram executados sem skips.
6. A matriz de autorizacao foi aprovada pelo negocio.
7. A reauditoria confirmou o fechamento dos riscos.
