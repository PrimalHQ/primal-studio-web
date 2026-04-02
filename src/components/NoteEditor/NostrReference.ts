import { Node, mergeAttributes, Range } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { DecorationSet } from '@tiptap/pm/view';
import { Kind } from 'src/constants';
import { EventReference } from 'src/primal_api/references';
import { uuidv4 } from 'src/utils/kyes';
import { npubToHex } from 'src/utils/profile';


interface NostrReferenceOptions {
  className: string;
  fetchDataByReference: (reference: string) => Promise<EventReference>;
  onRemove?: (reference: string, uuid: string) => void;
  onAdd?: (data: EventReference, uuid: string) => void;
  renderContent: (reference: string, uuid: string) => HTMLElement,
  referencePattern?: RegExp;
}


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nprofile: {
      insertNostrReference: (data: EventReference) => ReturnType,
      insertNostrReferenceAt: (range: Range, userInfo: EventReference) => ReturnType,
    }
  }
}

// Cache to avoid duplicate fetches
const cache = new Map<string, EventReference>();

export const NostrReference = Node.create<NostrReferenceOptions>({
  name: 'nostrReference',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      className: 'nostr-user-reference',
      fetchDataByReference: async (reference: string) => {
        // Default implementation - should be overridden
        return { reference };
      },
      onRemove: undefined,
      onAdd: undefined,
      renderContent: (reference: string, uuid: string) => {
        let el = document.createElement('div');
        el.innerText = `${reference}`
        el.setAttribute('data-uuid', `${uuid}`)
        return el;
      },
      referencePattern: /(?:nostr:)?(npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|nprofile1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|nevent1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+|naddr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)(?=[^qpzry9x8gf2tvdw0s3jn54khce6mua7l]|$)/gi,
    };
  },

  addAttributes() {
    return {
      reference: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-reference'),
        renderHTML: (attributes) => {
          return {
            'data-reference': attributes.reference,
          };
        },
      },
      uuid: {
        default: uuidv4(),
        parseHTML: (element) => {
          const val = element.getAttribute('data-uuid');
          return val ? parseInt(val, 10) : 1;
        },
        renderHTML: (attributes) => {
          return {
            'data-uuid': attributes.uuid,
          };
        },
      },
      kind: {
        default: Kind.Metadata,
        parseHTML: (element) => element.getAttribute('data-kind'),
        renderHTML: (attributes) => {
          return {
            'data-kind': attributes.kind,
          };
        },
      },
      pk: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-pk'),
        renderHTML: (attributes) => {
          return {
            'data-pk': attributes.pk,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': this.name,
          class: this.options.className,
        },
        HTMLAttributes
      ),
      this.options.renderContent(node.attrs.reference, node.attrs.uuid),
      // node.attrs.userName || node.attrs.reference,
    ];
  },

  renderText({ node }) {
    // Return the original reference when extracting text
    return node.attrs.reference || '';
  },

  addCommands() {
    return {
      insertNostrReference:
        (dataInfo: EventReference) =>
        ({ commands, editor }) => {

          let uuid = uuidv4();

          this.options.onAdd?.(dataInfo, uuid);

          return commands.insertContent({
            type: this.name,
            attrs: {
              reference: dataInfo.reference,
              kind: dataInfo.kind || Kind.Metadata,
              pk: dataInfo.pk,
              uuid,
            },
          });
        },
      insertNostrReferenceAt:
        (range, dataInfo: EventReference) =>
        ({ commands, editor }) => {

          let uuid = uuidv4();

          this.options.onAdd?.(dataInfo, uuid);

          return commands.insertContentAt(
            range,
            {
              type: this.name,
              attrs: {
                reference: dataInfo.reference,
                kind: dataInfo.kind || Kind.Metadata,
                pk: dataInfo.pk,
                uuid,
              },
            }
          );
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('nostrReference');
    const { fetchDataByReference, className, onRemove, onAdd, referencePattern } = this.options;
    const nodeType = this.type;
    const editor = this.editor;
    const options = this.options;

    // Track node counts by reference
    const nodeCounts = new Map<string, number>();

    const revertToText = (reference: string) => {
      const currentTr = editor.state.tr;
      let found = false;
      editor.state.doc.descendants((n, p) => {
        if (n.type === nodeType && n.attrs.reference === reference) {
          currentTr.replaceWith(p, p + n.nodeSize, editor.schema.text(reference));
          found = true;
          return false;
        }
      });
      if (found) editor.view.dispatch(currentTr);
    };

    const fetchAndUpdate = (fullMatch: string, uuid: string) => {
      fetchDataByReference(fullMatch).then((dataInfo) => {
        if (dataInfo.error !== undefined) {
          cache.set(fullMatch, { ...dataInfo });
          revertToText(fullMatch);
          return;
        }
        onAdd?.(dataInfo, uuid);
        cache.set(fullMatch, { ...dataInfo });

        const currentTr = editor.state.tr;
        let found = false;
        editor.state.doc.descendants((n, p) => {
          if (n.type === nodeType && n.attrs.reference === fullMatch && !n.attrs.userName) {
            currentTr.setNodeMarkup(p, undefined, {
              ...n.attrs,
              reference: fullMatch,
              kind: dataInfo.kind,
              pk: dataInfo.pk,
            });
            found = true;
            return false;
          }
        });
        if (found) editor.view.dispatch(currentTr);
      }).catch((error: any) => {
        cache.set(fullMatch, { reference: fullMatch, error });
        revertToText(fullMatch);
      });
    };

    return [
      new Plugin({
        key: pluginKey,

        state: {
          init(_, state) {
            // Initialize the count of existing nodes
            state.doc.descendants((node) => {
              if (node.type === nodeType && node.attrs.reference) {
                const ref = node.attrs.reference;
                nodeCounts.set(ref, (nodeCounts.get(ref) || 0) + 1);
              }
            });
            return DecorationSet.empty;
          },
          apply(tr, set) {
            // Map decorations through document changes
            set = set.map(tr.mapping, tr.doc);

            // Track reference count changes
            if (onRemove && tr.docChanged) {
              const beforeNodes = new Map<string, string[]>();
              const afterNodes = new Map<string, string[]>();

              // Collect occurrence numbers before transaction
              tr.before.descendants((node) => {
                if (node.type === nodeType && node.attrs.reference) {
                  const ref = node.attrs.reference;
                  const occ = node.attrs.uuid;
                  if (!beforeNodes.has(ref)) {
                    beforeNodes.set(ref, []);
                  }
                  beforeNodes.get(ref)!.push(occ);
                }
              });

              // Collect occurrence numbers after transaction
              tr.doc.descendants((node) => {
                if (node.type === nodeType && node.attrs.reference) {
                  const ref = node.attrs.reference;
                  const occ = node.attrs.uuid;
                  if (!afterNodes.has(ref)) {
                    afterNodes.set(ref, []);
                  }
                  afterNodes.get(ref)!.push(occ);
                }
              });

              // Find removed occurrences and call onRemove for each
              beforeNodes.forEach((beforeOccurrences, reference) => {
                const afterOccurrences = afterNodes.get(reference) || [];

                // Find which occurrences were removed
                const removedOccurrences = beforeOccurrences.filter(
                  occ => !afterOccurrences.includes(occ)
                );

                // Call onRemove for each removed occurrence
                removedOccurrences.forEach(occ => {
                  onRemove(reference, occ);
                });

                // Update the count
                const afterCount = afterOccurrences.length;
                if (afterCount === 0) {
                  nodeCounts.delete(reference);
                } else {
                  nodeCounts.set(reference, afterCount);
                }
              });

              // Add new references to the count
              afterNodes.forEach((afterOccurrences, reference) => {
                if (!beforeNodes.has(reference)) {
                  nodeCounts.set(reference, afterOccurrences.length);
                }
              });
            }
            return set;
          },
        },

        appendTransaction(transactions, oldState, newState) {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const isPaste = transactions.some((tr) => tr.getMeta('paste'));

          let shouldConvert = isPaste;

          if (!isPaste && transactions.length > 0) {
            const lastTr = transactions[transactions.length - 1];
            let hasText = false;
            lastTr.steps.forEach((step) => {
              if (hasText) return;
              if (step instanceof ReplaceStep) {
                const slice = (step as any).slice;
                if (slice && slice.content && slice.content.size > 0) {
                  slice.content.forEach((node: any) => {
                    if (hasText) return;
                    if (node.isText && node.text) {
                      hasText = true;
                      return;
                    }
                    if (node.content && node.content.size > 0) {
                      node.content.forEach((child: any) => {
                        if (child.isText && child.text) hasText = true;
                      });
                    }
                  });
                }
              }
            });
            if (hasText) shouldConvert = true;
          }

          if (!shouldConvert) return null;

          const tr = newState.tr;
          let modified = false;

          // Collect all matches first to avoid mutation during iteration
          const pendingFetches: Array<{
            fullMatch: string;
            reference: string;
            matchStart: number;
            matchEnd: number;
          }> = [];

          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;

            referencePattern!.lastIndex = 0;
            const matches = Array.from(node.text.matchAll(referencePattern!));

            for (let i = matches.length - 1; i >= 0; i--) {
              const match = matches[i];
              const reference = match[1];
              const fullMatch = match[0];
              const matchStart = pos + match.index!;
              const matchEnd = matchStart + fullMatch.length;

              let hasNode = false;
              newState.doc.nodesBetween(matchStart, matchEnd, (n) => {
                if (n.type === nodeType) { hasNode = true; return false; }
              });

              if (hasNode) continue;

              if (isPaste) {
                // For paste: defer node creation until fetch resolves
                pendingFetches.push({ fullMatch, reference, matchStart, matchEnd });
              } else {
                // For typing: immediate node creation (existing behavior)
                let uuid = uuidv4();
                let pk: string | undefined;
                let kind: number | undefined;
                let shouldRevert = false;

                if (cache.has(fullMatch)) {
                  const cachedValue = cache.get(fullMatch)!;
                  if (cachedValue.error) {
                    shouldRevert = true;
                  } else {
                    pk = cachedValue.pk;
                    kind = cachedValue.kind;
                    onAdd?.(cachedValue, uuid);
                  }
                }

                if (shouldRevert) continue;

                const newNode = nodeType.create({
                  reference: fullMatch,
                  pk: npubToHex(reference),
                  kind,
                  uuid,
                });

                const mappedStart = tr.mapping.map(matchStart);
                const mappedEnd = tr.mapping.map(matchEnd);
                tr.replaceRangeWith(mappedStart, mappedEnd, newNode);
                modified = true;

                if (!pk) {
                  fetchAndUpdate(fullMatch, uuid);
                }
              }
            }
          });

          // For paste: fetch first, then insert nodes
          if (isPaste && pendingFetches.length > 0) {
            const fetchAndInsertAll = async () => {
              // Fetch all in parallel
              const fetchResults = await Promise.all(
                pendingFetches.map(async ({ fullMatch, reference }) => {
                  let dataInfo: EventReference | null = null;
                  let shouldSkip = false;

                  if (cache.has(fullMatch)) {
                    const cached = cache.get(fullMatch)!;
                    if (cached.error) {
                      shouldSkip = true;
                    } else {
                      dataInfo = cached;
                    }
                  } else {
                    try {
                      dataInfo = await fetchDataByReference(fullMatch);
                      if (dataInfo.error !== undefined) {
                        cache.set(fullMatch, { ...dataInfo });
                        shouldSkip = true;
                      } else {
                        cache.set(fullMatch, { ...dataInfo });
                      }
                    } catch (error: any) {
                      cache.set(fullMatch, { reference: fullMatch, error });
                      shouldSkip = true;
                    }
                  }

                  return { fullMatch, reference, dataInfo, shouldSkip };
                })
              );

              // Re-scan the current document for text positions (old positions are stale)
              const insertTr = editor.state.tr;
              let insertModified = false;

              // Build a lookup of fetched data by fullMatch
              const dataByMatch = new Map<string, { reference: string, dataInfo: EventReference }>();
              for (const { fullMatch, reference, dataInfo, shouldSkip } of fetchResults) {
                if (!shouldSkip && dataInfo) {
                  dataByMatch.set(fullMatch, { reference, dataInfo });
                }
              }

              if (dataByMatch.size === 0) return;

              // Find all matching text in the current document, collect replacements
              const replacements: Array<{ start: number, end: number, fullMatch: string }> = [];

              editor.state.doc.descendants((node, pos) => {
                if (!node.isText || !node.text) return;

                referencePattern!.lastIndex = 0;
                const matches = Array.from(node.text.matchAll(referencePattern!));

                for (const match of matches) {
                  const fullMatch = match[0];
                  if (!dataByMatch.has(fullMatch)) continue;

                  const start = pos + match.index!;
                  const end = start + fullMatch.length;
                  replacements.push({ start, end, fullMatch });
                }
              });

              // Sort descending so replacements don't shift each other
              replacements.sort((a, b) => b.start - a.start);

              for (const { start, end, fullMatch } of replacements) {
                const data = dataByMatch.get(fullMatch)!;
                const uuid = uuidv4();
                onAdd?.(data.dataInfo, uuid);

                const newNode = nodeType.create({
                  reference: fullMatch,
                  pk: data.dataInfo.pk ?? npubToHex(data.reference),
                  kind: data.dataInfo.kind ?? Kind.Metadata,
                  uuid,
                });

                const mappedStart = insertTr.mapping.map(start);
                const mappedEnd = insertTr.mapping.map(end);
                insertTr.replaceRangeWith(mappedStart, mappedEnd, newNode);
                insertModified = true;
              }

              if (insertModified) {
                editor.view.dispatch(insertTr);
              }
            };

            fetchAndInsertAll();
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
