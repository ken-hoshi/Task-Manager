import '@testing-library/jest-dom';

// Radix の Select などが使うが、jsdom には無いブラウザの機能を補う
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || function () {};
  window.HTMLElement.prototype.hasPointerCapture = window.HTMLElement.prototype.hasPointerCapture || function () { return false; };
  window.HTMLElement.prototype.releasePointerCapture = window.HTMLElement.prototype.releasePointerCapture || function () {};
}
