# BLOCO 3 — Módulo Jurídico (JUR) — Requisitos Formais

**Departamento:** 16 — Jurídico, conforme `docs/00-ESTRUTURA_ORGANIZACIONAL.md`.
**Insumo:** `docs/business/briefs/BRIEF_JUR_2026-08-06.md` (seções (a)-(f):
5 processos P1-P5 — contratos, contencioso, procurações, LGPD, propriedade
intelectual —, ~30 entidades, 26 regras de negócio `BR-JUR-001` a `BR-JUR-051`
(numeração por bloco temático, não sequencial contínua), 6 integrações
internas, 12 KPIs, priorização P0/P1/P2, 7 itens
`[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`).
**Autor:** Agente Especialista em Engenharia de Requisitos.
**Data:** 2026-08-07.
**Status:** 🟡 Especificação de requisitos pronta para modelagem de
banco/API (`AdmDBA` / `ArquitetoSoftwareAPI`). **Nenhum código foi criado
neste passo** — Jurídico não existe hoje em `server/src/` (model, rota ou
use-case dedicado). Reaproveitamentos verificados: `Supplier`, `Client`,
`Employee`, `AccountPayable`, `AuditLog` (todos em `server/src/models/`).

**Prefixo de módulo:** `JUR` — não colide com os prefixos existentes em
`docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` (AUT, VEN, COM, EST, PRD, QUA,
FIN, PAT, RH, REL, INT) nem com `SST`/`TI` (Blocos 1 e 2). É um prefixo novo e
legítimo: Jurídico é um domínio próprio (departamento 16), sem sobreposição
funcional com nenhum dos módulos já catalogados — a sobreposição de dados é
deliberada e documentada (contratos referenciam `suppliers`/`clients`/
`employees`; custos de processo lançam em `accounts_payable`; nunca tabela
paralela). Quando este bloco for consolidado pelo `documentador`, uma nova
seção "15. Jurídico (RF-JUR)" deve ser adicionada ao índice executivo.

**Numeração de Casos de Uso:** o último UC formal registrado é UC-51 (Bloco 2
TI, já migrado para `docs/projeto/04-USE_CASES.md` como "implementado"). Os
casos de uso deste bloco continuam a partir de **UC-52**, sem reaproveitar
nem colidir com números existentes.

**Catálogo RBAC verificado:** `server/src/shared/domain/accessModules.ts`
tem hoje 31 chaves, incluindo `rh`, `sst` e `ti` (todas marcadas como dados
sensíveis com padrão restritivo). **`juridico` ainda não existe** — ver §5.1.

---

## 1. Requisitos Funcionais (RF-JUR)

Cada RF referencia o(s) processo(s) do brief (P1-P5) e a(s) regra(s) de
negócio `BR-JUR-NNN` aplicável(is). Prioridade conforme seção (f) do brief.

### 1.1 Gestão de Contratos — ciclo de vida ponta a ponta (Processo P1)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-001 | Cadastro de **Contrato** (`contracts`): número gerado pelo sistema (CT-AAAA-NNNN), tipo (commercial/employment/supplier/service/rental/nda/distribution/commercial_representation/trademark_license/other), objeto, contraparte — mutuamente exclusiva entre `supplier_id`/`client_id`/`employee_id`/avulsa (`counterparty_name`/`counterparty_doc` quando `counterparty_type='other'`), valor, moeda, vigência (`start_date`/`end_date`, NULL = indeterminado) | P0 | BR-JUR-001 |
| RF-JUR-002 | Upload de minuta versionada (**ContratoDocumento**): sequência v1, v2..., autor, data, observações, flag `is_signed_version` para a versão final assinada | P0 | processo P1.2 |
| RF-JUR-003 | Aprovação interna com alçada configurável por valor/tipo (tabela de configuração, não hard-code) | P1 | processo P1.3, `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` — alçadas reais |
| RF-JUR-004 | Registro de assinatura: data, **ContratoSignatario** (mínimo 2 partes tipo `party_a`/`party_b`); sistema recomenda (aviso, não bloqueio) 2 testemunhas — contrato com 2 testemunhas é título executivo extrajudicial | P0 | BR-JUR-004, CPC art. 784, III |
| RF-JUR-005 | Todo contrato com `end_date` definida recebe automaticamente, na ativação, um **AlertaJuridico** de vencimento com antecedência default de 60 dias (configurável por contrato); contrato não pode ficar `active` sem `responsible_user_id` | P0 | BR-JUR-001 |
| RF-JUR-006 | Contrato com `renewal_auto=true` e `notice_days>0` gera alerta adicional em (`end_date` − `notice_days` − 15 dias) para não perder a janela de denúncia | P0 | BR-JUR-002 |
| RF-JUR-007 | Registro de índice de reajuste (IPCA/IGP-M/INPC/other/none) e data-base; alerta gerado na data de reajuste; cálculo do novo valor permanece manual (índice vem de fonte externa) | P1 | processo P1.6 |
| RF-JUR-008 | **ContratoAditivo**: referencia o contrato-pai, número sequencial único no par, tipo de alteração (term/value/clause/party/other); ao ser assinado, atualiza os campos vigentes do contrato (`new_end_date`/`new_value`) e recalcula os alertas, mantendo o registro do aditivo e os valores anteriores imutáveis | P0 | BR-JUR-003 |
| RF-JUR-009 | Encerramento de contrato: `terminated` exige `termination_reason` e data; `expired`/`terminated` não podem retornar a `active` (renovação = aditivo antes do fim, ou novo contrato encadeado) | P0 | BR-JUR-006 |
| RF-JUR-010 | Checklist obrigatório de cláusulas (PI, confidencialidade, não concorrência) para contratos `employment`/`supplier`/`nda` antes da aprovação; resposta "não se aplica" é permitida mas registrada | P1 | BR-JUR-005 |
| RF-JUR-011 | Contrato encerrado (`expired`/`terminated`) permanece consultável indefinidamente; nenhum registro de contrato é excluído fisicamente | P0 | BR-JUR-007 |

### 1.2 Contencioso — Processos Judiciais/Administrativos e Provisão (Processo P2)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-012 | Cadastro de **ProcessoJudicial** (`legal_cases`): número CNJ único, tipo (labor/civil/tax/consumer/regulatory/administrative), papel (autor/réu/terceiro), parte contrária (com FK opcional para `employees`/`suppliers`/`clients`), vara/tribunal, advogado externo, valor da causa, responsável interno (`internal_responsible_user_id`, obrigatório) | P0 | BR-JUR (processo P2.1) |
| RF-JUR-013 | Cadastro de **AdvogadoExterno**: nome, OAB, escritório, CPF/CNPJ, contato, especialidade, honorários, vínculo opcional a `suppliers.id` para faturamento via Contas a Pagar | P0 | processo P2.1 |
| RF-JUR-014 | Registro cronológico de **ProcessoAndamento** (`legal_case_events`): imutável — correção gera novo registro, nunca edição do existente | P0 | processo P2.2 |
| RF-JUR-015 | Todo processo `active` deve ter avaliação de risco vigente (probable/possible/remote — nomenclatura CPC 25); `risk_class=probable` exige `provisioned_amount > 0` com justificativa (`rationale`) | P0 | BR-JUR-015 |
| RF-JUR-016 | **ProvisaoContingencia** (`legal_case_provisions`) é histórico append-only: cada reavaliação gera nova linha; a vigente é sempre a mais recente por processo — é esta série que a Controladoria consome para o balanço | P0 | BR-JUR-015 |
| RF-JUR-017 | Pendência de reavaliação de risco disparada a cada `ProcessoAndamento` do tipo `decision` e, no mínimo, a cada 90 dias por processo ativo (periodicidade sujeita a confirmação) | P0 | BR-JUR-016, `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` |
| RF-JUR-018 | Lançamento de custos do processo (honorários, custas, perícias) em `accounts_payable` com categoria "Jurídico" e vínculo ao processo; depósito judicial/recursal é registrado com tipo próprio, nunca confundido com despesa | P1 | BR-JUR-017 |
| RF-JUR-019 | Encerramento do processo: `won`/`lost`/`settled` (com valor e parcelas → Contas a Pagar quando houver acordo) ou `archived`; processo encerrado nunca é excluído | P0 | processo P2 (Encerramento) |
| RF-JUR-020 | Relatório "valor provisionado vigente por processo e total" e "exposição possível" (soma de `claim_amount` classe `possible`) consumidos pelo Financeiro/Controladoria | P0 | integração (d) — Financeiro, KPI seção (e) |

### 1.3 Prazos Processuais Fatais — o núcleo crítico do módulo (Processo P2)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-021 | **PrazoProcessual** (`legal_case_deadlines`) exige `responsible_user_id` **NOT NULL**; é proibido criar prazo sem responsável nomeado — sem exceção, inclusive para rascunho | P0 | BR-JUR-010 |
| RF-JUR-022 | Prazo com `is_fatal=true` gera automaticamente alertas redundantes em D-7, D-3, D-1 e D0 para o responsável; se não houver `acknowledge` até D-3, escala automaticamente para `escalation_user_id` (Assessor Jurídico); alertas de prazo fatal **não podem ser desativados** por nenhum usuário, inclusive admin | P0 | BR-JUR-011 |
| RF-JUR-023 | A data fatal é sempre informada manualmente pelo advogado (já calculada); o sistema **não calcula** prazos processuais em nenhuma hipótese — contagem depende de intimação, rito e feriados locais (dias úteis) e erro de cálculo automático gera responsabilização | P0 | BR-JUR-012, CPC arts. 219/224, CLT art. 775 |
| RF-JUR-024 | Baixa de prazo fatal exige **dupla confirmação**: (1º) responsável registra cumprimento com evidência (`evidence_file_path` — protocolo); (2º) usuário distinto confirma (`confirmed_by`); o sistema rejeita `fulfilled_by = confirmed_by` | P0 | BR-JUR-013 |
| RF-JUR-025 | Prazo fatal vencido sem baixa muda automaticamente para `missed`, dispara notificação imediata a Assessor e Diretoria, e não pode ser baixado retroativamente sem justificativa registrada em campo próprio (nunca silenciosamente) | P0 | BR-JUR-014 |

### 1.4 Procurações e Atos Societários (Processo P3)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-026 | Cadastro de **Procuracao** (`proxies`): outorgante (default "EVOK ÁUDIO LTDA"), outorgado (nome/doc, FK opcional `employee_id`/`external_lawyer_id`), poderes (texto + tags: ad_judicia/ad_negotia/banking/other), forma (pública/particular), data de emissão, vigência (`expiration_date`, NULL = indeterminada) | P1 | processo P3.1 |
| RF-JUR-027 | Alerta de vencimento de procuração com antecedência configurável (default 30 dias) | P1 | BR-JUR-021 |
| RF-JUR-028 | Revogação (`status='revoked'`) exige data e registro de comunicação; procuração revogada **nunca** aparece em listagens de vigentes, imediatamente após o registro | P1 | BR-JUR-020, Código Civil art. 682, I |
| RF-JUR-029 | Procuração com `expiration_date` vencida muda automaticamente para `expired` (verificação ao acessar/rotina agendada, mesmo padrão de UC-43); nenhuma procuração `expired` aparece como vigente | P1 | BR-JUR-020 |
| RF-JUR-030 | Repositório documental de atos societários (alterações contratuais, atas, livros): data, tipo, número de registro na Junta Comercial — gestão simples de documentos, sem workflow próprio | P1 | processo P3.4 |

### 1.5 Propriedade Intelectual (Processo P5)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-031 | Cadastro de **AtivoPI** (`intellectual_property`): tipo (trademark/patent/utility_model/industrial_design/copyright/trade_secret), nº de registro, datas (depósito/concessão/expiração/próxima anuidade), status, responsável | P1 | processo P5.1 |
| RF-JUR-032 | Alertas de renovação/anuidade por tipo: marca 12 meses antes da expiração (vigência 10 anos, prorrogável — LPI art. 133); patente anuidade anual (LPI art. 84); desenho industrial, alerta de prorrogação quinquenal (LPI art. 108); janelas exatas por ativo sujeitas a conferência nos certificados | P1 | BR-JUR-030, `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` |
| RF-JUR-033 | Ativo tipo `trade_secret` **nunca** armazena o conteúdo do segredo — apenas metadados (descrição genérica, área detentora, contratos de proteção vinculados); leitura restrita a `role='admin'` + módulo `juridico` | P1 | BR-JUR-031, LPI art. 195, XI-XII |
| RF-JUR-034 | Vínculo N:N **AtivoPI × Contrato** (`ip_contract_links`): NDA que protege segredo, licenciamento de marca referenciando o ativo "Marca EVOK" | P1 | processo P5.4 |

### 1.6 LGPD — RoPA, Atendimento a Titular e Incidentes (Processo P4)

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-035 | Cadastro de **LgpdAtividadeTratamento** (RoPA, `lgpd_processing_activities`): finalidade, base legal (rol taxativo do art. 7º da LGPD), categorias de dados, categorias de titulares, tabela/sistema de origem no ERP, compartilhamentos, prazo de retenção, medidas de segurança, área dona (`department_id`) | P1 | BR-JUR-043, LGPD art. 37 |
| RF-JUR-036 | RoPA deve cobrir, no mínimo, as tabelas do ERP com dados pessoais verificadas (`employees`, `clients` PF, `suppliers` contatos, `users`) e ter revisão anual registrada | P1 | BR-JUR-043 |
| RF-JUR-037 | Registro de **LgpdSolicitacaoTitular**: tipo (confirmation/access/correction/anonymization/deletion/portability/consent_revocation/info_sharing — LGPD art. 18), verificação de identidade obrigatória, `due_date` automática = data de recebimento + 15 dias (art. 19, II) | P1 | BR-JUR-040 |
| RF-JUR-038 | Alertas ao encarregado em D-5 e D-1 antes do vencimento do prazo de resposta; solicitações de acesso em formato simplificado sinalizadas para resposta imediata | P1 | BR-JUR-040 |
| RF-JUR-039 | Solicitação só avança de `verifying` para `in_progress` com `identity_verified=true` registrado (quem verificou); recusa de pedido exige justificativa obrigatória registrada | P1 | BR-JUR-041 |
| RF-JUR-040 | Registro de **LgpdIncidente** (`lgpd_incidents`): ocorrência, detecção, descrição, categorias/titulares afetados, avaliação de risco, decisão registrada sobre comunicação à ANPD/titulares com justificativa obrigatória em ambos os sentidos (comunicar ou não), plano de ação | P1 | BR-JUR-042, LGPD art. 48 |
| RF-JUR-041 | Papel de **Encarregado (DPO)** — FK `users.id` — recebe os alertas de solicitações de titular e de incidentes | P1 | BR-JUR (processo P4.4), LGPD art. 41 |

### 1.7 Transversal — RBAC, Auditoria e Integrações

| RF | Descrição | Prioridade | BR aplicável |
|---|---|---|---|
| RF-JUR-042 | Nova chave `juridico` no catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`), com níveis `operate` (Assessor/estagiário — gestão completa) e `approve` (aprovação de alçadas, decisões de comunicação LGPD); perfil `financeiro` só enxerga provisões e custos (relatório derivado), nunca o conteúdo do contencioso ou LGPD | P0 | BR-JUR-050 |
| RF-JUR-043 | Toda ação de escrita no módulo gera trilha de auditoria (usuário, data, antes/depois), reutilizando `AuditLog` já existente | P0 | BR-JUR-051 |
| RF-JUR-044 | Nenhum registro de contrato, processo, prazo, provisão, procuração ou incidente é excluído fisicamente; correções geram novo registro/estorno com trilha | P0 | BR-JUR-007 |
| RF-JUR-045 | Exibição de contratos vigentes/vencidos na ficha do fornecedor (`suppliers`) e do cliente (`clients`), consumindo `contracts.supplier_id`/`client_id` — leitura, sem duplicar dado | P1 | integração (d) — Compras/Vendas |
| RF-JUR-046 | Acesso somente-leitura do módulo `sst` a Ficha de EPI/ASO/CAT segue sendo interno ao SST; o Jurídico obtém, quando necessário, exportação/relatório específico para defesa em reclamatórias — **não é leitura direta das tabelas de saúde** (fronteira de dado sensível preservada) | P2 | referência cruzada BR-SST-036 (Bloco 1) |

**Total: 46 RF-JUR catalogados** (23 P0, 21 P1, 2 P2).

---

## 2. Entidades — Referência Rápida (do brief, seção b)

Não há redesenho de entidade neste bloco — a modelagem de campos é
responsabilidade do `AdmDBA`. Lista de âncora para rastreabilidade (nomes de
tabela sugeridos pelo brief, sujeitos a ajuste do AdmDBA):

| Entidade | Tipo | Observação |
|---|---|---|
| `Contrato` (`contracts`) | nova | núcleo do módulo (RF-JUR-001 a 011) |
| `ContratoAditivo` (`contract_addendums`) | nova | histórico imutável (RF-JUR-008) |
| `ContratoSignatario` (`contract_signatories`) | nova | partes/testemunhas (RF-JUR-004) |
| `ContratoDocumento` (`contract_documents`) | nova | minutas versionadas (RF-JUR-002) |
| `AlertaJuridico` (`legal_alerts`) | nova | entidade única de alerta para todo o módulo (RF-JUR-005, 006, 022, 027, 032, 038) |
| `ProcessoJudicial` (`legal_cases`) | nova | contencioso (RF-JUR-012 a 020) |
| `ProcessoAndamento` (`legal_case_events`) | nova | cronologia imutável (RF-JUR-014) |
| `PrazoProcessual` (`legal_case_deadlines`) | nova | núcleo crítico (RF-JUR-021 a 025) |
| `ProvisaoContingencia` (`legal_case_provisions`) | nova | histórico append-only (RF-JUR-015, 016) |
| `AdvogadoExterno` (`external_lawyers`) | nova | vínculo opcional a `suppliers` (RF-JUR-013) |
| `Procuracao` (`proxies`) | nova | (RF-JUR-026 a 029) |
| `AtivoPI` (`intellectual_property`) | nova | (RF-JUR-031 a 034) |
| `LgpdAtividadeTratamento` (`lgpd_processing_activities`) | nova | RoPA (RF-JUR-035, 036) |
| `LgpdSolicitacaoTitular` (`lgpd_data_subject_requests`) | nova | (RF-JUR-037 a 039) |
| `LgpdIncidente` (`lgpd_incidents`) | nova | (RF-JUR-040) |
| `Supplier` (`server/src/models/Supplier.ts`) | reutilizada | contraparte de contrato de fornecimento (BR-JUR contratos) |
| `Client` (`server/src/models/Client.ts`) | reutilizada | contraparte de contrato comercial/distribuição |
| `Employee` (`server/src/models/Employee.ts`) | reutilizada | contraparte de contrato de trabalho; parte contrária em processo trabalhista |
| `AccountPayable` (`server/src/models/AccountPayable.ts`) | reutilizada | custos de processo, honorários, acordos (RF-JUR-018) |
| `AuditLog` (`server/src/models/AuditLog.ts`) | reutilizada | trilha de auditoria (RF-JUR-043) |
| `User` | reutilizada | responsáveis, aprovadores, encarregado (DPO), advogado interno |

---

## 3. Requisitos Não Funcionais Específicos de Jurídico (RNF-JUR)

Este documento **não duplica** `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`.
Abaixo, apenas o que é específico do domínio Jurídico e não está coberto pelo
catálogo geral.

| RNF | Descrição | Referência geral relacionada |
|---|---|---|
| RNF-JUR-01 | Confidencialidade reforçada: contencioso trabalhista (processo movido por empregado/ex-empregado) e conteúdo de segredo industrial são os dados mais sensíveis do módulo — acesso de leitura completo exige módulo `juridico`, nunca apenas autenticação; segredo industrial nunca tem o conteúdo persistido (RF-JUR-033) | Estende RNF geral §2 (RBAC + AuditLog) no mesmo padrão adotado para `rh`/`sst` (dado sensível de campo, não só de rota) |
| RNF-JUR-02 | Imutabilidade específica: contrato assinado/aditivo, andamento de processo, prazo confirmado e provisão são **append-only** — qualquer correção é um novo registro/estorno com `userId`, motivo e timestamp, nunca `UPDATE`/`DELETE` destrutivo (têm valor probatório em processo judicial e servem de base ao balanço contábil) | RNF geral §2 (Auditoria de operações sensíveis) — aqui a exigência é mais forte: proíbe alteração, não só audita, no mesmo padrão de RNF-SST-01 |
| RNF-JUR-03 | Retenção longa: prazo prescricional trabalhista (5 anos, até 2 após a extinção do contrato — CF/88 art. 7º, XXIX) e prazos prescricionais cíveis fundamentam retenção de contratos e processos por, no mínimo, 10 anos após encerramento `[PRÁTICA DE MERCADO — prazo exato por tipo de contrato a confirmar com o assessor]`; nenhuma rotina de expurgo automática pode remover esses dados antes do prazo configurado | RNF geral §3 (não há política formal de retenção hoje — lacuna geral, aqui parametrizada para Jurídico, mesmo padrão de RNF-SST-02) |
| RNF-JUR-04 | Alertas de prazo fatal (`is_fatal=true`) não podem ser desativados por nenhum usuário, papel ou configuração — inclusive `role='admin'` — nem removidos da fila de pendências antes de `status='confirmed'` | Novo — mais restritivo que o padrão geral de configuração de alertas; mitigação direta do risco "prazo perdido" citado no brief |
| RNF-JUR-05 | O cálculo de `due_date` de solicitações de titular LGPD (15 dias, art. 19, II) e os alertas ao encarregado devem funcionar sem intervenção manual, e o prazo nunca pode ser "esquecido" silenciosamente — mesmo padrão de RNF-SST-04 (verificação ao acessar o painel, se não houver rotina agendada) | RNF geral §3 (disponibilidade/confiabilidade) |

---

## 4. Casos de Uso — Fluxos Principais

Atores conforme perfis reais do projeto: perfil de acesso configurável por
módulo (`operate`/`approve`), mais os papéis funcionais do brief (Assessor
Jurídico terceirizado, Estagiário de Direito, Advogado Externo, Encarregado/
DPO). O módulo de acesso `juridico` **ainda não existe** no catálogo
`ACCESS_MODULES` — ver §5.1.

### UC-52: Gerenciar Contrato Ponta a Ponta com Alertas de Vencimento

**Ator principal:** Estagiário de Direito (elaboração/registro, perfil
`juridico`, nível `operate`) / Assessor Jurídico (aprovação, nível
`approve`).
**Atores secundários:** Compras/Vendas/RH (solicitantes, consultam contratos
vigentes na ficha do fornecedor/cliente/funcionário), Diretoria (aprovação
de alçada alta).

**Pré-condições:**
- Usuário autenticado com módulo `juridico` nível `operate` ou superior.
- Contraparte identificada: `supplier_id`/`client_id`/`employee_id`
  existente, ou dados de contraparte avulsa (`counterparty_name`/
  `counterparty_doc`) quando não há cadastro no ERP.

**Fluxo Principal:**
1. Área demandante (ou o próprio Jurídico) abre a solicitação de contrato,
   informando tipo, objeto, contraparte e valor (RF-JUR-001).
2. Estagiário/Assessor faz upload da minuta (v1) e registra observações de
   negociação; novas versões são anexadas sequencialmente (RF-JUR-002).
3. Se aplicável, o contrato passa por aprovação interna conforme alçada
   configurada por valor/tipo (RF-JUR-003).
4. Ao assinar, sistema exige ao menos 2 `ContratoSignatario` tipo parte
   (`party_a`/`party_b`) e a versão assinada anexada; recomenda (sem
   bloquear) 2 testemunhas (RF-JUR-004).
5. Contrato transita para `active`. Sistema **automaticamente** gera um
   `AlertaJuridico` de vencimento com antecedência default de 60 dias
   (RF-JUR-005) — a transição é bloqueada se não houver
   `responsible_user_id`.
6. Se `renewal_auto=true` e `notice_days>0`, sistema gera alerta adicional
   na janela de denúncia (RF-JUR-006).
7. Ao vencer o alerta ou por decisão do gestor, é registrado
   **ContratoAditivo** (prazo/valor/cláusula/parte/outro); ao ser assinado,
   atualiza os campos vigentes do contrato e recalcula os alertas,
   preservando o histórico do aditivo e os valores anteriores (RF-JUR-008).
8. Ao final da vigência (natural ou por rescisão), contrato é encerrado:
   `expired` (fim natural) ou `terminated` (com motivo e data obrigatórios)
   (RF-JUR-009). O contrato permanece consultável para sempre (RF-JUR-011).

**Fluxos Alternativos:**
- **A1 (Contraparte avulsa):** contrato tipo `nda`/`rental`/`other` sem
  cadastro no ERP usa `counterparty_type='other'` com nome/documento livres
  (processo P1.1 do brief).
- **A2 (Reajuste por índice):** contrato com valor recorrente registra
  índice (IPCA/IGP-M/INPC) e data-base; sistema alerta na data de reajuste;
  o novo valor é lançado manualmente (RF-JUR-007).
- **A3 (Checklist de cláusulas):** contratos `employment`/`supplier`/`nda`
  respondem ao checklist de cláusulas (PI/confidencialidade/não concorrência)
  antes da aprovação, com "não se aplica" permitido e registrado
  (RF-JUR-010).

**Fluxo de Exceção:**
- **E1 (Ativação sem responsável):** sistema bloqueia a transição para
  `active` com "O QUE" (não é possível ativar o contrato), "POR QUE"
  (nenhum `responsible_user_id` definido), "O QUE FAZER" (atribuir um
  gestor interno do contrato antes de ativar) — BR-JUR-001.
- **E2 (Tentativa de reverter contrato encerrado):** sistema rejeita
  transição `expired`/`terminated → active`; orienta a criar aditivo antes
  do fim de vigência ou um novo contrato encadeado (BR-JUR-006).
- **E3 (Assinatura sem 2 partes):** sistema bloqueia a transição para
  `signed`/`active` sem ao menos 2 `ContratoSignatario` tipo parte
  registrados e a versão assinada anexada (BR-JUR-004).

**Pós-condições:**
- Contrato `active` com alerta(s) de vencimento/denúncia ativo(s) e gestor
  nomeado.
- Aditivos (se houver) preservando histórico imutável.
- Ficha do fornecedor/cliente/funcionário exibindo o contrato vigente
  (RF-JUR-045).

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Contrato não pode ser ativado sem responsável
  Dado um contrato com todos os dados preenchidos, exceto responsible_user_id
  Quando o Assessor Jurídico tenta ativar o contrato
  Então o sistema bloqueia a transição
  E exibe a exigência de definir um responsável interno

Cenário: Alerta de vencimento gerado automaticamente na ativação
  Dado um contrato com end_date definida e responsible_user_id preenchido
  Quando o contrato é ativado
  Então o sistema cria automaticamente um AlertaJuridico de vencimento
  E a antecedência default é de 60 dias, salvo configuração específica do contrato
```

---

### UC-53: Registrar Processo Judicial/Administrativo e Avaliar Risco de Provisão

**Ator principal:** Assessor Jurídico (perfil `juridico`, nível `operate`).
**Atores secundários:** Advogado Externo (fornece andamentos e avaliação
técnica), Financeiro/Controladoria (consome o relatório de provisão
vigente).

**Pré-condições:**
- Usuário autenticado com módulo `juridico`.
- Advogado externo responsável cadastrado (ou cadastrado no ato).

**Fluxo Principal:**
1. Assessor Jurídico cadastra o **ProcessoJudicial**: número CNJ, tipo,
   papel (autor/réu/terceiro), parte contrária (com FK opcional a
   `employees`/`suppliers`/`clients`), vara/tribunal, advogado externo,
   valor da causa, `internal_responsible_user_id` (RF-JUR-012).
2. Ao longo do processo, andamentos são registrados cronologicamente e de
   forma imutável (`ProcessoAndamento`) — correção gera novo registro
   (RF-JUR-014).
3. Assessor classifica o risco de perda (`probable`/`possible`/`remote`,
   nomenclatura CPC 25); se `probable`, informa `provisioned_amount > 0`
   com justificativa (RF-JUR-015).
4. Sistema registra a avaliação como nova linha em
   `ProvisaoContingencia` (histórico append-only); a vigente é a mais
   recente (RF-JUR-016).
5. A cada andamento tipo `decision`, e no mínimo a cada 90 dias por
   processo ativo, sistema abre pendência de reavaliação de risco
   (RF-JUR-017).
6. Custos do processo (honorários, custas, perícias) são lançados em
   `accounts_payable` categoria "Jurídico", vinculados ao processo; depósito
   judicial é registrado com tipo próprio, distinto de despesa (RF-JUR-018).
7. Processo é encerrado: `won`/`lost`/`settled` (com valor/parcelas → AP
   quando houver acordo) ou `archived`; nunca excluído (RF-JUR-019).
8. Financeiro/Controladoria consome o relatório "valor provisionado vigente
   por processo e total" e "exposição possível" (RF-JUR-020).

**Fluxos Alternativos:**
- **A1 (Parte contrária é ex-empregado):** FK para `employees.id`
  preservada mesmo após desligamento (nunca excluído, prescrição
  trabalhista de até 5+2 anos — RNF-JUR-03).
- **A2 (Acordo com parcelamento):** encerramento `settled` gera lançamentos
  parcelados em `accounts_payable`.

**Fluxo de Exceção:**
- **E1 (Provisão `probable` sem valor/justificativa):** sistema bloqueia o
  salvamento da avaliação com "O QUE" (não é possível registrar risco
  provável sem valor provisionado), "POR QUE" (CPC 25 exige provisão
  quantificada para perda provável), "O QUE FAZER" (informar
  `provisioned_amount` e `rationale`) — BR-JUR-015.
- **E2 (Tentativa de excluir processo/andamento/provisão):** sistema
  rejeita qualquer `DELETE` físico; apenas `archived`/novo registro
  corretivo são permitidos (BR-JUR-007).
- **E3 (Processo ativo sem avaliação de risco vigente):** dashboard
  jurídico sinaliza como pendência crítica; sistema não permite gerar o
  relatório de provisão para a Controladoria com processos sem avaliação —
  eles aparecem destacados como "risco não avaliado", nunca omitidos
  silenciosamente (BR-JUR-015, integração com Financeiro).

**Pós-condições:**
- Processo com histórico de andamentos, avaliação de risco vigente e série
  de provisão auditável.
- Relatório de provisão vigente disponível ao Financeiro.

---

### UC-54: Cumprir Prazo Fatal com Dupla Confirmação (fluxo mais crítico do módulo)

**Ator principal:** Advogado responsável nomeado (`responsible_user_id`,
Assessor Jurídico ou Advogado Externo com usuário no sistema).
**Atores secundários:** Segundo confirmante (Assessor Jurídico ou gestor,
distinto do responsável — `escalation_user_id`), Diretoria (notificada em
`missed`).

**Pré-condições:**
- Processo judicial existente (UC-53).
- Data fatal já calculada e informada pelo advogado (o sistema não calcula).

**Fluxo Principal:**
1. Assessor/Advogado cadastra **PrazoProcessual**: descrição, data fatal
   (`due_date`), flag `is_fatal`, `responsible_user_id` (obrigatório) —
   sistema rejeita o cadastro sem responsável (RF-JUR-021).
2. Sistema calcula e dispara alertas redundantes em D-7, D-3, D-1 e D0
   para o responsável (RF-JUR-022).
3. Se não houver `acknowledge` do responsável até D-3, sistema escala
   automaticamente o alerta para `escalation_user_id` (Assessor Jurídico)
   (RF-JUR-022).
4. Responsável cumpre o prazo (protocolo/petição) e registra o cumprimento
   no sistema com evidência (`evidence_file_path`) — 1ª confirmação
   (RF-JUR-024).
5. Um segundo usuário, distinto do responsável, confirma a baixa
   (`confirmed_by`) — 2ª confirmação obrigatória; sistema rejeita se
   `fulfilled_by = confirmed_by` (RF-JUR-024).
6. Prazo passa a `confirmed`; estatística de "cumpridos no prazo" é
   atualizada (KPI seção (e) do brief).

**Fluxos Alternativos:**
- **A1 (Prazo trabalhista):** mesmo fluxo, com referência a CLT art. 775
  (dias úteis) — a data fatal continua sendo informada manualmente,
  independentemente do rito (RF-JUR-023).
- **A2 (Backup/substituto):** `backup_user_id` opcional pode registrar o
  cumprimento em ausência do responsável titular, mas a segunda confirmação
  segue exigindo um terceiro usuário distinto de quem cumpriu.

**Fluxo de Exceção:**
- **E1 (Tentativa de criar prazo sem responsável):** sistema bloqueia o
  cadastro com "O QUE" (não é possível salvar o prazo), "POR QUE"
  (`responsible_user_id` é obrigatório para todo prazo processual), "O QUE
  FAZER" (nomear o responsável antes de salvar) — BR-JUR-010. Este é o
  bloqueio de maior prioridade de todo o módulo.
- **E2 (Confirmação pelo mesmo usuário que cumpriu):** sistema rejeita com
  422/`BUSINESS_RULE_VIOLATION`; a dupla confirmação exige dois usuários
  distintos — BR-JUR-013.
- **E3 (Prazo vencido sem baixa):** sistema muda automaticamente o status
  para `missed`, dispara notificação imediata a Assessor e Diretoria, e
  **não permite baixa retroativa silenciosa** — qualquer baixa após
  `missed` exige justificativa formal registrada em campo próprio, visível
  permanentemente no histórico do prazo — BR-JUR-014.
- **E4 (Tentativa de desativar alerta de prazo fatal):** sistema recusa
  qualquer configuração que desative alertas de prazo `is_fatal=true`,
  inclusive para `role='admin'` — RNF-JUR-04.

**Pós-condições:**
- Prazo `confirmed` (cumprido no prazo) ou `missed` (com notificação
  disparada e trilha de justificativa, se baixado depois).
- KPI "prazos fatais: cumpridos no prazo / perdidos" recalculado.

**Critérios de Aceite (BDD):**
```gherkin
Cenário: Prazo processual não pode ser criado sem responsável
  Dado o cadastro de um novo PrazoProcessual sem responsible_user_id
  Quando o Assessor Jurídico tenta salvar
  Então o sistema bloqueia o salvamento
  E exige a nomeação de um responsável antes de continuar

Cenário: Dupla confirmação exige usuários distintos
  Dado um prazo fatal cumprido pelo usuário A com evidência anexada
  Quando o próprio usuário A tenta confirmar a baixa
  Então o sistema rejeita a confirmação com 422
  E exige que um segundo usuário, diferente de A, confirme

Cenário: Prazo fatal vencido sem baixa dispara notificação imediata
  Dado um prazo fatal com due_date igual à data corrente e sem confirmação
  Quando o sistema processa a virada do dia
  Então o status do prazo muda para "missed"
  E uma notificação imediata é enviada ao Assessor e à Diretoria
  E nenhuma baixa retroativa é aceita sem justificativa registrada
```

---

### UC-55: Cadastrar, Monitorar e Revogar Procuração

**Ator principal:** Assessor Jurídico (perfil `juridico`, nível `operate`).
**Atores secundários:** Advogado Externo (outorgado mais comum), Diretoria
(outorgante/assina a procuração).

**Pré-condições:**
- Usuário autenticado com módulo `juridico`.
- Outorgado identificado: `employee_id`/`external_lawyer_id` (FK opcional)
  ou nome/documento livre.

**Fluxo Principal:**
1. Assessor cadastra a **Procuracao**: outorgante (default EVOK ÁUDIO
   LTDA), outorgado, poderes (texto + tags), forma (pública/particular),
   data de emissão, vigência (RF-JUR-026).
2. Sistema calcula alerta de vencimento com antecedência configurável
   (default 30 dias), se houver `expiration_date` (RF-JUR-027).
3. Próximo do vencimento, Assessor decide renovar (novo cadastro/aditivo de
   texto) ou deixar expirar.
4. Se necessário revogar antes do vencimento, Assessor registra
   `status='revoked'` com data e registro de comunicação (RF-JUR-028).

**Fluxos Alternativos:**
- **A1 (Vigência indeterminada):** `expiration_date=NULL`; sistema não gera
  alerta de vencimento automático, mas mantém a procuração sujeita à
  revogação manual a qualquer momento.
- **A2 (Renovação):** nova procuração é cadastrada referenciando a anterior
  (histórico), em vez de estender a data da existente — preserva o
  histórico de outorgas.

**Fluxo de Exceção:**
- **E1 (Uso de procuração revogada):** qualquer tela/relatório que liste
  procurações "vigentes" exclui automaticamente as `revoked`, no mesmo
  instante do registro da revogação — sem lag admissível, já que uma
  procuração revogada usada indevidamente gera responsabilidade para a
  EVOK (BR-JUR-020, Código Civil art. 682, I).
- **E2 (Vigência vencida sem tratativa):** sistema muda automaticamente
  `status='expired'` na data de vencimento (verificação ao acessar a tela
  ou rotina agendada); procuração `expired` some das listagens de vigentes
  no mesmo padrão de E1 (BR-JUR-020).

**Pós-condições:**
- Procuração `active`/`revoked`/`expired`, nunca excluída.
- Painel de "procurações vigentes / a vencer em 30 dias" sempre reflete o
  estado real (KPI seção (e) do brief).

---

### UC-56: Manter Inventário de Tratamento (RoPA) e Atender Solicitação de Titular (LGPD)

**Ator principal:** Encarregado/DPO (perfil `juridico`, nível `approve`
para decisões de comunicação; `operate` para triagem/execução).
**Atores secundários:** Área dona do dado (RH para funcionário, Vendas para
cliente, Compras para contato de fornecedor) — executa a ação solicitada
pelo titular sob coordenação do Jurídico.

**Pré-condições:**
- Usuário autenticado com módulo `juridico`.
- RoPA com ao menos as atividades de tratamento mínimas cadastradas
  (`employees`, `clients` PF, `suppliers` contatos, `users`).

**Fluxo Principal (RoPA):**
1. Encarregado cadastra/atualiza **LgpdAtividadeTratamento**: finalidade,
   base legal (rol do art. 7º), categorias de dados/titulares, sistema/
   tabela de origem, compartilhamentos, retenção, medidas de segurança,
   área dona (RF-JUR-035).
2. Sistema exige revisão anual registrada por atividade (RF-JUR-036);
   atividades sem revisão no prazo aparecem como pendência no dashboard.

**Fluxo Principal (Atendimento a Titular):**
3. Sistema/canal registra recepção de **LgpdSolicitacaoTitular**: tipo
   (confirmação/acesso/correção/anonimização/eliminação/portabilidade/
   revogação de consentimento), dados do solicitante, categoria do titular
   (RF-JUR-037).
4. Sistema calcula `due_date` = recebimento + 15 dias automaticamente
   (RF-JUR-037).
5. Encarregado/Assessor verifica identidade do titular e só então avança
   para `in_progress` (RF-JUR-039).
6. Triagem por tipo; execução coordenada com a área dona do dado
   (RH/Vendas/Compras); resposta enviada ao titular; desfecho registrado
   (`resolution_notes`, `answered_at`).
7. Sistema alerta o encarregado em D-5 e D-1 antes do vencimento do prazo
   (RF-JUR-038).

**Fluxos Alternativos:**
- **A1 (Resposta simplificada imediata):** pedido de confirmação/acesso
  sinalizado para resposta em formato simplificado imediata, com a
  declaração completa ainda cabendo dentro dos 15 dias (RF-JUR-038).
- **A2 (Recusa justificada):** solicitação recusada com justificativa
  obrigatória registrada, status `rejected_justified`.
- **A3 (Incidente de segurança):** paralelamente, um **LgpdIncidente** pode
  ser aberto (vazamento, acesso indevido); avaliação de risco aos titulares
  e decisão registrada (com justificativa nos dois sentidos) sobre
  comunicar ou não à ANPD/titulares (RF-JUR-040).

**Fluxo de Exceção:**
- **E1 (Avanço sem verificação de identidade):** sistema bloqueia a
  transição `verifying → in_progress` sem `identity_verified=true` e
  identificação de quem verificou — mitigação de engenharia social
  (BR-JUR-041).
- **E2 (Prazo de resposta vencido sem desfecho):** sistema não oculta a
  pendência; ela permanece visível como crítica no dashboard do
  encarregado até haver resposta registrada, mesmo após o vencimento do
  `due_date` (RNF-JUR-05).
- **E3 (Recusa sem justificativa):** sistema bloqueia a transição para
  `rejected_justified` sem o campo de justificativa preenchido
  (BR-JUR-041).
- **E4 (Incidente sem decisão registrada):** sistema não permite fechar o
  incidente (`status='closed'`) sem decisão explícita sobre comunicação à
  ANPD/titulares, com justificativa registrada mesmo quando a decisão é
  "não comunicar" (BR-JUR-042).

**Pós-condições:**
- RoPA atualizado e auditável.
- Solicitação de titular respondida dentro (ou fora, com evidência) do
  prazo legal, nunca perdida.
- Incidente (se houver) com decisão de comunicação registrada e plano de
  ação.

---

## 5. Regras de Negócio — Mapeamento (BR-JUR → RF)

As regras de negócio já estão formalizadas com base legal em
`docs/business/briefs/BRIEF_JUR_2026-08-06.md`, seção (c) (códigos
`BR-JUR-001` a `BR-JUR-051`, numerados por bloco temático: 001-007
contratos, 010-017 contencioso, 020-021 procurações, 030-031 propriedade
intelectual, 040-043 LGPD, 050-051 transversais). Este bloco não as
reescreve; a Matriz de Rastreabilidade (§7) amarra cada `BR-JUR-NNN` ao(s)
RF(s) e UC(s) correspondentes.

Quando este bloco for consolidado, as regras aplicáveis devem ser
transcritas (não resumidas) em `docs/business/BUSINESS_RULES.md`, mantendo
os códigos `BR-JUR-NNN` originais do brief para não quebrar rastreabilidade
— mesmo procedimento já indicado nos Blocos 1 (SST) e 2 (TI).

---

## 6. Decisões e Pendências para Arquitetos

### 6.1 Novo módulo de RBAC (`juridico`)

O catálogo `ACCESS_MODULES` (`server/src/shared/domain/accessModules.ts`,
31 chaves na leitura de 2026-08-07, incluindo `rh`, `sst` e `ti`) **não tem**
a chave `juridico`. Recomenda-se seguir o mesmo padrão de comentário
estrutural já usado para `rh`/`sst`/`ti` no próprio arquivo. Diferente de
`ti` (onde parte do módulo é aberta a todos via auto-serviço), `juridico`
deve seguir o desenho **mais restritivo** de `sst`: mesmo usuários
autenticados sem o módulo não devem enxergar contencioso, prazos ou
solicitações LGPD. A única exceção conhecida é o perfil `financeiro`, que
deve enxergar **somente** o relatório derivado de provisões/custos
(RF-JUR-020), nunca o conteúdo do processo em si — mesmo padrão de
segregação de campo (não de rota inteira) já usado em `rh` para dados
sensíveis (BR-JUR-050).

### 6.2 Contraparte polimórfica do Contrato

`contracts` tem três FKs opcionais mutuamente exclusivas
(`supplier_id`/`client_id`/`employee_id`) mais um par de campos livres
(`counterparty_name`/`counterparty_doc`) para contraparte avulsa. Esse
desenho é do brief e não foi alterado; fica sinalizado explicitamente para o
`AdmDBA` decidir a estratégia de constraint (CHECK garantindo exatamente uma
das quatro alternativas preenchida, ou validação apenas em camada de
aplicação) — nenhuma das duas é imposta por este bloco.

### 6.3 Integração de custos jurídicos com Contas a Pagar

RF-JUR-018 lança custos de processo em `accounts_payable` existente
(categoria "Jurídico", vínculo ao processo). O brief não resolve se o
vínculo é uma FK direta (`accounts_payable.legal_case_id`, nova coluna) ou
uma tabela de junção — decisão de schema para o `AdmDBA`. O tratamento
contábil de depósitos judiciais/recursais (ativo restrito, não despesa)
também não está resolvido e depende de confirmação com o contador
(`[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]`, item 6 da lista consolidada
abaixo) — a modelagem deve, no mínimo, permitir distinguir os dois tipos de
lançamento desde o dia 1, mesmo que o tratamento contábil fino evolua depois.

### 6.4 Alçadas de aprovação de contrato (RF-JUR-003)

Não há hoje, no ERP, uma tabela "gestor de departamento" ou "alçada por
valor" verificada. Recomenda-se que `ArquitetoSoftwareAPI`/`AdmDBA`
confirmem se algo equivalente já existe (ex.: em Compras) antes de propor
uma nova estrutura de configuração — mesma cautela já registrada no Bloco 2
TI (§5.2) para o aprovador de `ItAccessRequest`.

### 6.5 Itens `[VERIFICAR COM ASSESSOR JURÍDICO DA EMPRESA]` — parametrização obrigatória

Repassados do brief como **configuração**, nunca hard-code. Nenhum bloqueia
a modelagem — todos exigem apenas um campo de configuração (mesmo padrão de
segredos obrigatórios do RNF geral §2):

1. Alçadas de aprovação de contratos por valor/tipo (RF-JUR-003).
2. Periodicidade formal de reavaliação de contingências junto ao contador
   (proposta: 90 dias) (RF-JUR-017).
3. Prazo vigente do regulamento da ANPD para comunicação de incidentes,
   antes de parametrizar o alerta correspondente (RF-JUR-040).
4. Quem é o encarregado (DPO) formal da EVOK ÁUDIO (RF-JUR-041).
5. Datas exatas de prorrogação/anuidade dos ativos de PI já inventariados
   em `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md` — os números lá parecem
   placeholders (RF-JUR-032).
6. Tratamento contábil de depósitos judiciais/recursais, com o contador
   (RF-JUR-018, §6.3).
7. Volume e perfil do contencioso atual (quantos processos, quais tipos),
   para calibrar telas e relatórios — não bloqueia a modelagem, mas afeta
   prioridade de UI.

### 6.6 Fora de escopo deste bloco (herdado do brief, reforçado)

Elaboração/automação de peças e minutas com cláusulas geradas pelo sistema
(minutas ficam como arquivos anexos); **cálculo automático de prazos
processuais** (deliberadamente excluído — RF-JUR-023/BR-JUR-012: risco de
erro supera o benefício e depende de dados que o ERP não tem); armazenamento
do conteúdo de segredos industriais (vedado por desenho — RF-JUR-033);
processos operacionais de RH/Compras/Vendas (admissão, cotação, pedido) —
pertencem aos respectivos módulos, o Jurídico só referencia. Nenhum RF acima
cobre esses itens — se aparecerem pedidos nesse sentido, é mudança de
escopo que exige um novo brief.

---

## 7. Matriz de Rastreabilidade — Brief → RF → Caso de Uso

| Processo do brief | BR-JUR | RF-JUR | UC |
|---|---|---|---|
| P1 — Gestão de contrato ponta a ponta | 001–007 | 001–011 | UC-52 |
| P2 — Contencioso: processo, andamentos, provisão | 015–017 (avaliação de risco) | 012–020 | UC-53 |
| P2 — Prazos processuais fatais | 010–014 | 021–025 | UC-54 |
| P3 — Procurações e atos societários | 020–021 | 026–030 | UC-55 |
| P5 — Propriedade intelectual | 030–031 | 031–034 | sem UC formal dedicado neste bloco (P1, ver §8) |
| P4 — LGPD (RoPA, titular, incidente) | 040–043 | 035–041 | UC-56 |
| Transversal — RBAC/auditoria/integrações | 007, 050, 051 | 042–046 | tratado nas seções 6 e 7 deste bloco, não UC isolado |

---

## 8. Pendência declarada — Casos de Uso não detalhados neste bloco

Este BLOCO 3 detalha (com fluxo principal/alternativo/exceção completos) os
5 fluxos indicados como prioritários pelo pipeline: gestão de contrato
(UC-52), registro de processo e avaliação de risco (UC-53), prazos
processuais fatais — o mais crítico do módulo (UC-54), procurações (UC-55) e
LGPD RoPA + atendimento a titular, com incidente como fluxo alternativo
(UC-56). Os RFs de **Propriedade Intelectual** (RF-JUR-031 a 034) estão
catalogados com prioridade e regra de negócio, mas **sem Caso de Uso formal
detalhado neste passo** — é um CRUD com regra de alerta de
renovação/anuidade mais simples (mesmo padrão já resolvido em outros
módulos, ex.: alerta de validade de CA em RF-SST-006, alerta de licença em
RF-TI-028). Recomenda-se que a próxima passada do `AnalistaNegocios` no
pipeline Jurídico escreva o UC formal (UC-57) antes da modelagem definitiva
dessa tabela, em particular para o fluxo de exceção de segredo industrial
(RF-JUR-033), que tem implicação direta de RBAC de campo (não só de rota) e
merece documentação própria de fluxo de acesso negado.

Adicionalmente, o **LgpdIncidente** foi tratado como fluxo alternativo
dentro de UC-56 (A3/E4) por proximidade temática com a LGPD, mas seu fluxo
de exceção (comunicação à ANPD fora do prazo regulamentar) depende do item 3
da lista de pendências (§6.5) e pode merecer um UC próprio quando o prazo
for confirmado com o assessor — sinalizado aqui para não ser esquecido na
próxima passada.

---

## Referências

- `docs/business/briefs/BRIEF_JUR_2026-08-06.md` — brief de domínio (insumo
  primário deste documento).
- `docs/business/BLOCO_1_SST_REQUISITOS.md`, `docs/business/BLOCO_2_TI_REQUISITOS.md`
  — mesmo padrão de entregável (formato de referência para este bloco).
- `docs/arquitetura/DOCUMENTO_DE_REQUISITOS.md` — índice executivo de RF por
  módulo (a atualizar com a seção Jurídico quando este bloco for
  consolidado).
- `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md` — RNF gerais do projeto.
- `docs/projeto/04-USE_CASES.md`, `docs/business/01-USE_CASES.md` — UC-01 a
  UC-51 (numeração continuada a partir de UC-52 neste bloco).
- `server/src/models/Supplier.ts`, `Client.ts`, `Employee.ts`,
  `AccountPayable.ts`, `AuditLog.ts` — âncoras de integração do módulo
  Jurídico.
- `server/src/shared/domain/accessModules.ts` — catálogo de módulos RBAC
  (pendência: criar chave `juridico`, ver §6.1).
- `docs/juridico/00-README.md`, `docs/juridico/01-CONTRATOS.md`,
  `docs/juridico/02-PROPRIEDADE_INTELECTUAL.md` — documentação departamental
  existente, usada como base fática pelo brief.
- `docs/00-ESTRUTURA_ORGANIZACIONAL.md` — departamento 16 (Jurídico).

**Fim do BLOCO 3.**
