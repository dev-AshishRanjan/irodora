/**
 * OpenTelemetry wrappers.
 *
 * Image buffers and profile dimensions are carried in types with no serialiser,
 * so passing one to a log or span attribute is a type error (ADR-0022).
 */
export const TELEMETRY_VERSION = '0.0.0' as const;
