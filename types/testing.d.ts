/// <reference types="@testing-library/jest-dom" />

import { type expect } from '@jest/globals';

// Import the actual jest-dom matcher types
declare module '@jest/expect' {
  interface Matchers<R extends void | Promise<void>> {
    // Core DOM matchers
    toBeInTheDocument(): R;
    toHaveAttribute(attr: string, value?: string | RegExp | boolean): R;
    toHaveClass(...classNames: string[]): R;
    toHaveFocus(): R;
    toHaveTextContent(text: string | RegExp): R;
    toHaveValue(value: string | string[] | number): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBeRequired(): R;
    toHaveAccessibleName(name?: string | RegExp): R;
    toHaveAccessibleDescription(description?: string | RegExp): R;
    toHaveStyle(css: object | string): R;
    toBeChecked(): R;
    toBePartiallyChecked(): R;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    toHaveFormValues(expectedValues: Record<string, any>): R;
    toBeInvalid(): R;
    toBeValid(): R;
    toHaveErrorMessage(text?: string | RegExp): R;
    // jest-axe matcher
    toHaveNoViolations(): R;
  }
}

// Export empty to ensure this is treated as a module
export {};
