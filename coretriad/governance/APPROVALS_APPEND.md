

---

## APR-2026-054 — `CASE-001` (`FIND-ERP-001`, idempotência): P1, P2, P3 decididas

**Data:** 2026-08-18
**Aprovador/Decisor:** dono do projeto (via sessão VeriCore/Claude Code)
**Insumo:** `remediation/cases/PENDING_DECISIONS_2026-08-17.md`

### P1 — parcelas idênticas legítimas

**Decisão: Opção A** — a chave de idempotência é gerada a cada nova
tentativa/abertura de tela. Parcelas legítimas de mesmo valor **continuam
permitidas**; o mecanismo bloqueia apenas duplo clique/reenvio de rede, não
o dado de negócio em si.

### P2 — consumidor externo das rotas de estoque/pagamento

**Decisão: CONFIRMADO — existe consumidor externo** (n8n/bot/integração)
fora do client oficial, usando as rotas de lançamento de estoque e
pagamento. **Consequência direta:** `operation_id`/chave de idempotência
**não pode ser obrigatória de imediato** — exige período de transição em
que a chave seja **opcional** antes de se tornar obrigatória.

### P3 — reenvio detectado

**Decisão:** responder **`409`** com erro claro — *"esta operação já foi
aplicada"*. Vedado replay silencioso `200`.

**Aprovado por:** dono do projeto (via sessão VeriCore/Claude Code) — 18/08/2026.

---

## APR-2026-055 — `CASE-002` (`FIND-ERP-005`, alçada de contrato jurídico): P4, valores de alçada, P5, P6 decididas

**Data:** 2026-08-18
**Aprovador/Decisor:** dono do projeto (via sessão VeriCore/Claude Code)
**Insumo:** `remediation/cases/PENDING_DECISIONS_2026-08-17.md`

### P4 — origem do valor de alçada

**Decisão: Opção A2** — manter os valores **R$ 50.000 / R$ 300.000 fixos no
código** (constantes), e **corrigir `docs/business/BLOCO_3_JUR_API.md` §2.7**
para descrever o mecanismo real: não existe tabela configurável, mudar o
limite exige deploy, e o mesmo limite vale para todo tipo de contrato.
Registrar explicitamente que a **Opção A1** (tabela configurável) foi
**avaliada e não escolhida por ora**.

### Valores de alçada (R$ 50.000 / R$ 300.000)

**Decisão:** usar esses valores **por ora**. Se estiverem errados, serão
corrigidos depois — **não bloquear** a correção por falta de validação
jurídica formal agora.

### P5 — quem assina aditivo que aumenta valor

**Decisão: Opção B1** — exigir nível de gestor (`approve`) para assinar
aditivo que altera o valor do contrato. Aditivo que não mexe em valor
continua no nível básico.

### P6 — estender a segregação D-K ("quem cadastra não aprova") ao Jurídico

**Decisão: Opção C2 — NÃO estender por ora.** Avaliado e recusado nesta
rodada. **Motivo registrado pelo dono:** hoje existe praticamente um único
usuário real (admin) operando o Jurídico; estender a regra o impediria de
aprovar qualquer contrato que ele mesmo cadastrasse, até existir um segundo
aprovador cadastrado. A parte mínima — duas aprovações não podem vir da
mesma pessoa — já é corrigida independentemente desta decisão.

**Aprovado por:** dono do projeto (via sessão VeriCore/Claude Code) — 18/08/2026.

---

## APR-2026-056 — `CASE-011` (`FIND-ERP-008`, emissão de CAT — SST): D1, D2, D3 decididas; D4 ABERTA

**Data:** 2026-08-18
**Aprovador/Decisor:** dono do projeto (via sessão VeriCore/Claude Code)
**Insumo:** `remediation/cases/PENDING_DECISIONS_2026-08-17.md`

### D1 — fonte de verdade do tipo da CAT

**Decisão:** o **sistema decide o tipo da CAT sozinho**, a partir da
gravidade do acidente já registrada — **não aceitar** o que a tela envia
sem checagem cruzada.

### D2 — calendário de feriados nacionais no prazo legal

**Decisão: NÃO implementar agora.** Registrar formalmente que o cálculo do
prazo fica **simplificado por ora** (considera apenas fins de semana, sem
feriados nacionais), com o requisito correspondente ajustado para refletir
essa simplificação.

### D3 — nome de quem emite a CAT

**Decisão: remover a promessa** da tela e da documentação. **Não criar**
campo próprio para esse texto — a autoria legal já é identificada pelo
login da pessoa.

### D4 — owner de SST/RH para validar a regra

**DECISÃO ABERTA/PENDENTE.** O dono vai indicar a pessoa/função responsável
em resposta futura. **Nenhum nome foi indicado** — registrado como
pendência, não como decisão.

**Aprovado por:** dono do projeto (via sessão VeriCore/Claude Code) — 18/08/2026.

---

## APR-2026-057 — `CASE-012` (`FIND-ERP-007`, rescisão de contrato de experiência — RH): P11-P15 decididas

**Data:** 2026-08-18
**Aprovador/Decisor:** dono do projeto (via sessão VeriCore/Claude Code)
**Insumo:** `remediation/cases/PENDING_DECISIONS_2026-08-17.md`

### P11 — motivo da rescisão deve ser gravado?

**Decisão: SIM.** Criar onde guardar o motivo; ele passa a aparecer de fato
no processo de demissão (hoje é descartado).

### P12 — lista fixa ou texto livre?

**Decisão: texto livre.** A tela continua com caixa de texto livre; o campo
passa a ser efetivamente persistido.

### P13 — obrigatório e nos dois caminhos de abertura de demissão?

**Decisão: SIM.** Motivo obrigatório; os dois jeitos de abrir um processo de
demissão devem aceitar/exigir o mesmo campo, sem assimetria entre os dois
fluxos.

### P14 — modalidade de aviso prévio na rescisão de contrato de experiência

**Decisão/fato confirmado pelo dono:** os contratos de experiência da Evok
**têm cláusula assecuratória de rescisão antecipada (art. 481 da CLT)**.

**Consequência jurídica** (pesquisada e confirmada pela VeriCore; fontes:
blog.econeteditora.com.br, juridico.ai, mwbc.adv.br — CLT arts. 479-481):
com cláusula assecuratória, a rescisão antecipada do contrato de experiência
segue as regras normais de contrato por prazo indeterminado, **incluindo
aviso prévio normal (trabalhado ou indenizado)** — **não se aplica** a
indenização do art. 479 (que só vale na ausência dessa cláusula).

### P15 — quem escolhe a modalidade do aviso prévio

**Decisão: RH escolhe manualmente na tela** — a tela passa a perguntar a
modalidade, igual ao outro fluxo de demissão que já tem essa escolha, já que
a modalidade não é mais fixa (decorre da cláusula assecuratória confirmada
na P14).

**Aprovado por:** dono do projeto (via sessão VeriCore/Claude Code) — 18/08/2026.

---

## APR-2026-058 — `CASE-013` (`FIND-ERP-009`, segregação quem-pede/quem-aprova): P17, P18, P20, P21 decididas; P19 ABERTA

**Data:** 2026-08-18
**Aprovador/Decisor:** dono do projeto (via sessão VeriCore/Claude Code)
**Insumo:** `remediation/cases/PENDING_DECISIONS_2026-08-17.md`

### P17 — escopo da regra "quem pediu não aprova" nos 24+ pontos mapeados

**Decisão: Opção (d)** — regra geral para todo ato de aprovação do sistema,
com **exceções nomeadas explicitamente** quando necessário. Esta opção
também resolve os 11 pontos extras encontrados na triagem (pagamento de
contas, liquidação financeira, etc.) que não estavam na lista original de
24.

### P18 — quando aplicar

**Decisão: tudo de uma vez, agora**, antes do Go-Live, já que hoje nenhum
módulo afetado tem dado real (zero contrato, zero contagem de estoque, zero
lançamento contábil, zero estrutura de produto) — aplicar agora não trava
nenhuma operação real.

### P19 — quem será o 2º aprovador em cada módulo

**DECISÃO ABERTA/PENDENTE.** O dono vai indicar as pessoas/módulos em
resposta futura. **Nenhum nome foi indicado** — registrado como pendência,
não como decisão. **Nota registrada:** sem essa resposta, a regra fica sem
efeito prático para o único usuário real (admin) assim que entrar em vigor
— aceitável antes do Go-Live, mas precisa ser resolvido antes de uso real.

### P20 — tolerância de diferença na contagem de estoque

**Decisão:** aceita a referência de mercado/fiscal pesquisada pela VeriCore
— **tolerância de ±2% em valor OU ±1 unidade, o que for maior**, antes de
exigir aprovação de nível superior na contagem de estoque. **Base:** prática
de mercado de acurácia de estoque e referência regulatória análoga (Decreto
12.955/2026 / Resolução 6/2026 CGIBS, que fixa 1% de tolerância fiscal de
perda para produtos a granel — usada aqui **como referência de mercado, não
como obrigação legal direta** sobre este controle interno).

### P21 — bloquear entrega de módulo novo sem checagem de lista de controle de aprovação

**Decisão: SIM.** O dono aceita que a esteira de testes passe a bloquear a
entrega de qualquer módulo novo que crie um ato de aprovação sem constar na
lista de controle revisada.

**Aprovado por:** dono do projeto (via sessão VeriCore/Claude Code) — 18/08/2026.
