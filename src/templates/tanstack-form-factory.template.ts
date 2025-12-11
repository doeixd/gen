import { ts } from '../tags'

export function generateTanStackFormFactory(): string {
  return ts`
import React from 'react'
import { createFormHook, createFormHookContexts } from '@tanstack/react-form'
import { TextField, NumberField, TextArea, Checkbox, Select, SubmitButton } from './form-components'

export const { fieldContext, formContext } = createFormHookContexts()

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    TextArea,
    Checkbox,
    Select,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
`
}
