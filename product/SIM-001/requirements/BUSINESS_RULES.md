# SIM-001 — Regras de Negócio

## BR-SIM-001 — Autorização de cancelamento

Uma reserva só pode ser cancelada pelo **próprio solicitante** (usuário que criou a
reserva) OU por um usuário com papel `admin`. Qualquer outra tentativa de
cancelamento deve ser rejeitada.

## BR-SIM-002 — Taxa de cancelamento tardio

Cancelamento realizado com **menos de 24 horas de antecedência** do início da
reserva cobra taxa de **10%** do valor (`price`) da reserva. Cancelamentos com 24
horas ou mais de antecedência não têm taxa.

## BR-SIM-003 — Não sobreposição de reservas

Uma sala não pode ter duas reservas ativas com horários sobrepostos. Uma nova
reserva cujo intervalo `[start, end)` intersecte o intervalo de uma reserva ativa
existente da mesma sala deve ser rejeitada.
