# PERGUNTAS PENDENTES AO DONO — `ERP-LEGACY-001-CASE-018` · `AUD-AUTHN-02`

Formato modelado em `remediation/cases/PENDING_DECISIONS_2026-08-17.md`.

**Este documento não decide nada** (Regra 6 do `CLAUDE.md`). Formula perguntas com
opções e consequências. **Não autoriza rotação de credencial de produção** —
autoridade exclusiva do dono (`APR-2026-016`, Regra 18).

**Contexto em uma frase:** a parte de **código e configuração** deste caso está
despachada e não depende de nenhuma resposta abaixo
(`CODEX_REMEDIATION_DISPATCH.md`). O que depende é o **estado da conta admin que
já existe em produção** — a única linha de `users` classificada PRODUÇÃO REAL
(`PRODUCTION_STATUS_MAP.md:130`; `APR-2026-016`).

---

## Tabela-resumo

| # | Pergunta (resumida) | Bloqueia o quê |
|---|---|---|
| 1 | Autorizar verificar **se** a senha do admin de produção é a versionada? | Só a **decisão informada** sobre a #2. A correção de código não depende disso |
| 2 | Rotacionar a senha do admin de produção — agora, em janela, ou gate sem prazo? | Só o **estado da credencial existente**. Nada de código |
| 3 | Antes do próximo `docker compose up`, confirmar `ADMIN_SEED_PASSWORD` no `.env` de **cada** máquina? | O próximo `up` **em máquina cujo `.env` não a tenha** — a API não sobe |
| 4 | O estado do **segundo PC** e de réplicas/backups precisa ser verificado? | Nada agora. Define se o caso tem superfície residual não medida |

---

## O que NÃO está sendo perguntado (para poupar leitura)

Estes itens **não** dependem de resposta e já foram despachados, com fundamento
em precedente já aprovado:

- Remover o default versionado do compose (`docker-compose.yml:57` →
  `${ADMIN_SEED_PASSWORD:?…}`) — forma **já existente** duas vezes no mesmo
  arquivo para `DB_PASSWORD` (`:13`, `:50`) e em `docker-compose.prod.yml:105`;
  ratificada em `APR-2026-049` D2.
- Remover o segundo literal de senha do código (`seeds.ts:138`) —
  `README.md:220-222` já **afirma** que ele não existe.
- Fazer o comprimento **bloquear** em vez de avisar (`seeds.ts:139-141`), com o
  mínimo **8**, o mesmo já versionado em `runtimeEnv.ts:127`. **Nenhuma política
  de senha nova** está sendo criada.
- Guardas automatizadas e correção do drift de `README.md` /
  `REQUISITOS_NAO_FUNCIONAIS.md:47` / `DOCKER_POSTGRES_SETUP.md`.

---

## Pergunta 1 — Autorizar descobrir **se** o problema já aconteceu?

### A situação, sem rodeios

O sistema cria a conta `admin@evokaudio.com.br` automaticamente no primeiro boot
de um banco vazio (`seeds.ts:142-148`, chamado por `db.ts:23`). Se nesse boot a
variável `ADMIN_SEED_PASSWORD` não estivesse definida, a senha usada veio de um
valor **escrito dentro do repositório** — legível por qualquer pessoa com acesso
ao código.

**Ninguém sabe hoje se foi isso que aconteceu.** A auditoria registrou a lacuna
explicitamente: *"a conta admin real nunca foi inspecionada: nenhuma query,
nenhum login, nenhuma credencial testada"*
(`T-02_TIER1_IDENTIDADE_REPORT.md` §6, `L-T02-02`).

Por que nenhum agente descobriu: verificar exige **ou** consultar a tabela
`users` do banco real, **ou** tentar autenticar na aplicação. As duas coisas são
proibidas sem autorização caso a caso (`APR-2026-016`), e o precedente
`APR-2026-048` registra que **nem uma tentativa de conexão que deveria falhar**
foi executada sem autorização escopada.

**Detalhe importante e favorável:** a senha é guardada com `bcrypt`
(`User.ts:118-134`), então **ninguém a lê**, nem com acesso total ao banco. A
verificação só pode ser **comparação**: testar se a senha versionada é aceita.

### Opções

- **Opção A — autorizar a verificação, escopada.**
  Um teste de autenticação, uma vez, com o valor versionado, contra a conta
  admin, **sem alterar nada**.
  - **Entrega:** resposta definitiva (sim/não), e com ela a #2 deixa de ser
    decisão no escuro.
  - **Cobra:** autorização humana explícita e escopada (`APR-2026-016`), e um
    executor. **A SanaCore não deve ser esse executor** — é ato contra produção
    (o mesmo motivo pelo qual `PEND-2026-006` registra a lacuna de papel de
    infraestrutura).
  - **Efeito colateral:** uma tentativa de login **falhada** conta no rate-limit
    de login (`app.ts:54-59`, 10/15min por par IP+e-mail) e, se bem-sucedida,
    gera um registro de autenticação real. Nada destrutivo.

- **Opção B — não verificar, e tratar como comprometida por precaução.**
  - **Entrega:** decisão imediata na #2 (rotacionar), sem nenhum toque
    investigativo em produção.
  - **Cobra:** rotacionar mesmo se não fosse necessário — que, sendo honesto,
    tem custo baixo (uma troca de senha) comparado ao risco de deixar como está.
  - **Consequência de registro:** a lacuna `L-T02-02` permanece **aberta para
    sempre**; ninguém saberá se houve exposição real, e isso é relevante se um
    dia a pergunta virar "houve incidente?".

- **Opção C — não verificar e não rotacionar.**
  - **Entrega:** nada.
  - **Consequência:** a conta com `role:'admin'`, que autoriza os 681 endpoints,
    permanece com senha de estado **indeterminado**. A API está publicada em
    `0.0.0.0:5000` (`docker-compose.yml:67`, comentado como proposital para
    mobile/TV da rede local) — qualquer host da rede da fábrica alcança o login.
  - **Registro obrigatório:** a SanaCore **não pode** declarar `RISK_ACCEPTED`
    (Regra 3/4). Se esta for a escolha, ela tem de ser registrada como decisão
    do dono em `APPROVALS.md`, e a VeriCore avalia o efeito no fechamento do
    finding.

**Bloqueante?** Não bloqueia a correção de código. Bloqueia **decidir a #2 com
informação** em vez de no escuro.

---

## Pergunta 2 — Rotacionar a senha do admin de produção: quando?

### Por que isto é decisão do dono e não da SanaCore

Trocar a senha do admin **incrementa `passwordVersion`** (`User.ts:118-134`), e o
middleware de autenticação **rejeita todo token com `passwordVersion` obsoleto**
(`middlewares/auth.ts:99-103`).

**Efeito prático: todas as sessões ativas daquela conta caem ao mesmo tempo —
inclusive a de quem está executando a troca.** Como o admin é hoje a única conta
real do sistema, isso significa: **toda sessão ativa cai.**

Este é **exatamente** o fundamento que o dono registrou para reservar a rotação
da chave JWT em `APR-2026-049` D3: *"invalida todo token já emitido — todos os
usuários logados caem ao mesmo tempo. Exige janela combinada e aviso prévio…
Não é decisão de madrugada."*

### Nota de precisão normativa (o despacho pediu avaliação cuidadosa)

`APR-2026-049` D3 fala nominalmente da **chave JWT** e **não menciona senha de
usuário**. Portanto **não** se afirma aqui que a reserva de D3, na letra, cobre
esta rotação — estender aprovação por analogia é proibido (`APR-2026-016`).

**O bloqueio decorre de `APR-2026-016`** (`APPROVALS.md:329-344`), que é mais
forte e direto: `users` (a conta admin) está sob regime read-only reforçado
**permanente**, e qualquer inspeção ou escrita em dado real exige aprovação
humana **caso a caso**, *"nunca por extensão de uma aprovação anterior, nunca por
inferência"*.

**Efeito prático é o mesmo de D3:** é decisão e ato do dono. E o fundamento
material que o dono usou em D3 se aplica aqui com força igual ou maior.

### Opções

- **Opção A — rotacionar já, fora de janela.**
  - **Entrega:** fecha materialmente o risco da credencial existente, hoje.
  - **Cobra:** toda sessão ativa cai no momento da troca, sem aviso. Se houver
    alguém usando o sistema, ele é interrompido.
  - **Quem executa:** **não a SanaCore.** Ato contra produção real.

- **Opção B — rotacionar em janela combinada** (mesma disciplina de
  `PEND-2026-001`, a janela de manutenção usada para `log_connections`).
  - **Entrega:** fecha o risco, com aviso prévio a quem usa o sistema.
  - **Cobra:** combinar a janela. Até lá, o risco da credencial existente
    permanece.
  - **É a forma que o próprio dono já usou** duas vezes neste programa.

- **Opção C — gate humano pendente, sem prazo** (literalmente o que D3 fez com a
  chave JWT).
  - **Entrega:** rastreabilidade e coerência com a decisão já tomada para a chave
    de assinatura.
  - **Cobra, declarado sem eufemismo:** a correção de código impede a
    **reintrodução** do defeito e a **entrega** do valor. Ela **não** corrige uma
    senha já gravada. E há um agravante específico deste caso: o controle
    compensatório `seeds.ts:117-121` (`if (userCount > 0) return`) **garante que
    nenhum boot futuro corrija a conta existente** — o mesmo mecanismo que
    limita o risco de novas contas é o que impede a autocorreção da atual.
  - **Consequência para o fechamento:** a VeriCore precisará decidir se
    `AUD-AUTHN-02` pode ser fechado com o mecanismo corrigido e o estado da
    credencial pendente, ou se fica parcialmente aberto. **A SanaCore não opina
    sobre fechamento** (Regra 4).

**Bloqueante?** Não bloqueia nenhuma linha de código deste caso. Bloqueia o
**fechamento material** do finding.

---

## Pergunta 3 — Confirmar `ADMIN_SEED_PASSWORD` no `.env` antes do próximo `docker compose up`?

### O que a correção faz, e por que isto precisa ser dito antes

A correção troca `docker-compose.yml:57` da forma "se você não definir, eu
invento um valor" para "se você não definir, **eu não subo**" — a mesma forma que
`DB_PASSWORD` já usa no mesmo arquivo (`:50`), e que `README.md:56-60` e
`docs/infra/DOCKER_POSTGRES_SETUP.md:106-112` já documentam como comportamento
correto e esperado.

**Isso entra em vigor sozinho, no próximo `docker compose up -d`.** Não há gate no
momento da aplicação.

### Medição já feita (sem ler nenhum valor)

Contagem de existência de chave nesta máquina, `grep -c '^CHAVE='`:

```
.env         ADMIN_SEED_PASSWORD  -> 1  (existe)
server/.env  ADMIN_SEED_PASSWORD  -> 1  (existe)
.env         NODE_ENV             -> 0  (NÃO existe)
```

**Leitura, em três frases separadas:**

1. A variável **existe** no `.env` desta máquina → a correção é, muito
   provavelmente, **neutra** no próximo `up` **aqui**.
2. **Não é possível saber se o valor satisfaz as validações novas** (≥ 8, sem
   prefixo `CHANGE_ME`/`dev-only-change-me`) sem ler o valor, o que
   `APR-2026-016` não autoriza.
3. **Nada se sabe sobre o `.env` do segundo PC.** Lá, a correção pode fazer o
   próximo `up` falhar.

### Opções

- **Opção A — o dono confirma, em cada máquina, antes do próximo `up`** que a
  variável está declarada com valor forte.
  - **Entrega:** nenhuma interrupção surpresa.
  - **Cobra:** 1 minuto por máquina.
  - **Nota:** se a correção fizer o `up` falhar, a mensagem de erro dirá qual
    variável falta e como resolver (item E-5.3 do despacho) — falha ruidosa e
    autoexplicativa, não silenciosa.

- **Opção B — não confirmar e descobrir no próximo `up`.**
  - **Cobra:** possível indisponibilidade curta, num momento não escolhido.
  - **Risco real registrado:** a reação previsível a um boot falhado é **reverter
    a correção**. É por isso que o despacho inclui o alinhamento de
    `DOCKER_POSTGRES_SETUP.md` (item E-7c) — para que a falha seja lida como
    "funcionando conforme o projeto", e não como "o patch quebrou".

**Bloqueante?** Não bloqueia a correção. É aviso de efeito — obrigação da triagem
declarar.

---

## Pergunta 4 — O estado do segundo PC e de réplicas/backups precisa ser verificado?

### Por que a pergunta existe

O finding classifica o risco como **de provisionamento**, e a verificação
confirmou que confere. O controle compensatório (`seeds.ts:117-121`) protege
bancos que **já têm** usuários; ele **não** protege quando `users` nasce vazia:

- restauração de backup parcial que não traz `users`;
- banco novo provisionado por migrations no **segundo PC**;
- réplica ou ambiente de homologação criado a partir do repositório;
- `docker compose down -v` seguido de recriação do volume.

O adendo da própria auditoria já registrou este limite:
`T-02_TIER1_IDENTIDADE_REPORT.md` §10 item 3 — *"o dono opera em duas máquinas.
Esta verificação vale exclusivamente para a máquina onde foi executada. O estado
do `.env` da segunda máquina, de qualquer réplica, backup restaurado ou ambiente
futuro não foi verificado e permanece desconhecido."*

### Opções

- **Opção A — o dono verifica no segundo PC** que `ADMIN_SEED_PASSWORD` está
  declarada com valor forte, e informa se existe alguma outra instância (réplica,
  homologação, banco restaurado) rodando este código.
  - **Entrega:** fecha a superfície residual do caso. Barato.
  - **Cobra:** 1 minuto, e uma resposta sobre quantas instâncias existem.

- **Opção B — registrar como não medido e seguir.**
  - **Cobra:** o caso é fechado (se for) com superfície residual declarada e não
    medida. Se um dia aparecer uma instância com admin de senha versionada, não
    haverá registro de que a pergunta foi feita e não respondida.

**Bloqueante?** Não. Define se o caso tem superfície residual **declarada** ou
**medida**.

---

## Registro final

- Esta é uma triagem SanaCore. **Não declara** `FINDING CLOSED`,
  `RETEST_PASSED` nem `RISK_ACCEPTED` (Regras 3 e 4).
- **Não autoriza** rotação de credencial de produção, nem inspeção de dado real.
- **Nenhuma conexão de banco foi aberta** nesta triagem — nem `erp_evok_audio`,
  nem `erp_evok_audio_test`.
- **Nenhum valor de segredo é reproduzido** em nenhum artefato deste caso.
- Respostas devem ser registradas em `coretriad/governance/APPROVALS.md` pelo
  `coretriad-director` (a SanaCore não escreve em `coretriad/`), para valerem
  como aprovação (Regras 7, 17 e 18).
