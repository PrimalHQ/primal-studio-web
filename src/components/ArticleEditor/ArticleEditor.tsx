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
import { TableKit } from '@tiptap/extension-table';
// import TableCell from '@tiptap/extension-table-cell';
// import TableHeader from '@tiptap/extension-table-header';
// import TableRow from '@tiptap/extension-table-row';
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
import { getLang } from "src/utils/ui";
import UploaderBlossom from "../Uploader/UploaderBlossom";
import ArticleEditorToolbar from "./ArticleEditorToolbar";

import { accountStore, activeUser } from "src/stores/AccountStore";
import MediaEmbed from "./MediaEmbedExtension";

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


const ArticleEditor: Component<{
  id?: string,
  accordionSection: string[],
  markdownContent: string,
  setMarkdownContent: Setter<string>,
  article: ArticleEdit,
  setArticle: SetStoreFunction<ArticleEdit>,
  fixedToolbar: boolean,
  setEditor: (editor: Editor) => void,
  showTableOptions: (value: boolean, position: Partial<DOMRect>) => void,
  viewMode?: boolean,
}> = (props) => {

  const toast = useToastContext();

  const [editorMarkdown, setEditorMarkdown] = createSignal(false);

  const [openUploadSockets, setOpenUploadSockets] = createSignal(false);
  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();
  const [fileUploadContext, setFileUploadContext] = createSignal<string | undefined>();

  const [highlightedUser, setHighlightedUser] = createSignal<number>(0);

  const [isUploading, setIsUploading] = createSignal(false);
  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  let titleImageUpload: HTMLInputElement | undefined;

  const [viewMode, setViewMode] = createSignal(false);

  createEffect(() => {
    const editor = editorTipTap();
    if (!editor) return;

    setEditorContent(editor, props.article.content);

  });

  createEffect(() => {
    editorTipTap()?.setEditable(!(props.viewMode || false));
    setViewMode(props.viewMode || false);
  })

  let tiptapEditor: HTMLDivElement | undefined;
  let editorPlainText: HTMLTextAreaElement | undefined;

  let users: PrimalUser[] = [];

  const accordionSection = () => props.accordionSection || [];

  const editorTipTap = createTiptapEditor(() => ({
    element: tiptapEditor!,
    editable: location.pathname.includes('/view/draft'),
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
      TableKit.configure({
        table : {
          resizable: false,
        }
      }),
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
        options: {
          strategy: 'fixed',
        },
        shouldShow: ({ editor, view, state, oldState, from, to }) => {

          const dom = editor.view.coordsAtPos(state.selection.from);
          props.showTableOptions(editor.isActive('table'), dom);


          return false;
        },
      }),

      AutoScrollExtension.configure({
        minPadding: 32,  // Minimum padding in pixels
        useDynamicPadding: true // Use the node height as padding
      })
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
      const c = extendMarkdownEditor(editor).getMarkdown();
      props.setMarkdownContent(() => c || props.markdownContent);
    },
  }));

  const setEditorContent = async (editor: Editor, content: string) => {
    let c = await mdToHtml(content);


    editor.chain().
      setContent(c, { emitUpdate: false }).
      focus().run();
  }


  const resetUpload = (uploadId?: string) => {
    const id = fileUploadContext();

    if (id !== uploadId) return;

    if (titleImageUpload && id === titleImageUploadId) {
      titleImageUpload.value = '';
    }

    batch(() => {
      setFileToUpload(undefined);
      setFileUploadContext(undefined);
      setIsUploading(false);
      setCancelUploading(undefined);
    })
  };

  const onUploadTitleImage = (fileUpload: HTMLInputElement | undefined) => {

    if (!fileUpload) {
      return;
    }

    const file = fileUpload.files ? fileUpload.files[0] : null;

    if (!file) return;

    batch(() => {
      setFileToUpload(file);
      setFileUploadContext(titleImageUploadId);
    })
  }

  const onUploadContent = (file: File) => {
    batch(() => {
      setFileToUpload(file);
      setFileUploadContext(contentImageUploadId);
    })
  }

  onMount(() => {
    setOpenUploadSockets(true);
  });

  onCleanup(() => {
    setOpenUploadSockets(false);
  });

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
    <div class={styles.articleEditor}>
      <Show when={accordionSection().includes('metadata')}>
        <div class={styles.metadataWrapper} id="editor_metadata">
          <div class={`${styles.metadata} ${!accordionSection().includes('hero_image') ? styles.noHeroImage : ''}`}>
            <TextField
              class={styles.titleInput}
              value={props.article.title}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.code === 'Enter') {
                  e.preventDefault();
                }
              }}
              onChange={(v) => {
                props.setArticle('title', () => v);
              }}
              readOnly={viewMode()}
            >
              <TextField.TextArea
                rows={1}
                autoResize={true}
                placeholder="Title"
              />
            </TextField>

            <Show when={accordionSection().includes('hero_image')}>
              <div class={styles.uploadImageHolder}>
                <Switch>
                  <Match
                    when={isUploading()}
                  >
                    <div
                      class={styles.uploadingOverlay}
                      onClick={() => {
                        const canc = cancelUploading();
                        resetUpload(titleImageUploadId);
                        canc && canc();
                      }}
                    >
                      <div>Cancel Upload</div>
                      <div class={styles.closeBtn}>
                        <div class={styles.closeIcon}></div>
                      </div>
                    </div>
                  </Match>

                  <Match
                    when={heroImgSrc().length > 0}
                  >
                    <div
                      class={styles.uploadButton}
                    >
                      <Show when={imageLoaded() && !viewMode()}>
                        <div
                          class={styles.uploadOverlay}
                          onClick={() => {
                            document.getElementById('upload-title-image')?.click();
                          }}
                        >
                          <div
                            class={styles.closeBtn}
                            onClick={(e: MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              props.setArticle('image', () => '');
                              setImageLoaded(false);
                              document.getElementById('upload-title-image')?.click();
                            }}
                          >
                            <div class={styles.closeIcon}></div>
                          </div>
                          <div>Change hero Image</div>
                        </div>
                      </Show>
                      <input
                        id="upload-title-image"
                        type="file"
                        onChange={() => {
                          if (viewMode()) return;
                          onUploadTitleImage(titleImageUpload);
                        }}
                        ref={titleImageUpload}
                        hidden={true}
                        accept="image/*"
                        disabled={viewMode()}
                      />
                      <img
                        class={styles.titleImage}
                        src={heroImgSrc()}
                        onload={() => setImageLoaded(true)}
                        onError={onImageError}
                      />
                    </div>
                  </Match>

                  <Match
                    when={heroImgSrc().length === 0}
                  >
                    <div class={styles.noTitleImagePlaceholder}>
                      <input
                        id="upload-avatar"
                        type="file"
                        onChange={() => {
                          if (viewMode()) return;
                          onUploadTitleImage(titleImageUpload);
                        }}
                        ref={titleImageUpload}
                        hidden={true}
                        accept="image/*"
                        disabled={viewMode()}
                      />
                      <label for="upload-avatar">
                        Add hero Image
                      </label>
                    </div>
                  </Match>
                </Switch>

                <UploaderBlossom
                  uploadId={fileUploadContext()}
                  hideLabel={true}
                  publicKey={accountStore.pubkey}
                  nip05={activeUser()?.nip05}
                  file={fileToUpload()}
                  onFail={(_, uploadId?: string) => {
                    toast?.sendWarning(`upload_fail ${fileToUpload()?.name}`);
                    resetUpload(uploadId);
                  }}
                  onRefuse={(reason: string, uploadId?: string) => {
                    if (reason === 'file_too_big_100') {
                      toast?.sendWarning('file_too_big_100');
                    }
                    if (reason === 'file_too_big_1024') {
                      toast?.sendWarning('file_too_big_1024');
                    }
                    resetUpload(uploadId);
                  }}
                  onCancel={(uploadId?: string) => {
                    resetUpload(uploadId);
                  }}
                  onSuccess={(url:string, uploadId?: string) => {
                    if (uploadId === titleImageUploadId) {
                      props.setArticle('image', () => url);
                    }

                    if (uploadId === contentImageUploadId) {
                      const ed = editorTipTap();
                      if (!ed) return;

                      ed.
                        chain().
                        focus().
                        setImage({
                          src: url,
                          title: 'image',
                          alt: 'image alternative',
                        }).
                        run();

                      // Move cursor one space to the right to avoid overwriting the image.
                      const el = document.querySelector('.tiptap.ProseMirror');
                      el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight'}))
                    }

                    resetUpload(uploadId);
                  }}
                  onStart={(_, cancelUpload) => {
                    setIsUploading(true);
                    setImageLoaded(false);
                    setCancelUploading(() => cancelUpload);
                  }}
                  progressBar={(uploadState, resetUploadState) => {

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
            </Show>

            <div class={styles.summary}>
              <div class={styles.border}></div>
              <TextField
                class={styles.summaryInput}
                value={props.article.summary}
                onChange={v => props.setArticle('summary', () => v)}
                readOnly={viewMode()}
              >
                <TextField.TextArea
                  rows={1}
                  autoResize={true}
                  placeholder="Article Summary"
                />
              </TextField>
            </div>
          </div>

          <div class={styles.keywords}>
            <div
              class={styles.keywordList}
            >
              <For each={props.article.keywords}>
                {tag => (
                  <div
                    class={styles.keyword}
                    onClick={() => {
                      const filtered = props.article.keywords.filter(t => t !== tag);
                      props.setArticle('keywords', () => [...filtered]);
                    }}
                  >
                    {tag}
                  </div>
                )}
              </For>
              <TextField
                class={styles.keywordsInput}
                onKeyDown={(e: KeyboardEvent) => {
                  // @ts-ignore
                  if (['Tab'].includes(e.code) && e.target?.value.length > 0) {
                    e.preventDefault();
                  }
                  e.stopImmediatePropagation();
                  e.stopPropagation();
                  // @ts-ignore
                  const value = e.target?.value || '';

                  if (e.code === 'Backspace' && value.length === 0) {
                    // Remove last tag
                    const filtered = props.article.keywords.slice(0, -1);
                    props.setArticle('keywords', () => [...filtered]);
                  }

                  if (['Tab'].includes(e.code)) {
                    if (value.length > 0) {
                      const keywords = value.split(',').map((x: string) => x.trim());
                      props.setArticle('keywords', (ts) => [...ts, ...keywords]);

                      // @ts-ignore
                      e.target.value = ''
                    }
                    // @ts-ignore
                    e.target?.focus();
                    return;
                  }

                  if (!['Enter', 'Comma'].includes(e.code)) {
                    return;
                  }

                  e.preventDefault();

                  if (value.length < 1 || props.article.keywords.includes(value)) return;

                  const keywords = value.split(',').map((x: string) => x.trim());
                  props.setArticle('keywords', (ts) => [...ts, ...keywords]);
                  // @ts-ignore
                  e.target.value = '';
                }}
                readOnly={viewMode()}
              >
                <TextField.Input
                  placeholder={props.article.keywords.length === 0 ? 'Enter tags (separated by commas)' : ''}
                  autocomplete="off"
                  onBlur={(e: FocusEvent) => {
                    // @ts-ignore
                    const value = e.target?.value || '';

                    if (value.length > 0) {
                      const keywords = value.split(',').map((x: string) => x.trim());
                      props.setArticle('keywords', (ts) => [...ts, ...keywords]);

                      // @ts-ignore
                      e.target.value = ''
                    }
                  }}
                />
              </TextField>
            </div>
          </div>
        </div>
      </Show>

      <div class={styles.contentEditor}>
        <Show when={!viewMode()}>
          <ArticleEditorToolbar
            editor={editorTipTap()}
            textArea={editorPlainText}
            onFileUpload={onUploadContent}
            wysiwygMode={!editorMarkdown()}
            fixed={props.fixedToolbar}
            toggleEditorMode={() => {
              setEditorMarkdown(v => !v);
              const editor = editorTipTap();
              if (!editor) return;

              if (editorMarkdown()) {
                props.setMarkdownContent(() => '');
                const md = extendMarkdownEditor(editor).getMarkdown();
                props.setMarkdownContent(() => md);
              }
              else {
                const c = editorPlainText?.value || '';
                extendMarkdownEditor(editor).setMarkdown(c);
              }
            }}
          />
        </Show>

        <div
          id="tiptapEditor"
          class={`${styles.editor} editorTipTap ${editorMarkdown() ? styles.hiddenEditor : ''} ${accordionSection().includes('metadata') ? '' : styles.topMargin}`}
          ref={tiptapEditor}
          onClick={() => editorTipTap()?.chain().focus().run()}
          dir={isRTL(getLang()) ? 'rtl' : 'ltr'}
        ></div>

        <div class={`${editorMarkdown() ? '' : styles.hiddenEditor}`}>
          <TextField
            value={props.markdownContent}
            onChange={value => {
              props.setMarkdownContent(() => value || '');
            }}
          >
            <TextField.TextArea
              class={`${styles.editorPlain}  ${accordionSection().includes('metadata') ? '' : styles.topMargin}`}
              ref={editorPlainText}
              autoResize={true}
            />
          </TextField>
        </div>
        <div style="height: 20px;"></div>
      </div>
    </div>
  )
}

export default ArticleEditor;
