/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GREEN_API_URL?: string;
  readonly VITE_USE_PROXY?: string;
  readonly VITE_DEV_ID_INSTANCE?: string;
  readonly VITE_DEV_API_TOKEN_INSTANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
