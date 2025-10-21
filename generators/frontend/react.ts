/**
 * React Frontend Generator
 * Generates React components, forms, tables, and routes
 */

import type { Entity } from '../../src/entity'
import type { GeneratedFrontendCode } from '../../src/generator-interfaces'

/**
 * React Frontend Generator
 */
export class ReactFrontendGenerator {
  /**
   * Generate React frontend code for an entity
   */
  static generate<T>(entity: Entity<T>, options: {
    includeComponents?: boolean
    includeForms?: boolean
    styling?: 'css' | 'styled-components' | 'tailwind' | 'none'
    componentLibrary?: string
  } = {}): GeneratedFrontendCode {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    const routes: Record<string, string> = {
      list: this.generateListComponent(entity, options),
      detail: this.generateDetailComponent(entity, options),
      create: this.generateCreateComponent(entity, options),
      edit: this.generateEditComponent(entity, options),
    }

    const forms: Record<string, string> = {
      create: options.includeForms ? this.generateCreateForm(entity, options) : '// TODO: Generate create form',
      edit: options.includeForms ? this.generateEditForm(entity, options) : '// TODO: Generate edit form',
    }

    const tables = options.includeComponents ? this.generateTableComponent(entity, options) : '// TODO: Generate table component'

    return { routes, forms, tables, components: {} }
  }

  /**
   * Generate React list component
   */
  private static generateListComponent<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    return `// List${pluralName} component
export function List${pluralName}() {
  // TODO: Implement list view with ${pluralName} data
  return (
    <div>
      <h1>{pluralName}</h1>
      {/* TODO: Add table/list component */}
    </div>
  )
}`.trim()
  }

  /**
   * Generate React detail component
   */
  private static generateDetailComponent<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular

    return `// ${entityName}Detail component
export function ${entityName}Detail({ id }: { id: string }) {
  // TODO: Implement detail view for ${entityName}
  return (
    <div>
      <h1>${entityName} Detail</h1>
      {/* TODO: Display ${entityName} data */}
    </div>
  )
}`.trim()
  }

  /**
   * Generate React create component
   */
  private static generateCreateComponent<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular

    return `// Create${entityName} component
export function Create${entityName}() {
  // TODO: Implement create form for ${entityName}
  return (
    <div>
      <h1>Create ${entityName}</h1>
      {/* TODO: Add form component */}
    </div>
  )
}`.trim()
  }

  /**
   * Generate React edit component
   */
  private static generateEditComponent<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular

    return `// Edit${entityName} component
export function Edit${entityName}({ id }: { id: string }) {
  // TODO: Implement edit form for ${entityName}
  return (
    <div>
      <h1>Edit ${entityName}</h1>
      {/* TODO: Add form component */}
    </div>
  )
}`.trim()
  }

  /**
   * Generate React create form
   */
  private static generateCreateForm<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular

    // Generate form fields based on entity fields
    const formFields = Object.entries(entity.fields)
      .filter(([_, field]) => !['id', 'createdAt', 'updatedAt'].includes(_))
      .map(([fieldName, field]) => {
        const fieldConfig = field as any
        const componentType = this.mapFieldToComponent(fieldName, fieldConfig)
        return `        <${componentType}
          name="${fieldName}"
          label="${fieldName}"
          required={!${fieldConfig.optional}}
        />`
      }).join('\n')

    return `import { useForm } from 'react-hook-form'
import { ${entityName}CreateInput } from '../types/${entity.name.plural}.types'

export function Create${entityName}Form() {
  const { register, handleSubmit, formState: { errors } } = useForm<${entityName}CreateInput>()

  const onSubmit = (data: ${entityName}CreateInput) => {
    // TODO: Implement create logic
    console.log('Creating ${entityName}:', data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      ${formFields}
      <button type="submit">Create ${entityName}</button>
    </form>
  )
}`
  }

  /**
   * Generate React edit form
   */
  private static generateEditForm<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular

    // Generate form fields based on entity fields
    const formFields = Object.entries(entity.fields)
      .filter(([_, field]) => !['id', 'createdAt', 'updatedAt'].includes(_))
      .map(([fieldName, field]) => {
        const fieldConfig = field as any
        const componentType = this.mapFieldToComponent(fieldName, fieldConfig)
        return `        <${componentType}
          name="${fieldName}"
          label="${fieldName}"
          required={!${fieldConfig.optional}}
        />`
      }).join('\n')

    return `import { useForm } from 'react-hook-form'
import { ${entityName}UpdateInput } from '../types/${entity.name.plural}.types'

export function Edit${entityName}Form({ id }: { id: string }) {
  const { register, handleSubmit, formState: { errors } } = useForm<${entityName}UpdateInput>()

  const onSubmit = (data: ${entityName}UpdateInput) => {
    // TODO: Implement update logic
    console.log('Updating ${entityName}:', data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      ${formFields}
      <button type="submit">Update ${entityName}</button>
    </form>
  )
}`
  }

  /**
   * Generate React table component
   */
  private static generateTableComponent<T>(entity: Entity<T>, options: any): string {
    const entityName = entity.name.singular
    const pluralName = entity.name.plural

    // Generate table columns based on entity fields
    const tableColumns = Object.entries(entity.fields)
      .filter(([_, field]) => !['id', 'createdAt', 'updatedAt'].includes(_))
      .map(([fieldName, field]) => {
        const fieldConfig = field as any
        return `      {
        key: '${fieldName}',
        title: '${fieldName}',
        dataIndex: '${fieldName}',
        render: (value: any) => value,
      }`
      }).join(',\n')

    return `import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ${entityName} } from '../types/${entity.name.plural}.types'

const columns: ColumnsType<${entityName}> = [
${tableColumns}
]

interface ${pluralName}TableProps {
  data: ${entityName}[]
  loading?: boolean
}

export function ${pluralName}Table({ data, loading }: ${pluralName}TableProps) {
  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
    />
  )
}`
  }

  /**
   * Map field type to React component
   */
  private static mapFieldToComponent(fieldName: string, fieldConfig: any): string {
    const jsType = fieldConfig.jsType || 'string'

    switch (jsType) {
      case 'string':
        return fieldName.includes('email') ? 'Input' : 'Input'
      case 'number':
        return 'InputNumber'
      case 'boolean':
        return 'Checkbox'
      case 'date':
        return 'DatePicker'
      default:
        return 'Input'
    }
  }
}