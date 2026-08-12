import * as React from 'react';
import { Link } from 'react-router';
import { Factory, ShieldCheck, Truck, Workflow, Waves, Volume2, Radar, ChevronDown } from 'lucide-react';

import { LandingImage, type LandingImageSlot } from './LandingImage';

// Arquivos em `client/public/` são servidos como estão, na raiz — não devem
// ser importados pelo bundler (Vite trata `public/` fora do grafo de
// módulos), por isso o caminho é uma string absoluta, não um import.
const LOGO_EVOK_SRC = '/landing/logo-evok.png';

/**
 * Landing institucional pública da EVOK ÁUDIO — rota `/`, exibida ANTES do
 * login (`docs/governance/HANDOFF_CODEX.md`, entrada 2026-08-12; ajuste de
 * navbar transparente + hero em carrossel na mesma data, a partir de
 * referência visual circulada pelo dono sobre o modelo totvs.com — só a
 * ESTRUTURA, nenhum conteúdo/marca/logo da TOTVS foi copiado).
 *
 * Identidade visual real da EVOK ÁUDIO (extraída de evokaudiopro.com):
 * fundo branco dominante, preto/tinta `#16202F` em navbar/rodapé/cards
 * escuros, verde `#27A93A` (hover `#1B7A29`) como cor de ação/acento.
 *
 * FOTOS TROCÁVEIS (`client/public/landing/`, ver README.txt na pasta):
 *   logo-evok.png    — wordmark oficial (navbar + rodapé)
 *   hero.jpg         — slide 1 do carrossel do hero
 *   quem-somos.jpg   — slide 3 do carrossel + foto da seção "Quem somos"
 *   estrutura-1.jpg  — slide 2 do carrossel + card "Engenharia & Acústica"
 *   estrutura-2.jpg  — card "Produção & Qualidade"
 *   estrutura-3.jpg  — card "Logística & Distribuição" (ainda placeholder)
 *   estrutura-4.jpg  — card "Gestão Integrada" (ainda placeholder)
 * Trocar uma foto é só salvar o arquivo com esse nome — zero código.
 */
export default function LandingPage() {
  return (
    <div className="min-h-svh bg-[#EDF1F6] text-[#16202F]">
      <Navbar />
      <Hero />
      <QuemSomos />
      <NossaEstrutura />
      <FaixaDestaque />
      <CtaFechamento />
      <Footer />
    </div>
  );
}

const ANCHORS = [
  { href: '#quem-somos', label: 'Quem somos' },
  { href: '#estrutura', label: 'Nossa estrutura' },
  { href: '#qualidade', label: 'Qualidade' },
  { href: '#contato', label: 'Contato' },
];

/**
 * Navbar flutuante e transparente sobre o hero — ganha fundo sólido
 * (`#16202F`, com leve blur) assim que a página rola além do próprio hero,
 * para manter legibilidade sobre seções de fundo claro. `position: fixed`
 * de propósito (não `sticky`): precisa sair do fluxo do documento para
 * sobrepor a foto do hero sem empurrar o conteúdo para baixo.
 */
function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#16202F]/95 shadow-md backdrop-blur-sm'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#topo" className="flex shrink-0 items-center gap-2" aria-label="EVOK ÁUDIO — página inicial">
          <img src={LOGO_EVOK_SRC} alt="EVOK ÁUDIO" className="h-8 w-auto drop-shadow-sm sm:h-9" />
        </a>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Navegação institucional">
          {ANCHORS.map((anchor) => (
            <a
              key={anchor.href}
              href={anchor.href}
              className="text-sm font-medium text-white/85 drop-shadow-sm transition-colors hover:text-white"
            >
              {anchor.label}
            </a>
          ))}
        </nav>

        <Link
          to="/login"
          className="shrink-0 rounded-full bg-[#27A93A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1B7A29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27A93A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16202F]"
        >
          Acessar o sistema
        </Link>
      </div>
    </header>
  );
}

interface HeroSlide {
  image: LandingImageSlot;
  alt: string;
  eyebrow: string;
  headline: string;
  subtitle: string;
  ctaLabel: string;
  /** Rota interna (começa com `/`, vira `<Link>`) ou âncora da própria página (começa com `#`, vira `<a>`). */
  ctaTo: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    image: 'hero.jpg',
    alt: 'Fábrica EVOK ÁUDIO',
    eyebrow: 'Fabricação própria · Engenharia acústica',
    headline: 'Som profissional nasce de engenharia de verdade',
    subtitle:
      'Onde você compra som profissional direto da fonte. Projetamos e fabricamos alto-falantes e subwoofers para áudio automotivo e profissional, com controle de qualidade por lote em cada etapa.',
    ctaLabel: 'Acessar o sistema',
    ctaTo: '/login',
  },
  {
    image: 'estrutura-1.jpg',
    alt: 'Engenharia acústica EVOK ÁUDIO',
    eyebrow: 'Produtos',
    headline: 'Alto-falantes e subwoofers com engenharia própria',
    subtitle:
      'Cada produto nasce de parâmetros acústicos próprios, validados em bancada antes de qualquer lote entrar em produção.',
    ctaLabel: 'Conheça a EVOK',
    ctaTo: '#quem-somos',
  },
  {
    image: 'quem-somos.jpg',
    alt: 'Equipe e fábrica EVOK ÁUDIO',
    eyebrow: 'Quem somos',
    headline: 'Uma indústria organizada de ponta a ponta',
    subtitle:
      'Engenharia, produção, qualidade e logística operam sobre a mesma base de informação — do insumo ao produto acabado.',
    ctaLabel: 'Nossa estrutura',
    ctaTo: '#estrutura',
  },
];

const HERO_AUTOPLAY_MS = 7000;

/**
 * Hero em carrossel (3 slides, auto-avanço a cada 7s, pausa no hover),
 * implementação própria com `useState`/`useEffect` — sem biblioteca nova.
 * Termina numa onda curva branca (SVG inline) com seta para a próxima
 * seção, igual à referência visual do dono.
 */
function Hero() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = HERO_SLIDES[index];

  function scrollToQuemSomos() {
    document.getElementById('quem-somos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section
      id="topo"
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <LandingImage key={slide.image} slot={slide.image} alt={slide.alt} className="absolute inset-0 size-full object-cover" loading="eager" />
      {/* Gradiente escuro: legibilidade do texto/logo/navbar sobre a foto, mais forte no topo (onde a navbar flutua) e na base (onde a onda entra). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(22,32,47,0.85) 0%, rgba(22,32,47,0.55) 30%, rgba(22,32,47,0.62) 65%, rgba(22,32,47,0.92) 100%)',
        }}
      />

      <div
        key={index}
        className="relative mx-auto flex min-h-[600px] max-w-6xl flex-col items-start justify-center gap-5 px-4 pb-24 pt-32 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:px-6"
      >
        <p className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
          {slide.eyebrow}
        </p>
        <h1 className="max-w-2xl text-4xl font-bold uppercase leading-tight text-white sm:text-5xl">{slide.headline}</h1>
        <p className="max-w-xl text-base text-white/85 sm:text-lg">{slide.subtitle}</p>
        <HeroCta slide={slide} />
      </div>

      {/* Indicadores do carrossel */}
      <div className="absolute inset-x-0 bottom-20 z-10 flex items-center justify-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.image}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ir para o slide ${i + 1}`}
            aria-current={i === index}
            className={`size-2.5 rounded-full border border-white/80 transition-all duration-200 ${
              i === index ? 'w-6 bg-white' : 'bg-transparent hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Onda curva branca + seta: transição para a seção seguinte (fundo branco). */}
      <div className="absolute inset-x-0 bottom-0 z-0 text-white">
        <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className="h-16 w-full sm:h-24" aria-hidden>
          <path
            fill="currentColor"
            d="M0,64 C240,110 480,20 720,40 C960,60 1200,110 1440,56 L1440,120 L0,120 Z"
          />
        </svg>
        <button
          type="button"
          onClick={scrollToQuemSomos}
          aria-label="Rolar até a seção Quem somos"
          className="absolute inset-x-0 bottom-3 mx-auto flex size-9 items-center justify-center rounded-full bg-[#16202F]/70 text-white shadow-md transition-colors hover:bg-[#27A93A] motion-safe:animate-bounce"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
    </section>
  );
}

function HeroCta({ slide }: { slide: HeroSlide }) {
  const pillClass =
    'mt-2 inline-block rounded-full bg-[#27A93A] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-black/20 transition-colors hover:bg-[#1B7A29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27A93A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16202F]';

  if (slide.ctaTo.startsWith('#')) {
    return (
      <a href={slide.ctaTo} className={pillClass}>
        {slide.ctaLabel}
      </a>
    );
  }

  return (
    <Link to={slide.ctaTo} className={pillClass}>
      {slide.ctaLabel}
    </Link>
  );
}

function QuemSomos() {
  return (
    <section id="quem-somos" className="scroll-mt-20 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1B7A29]">Quem somos</p>
          <h2 className="text-3xl font-bold text-[#16202F] sm:text-4xl">
            Indústria brasileira dedicada a alto-falantes e subwoofers
          </h2>
          <p className="text-base leading-relaxed text-[#16202F]/75">
            A EVOK ÁUDIO é uma indústria brasileira de alto-falantes e subwoofers para áudio automotivo e
            profissional. Reunimos engenharia acústica, produção própria e controle de qualidade em um mesmo
            processo — da matéria-prima ao produto final, cada lote é testado antes de sair da fábrica.
          </p>
          <p className="text-base leading-relaxed text-[#16202F]/75">
            Nossa gestão é integrada: engenharia, produção, qualidade e logística operam sobre a mesma base de
            informação, o que garante rastreabilidade completa de cada produto que fabricamos.
          </p>
        </div>
        <LandingImage
          slot="quem-somos.jpg"
          alt="Equipe e fábrica EVOK ÁUDIO"
          className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
        />
      </div>
    </section>
  );
}

const ESTRUTURA_CARDS: Array<{
  slot: 'estrutura-1.jpg' | 'estrutura-2.jpg' | 'estrutura-3.jpg' | 'estrutura-4.jpg';
  icon: typeof Waves;
  title: string;
  description: string;
}> = [
  {
    slot: 'estrutura-1.jpg',
    icon: Waves,
    title: 'Engenharia & Acústica',
    description:
      'Desenvolvimento de alto-falantes e subwoofers com parâmetros Thiele-Small próprios, validados em bancada antes de entrar em produção.',
  },
  {
    slot: 'estrutura-2.jpg',
    icon: ShieldCheck,
    title: 'Produção & Qualidade',
    description:
      'Fabricação própria em larga escala, com inspeção e teste acústico em cada lote — rastreabilidade do insumo ao produto acabado.',
  },
  {
    slot: 'estrutura-3.jpg',
    icon: Truck,
    title: 'Logística & Distribuição',
    description:
      'Armazenagem, expedição e distribuição planejadas para atender revendedores e distribuidores em todo o país.',
  },
  {
    slot: 'estrutura-4.jpg',
    icon: Workflow,
    title: 'Gestão Integrada',
    description:
      'Um único sistema conecta engenharia, compras, produção, qualidade e expedição — sem retrabalho, sem informação perdida entre setores.',
  },
];

function NossaEstrutura() {
  return (
    <section id="estrutura" className="scroll-mt-20 bg-[#EDF1F6]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-10 flex flex-col gap-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#1B7A29]">Nossa estrutura</p>
          <h2 className="text-3xl font-bold text-[#16202F] sm:text-4xl">Uma indústria organizada de ponta a ponta</h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ESTRUTURA_CARDS.map((card) => (
            <article
              key={card.slot}
              className="flex flex-col overflow-hidden rounded-xl bg-[#16202F] text-white shadow-lg"
            >
              <LandingImage slot={card.slot} alt={card.title} className="h-36 w-full object-cover" />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <card.icon className="size-6 text-[#27A93A]" />
                <h3 className="text-base font-semibold">{card.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const DESTAQUES = [
  { icon: Factory, text: 'Fabricação 100% própria' },
  { icon: Volume2, text: 'Testes acústicos em cada lote' },
  { icon: Radar, text: 'Gestão integrada da matéria-prima à expedição' },
];

function FaixaDestaque() {
  return (
    <section id="qualidade" className="bg-[#27A93A]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {DESTAQUES.map((item) => (
          <div key={item.text} className="flex items-center gap-3 text-white">
            <item.icon className="size-8 shrink-0" />
            <p className="text-base font-semibold leading-snug">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaFechamento() {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6 md:py-20">
        <h2 className="text-2xl font-bold text-[#16202F] sm:text-3xl">Pronto para se tornar um Evok?</h2>
        <p className="max-w-xl text-base text-[#16202F]/70">
          Acesse o sistema de gestão da EVOK ÁUDIO para acompanhar produção, qualidade, estoque e muito mais.
        </p>
        <Link
          to="/login"
          className="rounded-md bg-[#27A93A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1B7A29] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27A93A] focus-visible:ring-offset-2"
        >
          Acessar o sistema
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="contato" className="border-t border-white/10 bg-[#16202F] text-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <img src={LOGO_EVOK_SRC} alt="EVOK ÁUDIO" className="h-6 w-auto opacity-90" />
          <p className="max-w-sm text-sm leading-relaxed">
            EVOK ÁUDIO INDÚSTRIA E COMÉRCIO, IMPORTAÇÃO E EXPORTAÇÃO LTDA
            <br />
            CNPJ [CNPJ]
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-white">Contato</p>
          <p>[contato]</p>
          <Link to="/login" className="text-white/50 underline decoration-white/30 underline-offset-4 hover:text-white">
            Acesso restrito
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/40 sm:px-6">
        © {year} EVOK ÁUDIO. Todos os direitos reservados.
      </div>
    </footer>
  );
}
