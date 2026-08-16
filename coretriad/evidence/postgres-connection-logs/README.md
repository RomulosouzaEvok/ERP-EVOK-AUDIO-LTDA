# Evidência de conexão do PostgreSQL — `CE-06`

**O conteúdo desta pasta não é versionado. Só este README é.**

## O que fica aqui

Arquivos `YYYY-MM-DD.log` com o log do container `evok-postgres`, capturados
diariamente por [`Export-PostgresLogs.ps1`](../../../ops/postgres-log-retention/Export-PostgresLogs.ps1).
São gravados em **append-only** (ACL do NTFS nega sobrescrita e exclusão) e
podados após **90 dias**.

## Por que existe

Requisito de saída do critério `CE-06` da classe de risco `RC-PROC-01`
(`coretriad/governance/RISK_CLASS-RC-PROC-01_CONTENCAO_POR_DISCIPLINA.md`),
aprovado em `APR-2026-028` §3.

O critério existe porque a classe inteira parte de uma tese: **contenção por
disciplina não é controle**. Saber quem abriu conexão em qual banco não pode
depender do relato de quem abriu. O `rotation` nativo do Docker (50 MB, 5
arquivos) serve para operação, não para auditoria — roda por sobrescrita, não
tem cópia externa, e o container pode ser recriado levando o log junto.

## Por que não vai para o GitHub

O log nomeia **usuário, banco e host de produção**. É evidência operacional, não
artefato de código. O que é versionado é o job e a prova de que ele funciona;
o conteúdo capturado, nunca.

## Estado — pendência aberta

`APR-2026-028` §3 aprovou retenção **replicada para fora do host**. Hoje a cópia
existe **apenas nesta máquina**, por decisão do dono em 2026-08-16 — cópia manual
(pendrive) até haver destino definido.

**Enquanto isso valer, `CE-06` não está satisfeito.** Log que vive só na máquina
auditada não sobrevive ao incidente que deveria documentar. O job sai com
**código 2** todo dia de propósito, para que a pendência apareça no agendador em
vez de envelhecer em silêncio — o modo de falha que o incidente 4 da própria
classe documenta.

Rastreio: `coretriad/governance/PENDING_SCHEDULED_ACTIONS.md`.
