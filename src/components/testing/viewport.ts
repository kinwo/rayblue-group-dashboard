// Test helper: jsdom has no matchMedia. Emulates a viewport width for the shell's
// mobile check (`(width < Nrem)` and `max-width: Npx` queries) at the default
// 16px root font size. Changing the width notifies subscribed queries.
const ROOT_FONT_SIZE_PX = 16;

let viewportWidth = 1024;
const listeners = new Set<() => void>();

function evaluate(query: string): boolean {
  const below = /width\s*<\s*([\d.]+)rem/.exec(query);
  if (below) return viewportWidth < Number(below[1]) * ROOT_FONT_SIZE_PX;
  const max = /max-width:\s*(\d+)px/.exec(query);
  return max ? viewportWidth <= Number(max[1]) : false;
}

export function setViewportWidth(width: number) {
  viewportWidth = width;
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return evaluate(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
      addListener: (listener: () => void) => listeners.add(listener),
      removeListener: (listener: () => void) => listeners.delete(listener),
      dispatchEvent: () => false,
    }),
  });
  for (const listener of listeners) listener();
}
