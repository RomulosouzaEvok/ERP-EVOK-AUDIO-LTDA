import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import LandingPage from './LandingPage';

/**
 * Landing institucional pública (`/`) — cobre o essencial: a headline do
 * primeiro slide do hero renderiza, o CTA leva para `/login` (fluxo real de
 * entrada no sistema, ver `App.tsx`), e o carrossel troca de slide ao
 * clicar num indicador.
 */
describe('LandingPage', () => {
  it('renderiza a headline do primeiro slide do hero', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /som profissional nasce de engenharia de verdade/i }),
    ).toBeInTheDocument();
  });

  it('o botão "Acessar o sistema" leva para /login', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link', { name: /acessar o sistema/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('mostra os 3 indicadores do carrossel do hero e troca de slide ao clicar', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );

    const indicators = screen.getAllByRole('button', { name: /ir para o slide/i });
    expect(indicators).toHaveLength(3);

    await user.click(indicators[2]);

    expect(await screen.findByRole('heading', { level: 1, name: /uma indústria organizada de ponta a ponta/i })).toBeInTheDocument();
  });
});
