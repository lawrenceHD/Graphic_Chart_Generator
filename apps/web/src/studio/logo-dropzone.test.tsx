// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { frMessages, renderFr } from './intl-test-utils';
import { LogoDropzone } from './logo-dropzone';

const PNG = new File(
  [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
  'logo.png',
);
const PDF = new File([new TextEncoder().encode('%PDF-1.7')], 'logo.png');
const errors = frMessages.dropzone.errors;

afterEach(cleanup);

describe('LogoDropzone (AC-02.1, AC-02.3, 09 §7 keyboard alternative)', () => {
  it('offers a real button to choose the file, reachable by keyboard', async () => {
    renderFr(<LogoDropzone onAccept={vi.fn()} />);
    const button = screen.getByRole('button', { name: frMessages.dropzone.choose });
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
    expect(screen.getByText(frMessages.dropzone.hint)).toBeDefined();
  });

  it('passes a file whose bytes are a logo', async () => {
    const onAccept = vi.fn();
    renderFr(<LogoDropzone onAccept={onAccept} />);
    await userEvent.upload(screen.getByLabelText(frMessages.dropzone.choose), PNG);
    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledWith(PNG);
    });
  });

  it('refuses a file whose bytes are not a logo, whatever its name, with advice', async () => {
    const onAccept = vi.fn();
    renderFr(<LogoDropzone onAccept={onAccept} />);
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText(frMessages.dropzone.choose), PDF);
    expect((await screen.findByRole('alert')).textContent).toContain(errors.ASSET_TYPE_UNSUPPORTED);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('accepts a dropped file', async () => {
    const onAccept = vi.fn();
    renderFr(<LogoDropzone onAccept={onAccept} />);
    fireEvent.drop(screen.getByTestId('logo-dropzone'), { dataTransfer: { files: [PNG] } });
    await waitFor(() => {
      expect(onAccept).toHaveBeenCalledWith(PNG);
    });
  });

  it('shows a rejection decided by the server scan', () => {
    renderFr(<LogoDropzone onAccept={vi.fn()} rejection="ASSET_SVG_UNSUPPORTED_FEATURE" />);
    expect(screen.getByRole('alert').textContent).toContain(errors.ASSET_SVG_UNSUPPORTED_FEATURE);
  });

  it('is disabled while a file is being sent', () => {
    renderFr(<LogoDropzone onAccept={vi.fn()} disabled />);
    expect(
      screen.getByRole('button', { name: frMessages.dropzone.choose }).hasAttribute('disabled'),
    ).toBe(true);
  });
});
