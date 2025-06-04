import { Component, createSignal, For, JSXElement } from 'solid-js';

import styles from './NoteEditor.module.scss';

import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Gapcursor from '@tiptap/extension-gapcursor';
import CodeBlock from '@tiptap/extension-code-block';

import { NAddrExtension } from "../ArticleEditor/nAddrMention";
import { NProfileExtension } from "../ArticleEditor/nProfileMention";
import { NEventExtension } from "../ArticleEditor/nEventMention";
import { createTiptapEditor } from 'solid-tiptap';
import { PrimalUser } from 'src/primal';
import { nip19 } from 'src/utils/nTools';
import { activeUser } from 'src/stores/AccountStore';
import { fetchRecomendedUsersAsync, fetchUserSearch } from 'src/stores/SearchStore';
import { createStore } from 'solid-js/store';
import { APP_ID } from 'src/App';
import tippy, { Instance } from 'tippy.js';
import SearchOption from '../Search/SearchOptions';
import { nip05Verification } from 'src/utils/ui';
import Avatar from '../Avatar/Avatar';
import { userName } from 'src/utils/profile';


const NoteEditor: Component<{
  id?: string,
}> = (props) => {

  let tiptapEditor: HTMLDivElement | undefined;

  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');
  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const addMentionToEditor = (user: PrimalUser | undefined, editor?: Editor) => {
    if (!editor || ! user) return;

    let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };

    const nprofile = nip19.nprofileEncode(pInfo);

    editor
      .chain()
      .focus()
      .insertNProfile({ nprofile, user, relays: []})
      .insertContent({ type: 'text', text: ' ' })
      .run()
  }

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    extensions: [
      Document, Paragraph, Text,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
      }),
      Image.configure({ inline: true }),
      CodeBlock,
      // Markdown.configure({
      //   html: true,
      //   breaks: false,
      //   transformPastedText: true,
      //   transformCopiedText: true,
      // }),
      NAddrExtension,
      Gapcursor,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline.configure({
        HTMLAttributes: {
          'data-underline': true,
        }
      }),
      NProfileExtension,
      NEventExtension,

      // MarkdownPlugin.configure({
      //   exportOnUpdate: true,
      //   onMarkdownUpdate: (md) => {
      //     // console.log('MD UPDATE: ', md)
      //     // props.setMarkdownContent(() => md)
      //     // setMarkdown(md);
      //   }
      // }),

      // BubbleMenu.configure({
      //   pluginKey: 'bubbleMenuOne',
      //   element: document.getElementById('bubble_menu_one'),
      //   tippyOptions: {
      //     triggerTarget: document.getElementById('tableTrigger'),
      //     popperOptions: {
      //       strategy: 'fixed',
      //     },
      //   },
      //   shouldShow: ({ editor, view, state, oldState, from, to }) => {

      //     const dom = editor.view.coordsAtPos(state.selection.from);
      //     props.showTableOptions(editor.isActive('table'), dom);


      //     return false;
      //   },
      // }),

      // AutoScrollExtension.configure({
      //   minPadding: 32,  // Minimum padding in pixels
      //   useDynamicPadding: true // Use the node height as padding
      // })

      Mention.configure({
        suggestion: {
          char: '@',
          command: ({ editor, range, props }) => {
            console.log('COMMAND: ')
            const user = selectedUser();

            if (!user) return;

            let pInfo: nip19.ProfilePointer = { pubkey: user.pubkey };
            const relays: string[] = [];//userRelays[user.pubkey] || [];

            // if (relays.length > 0) {
            //   pInfo.relays = [...relays];
            // }

            const nprofile = nip19.nprofileEncode(pInfo);

            const delRange = {
              from: range.from,
              to: range.from + searchQuery().length,
            };

            setSearchQuery(() => '');

            editor
              .chain()
              .focus()
              .deleteRange({ ...delRange })
              .insertNProfileAt(range, { nprofile, user, relays})
              .insertContent({ type: 'text', text: ' ' })
              .run()
          },
          items: async ({ editor, query}) => {
            const users = query.length < 2 ?
              await fetchRecomendedUsersAsync() :
              await fetchUserSearch(undefined, `mention_users_${APP_ID}`, query);

            // userRelays = await getUserRelays();
            setSuggestedUsers(() => [...users]);

            return users;
          },
          render: () => {
            let component: JSXElement | undefined;
            let popups: Instance[];
            console.log('RENDER')

            return {
              onStart: props => {
                component = <div>
                  <For each={suggestedUsers}>
                    {(user, index) => (
                      <SearchOption
                        id={`reads_suggested_user_${index()}`}
                        title={userName(user.pubkey)}
                        description={nip05Verification(user)}
                        icon={<Avatar user={user} size={32} />}
                        statNumber={user.userStats?.followers_count}
                        statLabel={"Followers"}
                        // @ts-ignore
                        onClick={() => {
                          setSelectedUser(() => user);
                          props.command({ id: user.pubkey, label: user.name})
                        }}
                        highlighted={highlightedUser() === index()}
                        hasBackground={true}
                      />
                    )}
                  </For>
                </div>

                // @ts-ignore
                popups = tippy('#tiptapNoteEditor', {
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
                console.log('UPDATE: ', props)
                setSearchQuery(() => props.query || '');
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popups[0]?.hide();

                  return true;
                }

                if (props.event.key === 'ArrowDown') {
                  setHighlightedUser(i => {
                    if (suggestedUsers.length === 0) {
                      return 0;
                    }

                    return i < suggestedUsers.length ? i + 1 : 0;
                  });

                  return true;
                }

                if (props.event.key === 'ArrowUp') {
                  setHighlightedUser(i => {
                    if (!suggestedUsers || suggestedUsers.length === 0) {
                      return 0;
                    }

                    return i > 0 ? i - 1 : suggestedUsers.length;
                  });
                  return true;
                }


                if (['Enter', 'Space', 'Comma', 'Tab'].includes(props.event.code)) {
                  const sel = document.getElementById(`reads_suggested_user_${highlightedUser()}`);
                  console.log('Enter: ', props)
                  sel && sel.click();

                  return true;
                }

                // @ts-ignore
                return component?.ref?.onKeyDown(props)
              },
              onExit: () => {
                popups[0]?.destroy();
              }
            }
          },
        },
      }),
    ],
    editorProps: { handleDOMEvents: {
      drop: (view, e) => { e.preventDefault(); },
    } },
    content: '',
    onCreate({ editor }) {
      // setEditorContent(editor, props.markdownContent);
      // props.setEditor(editor);
      // editor.chain().setContent('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').applyNostrPasteRules('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').focus().run();
    },
    onUpdate({ editor, transaction }) {
      // props.setMarkdownContent(() => extendMarkdownEditor(editor).getMarkdown());
    },
  }));


  return (
    <>
      <button onClick={() => addMentionToEditor(activeUser(), editorTipTap())}>Add Mention</button>
      <div
        id="tiptapNoteEditor"
        ref={tiptapEditor}
        class={styles.editorNote}
      >

      </div>
    </>
  );
}

export default NoteEditor;
