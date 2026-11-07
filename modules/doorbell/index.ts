// Re-export the native module. On web, it will be resolved to DoorbellModule.web.ts
// and on native platforms to DoorbellModule.ts
export { default } from './src/DoorbellModule';
export * from './src/Doorbell.types';
