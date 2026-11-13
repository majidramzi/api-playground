import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyValueEditor } from './KeyValueEditor';
import type { KeyValueParam } from '../types';
import { createEmptyParam } from '../lib/defaults';

function Harness({ initial }: { initial: KeyValueParam[] }) {
  const [rows, setRows] = useState<KeyValueParam[]>(initial);
  return (
    <KeyValueEditor
      idPrefix="test"
      rows={rows}
      onChange={setRows}
      keyPlaceholder="Key"
      valuePlaceholder="Value"
      addLabel="Add row"
    />
  );
}

describe('KeyValueEditor', () => {
  it('renders one row per value', () => {
    render(<Harness initial={[createEmptyParam('alpha', '1'), createEmptyParam('beta', '2')]} />);
    expect(screen.getByLabelText('Key of row 1')).toHaveValue('alpha');
    expect(screen.getByLabelText('Value of row 1')).toHaveValue('1');
    expect(screen.getByLabelText('Key of row 2')).toHaveValue('beta');
  });

  it('shows an empty hint when there are no rows', () => {
    render(<Harness initial={[]} />);
    expect(screen.getByText(/No rows yet/i)).toBeInTheDocument();
  });

  it('adds a new row when the add button is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyParam('alpha', '1')]} />);

    await user.click(screen.getByRole('button', { name: 'Add row' }));

    expect(screen.getByLabelText('Key of row 2')).toHaveValue('');
  });

  it('edits key and value inputs', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyParam('', '')]} />);

    await user.type(screen.getByLabelText('Key of row 1'), 'q');
    await user.type(screen.getByLabelText('Value of row 1'), 'search');

    expect(screen.getByLabelText('Key of row 1')).toHaveValue('q');
    expect(screen.getByLabelText('Value of row 1')).toHaveValue('search');
  });

  it('removes a row', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyParam('alpha', '1'), createEmptyParam('beta', '2')]} />);

    await user.click(screen.getByRole('button', { name: 'Remove row 1' }));

    expect(screen.queryByLabelText('Key of row 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Key of row 1')).toHaveValue('beta');
  });

  it('toggles the enabled checkbox', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyParam('alpha', '1')]} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Enable row 1' });
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('keeps rows independent', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[createEmptyParam('alpha', '1'), createEmptyParam('beta', '2')]} />);

    const secondKey = screen.getByLabelText('Key of row 2');
    await user.clear(secondKey);
    await user.type(secondKey, 'gamma');

    expect(screen.getByLabelText('Key of row 1')).toHaveValue('alpha');
    expect(within(secondKey).queryByText('gamma')).not.toBeInTheDocument(); // value lives in the input itself
    expect(secondKey).toHaveValue('gamma');
  });
});
