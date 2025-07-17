import { createStore } from "solid-js/store";
import { PrimalArticle, PrimalHighlight, PrimalNote, PrimalUser, PrimalZap } from "src/primal";

export type ReadMentions = {
  users: Record<string, PrimalUser>,
  notes: Record<string, PrimalNote>,
  reads: Record<string, PrimalArticle>,
  zaps: Record<string, PrimalZap>,
  highlights: Record<string, PrimalHighlight>,
};

export const emptyReadsMentions = () => ({
  users: {},
  notes: {},
  reads: {},
  zaps: {},
  highlights: {},
})


export const [mentionStore, updateMentionStore] = createStore<ReadMentions>(emptyReadsMentions());
