import type en from "@/messages/en.json";

/**
 * English is the reference dictionary: its shape defines the contract, and the
 * other locales are type-checked against it. Adding a key to en.json surfaces a
 * compile error in az.json / ru.json until it is translated.
 */
export type Messages = typeof en;

type Primitive = string;

/** Dot-notation union of every leaf key, e.g. "nav.home" | "common.cancel". */
export type MessageKey<T = Messages, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends Primitive
    ? `${Prefix}${K}`
    : MessageKey<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslateValues = Record<string, string | number>;

export type Translate = (key: MessageKey, values?: TranslateValues) => string;
