# `AUD-RH-COMISSAO-01` — Cadastro de funcionário não tem estrutura para representar remuneração comissionada

```
RUN:            ERP-LEGACY-001-AUD-001
AUDIT_COMMIT:   c1311a6f76b512fef893f7e60d934179cae3409f
ORIGEM:         resposta do dono a gate humano de AUD-RH-VTHORISTA-01 (2026-08-16)
NATUREZA:       lacuna de MODELO DE DADOS (não é defeito de cálculo)
SEVERIDADE:     PROPOSED — aguarda fixação pelo dono; Regra 22 aplicável se HIGH+
ESTADO:         PROPOSED
AMBIENTE:       DEV / HOMOLOGAÇÃO
```

> **CLÁUSULA DE REAVALIAÇÃO AUTOMÁTICA.** Sem risco ativo hoje porque o módulo
> de RH não está em produção. **Reavaliar automaticamente para bloqueante quando
> o módulo de RH entrar em produção** — e antes disso, se algum funcionário
> comissionado for cadastrado no sistema, porque a partir daí passa a existir
> dado real sem lugar correto para morar.

## 1. Como este finding nasceu

`AUD-RH-VTHORISTA-01` parou num gate humano: nenhum artefato versionado dizia o
que `salary` significa para `salary_type = 'comissionado'`. O dono respondeu:

> Para funcionários comissionados existe um **salário FIXO** mais uma
> **porcentagem sobre venda**. O percentual **pode variar por acordo individual
> com cada funcionário** — não é uma taxa única para todos os comissionados.

**A resposta não fechou o gate; abriu um problema maior.** É por isso que este
finding existe separado, por determinação do dono: a remediação de um **não
resolve** o outro.

## 2. A lacuna

A remuneração de um comissionado tem **dois componentes**:

| Componente | Natureza | Onde está hoje |
|---|---|---|
| Salário fixo | valor monetário | **misturado** em `employees.salary` |
| Percentual sobre venda | taxa, **variável por funcionário** | **não existe** |

`Employee.ts:65` tem **um** campo — `salary DECIMAL(10,2)`, `comment: 'Salário'`.
`Employee.ts:66` tem `salary_type ENUM('mensal','horista','comissionado')`, sem
`comment` e **sem nenhum ramo de lógica no servidor**.

Não há, em `employees` nem em tabela vizinha, coluna que guarde percentual de
comissão. Verificação estática: nenhuma coluna de comissão foi encontrada no
cadastro de funcionário. `HrEmployeeJobHistory.ts:21` e `HrJobPosition.ts:21-22`
guardam salário, não comissão; `hr_employee_benefits` trata de benefícios.

**Consequência direta:** o percentual acordado individualmente **não tem onde
ser gravado**. Ou vive fora do sistema — planilha, contrato em papel, memória de
alguém —, ou é embutido em `salary`, e nesse caso o valor deixa de ser
interpretável por qualquer consumidor.

## 3. Por que é finding próprio, e não parte de `AUD-RH-VTHORISTA-01`

Separação determinada pelo dono, e a razão técnica sustenta:

| | `AUD-RH-VTHORISTA-01` | **este finding** |
|---|---|---|
| Natureza | erro de cálculo | lacuna de modelo de dados |
| Onde se corrige | `benefitRules.ts` | migration + model + API + tela + carga |
| Blast radius | módulo de benefícios | cadastro de funcionário inteiro |
| Depende do outro? | só o caso `'comissionado'` | não |

Corrigir a fórmula do VT não cria o campo que falta. Criar o campo não corrige a
fórmula. **Nenhum dos dois pode ser marcado como resolvido pelo avanço do
outro** — e é exatamente esse o erro que a separação previne.

Há ainda uma dependência de ordem: a fórmula correta de VT para comissionado
precisa ler **a parte fixa**. Enquanto ela não existir separada, **a fórmula
correta não tem insumo**.

## 4. Decisão de negócio já registrada (não é pendência)

**Vale-transporte de comissionado incide sobre a parte FIXA**, não sobre a
comissão variável. Decisão do dono, 2026-08-16, coerente com a regra geral de VT
no Brasil.

Isso **não** é pergunta aberta e a SanaCore não precisa consultar ninguém sobre
ela. O que segue aberto é o desenho de armazenamento, na §5.

## 5. Pendência técnica de remediação — não é decisão do dono

Desenhar como o sistema armazena, por funcionário comissionado:

1. o **valor fixo**, separado e identificável como fixo;
2. o **percentual de comissão**, com unidade declarada (fração × percentual — o
   projeto tem as duas convenções em uso e já produziu finding por isso:
   `T35-PRD-F07`);
3. **vigência**, se o acordo individual puder mudar ao longo do contrato — o que
   é o caso normal e determina se isto é coluna ou tabela filha;
4. o que acontece com o **histórico** já gravado em `salary`, se houver.

Isto é trabalho de desenho da fase de remediação, com decisões que o dono
precisará ratificar quando o desenho existir — mas **não são perguntas que
travam o início do trabalho**.

## 6. Riscos de fazer errado, registrados agora para não serem descobertos depois

- **Guardar percentual sem unidade declarada** repete `T35-PRD-F07`: `0,05` é
  5 % ou 0,05 %? O projeto já erra nisso em outro lugar.
- **Guardar como coluna única sem vigência** torna impossível reconstituir a
  comissão devida de um período passado após qualquer renegociação.
- **Deixar `salary` polissêmico** mantém `AUD-RH-VTHORISTA-01` vivo para
  `'mensal'` e `'horista'` mesmo depois de comissionado resolvido.
- **Percentual sem classificação de sensibilidade**: acordo individual de
  remuneração é dado pessoal de alta sensibilidade. `employeeSensitiveFields.ts:36-51`
  já classifica `salary` e `salary_type`; **o campo novo precisa entrar na
  lista**, ou nasce fora da proteção que o vizinho tem.

## 7. Critério de reteste (objetivo, estático + teste)

1. Existem colunas distintas e nomeadas para valor fixo e percentual de
   comissão, no **model e na migration**, com `comment` declarando unidade.
2. O percentual está em `employeeSensitiveFields.ts`.
3. Existe teste com `salary_type = 'comissionado'` — hoje as 4 fixtures usam
   apenas `'mensal'` (agravante de cobertura registrado em
   `AUD-RH-VTHORISTA-01` §3).
4. `benefitRules.ts` lê a **parte fixa** para o cálculo de VT do comissionado.
5. Decisão registrada sobre o histórico de `salary` de comissionados já
   cadastrados, se houver.

## 8. Rastreabilidade

Deriva de `AUD-RH-VTHORISTA-01` (gate humano respondido) e da classe de
semântica de coluna `C-137` / `T35-RH-F02`. Relaciona-se a `T35-PRD-F07`
(unidade de percentual) e a `AUD-DB-T31-03` (comentário no model sem
contrapartida no DDL).

**Não duplica** `AUD-RH-VTHORISTA-01`: aquele é o cálculo, este é o modelo.

Nenhuma declaração de `RETEST_PASSED` ou `FINDING CLOSED` é feita aqui (Regra 4).
Severidade **não fixada** — aguarda o dono.
