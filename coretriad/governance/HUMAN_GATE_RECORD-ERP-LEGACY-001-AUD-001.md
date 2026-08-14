# HUMAN_GATE_RECORD — ERP-LEGACY-001-AUD-001 (gate do plano de auditoria)

```
GATE_RECORD_ID:  HGR-ERP-LEGACY-001-AUD-001-01
PROJECT_ID:      ERP-LEGACY-001
AUDIT_ID:        ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:    c1311a6f76b512fef893f7e60d934179cae3409f
APROVAÇÃO:       APR-2026-021 (coretriad/governance/APPROVALS.md)
DATA:            2026-08-14
DECISOR:         Gilwagno — dono do CoreTriad
OBJETO:          AUDIT_PLAN.md §12 (gates G1..G10) + AUDIT_PLAN_EMENDA_01.md
NATUREZA:        Registro de decisão humana pelo coretriad-director. O Director
                 NÃO supre gate por inferência (Regra 18) e NÃO emite juízo de
                 auditoria (Regra 5).
```

## 1. Quadro dos gates

| Gate | Objeto | Veredito | Fundamento |
|---|---|---|---|
| **G1** | Aprovar o `AUDIT_PLAN.md` como base do fieldwork | **SATISFEITO** | Texto literal do dono: "o fieldwork está autorizado a prosseguir dentro do escopo aprovado". Aprova o plano como base. |
| **G2** | Aprovar a coverage matrix planejada, incluindo `N-01…N-16` | **SATISFEITO, com efeito modificado por G3** | Mesma frase de G1. **Mas** as condições de G3 alteram células da matriz — ver §3. |
| **G3** | Amostragens | **APPROVED_WITH_CONDITIONS** | Condições materiais — ver §2. |
| **G4** | Fila `DYN-01…DYN-08` contra `erp_evok_audio_test` | **ABERTO** | Não respondido. A §5 da mensagem do dono trata da **vedação ao banco real** e da lacuna L-T1; **não autoriza** a fila contra o banco efêmero. Autorizar por analogia seria inferência. |
| **G5** | Homologar dispensa das trilhas de IA e do `agent-permission-auditor` | **ABERTO** | Não mencionado. |
| **G6** | Autorizar emenda formal ao `AUDIT_SCOPE.md` §2.3 (RA-09) | **ABERTO** | Não mencionado. |
| **G7** | Confirmar que remediações SanaCore não entram nesta run e exigem delta audit | **ABERTO** | O dono autorizou a SanaCore a executar (Parte C da APR-2026-021), mas **não** confirmou o ponto de processo do delta audit. Autorizar a execução ≠ decidir como a auditoria trata o código resultante. |
| **G8** | Dimensionamento (110 sessões) | **APPROVED** (`AUDIT_SESSIONS = 110`) | Manter; não reduzir escopo agora. |
| **G9** | Reafirmar que OWNER de BR é do dono; T-14 apenas reporta | **SATISFEITO** | Seção 6 da mensagem do dono, literal. |
| **G10** | `CAND-AUTHZ-01` (Compras/COMEX) | **CONDITIONAL_APPROVAL** | Entra como candidato/provisório — ver §4. |

## 2. G3 — condições vinculantes

Amostragem autorizada **apenas** se: (a) baseada em risco; (b) risco residual
**explicitamente registrado no relatório final**.

**Vedada amostragem reduzida** quando o item for crítico ou de alto impacto e
envolver, entre outros: autenticação; autorização; segregação de funções;
operações financeiras; movimentação de estoque; integridade de dados;
contratos/jurídico; permissões administrativas; operações destrutivas;
segurança; multi-tenancy; regras de negócio críticas. Nesses casos:
**cobertura ampliada ou 100% quando tecnicamente aplicável**.

## 3. Efeito material de G3 sobre a matriz aprovada em G2 (registrado, não silenciado)

As condições de G3 **incidem sobre células que o plano declarava amostrais ou
rasas**, entre elas: os 207 endpoints de `juridico`/`rh`/`sst` com D3 amostral
(amostra de 68) — `juridico` é contrato/jurídico e `rh`/`sst` tocam dado
pessoal; os 43 endpoints tier 3 em varredura rasa nominal; as 127 de 167
páginas do client não cobertas (N-07), na medida em que exponham decisão de
authZ ou operação financeira/destrutiva; e as declarações N que recaiam nas
categorias listadas.

**Consequência de processo:** a `AUDIT_COVERAGE_MATRIX.md` deve ser **revista
para conformidade com G3 antes do início do fieldwork**. A revisão pode elevar
o esforço acima das **110 sessões** fixadas em G8 — hipótese em que o aumento é
**nova decisão humana**, jamais absorção silenciosa (a lição do SIM-002 vale
nos dois sentidos: não prometer cobertura que não se entrega, e não entregar
menos cobertura do que o gate exigiu).

## 4. G10 — o que a aprovação condicional NÃO significa

`CAND-AUTHZ-01` entra no fieldwork como **candidato/provisório**, para
investigação e coleta de evidência. A decisão **não** implica: confirmação
automática da regra; promoção a requisito confirmado; aprovação do
comportamento; alteração de owner; aceitação de divergência. Mudança de status
depende de evidência suficiente e da validação correspondente — autoridade
VeriCore.

## 5. Estado do fieldwork

**PARCIALMENTE LIBERADO.** G1 está satisfeito, que é a condição dura declarada
no `AUDIT_PLAN.md` §12 ("enquanto G1 não for registrado, qualquer início de
fieldwork é violação de gate"). Porém:

1. **Pré-condição de conformidade:** a revisão da coverage matrix para atender
   G3 (§3) precede o fieldwork — auditar sob uma matriz que o próprio gate
   modificou produziria cobertura fora de conformidade desde o primeiro dia.
2. **Trilhas que dependem de `DYN-01…DYN-08` ficam bloqueadas por G4** —
   evidência dinâmica não pode ser coletada sem autorização da fila, nem
   substituída por leitura estática sem que a substituição seja declarada.
3. **RA-09 (correção da premissa de baseline no `AUDIT_SCOPE.md`) fica
   bloqueada por G6** — o escopo segue com uma afirmação sabidamente incorreta
   até a emenda ser autorizada.
4. **A dispensa das trilhas de IA segue não homologada (G5)** — dispensa com
   evidência técnica registrada, mas sem ratificação humana.
5. **O tratamento do código remediado pela SanaCore segue indefinido (G7).**

## 6. O que este registro NÃO faz

Não aprova gate por inferência; não altera severidade, confiança ou status de
finding; não convoca fieldwork; não atribui OWNER; não emite juízo de
auditoria. Severidade/confiança/status permanecem autoridade VeriCore
(Regras 2, 4, 5 e 18 do `CLAUDE.md`).
