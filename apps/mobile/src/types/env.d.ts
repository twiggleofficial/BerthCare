declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_BASE_URL?: string;
    readonly EXPO_PUBLIC_APP_ENV?: 'development' | 'staging' | 'production';
  }
}

export {};
