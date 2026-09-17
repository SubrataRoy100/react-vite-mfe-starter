export interface ServiceConfig {
  NAME: string;
  PORT: number;
  DEFAULT_URL: string;
  ENTRY_PATH?: string;
}

export const MFE_CONFIG: {
  readonly HOST: ServiceConfig;
  readonly DEMO_SERVICE: ServiceConfig;
};
