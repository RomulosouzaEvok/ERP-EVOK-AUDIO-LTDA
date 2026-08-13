# WORKTREE_MODEL.md — Etapa 9

**Status:** Modelo proposto. Hoje só existe o worktree principal
(`C:/Sistema EvokAudio/ERP-Evok--Audio-LTDA [main]` — confirmado por `git worktree list`).
Nenhum worktree novo foi criado a partir deste documento.

## Convenção de nomes

```
OpusCore:  opus/<PROJECT>/<TASK>
SanaCore:  sana/<PROJECT>/<FINDING>
VeriCore:  não usa worktree de trabalho — audita um AUDIT_COMMIT imutável,
           lido no worktree principal ou num checkout read-only do commit exato.
```

## Achado real que precisa de decisão (não é bloqueador, é pendência)

Já existe uma branch **`remediation/production-readiness`** (local e em
`origin/remediation/production-readiness`), com commits anteriores ao CoreTriad
("Prepare ERP production readiness gates", "docs: consolidar checklist e cronograma de
release", "Salvar alterações de inventário"). Ela **não segue** a convenção
`sana/<PROJECT>/<FINDING>` proposta acima — é anterior e não nasceu de um finding
específico do VeriCore.

**Não decidido por este documento:** se essa branch deve ser (a) arquivada/renomeada,
(b) mantida como está e tratada como excexcão histórica, ou (c) o modelo de nome de
SanaCore deve acomodar também remediação de escopo mais amplo (não ligada a 1 finding).
Fica para `IMPLEMENTATION_PLAN.md` decidir com aprovação humana.

## Componentes do modelo

### COMPONENT_LOCK

Cada worktree ativo declara, em `docs/control-plane/tasks/<id>.md`, quais
módulos/arquivos ele vai tocar (`server/src/modules/X`, etc.). Dois worktrees ativos
declarando o mesmo componente ao mesmo tempo é sinal de conflito — ver
`CONFLICT_DETECTION` abaixo.

### WRITE_OWNERSHIP

| Worktree | Quem escreve | Em quê |
|---|---|---|
| `opus/<PROJECT>/<TASK>` | Agente de OpusCore designado pelo tech-lead | Código do projeto (`server/`, `client/`, `mobile/`, `tv/`) |
| `sana/<PROJECT>/<FINDING>` | Agente de SanaCore (ou OpusCore no papel, §8.4) | Só o código relacionado ao(s) FINDING_ID do Remediation Case |
| (nenhum) | VeriCore | Read-only sempre — nunca tem worktree de escrita próprio |

### INTEGRATION_ORDER

1. Um worktree só integra (merge) de volta ao branch principal depois de passar pelo
   gate que corresponde à sua organização (Code Review + QA para OpusCore; Reteste
   independente para SanaCore).
2. Se dois worktrees tocam o mesmo `COMPONENT_LOCK`, o que abriu PR primeiro integra
   primeiro; o segundo precisa re-basear e, se for `sana/*`, precisa de novo reteste
   (o commit mudou, então tecnicamente é um novo `AUDIT_COMMIT` para aquele delta).

### DELTA_AUDIT

Ligado à Regra 13 do CLAUDE.md: se o branch principal muda depois que um `AUDIT_COMMIT`
foi fixado para uma auditoria em andamento, o worktree de SanaCore que remedia um
finding daquela auditoria precisa nascer A PARTIR do `AUDIT_COMMIT`, não do HEAD atual —
senão o reteste de VeriCore estaria testando código diferente do que gerou o finding.

### CONFLICT_DETECTION

Não há ferramenta automática hoje. Mitigação manual: antes de abrir um worktree novo,
o orquestrador confere `docs/control-plane/tasks/` por `COMPONENT_LOCK` já declarado e
ainda `in_progress`/`in_review` no mesmo módulo. Candidato a automação futura (hook ou
script), não implementado nesta etapa.
