# CASE STATUS — ERP-LEGACY-001-CASE-011

**STATUS: REMEDIATION_COMPLETE**

- **Finding:** FIND-ERP-008
- **Data:** 2026-08-18
- **Branch:** `sana/ERP-LEGACY-001/CASE-011`
- **Commit de implementação:** `1caf9c3`
- **Evidência:** `REMEDIATION_EVIDENCE_PACKAGE.md`

## Correções concluídas

- **D1:** tipo da CAT derivado da gravidade, com rejeição de tipo legado incoerente e unicidade da primeira comunicação preservada;
- **D2:** requisito/API alinhados ao cálculo real de fim de semana, com teste sexta → segunda e sem calendário de feriados;
- **D3:** `emitente` textual removido do cliente, contrato e input do use case; autoria continua em `emitente_id`;
- lock PostgreSQL da consulta transacional limitado à tabela raiz, permitindo execução HTTP real.

## Evidências verdes

- SST unitário: 10 suítes, 103 testes;
- cliente: 16 arquivos, 88 testes;
- integração HTTP isolada: 1 suíte, 1 teste em `erp_evok_audio_test`;
- typecheck/build server e build client aprovados;
- auditorias de dependências de produção: zero vulnerabilidades.

## Pendência humana

**D4 permanece PENDENTE:** o dono ainda deve indicar o owner SST/RH que validará a regra de prazo/feriados. Isso não bloqueou a implementação, mas é pré-requisito da validação humana final. O escalonamento de alerta preservado em RNF-SST-04 também continua sem implementação identificada e deve ser avaliado nesse gate.

## Próximo passo

Aguardar indicação do owner D4, segunda opinião e reteste independente da VeriCore.
