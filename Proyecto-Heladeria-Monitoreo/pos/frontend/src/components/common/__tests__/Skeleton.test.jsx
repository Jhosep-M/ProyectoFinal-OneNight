import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton from '../Skeleton.jsx';

describe('Skeleton', () => {
  it('renderiza con dimensiones', () => {
    const { container } = render(<Skeleton width="200px" height={20} />);
    const el = container.querySelector('.skeleton');
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ width: '200px', height: '20px' });
  });

  it('width por defecto 100%', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('.skeleton')).toHaveStyle({ width: '100%' });
  });
});
