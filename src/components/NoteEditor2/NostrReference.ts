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

          // Check if this was a paste operation
          const isPaste = transactions.some((tr) => tr.getMeta('paste'));

          // For typing, check if the last character typed is NOT a valid reference character
          let shouldConvert = isPaste;

          if (!isPaste && transactions.length > 0) {
            const lastTr = transactions[transactions.length - 1];

            // Get the last inserted text
            let lastChar = '';
            lastTr.steps.forEach((step) => {
              if (step instanceof ReplaceStep) {
                const slice = (step as any).slice;
                if (slice && slice.content && slice.content.size > 0) {
                  const textNode = slice.content.firstChild;
                  if (textNode && textNode.isText && textNode.text) {
                    lastChar = textNode.text.slice(-1);
                  }
                }
              }
            });

            // Convert if the last character is not a valid reference character
            if (lastChar) {
              shouldConvert = true;
            }
          }

          if (!shouldConvert) return null;

          const tr = newState.tr;
          let modified = false;

          newState.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;

            // Reset regex lastIndex for global regex
            referencePattern!.lastIndex = 0;
            const matches = Array.from(node.text.matchAll(referencePattern!));

            // Process matches in reverse to maintain positions
            for (let i = matches.length - 1; i >= 0; i--) {
              const match = matches[i];
              const reference = match[1]; // Capture group without optional prefix
              const fullMatch = match[0];
              const matchStart = pos + match.index!;
              const matchEnd = matchStart + fullMatch.length;

              // Check if this position already has a nostrReference node
              let hasNode = false;
              newState.doc.nodesBetween(matchStart, matchEnd, (n) => {
                if (n.type === nodeType) {
                  hasNode = true;
                  return false;
                }
              });

              let uuid = uuidv4();

              if (!hasNode) {
                // Check if we have a cached value first
                let pk: string | undefined = undefined;
                let kind: number | undefined = undefined;
                let shouldRevert = false;

                if (cache.has(fullMatch)) {
                  const cachedValue = cache.get(fullMatch)!;
                  if (cachedValue.error) {
                    // Don't create a node if we know it will fail
                    shouldRevert = true;
                  } else {
                    pk = cachedValue.pk;
                    kind = cachedValue.kind;
                    onAdd?.(cachedValue, uuid);
                  }
                }

                if (shouldRevert) {
                  // Skip creating the node for known errors
                  continue;
                }

                // Create a node with the reference and kind if cached
                const newNode = nodeType.create({
                  reference: fullMatch,
                  pk: npubToHex(reference),
                  kind,
                  uuid,
                });

                  tr.replaceRangeWith(matchStart, matchEnd, newNode);
                  modified = true;

                // If not cached, fetch user info asynchronously
                if (!pk) {
                  const fetchAndUpdate = async () => {
                    try {
                      const dataInfo = await fetchDataByReference(fullMatch);

                      // Check if the response contains an error
                      if (dataInfo.error !== undefined) {
                        cache.set(fullMatch, { ...dataInfo });
                        // Revert the node back to text
                        revertToText(fullMatch);
                        return;
                      }

                      onAdd?.(dataInfo, uuid);
                      cache.set(fullMatch, { ...dataInfo });
                      // Update the node with the fetched user name
                      const currentTr = editor.state.tr;
                      let found = false;

                      editor.state.doc.descendants((n, p) => {
                        if (
                          n.type === nodeType &&
                          n.attrs.reference === fullMatch &&
                          !n.attrs.userName
                        ) {
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

                      if (found) {
                        editor.view.dispatch(currentTr);
                      }

                    } catch (error: any) {
                      console.error('Failed to fetch user info:', error);
                      cache.set(fullMatch, { reference: fullMatch, error });
                      revertToText(fullMatch);
                    }
                  };

                  fetchAndUpdate();
                }
              }

              // Helper function to revert node back to text
              const revertToText = (reference: string) => {
                const currentTr = editor.state.tr;
                let found = false;

                editor.state.doc.descendants((n, p) => {
                  if (
                    n.type === nodeType &&
                    n.attrs.reference === reference
                  ) {
                    // Replace the node with plain text
                    currentTr.replaceWith(
                      p,
                      p + n.nodeSize,
                      editor.schema.text(reference)
                    );
                    found = true;
                    return false;
                  }
                });

                if (found) {
                  editor.view.dispatch(currentTr);
                }
              };
            }
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});
