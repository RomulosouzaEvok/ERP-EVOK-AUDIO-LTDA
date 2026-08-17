# Despacho Codex — `ERP-LEGACY-001-CASE-010`

```
CASE_ID:      ERP-LEGACY-001-CASE-010
FINDING_ID:   FIND-ERP-006
ESCOPO:       LGPD — DPO, retencao configuravel, tarefas manuais e prazo operacional de incidente
BASE:         remediation/cases/ERP-LEGACY-001-CASE-010/TRIAGE.md
DECISOES:     D1-D5 respondidas pelo dono em 2026-08-17
DESTINO:      sanacore-remediation-engineer / Codex
```

## 1. Decisoes humanas que destravam este despacho

- `D1`: formalizar no sistema o papel de Encarregado/DPO, atribuido a pessoa que ja exerce informalmente essa funcao hoje na Evok. Nao hard-codear pessoa no codigo; criar mecanismo configuravel/auditavel de designacao.
- `D2`: construir mecanismo de retencao configuravel por categoria, **sem exclusao automatica habilitada**. Numeros reais e orientacao juridica formal ficam pendentes fora do CoreTriad.
- `D3`: pedidos de `deletion`/`anonymization` geram tarefa manual para revisao do Encarregado, sem acao automatica do sistema sobre dado pessoal.
- `D4`: alvo interno de 72h para iniciar avaliacao de incidente, registrado como escolha operacional, nao como exigencia legal fixa. Confirmacao juridica formal fica pendente.
- `D5`: bloquear promocao do modulo `juridico/LGPD` ate D1-D4 estarem implementados.

## 2. Prompt literal para colar no Codex

```text
Você está atuando como sanacore-remediation-engineer dentro da estrutura CoreTriad deste repositório.

Implemente o CASE-010:

CASE_ID: ERP-LEGACY-001-CASE-010
FINDING_ID: FIND-ERP-006
Escopo autorizado: LGPD — DPO configurável, retenção configurável sem exclusão automática, tarefas manuais para deletion/anonymization e meta operacional de 72h para incidente.

Trabalhe exclusivamente na worktree/branch:
  worktree: C:\Sistema EvokAudio\ERP-Evok-sana-CASE-010
  branch:   sana/ERP-LEGACY-001/CASE-010

Se a worktree ainda não existir, crie-a a partir da base adequada do repositório, sem tocar em main.

Regras absolutas:
- NÃO conecte em erp_evok_audio (produção), nem para contar linhas.
- Não execute operação destrutiva em banco real.
- Use testes unitários/estáticos; se teste dinâmico for inevitável, usar somente banco com sufixo `_test`/`_ci`.
- Não toque em audit/, coretriad/governance/, coretriad/states/, .claude/ ou docs/.
- Não declare FINDING CLOSED nem RETEST_PASSED. Essa autoridade é exclusiva da VeriCore.
- Não invente orientação jurídica: registre como pendente tudo que depender de prazo legal formal, prazo real de retenção ou escolha de descarte automático.

Leitura obrigatória antes de editar:
1. Leia integralmente remediation/cases/ERP-LEGACY-001-CASE-010/TRIAGE.md.
2. Leia integralmente docs/coretriad/projects/ERP-LEGACY-001/discovery/FIND-ERP-006.md.
3. Leia os arquivos LGPD citados no TRIAGE:
   - server/src/modules/juridico/presentation/controllers/lgpdController.ts
   - server/src/modules/juridico/presentation/routes/juridico.ts
   - server/src/modules/juridico/application/use-cases/lgpd/CreateDataSubjectRequestUseCase.ts
   - server/src/modules/juridico/application/use-cases/lgpd/CreateIncidentUseCase.ts
   - server/src/modules/juridico/application/use-cases/lgpd/ResolveDataSubjectRequestUseCase.ts
   - server/src/modules/juridico/application/use-cases/lgpd/DecideIncidentUseCase.ts
   - server/src/modules/juridico/application/use-cases/lgpd/CreateProcessingActivityUseCase.ts
   - server/src/modules/juridico/application/use-cases/lgpd/PendingCriticalDataSubjectRequestsUseCase.ts
   - server/src/models/JurLgpdIncident.ts
   - server/src/models/JurLgpdDataSubjectRequest.ts
   - server/src/models/JurLgpdProcessingActivity.ts
4. Leia a migration LGPD original `server/migrations/20260807-000271-create-jur-lgpd.cjs` para preservar FKs/checks existentes.

Causa-raiz:
- O bloco LGPD materializa registro documental, mas não materializa responsabilidades/obrigações operacionais.
- DPO é fallback para operador (`req.user.id`/`createdBy`).
- Retenção é texto livre opcional, sem consumidor.
- `deletion`/`anonymization` são marcados como `answered` sem ação verificável.
- Incidente não tem prazo operacional derivado de `detected_at`.

Estratégia autorizada:
1. Criar modelo/migration para designação formal do Encarregado/DPO.
   - Deve referenciar `users`.
   - Deve ter estado ativo/inativo ou vigência.
   - Deve impedir ambiguidade de DPO ativo, por constraint/índice parcial ou regra equivalente.
   - Não hard-codear id/nome da pessoa; a designação real é dado operacional.
2. Remover fallback silencioso para operador:
   - Solicitação de titular deve usar o DPO ativo configurado quando payload não trouxer `dpo_user_id`.
   - Incidente deve usar o DPO ativo configurado quando payload não trouxer `dpo_user_id`.
   - Se não houver DPO ativo, falhar de forma clara, sem gravar operador arbitrário.
3. Criar mecanismo de retenção configurável por categoria:
   - Categoria, prazo/valor configurável e status/metadata.
   - Sem exclusão automática habilitada.
   - Atividades de tratamento devem exigir categoria/configuração de retenção ou rejeitar ausência conforme desenho.
   - Não inventar números reais; usar fixtures/testes com valores de exemplo e marcar orientação jurídica formal como pendente.
4. Para `deletion`/`anonymization`:
   - Não apagar nem anonimizar automaticamente.
   - Criar tarefa manual para revisão do Encarregado.
   - Resolver a solicitação deve registrar a tarefa/pendência e deixar efeito verificável.
   - A resposta não pode fingir exclusão/anonimização automática.
5. Para incidentes:
   - Adicionar campo de prazo/meta operacional derivado de `detected_at + 72h`.
   - Nomear/documentar como meta operacional interna, não prazo legal fixo.
   - Criar consulta/use case análogo a `PendingCriticalDataSubjectRequestsUseCase` para incidentes vencidos/a vencer.
6. Bloqueio de promoção:
   - Adicionar guarda versionada de release/check estático em área permitida que sinalize o módulo LGPD como bloqueado se D1-D4 não estiverem presentes.
   - Não editar `docs/` nem `coretriad/`.

Testes obrigatórios:
- Testes que falhem no estado anterior e passem depois.
- Cobrir:
  a) criação de solicitação sem `dpo_user_id` usa DPO ativo, nunca `req.user.id`;
  b) criação de incidente sem `dpo_user_id` usa DPO ativo, nunca `createdBy`;
  c) ausência de DPO ativo falha claramente;
  d) `retention_period`/retenção não é mais texto morto: criação sem configuração exigida falha ou cria vínculo estruturado;
  e) `deletion`/`anonymization` gera tarefa manual para o Encarregado;
  f) incidente recebe meta operacional de 72h a partir de `detected_at`;
  g) consulta de incidentes críticos marca vencido/a vencer;
  h) controles existentes continuam verdes: verificação de identidade, rejeição justificada, decisão de incidente com justificativas e revisão anual RoPA.
- Evite importar `app.ts` se isso abrir banco real; use mocks/repositórios em memória quando possível.

Prova vermelha:
- Execute os testes novos contra AUDIT_COMMIT/base anterior em cópia temporária ou técnica equivalente segura, sem produção.
- Registre quais asserts falharam.

Validação depois:
- Execute os testes novos.
- Execute a bateria unitária relevante do módulo jurídico/LGPD.
- Execute typecheck/build do server se dependências estiverem disponíveis.
- Se node_modules faltar, instale dentro da própria worktree. Se não for possível, registre lacuna no pacote de evidência.

Evidência obrigatória:
- Gere remediation/cases/ERP-LEGACY-001-CASE-010/REMEDIATION_EVIDENCE_PACKAGE.md.
- Documente:
  - causa-raiz;
  - decisões D1-D5 aplicadas;
  - estratégia;
  - arquivos alterados;
  - testes adicionados;
  - prova vermelha;
  - prova verde;
  - riscos residuais: números reais de retenção e confirmação jurídica formal ainda pendentes fora do CoreTriad; 72h é escolha operacional; exclusão automática não habilitada;
  - que promoção do módulo LGPD permanece bloqueada até implementação completa validada.
- Termine o pacote com REMEDIATION_COMPLETE.
- Nunca escreva FINDING CLOSED nem RETEST_PASSED.

Ao terminar:
- Commit na branch sana/ERP-LEGACY-001/CASE-010, não em main.
- Pare aguardando revisão/segunda opinião/reteste.
```

