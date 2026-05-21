import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { render as testingLibraryRender } from '@testing-library/react';

const mountedContainers = new Set<HTMLElement>();

export interface RenderResult {
  container: HTMLDivElement;
  rerender: (ui: ReactElement) => Promise<void>;
  unmount: () => Promise<void>;
}

export async function render(ui: ReactElement): Promise<RenderResult> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  mountedContainers.add(container);

  const root = createRoot(container);
  await renderWithRoot(root, ui);

  return {
    container,
    rerender: (nextUi) => renderWithRoot(root, nextUi),
    unmount: () => unmountRoot(root, container),
  };
}

export function renderWithProviders(ui: ReactElement) {
  return testingLibraryRender(ui);
}

async function renderWithRoot(root: Root, ui: ReactElement): Promise<void> {
  await act(async () => {
    root.render(ui);
    await Promise.resolve();
  });
}

async function unmountRoot(root: Root, container: HTMLElement): Promise<void> {
  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  mountedContainers.delete(container);
  container.remove();
}

export async function cleanupMountedContainers(): Promise<void> {
  for (const container of Array.from(mountedContainers)) {
    container.remove();
    mountedContainers.delete(container);
  }
}

export async function changeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): Promise<void> {
  await act(async () => {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    valueSetter?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

export async function clickElement(element: HTMLElement): Promise<void> {
  await act(async () => {
    if (element instanceof HTMLButtonElement && element.type === 'submit') {
      element.form?.requestSubmit();
      await Promise.resolve();
      return;
    }

    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
  });
}

export async function waitFor(
  assertion: () => void,
  timeoutMs: number = 1000,
): Promise<void> {
  const start = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - start < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  throw lastError ?? new Error('waitFor timed out');
}

export function getByText(container: HTMLElement, text: string): HTMLElement {
  const match = findTextMatch(container, text);

  if (!match) {
    throw new Error(`Unable to find text: ${text}`);
  }

  return match;
}

export function queryByText(
  container: HTMLElement,
  text: string,
): HTMLElement | null {
  return findTextMatch(container, text);
}

export function getByLabelText(
  container: HTMLElement,
  labelText: string,
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const label = Array.from(container.querySelectorAll('label')).find((candidate) =>
    candidate.textContent?.includes(labelText),
  );

  if (!label) {
    throw new Error(`Unable to find label: ${labelText}`);
  }

  const controlId = label.getAttribute('for');

  if (controlId) {
    const escapedControlId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(controlId)
        : controlId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');

    const control = container.querySelector<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >(`#${escapedControlId}`);

    if (control) {
      return control;
    }
  }

  const nestedControl = label.querySelector<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >('input, textarea, select');

  if (!nestedControl) {
    throw new Error(`Unable to find control for label: ${labelText}`);
  }

  return nestedControl;
}

function findTextMatch(container: HTMLElement, text: string): HTMLElement | null {
  return (
    Array.from(container.querySelectorAll<HTMLElement>('*')).find((element) => {
      if (!element.textContent?.includes(text)) {
        return false;
      }

      return !Array.from(element.children).some((child) =>
        child.textContent?.includes(text),
      );
    }) ?? null
  );
}
