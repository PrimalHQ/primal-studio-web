import en from './en';

export type NestedRecord =
    { [k: string]: string | NestedRecord }; // okay

export default {
  en: en as Record<string, NestedRecord>,
}
