# SIM-001 — Requisitos

Rastreabilidade: REQ → BR → AC → TC.

---

## REQ-SIM-001 — Criar reserva

O sistema deve permitir criar uma reserva informando `roomId`, `userId`, `start`,
`end` e `price`. A reserva criada recebe um `id` único e status `active`.

- **BRs relacionadas:** BR-SIM-003 (validação de sobreposição na criação)
- **AC-SIM-001:** Dado que a sala está livre no intervalo, quando o usuário cria
  uma reserva com dados válidos (`start < end`, `price >= 0`), então a reserva é
  criada com `id` único e status `active`.
- **TC planejado:** TC-SIM-001

## REQ-SIM-002 — Cancelar reserva com autorização e taxa

O sistema deve permitir cancelar uma reserva ativa, respeitando a autorização de
cancelamento e a taxa de cancelamento tardio.

- **BRs relacionadas:** BR-SIM-001 (autorização), BR-SIM-002 (taxa de 10% para
  cancelamento com menos de 24h de antecedência)
- **AC-SIM-002:** Dado que o solicitante da reserva (ou um `admin`) cancela com
  24h ou mais de antecedência, então a reserva passa a `cancelled` e a taxa é `0`.
  Dado que o cancelamento ocorre com menos de 24h de antecedência, então a taxa
  cobrada é de 10% do `price`. Dado que o usuário não é o solicitante nem
  `admin`, então o cancelamento é rejeitado.
- **TC planejado:** TC-SIM-002

## REQ-SIM-003 — Rejeição de sobreposição

O sistema deve rejeitar a criação de reserva cujo intervalo se sobreponha ao de
uma reserva ativa existente na mesma sala.

- **BRs relacionadas:** BR-SIM-003
- **AC-SIM-003:** Dado que existe reserva ativa na sala no intervalo
  `[10:00, 12:00)`, quando um usuário tenta criar reserva na mesma sala em
  qualquer intervalo que intersecte esse período, então a criação é rejeitada com
  erro; intervalos adjacentes (ex.: `[12:00, 13:00)`) são aceitos.
- **TC planejado:** TC-SIM-003

## REQ-SIM-004 — Listar reservas por sala

O sistema deve listar as reservas ativas de uma sala.

- **BRs relacionadas:** —
- **AC-SIM-004:** Dado que existem reservas ativas em salas distintas, quando o
  usuário lista as reservas de uma sala, então apenas as reservas ativas daquela
  sala são retornadas.
- **TC planejado:** TC-SIM-004
