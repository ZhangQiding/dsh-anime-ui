import { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
//#region src/client/index.d.ts
/** Required services (fiber inject waiting — the runtime must be up first). */
declare const inject: string[];
/**
 * Mount the photo album.
 * @param ctx - client root context.
 */
declare function apply(ctx: ClientContext): void;
//#endregion
export { apply, inject };