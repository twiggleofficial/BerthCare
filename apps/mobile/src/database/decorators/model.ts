import type { Model } from '@nozbe/watermelondb';

type ModelConstructor = typeof Model & {
  table?: string;
};

/**
 * Lightweight decorator that mirrors the architecture doc's `@model` syntax by
 * setting WatermelonDB's `static table` property on the class.
 */
export const model =
  (tableName: string) =>
  <T extends ModelConstructor>(constructor: T): T => {
    Object.defineProperty(constructor, 'table', {
      configurable: true,
      enumerable: true,
      value: tableName,
      writable: true,
    });

    return constructor;
  };
