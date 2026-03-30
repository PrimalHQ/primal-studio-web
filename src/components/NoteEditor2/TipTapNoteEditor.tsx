import 'src/index.scss';

import { createSignal, For, JSXElement } from 'solid-js';

import stylesChat from './TipTapNoteEditor.module.scss';
import styles from './NoteEditor.module.scss';

import { createTiptapEditor } from 'solid-tiptap';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { Gapcursor, Placeholder } from '@tiptap/extensions';
import { Node } from '@tiptap/pm/model';
import { NostrReference } from './NostrReference';
import { createStore, unwrap } from 'solid-js/store';
import { userNameFromUser } from 'src/utils/profile';
import { Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import {
  addToUserHistory,
  fetchRecomendedUsersAsync,
  fetchUserSearch,
  searchStore,
  updateSearchStore,
} from 'src/stores/SearchStore';
import tippy, { Instance } from 'tippy.js';
import SearchOption from './SearchOption';
import { nip05Verification } from 'src/utils/ui';
import { EventReference, fetchEventsFromReference } from 'src/primal_api/references';
import { Kind, mimetypes } from 'src/constants';
import EventPill from './EventPill';
import { readObject, writeObject } from 'src/db/EventDB';
import { PrimalUser } from 'src/primal';
import Avatar from '../Avatar/Avatar';

import { Video } from './VideoPlugin';
import FileHandler from '@tiptap/extension-file-handler';
import { EnhancedImage, SmartImagePasteHandler } from './UrlPasteHandlePlugin';
import { ImageGrid } from './ImageGrid';
import { autoGroupImages, autoUngroupImages, updateGridClassesDirectly } from './AutoImageGridPlugin';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import MediaEmbed from './MediaEmbedExtension';

let groupingTimeout: number | null = null;
let classUpdateTimeout: number | null = null;

export const removeDivsByUuid = (
  editor: Editor | undefined,
  uuid: string,
) => {
  if (!editor || !editor.state) return;

  const { state, view } = editor;
  const { tr, doc } = state;
  let transaction = tr;
  const matchedNodes: { pos: number, node: Node }[] = [];

  // Iterate over all nodes in the document to find matches
  doc.descendants((node, pos) => {
    if (node.type.name !== 'nostrReference') return;

    if (node.attrs.uuid === uuid) {
      // Store position and node info
      matchedNodes.push({ pos, node });
    }
  });

  // Iterate backwards through the matches to avoid position shifts during replacements
  for (let i = matchedNodes.length - 1; i >= 0; i--) {
    const { pos, node } = matchedNodes[i];

    transaction.deleteRange(pos,pos + node.nodeSize);
  }

  // Dispatch the final transaction to apply all changes
  view.dispatch(transaction);

  editor.commands.focus();
}

export const TipTapNoteEditor = (
  promptInput: HTMLDivElement,
  removeDivs: (uuid: string) => void,
  toggleMentionModal: (tab: string) => void,
  uploadFile: (files: File[]) => void,
  divId = "editor",
  editable = true,
) => {

  const [referencedEvents, setReferencedEvents] = createStore<EventReference[]>([]);
  const [mentionInProgress, setMentionInProgress] = createSignal(false);

  let mentionDebounce: number | undefined;

  const extensions = [
    StarterKit,
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      protocols: ['http', 'https'],
    }),
    Placeholder.configure({
      placeholder: 'Type your question, tag users, add references...',
      emptyEditorClass: stylesChat.isEditorEmpty,
    }),
    EnhancedImage.configure({ inline: true }),
    SmartImagePasteHandler,
    ImageGrid,
    Video,
    CodeBlock,
    Gapcursor,
    MediaEmbed,
    FileHandler.configure({
      allowedMimeTypes: [
        ...mimetypes.img,
        ...mimetypes.vid,
      ],
      onDrop: (editor, files, pos) => {
        uploadFile(files);
      },
      onPaste: (currentEditor, files, htmlContent) => {
        uploadFile(files);
      },
    }),
    NostrReference.configure({
      className: styles.userMention,
      fetchDataByReference: async (reference: string) => {
        let storedRef = await readObject(reference);

        if (storedRef) return { ...storedRef };

        const eventReference = await fetchEventsFromReference(reference);

        if (eventReference.error) return { reference };

        return { ...eventReference };
      },
      onAdd: (dataInfo: EventReference, uuid: string) => {
        const newMention = { ...dataInfo, uuid };
        setReferencedEvents((mentions) => [ ...mentions, newMention]);
        writeObject(newMention);
      },
      onRemove: (reference: string, uuid: string) => {
        setReferencedEvents((mens) => mens.filter(m => m.uuid !== uuid));
      },
      // @ts-ignore HTMLElement vs JSXElement
      renderContent: (reference: string, uuid: string) => {
        const ref = reference.startsWith('nostr:') ? reference.substring(6) : reference;

        const eventReference = referencedEvents.find(r => r.uuid === uuid);

        if (!eventReference || !eventReference.event) {
          return <div
            class={stylesChat.userMentionItem}
            data-reference={ref}
          >
            <EventPill
              reference={{
                reference: ref,
              }}
              dark={true}
            />
          </div>;
        }

        return <div>
          <EventPill
            reference={unwrap(eventReference)}
            onClick={() => removeDivs(
              uuid,
            )}
            dark={true}
          />
        </div>
      },
    }),
    Mention.configure({
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('userMention'),
        command: ({ editor, range, props }) => {
          const selUser = unwrap(searchStore.selectedUser);
          if (!selUser) return;

          const user = { ...selUser } as PrimalUser;

          const delRange = {
            from: range.from,
            to: range.from + searchStore.searchQuery.length,
          };

          updateSearchStore('searchQuery', '');
          addToUserHistory(user)

          const dataInfo: EventReference = {
            reference: user.npub,
            pk: user.pubkey,
            event: user,
            kind: Kind.Metadata,
          }

          editor
            .chain()
            .focus()
            .deleteRange({ ...delRange })
            .insertNostrReferenceAt(range, dataInfo)
            .insertContent({ type: 'text', text: ' ' })
            .run()
        },
        items: async ({ editor, query}) => {
          return new Promise((resolve) => {
            if (query.length === 0) {
              fetchRecomendedUsersAsync().then(users => {
                updateSearchStore('suggestedUsers', () => [...users]);
                resolve(users);
              });

            }
            if (mentionDebounce) {
              clearTimeout(mentionDebounce);
            }

            mentionDebounce = setTimeout(async() => {
              const users = query.length < 2 ?
                await fetchRecomendedUsersAsync() :
                await fetchUserSearch(undefined, query);

              updateSearchStore('suggestedUsers', () => [...users]);

              resolve(users);
            }, 300)
          })
        },
        render: () => {
          let component: JSXElement | undefined;
          let popups: Instance[];

          return {
            onStart: props => {
              setMentionInProgress(true);
              component = <div class={stylesChat.userSuggestions}>
                <For each={searchStore.suggestedUsers}>
                  {(suggestedUser, index) => {
                    const user = unwrap(suggestedUser);

                    return (
                      <SearchOption
                        id={`reads_suggested_user_${index()}`}
                        title={userNameFromUser(user)}
                        description={nip05Verification(user)}
                        icon={<Avatar user={user} size={36} />}
                        statNumber={user.userStats?.followers_count}
                        statLabel={"Followers"}
                        onClick={() => {
                          updateSearchStore('selectedUser', () => user);
                          addToUserHistory(user);
                          props.command({ id: user.pubkey, label: user.name })
                        }}
                        highlighted={searchStore.highlightedUser === index()}
                      />
                    );
                  }}
                </For>
              </div>

              // @ts-ignore
              popups = tippy(`#${divId}`, {
                getReferenceClientRect: props.clientRect,
                content: component,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                zIndex: 99999,
              });
            },
            onUpdate: (props) => {
              setMentionInProgress(true);
              updateSearchStore('searchQuery', () => props.query || '');
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                setMentionInProgress(false);
                popups?.[0]?.hide();

                return true;
              }

              if (props.event.key === 'ArrowDown') {
                updateSearchStore('highlightedUser', i => {
                  if (searchStore.suggestedUsers.length === 0) {
                    return 0;
                  }

                  return i < searchStore.suggestedUsers.length ? i + 1 : 0;
                });

                return true;
              }

              if (props.event.key === 'ArrowUp') {
                updateSearchStore('highlightedUser', i => {
                  if (!searchStore.suggestedUsers || searchStore.suggestedUsers.length === 0) {
                    return 0;
                  }

                  return i > 0 ? i - 1 : searchStore.suggestedUsers.length;
                });
                return true;
              }


              if (['Enter', 'Space', 'Comma', 'Tab'].includes(props.event.code)) {
                const sel = document.getElementById(`reads_suggested_user_${searchStore.highlightedUser}`);
                sel && sel.click();
                setMentionInProgress(false);

                return true;
              }

              // @ts-ignore
              return component?.ref?.onKeyDown(props)
            },
            onExit: () => {
              setMentionInProgress(false);
              popups?.[0]?.destroy();
            }
          }
        },
      },
    }),
  ];

  const editor = createTiptapEditor(() => ({
    element: promptInput!,
    editable,
    extensions,
    content: '',
    editorProps: {
      handleKeyDown: (view, event) => {
        // if (event.key === 'Enter' && !(event.ctrlKey || event.metaKey || event.shiftKey || mentionInProgress())) {
        //   event.preventDefault();
        //   document.getElementById('sendChatButton')?.click();
        //   return true;
        // }

        if (event.key === 'm' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          toggleMentionModal('users');
          // updateAppStore('showMentionModal', 'users');
          return true;
        }

        if (event.key === 'e' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          toggleMentionModal('notes');
          // updateAppStore('showMentionModal', 'notes');
          return true;
        }

        // if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        //   event.preventDefault();
        //   selectDivContent('[data-conversation=true]');
        //   // updateAppStore('showMentionModal', 'reads');
        //   return true;
        // }

        return false;
      },
    },
    onTransaction: ({ transaction, editor }) => {
        if (transaction.docChanged) {
        // Handle auto-grouping
        if (groupingTimeout) {
          clearTimeout(groupingTimeout)
        }

        groupingTimeout = setTimeout(() => {
          autoUngroupImages(editor);
          autoGroupImages(editor);
          groupingTimeout = null;
        }, 10)

        // Handle class updates independently
        if (classUpdateTimeout) {
          clearTimeout(classUpdateTimeout)
        }

        classUpdateTimeout = setTimeout(() => {
          updateGridClassesDirectly(editor)
          classUpdateTimeout = null
        }, 50) // Slightly longer delay
      }
    },
  }));

  return { editor, extensions };
}
