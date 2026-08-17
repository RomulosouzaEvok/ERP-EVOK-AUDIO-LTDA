# `AUD-RH-VTHORISTA-01` — Limite de desconto de vale-transporte calculado sobre unidade salarial errada

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         T-35_C137_SEMANTICA_COLUNA_LOTE2.md (T35-RH-F02)
VALIDAÇÃO:      T-36_VALIDACAO_T35.md — CONFIRMED e REFORÇADO
SEVERIDADE:     CRITICAL  (fixada pelo dono, 2026-08-16)
ESTADO:         PROPOSED → CONFIRMED
AMBIENTE:       DEV / HOMOLOGAÇÃO
```

> **CLÁUSULA DE REAVALIAÇÃO AUTOMÁTICA.** Classificado como **sem risco ativo
> hoje** porque o módulo de RH/benefícios não está em produção. **Reavaliar
> automaticamente para BLOQUEANTE quando o módulo de RH entrar em produção** —
> a reavaliação não depende de novo despacho nem de lembrança de ninguém.
> Decisão do dono, 2026-08-16.

## 1. O defeito

`employees.salary` (`Employee.ts:65`, `DECIMAL(10,2)`, `comment: 'Salário'`)
**muda de unidade** conforme `employees.salary_type`
(`Employee.ts:66`, `ENUM('mensal','horista','comissionado')`, **sem `comment`**):

| `salary_type` | O que `salary` significa |
|---|---|
| `'mensal'` | remuneração **mensal** |
| `'horista'` | valor **por hora** |
| `'comissionado'` | **indeterminável pelo artefato** |

A regra de vale-transporte **não lê `salary_type`**:

```ts
// benefitRules.ts:22-23
const limit = salary * VT_DISCOUNT_LIMIT_PERCENT;   // 0.06
```

Chamada em `CreateEmployeeBenefitUseCase.ts:70`.

**Consequência:** para `salary_type = 'horista'`, o teto legal de desconto de VT
(6 % da remuneração) é calculado sobre o **valor da hora**. O limite resultante
fica **duas ordens de grandeza abaixo** do devido.

## 2. Por que CRITICAL

O que separa este finding dos demais da mesma classe semântica é que aqui o
defeito **não é declaratório**. A hipótese refutadora testada em `T-36` foi
exatamente essa — *"ninguém soma `salary` cegamente, então o impacto é só de
documentação"* — e **falhou com evidência de código**: existe consumidor, ele
está no caminho normal do sistema, e produz número errado.

É cálculo de verba trabalhista com limite legal. Erro aqui não é inconsistência
de relatório: é valor de folha.

## 3. Agravante de cobertura — registrado por determinação do dono

**As 4 fixtures de teste usam apenas `salary_type = 'mensal'`.** O defeito é
**invisível para a suíte inteira**: nenhum teste existente pode falhar por causa
dele, hoje ou depois de uma regressão.

Isso é agravante em duas dimensões:

1. **Não há rede.** Uma correção futura que reintroduza o defeito passa no CI.
2. **A suíte verde é enganosa.** Cobertura de linha sobre `benefitRules.ts`
   pode estar em 100 % e ainda assim o caminho `'horista'` nunca ter sido
   exercitado — cobertura de linha não é cobertura de domínio.

O agravante é da **cobertura**, não do código: `benefitRules.ts` está testado —
para o único valor de enum que a fixture conhece.

## 4. Evidência complementar

- `salary_type` **não tem nenhum ramo de lógica no servidor** — zero
  ocorrências em condicional. É gravado e nunca consultado.
- A UI **oferece** os três valores (`EmployeesTab.tsx:469-470`), então
  `'horista'` é alcançável pelo caminho normal de cadastro.
- **O DDL não ajuda:** `COMMENT ON COLUMN ... salary IS 'Salário'`
  (`00_baseline_frozen.sql:4924`) é idêntico ao model, e `salary_type` **não tem
  comentário algum** no banco.
- A convenção de comentar coluna salarial **existe no projeto**:
  `20260808-000010:50,53`. Não foi aplicada aqui.
- Três precisões distintas para salário convivem, nenhuma declarando
  periodicidade: `Employee.ts:65` `(10,2)`, `HrEmployeeJobHistory.ts:21` `(12,2)`,
  `HrJobPosition.ts:21-22` `(12,2)`.

## 5. Gate humano — RESPONDIDO pelo dono em 2026-08-16

A pergunta que bloqueava era: **o que `salary` significa para
`salary_type = 'comissionado'`?** Nenhum artefato versionado respondia.

**Resposta do dono, registrada (Regra 18):**

> Para funcionários comissionados existe um **salário FIXO** mais uma
> **porcentagem sobre venda**. O percentual **pode variar por acordo individual
> com cada funcionário** — não é uma taxa única para todos os comissionados.

**Decisão de negócio confirmada pelo dono:** o vale-transporte para comissionado
**incide sobre a parte FIXA do salário, não sobre a comissão variável** — regra
geral de VT no Brasil e única leitura compatível com o descrito.

### O que a resposta muda neste finding

Confirma o defeito e o **agrava**: `salary` não carrega três unidades, carrega
três unidades **e**, no caso `'comissionado'`, é um valor único onde o negócio
tem **dois componentes distintos**, um deles variável por pessoa. O campo atual
não tem estrutura para representar isso.

### O que a resposta NÃO resolve — e por que virou finding separado

Corrigir a fórmula do VT **não** cria o campo que falta, e criar o campo **não**
corrige a fórmula. São remediações distintas, com blast radius distinto:

- **este finding** é um erro de cálculo em `benefitRules.ts`, corrigível dentro
  do módulo de benefícios;
- **`AUD-RH-COMISSAO-01`** é mudança de **modelo de dados** do cadastro de
  funcionário — migration, model, API, tela e carga.

Por determinação do dono, foram separados. **A remediação de um não fecha o
outro**, e nenhum dos dois deve ser marcado como resolvido pelo avanço do
outro.

### Ordem de remediação

O caso `'horista'` **não depende** de nada disso e pode seguir imediatamente.
O caso `'comissionado'` depende de `AUD-RH-COMISSAO-01` estar resolvido, porque
antes disso **não existe onde ler a parte fixa** — a fórmula correta não tem
insumo.

## 6. Critério de reteste (objetivo, estático + teste)

1. `benefitRules.ts` normaliza `salary` para base mensal **antes** de aplicar os
   6 %, lendo `salary_type`; ou o cálculo passa a receber a remuneração mensal
   já resolvida por quem a conhece.
2. **Teste automatizado com `salary_type = 'horista'`** que reprove o cálculo
   antigo — sem isso o agravante de cobertura da §3 permanece aberto mesmo com
   o código corrigido.
3. `comment` em `employees.salary` **e** em `employees.salary_type` declarando a
   unidade por valor do enum, presente **na migration** e não apenas no model
   (`AUD-DB-T31-03`).
4. Resposta registrada para `'comissionado'`, ou recusa explícita do valor
   enquanto não houver regra.

## 7. Rastreabilidade

Relaciona-se a `AUD-DB-T31-03` (comentário no model sem contrapartida no DDL) e
à classe de semântica de coluna de `C-137`. **Não duplica** `T35-RH-F08`
(colunas de folha em `hr_time_import_items`), que trata de outra tabela e de
horas, não de salário.

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4).
