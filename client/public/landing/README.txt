Pasta de fotos institucionais da landing page publica (`/`).

Como trocar uma foto: basta SALVAR o arquivo aqui com o nome exato abaixo
(sobrescrevendo o que ja existir). Nao precisa mexer em nenhum codigo — o
componente `LandingImage` (`client/src/pages/landing/LandingImage.tsx`)
tenta carregar `/landing/<nome>` e, se o arquivo nao existir ou falhar ao
carregar, mostra um placeholder (gradiente + icone de onda sonora)
automaticamente.

Slots (nome exato, extensao .jpg — alguns arquivos atuais sao PNG salvos com
extensao .jpg, o que e normal, o navegador renderiza pelo conteudo real):

  logo-evok.png      — wordmark oficial (fundo transparente), usado na navbar
                        e no rodape                              6271x1660px
  hero.jpg            — fundo do topo (hero full-width)          1920x1080px (16:9)
  quem-somos.jpg      — foto ao lado do texto institucional      1200x900px (4:3) ou maior
  estrutura-1.jpg     — card "Engenharia & Acustica"              800x600px (4:3)
  estrutura-2.jpg     — card "Producao & Qualidade"                800x600px (4:3)
  estrutura-3.jpg     — card "Logistica & Distribuicao" (placeholder ate hoje) 800x600px (4:3)
  estrutura-4.jpg     — card "Gestao Integrada" (placeholder ate hoje)         800x600px (4:3)

Estado atual (2026-08-12): logo-evok.png, hero.jpg, quem-somos.jpg,
estrutura-1.jpg e estrutura-2.jpg sao fotos REAIS da empresa (extraidas do
site oficial evokaudiopro.com). estrutura-3.jpg e estrutura-4.jpg ainda nao
existem — a landing mostra o placeholder elegante (gradiente + icone SVG de
onda sonora) ate alguem salvar esses dois arquivos aqui.
