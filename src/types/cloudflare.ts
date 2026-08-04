export type D1Result<T = unknown> = { success: boolean; results?: T[]; meta?: Record<string, unknown> };
export type D1Statement = { bind(...values: unknown[]): D1Statement; first<T = unknown>(): Promise<T | null>; all<T = unknown>(): Promise<D1Result<T>>; run(): Promise<D1Result> };
export type D1DatabaseLike = { prepare(query: string): D1Statement; batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]> };
export type CloudflareBindings = { DB: D1DatabaseLike; QUESTION_IMAGES: unknown; EDITORIAL_TOKEN?: string };
