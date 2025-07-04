import { batch, Component, createEffect, createSignal, For, Match, onCleanup, onMount, Setter, Show, Switch } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";

import styles from './ArticleEditor.module.scss';
import { PrimalUser, PrimalNote, PrimalArticle, NostrEventContent } from "src/primal";

import { Editor } from '@tiptap/core';
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

import { createTiptapEditor } from 'solid-tiptap';
import { extendMarkdownEditor, MarkdownPlugin, mdToHtml } from "./markdownTransform";
import { AutoScrollExtension } from "./AutoScrollTipTapExtension";
import { NAddrExtension } from "./nAddrMention";
import { NProfileExtension } from "./nProfileMention";
import { NEventExtension } from "./nEventMention";
import { TextField } from "@kobalte/core/text-field";
import { useToastContext } from "src/context/ToastContext/ToastContext";
import { Progress } from "@kobalte/core/progress";
import { isRTL } from "@kobalte/core/i18n";
import { getLang, nip05Verification } from "src/utils/ui";
import UploaderBlossom from "../Uploader/UploaderBlossom";
import ArticleEditorToolbar from "./ArticleEditorToolbar";

import { accountStore, activeUser } from "src/stores/AccountStore";
import MediaEmbed from "./MediaEmbedExtension";
import ArticleFooter from "../Event/ArticleFooter";
import Avatar from "../Avatar/Avatar";
import { userName } from "src/utils/profile";
import VerificationCheck from "../VerificationCheck/VerificationCheck";
import { shortDate } from "src/utils/date";

export type ArticleEdit = {
  title: string,
  image: string,
  summary: string,
  content: string,
  keywords: string[],
  tags: string[][],
  // msg: NostrEventContent | undefined,
}

export const emptyArticleEdit = (): ArticleEdit => ({
  title: '',
  image: '',
  summary: '',
  content: '',
  keywords: [],
  tags: [],
  // msg: undefined,
});


const titleImageUploadId = 'title_image';
const contentImageUploadId = 'content_image';


const ArticleEditorPreview: Component<{
  id?: string,
  accordionSection: string[],
  markdownContent: string,
  setMarkdownContent: Setter<string>,
  article: ArticleEdit,
  articlePreview?: PrimalArticle,
  setArticle: SetStoreFunction<ArticleEdit>,
  fixedToolbar: boolean,
  setEditor: (editor: Editor) => void,
  viewMode?: boolean,
  isPhone?: boolean,
  showTableOptions: (value: boolean, position: Partial<DOMRect>) => void,
}> = (props) => {

  const toast = useToastContext();

  const [editorMarkdown, setEditorMarkdown] = createSignal(false);
  // const [markdownContent, setMarkdownContent] = createSignal<string>('')

  // const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit())

  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [fileUploadContext, setFileUploadContext] = createSignal<string | undefined>();

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const [isUploading, setIsUploading] = createSignal(false);
  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  let titleImageUpload: HTMLInputElement | undefined;

  createEffect(() => {
    const editor = editorTipTap();
    if (!editor) return;

    setEditorContent(editor, props.article.content);
  });

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLTextAreaElement | undefined;

  const viewMode = true;

  const accordionSection = () => props.accordionSection || [];

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    editable: !viewMode,
    extensions: [
      StarterKit.configure({
        dropcursor: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
      }),
      Image.configure({ inline: true }),
      CodeBlock,
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
      MediaEmbed,
      MarkdownPlugin.configure({
        exportOnUpdate: true,
      }),
      BubbleMenu.configure({
        pluginKey: 'bubbleMenuOne',
        element: document.getElementById('bubble_menu_one'),
        tippyOptions: {
          triggerTarget: document.getElementById('tableTrigger'),
          popperOptions: {
            strategy: 'fixed',
          },
        },
        shouldShow: ({ editor, view, state, oldState, from, to }) => {

          const dom = editor.view.coordsAtPos(state.selection.from);
          props.showTableOptions(editor.isActive('table'), dom);


          return false;
        },
      }),
    ],
    editorProps: { handleDOMEvents: {
      drop: (view, e) => { e.preventDefault(); },
    } },
    content: '',
    onCreate({ editor }) {
      setEditorContent(editor, props.markdownContent);
      props.setEditor(editor);
      // editor.chain().setContent('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').applyNostrPasteRules('nevent1qvzqqqqqqypzp8z8hdgslrnn927xs5v0r6yd8h70ut7vvfxdjsn6alr4n5qq8qwsqqsqf7fpdxt7qz32ve4v52pzyguccd22rwcfysp27q3h5zmvu9lp74c0edy08').focus().run();
    },
    onUpdate({ editor, transaction }) {
      props.setMarkdownContent(() => extendMarkdownEditor(editor).getMarkdown());
    },
  }));

  const setEditorContent = async (editor: Editor, content: string) => {
    let c = await mdToHtml(content);

    // c = c.replaceAll('<p></p>', '');
    // c += '<p></p>';

    editor.chain().
      setContent(c, false).
      focus().run();

    // c = c.replaceAll('<p></p>', '');
    // c += '<p></p>';

    // editor.chain().
    //   setContent(c, false).
    //   focus().run();
  }

  const [heroImgSrc, setHeroImgSrc] = createSignal('');

  createEffect(() => {
    setHeroImgSrc(() => props.article.image);
  })

  const onImageError = async (event: any) => {
    const image = event.target;
    const pubkey = accountStore.pubkey;

    if (!pubkey) return;

    // list of user's blossom servers from kind 10_063
    const userBlossoms = accountStore.blossomServers;

    // Image url from a Note
    const originalSrc = image.src || '';

    // extract the file hash
    const fileHash = originalSrc.slice(originalSrc.lastIndexOf('/') + 1)

    // Send HEAD requests to each blossom server to check if the resource is there
    const reqs = userBlossoms.map(url =>
      new Promise<string>((resolve, reject) => {
        const separator = url.endsWith('/') ? '' : '/';
        const resourceUrl = `${url}${separator}${fileHash}`;

        fetch(resourceUrl, { method: 'HEAD' }).
          then(response => {
            // Check to see if there is an image there
            if (response.status === 200) {
              resolve(resourceUrl);
            } else {
              reject('')
            }
          }).
          catch((e) => {
            reject('');
          });
      })
    );

    try {
      // Wait for at least one req to succeed
      const blossomUrl = await Promise.any(reqs);

      // If found, set image src to the blossom url
      if (blossomUrl.length > 0) {
        image.onerror = "";
        image.src = blossomUrl;
        setImageLoaded(true);
        return true;
      }
    } catch {
      setHeroImgSrc(() => '');
      setImageLoaded(false);
      return true;
    }
  };

  return (
    <div class={`${styles.articleEditor} ${props.isPhone ? styles.phoneView : styles.browserView }`}>
      <div class={styles.phoneHeader}>
        <div class={styles.time}>9:41</div>
        <div class={styles.phoneStatus}></div>
      </div>
      <div class={styles.contentPreview}>
        <div class={styles.metadataWrapperPreview} id="editor_metadata">
          <div class={styles.articleHeader}>
            <Avatar user={props.articlePreview?.user} size={38} />
            <div class={styles.userInfo}>
              <div class={styles.nameAndVerification}>
                <div class={styles.userName}>{userName(props.articlePreview?.user.pubkey)}</div>
                <VerificationCheck user={props.articlePreview?.user} />
              </div>
              <div class={styles.nip05}>
                {nip05Verification(props.articlePreview?.user)}
              </div>
            </div>
            <div
              class={styles.doFollow}
            >
              <div class={styles.zapText}>Follow</div>
            </div>
          </div>

          <div class={styles.topBar}>
            <div class={styles.date}>
              {shortDate(props.articlePreview?.published_at)} &middot; via {props.articlePreview?.client}
            </div>
          </div>

          <div class={`${styles.metadata} ${!accordionSection().includes('hero_image') ? styles.noHeroImage : ''}`}>
            <TextField
              class={styles.titleInput}
              value={props.article.title}
            >
              <TextField.TextArea
                rows={1}
                autoResize={true}
                placeholder="Title"
                readOnly={viewMode}
              />
            </TextField>

            <Show
              when={heroImgSrc().length > 0}
            >
              <div class={styles.uploadImageHolder}>
                <div
                  class={styles.uploadButton}
                >
                  <img
                    class={styles.titleImage}
                    src={heroImgSrc()}
                    onload={() => setImageLoaded(true)}
                    onError={onImageError}
                  />
                </div>
              </div>
            </Show>

            <div class={styles.summary}>
              <div class={styles.border}></div>
              <TextField
                class={styles.summaryInput}
                value={props.article.summary}
              >
                <TextField.TextArea
                  rows={1}
                  autoResize={true}
                  placeholder="Article Summary"
                  readOnly={viewMode}
                />
              </TextField>
            </div>

            <div
              class={styles.doZaps}
            >
              <div class={styles.zapIcon}></div>
              <div class={styles.zapText}>Be the first to zap this article!</div>
            </div>
          </div>

        </div>

        <div class={styles.contentEditor}>
          <div
            id="tiptapEditor"
            class={`${styles.editor} editorTipTap ${editorMarkdown() ? styles.hiddenEditor : ''} ${accordionSection().includes('metadata') ? '' : styles.topMargin}`}
            ref={tiptapEditor}
            onClick={() => editorTipTap()?.chain().focus().run()}
            dir={isRTL(getLang()) ? 'rtl' : 'ltr'}
          ></div>
        </div>

        <div class={styles.keywords}>
          <div
            class={`${styles.keywordList} ${styles.noBorder}`}
          >
            <For each={props.article.keywords}>
              {tag => (
                <div
                  class={styles.keyword}
                >
                  {tag}
                </div>
              )}
            </For>
          </div>
        </div>

        <div class={styles.articleFooter}>
          <ArticleFooter
            note={props.articlePreview!}
            size={props.isPhone ? 'phone' : 'normal'}
          />
        </div>
      </div>
      <div class={styles.bottomBar}>
        <div></div>
      </div>
    </div>
  )
}

export default ArticleEditorPreview;
