/// <reference types="vite/client" />

// Inyectada por Vite desde package.json (vite.config.mjs → define)
declare const __APP_VERSION__: string

declare module '*.css' {
  const content: Record<string, string>
  export default content
}
