declare module 'impit' {
  interface ImpitOptions {
    browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
    ignoreTlsErrors?: boolean;
  }

  interface ImpitFetchOptions {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    method?: string;
    body?: string;
  }

  interface ImpitResponse {
    ok: boolean;
    status: number;
    headers: Headers;
    text(): Promise<string>;
    json(): Promise<unknown>;
  }

  export class Impit {
    constructor(options?: ImpitOptions);
    fetch(url: string, options?: ImpitFetchOptions): Promise<ImpitResponse>;
  }
}
