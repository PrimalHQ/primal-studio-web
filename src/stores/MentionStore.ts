import { createStore } from "solid-js/store";
import { PrimalArticle, PrimalNote, PrimalUser, PrimalZap } from "src/primal";

export type ReadMentions = {
  users: Record<string, PrimalUser>,
  notes: Record<string, PrimalNote>,
  reads: Record<string, PrimalArticle>,
  zaps: Record<string, PrimalZap>,
};

export const emptyReadsMentions = () => ({
  users: {},
  notes: {},
  reads: {},
  zaps: {},
})


export const [mentionStore, updateMentionStore] = createStore<ReadMentions>(emptyReadsMentions());
