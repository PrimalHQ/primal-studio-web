import { Component, createEffect, createSignal, For, JSXElement, Match, on, onMount, Show, Switch } from 'solid-js';

import styles from './NoteEditor.module.scss';

import { Editor, generateHTML, JSONContent } from '@tiptap/core';
import { PrimalDraft, PrimalNote, PrimalUser } from 'src/primal';
import { accountStore, activeUser, saveEmoji } from 'src/stores/AccountStore';
import { addToUserHistory, updateSearchStore } from 'src/stores/SearchStore';
import { createStore } from 'solid-js/store';
import { insertIntoTextArea, nip05Verification } from 'src/utils/ui';
import Avatar from '../Avatar/Avatar';
import { userName } from 'src/utils/profile';
import { TextField } from '@kobalte/core/text-field';
import { processHTMLForNostr, processMarkdownForNostr } from '../ArticleEditor/markdownTransform';
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
import dayjs from 'dayjs';
import { fetchFeedTotals, notesStore } from 'src/pages/Notes/Notes.data';
import { deleteFromInbox } from 'src/primal_api/studio';
import { removeEventFromPageStore } from 'src/stores/PageStore';
import { doRequestDelete } from 'src/primal_api/events';
import { Kind } from 'src/constants';
import { refreshGalleryLayout } from '../ArticleEditor/AutoImageGridPlugin';
import UploaderBlossom from '../Uploader/UploaderBlossom';
import { Progress } from '@kobalte/core/progress';
import { readEmergencyNoteDraft, readNoteMediaTags, storeEmergencyNoteDraft, storeNoteMediaTags } from 'src/utils/localStore';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import ReadsChooseMediaDialog from '../ArticleEditor/ReadsDialogs/ReadsChooseMediaDialog';
import { BlobDescriptor } from 'blossom-client-sdk';

import MentionDialog from 'src/search/MentionDialog';
import { EventReference } from 'src/primal_api/references';
import { updateAppStore } from 'src/stores/AppStore';
import { TipTapNoteEditor, removeDivsByUuid } from './TipTapNoteEditor';
import { plainTextToTiptapJson, tiptapJsonToPlainText } from './plainTextTransform';

export type EditorState = {
  showMention: string,
  showChooseMediaDialog: boolean,
  fileToUpload: File | undefined,
  isUploadingFile: boolean,
};

export const initialEditorState = (): EditorState => ({
  showMention: '',
  showChooseMediaDialog: false,
  fileToUpload: undefined,
  isUploadingFile: false,
});

const NoteEditor2: Component<{
  id?: string,
  onDone?: () => void,
  note?: PrimalNote,
  draft?: PrimalDraft,
  open?: boolean,
}> = (props) => {
  const toast = useToastContext();

  let editor: () => Editor | undefined;
  let extensions: any[] = [];
  let tiptapEditor: HTMLDivElement | undefined;

  onMount(() => {
    const editorData = TipTapNoteEditor(
      tiptapEditor!,
      uuid => removeDivsByUuid(editor(), uuid),
      tab => updateEditorState('showMention', tab),
      uploadFile,
      'tiptapNoteEditor',
      true,
    );

    editor = editorData.editor;
    extensions = editorData.extensions


    setTimeout(() => {
      editor()?.chain().focus().run();
    }, 300);
  });

  const [editorState, updateEditorState] = createStore<EditorState>(initialEditorState())

  let editorPlainText: HTMLTextAreaElement | undefined;

  const [selectedUser, setSelectedUser] = createSignal<PrimalUser>();
  const [searchQuery, setSearchQuery] = createSignal('');
  const [suggestedUsers, setSuggestedUsers] = createStore<PrimalUser[]>([]);
  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const [editorMode, setEditorMode] = createSignal<'html' | 'text' | 'phone'>('html');
  const [plainContent, setPlainContent] = createSignal('');

  const [showAttach, setShowAttach] = createSignal(false);

  const [showPublishDateDialog, setShowPublishDateDialog] = createSignal(false);
  const [futurePublishDate, setFuturePublishDate] = createSignal<number>();
  const [editScheduled, setEditScheduled] = createSignal(false);

  const [showProposeDialog, setShowProposeDialog] = createSignal(false);
  const [proposedUser, setProposedUser] = createSignal<PrimalUser>();

  const [isInboxDraft, setIsInboxDraft] = createSignal(false);

  const [isPublishing, setIsPublishing] = createSignal(false);

  createEffect(on(() => [props.open, editor()], async (changes) => {
    const open = changes[0] as boolean;
    const editor = changes[1] as Editor;

    if (!open || props.note || !editor) return;

    const jsonString = readEmergencyNoteDraft(accountStore.pubkey);

    const storedMediaTags = readNoteMediaTags(accountStore.pubkey);

    mediaTags = [...storedMediaTags]

    if (jsonString === '') return;

    const json = JSON.parse(jsonString);
    let html = generateHTML(json, extensions);
    html = await processMarkdownForNostr(html);
    editor.chain().setContent(html).run();
  }));

  createEffect(on( () => [props.note, editor()], async (changes) => {
    const note = changes[0] as PrimalNote;
    const editor = changes[1] as Editor;

    if (!note || !editor) return;

    const plainText = note.content;

    setPlainContent(plainText);

    const json = plainTextToTiptapJson(plainText);

    let html = generateHTML(json, extensions);
    html = processHTMLForNostr(html);
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

  const simulatePaste = (editor: Editor | undefined, text: string) => {
    if (!editor) return;

    const { view } = editor
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', text)

    const event = new ClipboardEvent('paste', {
      clipboardData,
      bubbles: true,
      cancelable: true,
    })

    view.dom.dispatchEvent(event)
  }

  createEffect(on(editorMode, async (mode, prev) => {
    if (prev === undefined || mode === prev) return;

    if (
      ['html', 'phone'].includes(prev) &&
      ['html', 'phone'].includes(mode)
    ) {
      refreshGalleryLayout();
      editor()?.commands.focus();
      return;
    }

    const json: JSONContent = prev === 'text' ?
      plainTextToTiptapJson(plainContent()) :
      (editor()?.getJSON() || { type: 'doc', content: [] });

    console.log('JSON TEXT: ', json);
    if (mode === 'text') {
      const pt = tiptapJsonToPlainText(json);
    console.log('PLAIN TEXT: ', pt);
      setPlainContent(pt);
      return;
    }

    const pt = `${plainContent().trim()}`;


    editor()?.chain().clearContent().focus('end').run();

    setTimeout(() => {
      console.log('PLAIN TEXT E: ', pt);
      simulatePaste(editor(), pt);

      setTimeout(() => {
        editor()?.chain().focus('end')
      }, 100)
    }, 100)


    // let html = generateHTML(json, extensions);
    // html = processHTMLForNostr(html);
    // html = await processMarkdownForNostr(html);

    // editor()?.chain().setContent(html).run();

    // html = html.replaceAll('<p></p>', '');
    // html += '<p></p>';
    // editor()?.chain().setContent(html).focus('end').run();

  }));

  const getEditorContent = async (mode: 'html' | 'text' | 'phone') => {
    if (['html', 'phone'].includes(mode)) {
      const json = editor()?.getJSON();
      return tiptapJsonToPlainText(json);
    }

    return plainContent();
  }

  // const getPlainTextContent = async (mode: 'html' | 'text' | 'phone') => {
  //   if (['html', 'phone'].includes(mode)) {
  //     const plainText = plainContent();

  //     const json = plainTextToTiptapJson(plainText);

  //     let html = generateHTML(json, extensions);
  //     return await mdToHtml(html);
  //   }

  //   const json = editor()?.getJSON();
  //   return tiptapJsonToPlainText(json);
  // }

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

      storeEmergencyNoteDraft(accountStore.pubkey, '');
      storeNoteMediaTags(accountStore.pubkey, []);

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
      storeNoteMediaTags(accountStore.pubkey, []);

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
    if (isPublishing()) return;

    setIsPublishing(true);
    const content = await getEditorContent(editorMode());

    let tags = referencesToTags(content);

    let mediaTagsToAdd = mediaTags.filter(t => {
      const data = t.find(p => p.startsWith('url'));
      if (data) {
        const [_, url] = data.split(' ');

        return content.includes(url);
      }
      return false;
    });

    if (proposedUser()) {
      proposeDraft(content, [...tags, ...mediaTagsToAdd]);
      setIsPublishing(false);
      return;
    }

    const relayTags = getRelayTags();

    tags = [...tags, ...relayTags, ...mediaTagsToAdd];

    const pubDate = futurePublishDate();

    const { success, note } = pubDate ?
      await scheduleNote(content, tags, pubDate, props.note?.id) :
      await sendNote(content, tags);

    if (success && note) {

      storeEmergencyNoteDraft(accountStore.pubkey, '');
      storeNoteMediaTags(accountStore.pubkey, []);

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

    setIsPublishing(false);

  };

  let contentFileUpload: HTMLInputElement | undefined;

  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  const uploadFile = (filesToUpload?: File[]) => {
    const files = filesToUpload || contentFileUpload?.files;
    if (!files || files.length === 0) return;

    updateEditorState('fileToUpload', files[0]);
  }

  const resetUpload = () => {
    updateEditorState('fileToUpload', undefined);
    updateEditorState('isUploadingFile', false);
  };

  let mediaTags: string[][] = [];

  const attachFile = async (url: string, file: File) => {
    const { type } = file;

    if (type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const result = e.target?.result as string
        if (result === undefined || result === null) return;

        const img = document.createElement('img');
        img.src = result;

        // Get dimensions after the image is loaded
        img.onload = function() {
          const dim = `${img.width}x${img.height}`;

          mediaTags = [
            ...mediaTags,
            [
            'imeta',
            `url ${url}`,
            `m ${type}`,
            `dim ${dim}`,
            'service nip96',
          ]];

          storeNoteMediaTags(accountStore.pubkey, [ ...mediaTags]);
        };
      };
      reader.readAsDataURL(file);
    }

    if (type.startsWith('video')) {
      const video = document.createElement('video');
      video.preload = 'metadata'; // Hint to the browser to only load metadata

      video.addEventListener('loadedmetadata', () => {
        const dim = `${video.videoWidth}x${video.videoHeight}`;

        const bitrate = (8 * file.size) / video.duration;

        mediaTags = [
          ...mediaTags,
          [
            'imeta',
            `url ${url}`,
            `m ${type}`,
            `dim ${dim}`,
            `duration ${video.duration}`,
            `bitrate ${bitrate}`,
            'service nip96',
        ]];

        storeNoteMediaTags(accountStore.pubkey, [ ...mediaTags]);

        URL.revokeObjectURL(video.src);
      });

      video.src = URL.createObjectURL(file);
    }
  }

  return (
    <>
      <div class={styles.editorNoteToolbar}>
        <div class={styles.contentContols}>
          <DropdownMenu gutter={2}
            onOpenChange={(open) => {
              const d = document.querySelector('[data-new-note-dialog]');
              if (!d) return;

              if (open) {
                // @ts-ignore
                d.style = 'padding-right: 6px;';
              }
              else {
                // @ts-ignore
                d.style = 'padding-right: 0;';
              }
            }}
          >
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
                      updateEditorState('showChooseMediaDialog', true);
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


          <DropdownMenu gutter={2}
            onOpenChange={(open) => {
              const d = document.querySelector('[data-new-note-dialog]');
              if (!d) return;

              if (open) {
                // @ts-ignore
                d.style = 'padding-right: 6px;';
              }
              else {
                // @ts-ignore
                d.style = 'padding-right: 0;';
              }
            }}
          >
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
                      updateEditorState('showMention', 'users');
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
                      updateEditorState('showMention', 'notes');
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
                      updateEditorState('showMention', 'reads');
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

              editor()?.chain().focus().insertContent(emoji.name).run();
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
          file={editorState.fileToUpload}
          cancelSignal={!props.open}
          onFail={() => {
            toast?.sendWarning(`upload_fail ${editorState.fileToUpload?.name}`);
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
              editor()?.chain().focus().insertContent([
                { type: 'image', attrs: { src: url }},
                {type: 'text', text: ' '},
              ]).run();
            }

            if (file.type.startsWith('video')) {

              editor()?.chain().focus().insertContent([
                { type: 'video', attrs: { src: url }},
                {type: 'text', text: ' '},
              ]).run();
            }

            attachFile(url, file);

          }}
          onStart={(_, cancelUpload) => {
            updateEditorState('isUploadingFile', true);
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
                  storeNoteMediaTags(accountStore.pubkey, []);
                }, 0);
              }}
            >
              Cancel
            </ButtonSecondary>

            <ButtonPrimary
              onClick={() => {
                publishNote();
              }}
              loading={isPublishing()}
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

      <MentionDialog
        open={editorState.showMention}
        setOpen={(v: boolean) => updateEditorState('showMention', () => v ? 'users' : '')}
        onClose={() => {
          editor()?.chain().focus().run();
        }}
        onAddUser={(user, relays) => {
          const ed = editor();

          if (!ed) return;
          const { state } = ed.view;
          const { from, to } = state.selection;

          const range = { from, to };

          updateSearchStore('searchQuery', '');
          addToUserHistory(user)

          const userInfo: EventReference = {
            reference: user.npub,
            pk: user.pubkey,
            event: user,
            kind: Kind.Metadata,
          }

          ed
            .chain()
            .focus()
            .insertNostrReferenceAt(range, userInfo)
            .insertContent({ type: 'text', text: ' ' })
            .run()

          updateAppStore('showMentionModal', '');
        }}
        onAddNote={(note) => {
          const ed = editor();

          if (!ed) return;
          const { state } = ed.view;
          const { from, to } = state.selection;

          const range = { from, to };

          updateSearchStore('searchQuery', '');

          const dataInfo: EventReference = {
            reference: note.nId,
            pk: note.id,
            event: note,
            kind: Kind.Text,
          }

          ed
            .chain()
            .focus()
            .insertNostrReferenceAt(range, dataInfo)
            .insertContent({ type: 'text', text: ' ' })
            .run()

          updateAppStore('showMentionModal', '');
        }}
        onAddRead={(read) => {
          const ed = editor();

          if (!ed) return;
          const { state } = ed.view;
          const { from, to } = state.selection;

          const range = { from, to };

          updateSearchStore('searchQuery', '');

          const dataInfo: EventReference = {
            reference: read.nId,
            pk: read.id,
            event: read,
            kind: Kind.LongForm,
          }

          ed
            .chain()
            .focus()
            .insertNostrReferenceAt(range, dataInfo)
            .insertContent({ type: 'text', text: ' ' })
            .run()

          updateAppStore('showMentionModal', '');
        }}
      />

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
        open={editorState.showChooseMediaDialog}
        setOpen={v => updateEditorState('showChooseMediaDialog', v)}
        onSelect={(blob: BlobDescriptor) => {
          updateEditorState('showChooseMediaDialog', false);

          console.log('SELECTED: ', blob.url)

          if (blob.type?.startsWith('image')) {
            editor()?.chain().focus().setImage({ src: blob.url }).run();
            editor()?.chain().focus('end').run();
          }

          if (blob.type?.startsWith('video')) {
            editor()?.chain().focus().setVideo({ src: blob.url }).run();
            editor()?.chain().focus('end').run();
          }
        }}
      />
    </>
  );
}

export default NoteEditor2;
