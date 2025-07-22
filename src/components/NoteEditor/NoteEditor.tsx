import { Component, createEffect, createSignal, For, JSXElement, Match, on, Show, Switch } from 'solid-js';

import styles from './NoteEditor.module.scss';

import { Editor, generateHTML, JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
// import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Gapcursor from '@tiptap/extension-gapcursor';
import CodeBlock from '@tiptap/extension-code-block';
import FileHandler from '@tiptap/extension-file-handler';
import { PluginKey } from '@tiptap/pm/state';

import { NAddrExtension } from "../ArticleEditor/nAddrMention";
import { NProfileExtension } from "../ArticleEditor/nProfileMention";
import { NEventExtension } from "../ArticleEditor/nEventMention";
import { createTiptapEditor } from 'solid-tiptap';
import { PrimalArticle, PrimalDraft, PrimalNote, PrimalUser } from 'src/primal';
import { nip19 } from 'src/utils/nTools';
import { accountStore, activeUser, saveEmoji } from 'src/stores/AccountStore';
import { addToUserHistory, fetchRecomendedUsersAsync, fetchUserSearch } from 'src/stores/SearchStore';
import { createStore } from 'solid-js/store';
import { APP_ID } from 'src/App';
import tippy, { Instance } from 'tippy.js';
import SearchOption from '../Search/SearchOptions';
import { insertIntoTextArea, nip05Verification } from 'src/utils/ui';
import Avatar from '../Avatar/Avatar';
import { userName } from 'src/utils/profile';
import { TextField } from '@kobalte/core/text-field';
import { MarkdownPlugin, mdToHtml, processHTMLForNostr, processMarkdownForNostr } from '../ArticleEditor/markdownTransform';
import ReadsMentionDialog from '../ArticleEditor/ReadsDialogs/ReadsMentionDialog';
import ReadsImageDialog from '../ArticleEditor/ReadsDialogs/ReadsImageDialog';
import { plainTextToTiptapJson, tiptapJsonToPlainText } from './plainTextTransform';
import ButtonSecondary from '../Buttons/ButtonSecondary';
import ButtonPrimary from '../Buttons/ButtonPrimary';
import { referencesToTags } from 'src/utils/feeds';
import { getRelayTags, relayStore } from 'src/stores/RelayStore';
import { scheduleNote, sendNote, sendNoteDraft } from 'src/primal_api/nostr';
import ReadsPublishingDateDialog from '../ArticleEditor/ReadsDialogs/ReadsPublishingDateDialog';
import ReadsProposeDialog from '../ArticleEditor/ReadsDialogs/ReadsProposeDialog';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { longDate } from 'src/utils/date';
import { useToastContext } from 'src/context/ToastContext/ToastContext';
import EmojiButton from '../EmojiPicker/EmojiButton';
import MediaEmbed from '../ArticleEditor/MediaEmbedExtension';
import dayjs from 'dayjs';
import { fetchFeedTotals, notesStore } from 'src/pages/Notes/Notes.data';
import { deleteFromInbox } from 'src/primal_api/studio';
import { removeEventFromPageStore } from 'src/stores/PageStore';
import { doRequestDelete } from 'src/primal_api/events';
import { Kind, mimetypes } from 'src/constants';
import { ImageGrid } from '../ArticleEditor/ImageGrid';
import { autoGroupImages, autoUngroupImages, refreshGalleryLayout, updateGridClassesDirectly } from '../ArticleEditor/AutoImageGridPlugin';
import { Video } from '../ArticleEditor/VideoPlugin';
import { EnhancedImage, SmartImagePasteHandler } from '../ArticleEditor/UrlPasteHandlePlugin';
import UploaderBlossom from '../Uploader/UploaderBlossom';
import { Progress } from '@kobalte/core/progress';
import { readEmergencyNoteDraft, storeEmergencyNoteDraft } from 'src/utils/localStore';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import ReadsChooseMediaDialog from '../ArticleEditor/ReadsDialogs/ReadsChooseMediaDialog';
import { BlobDescriptor } from 'blossom-client-sdk';

let groupingTimeout: number | null = null;
let classUpdateTimeout: number | null = null;

const NoteEditor: Component<{
  id?: string,
  onDone?: () => void,
  note?: PrimalNote,
  draft?: PrimalDraft,
  open?: boolean,
}> = (props) => {
  const toast = useToastContext();

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLTextAreaElement | undefined;

  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');
  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const [editorMode, setEditorMode] = createSignal<'html' | 'text' | 'phone'>('html');
  const [plainContent, setPlainContent] = createSignal('');

  const [showMention, setShowMention] = createSignal('');
  const [showAttach, setShowAttach] = createSignal(false);

  const [showPublishDateDialog, setShowPublishDateDialog] = createSignal(false);
  const [futurePublishDate, setFuturePublishDate] = createSignal<number>();
  const [editScheduled, setEditScheduled] = createSignal(false);

  const [showProposeDialog, setShowProposeDialog] = createSignal(false);
  const [proposedUser, setProposedUser] = createSignal<PrimalUser>();

  const [showChooseMediaDialog, setShowChooseMediaDialog] = createSignal(false);

  const [isInboxDraft, setIsInboxDraft] = createSignal(false);

  createEffect(() => {
    if (!props.open) {
      resetUpload();
    }
  })

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

  const attachVideo = (src: string, metadata: any) => {
    const editor = editorTipTap();

    if (!editor || src.length === 0) return;

    let opts: any = {
      src,
      controls: true,
    }

    if (metadata.videoWidth && metadata.videoHeight) {
      let w = metadata.videoWidth;
      let h = metadata.videoHeight;

      let ratio = w / h;

      opts.ratio = ratio < 1 ? 'portrait' : 'landscape';
    }

    editor.
      chain().
      focus().
      setVideo(opts).
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
    Video,
    EnhancedImage.configure({ inline: true }),
    SmartImagePasteHandler,
    ImageGrid,
    CodeBlock,
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
        pluginKey: new PluginKey('userMention'),
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

          addToUserHistory(user)

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
              component = <div class={styles.userSuggestions}>
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
                      // hasBackground={true}
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
    MediaEmbed,
  ];

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    extensions,
    // editorProps: { handleDOMEvents: {
    //   drop: (view, e) => { e.preventDefault(); },
    // } },
    content: '',
    onCreate: ({ editor }) => {
      editor.chain().focus().run();
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      storeEmergencyNoteDraft(accountStore.pubkey, JSON.stringify(json));
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

  createEffect(on(() => [props.open, editorTipTap()], async (changes) => {
    const open = changes[0] as boolean;
    const editor = changes[1] as Editor;

    if (!open || props.note || !editor) return;

    const jsonString = readEmergencyNoteDraft(accountStore.pubkey);

    if (jsonString === '') return;

    const json = JSON.parse(jsonString);
    let html = generateHTML(json, extensions);
    html = await processMarkdownForNostr(html);
    editor.chain().setContent(html).run();
  }));

  createEffect(on( () => [props.note, editorTipTap()], async (changes) => {
    const note = changes[0] as PrimalNote;
    const editor = changes[1] as Editor;

    if (!note || !editor) return;

    const plainText = note.content;

    setPlainContent(plainText);

    const json = plainTextToTiptapJson(plainText);

    let html = generateHTML(json, extensions);
    html = await processMarkdownForNostr(html);
    editor.chain().setContent(html).run();

    if (note.created_at > dayjs().unix()) {
      setFuturePublishDate(() => note.created_at)
    }

  }));

  createEffect(on( () => props.draft, async (draft) => {
    if (!draft) return;

    const isMyDraft = accountStore.pubkey === draft.sender.pubkey;

    setIsInboxDraft(!isMyDraft);
  }));

  createEffect(on(editorMode, async (mode, prev) => {
    if (prev === undefined || mode === prev) return;

    if (
      ['html', 'phone'].includes(prev) &&
      ['html', 'phone'].includes(mode)
    ) {
      refreshGalleryLayout();
      editorTipTap()?.commands.focus();
      return;
    }

    const json: JSONContent = prev === 'text' ?
      plainTextToTiptapJson(plainContent()) :
      (editorTipTap()?.getJSON() || { type: 'doc', content: [] });

    if (mode === 'text') {
      setPlainContent(tiptapJsonToPlainText(json));
      return;
    }

    let html = generateHTML(json, extensions);
    html = processHTMLForNostr(html);
    html = await processMarkdownForNostr(html);

    editorTipTap()?.chain().setContent(html, false).run();

    html = html.replaceAll('<p></p>', '');
    html += '<p></p>';
    editorTipTap()?.chain().setContent(html, false).focus().run();

  }));

  const getEditorContent = async (mode: 'html' | 'text' | 'phone') => {
    if (['html', 'phone'].includes(mode)) {
      const json = editorTipTap()?.getJSON();
      return tiptapJsonToPlainText(json);
    }

    return plainContent();
  }

  const getPlainTextContent = async (mode: 'html' | 'text' | 'phone') => {
    if (['html', 'phone'].includes(mode)) {
      const plainText = plainContent();

      const json = plainTextToTiptapJson(plainText);

      let html = generateHTML(json, extensions);
      return await mdToHtml(html);
    }

    const json = editorTipTap()?.getJSON();
    return tiptapJsonToPlainText(json);
  }


  const saveDraft = async () => {
    const user = activeUser();

    if (!user) return;

    const content = await getEditorContent(editorMode());

    let tags = referencesToTags(content);

    const relayTags = getRelayTags();

    let tgs = [...tags, ...relayTags];

    const { success, note } = await sendNoteDraft(
      user,
      content,
      tgs,
    );

    if (success && note) {
      toast?.sendSuccess('Saved draft');

      fetchFeedTotals(accountStore.pubkey, {
        since: notesStore.graphSpan.since(),
        until: notesStore.graphSpan.until(),
        kind: 'notes'
      });

      const draft = props.draft;
      if (draft && isInboxDraft()) {
        await deleteFromInbox([draft.id]);

        removeEventFromPageStore(draft.id, 'drafts');
      }

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

      storeEmergencyNoteDraft(accountStore.pubkey, '');

      fetchFeedTotals(accountStore.pubkey, {
        since: notesStore.graphSpan.since(),
        until: notesStore.graphSpan.until(),
        kind: 'notes'
      });

      const draft = props.draft;
      if (draft && isInboxDraft()) {
        await deleteFromInbox([draft.id]);

        removeEventFromPageStore(draft.id, 'drafts');
      }
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
      await scheduleNote(content, tags, pubDate, props.note?.id) :
      await sendNote(content, tags);

    if (success && note) {

      storeEmergencyNoteDraft(accountStore.pubkey, '');

      const draft = props.draft;

      if (draft) {

        if (isInboxDraft()) {
          await deleteFromInbox([draft.id]);
        }

        await doRequestDelete(accountStore.pubkey, draft.id, Kind.Draft);

        removeEventFromPageStore(draft.id, 'drafts');
      }

      fetchFeedTotals(accountStore.pubkey, {
        since: notesStore.graphSpan.since(),
        until: notesStore.graphSpan.until(),
        kind: 'notes'
      });

      props.onDone && props.onDone();
    }

  };

  let contentFileUpload: HTMLInputElement | undefined;

  const [fileToUpload, setFileToUpload] = createSignal<File>();
  const [isUploading, setIsUploading] = createSignal(false);
  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  const uploadFile = (filesToUpload?: File[]) => {
    const files = filesToUpload || contentFileUpload?.files;
    if (!files || files.length === 0) return;

    setFileToUpload(files[0]);
  }

  const resetUpload = () => {
    setFileToUpload(undefined);
    setIsUploading(false);
  };

  return (
    <>
      <div class={styles.editorNoteToolbar}>
        <div class={styles.contentContols}>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button
                id="attachFile"
                class={`${styles.mdToolButton} ${styles.long}`}
              >
                <div class={`${styles.attachIcon} ${styles.active}`}></div>
                <div class={`${styles.chevronIcon} ${styles.active}`}></div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                class={styles.editorMenu}
              >
                <DropdownMenu.Item
                  onSelect={() => contentFileUpload?.click()}
                  title={'attach a file'}
                  class={styles.editorMenuItem}
                >
                  <input
                    id="upload-new-media"
                    type="file"
                    onChange={() => uploadFile()}
                    ref={contentFileUpload}
                    hidden={true}
                    accept="image/*,video/*,audio/*"
                  />
                  <div>Upload media...</div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    setTimeout(() => {
                      setShowChooseMediaDialog(true);
                    }, 100)
                  }}
                  title={'attach a file'}
                  class={styles.editorMenuItem}
                >
                  <div>Add from Media Server...</div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>


          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button
                id="attachFile"
                class={`${styles.mdToolButton} ${styles.long}`}
              >
                <div class={`${styles.atIcon} ${styles.active}`}></div>
                <div class={`${styles.chevronIcon} ${styles.active}`}></div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                class={styles.editorMenu}
              >
                <DropdownMenu.Item
                  onSelect={() => {
                    setTimeout(() => {
                      setShowMention('users');
                    }, 100)
                  }}
                  title={'add a user mention'}
                  class={styles.editorMenuItem}
                >
                  <div>Add User Mention...</div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    setTimeout(() => {
                      setShowMention('notes');
                    }, 100)
                  }}
                  title={'add a note mention'}
                  class={styles.editorMenuItem}
                >
                  <div>Add Note Mention...</div>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    setTimeout(() => {
                      setShowMention('reads');
                    }, 100)
                  }}
                  title={'add a article mention'}
                  class={styles.editorMenuItem}
                >
                  <div>Add Article Mention...</div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu>

          <EmojiButton
            class={`${styles.mdToolButton} ${styles.long}`}
            onSelect={((emoji) => {
              saveEmoji(emoji);
              if (editorMode() === 'text') {
                if (!editorPlainText) return;

                const position = editorPlainText.selectionStart;

                insertIntoTextArea(editorPlainText, emoji.name, position);
                editorPlainText.dispatchEvent(new Event('input', { bubbles: true }));
                return;
              }

              editorTipTap()?.chain().focus().insertContent(emoji.name).run();
            })}
            extended={true}
          />
        </div>
        <div class={styles.editorModeControls}>
          <button
            id="htmlMode"
            class={`${styles.mdToolButton} ${editorMode() === 'html' ? styles.selected : ''}`}
            onClick={() => setEditorMode('html')}
            title={!editorMode() ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <div class={`${styles.htmlModeIcon} ${styles.active}`}></div>
          </button>

          <button
            id="phoneMode"
            class={`${styles.mdToolButton} ${editorMode() === 'phone' ? styles.selected : ''}`}
            onClick={() => setEditorMode('phone')}
            title={!editorMode() ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <div class={`${styles.phoneModeIcon} ${styles.active}`}></div>
          </button>

          <button
            id="textMode"
            class={`${styles.mdToolButton} ${editorMode() === 'text' ? styles.selected : ''}`}
            onClick={() => setEditorMode('text')}
            title={!editorMode() ? 'switch to wysiwyg mode' : 'switch to plain text mode'}
          >
            <div class={`${styles.textModeIcon} ${styles.active}`}></div>
          </button>
        </div>
      </div>
      <div class={`${styles.editorHtmlHolder} ${styles[`mode_${editorMode()}`]} ${editorMode() === 'text' ? 'displayNone' : ''}`}>
        <div>
          <Show
            when={editorMode() === 'phone'}
            fallback={<Avatar user={activeUser()} size={42} />}
          >
            <div class={styles.phoneHeader}>
              <Avatar user={activeUser()} size={36} />
              <div class={styles.authorInfo}>
                <div class={styles.userName}>{userName(accountStore.pubkey)}</div>
                <VerificationCheck user={activeUser()} />
                <div class={styles.nip05}>{nip05Verification(activeUser())}</div>
                <div class={styles.nip05}>&middot;</div>
                <div class={styles.nip05}>now</div>
              </div>
            </div>
          </Show>
          <div
            id="tiptapNoteEditor"
            ref={tiptapEditor}
            class={`${styles.editorNote} ${styles[`mode_${editorMode()}`]}`}
          ></div>
        </div>
      </div>

      <div class={`${styles.editorPlainHolder} ${editorMode() !== 'text' ? 'displayNone' : ''}`}>
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

      <div class={styles.editorNoteUploader}>
        <UploaderBlossom
          uploadId="upload_content_image"
          hideLabel={false}
          publicKey={accountStore.pubkey}
          nip05={activeUser()?.nip05}
          file={fileToUpload()}
          cancelSignal={!props.open}
          onFail={() => {
            toast?.sendWarning(`upload_fail ${fileToUpload()?.name}`);
            resetUpload();
          }}
          onRefuse={(reason: string) => {
            if (reason === 'file_too_big_100') {
              toast?.sendWarning('file_too_big_100');
            }
            if (reason === 'file_too_big_1024') {
              toast?.sendWarning('file_too_big_1024');
            }
            resetUpload();
          }}
          onCancel={() => {
            resetUpload();
          }}
          onSuccess={(url:string, uploadId?: string, file?: File) => {
            resetUpload();

            if (!file) return;

            if (file.type.startsWith('image')) {
              editorTipTap()?.chain().focus().setImage({ src: url }).run();
            }

            if (file.type.startsWith('video')) {
              editorTipTap()?.chain().focus().setVideo({ src: url }).run();
            }

          }}
          onStart={(_, cancelUpload) => {
            setIsUploading(true);
            setImageLoaded(false);
            setCancelUploading(() => cancelUpload);
          }}
          progressBar={(uploadState) => {
            return (
              <Progress value={uploadState.progress} class={styles.uploadProgress}>
                <div class={styles.progressTrackContainer}>
                  <Progress.Track class={styles.progressTrack}>
                    <Progress.Fill
                      class={`${styles.progressFill}`}
                    />
                  </Progress.Track>
                </div>
              </Progress>
            );
          }}
        />
      </div>

      <div class={styles.editorNoteFooter}>
          <div class={styles.advActions}>
            <Show
              when={!proposedUser()}
              fallback={
                <div class={styles.advSelection} title={userName(proposedUser()!.pubkey)}>
                  <Avatar user={proposedUser()} size={16} />
                  <div class={styles.labelUser}>
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

            <button
              class={styles.linkLike}
              onClick={() => {
                saveDraft();
              }}
            >
              Save Draft
            </button>
          </div>
          <div class={styles.pubActions}>
            <ButtonSecondary
              onClick={() => {
                props.onDone && props.onDone();

                setTimeout(() => {
                  storeEmergencyNoteDraft(accountStore.pubkey, '');
                }, 0);
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
        setOpen={(v: boolean) => setShowMention(() => v ? 'users' : '')}
        onAddUser={(user: PrimalUser) => {
          addMentionToEditor(user, editorTipTap());
          setShowMention(() => '');
        }}
        onAddNote={(note: PrimalNote) => {
          addNoteToEditor(note, editorTipTap());
          setShowMention(() => '');
        }}
        onAddRead={(read: PrimalArticle) => {
          addReadToEditor(read, editorTipTap());
          setShowMention(() => '');
        }}
      />

      {/* <ReadsImageDialog
        open={showAttach()}
        setOpen={(v: boolean) => setShowAttach(() => v)}
        editor={editorTipTap()}
        onSubmit={(url: string, title:string, alt: string, fileType: string, metadata: any) => {
          if (fileType.startsWith('image')) {
            attachImage(url, title, alt);
          }

          if (fileType.startsWith('video')) {
            attachVideo(url, metadata);
          }

          setShowAttach(false);
        }}
      /> */}

      <ReadsPublishingDateDialog
        open={showPublishDateDialog()}
        setOpen={setShowPublishDateDialog}
        initialValue={props.note?.created_at}
        onSetPublishDate={(timestamp) => {
          setFuturePublishDate(timestamp);
          setShowPublishDateDialog(false);
        }}
      />

      <ReadsProposeDialog
        open={showProposeDialog()}
        setOpen={setShowProposeDialog}
        onAddUser={(user) => {
          setProposedUser(user);
          setShowProposeDialog(false);
        }}
      />

      <ReadsChooseMediaDialog
        open={showChooseMediaDialog()}
        setOpen={setShowChooseMediaDialog}
        onSelect={(blob: BlobDescriptor) => {
          setShowChooseMediaDialog(false);

          if (blob.type?.startsWith('image')) {
            editorTipTap()?.chain().focus().setImage({ src: blob.url }).run();
          }

          if (blob.type?.startsWith('video')) {
            editorTipTap()?.chain().focus().setVideo({ src: blob.url }).run();
          }
        }}
      />
    </>
  );
}

export default NoteEditor;
