import type { ChangeEvent, FormEvent, MouseEvent } from 'react'

// Common event handler types
export type InputChangeEvent = ChangeEvent<HTMLInputElement>
export type TextAreaChangeEvent = ChangeEvent<HTMLTextAreaElement>
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>
export type FormSubmitEvent = FormEvent<HTMLFormElement>
export type ButtonClickEvent = MouseEvent<HTMLButtonElement>
export type DivClickEvent = MouseEvent<HTMLDivElement>

// Common handler function types
export type InputChangeHandler = (event: InputChangeEvent) => void
export type TextAreaChangeHandler = (event: TextAreaChangeEvent) => void
export type SelectChangeHandler = (event: SelectChangeEvent) => void
export type FormSubmitHandler = (event: FormSubmitEvent) => void
export type ButtonClickHandler = (event: ButtonClickEvent) => void
export type DivClickHandler = (event: DivClickEvent) => void 