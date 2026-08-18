# PERGUNTAS PENDENTES AO DONO — ERP-LEGACY-001 (consolidado em 2026-08-17)

Este documento consolida, num único lugar, **todas** as perguntas ao dono que
estão registradas nos casos de remediação abertos do projeto ERP-LEGACY-001.
Nenhuma pergunta foi respondida, resumida a ponto de perder nuance decisória,
ou inventada aqui — cada uma foi extraída do `TRIAGE.md` original do caso
correspondente. Em caso de dúvida sobre a formulação exata, o documento fonte
é a referência.

Este documento **não decide nada** (Regra 6 do CLAUDE.md). É apenas
consolidação para facilitar a leitura e a resposta do dono.

---

## Tabela-resumo

| # | CASE_ID | Pergunta (resumida) | Bloqueia o quê |
|---|---|---|---|
| 1 | CASE-001 | Parcelas idênticas no mesmo título continuam permitidas? | Nada no desenho recomendado — só bloqueia se dono preferir alternativa B (dedupe server-side) |
| 2 | CASE-001 | Existe consumidor externo das 3 rotas afetadas (fora do client oficial)? | Se sim, `operation_id` não pode ser obrigatório de imediato — precisa de transição |
| 3 | CASE-001 | Reenvio detectado deve responder 409 ou "replay" 200? | Nada — decisão técnica do engineer, só listada por transparência |
| 4 | CASE-002 | De onde vem o valor da alçada jurídica (R$ 50.000 / R$ 300.000)? Tabela configurável ou constantes no código? | Só a Falha 1 (thresholds) do caso — Falhas 2 e 4 já liberadas para execução |
| 5 | CASE-002 | Aditivo que aumenta valor de contrato: quem pode assinar (gestor ou nível básico)? | Só a Falha 3 (aditivo) — parte do núcleo dessa falha já será corrigida independente da resposta |
| 6 | CASE-002 | Estender a regra "quem cadastra não aprova" (D-K) também ao Jurídico? | Só a parte "além do mínimo" da Falha 4 — o mínimo (duas pessoas distintas) já será corrigido de qualquer forma |
| 7 | CASE-011 | Fonte de verdade do tipo da CAT: derivar de `gravidade` ou aceitar o que vier no formulário? | Todo o caso — nenhum código será escrito antes disso |
| 8 | CASE-011 | Implementar calendário de feriados nacionais agora, ou registrar que fica simplificado por ora? | Todo o caso |
| 9 | CASE-011 | O texto do "emitente" da CAT deve ser salvo em campo próprio, ou removido da tela/contrato? | Todo o caso |
| 10 | CASE-011 | Quem é o responsável (owner) de SST/RH para validar a regra de prazo e feriados? | Todo o caso |
| 11 | CASE-012 | O motivo da rescisão de contrato de experiência deve ser gravado no processo de demissão? | Item 1 do caso inteiro |
| 12 | CASE-012 | Se gravado: código fixo (lista pré-definida) ou texto livre digitado pelo RH? | Depende da resposta da #11 |
| 13 | CASE-012 | O motivo deve ser obrigatório, e os dois jeitos de abrir um processo de demissão devem aceitar o mesmo campo? | Depende da resposta da #11 |
| 14 | CASE-012 | Qual é a modalidade de aviso prévio (trabalhado/indenizado) no fim de contrato de experiência? | Item 2 do caso inteiro |
| 15 | CASE-012 | Essa modalidade deve ser escolhida pelo RH nessa tela também, ou fica um padrão fixo do sistema? | Depende da resposta da #14 |
| 16 | CASE-012 (processo, ao director) | O item 3 (status HTTP 409×422 em disputa documental) entra neste caso ou fica separado? | Roteamento do item 3 — não é pergunta ao dono |
| 17 | CASE-013 | Em quais dos 24 pontos de aprovação do sistema "quem pediu não pode aprovar" deve valer? | Os 20 pontos de política (RC-1) inteiros — resto do caso (registro de identidade, inventário) já é executável |
| 18 | CASE-013 | Aplicar essa regra agora (antes do Go-Live) ou faseado/postergado? | O momento de aplicação dos 20 pontos acima |
| 19 | CASE-013 | Quais pessoas reais serão o "segundo aprovador" em cada módulo afetado? | A regra fica sem efeito prático para o único usuário real (admin) sem essa resposta |
| 20 | CASE-013 | Existe tolerância de diferença na contagem de estoque antes de exigir aprovação de nível superior? | Só o controle extra de tolerância na contagem de inventário |
| 21 | CASE-013 | O time aceita que o sistema passe a bloquear a entrega de um módulo novo se ele criar um ato de aprovação sem estar registrado na lista de controle? | Só o mecanismo de "não deixar o problema voltar" — não bloqueia a correção dos 24 pontos atuais |

---

## CASE-001 — FIND-ERP-001 (duplicação de estoque / pagamento parcial repetido)

**Situação geral:** o desenho técnico recomendado (uma "chave" única gerada
pelo usuário a cada tentativa de lançamento/pagamento) já resolve o problema
central sem depender de nenhuma das perguntas abaixo. Ou seja, **o caso pode
ser despachado para correção mesmo sem essas respostas** — elas afinam
detalhes, não travam a correção principal.

### Pergunta 1 — Parcelas idênticas legítimas

Hoje é possível pagar duas parcelas de um mesmo título financeiro com o
mesmo valor, no mesmo dia, pelo mesmo método (ex.: título de R$ 1.000 baixado
em duas vezes de R$ 500) — sem que o sistema saiba dizer se isso é uma baixa
legítima ou um clique duplicado que reenviou o mesmo pagamento duas vezes.

- **Opção A (recomendada, já no desenho):** cada tentativa de pagamento gera
  uma "chave" nova assim que a tela é aberta. Duas parcelas legítimas de
  mesmo valor continuam permitidas normalmente, porque cada uma nasce de uma
  abertura de tela diferente. Consequência prática: nada muda para quem usa
  o sistema normalmente; só o duplo clique/reenvio de rede é bloqueado.
- **Opção B (alternativa, rejeitada pela triagem, mas existe se o dono
  preferir):** o sistema tenta adivinhar duplicidade comparando valor, data e
  método. Consequência prática: passaria a **bloquear parcelas legítimas de
  mesmo valor no mesmo dia**, mesmo sendo pagamentos diferentes e corretos.

**Bloqueante?** Não para a correção como desenhada. Só se torna relevante se
o dono preferir a Opção B.

### Pergunta 2 — Existe alguém de fora usando essas rotas?

A correção vai exigir que toda chamada às rotas de lançamento de estoque e
de pagamento de contas venha acompanhada de uma "chave" obrigatória. Isso
está seguro para o sistema (tela) que a Evok usa hoje, porque ele já vai ser
atualizado junto. A pergunta é se existe **algum outro sistema ou robô**
(n8n, bot de WhatsApp, script, integração de terceiro) que chama essas
mesmas rotas por fora da tela do ERP.

- **Se não existir** (é o que a triagem encontrou no repositório, mas é uma
  informação de ambiente, não de código): a chave pode ser exigida
  imediatamente.
- **Se existir:** a chave não pode ser obrigatória de cara — precisa de um
  período de transição em que ela seja opcional, senão esse sistema externo
  passa a receber erro em toda chamada.

**Bloqueante?** Sim, para decidir se a exigência entra "imediata" ou "com
transição". Não bloqueia o resto da correção.

### Pergunta 3 — Como o sistema deve reagir a um reenvio detectado

Quando o sistema perceber que a mesma operação foi enviada de novo, ele pode:

- **Opção 409 (recomendada pela triagem, por já ser o padrão usado em outra
  parte do sistema):** avisar com uma mensagem de erro clara, "esta operação
  já foi aplicada".
- **Opção replay (aceitável, se registrada):** simplesmente devolver de
  volta o resultado da primeira tentativa, como se tivesse dado certo,
  silenciosamente.

**Bloqueante?** Não é uma decisão de negócio — é técnica, e cabe ao
engenheiro que for implementar. Está listada aqui só por transparência.

---

## CASE-002 — FIND-ERP-005 (alçada de aprovação de contratos jurídicos)

**Situação geral:** duas das quatro falhas identificadas (a rota de
aprovação aceitando nível insuficiente, e a mesma pessoa registrando as
duas aprovações de um contrato) **já estão liberadas para correção
imediata, sem esperar resposta**. As três perguntas abaixo bloqueiam
apenas partes específicas das outras duas falhas (limites de valor e
regra do aditivo).

### Pergunta 4 — De onde vem o valor que decide se um contrato precisa de aprovação de diretor?

Hoje os dois números que decidem isso (R$ 50.000 e R$ 300.000) estão fixos
dentro do código. Mas o documento que descreve como o sistema deveria
funcionar diz o contrário: que deveria existir uma tela para configurar
esses valores, com valores diferentes por tipo de contrato, e que "nenhum
valor de alçada é fixo no código" — o que hoje é falso. É preciso decidir
qual é a verdade.

- **Opção A1 — criar a tela configurável:** você passa a poder mudar esses
  valores pela tela, sem depender de atualização do sistema; pode ter valor
  diferente para contrato de fornecedor versus trabalhista; fica registro de
  qual limite valia em cada data. Custo alto (envolve banco de dados, tela
  nova, seis arquivos de código).
- **Opção A2 — manter os números fixos e corrigir o documento:** mudar o
  limite volta a exigir uma atualização do sistema; todo tipo de contrato
  usa o mesmo limite; não fica histórico de qual limite valia antes. Custo
  baixo (só o documento muda, nenhum código).

**Pergunta embutida, vale para as duas opções:** os valores R$ 50.000 e
R$ 300.000 nunca foram confirmados por um advogado/jurídico da empresa — o
próprio documento está marcado "verificar com assessor jurídico". Esses
valores estão corretos?

**Bloqueante?** Só a parte de valor de alçada (thresholds) do caso. As
demais correções (Falhas 2 e 4) seguem de qualquer forma.

### Pergunta 5 — Quem pode assinar um aditivo que aumenta o valor do contrato?

Um aditivo de contrato pode elevar o valor de um contrato já ativo. Hoje
qualquer pessoa do time jurídico (nível básico) pode assinar isso. A
correção já vai fechar o problema maior de qualquer forma: quando o valor
sobe de faixa, o contrato volta a precisar de aprovação de diretor. A
pergunta é se, **além disso**, assinar esse aditivo específico também deve
exigir nível de gestor.

- **Opção B1 — exigir nível de gestor para assinar:** só quem é gestor do
  Jurídico consegue assinar aditivo que mexe em dinheiro. Aditivo só de
  prazo continua liberado ao time normal. Mais controle, mais atrito no dia
  a dia.
- **Opção B2 — manter nível básico:** o time continua assinando aditivos
  normalmente; toda a proteção fica concentrada em "se o valor sobe, o
  contrato para de valer até aprovação de novo". Menos atrito.

**Bloqueante?** Só a parte de "quem assina" da Falha 3. A parte de
"reabrir aprovação quando o valor sobe" será corrigida de qualquer forma.

### Pergunta 6 — Quem cria o contrato pode aprová-lo?

Em agosto de 2026 você decidiu, para Compras, que quem pede a compra não
pode ser quem aprova — nem mesmo o usuário administrador é exceção a isso.
Essa regra nunca foi levada para o Jurídico. Independente da resposta, a
correção já vai impedir que **a mesma pessoa dê as duas aprovações** de um
mesmo contrato (isso não é opcional — é o próprio significado de "dupla
aprovação"). A pergunta é se a regra deve ir **um passo além**: proibir que
quem cadastrou o contrato também o aprove.

- **Opção C1 — sim, estender a regra:** coerência total com o que já vale
  em Compras. Mas hoje existe praticamente um único usuário real no sistema
  (o admin); se ele cadastra um contrato, **ninguém** conseguirá aprová-lo
  até existir uma segunda pessoa cadastrada com poder de aprovação. É o
  mesmo efeito já aceito em Compras — a solução é organizacional (cadastrar
  mais uma pessoa), não técnica.
- **Opção C2 — não estender por ora:** o Jurídico continua podendo ser
  operado por uma pessoa só no cadastro (mas ela já não vai poder dar as
  duas aprovações). Fica registrado formalmente que essa extensão foi
  avaliada e recusada, com o motivo.

**Bloqueante?** Só a parte "criador não pode aprovar" da Falha 4. A parte
"duas aprovações não podem vir da mesma pessoa" será corrigida de qualquer
forma.

---

## CASE-011 — FIND-ERP-008 (emissão de CAT — SST)

**Situação geral:** este caso está travado por completo — nenhum código será
escrito antes de D1-D4 serem respondidas.

### D1 — Qual é a fonte de verdade do tipo da CAT (comunicação de acidente)?

Hoje o tipo da CAT (inicial, óbito etc.) vem do que a tela envia, e o prazo
legal para entregá-la vem da gravidade do acidente registrada — e essas duas
informações não são comparadas entre si. Como a tela hoje sempre envia
"inicial" fixo, é possível gerar uma sequência incoerente (por exemplo, um
óbito seguido de uma CAT "inicial").

- O sistema deve **decidir o tipo da CAT sozinho**, a partir da gravidade
  já registrada do acidente?
- Ou deve **aceitar o que vier da tela, mas rejeitar** combinações que não
  façam sentido?

Consequência prática: a primeira opção muda o que a tela envia e como ela
se comporta; a segunda mantém a tela como está, mas adiciona uma trava.

### D2 — Calendário de feriados nacionais

O prazo legal da CAT hoje considera só fins de semana, ignorando feriados
nacionais — apesar do requisito do sistema exigir que feriados sejam
considerados.

- Implementar agora um calendário de feriados nacionais (exige decidir de
  onde vem essa lista e como ela é mantida atualizada)?
- Ou registrar formalmente que, por ora, o cálculo fica simplificado (sem
  feriados), alterando o requisito correspondente?

### D3 — O nome de quem emite a CAT deve ser salvo?

Hoje a tela pede e a documentação do sistema descreve como se esse dado
fosse gravado, mas na prática ele é descartado e nunca chega ao banco.

- Criar um campo próprio para guardar esse texto?
- Ou remover essa promessa da tela e da documentação (a autoria legal já é
  identificada por outro caminho, o login da pessoa)?

### D4 — Quem é o responsável por validar essa regra?

Não existe hoje uma pessoa nominalmente responsável (owner) da área de
SST/RH para confirmar se a regra de prazo e feriados está correta antes do
reteste final. É preciso nomear essa pessoa.

**Bloqueante?** Todas as quatro bloqueiam o caso inteiro — nada será
implementado até serem respondidas.

---

## CASE-012 — FIND-ERP-007 (rescisão de contrato de experiência — RH)

**Situação geral:** o caso está quase todo bloqueado. A única coisa
executável sem decisão é preparação (criar a área de trabalho e um teste que
documenta o problema atual) — nenhuma correção de fato.

### Pergunta 11 — O motivo da rescisão deve ser gravado?

Quando um contrato de experiência é rescindido, a tela pede o motivo, o
sistema aceita esse texto e o documento que descreve a API promete que ele é
salvo — mas, na prática, ele é jogado fora (só sobra numa trilha técnica de
auditoria, não no processo de demissão em si).

- **Opção (i) — criar onde guardar esse motivo:** o motivo passa a aparecer
  de fato no processo de demissão.
- **Opção (ii) — remover a promessa:** tirar o campo da tela, do contrato de
  API e do sistema; o motivo continua existindo só na trilha técnica de
  auditoria (não visível no processo).

**Bloqueante?** Bloqueia todo o "item 1" do caso (o motivo da rescisão).

### Pergunta 12 — Se for gravado: lista fixa ou texto livre?

O exemplo do contrato de API sugere um código fixo de motivo (algo como
"término de experiência"); o sistema hoje aceita qualquer texto de até 1000
caracteres; a tela oferece uma caixa de texto livre rotulada "Motivo
(opcional)". As três partes do sistema não combinam entre si.

- **Lista fixa (enum):** exige mudar a tela para uma lista de opções em vez
  de texto livre.
- **Texto livre:** a tela continua como está, o campo vira apenas um
  texto guardado.

**Bloqueante?** Só se aplica se a resposta da Pergunta 11 for "gravar".

### Pergunta 13 — Obrigatório e nos dois caminhos?

Deve ser **obrigatório** informar o motivo nesse tipo de rescisão (como já é
em contratos jurídicos, por exigência de banco de dados) ou continuar
opcional? E o outro caminho que também cria um processo de demissão (que
hoje **não** aceita esse campo) deve passar a aceitar também, para não ficar
uma situação em que só um dos dois jeitos de fazer a mesma coisa registra o
motivo?

**Bloqueante?** Só se aplica se a resposta da Pergunta 11 for "gravar".

### Pergunta 14 — Qual é a modalidade de aviso prévio nesse tipo de rescisão?

Hoje o sistema grava automaticamente "trabalhado" como modalidade de aviso
prévio ao rescindir contrato de experiência por essa tela, sem perguntar a
ninguém e sem nenhuma base documentada que diga que essa é a modalidade
correta. Nenhum documento do sistema determina qual deveria ser.

Não há opções prontas aqui — é preciso que o dono (ou o RH) diga qual é a
modalidade correta nesse cenário, e com base em quê.

**Bloqueante?** Bloqueia todo o "item 2" do caso (a modalidade de aviso
prévio).

### Pergunta 15 — O RH deve escolher a modalidade nesta tela também?

Existe outro jeito de abrir um processo de demissão no sistema em que o RH
**escolhe** a modalidade de aviso prévio manualmente. Nesta tela específica
(decisão de rescindir um contrato de experiência), isso não acontece — o
sistema decide por conta própria.

- **Escolha do RH:** a tela passa a perguntar, igual ao outro caminho.
- **Padrão fixo do sistema:** continua automático, mas com uma regra de
  negócio formalmente registrada (com responsável nomeado) em vez de um
  valor solto no código sem explicação.

**Bloqueante?** Depende da resposta da Pergunta 14 primeiro.

### Pergunta 16 (de processo, não do dono) — O item 3 entra neste caso?

O item 3 do finding (status HTTP 409 versus 422 quando já existe processo
de demissão aberto) foi devolvido pelo validador da auditoria por falta de
evidência suficiente. A triagem pergunta ao coretriad-director (não ao
dono) se esse item permanece fora do plano deste caso ou se deve ser
reagrupado em outro. Não é decisão de negócio.

---

## CASE-013 — FIND-ERP-009 (24 pontos do sistema sem segregação entre quem pede e quem aprova)

**Situação geral:** parte do caso já é executável sem decisão (registrar
"quem fez o quê" em dois lugares que hoje não guardam essa informação, e
montar a lista completa de pontos de aprovação do sistema). O que está
bloqueado é **impor a regra "quem pediu não aprova"** em qualquer um dos 24
pontos identificados.

### Pergunta 17 — Em quais dos 24 pontos a regra "quem pediu não aprova" deve valer?

Em agosto de 2026 você decidiu essa regra para Compras (incluindo que nem o
usuário administrador é exceção). Na época, quem implementou já tinha
identificado outros pontos do sistema com o mesmo problema e escreveu, por
escrito, que deixou de fora "de propósito" porque o foco era só compras —
deixando registrado que, se você quisesse a mesma regra nos outros pontos, a
ferramenta já estava pronta para isso. Essa decisão nunca foi tomada.

Hoje existem **24 pontos** no sistema (contrato de trabalho, acesso de TI,
contagem de estoque, lançamento e estorno contábil, transferência entre
depósitos, liberação e bloqueio de lote de produto, liberação de desenho de
engenharia, ativação de roteiro de produção, material e orçamento de
marketing, adjudicação de cotação de compra, uso de veículo com "passar por
cima" de restrição, plano mestre de produção, estrutura de produto (BOM),
decisões de LGPD, encerramento de processo jurídico, revogação de
procuração, atos de diretoria e liberação de documento de veículo vencido)
em que a mesma pessoa pode pedir e aprovar a mesma coisa.

**O que você precisa dizer:** para cada um desses 24 pontos, se a regra
**deve valer** ali, ou se **fica dispensada** (com o motivo). As duas
respostas resolvem o problema — só o silêncio não resolve.

**Forma de decidir, que muda bastante o custo:**
- **(a) ponto por ponto** — mais trabalho de decisão, mais preciso;
- **(b) por área** (ex.: "todo o financeiro sim, o resto não");
- **(c) por gravidade** (ex.: "só onde envolve dinheiro ou estoque");
- **(d) regra geral para todo ato de aprovação do sistema, com excêntricas
  nomeadas** — é a única opção que também resolve os 11 pontos extras
  encontrados nesta triagem (pagamento de contas, liquidação financeira,
  entre outros) que nem estavam na lista original.

**Bloqueante?** Bloqueia a aplicação da regra nos 20 pontos "de política"
(RC-1). Não bloqueia o registro de identidade em BOM/plano mestre nem o
levantamento da lista completa — isso já pode ser feito.

### Pergunta 18 — Aplicar agora ou faseado/depois do Go-Live?

Hoje, nenhum dos módulos afetados tem dado real (zero contrato, zero
contagem de estoque, zero lançamento contábil, zero estrutura de produto).
Isso significa que aplicar a regra agora **não trava nenhuma operação
real** — trava fluxos que ainda não estão em uso. Depois que o sistema
entrar em produção, cada ponto travado vira um processo real parado com
dados dentro.

- **Tudo de uma vez, agora**
- **Em ondas** (por exemplo: primeiro dinheiro e estoque, depois acesso e
  pessoas, depois engenharia e produção, depois o resto)
- **Adiar**, com uma data marcada para revisitar

**Bloqueante?** Define o momento de aplicação dos pontos decididos na
Pergunta 17.

### Pergunta 19 — Quem será o segundo aprovador em cada módulo?

A regra só funciona se existirem **duas pessoas reais** — uma que pede, uma
diferente que aprova. Hoje existe efetivamente **um único usuário real** no
sistema (o administrador); os demais são contas de teste. Sem uma segunda
pessoa cadastrada com poder de aprovar, a regra deixaria esse usuário sem
conseguir aprovar nada nos pontos em que ela entrar em vigor.

**O que você precisa dizer:** quais pessoas reais serão cadastradas como
segundo aprovador, e em quais módulos.

**Bloqueante?** Sem essa resposta, a regra fica "travada" na prática para o
único usuário real assim que for aplicada em qualquer ponto — é aceitável
hoje (nada em produção), mas precisa ser resolvido antes do sistema entrar
em uso real.

### Pergunta 20 — Existe tolerância de diferença na contagem de estoque?

Hoje, ao aprovar uma contagem de estoque, o sistema ajusta o saldo para
**qualquer** diferença encontrada — de 1 unidade a 100 mil — sem faixa de
tolerância e sem exigir aprovação de nível maior quando a diferença é
grande. Isso é um problema separado da questão de "quem aprova".

**O que você precisa dizer:** existe uma tolerância aceitável (em valor,
em percentual, ou nos dois)? Diferença acima dela deve exigir aprovação de
alguém de nível mais alto, ou só uma justificativa registrada?

**Bloqueante?** Só o controle extra de tolerância na contagem de estoque
(um dos 24 pontos). Não bloqueia o resto do caso.

### Pergunta 21 — Vale a pena travar a entrada de módulos novos sem essa checagem?

Sem um mecanismo automático de verificação, o mesmo problema deste caso vai
provavelmente se repetir no próximo módulo novo que for entregue, porque não
existe hoje nenhuma lista central nem checagem automática. Existe hoje até
um comentário no próprio código prevendo esse risco.

**O que você precisa dizer:** você aceita que a esteira de testes do
sistema passe a **bloquear** a entrega de qualquer módulo novo que crie um
ato de aprovação sem que ele conste numa lista de controle revisada?
Custo: um pouco mais de atrito em cada entrega nova. Benefício: o problema
não volta a se repetir silenciosamente.

**Bloqueante?** Só o mecanismo preventivo. Não bloqueia a correção dos 24
pontos já identificados.

---

## Como responder

A resposta formal a qualquer uma das perguntas acima precisa ser registrada
como um novo item em `coretriad/governance/APPROVALS.md`, com um ID novo no
formato `APR-2026-XXX`. Este documento **não** determina qual é o próximo
número disponível — é preciso consultar `coretriad/governance/APPROVALS.md`
para ver o último ID já usado e continuar a partir dele.

Nenhuma resposta pode ser inferida por memória, por analogia com decisões
anteriores (como D-K, de Compras) ou por silêncio — cada pergunta precisa de
um registro explícito, datado, com a decisão e (quando aplicável) o motivo,
antes que a correção correspondente possa seguir para implementação. Este
documento e os agentes de SanaCore não têm autoridade para escrever em
`coretriad/governance/`; esse registro é do dono/coretriad-director.
