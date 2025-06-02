export interface PageData {
  face: string;
  token?: string | null;
  secret?: string | null;
  clockConfig: {
    face: string;
    timestamp: number;
  };
}

export { type PageData as default };
