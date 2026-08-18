# BLOCO 1 — Módulo SST (Segurança e Saúde do Trabalho) — Requisitos Formais

**Departamento:** 15 — Segurança do Trabalho (SST), conforme
`docs/00-ESTRUTURA_ORGANIZACIONAL.md`.
**Insumo:** `docs/business/briefs/BRIEF_SST_2026-08-06.md` (7 processos A1-A7,
23 entidades, 36 regras BR-SST-001 a 036, 8 integrações, 13 KPIs,
priorização P0/P1/P2).
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-06.
**Status:** 🟡 Especificação de requisitos pronta para modelagem de
banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código foi criado
neste passo** — SST não existe hoje em `server/src/` (model, rota ou
use-case), conforme já verificado no brief.

**Prefixo de módulo:** `SST` — não colide com os prefixos existentes em
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` (AUT, VEN, COM, EST, PRD, QUA,
FIN, PAT, RH, REL, INT). É um prefixo novo e legítimo: SST é um domínio
próprio (departamento 15), sem sobreposição functional com nenhum dos 11
módulos já catalogados. Quando este bloco for consolidado pelo
`documentador`, uma nova seção "13. Segurança e Saúde do Trabalho (RF-SST)"
deve ser adicionada ao índice executivo.

**Numeração de Casos de Uso:** o último UC formal registrado é UC-43 (em
`docs/projeto/04-USE_CASES.md` e `docs/business/01-USE_CASES.md`). Os casos
de uso deste bloco continuam a partir de **UC-44**, sem reaproveitar nem
colidir com números existentes. Quando implementados, o programador deve
migrá-los para `docs/projeto/04-USE_CASES.md` (ver instrução de handoff no
topo daquele arquivo).

---

## 0. Correção terminológica herdada do brief (não propagar)

O sistema **não deve** usar "PPRA" em nenhuma tela, rótulo, enum ou
documento gerado. O PPRA foi extinto em 03/01/2022. O instrumento vigente é
o **PGR (Programa de Gerenciamento de Riscos)**, exigido pela **NR-1**
(Gerenciamento de Riscos Ocupacionais — GRO). A NR-9 vigente trata apenas de
avaliação/controle de agentes físicos, químicos e biológicos — não é mais o
"PPRA". Todos os RFs, entidades e telas abaixo usam PGR/GRO/NR-1.

---

## 1. Requisitos Funcionais (RF-SST)

Cada RF referencia o(s) processo(s) do brief (A1-A7) e a(s) regra(s) de
negócio `BR-SST-NNN` aplicável(is). Tags de prioridade seguem a seção (f) do
brief: **P0** (exigência legal), **P1** (gestão), **P2** (conveniência).

### 1.1 Gestão de EPI — NR-6 (Processo A1)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-001 | Cadastro de **TipoEPI** (catálogo aprovado): nome, CA, validade do CA, fabricante, vida útil em dias, tamanhos/variações, foto, ativo/inativo, vínculo opcional 1:1 com `Item` de estoque | P0 (pré-requisito de tudo em A1) | BR-SST-001 |
| RF-SST-002 | Matriz EPI × Função/Setor (**MatrizEPI**): liga cargo (`Employee.position`) ou departamento a um-ou-muitos TipoEPI, com quantidade padrão | P1 | BR-SST-005 |
| RF-SST-003 | Bloqueio de cadastro/entrega de TipoEPI sem CA informado, ou com CA vencido na data da entrega/operação | P0 | BR-SST-001 |
| RF-SST-004 | Registro de **EntregaEPI** (linha da Ficha de EPI): funcionário, TipoEPI, quantidade, data, motivo (1ª entrega / troca periódica / dano / perda / mudança de função), usuário SST que entregou | P0 | BR-SST-002, 003 |
| RF-SST-005 | Evidência de recebimento obrigatória por entrega (assinatura digitalizada, aceite eletrônico autenticado no sistema, ou biometria); entrega sem evidência não pode ser confirmada | P0 | BR-SST-002 |
| RF-SST-006 | Cálculo automático da data prevista de troca (data de entrega + vida útil do TipoEPI) e alerta a SST com antecedência configurável (padrão 15 dias) | P0 | BR-SST-004 |
| RF-SST-007 | **Ficha de EPI** consolidada do funcionário, imprimível/exportável a qualquer momento (inclusive de desligados); registros de entrega confirmados são **imutáveis** — correção só por estorno com trilha de auditoria | P0 | BR-SST-006 |
| RF-SST-008 | Relatório de pendência crítica: funcionário ativo em função da MatrizEPI sem entrega vigente de algum EPI exigido | P1 | BR-SST-005 |
| RF-SST-009 | Checklist de devolução de EPIs reutilizáveis disparado por evento de desligamento vindo do RH | P1 | BR-SST-007 |
| RF-SST-010 | Requisição de compra automática quando o estoque do `Item` vinculado ao TipoEPI atinge o mínimo, restrita a TipoEPI com CA homologado | P1 | integração (d) — Compras |

### 1.2 Saúde Ocupacional — PCMSO/ASO — NR-7 (Processo A2)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-011 | Cadastro de **PlanoExames** (PCMSO por função/GES): tipo de exame, periodicidade em meses, risco que exige | P0 | BR-SST-011 |
| RF-SST-012 | Registro de **ASO** como entidade própria do módulo SST (não anexo de `employee_documents`): funcionário, tipo (admissional/periódico/retorno ao trabalho/mudança de riscos/demissional), data, resultado (apto/inapto/apto com restrições), restrições, médico examinador, médico coordenador PCMSO, data de vencimento, arquivo | P0 | BR-SST-010 |
| RF-SST-013 | Registro de **ExameComplementar** vinculado a um ASO (audiometria, espirometria, hemograma, acuidade visual etc.), com resultado/laudo e flag alterado sim/não | P0 | BR-SST-012 |
| RF-SST-014 | Bloqueio de efetivação de `hire_date`/admissão sem ASO admissional "apto" (ou "apto com restrições" compatível) com data ≤ início das atividades | P0 | BR-SST-008 |
| RF-SST-015 | Bloqueio de reativação de status do funcionário após afastamento ≥ 30 dias sem ASO de retorno ao trabalho registrado | P0 | BR-SST-009 |
| RF-SST-016 | Recálculo do PlanoExames e exigência de ASO de mudança de riscos **antes** da efetivação de transferência de função/setor | P0 | BR-SST-011 |
| RF-SST-017 | Agendamento automático de sequência de audiometria (referência na admissão, sequencial em 6 meses, depois anual) para funcionários de setores/GES expostos a ruído ≥ 85 dB(A) | P0 | BR-SST-012 |
| RF-SST-018 | Notificação imediata a SST/RH/liderança em ASO "inapto", com bloqueio de apontamento do funcionário na função de origem até novo ASO | P0 | BR-SST-013 |
| RF-SST-019 | Parametrização (não hard-code) do prazo/dispensa do ASO demissional | P1 | BR-SST-014 `[VERIFICAR COM TÉCNICO SST DA EMPRESA]` |
| RF-SST-020 | Relatório analítico anual do PCMSO (exames realizados, resultados anormais, afastamentos) consolidado para o médico coordenador | P1 | processo A2.5 |
| RF-SST-021 | Endpoint de leitura de "status de aptidão" do funcionário (apto/vencido/inapto) para consumo do módulo RH — **não expõe dado clínico**, apenas o status | P0 | BR-SST-010, ver §5 |

### 1.3 Acidente de Trabalho e CAT — Lei 8.213/91, eSocial (Processo A3)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-022 | Registro de **Acidente**: funcionário, data/hora, tipo (típico/trajeto/doença ocupacional), local, descrição, parte do corpo, agente causador, gravidade, dias perdidos, testemunhas | P0 | BR-SST-016, 017 |
| RF-SST-023 | Imutabilidade do registro de acidente confirmado; complementos (dias perdidos, reabertura de CAT) são lançamentos adicionais com trilha de auditoria | P0 | BR-SST-017 |
| RF-SST-024 | Emissão de **CAT** vinculada a exatamente um acidente, com cálculo automático do prazo-limite legal (1º dia útil seguinte; imediato em óbito) e escalonamento de alerta conforme proximidade do vencimento | P0 | BR-SST-015 |
| RF-SST-025 | Registro de decisão + justificativa do Técnico SST para emissão (ou não) de CAT em acidente sem afastamento | P1 | BR-SST-016 |
| RF-SST-026 | **InvestigacaoAcidente** obrigatória (com pelo menos uma AcaoCorretiva) antes de encerrar acidente com gravidade "com afastamento" ou pior | P0 | BR-SST-018 |
| RF-SST-027 | Conciliação de dias perdidos do acidente com afastamentos registrados no RH (leitura, sem duplicar o dado) | P1 | BR-SST-019 |

### 1.4 CIPA — NR-5, CF/88 (Processo A4)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-028 | Cálculo/recálculo automático do dimensionamento da CIPA (titulares/suplentes por representação) a partir do headcount ativo e enquadramento CNAE (Quadro I da NR-5) | P0 | BR-SST-020 |
| RF-SST-029 | **ProcessoEleitoralCIPA**: edital, inscrição de candidatos, votação, apuração, registro de votos e atas do processo | P0 | BR-SST-025 |
| RF-SST-030 | **MandatoCIPA** e **MembroCIPA**: composição paritária, papel (presidente/vice/secretário/titular/suplente), bloqueio de candidato com dois mandatos consecutivos eleitos | P0 | BR-SST-021 |
| RF-SST-031 | Registro do período de estabilidade de cada membro eleito (do registro da candidatura até 1 ano após o fim do mandato) e **sinalização ao RH** em qualquer tentativa de desligamento nesse período | P0 | BR-SST-022 |
| RF-SST-032 | **ReuniaoCIPA** com ata obrigatória (ordinária mensal / extraordinária); pendência no dashboard SST quando falta ata do mês | P0 | BR-SST-023 |
| RF-SST-033 | Bloqueio de posse de membro (eleito ou designado) sem TreinamentoSST de CIPA registrado e válido | P0 | BR-SST-024 |
| RF-SST-034 | Deliberações de ReuniaoCIPA podem gerar zero-ou-muitas AcaoCorretiva | P1 | entidade (b).14 |

### 1.5 PGR/GRO e eSocial de Exposição — NR-1 (Processo A5)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-035 | Inventário de **RiscoOcupacional** por setor/GES: agente, fonte, severidade × probabilidade, medidas de controle, EPIs/exames vinculados | P1 | BR-SST-026 |
| RF-SST-036 | Todo setor produtivo deve ter ao menos um RiscoOcupacional avaliado, ou registro explícito de "ausência de risco identificado" | P1 | BR-SST-026 |
| RF-SST-037 | Plano de ação do PGR (hierarquia de controles: eliminação → engenharia → administrativo → EPI) com responsável, prazo, status | P1 | BR-SST-026, 027 |
| RF-SST-038 | Alerta de revisão periódica do inventário de riscos vencida, e gatilho de nova revisão obrigatória após acidente com afastamento no setor | P1 | BR-SST-027 |
| RF-SST-039 | Cadastro de **GES** (Grupo de Exposição Similar) com funcionários e riscos vinculados | P0 (base do S-2240) | entidade (b).16 |
| RF-SST-040 | Geração automática de pendência de evento **S-2240** a cada início/alteração de exposição de trabalhador a agente nocivo (vínculo funcionário × GES/risco) | P0 | BR-SST-028 |
| RF-SST-041 | Geração automática de pendência de evento **S-2220** a cada ASO realizado | P0 | BR-SST-029 |
| RF-SST-042 | Geração automática de pendência de evento **S-2210** a cada CAT emitida | P0 | BR-SST-015 |
| RF-SST-043 | Fila única de **EventoESocialSST** (status pendente/enviado/aceito/rejeitado) com recibo; eventos rejeitados permanecem visíveis, nunca descartados silenciosamente; dashboard SST exibe pendentes/rejeitados como pendência crítica | P0 | BR-SST-030 |

### 1.6 Treinamentos de Segurança (Processo A6)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-044 | **MatrizTreinamento**: função × norma exigida (NR-6, NR-10, NR-11, NR-12, NR-17, NR-20, brigada, primeiros socorros, CIPA, outro) × periodicidade de reciclagem | P0 | BR-SST-031 |
| RF-SST-045 | Registro de **TreinamentoSST** realizado: funcionário, norma/curso, data, carga horária, instrutor/entidade, certificado, validade calculada (reciclagem bienal para NR-10; demais parametrizáveis por norma) | P0 | BR-SST-031 |
| RF-SST-046 | Lista de bloqueio operacional: funcionário sem treinamento obrigatório válido para sua função, visível a liderança e SST | P0 | BR-SST-031 |
| RF-SST-047 | Controle de operador de empilhadeira (NR-11) com identificação/crachá de operador e alerta de vencimento de validade ao Almoxarifado | P0 | BR-SST-032 |

### 1.7 Rotina Preventiva — DDS, Inspeções, PT e Brigada (Processo A7)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-048 | **InspecaoSeguranca**: checklist por setor (extintores, proteção de máquina NR-12, sinalização NR-26, armazenagem NR-11, inflamáveis NR-20); não-conformidade gera **AcaoCorretiva** obrigatória | P1 | BR-SST-033 |
| RF-SST-049 | Sinalização imediata (tratativa) de não-conformidade classificada como risco grave e iminente | P1 | BR-SST-033 |
| RF-SST-050 | Consumo de status de inspeção/vencimento de extintores e proteções de máquina do módulo Patrimônio/Manutenção, com abertura de NC quando vencido | P1 | integração (d) — Patrimônio |
| RF-SST-051 | **PermissaoTrabalho (PT)**: atividade, tipo de risco, executantes, checklist de requisitos, autorizante SST, janela de validade; encerramento automático ao fim da janela | P2 (elevar a P0/P1 se confirmado enquadramento NR-10/33/35 rotineiro) | BR-SST-034 |
| RF-SST-052 | Cadastro/controle de **Brigadista** (formação, validade de reciclagem, ativo/inativo) e alerta quando o efetivo ativo cai abaixo do mínimo normativo | P1 | BR-SST-035 |
| RF-SST-053 | **RegistroDDS**: data, turno/setor, tema, condutor, lista de presença | P2 | entidade (b).22 |

### 1.8 Transversal — LGPD e Acesso a Dados de Saúde

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-SST-054 | Acesso a dados de saúde (ASO, exames, restrições, acidentes) restrito a perfis SST/Médico/RH autorizado, com log de acesso (leitura e escrita) | P0 | BR-SST-036 |
| RF-SST-055 | Acesso somente-leitura de Jurídico a Ficha de EPI/ASO/CAT para defesa em reclamatórias, com log | P1 | BR-SST-036, integração (d) — Jurídico |

**Total: 55 RF-SST catalogados** (32 P0, 18 P1, 5 P2 — soma bate com a
distribuição de prioridade do brief, seção f).

---

## 2. Requisitos Não Funcionais Específicos de SST (RNF-SST)

Este documento **não duplica** `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`.
Abaixo, apenas o que é específico do domínio SST e não está coberto pelo
catálogo geral.

| RNF | Descrição | Referência geral relacionada |
|---|---|---|
| RNF-SST-01 | Registros de EntregaEPI e Acidente confirmados são **imutáveis**: qualquer correção exige lançamento de estorno com `userId`, motivo e timestamp — nunca `UPDATE`/`DELETE` destrutivo (documentos com valor probatório em ação trabalhista/previdenciária) | RNF geral §2 (Auditoria de operações sensíveis) — aqui a exigência é mais forte: proíbe alteração, não só audita |
| RNF-SST-02 | Retenção mínima de Ficha de EPI e registros de Acidente/CAT: **20 anos** `[PRÁTICA DE MERCADO — prazo legal exato a confirmar]`; nenhuma rotina de limpeza/expurgo automática pode remover esses dados antes do prazo configurado | RNF geral §3 (não há política formal de retenção hoje — lacuna geral, aqui parametrizada para SST) |
| RNF-SST-03 | Fila de **EventoESocialSST** deve garantir que nenhum evento seja perdido ou descartado silenciosamente; falha de transmissão mantém o evento em `rejeitado` com motivo visível e permite reenvio manual | RNF geral §3 (disponibilidade/confiabilidade) |
| RNF-SST-04 | Cálculo simplificado do prazo legal da CAT: considera sábado/domingo como não úteis, sem calendário de feriados nacionais nesta versão (simplificação aprovada em APR-2026-056/CASE-011, FIND-ERP-008); o alerta deve escalonar (SST → gestor SST) conforme o prazo se aproxima, não apenas notificar uma vez | Novo — não coberto no RNF geral; feriados nacionais permanecem fora do escopo atual por decisão registrada |
| RNF-SST-05 | Log de **leitura** (não apenas escrita) para dados de saúde (ASO, exames, restrições) e para acidentes/CAT, disponível para auditoria LGPD (art. 5º, II e art. 11 da Lei 13.709/2018) | Estende RNF geral §2 (RBAC + AuditLog, hoje focado em ações de escrita) |
| RNF-SST-06 | A lista de bloqueio operacional por treinamento vencido (RF-SST-046) deve estar disponível para consulta pelo módulo de Apontamento de Produção antes de iniciar uma etapa — sem exigir sincronismo em tempo real, mas sem defasagem maior que a última leitura de tela (mesmo padrão de UC-43, "re-checagem manual ou automática ao reabrir a tela") | RNF geral §1 (desempenho) — aqui é um requisito de integração, não de latência de API |

---

## 3. Casos de Uso — Processos P0

Atores conforme perfis reais do projeto (`docs/business/01-USE_CASES.md`):
perfil de acesso configurável por módulo (`operate`/`approve`), mais os
papéis funcionais do brief (Técnico SST, Enfermeiro do Trabalho, Médico do
Trabalho, presidente/secretário da CIPA). O módulo de acesso `sst` **ainda
não existe** no catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`,
hoje com 30 chaves) — ver §5, pendência para arquitetos.

### UC-44: Homologar TipoEPI e Registrar Entrega ao Funcionário (Ficha de EPI)

**Ator principal:** Técnico SST (perfil `sst`, nível `operate`).
**Atores secundários:** Almoxarife (baixa de estoque via movimentação),
Funcionário (evidência de recebimento).

**Pré-condições:**
- Usuário autenticado com módulo `sst` nível `operate` ou superior.
- TipoEPI a entregar já cadastrado com CA informado.
- Funcionário existe em `employees` e está `active`.

**Fluxo Principal:**
1. Técnico SST cadastra/consulta o TipoEPI (nome, CA, validade do CA,
   fabricante, vida útil em dias, tamanhos), opcionalmente vinculado a um
   `Item` de estoque existente (RF-SST-001).
2. Sistema valida que o CA está preenchido e não vencido na data corrente
   (RF-SST-003/BR-SST-001); se inválido, bloqueia o cadastro/homologação.
3. Técnico SST registra EntregaEPI: seleciona funcionário, TipoEPI,
   quantidade, motivo (1ª entrega / troca periódica / dano / perda /
   mudança de função) (RF-SST-004).
4. Sistema calcula a data prevista de troca (entrega + vida útil do
   TipoEPI) (RF-SST-006).
5. Sistema exige evidência de recebimento (assinatura digitalizada, aceite
   eletrônico autenticado, ou biometria) antes de permitir a confirmação
   (RF-SST-005/BR-SST-002).
6. Ao confirmar, o sistema:
   - Registra a entrega como **imutável** (RF-SST-007).
   - Dispara movimentação de saída de estoque no `Item` vinculado (motivo
     "entrega EPI"), reaproveitando `/api/inventory/movements` — sem
     controle de saldo duplicado (integração (d) — Almoxarifado).
7. Ficha de EPI do funcionário é atualizada e pode ser
   impressa/exportada a qualquer momento (RF-SST-007).

**Fluxos Alternativos:**
- **A1 (Troca por vencimento):** sistema alerta SST com antecedência
  configurável (padrão 15 dias) antes da data prevista de troca
  (RF-SST-006); SST abre nova EntregaEPI com motivo "troca periódica".
- **A2 (Dano/extravio):** SST registra devolução do EPI danificado (data e
  condição) na entrega original e cria nova EntregaEPI com motivo "dano"
  ou "perda"; **não há desconto em folha** neste módulo — eventual processo
  disciplinar por culpa comprovada é tratado no RH, fora do escopo SST
  (BR-SST-003).
- **A3 (Desligamento):** evento de desligamento vindo do RH dispara
  checklist de devolução dos EPIs reutilizáveis em aberto (RF-SST-009); a
  Ficha de EPI é encerrada e permanece consultável/imprimível
  indefinidamente (RNF-SST-02).

**Fluxo de Exceção:**
- **E1 (CA vencido no ato da entrega):** sistema **bloqueia** a
  confirmação da EntregaEPI, exibindo "O QUE" (não é possível entregar este
  EPI), "POR QUE" (CA nº X venceu em DD/MM/AAAA) e "O QUE FAZER" (atualizar
  o cadastro do TipoEPI com um CA válido antes de nova tentativa) — padrão
  de UC-43. Nenhuma entrega é criada; nenhum estoque é debitado.
- **E2 (Confirmação sem evidência de recebimento):** sistema recusa a
  confirmação com HTTP 422/`BUSINESS_RULE_VIOLATION`, mantendo a entrega em
  rascunho até que a evidência seja anexada (BR-SST-002).
- **E3 (Estoque insuficiente do `Item` vinculado):** movimentação de saída
  falha; a EntregaEPI **não é confirmada** (transação atômica — entrega e
  baixa de estoque ocorrem juntas ou nenhuma ocorre); sistema orienta SST a
  disparar requisição de compra (RF-SST-010) ou escolher outro lote/tamanho.

**Pós-condições:**
- EntregaEPI confirmada e imutável, com estoque baixado.
- Ficha de EPI do funcionário refletindo a nova entrega.
- Pendência crítica (RF-SST-008) recalculada para esse funcionário.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Bloqueio de entrega com CA vencido
  Dado que o TipoEPI "Protetor Auricular Plug" tem CA com validade vencida
  Quando o Técnico SST tenta confirmar uma EntregaEPI desse TipoEPI
  Então o sistema bloqueia a confirmação
  E exibe o motivo com data de vencimento do CA
  E nenhuma movimentação de estoque é criada

Cenário: Entrega sem evidência de recebimento não pode ser confirmada
  Dado que uma EntregaEPI está com todos os dados preenchidos
  E nenhuma evidência de recebimento foi anexada
  Quando o Técnico SST tenta confirmar
  Então o sistema recusa a confirmação com 422
  E a entrega permanece em rascunho
```

---

### UC-45: Registrar ASO e Aplicar Bloqueios de Admissão/Retorno

**Ator principal:** Enfermeiro do Trabalho (agenda) / Médico do Trabalho
(assina o resultado) — perfil `sst`, nível `operate`/`approve`.
**Atores secundários:** RH (consome status via RF-SST-021), liderança
(notificada em caso de inaptidão).

**Pré-condições:**
- PlanoExames definido para a função/GES do funcionário (RF-SST-011).
- Funcionário existe em `employees`.

**Fluxo Principal:**
1. Sistema aponta ASO a vencer (a partir do PlanoExames e do histórico de
   ASOs do funcionário).
2. Enfermeiro do Trabalho agenda o exame com clínica/médico.
3. Exame é realizado; Médico do Trabalho registra o ASO: tipo (admissional
   / periódico / retorno ao trabalho / mudança de riscos / demissional),
   resultado (apto / inapto / apto com restrições), restrições, data,
   médico examinador, médico coordenador PCMSO (RF-SST-012).
4. Se aplicável, registra ExameComplementar (audiometria, espirometria
   etc.) vinculado ao ASO (RF-SST-013).
5. Sistema calcula a data de vencimento do próximo ASO periódico a partir
   do PlanoExames (RF-SST-016).
6. Sistema gera pendência de evento **S-2220** para este ASO (RF-SST-041).
7. Se resultado = "inapto" ou "apto com restrições" incompatível: sistema
   notifica SST, RH e liderança imediatamente e bloqueia o apontamento do
   funcionário na função de origem (RF-SST-018).

**Fluxos Alternativos:**
- **A1 (Admissão):** RH abre solicitação de ASO admissional à SST (fluxo
  do brief RH, processo P1) **antes** do início das atividades; SST realiza
  o exame; RH só efetiva `hire_date` após receber status "apto" via
  RF-SST-021 (RF-SST-014).
- **A2 (Retorno ao trabalho):** afastamento ≥ 30 dias (doença/acidente)
  exige ASO de retorno registrado antes da reativação do status do
  funcionário; RH consulta RF-SST-021 antes de reativar (RF-SST-015).
- **A3 (Mudança de função/setor):** mudança de função dispara recálculo do
  PlanoExames; se os riscos mudarem, sistema exige ASO de mudança de riscos
  **antes** da efetivação da transferência (RF-SST-016).
- **A4 (Exposição a ruído ≥ 85 dB(A)):** sistema agenda automaticamente a
  sequência de audiometria (admissional → 6 meses → anual) para
  funcionários dos setores/GES marcados como expostos (RF-SST-017).

**Fluxo de Exceção:**
- **E1 (Tentativa de admissão sem ASO apto):** RH tenta efetivar
  `hire_date`; sistema/integração bloqueia com "O QUE" (não é possível
  efetivar a admissão), "POR QUE" (ASO admissional pendente ou resultado
  não apto), "O QUE FAZER" (solicitar/aguardar exame junto à SST) —
  BR-SST-008.
- **E2 (Tentativa de reativação pós-afastamento sem ASO de retorno):**
  bloqueio análogo ao E1, referenciando BR-SST-009.
- **E3 (Acesso não autorizado ao dado clínico):** usuário sem módulo
  `sst`/`rh` autorizado tenta consultar detalhe do ASO (resultado,
  restrições, exame); sistema retorna 403 e registra tentativa em log de
  acesso (RF-SST-054/BR-SST-036) — dado sensível de saúde, LGPD art. 5º/11.

**Pós-condições:**
- ASO registrado, com vencimento calculado e evento S-2220 pendente na
  fila.
- Se inapto: bloqueio de apontamento ativo até novo ASO apto.
- RH capaz de consultar apenas o status de aptidão, nunca o conteúdo
  clínico (ver decisão de fronteira, §5).

---

### UC-46: Registrar Acidente de Trabalho e Emitir CAT no Prazo Legal

**Ator principal:** Técnico SST (perfil `sst`, nível `operate`).
**Atores secundários:** Liderança do setor (comunica), Enfermeiro do
Trabalho (atende), CIPA (participa da investigação).

**Pré-condições:**
- Funcionário existe em `employees`.
- Usuário autenticado com módulo `sst`.

**Fluxo Principal:**
1. Liderança comunica o acidente ao Enfermeiro do Trabalho e ao Técnico
   SST.
2. Técnico SST registra o Acidente: funcionário, data/hora, tipo (típico /
   trajeto / doença ocupacional), local, descrição, parte do corpo, agente
   causador, gravidade (sem afastamento / com afastamento / incapacidade
   permanente / óbito), testemunhas (RF-SST-022).
3. Sistema calcula o prazo-limite legal da CAT: até o 1º dia útil seguinte
   à ocorrência; imediato em caso de óbito (RF-SST-024/BR-SST-015).
4. Técnico SST emite a CAT vinculada ao acidente, dentro do prazo
   calculado; sistema gera pendência de evento **S-2210** (RF-SST-042).
5. Se gravidade = "com afastamento" ou pior: sistema exige abertura de
   InvestigacaoAcidente com ao menos uma AcaoCorretiva antes de permitir o
   encerramento do acidente (RF-SST-026/BR-SST-018).
6. Dias perdidos são lançados (atualizáveis) e conciliados com afastamento
   no RH (RF-SST-027).
7. Retorno do funcionário exige ASO de retorno se afastamento ≥ 30 dias
   (elo com UC-45).

**Fluxos Alternativos:**
- **A1 (Acidente sem afastamento):** é registrado normalmente para
  estatística/investigação; a emissão de CAT é decisão do Técnico SST,
  registrada com justificativa (RF-SST-025/BR-SST-016).
- **A2 (Reabertura de CAT):** nova CAT do tipo "reabertura" é vinculada ao
  mesmo acidente, sem alterar o registro original (imutabilidade,
  RF-SST-023).

**Fluxo de Exceção:**
- **E1 (Prazo da CAT prestes a vencer ou vencido):** sistema escala alerta
  (Técnico SST → gestor SST) conforme a proximidade do prazo-limite
  (RNF-SST-04); se o prazo for ultrapassado, o registro **não é bloqueado**
  (a comunicação do acidente é obrigação legal independente do atraso),
  mas o evento S-2210 correspondente permanece marcado como pendência
  crítica e não pode ser removido/ocultado (RF-SST-043/BR-SST-030).
- **E2 (Tentativa de encerrar acidente com afastamento sem investigação):**
  sistema bloqueia o encerramento com "O QUE"/"POR QUE"/"O QUE FAZER"
  apontando a ausência de InvestigacaoAcidente ou AcaoCorretiva
  (BR-SST-018).
- **E3 (Tentativa de alterar/apagar acidente já confirmado):** sistema
  rejeita `UPDATE`/`DELETE` direto; qualquer complemento (ex.: dias
  perdidos) deve ser um lançamento adicional com trilha de auditoria
  (RNF-SST-01/BR-SST-017).

**Pós-condições:**
- Acidente registrado de forma imutável; CAT emitida (ou decisão registrada
  de não emitir, se sem afastamento); evento S-2210 na fila.
- Se aplicável, InvestigacaoAcidente e AcaoCorretiva abertas.
- Estatísticas de TF/TG (KPIs, seção e do brief) recalculadas.

---

### UC-47: Gerenciar Fila de Eventos eSocial SST (S-2210 / S-2220 / S-2240)

**Ator principal:** Técnico SST / responsável pela transmissão eSocial
(perfil `sst`, nível `approve` para reenvio).
**Atores secundários:** RH (canal de transmissão compartilhado, ver
integração (d) do brief).

**Pré-condições:**
- Existe pelo menos um CAT, ASO ou vínculo GES/risco-funcionário que gerou
  pendência de evento.

**Fluxo Principal:**
1. Cada CAT confirmada gera exatamente um evento S-2210 pendente
   (RF-SST-042).
2. Cada ASO registrado gera exatamente um evento S-2220 pendente
   (RF-SST-041).
3. Cada início/alteração de exposição de trabalhador a agente nocivo
   (vínculo GES/risco) gera um evento S-2240 pendente (RF-SST-040).
4. Responsável pela transmissão consulta a fila (dashboard SST), vê status
   (pendente/enviado/aceito/rejeitado), prazo legal calculado e recibo
   quando aceito (RF-SST-043).
5. Transmissão ocorre pela infraestrutura compartilhada com o RH (fila
   separada por domínio, conforme integração (d) do brief) — a
   transmissão física (certificado digital/webservice) está fora de
   escopo deste bloco.

**Fluxos Alternativos:**
- **A1 (Reenvio manual):** evento rejeitado pode ser reenviado
  manualmente após correção; o evento original rejeitado permanece
  visível no histórico (não é sobrescrito) — RNF-SST-03.

**Fluxo de Exceção:**
- **E1 (Evento rejeitado ou vencido):** sistema não permite ocultar,
  descartar ou marcar como resolvido sem um novo envio aceito; o dashboard
  SST mantém o evento como pendência crítica indefinidamente até status
  `aceito` (RF-SST-043/BR-SST-030).
- **E2 (Falha de infraestrutura de transmissão):** evento permanece
  `pendente`; sistema não perde o registro nem duplica o envio ao
  reprocessar a fila (idempotência por identificador de origem —
  CAT/ASO/vínculo).

**Pós-condições:**
- Fila de eventos SST auditável a qualquer momento; nenhum evento perdido.

---

### UC-48: Gerir Mandato, Membros e Reuniões da CIPA

**Ator principal:** Técnico SST (assessora o processo) / Presidente da
CIPA (conduz reuniões) — perfil `sst`.
**Atores secundários:** RH (recebe sinalização de estabilidade),
Secretário da CIPA (lavra atas).

**Pré-condições:**
- Headcount ativo disponível (via RH) para cálculo de dimensionamento.

**Fluxo Principal:**
1. Sistema calcula o dimensionamento da CIPA (titulares/suplentes por
   representação) a partir do headcount ativo e do enquadramento CNAE
   (RF-SST-028/BR-SST-020).
2. Técnico SST abre ProcessoEleitoralCIPA para o próximo mandato: edital,
   inscrição de candidatos, votação, apuração (RF-SST-029).
3. Sistema valida que nenhum candidato já cumpriu dois mandatos
   consecutivos como eleito (RF-SST-030/BR-SST-021).
4. MandatoCIPA é criado com MembroCIPA (eleitos + designados), papéis
   (presidente/vice/secretário/titular/suplente).
5. Sistema registra o período de estabilidade de cada membro eleito
   (candidatura → fim do mandato + 1 ano) (RF-SST-031).
6. Membro só toma posse com TreinamentoSST de CIPA válido registrado
   (RF-SST-033/BR-SST-024).
7. Mensalmente, ReuniaoCIPA ordinária é registrada com ata; ausência gera
   pendência no dashboard (RF-SST-032/BR-SST-023).

**Fluxos Alternativos:**
- **A1 (Reunião extraordinária):** registrada após acidente grave, sem
  aguardar a periodicidade mensal.
- **A2 (Deliberação gera ação):** ata de reunião pode gerar
  AcaoCorretiva vinculada (RF-SST-034).
- **A3 (Mudança de faixa de headcount):** sistema alerta para adequação do
  dimensionamento no próximo mandato, sem alterar o mandato vigente em
  curso (RF-SST-028).

**Fluxo de Exceção:**
- **E1 (Tentativa de desligar funcionário estável):** RH tenta processar
  desligamento de um MembroCIPA dentro do período de estabilidade; sistema
  sinaliza com aviso forte ("O QUE": desligamento bloqueado por
  estabilidade sindical/CIPA; "POR QUE": estabilidade vigente até
  DD/MM/AAAA; "O QUE FAZER": decisão jurídica/RH necessária antes de
  prosseguir) — o módulo SST **não decide** juridicamente, apenas trava com
  aviso (RF-SST-031/BR-SST-022).
- **E2 (Posse sem treinamento válido):** sistema bloqueia o registro de
  posse do membro até que o TreinamentoSST de CIPA esteja registrado e
  dentro da validade (BR-SST-024).

**Pós-condições:**
- Mandato e membros ativos com estabilidade rastreada; RH consulta
  (read-only) a lista de estáveis antes de qualquer desligamento.
- Atas mensais consolidadas para relatório de aderência (KPI).

---

## 4. Regras de Negócio — Mapeamento (BR-SST → RF)

As 36 regras de negócio já estão formalizadas com base legal em
`docs/business/briefs/BRIEF_SST_2026-08-06.md`, seção (c). Este bloco não as
reescreve; a Matriz de Rastreabilidade (§6) amarra cada `BR-SST-NNN` ao(s)
RF(s) e UC(s) correspondentes. Regras que precisam de parametrização (não
hard-code) porque o prazo legal exato depende de confirmação com o técnico
SST da empresa: BR-SST-014, 016, 025, 028, 029, 031, 035 — todas sinalizadas
também na seção 5 abaixo.

Quando este bloco for consolidado, as regras aplicáveis devem ser
transcritas (não resumidas) em `docs/business/BUSINESS_RULES.md`, mantendo
os códigos `BR-SST-NNN` originais do brief para não quebrar rastreabilidade.

---

## 5. Decisões e Pendências para Arquitetos

### 5.1 Fronteira ASO — SST × RH (conflito resolvido)

**Decisão:** ASO é uma **entidade própria do módulo SST** (tabela/model
dedicado — não um registro em `employee_documents`), conforme
BR-SST-010 e RF-SST-012. O RH **não persiste** dados clínicos de ASO; ele
**consome** um status derivado (apto / vencido / inapto / apto com
restrições) através de um endpoint de leitura dedicado (RF-SST-021).

Justificativa: o brief SST recomenda explicitamente essa fronteira
(BR-SST-010, "o RH consome o status, mas o dado-mestre é do módulo SST") e
o brief RH, de forma independente, já assume o mesmo desenho no processo
P1 (Admissão): *"RH solicita ASO admissional à SST → consome o resultado
(apto/inapto + validade); o exame em si é processo da SST"*. Não há
divergência real entre os dois briefs — apenas era preciso declarar
formalmente para não haver retrabalho de modelagem dupla.

**Implicação para AdmDBA:** uma única tabela `aso` (ou equivalente) no
domínio SST, com FK para `employees`; RH não ganha coluna de ASO em
`employees`/`employee_documents` — apenas consulta via API/join de leitura.

**Implicação para ArquitetoSoftwareAPI:** o endpoint de status de aptidão
(RF-SST-021) deve expor o mínimo necessário para o gate de admissão/retorno
do RH (ex.: `{ status: 'apto'|'inapto'|'apto_com_restricoes'|'pendente', vencimento }`),
nunca o conteúdo clínico completo (restrições em texto livre, laudo,
médico) — isso permanece protegido por RF-SST-054/BR-SST-036.

### 5.2 Mapeamento EPI → Item de estoque

TipoEPI tem vínculo **opcional, no máximo 1:1**, com um `Item` do
almoxarifado existente (entidade (b).1 do brief). A saída de estoque na
entrega **não deve duplicar controle de saldo**: a EntregaEPI dispara uma
movimentação usando o fluxo já existente de `/api/inventory/movements`
(motivo "entrega EPI"), a mesma engrenagem usada por outros módulos. Não
deve haver uma segunda fonte de verdade para saldo de EPI. Isso implica:
- FK de `TipoEPI.item_id` → `Item.id`, nullable (nem todo EPI
  necessariamente rastreado como item de estoque no dia 1, embora seja a
  prática recomendada).
- Reuso do serviço/use-case de movimentação de estoque já existente, em vez
  de escrever lógica de baixa paralela dentro do módulo SST.

### 5.3 Novo módulo de RBAC (`sst`)

O catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`,
hoje 30 chaves, incluindo `rh` adicionado em 2026-08-06) **não tem** uma
chave `sst`. Este bloco assume que ela será criada quando o módulo for
implementado, seguindo o mesmo padrão de `rh`: dado sensível de saúde exige
segregação de campo, não apenas bloqueio de rota inteira (ver RF-SST-021,
que expõe status sem dado clínico mesmo para quem não tem `sst`).
Recomendação: `sst` deve ter comportamento **mais restritivo** que `rh` —
para a maioria das entidades (ASO, Acidente, CAT), o acesso de leitura
completo exige o módulo `sst` (não basta autenticação, como ocorre hoje
com `GET /api/employees`).

### 5.4 Itens `[VERIFICAR COM TÉCNICO SST DA EMPRESA]` que afetam modelagem

Não exigem resposta agora, mas devem ser parametrizados (não hard-coded) na
modelagem para não exigir migração de schema quando confirmados:
1. CAs reais dos EPIs do estoque atual (os números em `01-SST.md` são
   placeholders — RF-SST-001 não deve semear CAs fictícios em produção).
2. Prazo exato do ASO demissional e critério de dispensa (RF-SST-019).
3. CNAE/enquadramento no Quadro I da NR-5 para dimensionamento da CIPA
   (RF-SST-028) — campo de configuração, não constante.
4. Prazos exatos de cada etapa do calendário eleitoral da CIPA
   (RF-SST-029).
5. Horas de treinamento obrigatório de cipeiro conforme grau de risco da
   EVOK (RF-SST-033).
6. Prazo de revisão periódica do inventário de riscos do PGR conforme
   enquadramento da empresa (RF-SST-038).
7. Prazo de envio do S-2240 e do S-2220 conforme calendário eSocial vigente
   (RF-SST-040, RF-SST-041) — campo de configuração de prazo, com valor
   default documentado como prática de mercado até confirmação.
8. Validades específicas de reciclagem por norma além da NR-10 (bienal,
   confirmada) — parametrizar por norma em vez de fixar (RF-SST-045).
9. Efetivo mínimo de brigada conforme NBR 14276 / IT do Corpo de Bombeiros
   estadual (RF-SST-052).
10. Quais NRs específicas (NR-10 energizada, NR-33 espaço confinado, NR-35
    altura) realmente se aplicam à planta para decidir se PT (RF-SST-051)
    deve subir de P2 para P0/P1.
11. Existência de exposição que gere aposentadoria especial/LTCAT na EVOK
    (fora de escopo de build, mas afeta se o inventário de riscos precisa
    de um campo de enquadramento).

### 5.5 Fora de escopo deste bloco (herdado do brief, reforçado)

Folha/afastamento INSS/benefícios (RH); LTCAT/laudo de insalubridade com
efeito em adicional salarial (engenharia/medicina externa + folha);
AVCB/projeto de combate a incêndio (Facilities/Jurídico); transmissão física
ao eSocial (infraestrutura compartilhada, especificada uma única vez fora
deste brief). Nenhum RF acima cobre esses itens — se aparecerem pedidos
nesse sentido, é uma mudança de escopo que exige um novo brief.

---

## 6. Matriz de Rastreabilidade — Brief → RF → Caso de Uso

| Processo do brief | BR-SST | RF-SST | UC |
|---|---|---|---|
| A1 — Gestão de EPI | 001–007 | 001–010 | UC-44 |
| A2 — ASO/PCMSO | 008–014 | 011–021 | UC-45 |
| A3 — Acidente/CAT | 015–019 | 022–027 | UC-46 |
| A4 — CIPA | 020–025 | 028–034 | UC-48 |
| A5 — PGR/GRO + eSocial | 026–030 | 035–043 | UC-47 (eSocial) + RF-035–039 sem UC formal dedicado neste bloco (P1, ver §7) |
| A6 — Treinamentos | 031, 032 | 044–047 | sem UC formal dedicado neste bloco (P0, mas processo simples de CRUD+validade — ver §7) |
| A7 — Rotina preventiva (DDS/Inspeção/PT/Brigada) | 033–035 | 048–053 | sem UC formal dedicado neste bloco (P1/P2 — ver §7) |
| Transversal — LGPD | 036 | 054, 055 | tratado como fluxo de exceção em UC-45/UC-46, não UC isolado |

---

## 7. Pendência declarada — Casos de Uso P1/P2 não detalhados neste bloco

Este BLOCO 1 detalha (com fluxo principal/alternativo/exceção completos)
os 5 processos P0 que exigem workflow mais complexo (EPI, ASO, Acidente/CAT,
eSocial, CIPA). Os RFs de PGR/GRO (035-039), Treinamentos (044-047) e
Rotina Preventiva (048-053) estão catalogados com prioridade e regra de
negócio, mas **sem Caso de Uso formal detalhado neste passo** — são CRUDs
com regra de vencimento/validade mais simples (padrão já resolvido em outros
módulos do sistema, ex.: RF-PAT-03/04 de Manutenção). Recomenda-se que o
próximo bloco do pipeline SST (ou o mesmo `AnalistaNegocios` em uma segunda
passada) escreva os UCs formais (UC-49 em diante) antes da modelagem
definitiva dessas tabelas, para não gerar ambiguidade de fluxo de exceção
nelas também — em particular RF-SST-046 (bloqueio operacional por
treinamento vencido) tem impacto direto no módulo de Produção/Apontamento e
merece um UC dedicado com o fluxo de exceção do lado de Produção, não só do
lado de SST.

---

## Referências

- `docs/business/briefs/BRIEF_SST_2026-08-06.md` — brief de domínio (insumo
  primário deste documento).
- `docs/business/briefs/BRIEF_RH_2026-08-06.md` — fronteira ASO SST×RH,
  processo de Admissão (P1).
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de RF por
  módulo (a atualizar com a seção SST quando este bloco for consolidado).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNF gerais do projeto.
- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — UC-01 a
  UC-43 (numeração continuada a partir de UC-44 neste bloco).
- `server/src/models/Employee.ts` — âncora de todas as entidades SST.
- `server/src/shared/domain/accessModules.ts` — catálogo de módulos RBAC
  (pendência: criar chave `sst`, ver §5.3).
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamento 15 (SST).

**Fim do BLOCO 1.**
