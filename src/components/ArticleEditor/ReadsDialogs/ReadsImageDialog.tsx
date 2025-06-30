import { Component, createEffect, createSignal, Match, Show, Switch } from 'solid-js';
import { createStore } from 'solid-js/store';

import styles from './ReadsMentionDialog.module.scss';

import { useToastContext } from 'src/context/ToastContext/ToastContext';
import { Editor } from '@tiptap/core';
import { Progress } from '@kobalte/core/progress';
import Dialog from 'src/components/Dialogs/Dialog';
import UploaderBlossom from 'src/components/Uploader/UploaderBlossom';
import { accountStore, activeUser } from 'src/stores/AccountStore';
import ButtonSecondary from 'src/components/Buttons/ButtonSecondary';
import ButtonPrimary from 'src/components/Buttons/ButtonPrimary';

export type MediaDataState = {
  alt: string,
  title: string,
  image: string,
  fileType: string,
  metadata: any,
}

const ReadsImageDialog: Component<{
  id?: string,
  open: boolean,
  editor: Editor | undefined,
  setOpen?: (v: boolean) => void,
  onSubmit: (url: string, title: string, alt: string, fileType: string, metadata: any) => void,
}> = (props) => {
  const toast = useToastContext();

  const [state, setState] = createStore({
    alt: '',
    title: '',
    image: '',
    fileType: '',
    metadata: {},
  });

  const [isUploading, setIsUploading] = createSignal(false);
  const [cancelUploading, setCancelUploading] = createSignal<() => void>();
  const [imageLoaded, setImageLoaded] = createSignal(false);

  createEffect(() => {
    const e = props.editor;
    if (!e) return;

    if (props.open) {
      const sel = e.state.selection;
      const title = e.state.doc.textBetween(sel.from, sel.to);
      const image = e.getAttributes('link').href || '';

      setState(() => ({ title, image }))
    }
    else {
      setState(() => ({ image: '', title: '', alt: '' }));
    }

  })

  let contentFileUpload: HTMLInputElement | undefined;

  const [fileToUpload, setFileToUpload] = createSignal<File | undefined>();


  const resetUpload = () => {
    setFileToUpload(undefined);
    setIsUploading(false);
  };

  const onUploadContent = (file: File) => {
    setFileToUpload(file);
  }

  const uploadFile = () => {
    if (!contentFileUpload) {
        return;
      }

      const file = contentFileUpload.files ? contentFileUpload.files[0] : null;

      if (!file) return;
      setFileToUpload(file);
  }

  return (
    <Dialog
      triggerClass="displayNone"
      open={props.open}
      setOpen={props.setOpen}
      title="Insert Image"
    >
      <div class={styles.addImageDialog}>
        <div class={styles.uploadPreview}>
          <div
            class={styles.uploadHolder}
            onClick={() => contentFileUpload?.click()}
          >

            <Switch>
              <Match
                when={isUploading()}
              >
                <div
                  class={styles.uploadingOverlay}
                  onClick={() => {
                    const canc = cancelUploading();
                    resetUpload();
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
                when={state.image.length > 0}
              >
                <div
                  class={styles.uploadButton}
                >
                  <Switch>
                    <Match when={state.fileType.startsWith('video')}>
                      <div id='videoPreview' class={styles.videoPreview}>
                        <video
                          src={state.image}
                          class={styles.titleImage}
                          onloadedmetadata={(event) => {
                            const v = event.target as HTMLVideoElement;
                            setImageLoaded(true)
                            console.log('LOADED: ', imageLoaded())
                            setState({ metadata: {
                              duration: v.duration,
                              videoWidth: v.videoWidth,
                              videoHeight: v.videoHeight,
                            }})
                          }}
                        />
                      </div>
                    </Match>
                    <Match when={state.fileType.startsWith('image')}>
                      <img
                        class={styles.titleImage}
                        src={state.image}
                        onload={() => setImageLoaded(true)}
                      />
                    </Match>
                  </Switch>
                  <Show when={imageLoaded()}>
                    <div
                      class={styles.uploadOverlay}
                      onClick={() => {
                        // document.getElementById('upload-title-image')?.click();
                      }}
                    >
                      <div
                        class={styles.closeBtn}
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setState(() => ({ image: '', fileType: '' }));
                          setImageLoaded(false);
                          // document.getElementById('upload-title-image')?.click();
                        }}
                      >
                        <div class={styles.closeIcon}></div>
                      </div>
                      <div>Chage hero Image</div>
                    </div>
                  </Show>
                </div>
              </Match>

              <Match
                when={state.image.length === 0}
              >
                <div class={styles.noTitleImagePlaceholder}>
                  <div class={styles.uploadPlaceholder}>
                    <div class={styles.attachIcon}></div>
                    <div class={styles.attachLabel}>
                      upload media
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>

            <input
              id="upload-new-media"
              type="file"
              onChange={uploadFile}
              ref={contentFileUpload}
              hidden={true}
              accept="image/*,video/*,audio/*"
            />

            <UploaderBlossom
              uploadId="upload_content_image"
              hideLabel={false}
              publicKey={accountStore.pubkey}
              nip05={activeUser()?.nip05}
              file={fileToUpload()}
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
                setState(() => ({ image: url, fileType: file?.type || '' }))

                resetUpload();
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
        </div>

          <div class={styles.inputHolder}>
            <label for="input_title">Image Title <span>Describe the image</span></label>
            <input
              id="input_title"
              class={styles.textInput}
              autocomplete="off"
              value={state.title}
              onInput={(e) => setState(() => ({ title: e.target.value}))}
              disabled={!state.fileType.startsWith('image')}
            />

            <label for="input_alt">Image Alt Text <span>Shown if the image doesn’t load</span></label>
            <input
              id="input_alt"
              class={styles.textInput}
              autocomplete="off"
              value={state.alt}
              onInput={(e) => setState(() => ({ alt: e.target.value}))}
              disabled={!state.fileType.startsWith('image')}
            />

            <div class={styles.actions}>
              <ButtonSecondary
                onClick={() => {
                  props.setOpen && props.setOpen(false);
                }}
                light={true}
                shrink={true}
              >
                Cancel
              </ButtonSecondary>
              <ButtonPrimary
                disabled={state.image.length === 0}
                onClick={() => {
                  props.onSubmit(state.image, state.title, state.alt, state.fileType, state.metadata)
                }}
              >
                Insert
              </ButtonPrimary>
            </div>
          </div>

      </div>
    </Dialog>
  );
}

export default ReadsImageDialog;
