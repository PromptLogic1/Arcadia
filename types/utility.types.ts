// Generic type for function parameters
type FunctionParams<T> = T extends (...args: infer P) => unknown ? P : never

// Generic type for function return value
export type ReturnType<T extends (...args: unknown[]) => unknown> = 
  T extends (...args: unknown[]) => infer R ? R : never

// Helper type for extracting the return type of a Promise
export type PromiseType<T> = T extends Promise<infer U> ? U : T

// Helper type for making all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Helper type for extracting the parameters of a function
export type Parameters<T extends (...args: unknown[]) => unknown> = FunctionParams<T>