import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'json' | 'text';
  dark?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  height?: string;
}

/**
 * Lightweight JSON/text editor backed by CodeMirror 6.
 * Purely an input surface - content is never evaluated.
 */
export function CodeEditor({
  value,
  onChange,
  language = 'text',
  dark = false,
  readOnly = false,
  placeholder,
  height = '200px',
}: CodeEditorProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
      <CodeMirror
        value={value}
        onChange={onChange}
        height={height}
        readOnly={readOnly}
        placeholder={placeholder}
        theme={dark ? 'dark' : 'light'}
        extensions={language === 'json' ? [json()] : []}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
