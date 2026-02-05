import { Component, For, JSXElement, Match, Show, Switch } from 'solid-js';
import { EventDisplayVariant, PrimalArticle, PrimalNote, PrimalUser } from 'src/primal';

import styles from './Event.module.scss';
import { userNameFromUser } from 'src/utils/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';
import { date } from 'src/utils/date';
import { NoteAST, parseTextToAST } from 'src/utils/parser';
import { nip19 } from 'src/utils/nTools';
import ArticleReviewPreview from './ArticleReviewPreview';


export const renderEmbeddedNote = (config: { note: PrimalNote }) => {
  return (<div><Note note={config.note} /></div> as HTMLDivElement).innerHTML;
}


export const renderVideo = (ast: NoteAST) => {
  return <div class={styles.mentionedVideo}>
    <video
      class={styles.video}
      controls
      muted={true}
      loop={true}
      playsinline={true}
    >
      <source src={ast.value} />
    </video>
  </div>;
}

export const renderHashtag = (ast: NoteAST) => {
  return <span class="linkish">#{ast.value}</span>
}

export const renderNevent = (
  ast: NoteAST,
  note: PrimalNote,
  customRender?: (note: PrimalNote) => JSXElement,
) => {
  const nevent = ast?.value?.split(':')[1] || '';

  try {
    const decoded = nip19.decode(nevent);

    if (decoded.type === 'nevent') {
      const id = decoded.data.id;

      const mentionedNote = note.mentionedNotes && note.mentionedNotes[id];

      if (!mentionedNote) return <div>UNKOWN MENTION</div>

      return customRender?.(mentionedNote) || <Note note={mentionedNote} />
    }

    if (decoded.type === 'note') {
      const id = decoded.data;

      const mentionedNote = note.mentionedNotes && note.mentionedNotes[id];

      if (!mentionedNote) return <div>UNKOWN MENTION</div>

      return customRender?.(mentionedNote) || <Note note={mentionedNote} />
    }

    throw('not-found');
  } catch (e) {
    return <div>UNKOWN MENTION</div>;
  }
}

export const renderNaddr = (
  ast: NoteAST,
  note: PrimalNote,
  customRender?: (article: PrimalArticle) => JSXElement,
) => {
  const naddr = ast?.value?.split(':')[1] || '';

  try {
    const decoded = nip19.decode(naddr);

    if (decoded.type === 'naddr') {
      const mentionedArticle = note.mentionedArticles && note.mentionedArticles[naddr];

      if (!mentionedArticle) return <div>UNKOWN MENTION</div>

      return customRender?.(mentionedArticle) || <ArticleReviewPreview
        article={mentionedArticle}
        bordered={true}
      />
    }

    throw('not-found');
  } catch (e) {
    return <div>UNKOWN MENTION</div>;
  }
}

export const renderNprofile = (
  ast: NoteAST,
  note: PrimalNote,
  customRender?: (user: PrimalUser) => JSXElement,
) => {
  let nprofile = '';

  if (ast?.value) {
    nprofile = ast.value;
  }

  if (ast?.value?.startsWith('nostr:')) {
    nprofile = ast?.value?.split(':')[1]
  }

  try {
    const decoded = nip19.decode(nprofile);


    if (decoded.type === 'nprofile') {
      const pubkey = decoded.data.pubkey;
      const user = note.mentionedUsers?.[pubkey];

      if (user && customRender) return customRender(user);

      return <span class="linkish">@{userNameFromUser(user)}</span>
    }

    if (decoded.type === 'npub') {
      const pubkey = decoded.data;
      const user = note.mentionedUsers?.[pubkey];

      if (user && customRender) return customRender(user);

      return <span class="linkish">@{userNameFromUser(user)}</span>
    }

    throw('not-found');
  } catch (e) {
    return ast?.value || ' ----USER---- '
  }
}

export type RenderOptions = {
  note?: (note: PrimalNote) => JSXElement,
  article?: (article: PrimalArticle) => JSXElement,
  user?: (user: PrimalUser) => JSXElement,
}

export const parsedContent = (
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

  const css = { ...styles, ...(imageStyles)}

  return <>
    <Switch>
      <Match when={imgCount === 1}>
        <div class={css.mentionedImage}>
          <img class={styles.image} src={imgAst[0].value} />
        </div>
      </Match>

      <Match when={imgCount > 1}>
        <div class={`${css.imageGrid} ${css[gridClass]}`}>
          <For each={imgAst.slice(0, 6)}>
            {(ast, index) => {
              const cell = `cell_${index()+1}`;

              return <img
                class={`${css.image} ${styles[cell]}`}
                src={ast.value}
              />
            }}
          </For>
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

            <Match when={['video'].includes(ast.type)}>
              {renderVideo(ast)}
            </Match>

          </Switch>
        )}
      </For>
    </div>
  </>

}

const Note: Component<{
  note: PrimalNote,
  onClick?: () => void,
  onRemove?: (id: string) => void,
  embedded?: boolean,
  variant?: EventDisplayVariant,
  highlighted?: boolean,
}> = (props) => {

  return (
    <div
      class={`${styles.noteMention} ${props.highlighted ? styles.highlighted : ''}`}
      data-event-id={props.note.id}
      onClick={props.onClick}
    >

      <div class={styles.noteMentionHeader}>
        <Avatar
          user={props.note.user}
          size={26}
        />
        <span class={styles.postInfo}>
          <span class={styles.userInfo}>
            <Show
              when={props.note?.user.nip05}
              fallback={
                <span class={styles.userName}>
                  {userNameFromUser(props.note.user)}
                </span>
              }
            >
              <span class={styles.userName}>
                {userNameFromUser(props.note.user)}
              </span>
              <VerificationCheck user={props.note.user} />
              <span
                class={styles.verifiedBy}
                title={props.note.user.nip05}
              >
                {nip05Verification(props.note.user)}
              </span>
            </Show>
          </span>

          <span
            class={styles.time}
            title={date(props.note.created_at || 0).date.toLocaleString()}
          >
            {date(props.note.created_at || 0).label}
          </span>
        </span>
      </div>
      <div class={styles.noteMentionContent}>
        {parsedContent(props.note)}
      </div>
    </div>
  );
}

export default Note;


export const NoteSuggestionSkeleton: Component<{
  id?: string,
}> = (props) => {
  return (
    <div class={styles.noteSuggestionSkeleton}>
      <div class={styles.avatarSN}></div>
      <div class={styles.shortNote}>
        <div class={styles.headerSN}></div>
        <div class={styles.contentSN}></div>
      </div>
    </div>
  );
}
