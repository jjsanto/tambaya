export type D1Result<T = unknown> = { success: boolean; results?: T[]; meta?: Record<string, unknown> };
export type D1Statement = { bind(...values: unknown[]): D1Statement; first<T = unknown>(): Promise<T | null>; all<T = unknown>(): Promise<D1Result<T>>; run(): Promise<D1Result> };
export type D1DatabaseLike = { prepare(query: string): D1Statement; batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]> };
export type WorkersAILike = { run(model: string, input: Record<string, unknown>): Promise<unknown> };
export type KVNamespaceLike = { put(key:string,value:ArrayBuffer|ReadableStream|string,options?:{metadata?:Record<string,string|number>}):Promise<void>; getWithMetadata<T=Record<string,unknown>>(key:string,options:{type:"stream"}):Promise<{value:ReadableStream|null;metadata:T|null}>; delete(key:string):Promise<void> };
export type CloudflareBindings = { DB: D1DatabaseLike; AI?: WorkersAILike; QUESTION_IMAGES?: KVNamespaceLike; EDITORIAL_TOKEN?: string };
