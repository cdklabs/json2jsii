import { TypeGenerator } from '../src';

describe('normalizeTypeName', () => {
  test('no normalization needed', () => {
    expect(TypeGenerator.normalizeTypeName('Foo')).toEqual('Foo');
    expect(TypeGenerator.normalizeTypeName('FooBar')).toEqual('FooBar');
    expect(TypeGenerator.normalizeTypeName('Implement')).toEqual('Implement');
  });

  test('TLAs are converted to PascalCase', () => {
    expect(TypeGenerator.normalizeTypeName('ICQResource')).toEqual('IcqResource');
    expect(TypeGenerator.normalizeTypeName('IXXXFoo')).toEqual('IxxxFoo');
    expect(TypeGenerator.normalizeTypeName('IXXFoo')).toEqual('IxxFoo');
    expect(TypeGenerator.normalizeTypeName('STARTFooBARZingSOCalEND')).toEqual('StartFooBarZingSoCalEnd');
    expect(TypeGenerator.normalizeTypeName('VPC')).toEqual('Vpc');
    expect(TypeGenerator.normalizeTypeName('StorageIO')).toEqual('StorageIo');
    expect(TypeGenerator.normalizeTypeName('AFoo')).toEqual('AFoo');
  });
});