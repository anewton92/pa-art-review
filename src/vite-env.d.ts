/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRODUCTION_MODE: string
  readonly VITE_API_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
