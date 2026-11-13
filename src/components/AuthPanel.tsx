import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { AuthConfig, AuthType } from '../types';

interface AuthPanelProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: Array<{ value: AuthType; label: string }> = [
  { value: 'none', label: 'No authentication' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'basic', label: 'Basic authentication' },
  { value: 'custom', label: 'Custom authorization header' },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

const labelClass = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

export function AuthPanel({ auth, onChange }: AuthPanelProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const patch = (partial: Partial<AuthConfig>) => onChange({ ...auth, ...partial });

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <div>
        <label htmlFor="auth-type" className={labelClass}>
          Authentication type
        </label>
        <select
          id="auth-type"
          value={auth.type}
          onChange={(e) => patch({ type: e.target.value as AuthType })}
          className={inputClass}
        >
          {AUTH_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {auth.type === 'bearer' && (
        <SecretInput
          id="auth-token"
          label="Token"
          value={auth.token}
          onChange={(token) => patch({ token })}
          placeholder="eyJhbGciOiJIUzI1NiIs..."
          showSecrets={showSecrets}
          onToggleSecrets={() => setShowSecrets((v) => !v)}
        />
      )}

      {auth.type === 'basic' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="auth-username" className={labelClass}>
              Username
            </label>
            <input
              id="auth-username"
              type="text"
              value={auth.username}
              onChange={(e) => patch({ username: e.target.value })}
              placeholder="username"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <SecretInput
            id="auth-password"
            label="Password"
            value={auth.password}
            onChange={(password) => patch({ password })}
            placeholder="password"
            showSecrets={showSecrets}
            onToggleSecrets={() => setShowSecrets((v) => !v)}
          />
        </div>
      )}

      {auth.type === 'custom' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="auth-custom-name" className={labelClass}>
              Header name
            </label>
            <input
              id="auth-custom-name"
              type="text"
              value={auth.customHeaderName}
              onChange={(e) => patch({ customHeaderName: e.target.value })}
              placeholder="X-API-Key"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <SecretInput
            id="auth-custom-value"
            label="Header value"
            value={auth.customHeaderValue}
            onChange={(customHeaderValue) => patch({ customHeaderValue })}
            placeholder="header value"
            showSecrets={showSecrets}
            onToggleSecrets={() => setShowSecrets((v) => !v)}
          />
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Credentials stay in your browser. API Playground has no backend and never transmits saved
          requests, tokens or passwords to any service other than the API you choose to call. The
          automatic history redacts secrets before storing them.
        </p>
      </div>
    </div>
  );
}

interface SecretInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showSecrets: boolean;
  onToggleSecrets: () => void;
}

function SecretInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  showSecrets,
  onToggleSecrets,
}: SecretInputProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={showSecrets ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={onToggleSecrets}
          aria-label={showSecrets ? `Hide ${label}` : `Show ${label}`}
          title={showSecrets ? 'Hide value' : 'Show value'}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
