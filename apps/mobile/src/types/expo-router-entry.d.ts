declare module 'expo-router/entry' {
  import type { ComponentType } from 'react';
  const entry: ComponentType<Record<string, unknown>>;
  export default entry;
}
