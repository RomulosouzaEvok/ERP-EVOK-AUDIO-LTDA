# Guia da Carga Inicial de Cadastro — ERP Evok Áudio

**Para quem é este guia:** qualquer pessoa da Evok, sem conhecimento técnico.
**O que ele resolve:** tirar a lista de insumos do sistema antigo e colocá-la
dentro do ERP novo, com responsáveis definidos e sem pular etapa.

**Data:** 10 de agosto de 2026

---

## 1. Antes de tudo: por que existe uma "carga inicial"

O ERP é uma casa nova e vazia. Ele sabe **como** fabricar, comprar e vender,
mas não sabe **o quê** — porque o cadastro está no sistema antigo.

A carga inicial é a mudança: levar o cadastro para a casa nova, conferido,
sem levar lixo junto. Ela acontece uma única vez e tudo o que vier depois
(compras, produção, vendas) se apoia nela. Cadastro errado aqui vira erro
multiplicado em todo o resto — por isso as conferências deste guia não são
burocracia.

---

## 2. Panorama: as 6 etapas e quem responde por cada uma

| # | Etapa | Quem faz | Sistema/ferramenta | Situação |
|---|-------|----------|--------------------|----------|
| 1 | Limpar o banco de teste | TI | Script | ✅ **feito em 10/08** |
| 2 | Carregar os 327 insumos | TI | Script | ✅ **feito em 10/08** |
| 3 | Conferir os 59 itens marcados | Engenharia + Compras | Tela Item Mestre | ⬜ **próximo passo** |
| 4 | Preencher custo de cada insumo | Compras + Controladoria | Tela Item Mestre | ⬜ pendente |
| 5 | Cadastrar os produtos acabados | Engenharia | Tela Item Mestre | ⬜ pendente |
| 6 | Montar a BOM (o que entra em cada produto) | Engenharia | Tela BOM | ⬜ pendente |
| 7 | Contar o estoque físico e lançar | Almoxarifado | Tela Inventário | ⬜ pendente |

> As etapas 1 e 2 exigem conhecimento técnico e já foram executadas.
> **Da etapa 3 em diante o trabalho é da fábrica, na tela, sem código.**

---

## 3. Quem é cada usuário (e por que não é tudo no `admin`)

O ERP tem uma regra chamada **segregação de função**: quem pede não é quem
aprova. Se todo mundo usar o mesmo login, essa regra vira enfeite — foi
exatamente o problema encontrado na auditoria (um único usuário era autor de
100% dos documentos e aprovava a si mesmo).

Usuários disponíveis hoje (⚠️ **são de teste**, domínio `@teste.evokaudio` —
antes do Go-Live precisam virar pessoas reais `@evokaudio.com.br`):

| Usuário | E-mail | Pode fazer, nesta carga |
|---------|--------|--------------------------|
| Engenheiro de Produto | `engenharia@teste.evokaudio` | **Criar e editar itens, criar BOM** — é o dono do cadastro técnico |
| Almoxarife | `almoxarifado@teste.evokaudio` | Editar itens, lançar inventário, receber material |
| Analista de Compras | `compras@teste.evokaudio` | Preencher custo, cadastrar fornecedor, **abrir** pedido |
| Gerente de Compras | `compras.gerente@teste.evokaudio` | **Aprovar** o que o analista abriu |
| Diretor | `diretoria@teste.evokaudio` | Aprovar compra acima de R$ 500 mil e toda importação |
| Planejador (PCP) | `pcp@teste.evokaudio` | Plano mestre, MRP, ordens de produção |

As senhas estão em `server/CREDENCIAIS_TESTE.local.txt`, na máquina da TI.

---

## 4. O que foi feito nas etapas 1 e 2 (registro, para auditoria)

### Etapa 1 — limpeza do banco

O banco de desenvolvimento carregava dado inventado de sessões de teste: 30
produtos fictícios, 8 ordens de produção, 18 pedidos de compra, 13
requisições, 38 movimentações de estoque, 17 lotes. Nada correspondia à
fábrica. Carregar a lista real por cima produziria um cadastro misturado e um
estoque impossível de conferir contra a prateleira.

**Backup antes:** `backups/erp_evok_audio_pre-limpeza_20260810.dump` (1,4 MB).
Se algo der errado, é dele que se volta.

**Removido:** 681 linhas em 37 tabelas.
**Preservado:** as 164 migrations, os 21 usuários, os 21 perfis de acesso, os
17 departamentos, os 9 depósitos, os centros de trabalho, as configurações da
empresa e o plano de contas contábil.

> O plano de contas quase foi apagado por engano. Ele é criado por uma
> *migration de seed* — e como as migrations já constam aplicadas, ela nunca
> rodaria de novo. Teria sido uma perda permanente. Ficou documentado dentro
> do próprio script para não repetir.

Comando (não precisa rodar de novo):
```bash
cd server
node scripts/limpar-dados-transacionais.cjs             # simula, não grava
node scripts/limpar-dados-transacionais.cjs --confirmar # executa
```

### Etapa 2 — carga dos 327 insumos

Os itens **não** foram inseridos direto no banco. Cada um passou pela API real
(`POST /api/items`), com as validações do sistema — unicidade de código,
formato e permissão do usuário.

> ⚠️ **Sem trilha de auditoria.** Conferindo depois da carga, as 327 criações
> **não geraram nenhum registro** em `audit_logs` (só os 2 logins ficaram
> gravados). `itemController` é um dos 35 controllers, de 98, que não chamam
> `logAction` — enquanto o `products` legado chama 6 vezes e o de BOM, 4.
> Na prática: hoje ninguém consegue saber quem alterou o custo padrão de um
> insumo, ou quem inativou um item, nem quando. Está registrado como pendência
> em `docs/governance/RESIDUAIS_ABERTOS_2026-08-10.md` §3.2.

Isso é proposital. O projeto já foi mordido quatro vezes por dado que entrou
por baixo da aplicação, passou nos testes e quebrou no primeiro uso real (ver
`docs/governance/auditorias/CLASSE_DE_DEFEITO_VERIFICACAO_2026-08-10.md`).
Carregando pela API, **a própria carga vira a prova de que o cadastro funciona**.

```bash
cd server
export IMPORT_EMAIL="engenharia@teste.evokaudio"
export IMPORT_PASSWORD="<senha do arquivo de credenciais>"

# simula: valida o arquivo inteiro sem gravar
node scripts/importar-itens-csv.cjs ../docs/carga-inicial/insumos-materia-prima.csv

# grava
node scripts/importar-itens-csv.cjs ../docs/carga-inicial/insumos-materia-prima.csv --confirmar
```

**Duas coisas que aconteceram e valem registro:**

1. O validador reprovou o próprio arquivo na primeira tentativa: dois textos de
   observação continham `;`, que é o separador de coluna. Corrigido antes de
   qualquer gravação — que é exatamente para isso que o modo simulação existe.
2. A API tem limite de **300 requisições a cada 15 minutos**. A carga de 327
   itens estourou o teto: 300 entraram e 27 foram recusados. O limite está
   certo (é defesa contra abuso) — quem passou a se adaptar foi o script, que
   agora espera a janela reabrir em vez de falhar.

---

## 5. Etapa 3 — conferir os 59 itens marcados (Engenharia + Compras)

Esta é a etapa mais importante do guia, e a única que **só a fábrica** pode
fazer: eu marquei o que parece errado, mas quem sabe qual peça é qual está no
chão de fábrica.

### Como conferir, na tela

1. Abra o ERP e faça login como **Engenharia**.
2. Vá em **Produtos → Item Mestre** (`/products/items`).
3. Busque o código indicado (ex.: `MP-057`).
4. Clique no item para abrir o detalhe e corrija o que for necessário.

Abra também a planilha `docs/carga-inicial/insumos-materia-prima.csv` no Excel
e filtre a coluna **`revisar` = SIM**. A coluna **`motivo_revisao`** explica
cada caso.

### 5.1 🔴 Prioridade máxima — 5 bobinas com identificação suspeita

**Por que é grave:** bobina errada = alto-falante errado. E como a bobina é
uma das peças que definem a impedância (4 ohms, 8 ohms), o erro só aparece no
teste acústico, com material já consumido.

No sistema antigo, a coluna de Referência das bobinas parece estar **deslocada
uma linha** em relação à descrição:

| Código | Referência dizia | Descrição dizia |
|--------|------------------|-----------------|
| MP-057 | M406**0401** | M406**0401** |
| MP-060 | M406**0401** ← repetida | M406**0801** |
| MP-061 | M406**0801** | M512**0801** |
| MP-064 | M512**0801** | M512**0801** ← repetida |

**Quem resolve:** Engenharia, com a bobina física na mão.
**O que fazer:** para cada um dos 5 códigos (MP-057, MP-060, MP-061, MP-064,
MP-090), confirmar qual é o código real da bobina e a qual alto-falante ela
pertence. Corrigir a descrição na tela.

**Enquanto não for resolvido: não monte a BOM desses alto-falantes.**

### 5.2 🟡 22 itens com unidade de medida errada

Cola, ativador e cordoalha foram cadastrados como **UN** (unidade), mas são
comprados e consumidos a granel.

O efeito prático: se a BOM disser "1 UN de `MP-179 — COLA BORRACHA CB-5502
3KG`" por alto-falante, o sistema vai baixar **3 quilos de cola por peça**. O
custo do produto e a necessidade de compra ficam absurdos.

A coluna **`unidade_sugerida`** do CSV já traz a proposta (KG, G, LT, ML, M).

**Quem resolve:** Compras (sabe como o fornecedor vende) + Engenharia (sabe
quanto se consome por peça).
**O que fazer:** definir a unidade e **quanto entra em cada alto-falante**
(ex.: 12 gramas de cola por peça, não "1 unidade").

### 5.3 🟡 3 pares de itens possivelmente duplicados

| Par | Situação |
|-----|----------|
| MP-082 e MP-197 | Mesma cola Loctite 5181H BO1KG, cadastrada duas vezes |
| MP-160 e MP-161 | Mesma referência para 4 OHMS e 8 OHMS (peças diferentes) |
| MP-320 e MP-324 | "ADESIVO IDENTIF CX 6MB300" e "CX 6 MB300" |

**Quem resolve:** Compras (082/197 e 160/161) e Engenharia (320/324).
**O que fazer:** decidir se são a mesma peça. Se forem, **inativar** um dos dois
(nunca excluir — o ERP não apaga cadastro, para preservar histórico fiscal).

### 5.4 🟡 4 itens marcados "ANTIGO" e 9 marcados "LANÇAMENTO"

- **ANTIGO** (MP-090, MP-091, MP-120, MP-281): se não se compra mais, mudar o
  status para **INATIVO**. Continuam no histórico, somem das telas de compra.
- **LANÇAMENTO** (MP-033, MP-183, MP-191, MP-204, MP-205, MP-211, MP-229,
  MP-235, MP-264): confirmar se já entraram em produção. Se ainda não,
  **BLOQUEADO** é o status certo.

**Quem resolve:** Engenharia (o que saiu de linha) + Marketing/Comercial (o que
já lançou).

### 5.5 🟡 Casos individuais

| Código | O que confirmar | Quem |
|--------|------------------|------|
| MP-283 | Único item que era "REVENDA" no sistema antigo; os adesivos irmãos são matéria-prima e o ERP não tem esse tipo | Compras |
| MP-116 | Descrição diz "(PAR)" — 1 unidade é 1 borne ou 1 par? | Engenharia |
| MP-202 | Caixa de 6 unidades — 1 unidade é 1 caixa ou 1 tweeter? | Almoxarifado |
| MP-038, MP-049 | Bico aplicador e pipeta: viram material do produto ou consumo de fábrica? | Engenharia |
| MP-093, MP-113, MP-133, MP-143 | Descrição não diz a qual alto-falante pertence | Engenharia |
| MP-040, MP-043 | Dois plugs de fase com o mesmo código de desenho (038.022.00) | Engenharia |
| MP-155 | Descrição cita "COD 135" de outro sistema | Compras |

---

## 6. Etapa 4 — preencher os custos (Compras + Controladoria)

**Situação:** os 327 itens entraram com **custo zero**, porque o relatório do
sistema antigo trazia tudo zerado.

**Por que isso não pode ficar assim:** o custo do insumo é a base de tudo o que
vem depois — custo do alto-falante, preço de venda, valor do estoque no
balanço, decisão de comprar ou não. Com custo zero, o ERP informa que fabricar
não custa nada.

**Quem faz:** Compras levanta o último preço pago por item; Controladoria
valida.

**Como preencher:** Item Mestre → busca o código → campo **Custo padrão**.

> **Dica para 327 itens:** não precisa fazer todos de uma vez. Comece pelos
> que mais pesam: ferrites, carcaças, bobinas, cones, centragens e caixas. Os
> 79 adesivos têm custo unitário baixo e podem esperar.

**Falta também, e depende do contador:** NCM e CEST de cada item (classificação
fiscal). Sem eles não se emite NF-e de compra nem de venda. Não vieram no
relatório do sistema antigo.

---

## 7. Etapa 5 — cadastrar os produtos acabados (Engenharia)

**Situação:** a lista carregada tem **só insumos**. Nenhum alto-falante pronto
está cadastrado — e sem eles não existe ordem de produção nem venda.

A boa notícia: as descrições dos insumos já dizem a qual alto-falante cada peça
pertence (ex.: `CENTRAGEM PRD02882 - AF SUB 10" 1000`). Cruzando isso, os
produtos da fábrica são aproximadamente estes 22:

```
AF 6" 350            AF 6X9 350           AF 6" MB230X        AF 6" MB300
AF 6" WF200          AF 6X9 MB250         AF 6X9 MB280        AF 6X9 DARK260
AF 6X9 280           AF 8" MB300          AF 8" MB300X        SUB 10" 1000
SUB 12" 600          12" S1000            12" SW1000          12" SW700X
12" SW900X           12" SW1500           12" SW2000          DARK 15"
Tweeter STE400       Tweeter Supreme      (+ kits de reparo)
```

**Quem faz:** Engenharia.
**Como:** Item Mestre → **Novo item** → tipo **PRODUTO_ACABADO**.
**Sugestão de código:** `PA-001`, `PA-002`… (`PA` de produto acabado, do mesmo
jeito que `MP` é matéria-prima).

**Confirme a lista com a Diretoria antes** — ela foi deduzida das descrições
dos insumos, não de um cadastro oficial de produtos.

---

## 8. Etapa 6 — montar a BOM (Engenharia)

**O que é BOM:** a "receita" do alto-falante — quais peças entram e quanto de
cada uma.

Sem ela o ERP não consegue: calcular o custo do produto, saber o que comprar
(MRP), nem baixar material do estoque quando a produção acontece.

**Quem faz:** Engenharia. **Só a Engenharia** — é decisão técnica.
**Como:** Item Mestre → abre o produto acabado → aba **Estrutura/BOM** → inclui
cada componente com a quantidade.

**Cuidados:**
- Informe a **perda %** quando houver (ex.: sobra de cola, refugo de cone).
- Para itens a granel, use a unidade corrigida na etapa 5.2 — senão a receita
  vira "3 kg de cola por peça".
- Não use as bobinas do item 5.1 antes de resolver a identificação.

---

## 9. Etapa 7 — inventário de abertura (Almoxarifado)

**Situação:** todos os 327 itens estão com **estoque zero**. Estoque não é
cadastro, é contagem física — ninguém pode digitar de memória.

**Quem faz:** Almoxarifado conta; Controladoria acompanha (é valor de balanço).

**Como:**
1. Imprimir a lista de contagem por depósito.
2. Contar fisicamente. Duas pessoas contando separado, conferindo depois, é o
   padrão de quem não quer refazer.
3. Lançar em **Estoque → Inventário**.
4. Divergência acima do combinado: recontar antes de aceitar.

**Faça no mesmo dia da virada.** Contagem de segunda lançada na quinta já
nasce errada.

---

## 10. Checklist final antes de dizer "cadastro pronto"

- [ ] Os 5 códigos de bobina do item 5.1 conferidos com a peça física
- [ ] As 22 unidades de medida corrigidas (cola, ativador, cordoalha)
- [ ] Os 3 pares duplicados resolvidos (um inativado)
- [ ] Os 4 "ANTIGO" inativados e os 9 "LANÇAMENTO" definidos
- [ ] Custo padrão preenchido, no mínimo nos itens de maior valor
- [ ] NCM/CEST definidos com o contador
- [ ] Os ~22 produtos acabados cadastrados e aprovados pela Diretoria
- [ ] BOM montada e conferida para pelo menos 1 alto-falante ponta a ponta
- [ ] Inventário físico contado e lançado
- [ ] Usuários de teste (`@teste.evokaudio`) substituídos por pessoas reais
- [ ] Pelo menos **um aprovador real** cadastrado, diferente de quem solicita

---

## 11. Perguntas que vão aparecer

**Posso editar direto na planilha e mandar carregar de novo?**
Sim, para itens que ainda não existem. Item já cadastrado é ignorado na
recarga (o sistema responde "já existe"). Para corrigir um item existente,
use a tela.

**Apaguei/errei um item. Como excluo?**
Não se exclui. O ERP não apaga cadastro — exigência de auditoria fiscal. Mude
o status para **INATIVO**: ele some das telas de uso e continua no histórico.

**Por que os adesivos ficaram com código `MP-240` e não com um nome?**
No sistema antigo os 79 adesivos não tinham referência — só o número. Mantive
esse número, que é o que a fábrica já usa e o que está no relatório impresso.
A descrição continua buscável: digite "ADESIVO FUNDO" e ele aparece.

**Perdi a senha do usuário de teste.**
Não é recuperável (o banco guarda só o hash). A TI roda
`node scripts/seed-usuarios-departamentos.cjs` de novo e gera senhas novas.

---

## 12. Arquivos relacionados

| Arquivo | O que é |
|---------|---------|
| `docs/carga-inicial/insumos-materia-prima.csv` | Os 327 insumos, com as colunas de revisão |
| `server/scripts/limpar-dados-transacionais.cjs` | Limpeza do banco (etapa 1) |
| `server/scripts/importar-itens-csv.cjs` | Carga via API (etapa 2) |
| `backups/erp_evok_audio_pre-limpeza_20260810.dump` | Backup anterior à limpeza |
| `server/CREDENCIAIS_TESTE.local.txt` | Senhas dos usuários de teste (não versionado) |
