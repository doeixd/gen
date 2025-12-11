/**
 * Test script for TanStack Form generator
 */

import { generateTanStackForm, generateTanStackFormFactory, generateTanStackFormComponents } from './src/templates/index'
import { userEntity } from './test-entity'
import * as fs from 'fs'
import * as path from 'path'

// Create test output directory
const testOutputDir = path.join(process.cwd(), 'test-output', 'forms')
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true })
}

console.log('🧪 Testing TanStack Form Generator\n')

// Generate form factory
console.log('1️⃣  Generating form-factory.tsx...')
try {
  const factoryCode = generateTanStackFormFactory()
  const factoryPath = path.join(testOutputDir, 'form-factory.tsx')
  fs.writeFileSync(factoryPath, factoryCode)
  console.log('   ✅ Generated:', factoryPath)
} catch (error) {
  console.error('   ❌ Error:', error)
  process.exit(1)
}

// Generate form components
console.log('\n2️⃣  Generating form-components.tsx...')
try {
  const componentsCode = generateTanStackFormComponents()
  const componentsPath = path.join(testOutputDir, 'form-components.tsx')
  fs.writeFileSync(componentsPath, componentsCode)
  console.log('   ✅ Generated:', componentsPath)
} catch (error) {
  console.error('   ❌ Error:', error)
  process.exit(1)
}

// Generate entity-specific form
console.log('\n3️⃣  Generating UserForm.tsx...')
try {
  const formCode = generateTanStackForm({
    entity: userEntity,
    includeValidation: true,
    includeErrorHandling: true,
  })
  const formPath = path.join(testOutputDir, 'UserForm.tsx')
  fs.writeFileSync(formPath, formCode)
  console.log('   ✅ Generated:', formPath)
} catch (error) {
  console.error('   ❌ Error:', error)
  process.exit(1)
}

console.log('\n✨ All forms generated successfully!')
console.log('\n📂 Output directory:', testOutputDir)
console.log('\nGenerated files:')
console.log('  - form-factory.tsx')
console.log('  - form-components.tsx')
console.log('  - UserForm.tsx')
