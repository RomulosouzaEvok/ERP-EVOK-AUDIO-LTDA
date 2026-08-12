import * as React from 'react';

/**
 * Imagem trocável por arquivo, sem código, para a landing institucional.
 *
 * Tenta carregar `/landing/<slot>` (pasta `client/public/landing/`, servida
 * estática pelo Vite). Se o arquivo não existir ou falhar ao carregar,
 * renderiza um placeholder elegante (gradiente escuro + ícone de onda
 * sonora em SVG inline) — nunca um `<img>` quebrado.
 *
 * Trocar uma foto real é só salvar o arquivo com o nome do slot em
 * `client/public/landing/` (ver README.txt na pasta) — zero código.
 */
export type LandingImageSlot =
  | 'hero.jpg'
  | 'quem-somos.jpg'
  | 'estrutura-1.jpg'
  | 'estrutura-2.jpg'
  | 'estrutura-3.jpg'
  | 'estrutura-4.jpg';

interface LandingImageProps {
  slot: LandingImageSlot;
  alt: string;
  className?: string;
  /** `eager` só para a foto do hero (acima da dobra); as demais usam lazy loading (fotos reais pesam 1–4 MB). */
  loading?: 'eager' | 'lazy';
}

export function LandingImage({ slot, alt, className, loading = 'lazy' }: LandingImageProps) {
  const [failed, setFailed] = React.useState(false);
  const src = `/landing/${slot}`;

  if (failed) {
    return <LandingImagePlaceholder className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function LandingImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        background: 'linear-gradient(135deg, #16202F 0%, #223349 55%, #1B7A29 140%)',
      }}
    >
      <div className="flex size-full items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className="size-14 opacity-70"
          fill="none"
          stroke="#EDF1F6"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          {/* Cone de alto-falante estilizado + ondas sonoras */}
          <circle cx="24" cy="32" r="14" />
          <circle cx="24" cy="32" r="6" />
          <path d="M40 20 Q46 32 40 44" />
          <path d="M47 14 Q56 32 47 50" />
        </svg>
      </div>
    </div>
  );
}

export default LandingImage;
