import { describe, expect, it, vi } from 'vitest';

const mockMermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(async () => ({ svg: '<svg viewBox="0 0 1 1"></svg>' })),
}));

vi.mock('mermaid', () => ({
  default: mockMermaid,
}));

describe('renderMermaid', () => {
  it('disables HTML labels for flowcharts', async () => {
    const { renderMermaid } = await import('./mermaid');
    await renderMermaid('graph TD\nA["ok"] --> B["done"]', 'light');

    expect(mockMermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        htmlLabels: false,
        flowchart: { htmlLabels: false },
      }),
    );
  });
});
