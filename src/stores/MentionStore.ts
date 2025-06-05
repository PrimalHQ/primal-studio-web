import { createStore } from "solid-js/store";
import { PrimalArticle, PrimalNote, PrimalUser } from "src/primal";

export type ReadMentions = {
  users: Record<string, PrimalUser>,
  notes: Record<string, PrimalNote>,
  reads: Record<string, PrimalArticle>,
};

export const emptyReadsMentions = () => ({
  users: {},
  notes: {},
  reads: {},
})


export const [mentionStore, updateMentionStore] = createStore<ReadMentions>(emptyReadsMentions());
