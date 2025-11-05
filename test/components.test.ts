import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentRegistry, withProps, isComponentWithProps, getComponentProps } from '../src/components';

describe('Component Registry', () => {
  beforeEach(() => {
    // Clear registry before each test
    ComponentRegistry.clear();
  });

  describe('registration', () => {
    it('should register a single component', () => {
      const TestComponent = () => null;
      ComponentRegistry.register('TestComponent', TestComponent);
      expect(ComponentRegistry.get('TestComponent')).toBe(TestComponent);
    });

    it('should register multiple components in bulk', () => {
      const Component1 = () => null;
      const Component2 = () => null;

      ComponentRegistry.registerBulk({
        Component1,
        Component2,
      });

      expect(ComponentRegistry.get('Component1')).toBe(Component1);
      expect(ComponentRegistry.get('Component2')).toBe(Component2);
    });

    it('should return undefined for unregistered components', () => {
      expect(ComponentRegistry.get('NonExistent')).toBeUndefined();
    });

    it('should override existing component on re-registration', () => {
      const Component1 = () => null;
      const Component2 = () => null;

      ComponentRegistry.register('Test', Component1);
      expect(ComponentRegistry.get('Test')).toBe(Component1);

      ComponentRegistry.register('Test', Component2);
      expect(ComponentRegistry.get('Test')).toBe(Component2);
    });

    it('should list all registered component names', () => {
      const Component1 = () => null;
      const Component2 = () => null;

      ComponentRegistry.registerBulk({ Component1, Component2 });

      const names = ComponentRegistry.list();
      expect(names).toContain('Component1');
      expect(names).toContain('Component2');
      expect(names.length).toBe(2);
    });

    it('should clear all registered components', () => {
      const Component1 = () => null;
      ComponentRegistry.register('Component1', Component1);

      expect(ComponentRegistry.list().length).toBe(1);

      ComponentRegistry.clear();
      expect(ComponentRegistry.list().length).toBe(0);
    });
  });

  describe('withProps utility', () => {
    it('should create a component with props', () => {
      const TestComponent = () => null;
      const props = { label: 'Test', required: true };

      const componentWithProps = withProps(TestComponent, props);

      expect(isComponentWithProps(componentWithProps)).toBe(true);
      expect(componentWithProps.component).toBe(TestComponent);
      expect(componentWithProps.props).toEqual(props);
    });

    it('should handle components without props', () => {
      const TestComponent = () => null;

      expect(isComponentWithProps(TestComponent)).toBe(false);
    });

    it('should extract props from component with props', () => {
      const TestComponent = () => null;
      const props = { label: 'Test' };

      const componentWithProps = withProps(TestComponent, props);

      expect(getComponentProps(componentWithProps)).toEqual(props);
    });

    it('should return empty object for component without props', () => {
      const TestComponent = () => null;

      expect(getComponentProps(TestComponent)).toEqual({});
    });
  });

  describe('component checking', () => {
    it('should correctly identify component with props', () => {
      const TestComponent = () => null;
      const withPropsComponent = withProps(TestComponent, { test: true });

      expect(isComponentWithProps(withPropsComponent)).toBe(true);
    });

    it('should return false for regular component', () => {
      const TestComponent = () => null;

      expect(isComponentWithProps(TestComponent)).toBe(false);
    });

    it('should return false for non-component values', () => {
      expect(isComponentWithProps(null)).toBe(false);
      expect(isComponentWithProps(undefined)).toBe(false);
      expect(isComponentWithProps({})).toBe(false);
      expect(isComponentWithProps('string')).toBe(false);
      expect(isComponentWithProps(123)).toBe(false);
    });
  });
});
