# CASE STATUS — ERP-LEGACY-001-CASE-012

**STATUS: REMEDIATION_COMPLETE**

- **Finding:** FIND-ERP-007
- **Data:** 2026-08-18
- **Branch:** `sana/ERP-LEGACY-001/CASE-012`
- **Commit de implementação:** `fd1cc0b`
- **Evidência:** `REMEDIATION_EVIDENCE_PACKAGE.md`

## Entregue

- `termination_reason TEXT NOT NULL` aditivo em `hr_termination_processes`;
- motivo obrigatório e persistido nos dois caminhos de abertura;
- modalidade de aviso escolhida pelo RH e repassada sem literal fixo;
- UI, tipos da API e somente as seções 5.2/6.1 da documentação autorizada alinhadas;
- testes RH, guardas estruturais, drift model × banco de teste, integração HTTP, typecheck e builds aprovados com output real registrado.

## Pendente fora do escopo

O item 3 (HTTP 409 versus 422 para processo já aberto) permanece **NEEDS_MORE_EVIDENCE**, aguardando Q3a. Nenhuma decisão ou alteração foi feita nesse comportamento.

## Próximo gate

Aguardar segunda opinião e reteste independente da VeriCore. A autoridade sobre o estado final do finding não é exercida por este documento.
