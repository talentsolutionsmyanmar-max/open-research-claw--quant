/**
 * Application-root smoke test: the served app boots into the read-only
 * Status Dashboard and is visibly labeled as a non-live demo, with no
 * execution plan labels in the rendered output. Detailed behaviour is
 * covered in src/status/StatusDashboard.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('served app boots into the read-only DEMO status dashboard', () => {
  const { container } = render(<App />);
  expect(screen.getByText(/DEMO SNAPSHOT — NOT LIVE/i)).toBeInTheDocument();
  // No execution plan labels may be present in the wired app surface.
  expect(container.textContent).not.toMatch(
    /stop\s*loss|take\s*profit|\bTP\d?\b|\bSL\b|leverage|position\s*size|R\s*[:/]\s*R|\bBUY\b|\bSELL\b/i
  );
});
