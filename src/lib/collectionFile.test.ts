import { describe, expect, it } from 'vitest';
import { parseCollectionsFile, serializeCollections } from './collectionFile';
import type { Collection } from '../types';
import { createDefaultConfig } from './defaults';

function makeCollection(name: string): Collection {
  return {
    id: 'col-fixed',
    name,
    createdAt: 1000,
    updatedAt: 2000,
    requests: [
      {
        id: 'req-fixed',
        name: 'Get users',
        createdAt: 1000,
        updatedAt: 2000,
        config: createDefaultConfig(),
      },
    ],
  };
}

describe('serializeCollections', () => {
  it('writes a versioned export envelope', () => {
    const json = serializeCollections([makeCollection('My API')]);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.format).toBe('api-playground.collections');
    expect(parsed.version).toBe(1);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(Array.isArray(parsed.collections)).toBe(true);
  });
});

describe('parseCollectionsFile', () => {
  it('round-trips collections and regenerates ids', () => {
    const original = makeCollection('My API');
    const parsed = parseCollectionsFile(serializeCollections([original]));

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('My API');
    expect(parsed[0].id).not.toBe(original.id);
    expect(parsed[0].requests).toHaveLength(1);
    expect(parsed[0].requests[0].name).toBe('Get users');
    expect(parsed[0].requests[0].id).not.toBe(original.id);
    expect(parsed[0].requests[0].config.url).toBe(original.requests[0].config.url);
  });

  it('accepts a bare array of collections', () => {
    const parsed = parseCollectionsFile(JSON.stringify([makeCollection('Bare')]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('Bare');
  });

  it('rejects non-JSON input', () => {
    expect(() => parseCollectionsFile('not json')).toThrow(/not valid JSON/);
  });

  it('rejects unrecognized formats', () => {
    expect(() => parseCollectionsFile(JSON.stringify({ format: 'other', collections: [] }))).toThrow(
      /Unrecognized file format/,
    );
    expect(() => parseCollectionsFile(JSON.stringify({ hello: 'world' }))).toThrow(
      /does not contain a "collections" array/,
    );
  });

  it('rejects unsupported versions', () => {
    expect(() =>
      parseCollectionsFile(JSON.stringify({ format: 'api-playground.collections', version: 99, collections: [] })),
    ).toThrow(/Unsupported export version/);
  });

  it('rejects collections without a name', () => {
    expect(() => parseCollectionsFile(JSON.stringify([{ requests: [] }]))).toThrow(/missing a name/);
  });

  it('rejects requests with invalid configs', () => {
    const bad = [{ name: 'X', requests: [{ name: 'r', config: { method: 'GET' } }] }];
    expect(() => parseCollectionsFile(JSON.stringify(bad))).toThrow(/invalid request config/);
  });

  it('fills in defaults for optional request metadata', () => {
    const minimal = [
      {
        name: 'X',
        requests: [{ config: { method: 'GET', url: 'https://x.test', params: [], headers: [] } }],
      },
    ];
    const parsed = parseCollectionsFile(JSON.stringify(minimal));
    expect(parsed[0].requests[0].name).toBe('Request 1');
    expect(typeof parsed[0].requests[0].createdAt).toBe('number');
  });
});
