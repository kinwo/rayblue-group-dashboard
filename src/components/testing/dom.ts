// Test helper: browser APIs that Radix Select, cmdk and Recharts expect but jsdom lacks.
export function installDomPolyfills() {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.scrollIntoView ??= function scrollIntoView() {};
  proto.hasPointerCapture ??= () => false;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};

  if (!("ResizeObserver" in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", { configurable: true, writable: true, value: ResizeObserverStub });
  }
}

// Test helper: gives Recharts' ResponsiveContainer a size; jsdom lays nothing out.
export function installChartLayout(width = 640, height = 240) {
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}),
  });
  for (const prop of ["clientWidth", "offsetWidth"] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => width });
  }
  for (const prop of ["clientHeight", "offsetHeight"] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => height });
  }
}
