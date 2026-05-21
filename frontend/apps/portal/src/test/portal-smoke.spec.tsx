import React from 'react';
import { screen } from '@testing-library/react';

import DashboardPage from '../app/(workspace)/dashboard/page';
import { renderWithProviders } from '../testing/render';

describe('portal workspace scaffold', () => {
  it('renders the dashboard shell copy', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByText(/portal app is restored with a minimal workspace shell/i),
    ).toBeInTheDocument();
  });
});
