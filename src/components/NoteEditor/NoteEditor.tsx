import { Component, createEffect, createSignal, For, JSXElement, Match, on, Show, Switch } from 'solid-js';

import styles from './NoteEditor.module.scss';

import { Editor, generateHTML } from '@tiptap/core';
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
import { PrimalArticle, PrimalNote, PrimalUser } from 'src/primal';
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
import { TextField } from '@kobalte/core/text-field';
import { extendMarkdownEditor, MarkdownPlugin, mdToHtml } from '../ArticleEditor/markdownTransform';
import ReadsMentionDialog from '../ArticleEditor/ReadsDialogs/ReadsMentionDialog';
import ReadsImageDialog from '../ArticleEditor/ReadsDialogs/ReadsImageDialog';
import { plainTextToTiptapJson, tiptapJsonToPlainText } from './plainTextTransform';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { referencesToTags } from 'src/utils/feeds';
import { getRelayTags, relayStore } from 'src/stores/RelayStore';
import { scheduleNote, sendArticleDraft, sendNote, sendNoteDraft } from 'src/primal_api/nostr';
import ReadsPublishingDateDialog from '../ArticleEditor/ReadsDialogs/ReadsPublishingDateDialog';
import ReadsProposeDialog from '../ArticleEditor/ReadsDialogs/ReadsProposeDialog';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { longDate } from 'src/utils/date';
import { useToastContext } from 'src/context/ToastContext/ToastContext';


const NoteEditor: Component<{
  id?: string,
  onDone?: () => void,
  noteId?: string,
}> = (props) => {
  const toast = useToastContext();

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLDivElement | undefined;

  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');
  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const [editorMode, setEditorMode] = createSignal<'html' | 'text'>('html');
  const [plainContent, setPlainContent] = createSignal('');

  const [showMention, setShowMention] = createSignal(false);
  const [showAttach, setShowAttach] = createSignal(false);


  const [showPublishDateDialog, setShowPublishDateDialog] = createSignal(false);
  const [futurePublishDate, setFuturePublishDate] = createSignal<number>();
  const [editScheduled, setEditScheduled] = createSignal(false);

  const [showProposeDiaglog, setShowProposeDialog] = createSignal(false);
  const [proposedUser, setProposedUser] = createSignal<PrimalUser>();


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

  const addNoteToEditor = (note: PrimalNote | undefined, editor?: Editor) => {
    if (!editor || !note) return;

    const nevent = note.nId;

    editor
      .chain()
      .focus()
      .insertNEvent({ nevent })
      .run()
  }

  const addReadToEditor = (read: PrimalArticle | undefined, editor?: Editor) => {
    if (!editor || !read) return;

    const naddr = read.nId;

    editor
      .chain()
      .focus()
      .insertNAddr({ naddr })
      .run()
  }


  const attachImage = (src: string, title: string, alt: string) => {
    const editor = editorTipTap();

    if (!editor || src.length === 0) return;

    editor.
      chain().
      focus().
      setImage({ src, title, alt }).
      run();

    // Move cursor one space to the right to avoid overwriting the image.
    const el = document.querySelector('.tiptap.ProseMirror');
    el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  }

  const extensions = [
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

    MarkdownPlugin.configure({
      exportOnUpdate: true,
      onMarkdownUpdate: (md) => {
        // console.log('MD UPDATE: ', md)
        // props.setMarkdownContent(() => md)
        // setMarkdown(md);
      }
    }),

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
  ];

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    extensions,
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

  createEffect(on( editorMode, async (mode) => {
    if (mode === 'text') {
      const json = editorTipTap()?.getJSON();
      setPlainContent(tiptapJsonToPlainText(json));
      return;
    }

    if (mode === 'html') {
      const plainText = plainContent();

      const json = plainTextToTiptapJson(plainText);

      let html = generateHTML(json, extensions);
      html = await mdToHtml(html);
      editorTipTap()?.chain().setContent(html);
      // extendMarkdownEditor(editorTipTap()!).setMarkdown(plainText);

    }
  }));

  const getEditorContent = async (mode: 'html' | 'text') => {
    if (mode === 'html') {
      const plainText = plainContent();

      const json = plainTextToTiptapJson(plainText);

      let html = generateHTML(json, extensions);
      return await mdToHtml(html);
    }

    const json = editorTipTap()?.getJSON();
    return tiptapJsonToPlainText(json);
  }

  const proposeDraft = async (content: string, tags: string[][]) => {

    const relayTags = relayStore.all.map(r => ['r', r.url]);

    let tgs = [...tags, ...relayTags];

    const { success, note } = await sendNoteDraft(
      proposedUser()!,
      content,
      tgs,
      futurePublishDate(),
    );

    if (success && note) {
      toast?.sendSuccess('Proposal sent');
      console.log('SENT: ', note);

      // if (lastDraft.length > 0) {
      //   sendDeleteEvent(
      //     user.pubkey,
      //     lastDraft,
      //     Kind.Draft,
      //   );
      // }

      props.onDone && props.onDone();
    }
    else {
      toast?.sendWarning('Proposal sending failed');
    }
  };

  const publishNote = async () => {
    const content = await getEditorContent(editorMode());
    let tags = referencesToTags(content);

    if (proposedUser()) {
      proposeDraft(content, tags);
      return;
    }

    const relayTags = getRelayTags();
    tags = [...tags, ...relayTags];

    const pubDate = futurePublishDate();

    const { success, note } = pubDate ?
      await scheduleNote(content, tags, pubDate, editScheduled() ? props.noteId : undefined) :
      await sendNote(content, tags);

    if (success && note) {
      console.log('SENT: ', note);

      props.onDone && props.onDone();
    }

  };

  return (
    <>
      <div class={styles.editorNoteToolbar}>
        <div class={styles.contentContols}>
          <button
            id="attachFile"
            class={styles.mdToolButton}
            onClick={() => setShowAttach(true)}
            title={'attach a file'}
          >
            <div class={`${styles.attachIcon} ${styles.active}`}></div>
          </button>

          <button
            id="addMention"
            class={styles.mdToolButton}
            onClick={() => setShowMention(true)}
            title={'add a mention'}
          >
            <div class={`${styles.atIcon} ${styles.active}`}></div>
          </button>
        </div>
        <div class={styles.editorModeControls}>
          <button
            id="editorMode"
            class={`${styles.mdToolButton} ${editorMode() === 'text' ? styles.selected : ''}`}
            onClick={() => setEditorMode((mode) => mode === 'html' ? 'text' : 'html')}
            title={!editorMode() ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <div class={`${styles.modeIcon} ${styles.active}`}></div>
          </button>
        </div>
      </div>
      {/* <button onClick={() => addMentionToEditor(activeUser(), editorTipTap())}>Add Mention</button> */}
      <div
        id="tiptapNoteEditor"
        ref={tiptapEditor}
        class={`${styles.editorNote} ${editorMode() === 'text' ? 'displayNone' : ''}`}
      ></div>

      <div class={`${styles.editorPlainHolder} ${editorMode() === 'html' ? 'displayNone' : ''}`}>
        <TextField
          value={plainContent()}
          onChange={value => {
            setPlainContent(() => value || '');
          }}
        >
          <TextField.TextArea
            class={styles.editorPlain}
            ref={editorPlainText}
            autoResize={true}
          />
        </TextField>
      </div>

      <div class={styles.editorNoteFooter}>
          <div class={styles.advActions}>
            <Show
              when={!proposedUser()}
              fallback={
                <div class={styles.advSelection}>
                  <Avatar user={proposedUser()} size={16} />
                  <div class={styles.label}>
                    {userName(proposedUser()!.pubkey)}
                  </div>
                  <VerificationCheck user={proposedUser()} />
                  <button
                    class={styles.advEditButton}
                    onClick={() => setShowProposeDialog(true)}
                  >
                    Edit
                  </button>
                </div>
              }
            >
              <button
                class={styles.linkLike}
                onClick={() => {
                  setShowProposeDialog(true);
                }}
              >
                Propose to user
              </button>
            </Show>

            <Show
              when={!futurePublishDate()}
              fallback={
                <div class={styles.advSelection}>
                  <div class={styles.calendarIcon}></div>
                  <div class={styles.label}>
                    {longDate(futurePublishDate())}
                  </div>
                  <button
                    class={styles.advEditButton}
                    onClick={() => setShowPublishDateDialog(true)}
                  >
                    Edit
                  </button>
                </div>
              }
            >
              <button
                class={styles.linkLike}
                onClick={() => {
                  setShowPublishDateDialog(true);
                }}
              >
                Schedule
              </button>
            </Show>
          </div>
          <div class={styles.pubActions}>
            <ButtonSecondary
              onClick={() => {
                props.onDone && props.onDone();
              }}
            >
              Cancel
            </ButtonSecondary>

            <ButtonPrimary
              onClick={() => {
                publishNote();
              }}
            >
              <Switch fallback={<>Publish</>}>
                <Match when={proposedUser()}>
                  <>Send</>
                </Match>
                <Match when={futurePublishDate()}>
                  <>Schedule</>
                </Match>
              </Switch>
            </ButtonPrimary>
          </div>
      </div>

      <ReadsMentionDialog
        open={showMention()}
        setOpen={(v: boolean) => setShowMention(() => v)}
        onAddUser={(user: PrimalUser) => {
          addMentionToEditor(user, editorTipTap());
          setShowMention(() => false);
        }}
        onAddNote={(note: PrimalNote) => {
          addNoteToEditor(note, editorTipTap());
          setShowMention(() => false);
        }}
        onAddRead={(read: PrimalArticle) => {
          addReadToEditor(read, editorTipTap());
          setShowMention(() => false);
        }}
      />

      <ReadsImageDialog
        open={showAttach()}
        setOpen={(v: boolean) => setShowAttach(() => v)}
        editor={editorTipTap()}
        onSubmit={(url: string, title:string, alt: string) => {
          attachImage(url, title, alt);
          setShowAttach(false);
        }}
      />

      <ReadsPublishingDateDialog
        open={showPublishDateDialog()}
        setOpen={setShowPublishDateDialog}
        onSetPublishDate={(timestamp) => {
          setFuturePublishDate(timestamp);
          setShowPublishDateDialog(false);
        }}
      />

      <ReadsProposeDialog
        open={showProposeDiaglog()}
        setOpen={setShowProposeDialog}
        onAddUser={(user) => {
          setProposedUser(user);
          setShowProposeDialog(false);
        }}
      />
    </>
  );
}

export default NoteEditor;
