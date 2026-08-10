# Plano de ação — fechar a cadeia do produto final

**Data:** 2026-08-09 · **Origem:** mapeamento do fluxo real do código (21 estações, 17 gaps)
**Artefato visual para o dono:** <https://claude.ai/code/artifact/aad98974-1e2e-4980-bf24-01192b5e1128>

---

## 1. Objetivo (critério de aceite, definido pelo dono)

> "Um insumo é cadastrado e segue seu curso até virar produto finalizado,
> passando pelos departamentos, **sem gap**."

**Teste de pronto:** cadastrar um insumo real no sistema e levá-lo, pelas telas e
endpoints reais, até produto acabado expedido — sem que em nenhum ponto o
processo permita um resultado errado, pule etapa obrigatória ou registre dado
que não bloqueia nada.

A corrente completa:

```
item cadastrado → estrutura do produto → demanda (venda/MRP/PCP)
  → requisição → cotação → pedido de compra → recebimento → quarentena
  → inspeção de entrada → estoque de insumo
  → ordem de produção → apontamento → consumo de material
  → lote de produto acabado → inspeção final → estoque de acabado
  → venda → NF-e → separação → expedição
```

---

## 2. Princípios desta remediação

1. **Não quebrar o que já funciona.** Vários controles estão certos e não devem
   ser tocados: quarentena obrigatória no recebimento, FEFO consumindo só lote
   liberado, amarração lote-de-insumo × lote-de-produto, faturamento parcial com
   saldo por item, bloqueio de reversão de contrato/venda encerrados.
2. **Toda correção com teste.** E onde o risco for de runtime (enum, coluna,
   constraint), teste que toque o Postgres real — a suíte unitária usa
   repositório mockado e **não pega** essa classe de erro.
3. **Onde existe lei ou norma, ela decide.** Não é preferência: SPED Bloco K,
   ISO 9001, CPC/IFRS e a legislação da NF-e determinam algumas destas respostas.
4. **Mudança de alto risco vai isolada**, com caminho de migração descrito para o
   dado que já existe — nunca junto de outra mudança.

---

## 3. Ondas de execução

Priorizadas por: dano real causado → contenção do risco de corrigir →
dependência de decisão de negócio.

### 🔴 Onda 1 — Dano silencioso, correção contida (sem migration, sem decisão)

Estes causam dado errado hoje, e a correção é local e testável. **Executar primeiro.**

| Gap | O que fazer | Onde | Risco |
|---|---|---|---|
| **G2** | Parar de engolir o erro de BOM ausente na conclusão da OP. Sem estrutura ativa, a conclusão deve **falhar** com erro de negócio claro — nunca entrar produto em estoque com custo zero. | `ChangeProductionOrderStatusUseCase` (`completeOrder`, trecho que captura o 404 de `explodeBOM`) | Baixo. Pode expor OPs hoje "concluídas" indevidamente — bom, é o ponto. |
| **G16** | Alinhar o rigor dos dois caminhos de criação de OP: o caminho via MRP deve validar disponibilidade de material e tipo de produto igual ao manual. Corrigir também a numeração `OP-YYYY-NNNN`, que usa `COUNT` dentro de laço e pode colidir. | `ConvertPlannedOrdersToProductionOrderUseCase`, `CreateProductionOrderUseCase` | Baixo |
| **G8** | Teste acústico reprovado deve **sempre** abrir não conformidade — hoje só abre se quem digita marcar uma caixinha (`create_rnc_on_fail`). Reprovação não pode ser opcional. | `CreateAcousticTestUseCase` | Baixo |
| **G10** | Não conformidade que não consegue bloquear o lote (lote não informado ou não encontrado) deve **avisar explicitamente**, não passar em silêncio. | `CreateNonConformityUseCase` | Baixo |
| **G12** | Adjudicar cotação deve marcar a requisição de origem como atendida (e respeitar saldo), impedindo que o mesmo item vire dois pedidos. | `AwardRfqUseCase`, `CreateRfqUseCase`, máquina de estados de `PurchaseRequisition` | Médio — mexe na máquina de estados |
| **G15** | Ativar os estados mortos que deveriam existir (`partial`/`received` da requisição) ou removê-los do enum. Documentar os demais campos sem uso. | `ChangePurchaseRequisitionStatusUseCase` | Baixo |

### 🟠 Onda 2 — Precisa de migration, mas não de decisão de negócio

| Gap | O que fazer | Risco |
|---|---|---|
| **G3** | **Reserva vinculada à ordem.** Criar tabela de reserva (OP × item × quantidade) substituindo o contador global `products.reserved_quantity`. Liberar/consumir passa a ser pela reserva daquela OP. Backfill do saldo atual. | **Alto** — vai isolada, com migração do dado existente |
| **G14** | Importação (COMEX) deve entrar no padrão: criar lote, passar por quarentena e gerar a conta a pagar dos tributos. Hoje entra sem rastreabilidade e sem gate de qualidade. | Médio |
| **G6** | Início da produção (`in_progress`) deve validar pré-condição (centro de trabalho/operador), não só gravar data. | Baixo |
| **G5** | **API de roteiro de fabricação.** As tabelas existem e não há como cadastrar pelo sistema. Necessária se o apontamento por etapa virar obrigatório (ver G4). | Médio |

### 🟡 Onda 3 — Depende de decisão do dono (recomendação vem com a fonte)

| Gap | Decisão | Observação |
|---|---|---|
| **G4** | Apontamento obrigatório para concluir OP? | **Pode ter resposta legal.** SPED Bloco K é obrigação acessória de controle de produção e estoque para indústria. Sem apontamento, mão de obra fica R$ 0,00 no custo do estoque. Confirmar enquadramento com o contador. |
| **G9 + G7** | Gate de qualidade antes da saída + criar a entidade **inspeção** + mover a baixa de estoque da confirmação do pedido para a expedição. | ISO 9001:2015 (8.6 liberação, 8.7 saída não conforme) e a lógica fiscal da NF-e (a nota acompanha a mercadoria). **Alto risco** — muda o momento da baixa de estoque. Vai isolada, com migração dos pedidos confirmados e não expedidos. |
| **G11** | Alçada de compra por valor + segregação de função (aprovador ≠ solicitante). | Já existe padrão aprovado e implementado para contratos jurídicos (3 faixas). Avaliar se as mesmas faixas servem para compra recorrente de insumo, que tem volume e frequência muito diferentes. |
| **G13** | Momento de criar conta a pagar (hoje: aprovação do pedido) e conta a receber (hoje: confirmação da venda, e à vista já nasce "paga" sem baixa). | CPC/IFRS: passivo nasce da obrigação presente; receita, da transferência de controle. **Alto risco** — afeta dado financeiro existente. |
| **G1** | Unificar as duas estruturas de produto (BOM) numa só + definir quem aprova alteração de engenharia. | **Alto risco e alto valor.** É a raiz de vários outros problemas. Migração incremental, não big-bang. ISO 9001 8.5.6 exige controle de alterações. |
| **G17** | Venda deve gerar produção? MRP deve ler carteira de pedidos e estoque mínimo? | Provavelmente **não** é "gerar OP automática no pedido" — o padrão da indústria é uma camada de Plano Mestre (MPS) entre a carteira e a ordem. |

---

## 4. Decisões pendentes do dono

As 6 perguntas do artefato de fluxo. **Combinado:** onde houver lei ou norma que
já responda, a recomendação chega fechada com a fonte e o dono apenas valida.

1. Produção sob encomenda vs. para estoque (e o papel do Plano Mestre)
2. Unificação da estrutura de produto + quem aprova alteração de engenharia
3. Gate de qualidade e o momento da baixa de estoque
4. Faixas de alçada de compra e quem aprova
5. Apontamento obrigatório
6. Automação do planejamento

Perguntas que dependem de informação da empresa (para o dono ou o contador):
- Regime tributário e enquadramento no **SPED Bloco K**
- A empresa é ou pretende ser **certificada ISO 9001**? Há exigência de cliente OEM?
- Há auditoria externa das demonstrações financeiras?
- Política de alçada de compra praticada hoje, fora do sistema

---

## 5. Critério de pronto (definição de "sem gap")

A cadeia só é considerada fechada quando, num teste ponta a ponta com dado real:

- [ ] Não existe caminho que faça produto entrar em estoque com custo zero
- [ ] Reserva de material de uma ordem não pode ser consumida por outra
- [ ] Uma única estrutura de produto governa planejamento e consumo
- [ ] Nenhum produto sai sem liberação de qualidade registrada, com evidência
- [ ] Quem aprova uma compra não é quem a solicitou
- [ ] Todo passo obrigatório do processo é obrigatório **no código**, não só na norma escrita
- [ ] Nenhum dado é registrado "decorativamente" — ou bloqueia algo, ou é removido
- [ ] Documentação, banco de dados e código descrevem o mesmo processo

---

## 6. Registro de execução

| Data | Onda | Gap | Status | Commit |
|---|---|---|---|---|
| — | — | — | *(a preencher conforme execução)* | — |
