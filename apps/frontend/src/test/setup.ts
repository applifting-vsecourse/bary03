import "@testing-library/jest-dom/vitest"

// jsdom lacks the pointer-capture and scroll APIs Radix primitives (Select,
// DropdownMenu) call when they open. Stub them so those components can be
// driven with userEvent in tests.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
})
