# Control Plane leve (baseado em arquivos + git)

O documento original imaginava um "ERP dos agentes" completo (fila de trabalho, estado,
aprovações, versionamento). Construir esse motor como serviço separado é um projeto de
engenharia próprio — não é necessário para usar essa organização de agentes dentro do
Claude Code/VSCode. Este control plane leve resolve o mesmo problema com arquivos
versionados em git, que é exatamente o que Claude Code já sabe manipular bem.

## Por que arquivos e não um serviço

- Cada tarefa é um arquivo Markdown com frontmatter estruturado — legível por humano,
  auditável no `git log`/`git diff`, e diretamente editável pelos subagentes.
- Não precisa de infraestrutura adicional para começar a usar hoje.
- Se o volume de tarefas crescer muito e isso deixar de ser suficiente, o formato aqui
  já é estruturado o bastante para ser migrado depois para uma ferramenta real de
  workflow (ex.: um board do seu gerenciador de tarefas, ou um orquestrador dedicado).

## Formato de uma tarefa

Ver `tasks/EXEMPLO-0001.md`. Campos obrigatórios no frontmatter:

```yaml
id: "0001"
projeto: "nome do produto/feature"
story: "referência à story/epic"
agent: "slug do subagente responsável (ex.: backend-engineer)"
dependencia: "id de outra tarefa, ADR ou 'nenhuma'"
entrada: "o que o agente recebeu para trabalhar"
saida_esperada: "o que se espera como resultado (ex.: Pull Request)"
status: "todo | in_progress | in_review | blocked | done"
proximo_responsavel: "slug do próximo agente ou 'humano'"
aprovacao: "quem precisa aprovar antes de status=done"
```

O corpo do arquivo (abaixo do frontmatter) registra notas, decisões tomadas durante a
execução e links para o PR/ADR relevante.

## Convenção de nomes e status

- Nome do arquivo: `<id>-<slug-curto>.md` (ex.: `0007-calculo-capacidade.md`).
- Atualize `status` sempre que a tarefa mudar de responsável — isso é o que permite
  reconstruir o fluxo completo olhando o histórico do git.
- Tarefas com `status: blocked` devem sempre ter uma nota explicando o bloqueio no corpo
  do arquivo.
