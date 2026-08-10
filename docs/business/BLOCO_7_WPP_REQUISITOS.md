# BLOCO 7 — Assistente WhatsApp / Omnichannel (WPP) — Requisitos Formais

**Natureza deste documento:** greenfield no lado do ERP; **integração** no lado
do n8n (fluxos existentes em `evokaudiopro.app.n8n.cloud` continuam sendo o
transporte — decisão D-7 do conceito).
**Insumos:** `docs/omnichannel/CONCEITO_ASSISTENTE_WHATSAPP.md` (conceito
validado pelo dono em 2026-08-10, decisões D-1 a D-7), inventário da instância
n8n (56 workflows, 10 ativos, mapeados em 2026-08-10), pesquisa de padrões de
mercado (referências no conceito §9), RBAC real em
`server/src/shared/domain/accessModules.ts`, tabelas reais `users`,
`employees`, `departments` (conferidas contra `information_schema` em
2026-08-10).
**Autor:** Engenharia de Requisitos (sessão de 2026-08-10, com o dono).
**Data:** 2026-08-10.
**Status:** 🟡 Especificação pronta para modelagem de dados
(`BLOCO_7_WPP_MODELO_DADOS.md`) e contrato de API (`BLOCO_7_WPP_API.md`).
**Nenhum código foi alterado neste passo.**

**Prefixo de módulo:** `WPP`.

**Numeração de Casos de Uso:** o maior UC atribuído em qualquer documento do
projeto é **UC-74** (Bloco 6 RH). Este bloco usa **UC-75 a UC-80**.

**Catálogo RBAC verificado:** `accessModules.ts` **não** tem chave para este
módulo. Este bloco exige **duas chaves novas** (ver §5): `whatsapp` (gestão do
canal) e `whatsapp.bot` (o robô), seguindo o padrão de chave pontuada já usado
(`relatorios.producao`).

---

## 0. Sumário executivo

Funcionários da Evok conversam com o ERP pelo WhatsApp. O ERP passa a ser:
(a) a **fonte de identidade** — número ↔ funcionário ↔ departamento;
(b) a **fonte dos dados** que a IA responde — via API, com a permissão do
funcionário; (c) o **registro auditável** de toda interação; e (d) o **painel
de controle** da gestão. O n8n permanece como transporte (webhook Meta,
multimodal, envio) — "carteiro burro em negócio".

Fora do escopo deste bloco: cliente externo (fase 5 do conceito), substituição
do n8n (decisão futura), escolha do modelo de IA (aberta — a arquitetura é
agnóstica).

## 1. Atores

| Ator | Quem é | Interface |
|---|---|---|
| **Funcionário** | Colaborador com número cadastrado | WhatsApp |
| **Robô** | Usuário de serviço que o n8n usa para falar com o ERP | API (`whatsapp.bot`) |
| **Gestão do canal** | Quem administra números, políticas, handoff e monitora conversas | Tela web (`whatsapp`) |
| **Humano de plantão** | Colaborador que assume conversas no handoff | WhatsApp + monitor |
| **Diretoria** | Aprova mudanças de política de ação (opcional, ver RF-WPP-014) | Tela web |

## 2. Requisitos Funcionais

### 2.1 Identidade e cadastro (P0 — fase 1)

| RF | Descrição | Critério de aceite |
|---|---|---|
| RF-WPP-001 | Cadastrar contato WhatsApp: número E.164 único, vínculo **obrigatório** a `employees` (e, por transitividade, a `departments`), status `ATIVO`/`BLOQUEADO` | Escrita real: criar via API, conferir no banco; número duplicado → 409 |
| RF-WPP-002 | Bloquear/reativar contato sem excluir (histórico imutável — padrão do projeto: nada de delete físico) | Contato bloqueado → resolução (RF-WPP-004) responde `blocked` |
| RF-WPP-003 | Listar/buscar contatos por nome, número, departamento, status | Paginação padrão do projeto |
| RF-WPP-004 | **Resolver número** (endpoint do robô): dado um número, retornar funcionário, departamento, status e escopo de ação (níveis por política §2.3); número desconhecido → resposta explícita `unknown` (não erro 500) | O n8n substitui a consulta ao MySQL da Hostinger por este endpoint |

### 2.2 Registro e monitoramento (P0 — fase 1)

| RF | Descrição | Critério de aceite |
|---|---|---|
| RF-WPP-005 | Registrar **cada interação**: mensagem recebida (conteúdo completo — decisão D-2), resposta enviada, tipo (texto/áudio-transcrito/imagem/documento), departamento roteado, e — quando houver — ação executada e dados consultados | Escrita real via endpoint do robô |
| RF-WPP-006 | **Idempotência por `wamid`** (ID de mensagem da Meta): a mesma mensagem registrada duas vezes não duplica (entrega at-least-once da Meta) | Segundo POST com mesmo `wamid` → 200 com `deduplicated: true`, sem linha nova |
| RF-WPP-007 | Tela de monitoramento da gestão: conversas por funcionário/departamento/período, busca no conteúdo, indicação de handoff e de ações executadas | RBAC `whatsapp` (view) |
| RF-WPP-008 | Trilha de auditoria (`logAction`) em **toda** rota de escrita do módulo — obrigatório pela guarda `audit-coverage-guard` (módulo novo não entra na lista de débito) | Guarda verde |

### 2.3 Política de ações do bot (P1 — fase 3)

| RF | Descrição | Critério de aceite |
|---|---|---|
| RF-WPP-009 | Política configurável **departamento × ação** com níveis N0 (consulta), N1 (ação leve com confirmação no chat), N2 (inicia fluxo com aprovação normal do ERP) | Tela de política; default universal N0 |
| RF-WPP-010 | **N3 em código**: aprovar qualquer coisa, cancelar NF-e, alterar cadastro mestre e todo gate de diretoria são **inconfiguráveis** — a política não tem como liberá-los | Teste unitário que tenta configurar N3 → 422 `WPP-N3-IMMUTABLE` |
| RF-WPP-011 | Ação N1/N2 exige **confirmação explícita** do funcionário no chat antes de executar; o registro guarda pergunta, confirmação e resultado | Fluxo em duas mensagens |
| RF-WPP-012 | Autoria: toda ação executada via bot é gravada em nome do **funcionário** (rastreável "via WhatsApp"), nunca do robô | Campo de origem na auditoria |
| RF-WPP-013 | **Permissão por interseção**: a ação só executa se o robô pode E o funcionário pode (RBAC dele) E a política do departamento permite o nível | Teste: funcionário sem permissão → recusa mesmo com política liberada |
| RF-WPP-014 | Mudança de política registra quem/quando (auditoria); elevação de nível (N0→N1, N1→N2) pode exigir `whatsapp:approve` | Configurável |

### 2.4 Handoff humano (P1 — fase 3)

| RF | Descrição | Critério de aceite |
|---|---|---|
| RF-WPP-015 | Configuração por departamento: responsável **fixo** OU **escala** (dia da semana + faixa de horário → responsável), com **fallback** | Decisão D-6 |
| RF-WPP-016 | Endpoint do robô: "quem atende agora no departamento X?" → responsável resolvido pela escala/fixo/fallback, ou `nobody` fora de cobertura | Usado pelo nó de handoff do n8n |
| RF-WPP-017 | Handoff registrado na conversa (quem assumiu, quando, desfecho); fora de cobertura → registro pendente visível no monitor | |

### 2.5 Segurança e operação (P0 — fase 1)

| RF | Descrição | Critério de aceite |
|---|---|---|
| RF-WPP-018 | **Usuário-robô** dedicado (`role` operator), perfil de acesso próprio com **somente** `whatsapp.bot: operate` + os módulos de consulta do piloto; senha forte; criado por script idempotente (padrão `seed-usuarios-departamentos.cjs`) | Robô não consegue abrir tela de gestão |
| RF-WPP-019 | Endpoints do robô fora do rate-limit geral de 300/15min **ou** com limite próprio dimensionado — o volume de mensagens não pode derrubar o canal (lição da carga de 10/08) | Decisão técnica no bloco de API |
| RF-WPP-020 | Nada de segredo em prompt/fluxo: token do robô fica em credencial do n8n; rotação documentada | |

## 3. Regras de negócio

| BR | Regra |
|---|---|
| BR-WPP-001 | Número de WhatsApp é **identidade fraca**: prova posse do chip, não da pessoa. Ações N1/N2 sensíveis podem exigir segundo fator futuro (fora deste bloco); por ora, mitigação = bloqueio imediato pela gestão + trilha completa |
| BR-WPP-002 | Conteúdo completo é gravado (D-2) e a recomendação LGPD registrada no conceito §2 permanece: **aviso de canal corporativo monitorado antes do rollout** — pendência operacional do dono, não de código |
| BR-WPP-003 | Histórico de conversas é **imutável** (sem update/delete de mensagens); correções são novas entradas |
| BR-WPP-004 | O bot **nunca aprova** — nem com política, nem com permissão do funcionário: aprovação exige a interface autenticada do ERP (preserva D-K/G11) |
| BR-WPP-005 | Resposta com dado de negócio SEMPRE vem de chamada à API na hora (tool calling); a IA não responde de memória sobre estoque/pedido/OP |
| BR-WPP-006 | Contato bloqueado ou desconhecido: o robô recebe a classificação e responde mensagem padrão; nada de negócio é consultado |

## 4. Casos de uso

| UC | Nome | Ator primário | Resumo |
|---|---|---|---|
| UC-75 | Consultar dado do ERP via WhatsApp | Funcionário | Pergunta → resolve número → IA consulta API com escopo do depto → responde → registra |
| UC-76 | Executar ação com confirmação via WhatsApp | Funcionário | Pedido de ação → política N1/N2? → confirmação no chat → executa com autoria do funcionário → registra |
| UC-77 | Transbordar para humano | Funcionário / IA | Gatilho → resolve plantão (escala/fixo/fallback) → notifica humano → registra assunção e desfecho |
| UC-78 | Monitorar conversas | Gestão | Filtra/busca conversas, vê ações executadas e handoffs |
| UC-79 | Gerenciar contatos e políticas | Gestão | CRUD de números, bloqueio, níveis por departamento×ação, escala de handoff |
| UC-80 | Resolver identidade de número (interno) | Robô | `POST resolve-number` → funcionário+departamento+escopo \| `unknown` \| `blocked` |

Fluxos detalhados: diagrama de sequência no `BLOCO_7_WPP_API.md` §1.

## 5. RBAC

Duas chaves novas em `accessModules.ts`:

| Chave | Níveis | Quem |
|---|---|---|
| `whatsapp` | `view` (monitor), `operate` (contatos, handoff), `approve` (elevar política de ação) | Gestão / Diretoria |
| `whatsapp.bot` | `operate` | Somente o usuário-robô |

Separação deliberada: o robô **não** enxerga o monitor nem administra contatos;
a gestão **não** usa os endpoints do robô. Perfil do robô no piloto:
`whatsapp.bot: operate` + `estoque: view` + `produtos: view` (Almoxarifado, N0).

## 6. Requisitos não funcionais

Herdados de `docs/arquitetura/REQUISITOS_NAO_FUNCIONAIS.md`; específicos:

| RNF | Requisito |
|---|---|
| RNF-WPP-01 | Resolução de número < 500 ms (está no caminho de cada mensagem) |
| RNF-WPP-02 | Registro de interação assíncrono-tolerante: falha de registro não pode impedir a resposta ao funcionário (o n8n registra com retry; divergência aparece no monitor) |
| RNF-WPP-03 | Idempotência por `wamid` (RF-WPP-006) — obrigatória, não opcional |
| RNF-WPP-04 | Conteúdo de conversa fora dos logs de aplicação (Winston) — só no banco, atrás de RBAC |
| RNF-WPP-05 | Testes de integração reais (Postgres) para: resolução de número, dedupe, recusa por bloqueio, recusa por interseção de permissão — critério de aceite do projeto é escrita real, não dublê |

## 7. Critério de pronto do bloco (fase 1)

1. Migration aplicada nos DOIS bancos (guarda `cross-database-drift-guard` verde)
2. Typecheck + unit + **integração real** verdes, incluindo os testes do RNF-WPP-05
3. `audit-coverage-guard` verde com o módulo novo (fora da lista de débito)
4. Usuário-robô criado e testado: consegue resolver número e registrar; NÃO consegue listar conversas
5. Uma **escrita real de ponta a ponta**: simular o n8n (HTTP) resolvendo um número e registrando uma interação, e a conversa aparecer na tela de monitoramento
6. Documentação de API atualizada em `docs/arquitetura/API.md`
