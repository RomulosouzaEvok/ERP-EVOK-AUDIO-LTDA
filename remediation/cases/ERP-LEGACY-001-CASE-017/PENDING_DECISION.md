# CASE-017: Decisões de Negócio Pendentes

**Finding:** AUD-T01-01 (HIGH)  
**Caso:** ERP-LEGACY-001-CASE-017  
**Data:** 2026-08-18  
**Status:** Triagem concluída; 3 questões ao dono; bloqueado para implementação até resposta.

## Questões

### Q1: Intenção histórica de `estoque_atual` na criação

**Pergunta:**

O campo `estoque_atual` é aceito no schema de criação de item desde a origem do código. Foi permitido deliberadamente para carga de dados históricos/migração, ou é um artefato legado não descartado?

**Contexto:**
- CREATE aceita `estoque_atual` (itemValidators.ts:14).
- UPDATE bloqueia `estoque_atual` (itemValidators.ts:37-53).
- A assimetria sugere intenção, mas não há BR documentada.

**Impacto:** a resposta determina se a correção é "remover" (design legado) ou "corrigir fluxo" (design intencional).

---

### Q2: Forma correta de carregar saldo inicial em produção

**Pergunta:**

Qual é o fluxo autorizado para estabelecer saldo inicial de um item em produção real?

**Opções identificadas:**
- A: **Rejeitar saldo na API.** Saldo inicial sempre nasce em zero; qualquer carga **posterior** é feita como movimento de estoque explícito (tipo CARGA_INICIAL ou similar).
- B: **Aceitar saldo e gerar movimento automaticamente.** O saldo gravado em `estoque_atual` dispara a criação de uma entrada correspondente em `inventory_movements`, fechando a trilha.
- C: **Novo endpoint para carga de migração.** POST `/api/items` (padrão) não aceita saldo; novo endpoint `/api/items/load-with-initial-stock` aceita saldo com autorização de aprovador.

**Impacto:** 
- Opção A: simples, auditável, quebra clientes que enviarem saldo.
- Opção B: compatível com histórico, requer novo tipo de movimento e cuidado com automação falha.
- Opção C: protege o fluxo normal, requer documentação e treinamento; complexo.

**Recomendação técnica (não é decisão):** Opção A (rejeição) alinha com a intenção visível da atualização e força fluxo único. Opção B é mais amigável para migração. Opção C é mais segura operacionalmente.

---

### Q3: Quem autoriza carga inicial de saldo

**Pergunta:**

Qual papel/alçada deve estar presente para autorizar uma carga inicial de saldo de um item?

**Opções identificadas:**
- **`operate`** (operador de cadastro, nível baixo): acesso mais fácil, menos gatekeeping.
- **`approve`** (gestor/aprovador, nível intermediário): cada carga exige aprovação, auditável.
- **Admin direto** (superuser): máxima segurança, mínima auditoria (sem registrar quem autorizou).
- **Combinado** (ex.: `operate` prepara, `approve` autoriza): segregação de função.

**Contexto de APR-2026-021:**
- Decisão 4: "Aditivo que eleva valor **exige `approve`**" (Parte B).
- Saldo inicial é análogo a aditivo de valor (eleva o ativo da empresa).
- Sugestão: `approve` deve estar envolvido.

**Impacto:** determina quem pode chamar o fluxo de carga (seja qual for) e se há trilha de autorização.

---

## Respostas Esperadas

Para cada questão, respostas esperadas incluem:

- **Q1:** "Deliberado" ou "Legado".
- **Q2:** A, B, C ou alternativa.
- **Q3:** Papel/alçada + raciocínio.

Uma aprovação registrada em `APPROVALS.md` (novA entrada `APR-2026-0XX`) com as três decisões libera a implementação.

---

**Escalado para:** CoreTriad Director → Dono (Gilwagno)  
**Bloqueador:** Human gate — nenhum agente decide (Regra 6 do CLAUDE.md).
