import type { Collection, RequestConfig, SavedRequest } from '../types';
import { generateId } from './id';

/** Versioned JSON export format for collections. */
export interface CollectionExportFile {
  format: 'api-playground.collections';
  version: 1;
  exportedAt: string;
  collections: Collection[];
}

export function serializeCollections(collections: Collection[]): string {
  const file: CollectionExportFile = {
    format: 'api-playground.collections',
    version: 1,
    exportedAt: new Date().toISOString(),
    collections,
  };
  return JSON.stringify(file, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRequestConfig(config: unknown, context: string): asserts config is RequestConfig {
  if (!isRecord(config)) throw new Error(`${context}: missing request config`);
  if (typeof config.method !== 'string' || typeof config.url !== 'string') {
    throw new Error(`${context}: invalid request config`);
  }
  if (!Array.isArray(config.params) || !Array.isArray(config.headers)) {
    throw new Error(`${context}: invalid request config`);
  }
}

/**
 * Parses and validates a collections export file.
 *
 * @throws Error with a descriptive message when the file is not valid.
 */
export function parseCollectionsFile(json: string): Collection[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  let rawCollections: unknown;
  if (Array.isArray(data)) {
    rawCollections = data;
  } else if (isRecord(data)) {
    if (data.format !== undefined && data.format !== 'api-playground.collections') {
      throw new Error('Unrecognized file format: expected an API Playground collections export.');
    }
    if (data.version !== undefined && data.version !== 1) {
      throw new Error(`Unsupported export version: ${String(data.version)}.`);
    }
    rawCollections = data.collections;
    if (!Array.isArray(rawCollections)) {
      throw new Error('The file does not contain a "collections" array.');
    }
  } else {
    throw new Error('Unrecognized file format: expected an object or an array of collections.');
  }

  const collections: Collection[] = [];
  (rawCollections as unknown[]).forEach((raw, index) => {
    if (!isRecord(raw)) throw new Error(`Collection #${index + 1} is not a valid object.`);
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error(`Collection #${index + 1} is missing a name.`);
    }
    const rawRequests = Array.isArray(raw.requests) ? raw.requests : [];
    const now = Date.now();
    const requests: SavedRequest[] = rawRequests.map((rawRequest, rIndex) => {
      if (!isRecord(rawRequest)) {
        throw new Error(`Request #${rIndex + 1} in "${raw.name}" is not a valid object.`);
      }
      assertRequestConfig(rawRequest.config, `Request #${rIndex + 1} in "${raw.name}"`);
      return {
        id: generateId('req'),
        name: typeof rawRequest.name === 'string' && rawRequest.name.trim() ? rawRequest.name : `Request ${rIndex + 1}`,
        createdAt: typeof rawRequest.createdAt === 'number' ? rawRequest.createdAt : now,
        updatedAt: typeof rawRequest.updatedAt === 'number' ? rawRequest.updatedAt : now,
        config: rawRequest.config as RequestConfig,
      };
    });

    collections.push({
      id: generateId('col'),
      name: raw.name,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
      requests,
    });
  });

  return collections;
}
