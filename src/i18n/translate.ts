import type { Messages, MessageKey, TranslateValues } from "./types";

/**
 * Resolve a dot-path against a dictionary. Returns the key itself when a
 * translation is missing — during a demo a visible key beats a blank space,
 * and it makes gaps obvious in review.
 */
export function resolveMessage(messages: Messages, key: string): string {
  const value = key
    .split(".")
    .reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages);

  return typeof value === "string" ? value : key;
}

/** Replace {placeholders} with supplied values. */
export function interpolate(template: string, values?: TranslateValues) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in values ? String(values[token]) : match,
  );
}

export function createTranslator(messages: Messages) {
  return (key: MessageKey, values?: TranslateValues) =>
    interpolate(resolveMessage(messages, key), values);
}
