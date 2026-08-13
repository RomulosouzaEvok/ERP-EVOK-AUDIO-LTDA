# SIM-002 "PagaFácil" — Regras de Negócio

Regras normativas do domínio de cadastro, aprovação e pagamento de fornecedores.
Este documento descreve **o que** o negócio exige, não como o software realiza.

---

## BR-SUP-001 — Pagamento exige fornecedor aprovado

Um fornecedor só pode receber pagamento quando estiver no status `approved`.
Fornecedores em qualquer outro status (por exemplo `pending` ou `rejected`) não
podem ser destinatários de pagamento.

## BR-SUP-002 — Unicidade de CNPJ

O CNPJ identifica univocamente um fornecedor no sistema. Não podem coexistir dois
fornecedores com o mesmo CNPJ, independentemente da empresa que os cadastrou.

## BR-APR-001 — Alçada de aprovação

A aprovação de um fornecedor está sujeita a alçada, determinada pelo limite de
crédito concedido:

| Limite de crédito aprovado | Papel exigido |
|---|---|
| Até R$ 10.000,00 (inclusive) | `analyst` ou `manager` |
| Acima de R$ 10.000,00 | `manager` |

Aprovações solicitadas por papel sem alçada suficiente devem ser recusadas.

## BR-PAY-001 — Teto de crédito do fornecedor

A soma dos pagamentos válidos de um fornecedor não pode, em nenhum momento,
exceder o limite de crédito aprovado para esse fornecedor.

## BR-PAY-002 — Idempotência de envio ao gateway

Um mesmo pagamento nunca pode ser enviado duas vezes ao gateway de pagamento.
Uma nova solicitação de envio para um pagamento já enviado deve reaproveitar o
envio anterior e a referência externa já obtida, sem produzir nova movimentação
financeira.

## BR-SEC-001 — Isolamento por empresa

Um usuário só pode acessar fornecedores e pagamentos pertencentes à sua própria
empresa (`company_id`). Dados de outras empresas não podem ser lidos nem
alterados.
