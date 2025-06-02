export interface PageData {
  face: string | null;
  token?: string | null;
  secret?: string | null;
  clockConfig: {
    face: string | null;
    timestamp: number;
  };
}

export { type PageData as default };
