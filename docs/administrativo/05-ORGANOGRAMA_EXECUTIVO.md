# Organograma Executivo Consolidado - EVOK ÁUDIO

> Consolida em um único diagrama o agrupamento "Departamentos por Área" de
> `docs/00-ESTRUTURA_ORGANIZACIONAL.md`. Os IDs entre parênteses são os
> códigos reais de `server/src/config/seeds.ts` (fonte da verdade). Onde o
> nome usado no dia a dia difere da sigla do banco, a sigla vem entre `[ ]`.

## Diagrama

```
                                    ┌──────────────────────┐
                                    │         CEO          │
                                    │  Diretor Presidente  │
                                    │    Diretoria (01)    │
                                    └───────────┬──────────┘
                                                │
        ┌───────────────────┬───────────────────┼───────────────────┬───────────────────┐
        │                   │                   │                   │                   │
┌───────┴────────┐ ┌────────┴─────────┐ ┌───────┴────────┐ ┌────────┴─────────┐   (transversal)
│    Diretor     │ │    Diretor de    │ │    Diretor     │ │     Diretor      │        │
│   Industrial   │ │  Suprimentos &   │ │   Comercial    │ │   Admin-Fin.     │        │
│                │ │    Logística     │ │                │ │                  │        │
└───────┬────────┘ └────────┬─────────┘ └───────┬────────┘ └────────┬─────────┘        │
        │                   │                   │                   │                  │
  ┌───┬─┼─┬────┬─────┐   ┌──┼───┬─────┐      ┌──┴───┐      ┌────┬───┼───┬────┐         │
  │   │ │ │    │     │   │  │   │     │      │      │      │    │   │   │    │         │
 ENG PCP PROD QUAL MANUT COMP ALM   EXP     VEND   MKT     RH  FIN JUR  TI  FAC       SST
(03)(04)(05) (10) (12)  (07)(06)  (11)     (08)   (14)    (02)(09)(16)(13)(17)       (15)
              │            │                                    │
              │            └── COMP inclui subárea: COMEX        └── FIN inclui subáreas:
              │                                                      CONT, CTR, TES
              └── QUAL inclui subáreas: LAB, GQ
```

> **Diretoria de Suprimentos & Logística (criada em 2026-08-11).** Reúne
> Compras (07), Almoxarifado (06) e Expedição (11) — a cadeia de
> suprimentos completa: comprar, guardar, expedir. Substitui três remendos
> da versão anterior deste documento:
> 1. o desenho ASCII colocava **ALM no braço Administrativo-Financeiro**
>    enquanto a tabela abaixo o colocava sob o Diretor Industrial — o mesmo
>    arquivo se contradizia;
> 2. a nota de **EXP** ficava visualmente pendurada em **MANUT**,
>    sugerindo que Expedição responde a Manutenção, o que não ocorre em
>    nenhuma prática de mercado;
> 3. **Compras** era rotulado "transversal, sem diretoria fixa" — uma forma
>    de não decidir, apesar de ser departamento pleno no seed, com gerente
>    próprio.
>
> A separação segue a distinção clássica entre *supply chain* (comprar,
> armazenar, distribuir) e *operations* (transformar insumo em produto).
>
> ⚠️ **Cargo previsto, ainda não provido.** A posição de Diretor de
> Suprimentos & Logística foi decidida pelo dono em 2026-08-11 como parte da
> estrutura-alvo; hoje as três áreas ainda se reportam à Diretoria. Este
> documento descreve a estrutura para a qual a empresa está indo — não
> afirma um ocupante atual.

> **Este organograma existe no banco de dados** (desde 2026-08-11, migration
> `20260811-000043-create-directorates-hierarchy.cjs`). Não é mais só
> convenção de leitura:
>
> | Objeto | Papel |
> |---|---|
> | `directorates` | Uma linha por diretoria, com `code` (`CEO`/`IND`/`SUP`/`COM`/`ADM`) e `manager_id` (**NULL = cargo vago**, hoje `SUP`) |
> | `departments.directorate_id` | FK. **NULL = transversal**, sem diretoria fixa — hoje só SST |
> | `access_profiles.department_id` | FK n:1 — `Compras (analista)` e `Compras (gerente)` apontam para o mesmo departamento. NULL = perfil de sistema |
>
> **Por que uma tabela e não `departments.parent_id`:** a modelagem clássica
> de árvore (*adjacency list*) pressupõe que pai e filho sejam a mesma
> entidade. Aqui não são — `Diretoria (01)` é UM departamento e os quatro
> diretores são cargos dentro dele. `parent_id` obrigaria a criar linhas
> falsas em `departments` chamadas "Diretoria Industrial", só para servir de
> nó. Hierarquia fixa de dois níveis → uma tabela por nível.
>
> **Guardas que mantêm isto honesto:**
> `client/src/lib/departments.seeds.test.ts` (frontend × seed: nome, código,
> sigla, **e a diretoria de cada departamento**) e
> `server/tests/unit/organizational-structure-guard.test.ts` (catálogo de
> módulos × seed). Alterou aqui, altere `seeds.ts` e
> `client/src/lib/departments.ts` na mesma rodada — os testes avisam se
> esquecer de um.

## Tabela de agrupamento (mesma fonte de `00-ESTRUTURA_ORGANIZACIONAL.md`)

| Diretoria | Departamentos (ID/sigla) | Subáreas funcionais |
|-----------|--------------------------|----------------------|
| CEO / Diretoria | Diretoria (01/DIR) | — |
| Diretor Industrial | Engenharia (03/ENG), PCP (04/PCP), Produção (05/PROD), Qualidade (10/QUAL), Manutenção (12/MANUT) | LAB, GQ (sob Qualidade) |
| Diretor de Suprimentos & Logística ⚠️ *cargo vago* | Compras (07/COMP), Almoxarifado (06/ALM), Expedição (11/EXP) | COMEX (sob Compras) |
| Diretor Comercial | Vendas (08/VEND), Marketing (14/MKT) | — |
| Diretor Administrativo-Financeiro | RH (02/RH), Financeiro (09/FIN), Jurídico (16/JUR), TI (13/TI), Facilities (17/FAC) | CONT, CTR, TES (sob Financeiro) |
| Transversal (sem diretoria fixa) | Segurança do Trabalho (15/SST) | — reporta tipicamente à Diretoria/RH, varia por porte de empresa |

**17 departamentos, nenhum sem lugar** — 1 + 5 + 3 + 2 + 5 + 1. Se esta
conta deixar de fechar, a tabela está errada, não o seed.

## Cargos de Diretoria (`docs/administrativo/01-DIRETORIA.md`)

| Cargo | Departamento (banco) | Responsabilidades |
|-------|------------------------|---------------------|
| CEO / Diretor Presidente | Diretoria (01/DIR) | Estratégia, resultados, inovação |
| Diretor Industrial | Diretoria (01/DIR) | Produção, engenharia, qualidade, manutenção |
| Diretor Comercial | Diretoria (01/DIR) | Vendas, marketing, expansão |
| Diretor Administrativo-Financeiro | Diretoria (01/DIR) | Finanças, RH, jurídico, TI, facilities |
| Diretor de Suprimentos & Logística ⚠️ *vago* | Diretoria (01/DIR) | Compras, almoxarifado, expedição |

> No banco (`employees.department_id`), todos os quatro cargos de diretoria
> pertencem ao mesmo departamento **Diretoria (01)** — o "reporte" a Produção/
> Comercial/Administrativo-Financeiro é apenas organizacional (função do
> cargo), não uma FK para departamentos diferentes.

## Divergências conhecidas com `docs/projeto/02-PLANO_INDUSTRIAL.md`

O plano industrial original descreve **21 departamentos** com IDs `01`-`21`
(incluindo Controladoria=16, Tesouraria=17, Comex=18 como departamentos
plenos). O seed real implementado (`server/src/config/seeds.ts`) tem apenas
**17 departamentos**; os 6 que não entraram como linha própria em
`departments` foram rebaixados a **subáreas funcionais** de um departamento
pai (ver `docs/00-ESTRUTURA_ORGANIZACIONAL.md` § Subáreas funcionais). O
plano industrial é mantido como documento histórico de concepção e não foi
reescrito nesta rodada — não usar seus IDs para nada que dependa do banco.

---

**Última atualização:** 2026-08-06
