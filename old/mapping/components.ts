/**
 * Component Registry System
 * Works with any UI library (React, Vue, Svelte, etc.)
 */

// Global type declarations - augment this with your UI library components
export {};

declare global {
  interface ComponentType {
    (...args: any[]): any
  }

  /**
   * UI Components - User registers their actual component functions here
   * Works with any UI library (React, Vue, Svelte, etc.)
   */
  interface UIComponents {
    // Form components
    TextField: ComponentType
    NumberField: ComponentType
    Checkbox: ComponentType
    TextArea: ComponentType
    Select: ComponentType
    DatePicker: ComponentType
    FilePicker: ComponentType
    RichTextEditor: ComponentType
    ColorPicker: ComponentType
    RadioGroup: ComponentType

    // Display components
    Text: ComponentType
    Number: ComponentType
    Currency: ComponentType
    Badge: ComponentType
    CompletedBadge: ComponentType
    DateTime: ComponentType
    Link: ComponentType
    Email: ComponentType
    Image: ComponentType
    Avatar: ComponentType
    List: ComponentType

    // Layout components
    Card: ComponentType
    Table: ComponentType
    Grid: ComponentType
    Stack: ComponentType

    // Route/Page components
    Page: ComponentType
    DetailView: ComponentType
    ListView: ComponentType
    FormView: ComponentType
  }

  /**
   * User can extend with custom components
   */
  interface CustomComponents {
    [key: string]: ComponentType
  }

  /**
   * All available components (UI + Custom)
   */
  type AllComponents = UIComponents & CustomComponents
}

/**
 * Type-safe component reference (no strings!)
 */
export type ComponentRef<K extends keyof AllComponents = keyof AllComponents> = AllComponents[K]

/**
 * Component with props
 */
export interface ComponentWithProps<C extends ComponentType = ComponentType, P extends unknown = Parameters<C>[0]> {
  component: C;
  props: P;
}

/**
 * Component Registry - Register UI library components once, use everywhere
 *
 * @example
 * // Register your UI library components
 * ComponentRegistry.registerBulk({
 *   TextField: MyUILib.TextField,
 *   NumberField: MyUILib.NumberField,
 *   // ... etc
 * })
 *
 * // Later, retrieve components
 * const TextField = ComponentRegistry.get('TextField')
 */
export class ComponentRegistry {
  private static components = new Map<string, ComponentType>()

  /**
   * Register a single component
   */
  static register<K extends keyof AllComponents>(
    name: K,
    component: AllComponents[K]
  ): void {
    this.components.set(name as string, component)
  }

  /**
   * Get a registered component
   */
  static get<K extends keyof AllComponents>(name: K): AllComponents[K] | undefined {
    return this.components.get(name as string) as AllComponents[K] | undefined
  }

  /**
   * Register multiple components at once
   */
  static registerBulk(components: Partial<AllComponents>): void {
    Object.entries(components).forEach(([name, component]) => {
      if (component) this.components.set(name, component)
    })
  }

  /**
   * Check if a component is registered
   */
  static has(name: keyof AllComponents): boolean {
    return this.components.has(name as string)
  }

  /**
   * Get all registered component names
   */
  static getAll(): string[] {
    return Array.from(this.components.keys())
  }

  /**
   * Clear all registered components
   */
  static clear(): void {
    this.components.clear()
  }
}

/**
 * Component type constants
 */
export type FormComponent = keyof Pick<UIComponents, 'TextField' | 'NumberField' | 'Checkbox' | 'TextArea' | 'Select' | 'DatePicker' | 'FilePicker' | 'RichTextEditor' | 'ColorPicker' | 'RadioGroup'>
export type DisplayComponent = keyof Pick<UIComponents, 'Text' | 'Number' | 'Currency' | 'Badge' | 'CompletedBadge' | 'DateTime' | 'Link' | 'Email' | 'Image' | 'Avatar' | 'List'>

/**
 * Display component configuration
 */
export interface DisplayComponentConfig<C extends ComponentType = ComponentType> {
  listComponent: C | ComponentWithProps<C>;
  cardComponent: C | ComponentWithProps<C>;
}

/**
 * Input component configuration
 */
export interface InputComponentConfig<C extends ComponentType = ComponentType> {
  formComponent?: C | ComponentWithProps<C>
  createComponent?: C | ComponentWithProps<C>
  editComponent?: C | ComponentWithProps<C>
  viewComponent?: C | ComponentWithProps<C>
}

/**
 * Type guards
 */
export function isComponentWithProps<C extends ComponentType>(
  value: C | ComponentWithProps<C> | undefined | null
): value is ComponentWithProps<C> {
  return value !== null && value !== undefined && typeof value === 'object' && 'component' in value && 'props' in value
}

export function isDisplayComponentConfig<C extends ComponentType>(
  value: C | DisplayComponentConfig | undefined | null
): value is DisplayComponentConfig {
  return value !== null && value !== undefined && typeof value === 'object' && 'listComponent' in value
}

export function getComponentProps<C extends ComponentType>(
  value: C | ComponentWithProps<C> | undefined | null
): Parameters<C>[0] | undefined {
  if (isComponentWithProps(value)) {
    return value.props
  }
  return undefined
}

/**
 * Helper to create a component with props
 */
export function withProps<C extends ComponentType>(
  component: C,
  props: Parameters<C>[0]
): ComponentWithProps<C, Parameters<C>[0]> {
  return { component, props }
}

/**
 * Display component render functions
 */
export const displayComponents = {
  Text: (value: unknown): string => String(value ?? ''),
  Number: (value: number): string => value?.toLocaleString() ?? '0',
  Currency: (value: number): string => `$${value?.toFixed(2) ?? '0.00'}`,
  Badge: (value: boolean): string => value ? 'Yes' : 'No',
  CompletedBadge: (value: boolean): string => value ? '✅' : '⏳',
  DateTime: (value: Date | string | number): string => new Date(value).toLocaleString(),
  Link: (value: string): string => value,
  Email: (value: string): string => value,
  Image: (value: string): string => value,
  Avatar: (value: string): string => value,
  List: (value: unknown[]): string => value?.join(', ') ?? '',
} as const
