import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// CodeMirror relies on browser APIs jsdom does not fully implement.
// Replace it with a plain textarea for the smoke tests.
vi.mock('@uiw/react-codemirror', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

function fakeResponse(body: string, status = 200, statusText = 'OK') {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: status < 400,
    status,
    statusText,
    headers: new Headers({ 'content-type': 'application/json' }),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the main layout', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'API Playground' })).toBeInTheDocument();
    expect(screen.getByLabelText('Request URL')).toBeInTheDocument();
    expect(screen.getByLabelText('HTTP method')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Send/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Params/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Headers/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Body/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Authorization/ })).toBeInTheDocument();
  });

  it('validates the URL before sending', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByLabelText('Request URL'), 'not-a-url');
    await user.click(screen.getByRole('button', { name: /^Send/ }));

    expect(await screen.findByText(/Invalid URL/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a request and displays the response', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse('{"hello":"world"}'));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await user.type(screen.getByLabelText('Request URL'), 'https://api.example.com/greet');
    await user.click(screen.getByRole('button', { name: /^Send/ }));

    expect(await screen.findByText(/200 OK/)).toBeInTheDocument();
    expect(screen.getByText('"hello"')).toHaveClass('json-key');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records sent requests in the history sidebar', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse('{}')));

    render(<App />);
    await user.type(screen.getByLabelText('Request URL'), 'https://api.example.com/tracked');
    await user.click(screen.getByRole('button', { name: /^Send/ }));

    expect(await screen.findByText(/History \(1\)/)).toBeInTheDocument();
    expect(screen.getAllByText('https://api.example.com/tracked').length).toBeGreaterThan(0);
  });

  it('toggles between light and dark themes', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement).not.toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
