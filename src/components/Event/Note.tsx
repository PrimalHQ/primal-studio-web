import { Component, For, Match, Show, Switch } from 'solid-js';
import { EventDisplayVariant, PrimalNote } from '../../primal';

import styles from './Event.module.scss';
import { userName } from '../../utils/profile';
import Avatar from '../Avatar/Avatar';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';
import { date } from 'src/utils/date';
import { NoteAST, parseTextToAST } from 'src/utils/parser';
import { nip19 } from 'src/utils/nTools';


export const renderEmbeddedNote = (config: { note: PrimalNote }) => {
  return (<div><Note note={config.note} /></div> as HTMLDivElement).innerHTML;
}

const Note: Component<{
  note: PrimalNote,
  onClick?: () => void,
  onRemove?: (id: string) => void,
  embedded?: boolean,
  variant?: EventDisplayVariant,
}> = (props) => {

  const renderVideo = (ast: NoteAST) => {
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

  const renderHashtag = (ast: NoteAST) => {
    return <span class="linkish">#{ast.value}</span>
  }

  const renderNevent = (ast: NoteAST) => {
    const nevent = ast?.value?.split(':')[1] || '';

    try {
      const decoded = nip19.decode(nevent);

      if (decoded.type === 'nevent') {
        const id = decoded.data.id;

        const mentionedNote = props.note.mentionedNotes && props.note.mentionedNotes[id];

        if (!mentionedNote) return <div>UNKOWN MENTION</div>

        return <Note note={mentionedNote} />
      }

      if (decoded.type === 'note') {
        const id = decoded.data;

        const mentionedNote = props.note.mentionedNotes && props.note.mentionedNotes[id];

        if (!mentionedNote) return <div>UNKOWN MENTION</div>

        return <Note note={mentionedNote} />
      }

      throw('not-found');
    } catch (e) {
      return <div>UNKOWN MENTION</div>;
    }
  }

  const renderNprofile = (ast: NoteAST) => {
    const nprofile = ast?.value?.split(':')[1] || '';

    try {
      const decoded = nip19.decode(nprofile);

      if (decoded.type === 'nprofile') {
        const pubkey = decoded.data.pubkey;

        return <span class="linkish">@{userName(pubkey)}</span>
      }

      if (decoded.type === 'npub') {
        const pubkey = decoded.data;

        return <span class="linkish">@{userName(pubkey)}</span>
      }

      throw('not-found');
    } catch (e) {
      return `@UNKNOWN`
    }
  }

  const parsedContent = () => {
    let asts = parseTextToAST(props.note.content || '');

    let imgAst = asts.filter(ast => ast.type === 'image');

    const imgCount = imgAst.length;

    const gridClass = imgCount < 7 ? `grid-${imgCount}` : 'grid-large';

    return <>
      <Switch>
        <Match when={imgCount === 1}>
          <div class={styles.mentionedImage}>
            <img class={styles.image} src={imgAst[0].value} />
          </div>
        </Match>

        <Match when={imgCount > 1}>
          <div class={`${styles.imageGrid} ${styles[gridClass]}`}>
            <For each={imgAst.slice(0, 6)}>
              {(ast, index) => {
                const cell = `cell_${index()+1}`;

                return <img
                  class={`${styles.image} ${styles[cell]}`}
                  src={ast.value}
                />
              }}
            </For>
          </div>
        </Match>
      </Switch>
      <For each={asts}>
        {ast =>(
          <Switch fallback={<>{ast.value || ''}</>}>
            <Match when={ast.type === 'image'}>
              <></>
            </Match>

            <Match when={['nostrProfile', 'nostrNpub'].includes(ast.type)}>
              {renderNprofile(ast)}
            </Match>

            <Match when={['nostrEvent', 'nostrNote'].includes(ast.type)}>
              {renderNevent(ast)}
            </Match>

            <Match when={['hashtag'].includes(ast.type)}>
              {renderHashtag(ast)}
            </Match>

            <Match when={['video'].includes(ast.type)}>
              {renderVideo(ast)}
            </Match>

          </Switch>
        )}
      </For>;
    </>

  }

  return (
    <div
      class={styles.noteMention}
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
                  {userName(props.note.pubkey)}
                </span>
              }
            >
              <span class={styles.userName}>
                {userName(props.note.pubkey)}
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
        {parsedContent()}
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
