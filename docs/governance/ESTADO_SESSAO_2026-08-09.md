# Estado da sessão — 2026-08-09

**Documento de retomada.** Serve para parar o trabalho numa máquina e continuar em
outra sem perder contexto. Leia este arquivo primeiro, depois `git log`, depois a
seção "Fila de próximos passos".

Documento anterior equivalente: `ESTADO_SESSAO_2026-08-07.md`.

---

## 1. Onde estamos

### Meta que orienta tudo (definida pelo dono nesta sessão)
> "Um insumo é cadastrado e segue seu curso até virar produto finalizado,
> passando pelos departamentos, **sem gap**."

Esse é o critério de aceite final: a corrente `cadastro do item → estrutura →
demanda → requisição → cotação → pedido → recebimento → qualidade → estoque →
ordem de produção → apontamento → consumo → lote de acabado → inspeção →
estoque de acabado → venda → NF-e → expedição` precisa fechar sem ponto onde o
processo permita erro ou pule etapa.

### Situação do pipeline de módulos novos
Blocos 0–5 fechados (LGPD, SST, TI, Jurídico, Facilities, Marketing).
**Bloco 6 (RH) em execução** — ver seção 4.

---

## 2. Commits desta sessão (todos pushados)

| Commit | O que entregou |
|---|---|
| `97628ae` | **Gap Jurídico fechado** — RF-JUR-030 (atos societários) + RF-JUR-003 (alçada de aprovação de contrato em 3 faixas: ≤R$50k direto / R$50k–300k 1 diretor / >R$300k diretor+financeiro). 2 migrations aplicadas. |
| `b04e21d` | **Build de produção do client destravado** + telas do gap Jurídico. |
| `a2947b9` | **Correção de 500 no widget de Jurídico** da home (enum inexistente). |
| `60e1362` | **Design do Bloco 6 RH** — requisitos, schema (20 tabelas `hr_*`, 16 migrations), API (~77 endpoints), auditoria cruzada. |

### Dois achados desta sessão que valem registro permanente

**A. O build de produção estava quebrado no `main` e ninguém sabia.**
`npm run build` do `client/` falhava com 25 erros em 13 arquivos (Facilities,
Marketing, Tesouraria, Contabilidade). Causa: `zodResolver` tipa
`Resolver<z.input, ctx, z.output>` e os formulários declaravam `useForm<z.infer>`
(tipo de saída) para os dois papéis. Corrigido com o generic de 3 parâmetros
`useForm<z.input<typeof schema>, unknown, FormData>`.
👉 **Regra que passa a valer**: `npx tsc --noEmit` **não** é critério de aceite de
frontend — ele fica limpo com o build quebrado. O critério é `npm run build`
(que roda `tsc -b`, mais rigoroso).

**B. Bug de enum que passa por typecheck e por 1200+ testes.**
`SequelizeDeadlineRepository.listCritical()` filtrava por `status='escalated'`,
valor que não existe no enum. O Postgres rejeitava a query inteira → 500.
Nem o typecheck (o `where` do Sequelize é `any`) nem os testes (repositório
mockado, sem Postgres) pegam isso.
👉 **Regra que passa a valer**: todo literal de status/enum usado em query ou
escrita precisa ser conferido contra a migration da coluna. Uma varredura
completa foi feita e **não achou outra ocorrência**; o módulo `ti` recebeu
validadores Zod para fechar a superfície adjacente (valor inválido agora
retorna 400, não 500).

---

## 3. Auditoria do fluxo do produto final — 17 gaps

Mapeamento do fluxo **real do código** (não da documentação), 21 estações.
Artefato visual publicado para o dono:
<https://claude.ai/code/artifact/aad98974-1e2e-4980-bf24-01192b5e1128>

### Os 6 que quebram a corrente

| ID | Gap | Etapa |
|---|---|---|
| **G2** | Ordem de produção conclui sem estrutura ativa (erro engolido): nada é consumido, nenhum lote baixado, produto entra em estoque com **custo zero** — contamina o custo médio. | Produção |
| **G3** | Reserva de estoque é contador global no produto, **não vinculada à OP** — uma ordem consome/libera a reserva de outra (canibalização). | Produção |
| **G1** | **Duas estruturas de produto (BOM) paralelas** sem sincronização: MRP planeja por `item_estruturas`, produção consome por `bill_of_materials`. Ligadas só por casamento de string de código. | Cadastro |
| **G9** | **Nenhum gate impede vender/expedir sem qualidade aprovada.** Única exigência de expedição é NF-e autorizada. | Qualidade |
| **G11** | Aprovação de requisição e de pedido de compra no **mesmo nível de quem cria**, sem alçada por valor. Aprovar o pedido já gera a conta a pagar. | Suprimentos |
| **G7** | **Inspeção de qualidade não existe como entidade.** Liberar lote da quarentena é um clique com observação livre — sem critério, amostragem ou resultado registrados. | Qualidade |

### Os demais

`G4` conclui OP sem apontamento → mão de obra R$ 0,00 · `G12` cotação e
requisição geram pedido em duplicidade · `G13` AP antes da mercadoria, AR antes
da NF-e, venda à vista nasce "paga" sem baixa · `G14` importação entra sem lote,
sem quarentena e sem AP · `G8` teste acústico não bloqueia nada · `G10` NC sem
lote informado não bloqueia · `G16` OP via MRP não valida material nem tipo ·
`G17` venda não gera produção; MRP não lê carteira nem estoque mínimo ·
`G5` roteiro de fabricação não tem API (não dá para cadastrar) · `G6` início da
produção não valida nada · `G15` campos e status sem uso.

---

## 4. Bloco 6 — RH (em execução)

**Design commitado** em `60e1362`:
- `docs/business/BLOCO_6_RH_REQUISITOS.md` — 81 RF (19 P0 / 49 P1 / 8 P2), UC-67 a UC-71
- `docs/business/BLOCO_6_RH_MODELO_DADOS.md` — 20 tabelas `hr_*`, 5 triggers de imutabilidade legal
- `docs/business/BLOCO_6_RH_API.md` — ~77 endpoints em `/api/rh/*`
- `docs/business/BLOCO_6_RH_AUDITORIA.md` — 15 achados (8 corrigidos, 4 escalados, 3 informativos)
- Migrations `20260808-000010` a `000025` — **commitadas, NÃO aplicadas ao banco**

**Folha de pagamento e ponto = comprar/integrar, não desenvolver** (decisão do dono).
Só a fronteira de integração foi especificada.

### 3 regras de negócio decididas pelo dono nesta sessão

1. **Dado sensível** — `rh:approve` fica só para ações de alto impacto. Ver **CID**
   exige módulo `rh` **E** `sst`; ver **salário individual** da folha exige `rh`
   **E** `financeiro`. Sem a interseção, o campo é omitido do retorno (sanitização
   por campo, mecanismo já existente em `employeeSensitiveFields.ts`), não 403 na rota.
2. **Treinamento normativo** — **SST é fonte única** para curso de NR. O RH delega
   a checagem de apto/inapto ao blocklist do SST via adapter; `hr_employee_trainings`
   é espelho de leitura para normativo e fonte primária só do treinamento corporativo.
3. **Demissão** — processo formal **obrigatório**: `DELETE /api/employees/:id` fica
   bloqueado quando existir `TerminationProcess`, garantindo ASO demissional,
   devolução de ativos e prazo legal de verbas.

Mais uma correção obrigatória (não é decisão): `'pcd'` entra em
`SENSITIVE_EMPLOYEE_FIELDS` — sem isso a condição de PCD ficaria visível a
qualquer usuário autenticado, porque `GET /api/employees` não passa pelo gate `rh`.

### Status da implementação
Backend **passada 1 (só os 19 RF P0)** em andamento: férias, contrato de
experiência, admissão e demissão. Passada 2 (P1/P2: benefícios, treinamentos,
recrutamento, avaliação, importação de folha/ponto, KPIs) fica para depois —
mesmo modelo de 2 passadas usado no Jurídico.

⚠️ **Exigência dada ao implementador**: toda regra de origem legal deve seguir a
legislação verificada na fonte (Planalto), não a paráfrase do documento de
requisitos — CLT arts. 130, 134, 137, 143 (férias), 445/451 (experiência),
477 §6º (prazo de verbas). Divergência entre lei e requisito deve ser reportada,
não corrigida em silêncio.

---

## 5. Fila de próximos passos (retomar exatamente daqui)

1. **[EM ANDAMENTO]** Backend RH passada 1 (P0) — validar typecheck + suíte, commitar.
2. **[EM ANDAMENTO]** Pesquisa normativa das 6 decisões de processo (3 agentes:
   produção/BOM/apontamento; qualidade/estoque; compras/financeiro). Resultado vira
   recomendação fechada com fonte para o dono validar.
3. **[EM ANDAMENTO]** Auditoria de consistência **banco × documentação × código** da
   cadeia do produto → `docs/governance/auditorias/AUDITORIA_CONSISTENCIA_CADEIA_PRODUTO_2026-08-09.md`.
4. **[PENDENTE]** Consolidar 2 e 3 num **plano de ação priorizado dos 17 gaps**,
   registrado em `docs/governance/`.
5. **[PENDENTE]** Executar as correções dos gaps por prioridade.
6. **[PENDENTE]** Aplicar as 16 migrations `hr_*` (exige aprovação do dono) —
   usar `server/scripts/apply-pending-migrations.cjs`, **nunca `migration:up` cru**.
7. **[PENDENTE]** Telas do RH + passada 2 do backend.
8. **[PENDENTE]** **Teste ponta a ponta**: cadastrar um insumo real e levá-lo até
   produto acabado expedido, provando que a corrente fecha (critério de aceite da seção 1).
9. **[PENDENTE]** Limpeza de resíduos (`cleanliness-review`).

### Decisões que ainda dependem do dono
As 6 perguntas do artefato de fluxo (produção sob encomenda, unificação de BOM +
quem aprova alteração de engenharia, gate de qualidade, alçada de compra,
apontamento obrigatório, MRP automático). **Onde houver lei ou norma que já
responda, a recomendação vem fechada com a fonte e o dono só valida.**

---

## 6. Como subir o ambiente em outra máquina

```bash
git pull

# .env do server precisa existir (não é versionado)
# Postgres + API
docker compose up -d --build

# Frontend
cd client && npm run dev      # http://localhost:5173
```

Conferir migrations antes de qualquer coisa:
```bash
cd server && npm run migration:status
```

### Armadilhas conhecidas deste projeto
- **Nunca** rodar `migration:up` cru — usar `server/scripts/apply-pending-migrations.cjs`.
- Após `git pull` que toque `server/`, rodar `docker compose up -d --build`
  (senão a imagem da API fica com código velho).
- `comment:` dentro de `addColumn` corrompe o SQL quando o texto tem parênteses —
  usar `COMMENT ON COLUMN` explícito.
- Critério de aceite de frontend é `npm run build`, não `npx tsc --noEmit`.
- Literal de enum em query/escrita: conferir contra a migration da coluna.
- A senha do admin no `.env` local **não** confere com a do banco (incidente
  anterior) — login por API precisa de credencial válida real.
