import { Component, For, Match, Switch } from 'solid-js';
import { PrimalNote } from 'src/primal';

import styles from './NotePreview.module.scss';
import { userNameFromUser } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { longDate } from 'src/utils/date';
import { parseTextToAST } from 'src/utils/parser';
import EventPill from 'src/components/NoteEditor/EventPill';
import { renderHashtag, renderNaddr, renderNevent, renderNprofile, RenderOptions } from '../Event/Note';
import { nip05Verification } from 'src/utils/ui';
import { getMediaUrl } from 'src/stores/MediaStore';


const getImage = (src: string | undefined) => {
  if (!src) {
    return '';
  }

  const url = getMediaUrl(src,'s', true);

  const ret = url ?? src;

  return ret;
};

const parsedContent = (
  note: PrimalNote,
  opts?: {
    styles?: CSSModuleClasses,
    render?: RenderOptions,
  }
) => {
  const imageStyles = opts?.styles || {};
  let asts = parseTextToAST(note.content || '');

  let imgAst = asts.filter(ast => ast.type === 'image');
  const imgCount = imgAst.length;
  const gridClass = imgCount < 7 ? `grid-${imgCount}` : 'grid-large';

  let videoAst = asts.filter(ast => ast.type === 'video');
  const videoCount = videoAst.length;

  const css = { ...styles, ...(imageStyles)}

  return <>
    <Switch>
      <Match when={imgCount === 1}>
        <div class={css.mentionedImage}>
          <img class={styles.image} src={getImage(imgAst[0].value)} />
        </div>
      </Match>

      <Match when={imgCount > 1}>
        <div class={`${css.imageGrid} ${css[gridClass]}`}>
          <For each={imgAst.slice(0, 6)}>
            {(ast, index) => {
              const cell = `cell_${index()+1}`;

              return <img
                class={`${css.image} ${styles[cell]}`}
                src={getImage(ast.value)}
              />
            }}
          </For>
        </div>
      </Match>

      <Match when={videoCount > 0}>
        <div class={css.mentionedVideo}>
          <video class={styles.video} src={videoAst[0].value} />
        </div>
      </Match>
    </Switch>
    <div class={css.text}>
      <For each={asts}>
        {ast =>(
          <Switch fallback={<>{ast.value || ''}</>}>
            <Match when={ast.type === 'image'}>
              <></>
            </Match>

            <Match when={ast.type === 'video'}>
              <></>
            </Match>

            <Match when={['nostrProfile', 'nostrNpub'].includes(ast.type)}>
              {renderNprofile(ast, note, opts?.render?.user)}
            </Match>

            <Match when={['nostrEvent', 'nostrNote'].includes(ast.type)}>
              {renderNevent(ast, note, opts?.render?.note)}
            </Match>

            <Match when={['nostrReplaceable'].includes(ast.type)}>
              {renderNaddr(ast, note, opts?.render?.article)}
            </Match>

            <Match when={['hashtag'].includes(ast.type)}>
              {renderHashtag(ast)}
            </Match>
          </Switch>
        )}
      </For>
    </div>
  </>

}

const NotePreview: Component<{
  note: PrimalNote,
  highlighted?: boolean,
  dark?: boolean
  onClick?: () => void,
}> = (props) => {

  return (
    <div
      class={`${styles.notePreview} ${props.highlighted ? styles.highlighted : ''} ${props.dark ? styles.dark : ''}`}
      data-event-id={props.note.id}
      onClick={props.onClick}
    >

      <div class={styles.header}>
        <Avatar user={props.note.user} size={20} />
        <div class={styles.userInfo}>
          <div class={styles.userNameInfo}>
            <div class={styles.userName}>{userNameFromUser(props.note.user)}</div>
            <VerificationCheck user={props.note.user} legendConfig={props.note.user.legendConfig} />
            <div class={styles.nip05}>
              {nip05Verification(props.note.user)}
            </div>
          </div>
          <div class={styles.time}>{longDate(props.note.created_at)}</div>
        </div>
      </div>

      <div class={styles.content}>
        {parsedContent(
          props.note,
          {
            styles,
            render: {
              note: (note) => (
                <EventPill
                  readonly={true}
                  hideClose={true}
                  reference={{
                    pk: note.id,
                    kind: note.kind,
                    event: note,
                    reference: note.nId,
                  }}
                />
              ),
              article: (article) => (
                <EventPill
                  readonly={true}
                  hideClose={true}
                  reference={{
                    pk: article.id,
                    kind: article.kind,
                    event: article,
                    reference: article.nId,
                  }}
                />
              )
            }
          })}
      </div>
    </div>
  );
}

export default NotePreview;


export const NotePreviewSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.notePreviewSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}
