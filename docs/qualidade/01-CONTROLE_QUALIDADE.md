# Controle de Qualidade - Módulo Qualidade

## 1. Incoming (Inspeção de Recebimento)

### Critérios de Inspeção por Material

| Material | Item a Inspecionar | Critério | Amostragem | Instrumento |
|----------|-------------------|----------|------------|-------------|
| Cone 12" | Diâmetro externo | 305 ±0,5 mm | 5% | Paquímetro |
| Cone 12" | Espessura borda | 0,8 ±0,1 mm | 5% | Micrômetro |
| Cone 12" | Peso | 25 ±2 g | 5% | Balança |
| Cone 12" | Acabamento | Sem rebarbas, trincas | 100% visual | Visual |
| Bobina VC | Resistência DC | 6,5 ±0,3 Ω | 10% | Multímetro |
| Bobina VC | Diâmetro interno | 50,8 ±0,1 mm | 10% | Paquímetro |
| Bobina VC | Peso | 12 ±1 g | 10% | Balança |
| Imã Ferrite | Dimensões | 200x50x20 ±1 mm | 10% | Paquímetro |
| Imã Ferrite | Fluxo magnético | 12.000 ±500 Gauss | 100% | Gaussmeter |
| Basket | Dimensões | Conforme desenho | 5% | Gabarito |
| Basket | Pintura | Sem falhas, uniforme | 100% visual | Visual |

### Tabela AQL (Acceptable Quality Level)

| Lote | Nível I (Normal) | Nível II (Reduzido) | Nível III (Apertado) |
|------|-----------------|-------------------|-------------------|
| Até 50 | 13 | 8 | 21 |
| 51-150 | 21 | 13 | 34 |
| 151-500 | 34 | 21 | 55 |
| 501-1200 | 55 | 34 | 89 |
| 1201-10000 | 89 | 55 | 144 |

## 2. In-Process (Controle de Processo)

### Parâmetros Controlados por Operação

| Operação | Parâmetro | Especificação | Frequência | Ação Corretiva |
|----------|-----------|--------------|------------|---------------|
| Injeção | Temperatura zona 1 | 180 ±5°C | 1x/hora | Ajustar controlador |
| Injeção | Pressão injeção | 80 ±5 bar | 1x/hora | Ajustar válvula |
| Injeção | Peso da peça | 25 ±2 g | 5 un/hora | Regular parâmetros |
| Bobinagem | Resistência DC | 6,5 ±0,3 Ω | 1 un/50 | Ajustar voltas |
| Bobinagem | Tensão do fio | 30 ±5 gf | 1x/hora | Ajustar grampo |
| Colagem | Gramatura de cola | 3 ±0,5 g | 1 un/20 | Regular aplicador |
| Solda | Temperatura ferro | 350 ±20°C | 1x/hora | Ajustar estação |
| Teste | Impedância | 8 ±0,5 Ω | 100% | Reprovar |

### Carta de Controle (CEP)

```
Carta de Controle - Peso do Cone (g)
╔═════════════════════════════════════════════════════════════╗
║ LSE: 29,0 ──────────────────────────────────────────────── ║
║      28,0 │                             │  │              │ ║
║      27,0 │  ●   ●     ●  ●     ●        │              │ ║
║      26,0 │ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●       │ ║
║ MÉDIA:25,0 │● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ║
║      24,0 │              ●        ●  ●                  │ ║
║      23,0 │                 ●              ●            │ ║
║      22,0 │                                            │ ║
║ LIE: 21,0 ──────────────────────────────────────────────── ║
║         1  2  3  4  5  6  7  8  9  10 11 12 13 14 15     ║
╚═════════════════════════════════════════════════════════════╝
LSE = Limite Superior Especificado (25 + 4,0)
LIE = Limite Inferior Especificado (25 - 4,0)
Média = 25,0 g (OK)
Capacidade: Cp = (29-21)/(6x1,5) = 0,89 (NECESSITA MELHORIA)
```

## 3. Final (Inspeção de Produto Acabado)

### Check-list de Inspeção Final

| Item | Critério | Método | Ação |
|------|----------|--------|------|
| 1. Cone | Sem trincas, deformações | Visual | Rejeitar |
| 2. Surround | Bem colado, sem bolhas | Visual | Rejeitar |
| 3. Spider | Centralizado, bem colado | Visual | Rejeitar |
| 4. Bobina | Sem fio solto | Visual | Rejeitar |
| 5. Gap | Folga uniforme (0,5 mm) | Calibre | Rejeitar |
| 6. Terminal | Bem soldado, sem curtos | Teste elétrico | Rejeitar |
| 7. Basket | Sem amassados, pintura OK | Visual | Rejeitar |
| 8. Cabo | Plug conectado | Teste | Rejeitar |
| 9. Impedância | 8 ±0,5 Ω | Multímetro | Reprovar |
| 10. Polaridade | + no terminal | Teste | Inverter |
| 11. Ruído | Sem chiado, batendo | Teste acústico | Reprovar |
| 12. Rótulo | Código, lote, data | Visual | Recolocar |

### Plano de Amostragem para Testes

| Teste | Frequência | Critério |
|-------|-----------|----------|
| Visual | 100% | Sem defeitos |
| Impedância | 100% | 8 ±0,5 Ω |
| Polaridade | 100% | Correta |
| Curto-circuito | 100% | Resistência infinita |
| THD (Distorção) | 1 un/100 | < 5% |
| Potência RMS | 1 un/500 | | 300W por 2h |
| Resposta em Frequência | 1 un/1000 |

---

## 4. Como o ERP registra a inspeção (G7, implementado em 2026-08-10)

> **Decisão D-H do dono do produto:** a empresa pretende se certificar
> ISO 9001, então o registro de inspeção nasce já no formato que a norma
> pede — **sem** travar a operação de hoje com burocracia que ninguém ainda
> executa. Registro em
> `docs/governance/PLANO_ACAO_CADEIA_PRODUTO_2026-08-09.md` §4.

### 4.1 O que existia antes (e por que não servia)

Até 2026-08-10 **não havia entidade de inspeção no ERP**. Liberar um lote da
quarentena era `POST /api/inventory/lots/:id/release` com um campo `notes`
livre — sem inspetor identificado, sem critério de aceitação, sem resultado,
sem amostra. As únicas entidades chamadas "inspeção" no sistema eram
`SstInspecaoSeguranca`/`SstInspecaoItem`, do domínio de Segurança do
Trabalho, sem relação nenhuma com lote. O registro mais próximo de qualidade
era a **RNC** (`non_conformities`), que é reativa — documenta o problema
depois — e não substitui o registro de liberação.

Isso não atende à **ISO 9001:2015 §8.6**, que exige reter informação
documentada da liberação incluindo **evidência de conformidade com os
critérios de aceitação** e **rastreabilidade à(s) pessoa(s) que autorizou(aram)
a liberação**.

⚠️ O texto integral da ISO 9001 é protegido por direito autoral e não é
publicamente acessível (iso.org devolve HTTP 403). As cláusulas são citadas
por **número e assunto**, que são públicos e estáveis; **o texto literal deve
ser conferido no exemplar adquirido pela empresa** antes de citação em
documento de auditoria. Fonte da pesquisa:
`docs/business/PESQUISA_NORMATIVA_CADEIA_PRODUTO_2026-08-09.md` §Decisão 5.

### 4.2 A entidade: `quality_inspections`

| Campo | Cláusula que atende | Observação |
|---|---|---|
| `lot_id` | §8.5.2 (rastreabilidade) | toda inspeção é sobre um lote — obrigatório |
| `stage` | — | `incoming` (recebimento) \| `in_process` \| `final` |
| `acceptance_criteria` | **§8.6** | o critério contra o qual o lote foi verificado — obrigatório |
| `verdict` + `defects_found` | **§8.6** | resultado da verificação |
| `concession_justification` | **§8.7** | obrigatória na aceitação sob concessão |
| `inspector_id` | **§8.6** | responsável — sempre do JWT, nunca do payload |
| `sampling_plan`, `lot_size`, `sample_size` | — | evidência do plano aplicado (opcionais) |
| `non_conformity_id` | **§8.7** | RNC aberta na reprovação |

E no próprio lote (`lot_controls`), a rastreabilidade de **quem autorizou a
liberação**, que a §8.6 pede e que antes não existia em lugar nenhum:
`release_inspection_id`, `released_by`, `released_at`.

### 4.3 O gate: liberar deixou de ser um clique

`POST /api/inventory/lots/:id/release` agora **exige** que a inspeção **mais
recente** do lote tenha veredito `approved` ou `approved_under_concession`.
Se não tiver, devolve **422** com `details.rule = "G7"` e
`details.reason ∈ { no_inspection, last_inspection_rejected }` — **sem gravar
nada** no lote.

```
recebimento → lote em QUARENTENA
    ↓
POST /api/quality/inspections   (critério + resultado + inspetor + lote)
    ├── approved / approved_under_concession → habilita a liberação
    └── rejected → abre RNC e BLOQUEIA o lote (caminho do G8/G10)
    ↓
POST /api/inventory/lots/:id/release   (quem autoriza vem do JWT)
    ↓
lote AVAILABLE → produção pode consumir (FEFO)
```

**Por que "a mais recente" e não "existe alguma aprovada":** é a única
leitura que sobrevive ao retrabalho. Com "existe alguma aprovada", um lote
aprovado na entrada e reprovado depois continuaria liberável para sempre — o
oposto do que a §8.7 manda. Assim, a **re-inspeção após retrabalho** é o
mecanismo natural de reabertura: basta registrar a nova inspeção.

**Aceitação sob concessão** (§8.7) é veredito próprio, com justificativa
obrigatória (mín. 10 caracteres) — nunca um "release com observação".

**Reprovação não foi reimplementada:** ela delega a
`CreateNonConformityUseCase`, o mesmo caminho já corrigido nos gaps **G8**
(teste acústico reprovado sempre abre RNC) e **G10** (RNC que não consegue
bloquear o lote avisa explicitamente). Esse caso de uso já bloqueia o lote,
já herda o fornecedor e já recalcula `suppliers.quality_score`.

### 4.4 A quarentena deixou de ser decorativa

Achado colateral confirmado no código junto com o G7: o recebimento cria o
lote em `quarantine` **mas já incrementa `products.quantity`**. Como o MRP e
a checagem de disponibilidade de OP liam esse saldo bruto, **material não
inspecionado contava como disponível** — o MRP comprava de menos e a OP era
aprovada contra material que o FEFO (que só consome lote `available`) nunca
conseguiria consumir.

Corrigido no lado da leitura: o planejamento passa a descontar o saldo retido
em lotes `quarantine`/`blocked`, sempre com `max(0, físico − retido)`. O
saldo **físico** continua sendo `products.quantity` (o material está lá, é
verdade) — o que mudou é o número que o planejamento enxerga.

### 4.5 Encerramento da RNC: data e responsável (corrigido em 2026-08-10)

> **Achado §3 de
> [`VARREDURA_ESCRITA_REAL_2026-08-10.md`](../governance/auditorias/VARREDURA_ESCRITA_REAL_2026-08-10.md).**
> Corrigido antes do Go-Live, e não depois, por um motivo simples: as 6 RNCs
> do banco estavam **todas `open`**, então nada se perdeu ainda. Corrigir
> agora custa nada; corrigir depois exigiria reconstituir uma data de
> fechamento que ninguém tem.

**O que estava errado.** `UpdateNonConformityUseCase` gravava `closed_at`.
A coluna real de `non_conformities` é **`closed_date`** (`DATE`) — `closed_at`
não existe. O Sequelize **descarta em silêncio** uma chave que não é atributo
do model: o `UPDATE` era emitido sem ela, a API respondia `200` e o campo
nunca era preenchido. Reprodução contra o PostgreSQL real:

```
ANTES  UPDATE "non_conformities" SET "status"=$1,"closed_by"=$2,"updated_at"=$3 WHERE "id" = $4
DEPOIS UPDATE "non_conformities" SET "status"=$1,"closed_by"=$2,"closed_date"=$3,"updated_at"=$4 WHERE "id" = $5
```

Sem `closed_date` não há como medir tempo de tratativa nem provar
tempestividade em auditoria — **ISO 9001:2015 §8.7** (controle de saídas não
conformes) e **§10.2** (não conformidade e ação corretiva) exigem o registro
do encerramento.

**A segunda ocorrência, que a auditoria não tinha apontado.** Ao varrer o
módulo apareceu o outro caminho de encerramento: `DELETE /api/quality/
non-conformities/:id` (`CloseNonConformityUseCase`) gravava **apenas**
`status = 'closed'` — sem data e **sem responsável**. Sintoma idêntico, rota
diferente, e justamente a mais fácil de acionar por engano.

**Como ficou.** Os dois caminhos passaram a derivar os campos de encerramento
da mesma função (`modules/nonConformities/domain/closure.ts`), e um teste
compara os dois payloads para que não voltem a divergir:

| Rota | Efeito no encerramento |
|---|---|
| `PUT /api/quality/non-conformities/:id` com `status: 'closed'` | grava `status`, `closed_date` (`YYYY-MM-DD`) e `closed_by` |
| `DELETE /api/quality/non-conformities/:id` | idem — antes gravava só o `status` |

**`closed_by` vem do JWT, nunca do body.** Ele estava em `ALLOWED_FIELDS` do
`PUT`, então bastava enviá-lo no payload para atribuir o encerramento a outra
pessoa. Foi removido da lista — mesmo padrão anti-spoofing de identidade da
remediação 3.1 (2026-08-02).

> Nota de fuso: `closed_date` usa a mesma convenção de "hoje" já adotada em
> ~90 pontos do backend (`toISOString().slice(0, 10)`, portanto UTC). Um
> encerramento feito depois das 21h (UTC-3) grava a data do dia seguinte. A
> troca, se for decidida, é num único ponto (`domain/closure.ts`).

### 4.6 ⚠️ O que o ERP **não** decide (pendência da Engenharia da Qualidade)

**A tabela AQL da seção 1 deste documento é ilustrativa e NÃO é executada
pelo sistema.** O ERP não tem motor de amostragem Ac/Re, e isso é
deliberado:

- `ABNT NBR 5426:1985` está **CANCELADA** — não use em procedimento novo;
- a norma vigente é a série **ISO 2859**, parte aplicável **ISO 2859-1**
  (a edição 1999 foi retirada e substituída pela **ISO 2859-1:2026**);
- ⚠️ `[NÃO CONFIRMADO NA FONTE]` se já existe adoção ABNT da 3ª edição
  (`ABNT NBR ISO 2859-1`) e em que ano — verificar no catálogo ABNT antes de
  citar a versão brasileira;
- **a norma fornece as tabelas; ela não escolhe o número.** Nível de inspeção
  e AQL por classe de defeito são decisão de engenharia/contrato. Qualquer
  valor que o ERP embutisse seria invenção.

Por isso `sampling_plan`/`sample_size`/`lot_size` são texto/valor livre de
**evidência**, e o veredito é sempre do inspetor humano.

**Pendente do dono / da Engenharia da Qualidade** para que a amostragem vire
regra de sistema:
1. aquisição da ISO 2859-1 (edição vigente);
2. definição do nível de inspeção e do AQL **por classe de defeito**;
3. se existe contrato OEM que imponha plano de amostragem próprio (se sim,
   ele se sobrepõe ao padrão interno).

Enquanto isso não for decidido, o ERP **não** implementa comutação de regime
(normal/severo/atenuado) nem cálculo automático de aceitação.
