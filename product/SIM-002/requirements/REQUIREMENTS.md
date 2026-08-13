# SIM-002 "PagaFácil" — Requisitos

Rastreabilidade: REQ → BR → AC → TC.

---

## REQ-SIM2-001 — Cadastrar fornecedor

O sistema deve permitir cadastrar um fornecedor informando `cnpj`, `name` e
`companyId`. O fornecedor cadastrado recebe identificador único e status
inicial `pending`.

- **BRs relacionadas:** BR-SUP-002 (unicidade de CNPJ)
- **AC-SIM2-001:** Dado um CNPJ ainda não cadastrado, quando um usuário cadastra
  o fornecedor com `cnpj`, `name` e `companyId` válidos, então o fornecedor é
  criado com `id` único, status `pending` e `credit_limit` igual a `0`. Dado um
  CNPJ já existente no sistema, então o cadastro é recusado.
- **TC planejado:** TC-SIM2-001

## REQ-SIM2-002 — Aprovar fornecedor com alçada

O sistema deve permitir aprovar um fornecedor, concedendo-lhe um limite de
crédito, desde que o aprovador possua alçada compatível com o valor concedido.

- **BRs relacionadas:** BR-APR-001 (alçada), BR-SEC-001 (isolamento por empresa)
- **AC-SIM2-002:** Dado um fornecedor `pending` da mesma empresa do aprovador,
  quando um `analyst` aprova com limite dentro da sua alçada, então o fornecedor
  passa a `approved` com o limite concedido. Quando o limite excede a alçada do
  `analyst`, então a aprovação é recusada e o fornecedor permanece `pending`.
  Quando um `manager` aprova, qualquer limite dentro da política é aceito.
- **TC planejado:** TC-SIM2-002

## REQ-SIM2-003 — Criar pagamento

O sistema deve permitir criar um pagamento para um fornecedor aprovado,
respeitando o teto de crédito concedido.

- **BRs relacionadas:** BR-SUP-001 (fornecedor aprovado), BR-PAY-001 (teto de
  crédito), BR-SEC-001 (isolamento por empresa)
- **AC-SIM2-003:** Dado um fornecedor `approved` da empresa do usuário, quando é
  criado um pagamento de valor positivo cuja soma com os pagamentos existentes
  não excede o limite de crédito, então o pagamento é registrado com status
  `created`. Dado um fornecedor não aprovado, então a criação é recusada. Dado
  que a soma excederia o limite de crédito, então a criação é recusada.
- **TC planejado:** TC-SIM2-003

## REQ-SIM2-004 — Enviar pagamento ao gateway

O sistema deve permitir enviar um pagamento registrado ao gateway externo,
armazenando a referência externa retornada e registrando a tentativa.

- **BRs relacionadas:** BR-PAY-002 (idempotência de envio)
- **AC-SIM2-004:** Dado um pagamento com status `created`, quando ele é enviado
  ao gateway, então o pagamento passa a `sent`, recebe `external_ref` e a
  tentativa é registrada. Dado um pagamento já enviado, quando o envio é
  solicitado novamente, então o envio anterior é reaproveitado e nenhuma nova
  movimentação é gerada no gateway.
- **TC planejado:** TC-SIM2-004

## REQ-SIM2-005 — Listar pagamentos por fornecedor

O sistema deve listar os pagamentos de um fornecedor, respeitando o isolamento
por empresa.

- **BRs relacionadas:** BR-SEC-001
- **AC-SIM2-005:** Dado um usuário da empresa proprietária do fornecedor, quando
  ele lista os pagamentos daquele fornecedor, então recebe todos os pagamentos
  do fornecedor, ordenados por data de criação. Dado um usuário de outra
  empresa, então a listagem é recusada.
- **TC planejado:** TC-SIM2-005

## REQ-SIM2-006 — Consultar fornecedor

O sistema deve permitir consultar os dados cadastrais e o limite de crédito de um
fornecedor da própria empresa.

- **BRs relacionadas:** BR-SEC-001
- **AC-SIM2-006:** Dado um usuário da mesma empresa do fornecedor, quando ele
  consulta o fornecedor, então recebe `id`, `cnpj`, `name`, `status`,
  `credit_limit` e `company_id`. Dado um usuário de outra empresa, então a
  consulta é recusada.
- **TC planejado:** TC-SIM2-006
