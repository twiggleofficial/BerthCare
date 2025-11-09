declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_BASE_URL?: string;
    readonly EXPO_PUBLIC_APP_ENV?: 'development' | 'staging' | 'production';
    readonly EXPO_PUBLIC_DB_OPTIONAL_INDEXES?: 'true' | 'false';
    readonly EXPO_PUBLIC_DB_WRITE_P95_THRESHOLD_MS?: string;
  }
}

export {};
