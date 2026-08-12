# Auditoria de Espelhamento — Departamentos e Estrutura Organizacional

> ## ⚠️ REGISTRO DATADO — auditoria de 2026-08-06, superada
>
> Retrato do espelhamento de departamentos **em 2026-08-06**. A migration
> `20260806-000120`, aqui descrita como preparada e não aplicada, **já foi
> aplicada**; e a hierarquia saiu do documento e passou a existir no banco em
> 2026-08-11 (commit `ec54e41`), com guarda automática de divergência.
>
> Mantido sem reescrita do corpo. SSOT da hierarquia hoje:
> `docs/administrativo/05-ORGANOGRAMA_EXECUTIVO.md`.
>
> *Banner adicionado em 2026-08-12, junto com a ampliação das guardas
> documentais (`server/tests/helpers/docsGuardConventions.ts`). O documento
> declara-se registro datado: as guardas param de auditar suas afirmações de
> estado, e o leitor é avisado antes de agir sobre elas.*

**Data:** 2026-08-06
**Autor:** AdmDBA (auditoria de schema real vs. seed vs. docs)
**Escopo:** tabela `departments`, `employees.department_id`, `access_profiles`/`access_profile_permissions`, comparação de 3 fontes (banco real, `server/src/config/seeds.ts`, `docs/00-ESTRUTURA_ORGANIZACIONAL.md` + `docs/{área}/00-README.md`).

> **Nota de concorrência:** esta auditoria **não editou nenhum arquivo em `docs/`**. Um agente documentador está trabalhando em paralelo nesses mesmos arquivos com a premissa "seed = fonte da verdade". As correções do lado dos docs listadas aqui são recomendações para esse agente aplicar, não alterações já feitas.

---

## 0. Achado crítico (bloqueador da própria auditoria): `departments` está VAZIA no banco real

```sql
SELECT count(*) FROM departments;  -- 0
```

O banco `erp_evok_audio` (container `evok-postgres`, o mesmo que a API `evok-api`
usa em `DB_HOST=postgres`) tem a tabela `departments` com **zero linhas**,
apesar de:

- `users` já ter **54 linhas** (id 1 = admin oficial de 2026-07-31; os outros
  53 são claramente fixtures de teste RBAC/e2e rodadas contra este banco —
  nomes como `Almoxarife RBAC`, `Vendedor Sem Produtos`, `Usuario SEC-12
  Expirado`, emails `*-rbac-*@evok.local`, `*@evok.local` com timestamp Unix
  no nome).
- `access_profiles` ter **39 linhas**, a maioria com o mesmo padrão de nome
  de fixture de teste (`Almoxarife RBAC 1785883877051`, `Vendedor Sem
  Produtos 1785897012093`, etc.) — só a linha `id=1 Administrador Geral` e
  `id=2 Analista de Laboratorio` parecem intencionais.
- `employees` também está vazia (0 linhas) — coerente com `departments`
  vazia, já que `employees.department_id` é `NOT NULL` com FK `RESTRICT`
  para `departments`.

**Causa provável:** `seedDatabase()` (`server/src/config/seeds.ts`) só
popula `Department.bulkCreate(DEPARTMENTS)` quando `User.count() === 0`
(linha 79-83). Como o usuário admin já existe desde 31/07, o seed nunca
mais dispara automaticamente neste banco. Duas hipóteses, indistinguíveis
sem log de auditoria na própria tabela:

1. O `bulkCreate` de departamentos falhou silenciosamente na primeira
   execução (ex.: erro não fatal, capturado pelo `catch` genérico de
   `seedDatabase()` que só relança em produção — linha 122-129) enquanto o
   `User.create` do admin já tinha commitado.
2. Os departamentos foram inseridos e depois apagados manualmente/por um
   script de limpeza de testes que não tinha filtro por tabela (limpou
   `departments` junto com dados de teste, mas não recriou o seed oficial).

Nenhuma das duas é "banco divergindo do seed por edição manual legítima" —
é **ausência total de dados**, não há isso para comparar campo a campo hoje.

**Impacto colateral relevante para a auditoria:** este ambiente Docker
local não é um banco "limpo de produção local" como a tarefa presumia — ele
está contaminado com massa de teste (usuários e perfis de acesso RBAC/e2e).
Isso é um problema de higiene de ambiente separado do escopo desta
auditoria (departamentos), mas está registrado aqui porque foi encontrado
no caminho e afeta a interpretação de "o que é real" no banco. Recomenda-se
ao dono do produto decidir se este banco deve ser resetado (`docker compose
down -v` + novo `up` + seed limpo) antes do Go-Live, em vez de só corrigir
`departments`.

---

## 1. Matriz de divergência — Departamentos

Fontes:
- **Banco real** — `SELECT * FROM departments`: vazio, então a coluna abaixo mostra "❌ ausente" para todos.
- **Seed** — `server/src/config/seeds.ts` (`DEPARTMENTS`, 17 registros, código `01`–`17`).
- **Docs (master)** — `docs/00-ESTRUTURA_ORGANIZACIONAL.md`, tabela "Índice de Departamentos por Módulo".
- **Docs (README)** — tabela "Departamentos Cobertos" de cada `docs/{área}/00-README.md`.

| Código seed | Nome/Sigla seed | Banco real | Docs master (código/nome/sigla) | Docs README (código/nome/sigla) | Status |
|---|---|---|---|---|---|
| 01 | Diretoria / DIR | ❌ ausente | 01 / Diretoria / DIR | 01 / Diretoria / DIR (`administrativo`) | ⚠️ banco ausente; seed×docs OK |
| 02 | Recursos Humanos / RH | ❌ ausente | **não listado** (nota: "IDs 02 e 06 estão livres") | RH não tem tabela "Departamentos Cobertos" (`rh/00-README.md` — pendência assumida no próprio doc) | ❌ ausente nos 3; docs nem reconhece o código |
| 03 | Engenharia do Produto / ENG | ❌ ausente | 03 / Engenharia do Produto / ENG | 03 / Engenharia do Produto / ENG (`producao`) | ⚠️ banco ausente; seed×docs OK |
| 04 | PCP / PCP | ❌ ausente | 04 / Planejamento e Controle da Produção / PCP | 04 / Planejamento e Controle da Produção / PCP (`producao`) | ⚠️ banco ausente; nome mais extenso nos docs (mesma sigla, aceitável) |
| 05 | Produção / PROD | ❌ ausente | 05 / Produção / Manufatura / PROD | 05 / Produção / Manufatura / PROD (`producao`) | ⚠️ banco ausente; nome levemente diferente ("Produção" vs "Produção / Manufatura"), sigla igual |
| 06 | Almoxarifado / ALM | ❌ ausente | **não listado** (nota: "IDs 02 e 06 estão livres") | não aparece em nenhum README como departamento (aparece só como conteúdo funcional em `patrimonio/04-ALMOXARIFADO_INSUMOS.md`) | ❌ ausente nos 3; docs nem reconhece o código |
| 07 | Compras / COMP | ❌ ausente | 07 / Compras / Suprimentos / COMP | 07 / Compras / Suprimentos / COMP (`suprimentos`) | ⚠️ banco ausente; seed×docs OK (sigla igual) |
| 08 | Vendas / VEND | ❌ ausente | 08 / Vendas / Comercial / VEND | 08 / Vendas / Comercial / VEND (`comercial`) | ⚠️ banco ausente; seed×docs OK |
| 09 | Financeiro / FIN | ❌ ausente | 09 / Financeiro / FIN | 09 / Financeiro / FIN (`financeiro`) | ⚠️ banco ausente; seed×docs OK |
| 10 | Qualidade / QUAL | ❌ ausente | 10 / **Contabilidade** / **CONT** | 11 / Qualidade / QUAL (`qualidade/00-README.md`, código **11**, não 10!) | ❌ triplo conflito: seed diz 10=Qualidade, doc master diz 10=Contabilidade, doc README de qualidade diz 11=Qualidade |
| 11 | Expedição / EXP | ❌ ausente | 11 / Qualidade / QUAL | 12 / Expedição / Logística / EXP (`logistica/00-README.md`, código **12**, não 11!) | ❌ triplo conflito: seed diz 11=Expedição, doc master diz 11=Qualidade, doc README de logística diz 12=Expedição |
| 12 | Manutenção / MANUT | ❌ ausente | 12 / Expedição / Logística / EXP | não há README de manutenção com tabela "Departamentos Cobertos" | ❌ triplo conflito: seed diz 12=Manutenção, doc master diz 12=Expedição, não há doc próprio de Manutenção |
| 13 | TI / TI | ❌ ausente | 13 / Jurídico / JUR | `administrativo/00-README.md`: 13 / TI / TI ; `juridico/00-README.md`: 13 / Jurídico / JUR | ❌ conflito interno nos próprios docs: master diz 13=Jurídico, README administrativo diz 13=TI, README jurídico também diz 13=Jurídico — **dois READMEs diferentes reivindicam o código 13 para departamentos diferentes** |
| 14 | Marketing / MKT | ❌ ausente | `-` / Marketing / MKT (sem código) | `-` / Marketing / MKT (`comercial`, sem código) | ⚠️ banco ausente; seed atribui código 14, docs tratam como sem código — divergência de modelagem (docs não fecham 1:1 com os 17 códigos do seed) |
| 15 | Segurança do Trabalho / SST | ❌ ausente | 15 / Segurança do Trabalho / SST | 15 / Segurança do Trabalho / SST (`seguranca_trabalho`) | ⚠️ banco ausente; seed×docs OK |
| 16 | Jurídico / JUR | ❌ ausente | `-` (não aparece com código 16 na tabela master; ver linha 13 acima) | `juridico/00-README.md` usa código **13**, não 16 | ❌ código 16 do seed não aparece em lugar nenhum dos docs |
| 17 | Facilities / FAC | ❌ ausente | 17 / Facilities / FAC | `administrativo/00-README.md`: 17 / Facilities / FAC | ⚠️ banco ausente; seed×docs OK |

**Resumo dos tipos de divergência encontrados:**

1. **Banco × (seed ∪ docs):** 100% ausente — nenhum dos 17 códigos existe fisicamente no banco hoje (achado 0, acima).
2. **Seed × docs, códigos deslocados:** para os códigos `10`, `11`, `12`, `13`, `16`, o doc master (`00-ESTRUTURA_ORGANIZACIONAL.md`) usa uma numeração **completamente diferente** da do seed a partir do código 10 (parece ter sido escrito a partir de uma lista de departamentos de um ERP genérico/legado, sem olhar `seeds.ts`).
3. **Divergência interna dentro dos próprios docs:** o doc master e os READMEs departamentais **não concordam entre si**:
   - `qualidade/00-README.md` usa código `11` para Qualidade; o master usa `10` para Contabilidade e `11` para Qualidade (o README de qualidade bateu por acaso com o valor real do seed, mas não com o master).
   - `logistica/00-README.md` usa código `12` para Expedição; o master usa `11` para Qualidade e `12` para Expedição (README de logística também bate com o seed por acaso).
   - `juridico/00-README.md` usa código `13` para Jurídico; `administrativo/00-README.md` também usa código `13`, mas para **TI**. Dois READMEs de áreas diferentes reivindicam o mesmo código para departamentos diferentes — isso é uma inconsistência **dentro dos próprios docs**, independente do banco/seed.
4. **Departamentos do seed ausentes de qualquer doc "Departamentos Cobertos":** `02 Recursos Humanos` e `06 Almoxarifado`. O doc master chega a anotar explicitamente "IDs 02 e 06 estão livres" — o que é falso frente ao seed oficial (esses códigos estão ocupados por RH e Almoxarifado).
5. **Departamentos nos docs sem código/sem existência no seed:** `Marketing (MKT)` aparece nos docs sem código numérico, mas no seed tem código `14`. `Contabilidade (CONT)`, `Controladoria (CTR)`, `Tesouraria (TES)`, `Laboratório de Testes (LAB)`, `Garantia da Qualidade (GQ)` e `Comércio Exterior (COMEX)` aparecem só nos docs, sem equivalente algum no seed nem (obviamente) no banco.

---

## 2. Casos especiais pedidos na tarefa

| Departamento citado nos docs | Existe no seed? | Existe no banco (hoje, tabela vazia)? | Conclusão |
|---|---|---|---|
| Contabilidade | Não | Não | Só existe em docs (`00-ESTRUTURA_ORGANIZACIONAL.md` linha 33 e `financeiro/00-README.md`) |
| Controladoria | Não | Não | Só existe em docs (`financeiro/00-README.md`) |
| Tesouraria | Não | Não | Só existe em docs (`financeiro/00-README.md`) |
| Laboratório de Testes | Não | Não | Só existe em docs (`qualidade/00-README.md`); **porém** já existe um `access_profile` chamado "Analista de Laboratorio" (id=2) e um usuário de teste "Tecnico Lab Teste" — ou seja, o conceito de laboratório já vazou para dados reais de perfil de acesso sem nunca ter virado departamento formal |
| Garantia da Qualidade | Não | Não | Só existe em docs (`qualidade/00-README.md`) |
| Comércio Exterior (Comex) | Não | Não | Só existe em docs (`suprimentos/00-README.md`, `suprimentos/02-COMEX.md`) |

**Departamentos criados manualmente via UI que não estão no seed:** nenhum —
a tabela está vazia, portanto **nenhum departamento existe fisicamente no
banco agora**, nem os do seed nem os "extras" dos docs.

---

## 3. `access_profiles` / `access_profile_permissions` (perfis de acesso)

- `access_profiles`: 39 linhas, `access_profile_permissions`: 68 linhas.
- Apenas 2 registros parecem intencionais/de negócio: `id=1 "Administrador
  Geral"` (perfil de referência documentado na migration
  `20260803-000008-create-access-profiles.cjs`, não atribuído a ninguém) e
  `id=2 "Analista de Laboratorio"`.
- As outras 37 linhas são fixtures de teste RBAC/UC/SEC com timestamp Unix
  no nome (`Almoxarife RBAC 1785883877051`, `Vendedor Sem Produtos
  1785897012093`, `Perfil Sem Manutencao Garantia 1785897017651`, etc.) —
  claramente geradas por testes de integração/E2E que rodaram contra este
  banco (não contra `erp_evok_audio_test`, que existe separadamente no
  mesmo container Postgres).
- Nenhum desses perfis referencia `departments` diretamente (a tabela
  `access_profiles` não tem FK para `departments` — o vínculo é conceitual
  via nome/módulos), então isso não afeta a integridade da correção de
  `departments`, mas é um sinal de que **os testes de integração não estão
  isolados do banco "local"** que esta auditoria tratou como referência.
  Fora de escopo desta auditoria corrigir, mas registrado para o dono do
  produto avaliar limpeza/reset do ambiente.

---

## 4. Plano de reconciliação

| # | Corrigir no BANCO | Corrigir nos DOCS |
|---|---|---|
| 1 | Popular `departments` com os 17 registros oficiais do seed (`01`–`17`), via migration idempotente já preparada: `server/migrations/20260806-000120-reconcile-departments-with-official-seed.cjs` (`INSERT ... ON CONFLICT (code) DO UPDATE`, não roda automaticamente — pendente de aprovação). | Corrigir a tabela "Índice de Departamentos por Módulo" em `docs/00-ESTRUTURA_ORGANIZACIONAL.md` para usar exatamente os 17 códigos/nomes/siglas do seed (`01`–`17`), removendo a numeração paralela usada hoje a partir do código `10`. |
| 2 | — (não é problema de banco) | Adicionar `02 Recursos Humanos / RH` e `06 Almoxarifado / ALM` ao doc master e decidir onde documentar cada um (RH já tem pasta própria `docs/rh/`; Almoxarifado hoje só tem conteúdo funcional em `docs/patrimonio/04-ALMOXARIFADO_INSUMOS.md`, sem README com tabela "Departamentos Cobertos" — precisa ganhar uma linha em algum README, provavelmente `logistica` ou um novo `docs/almoxarifado/00-README.md`). |
| 3 | — | Resolver o conflito de código `13` entre `administrativo/00-README.md` (13=TI) e `juridico/00-README.md` (13=Jurídico): segundo o seed, `13=TI` e `16=Jurídico`. Corrigir `juridico/00-README.md` para `16`. |
| 4 | — | Corrigir `qualidade/00-README.md` (hoje usa `11` para Qualidade) para `10`, e `logistica/00-README.md` (hoje usa `12` para Expedição) para `11`, conforme o seed (`10=Qualidade`, `11=Expedição`, `12=Manutenção`). |
| 5 | — | Adicionar `12 Manutenção / MANUT` a algum README (hoje nenhum doc de área cobre Manutenção como departamento formal, só `docs/patrimonio/` cobre o assunto funcionalmente). |
| 6 | Decisão de negócio pendente (não é bug): se Contabilidade/Controladoria/Tesouraria/Laboratório/Garantia da Qualidade/Comex devem virar departamentos reais em `departments`, o dono do produto precisa aprovar a extensão do seed oficial (novos códigos `18`+, respeitando a numeração existente) — só depois disso faz sentido inserir no banco. | Até essa decisão, marcar essas 6 entradas nos docs como "conceitual/organizacional, sem `department_id` correspondente no banco hoje" em vez de apresentá-las lado a lado com departamentos reais na mesma tabela, para não sugerir que já existem como registro formal. |
| 7 | Avaliar (fora do escopo restrito de "departamentos", mas encontrado nesta auditoria): resetar o banco `erp_evok_audio` local dos 53 usuários de teste e 37 perfis de acesso de teste antes do Go-Live, ou confirmar que este container é só ambiente de dev/QA e não "produção local" propriamente dita. | — |

---

## 5. Critério de "espelho perfeito" para auditorias futuras

Para nunca mais chegar a este nível de divergência sem detecção automática, propõe-se:

1. **Fonte única de verdade explícita:** `server/src/config/seeds.ts` (`DEPARTMENTS`) é a fonte de verdade para código/nome/sigla de departamento. Qualquer doc que liste departamentos deve citar esse arquivo como origem (já é o caso em `administrativo/00-README.md`, linha 15 — replicar o padrão em todos os outros READMEs).
2. **Script de verificação (candidato a CI, não implementado nesta auditoria):** um script Node/TS simples que:
   - importa `DEPARTMENTS` de `seeds.ts`;
   - faz parse das tabelas Markdown "Departamentos Cobertos" de cada `docs/*/00-README.md` (regex simples de tabela Markdown);
   - falha o build/CI se algum código/nome/sigla do seed não aparecer em nenhum README, ou se dois READMEs reivindicarem o mesmo código para departamentos diferentes.
   - Opcionalmente, roda também via introspecção (`SELECT code, name, sigla FROM departments`) em ambiente de CI com banco de teste seedado, para pegar divergência banco×seed automaticamente (o próprio `docs/database/gen_dict.py` já tem o padrão de introspecção a copiar).
3. **Regra de processo:** qualquer novo departamento (código, nome ou sigla) só entra em produção via alteração do array `DEPARTMENTS` em `seeds.ts` **e** migration de dados idempotente equivalente à `20260806-000120` — nunca só via UI manual sem passar pelo seed, e nunca só documentado sem migration correspondente.

---

## 6. Arquivos produzidos por esta auditoria

- `server/migrations/20260806-000120-reconcile-departments-with-official-seed.cjs` — migration idempotente (`INSERT ... ON CONFLICT (code) DO UPDATE`) que repopula os 17 departamentos oficiais do seed. **Não foi executada** (`npm run migration:up` pendente de aprovação explícita do dono do produto, dado que a tabela está inesperadamente vazia e merece confirmação antes de qualquer escrita).
- Este relatório: `docs/database/AUDITORIA_DEPARTAMENTOS_2026-08-06.md`.

Nenhum arquivo em `docs/{área}/00-README.md` ou `docs/00-ESTRUTURA_ORGANIZACIONAL.md` foi alterado por esta auditoria.
