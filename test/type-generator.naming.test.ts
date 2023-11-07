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

  test('Lowercase words are converted to PascalCase', () => {
    expect(TypeGenerator.normalizeTypeName('attributemanifests')).toEqual('Attributemanifests');
    expect(TypeGenerator.normalizeTypeName('attributemanifestsOptions')).toEqual('AttributemanifestsOptions');
    expect(TypeGenerator.normalizeTypeName('attributeMANIFESTSOptions')).toEqual('AttributeManifestsOptions');
  });
  test('Kebab-case names are converted to PascalCase', () => {
    expect(TypeGenerator.normalizeTypeName('AttributeManifests')).toEqual('AttributeManifests');
    expect(TypeGenerator.normalizeTypeName('Attribute-Manifests')).toEqual('AttributeManifests');
    expect(TypeGenerator.normalizeTypeName('Attribute-manifests')).toEqual('AttributeManifests');
    expect(TypeGenerator.normalizeTypeName('attribute-manifests')).toEqual('AttributeManifests');
    expect(TypeGenerator.normalizeTypeName('attribute-manifestsOptions')).toEqual('AttributeManifestsOptions');
    expect(TypeGenerator.normalizeTypeName('attribute-MANIFESTSOptions')).toEqual('AttributeManifestsOptions');
  });
});
