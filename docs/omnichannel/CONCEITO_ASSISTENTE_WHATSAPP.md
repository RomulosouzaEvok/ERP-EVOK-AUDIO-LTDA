# Assistente WhatsApp da Evok Áudio — Formulação da Ideia

**Status:** 📝 CONCEITO validado pelo dono em 10/08/2026 → **especificação formal escrita** (Bloco 7). Nada implementado.
**Decisor:** Gilwagno (dono)

**Cadeia documental do bloco (padrão do projeto — Requisitos → Dados → API → Código):**

| Documento | Papel |
|---|---|
| **Este arquivo** | Conceito e decisões do dono (D-1 a D-7) |
| [`BLOCO_7_WPP_REQUISITOS.md`](../business/BLOCO_7_WPP_REQUISITOS.md) | RF-WPP-001..020, BR-WPP-001..006, UC-75..80, RBAC, RNF, critério de pronto |
| [`BLOCO_7_WPP_MODELO_DADOS.md`](../business/BLOCO_7_WPP_MODELO_DADOS.md) | DER, 8 decisões de modelagem, dicionário de dados, plano de migration |
| [`BLOCO_7_WPP_API.md`](../business/BLOCO_7_WPP_API.md) | Diagrama de sequência, contrato dos endpoints, segurança, impacto no n8n |

**Outros relacionados:** `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §4 (inventário da frente n8n), `server/ACESSOS_N8N.local.txt` (acessos, fora do Git)

**Diagnóstico da Fase 0 (bot fora do ar):** a causa foi identificada em
2026-08-10 — o nó `Confirma Visualização Wts` chama
`POST graph.facebook.com/v25.0/<phone_number_id>/messages` com
`{messaging_product, status:"read", message_id}` e a Meta responde
**`(#100) Invalid parameter`**. O corpo está correto para "marcar como lida",
o que aponta para o `phone_number_id` da URL ou o token da credencial —
não para o payload. Correção **não aplicada**: mexer no n8n aguarda aval
(decisão D-4).

---

## 1. A ideia, em um parágrafo

Os funcionários da Evok falam com o ERP pelo WhatsApp. Cada número de
WhatsApp é vinculado a um funcionário e seu departamento **dentro do ERP**; a
IA responde buscando dados reais do sistema **conforme a área de trabalho de
quem pergunta** (almoxarife pergunta de estoque, comprador de pedidos); pode
**executar ações com limitações configuráveis**; sabe **passar a conversa para
um humano** (com escala de plantão configurável); e **toda interação fica
registrada no ERP**, onde a gestão monitora quem perguntou o quê e o que foi
respondido. Numa fase futura, o mesmo canal atende clientes externos.

## 2. As decisões já tomadas (10/08/2026)

| # | Decisão | Escolha do dono |
|---|---------|-----------------|
| D-1 | Fase 1: quem usa | **Só funcionários** da Evok. Cliente externo é fase 2 |
| D-2 | Registro de conversas | **Conteúdo completo** no ERP. ⚠️ Recomendação registrada: publicar aviso de canal corporativo monitorado antes do rollout (LGPD — transparência) |
| D-3 | Piloto | **Almoxarifado/Estoque** (perguntas simples, API madura, casa com a carga dos 327 insumos) |
| D-4 | Bot que está fora do ar | Fica parado por ora; não mexer no n8n enquanto a ideia se formula |
| D-5 | O bot age ou só consulta? | **Consulta E age, com limitações configuráveis** (ver §5) |
| D-6 | Handoff humano | **Sim, com escala configurável** — pode ter escala de plantão ou responsável fixo, por departamento (ver §6) |
| D-7 | n8n: manter ou substituir? | **Fase 1: n8n fica, mas emagrece** (transporte + multimodal); lógica de negócio migra para o ERP. Fase 2 reavalia (assinatura ~R$ 160/mês ≈ R$ 1.920/ano — não é motivo para pressa) |

## 3. Arquitetura formulada

```
Funcionário → WhatsApp (Meta Cloud API)
  → n8n ("carteiro"): recebe webhook, deduplica, transcreve áudio,
    analisa imagem/documento, envia resposta, handoff humano
  → ERP (o "cérebro de negócio"):
      1. valida o número → qual funcionário? qual departamento? qual escopo?
      2. IA consulta/age via API do ERP com a PERMISSÃO DO FUNCIONÁRIO
      3. cada interação gravada (mensagem, resposta, dados consultados, ação)
  → Gestão acompanha em tela do ERP
```

**Princípio central — permissão por interseção:** o agente só faz o que
`(permissão do robô) ∩ (permissão do funcionário)` permite. O robô tem um
usuário de serviço com perfil mínimo; o escopo por departamento vem do RBAC
que o ERP já tem (perfis de acesso, decisão D-K de segregação). O bot nunca
é um super-usuário.

**O que muda em relação ao que existe hoje no n8n:**
- Validação de número: sai do MySQL avulso da Hostinger → passa a consultar o ERP
  (o MySQL pode permanecer como cache/estado de conversa)
- Ferramentas dos sub-agentes: saem do Google Sheets/Drive → viram chamadas à
  API do ERP
- Registro: cada interação passa a ser gravada no ERP (hoje não é gravada em
  lugar nenhum auditável)

## 4. O que o ERP precisa ganhar (escopo macro, sem detalhamento técnico ainda)

1. **Cadastro de números WhatsApp** — vínculo número ↔ funcionário ↔
   departamento; gestão inclui/bloqueia; status
2. **Registro de conversas** — mensagem recebida, resposta da IA, departamento
   roteado, dados consultados, ação executada, handoff
3. **Tela de monitoramento** para gestão — por funcionário/departamento/período,
   com busca no conteúdo
4. **Usuário-robô** com perfil de acesso próprio e mínimo
5. **Política de ações do bot** (ver §5) — tabela configurável pela gestão
6. **Configuração de handoff** (ver §6) — responsáveis e escala por departamento

## 5. Níveis de ação do bot (D-5 — "age com limitações configuráveis")

A limitação é uma **política configurável pela gestão** (departamento × ação),
não código fixo. Formulação em 4 níveis:

| Nível | O que é | Exemplo | Salvaguarda |
|-------|---------|---------|-------------|
| **N0 — Consulta** | Só leitura. Default de tudo | "quanto tem de MP-057?" | Escopo do departamento |
| **N1 — Ação leve** | Escrita de baixo risco, **com confirmação no chat** ("Confirma? SIM") | Abrir chamado de TI; registrar leitura de inventário | Confirmação explícita + registro com autoria |
| **N2 — Ação de processo** | Inicia um fluxo que **segue a aprovação normal do ERP** | Abrir requisição de compra (vai para aprovação do gerente, como sempre) | O fluxo de aprovação existente; o bot só INICIA, nunca aprova |
| **N3 — Proibido sempre** | Nunca pelo bot, independente de configuração | Aprovar compra, cancelar NF-e, alterar cadastro mestre, tudo que é gate de diretoria | Bloqueio de código, não de política |

Regras transversais:
- Toda ação N1/N2 é gravada com **autoria do funcionário** (via bot), não do robô
- A segregação de função (D-K) vale integral: se o funcionário não pode
  aprovar no sistema, não pode pelo WhatsApp — e o bot em si nunca aprova nada
- A gestão configura na tela: por departamento, quais ações estão em N0/N1/N2

## 6. Handoff humano (D-6 — "com escala configurável")

- **Gatilhos:** funcionário pede humano; a IA não sabe responder; assunto
  sensível (configurável)
- **Configuração por departamento:** responsável fixo OU escala de plantão
  (dias/horários), com fallback se ninguém disponível
- **Fora de horário:** mensagem de indisponibilidade + registro para o
  responsável ver depois
- **Tudo registrado** no mesmo monitor da gestão (quem assumiu, quando, desfecho)

## 7. Fases

| Fase | Conteúdo | Pré-requisito |
|------|----------|----------------|
| **0** | Consertar o bot atual (nó `Confirma Visualização Wts` falhando desde 10/08 14:52) | Decisão do dono de religar |
| **1** | Fundação no ERP: cadastro de números, registro de conversas, monitor, usuário-robô + n8n passa a validar número e registrar no ERP | URL pública para o ERP (Cloudflare Tunnel resolve antes do servidor de produção) |
| **2** | Piloto Almoxarifado: sub-agente consulta estoque real via API (N0) | Fase 1 + cadastro real carregado (✅ feito 10/08) |
| **3** | Ações N1/N2 com política configurável + handoff com escala | Fase 2 validada |
| **4** | Expansão aos demais departamentos | Fase 3 |
| **5** | Clientes externos (número não cadastrado → fluxo público: catálogo, status do pedido dele) | Decisão comercial do dono |
| **futuro** | Reavaliar absorver o transporte (substituir n8n por serviço próprio) | Servidor de produção + estabilidade |

## 8. Riscos e salvaguardas formulados

| Risco | Salvaguarda |
|-------|-------------|
| IA responder dado errado (alucinação) | Respostas de dados SEMPRE vêm de chamada à API (tool calling), nunca da "memória" do modelo; monitor da gestão permite auditar |
| Mensagens duplicadas da Meta (entrega at-least-once) | Deduplicação por ID de mensagem (hoje não existe no fluxo — provável causa das execuções repetidas vistas no log) |
| Vazamento de escopo (funcionário vê dado de outro depto) | Permissão por interseção + testes de integração cobrindo a recusa |
| Monitoramento oculto de funcionários (LGPD) | Aviso de canal corporativo monitorado antes do rollout (1 parágrafo; decisão do dono) |
| Robô com poder demais | Usuário-robô com perfil mínimo; N3 bloqueado em código; bot nunca aprova |
| Dependência do n8n.cloud | Aceita na fase 1 (custo baixo, R$160/mês); plano de saída formulado para o futuro |

## 9. Referências da pesquisa (10/08/2026)

- Mercado: [HSO — ERP AI Chatbots](https://www.hso.com/blog/erp-ai-chatbots/), [Chatarmin](https://chatarmin.com/en/blog/chatgpt-whats-app) (Meta baniu assistentes genéricos em jan/2026; bots de negócio na Business API seguem permitidos)
- Arquitetura webhook: [Hookdeck](https://hookdeck.com/webhooks/platforms/guide-to-whatsapp-webhooks-features-and-best-practices) (200 imediato + fila; dedupe por ID), [DEV](https://dev.to/achiya-automation/building-whatsapp-business-bots-with-the-official-api-architecture-webhooks-and-automation-1ce4)
- Permissões de agente: [Arcade](https://www.arcade.dev/blog/connect-ai-agents-enterprise-tools/), [Atlan](https://atlan.com/know/ai-agent-access-control/) (interseção robô ∩ usuário)
- n8n × código próprio: [MrHaseeb](https://mrhaseeb.com/blog/langgraph-vs-n8n-vs-a-custom-state-machine), [GMI](https://www.gmicloud.ai/en/blog/n8n-vs-langgraph-orchestration) (visual para transporte, negócio em código)

## 10. Aberto — ainda sem decisão

- **Modelo de IA** (hoje Gemini nos fluxos): a arquitetura é agnóstica; escolher
  na fase 2 comparando custo × qualidade nas perguntas reais da fábrica
- **Aviso LGPD**: texto e canal de comunicação aos funcionários (dono decide o
  momento)
- **Quem são os humanos do handoff** por departamento (nomes reais — junto com a
  substituição dos usuários de teste)
- **Papel exato do domínio na Cloudflare** (dono ainda vai detalhar) — candidato
  natural a expor a API do ERP para o n8n via subdomínio/Tunnel
