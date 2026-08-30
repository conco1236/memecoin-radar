// Manus integrations removed: stubbed implementation to avoid runtime errors.
// callDataApi previously proxied to Manus Forge/WebDev. It now throws a clear
// error so callers fail fast and do not attempt external Manus calls.

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

export async function callDataApi(_apiId: string, _options: DataApiCallOptions = {}): Promise<unknown> {
  throw new Error("Manus integration removed: callDataApi is disabled in this build.");
}
