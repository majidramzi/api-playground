import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseViewer } from './ResponseViewer';
import { RequestError, type ResponseResult } from '../lib/http';

function makeResponse(overrides: Partial<ResponseResult> = {}): ResponseResult {
  const bodyText = overrides.bodyText ?? '{"id": 1, "active": true}';
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: [
      ['content-type', 'application/json'],
      ['x-trace-id', 'abc-123'],
    ],
    bodyText,
    bodyBytes: new TextEncoder().encode(bodyText),
    sizeBytes: new TextEncoder().encode(bodyText).byteLength,
    contentType: 'application/json',
    durationMs: 42,
    ...overrides,
  };
}

const baseProps = {
  sending: false,
  requestUrl: 'https://api.example.com/data',
  onNotify: vi.fn(),
};

describe('ResponseViewer', () => {
  it('shows an empty state before any request is sent', () => {
    render(<ResponseViewer {...baseProps} response={null} error={null} />);
    expect(screen.getByText(/Send a request to see the response/i)).toBeInTheDocument();
  });

  it('shows a loading state while sending', () => {
    render(<ResponseViewer {...baseProps} response={null} error={null} sending={true} />);
    expect(screen.getByText(/Sending request/i)).toBeInTheDocument();
  });

  it('displays status code, status text, time and size', () => {
    render(<ResponseViewer {...baseProps} response={makeResponse()} error={null} />);

    expect(screen.getByText(/200 OK/)).toBeInTheDocument();
    expect(screen.getByText('42 ms')).toBeInTheDocument();
    expect(screen.getByText('25 B')).toBeInTheDocument();
  });

  it('renders pretty-printed JSON with syntax highlighting tokens', () => {
    render(<ResponseViewer {...baseProps} response={makeResponse()} error={null} />);

    expect(screen.getByText('"id"')).toHaveClass('json-key');
    expect(screen.getByText('"active"')).toHaveClass('json-key');
    expect(screen.getByText('true')).toHaveClass('json-boolean');
  });

  it('shows raw text in the raw view', async () => {
    const user = userEvent.setup();
    render(<ResponseViewer {...baseProps} response={makeResponse()} error={null} />);

    await user.click(screen.getByRole('button', { name: 'Raw' }));
    expect(screen.getByText('{"id": 1, "active": true}')).toBeInTheDocument();
  });

  it('switches to the headers view and lists response headers', async () => {
    const user = userEvent.setup();
    render(<ResponseViewer {...baseProps} response={makeResponse()} error={null} />);

    await user.click(screen.getByRole('button', { name: /Headers \(2\)/ }));
    expect(screen.getByText('x-trace-id')).toBeInTheDocument();
    expect(screen.getByText('abc-123')).toBeInTheDocument();
  });

  it('notes when the body is not valid JSON', () => {
    render(
      <ResponseViewer
        {...baseProps}
        response={makeResponse({ bodyText: 'plain text', contentType: 'text/plain' })}
        error={null}
      />,
    );
    expect(screen.getByText(/not valid JSON/i)).toBeInTheDocument();
    expect(screen.getByText('plain text')).toBeInTheDocument();
  });

  it('shows CORS guidance for network errors', () => {
    render(
      <ResponseViewer
        {...baseProps}
        response={null}
        error={new RequestError('network', 'Network error or CORS restriction.')}
      />,
    );
    expect(screen.getByText(/Network or CORS error/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Access-Control-Allow-Origin/).length).toBeGreaterThan(0);
    expect(screen.getByText(/No proxy is used/)).toBeInTheDocument();
  });

  it('shows a message for cancelled requests', () => {
    render(
      <ResponseViewer
        {...baseProps}
        response={null}
        error={new RequestError('aborted', 'The request was cancelled.')}
      />,
    );
    expect(screen.getByText(/Request cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/was cancelled/i)).toBeInTheDocument();
  });

  it('renders a sanitized HTML preview in a sandboxed iframe', async () => {
    const user = userEvent.setup();
    render(
      <ResponseViewer
        {...baseProps}
        response={makeResponse({
          bodyText: '<h1>Hi</h1><script>alert(1)</script>',
          contentType: 'text/html',
        })}
        error={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Preview' }));

    const iframe = screen.getByTitle('Sanitized response preview');
    expect(iframe).toHaveAttribute('sandbox', '');
    expect(iframe.getAttribute('srcdoc')).toContain('<h1>Hi</h1>');
    expect(iframe.getAttribute('srcdoc')).not.toContain('script');
    expect(screen.getByText(/Sanitized preview/i)).toBeInTheDocument();
  });
});
