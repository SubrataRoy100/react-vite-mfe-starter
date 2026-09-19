export interface ServiceConfig {
  NAME: string;
  DEFAULT_PORT: number;
  DEFAULT_URL: string;
  ENTRY_PATH?: string;
}

export const MFE_CONFIG: {
  readonly HOST: ServiceConfig;
};
