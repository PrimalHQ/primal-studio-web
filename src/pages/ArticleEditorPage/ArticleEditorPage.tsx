import { Component, createEffect, createSignal, Match, onCleanup, onMount, Show, Switch } from 'solid-js'

import styles from './ArticleEditorPage.module.scss'

import { Editor } from '@tiptap/core';
import { isIPhone } from '@kobalte/utils';
import { NostrRelaySignedEvent, PrimalArticle, PrimalNote, PrimalUser } from 'src/primal';
import { useToastContext } from 'src/context/ToastContext/ToastContext';
import { createStore } from 'solid-js/store';
import { BeforeLeaveEventArgs, useBeforeLeave, useNavigate, useParams } from '@solidjs/router';
import { fetchArticles, fetchDrafts, triggerImportEvents } from 'src/primal_api/events';
import { accountStore, activeUser } from 'src/stores/AccountStore';
import PageTitle from 'src/components/PageTitle/PageTitle';
import ArticleEditor, { ArticleEdit, emptyArticleEdit } from 'src/components/ArticleEditor/ArticleEditor';
import ReadsLeaveDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsLeaveDialog';
import CheckBox from 'src/components/CheckBox/CheckBox';
import { longDate } from 'src/utils/date';
import { scheduleArticle, sendArticle, sendDeleteEvent, sendDraft } from 'src/primal_api/nostr';
import { Kind, wordsPerMinute } from 'src/constants';
import { APP_ID } from 'src/App';
import { decrypt44 } from 'src/utils/nostrApi';
import { nip19 } from 'src/utils/nTools';
import { relayStore } from 'src/stores/RelayStore';
import { referencesToTags } from 'src/utils/feeds';
import ReadsPublishDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsPublishDialog';
import ReadsPublishSuccessDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsPublishSuccessDialog';
import DatePicker from '@rnwonder/solid-date-picker';
import utils from '@rnwonder/solid-date-picker/utilities';
import ReadsPublishingDateDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsPublishingDateDialog';
import { getScheduledEvents } from 'src/primal_api/studio';
import ReadsProposeDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsProposeDialog';
import Avatar from 'src/components/Avatar/Avatar';
import { userName } from 'src/utils/profile';
import VerificationCheck from 'src/components/VerificationCheck/VerificationCheck';
import { nip05Verification } from 'src/utils/ui';


export type EditorPreviewMode = 'editor' | 'browser' | 'phone' | 'feed';

export type ReadMentions = {
  users: Record<string, PrimalUser>,
  notes: Record<string, PrimalNote>,
  reads: Record<string, PrimalArticle>,
};

export const emptyReadsMentions = () => ({
  users: {},
  notes: {},
  reads: {},
})

export const [readMentions, setReadMentions] = createStore<ReadMentions>(emptyReadsMentions());

const ReadsEditor: Component = () => {
  const toast = useToastContext();
  const params = useParams();
  const navigate = useNavigate();

  const [accordionSection, setAccordionSection] = createSignal<string[]>(['metadata', 'content', 'hero_image']);
  const [editorPreviewMode, setEditorPreviewMode] = createSignal<EditorPreviewMode>('editor');
  const [markdownContent, setMarkdownContent] = createSignal<string>('');
  const [article, setArticle] = createStore<ArticleEdit>(emptyArticleEdit());

  const [showPublishSucess, setShowPublishSucess] = createSignal(false);

  const [lastSaved, setLastSaved] = createStore<ArticleEdit & { mdContent: string, time: number, draftId: string }>({
    ...emptyArticleEdit(),
    mdContent: '',
    time: 0,
    draftId: '',
  });

  const [showPublishArticle, setShowPublishArticle] = createSignal(false);
  const [showleavePage, setShowleavePage] = createSignal<BeforeLeaveEventArgs>();

  const [isPublishing, setIsPublishing] = createSignal(false);

  const [fixedToolbar, setFixedToolbar] = createSignal(false);

  const [identifier, setIdentifier] = createSignal('');

  const [editor, setEditor] = createSignal<Editor>();
  const [showTableOptions, setShowTableOptions] = createSignal<boolean>(false);
  const [tableOptionsPosition, setTableOptionsPosition] = createSignal<boolean>(false);

  const [showPublishDateDialog, setShowPublishDateDialog] = createSignal(false);
  const [futurePublishDate, setFuturePublishDate] = createSignal<number>();
  const [editScheduled, setEditScheduled] = createSignal(false);

  const [showProposeDiaglog, setShowProposeDialog] = createSignal(false);
  const [proposedUser, setProposedUser] = createSignal<PrimalUser>();

  const updateTableOptions = (show: boolean, pos: Partial<DOMRect>) => {
    setShowTableOptions(show);
    const div = document.getElementById('tableOptions');
    if (!div) return;

    const divRect = div?.getBoundingClientRect();
    const overflow = window.innerHeight - ((pos.top || 0)+ divRect.height) < 32;

    if (overflow) {
      // @ts-ignore
      div.style = `top: unset; bottom: 32px;`;
    } else {
      // @ts-ignore
      div.style = `top: ${pos.top - 17}px; bottom: unset;`;
    }
  }

  const generateIdentifier = () => {
    if (identifier().length > 0) return identifier();
    let str = article.title.toLowerCase();

    return str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  }

  // const genereatePreviewArticle = (): PrimalArticle | undefined => {

  //   // const content = markdownContent();

  //   // let relayHints = {}
  //   // let tags: string[][] = referencesToTags(content, relayHints);;

  //   // const relayTags = account.relays.map(r => {
  //   //   let t = ['r', r.url];

  //   //   const settings = account.relaySettings[r.url];
  //   //   if (settings && settings.read && !settings.write) {
  //   //     t = [...t, 'read'];
  //   //   }
  //   //   if (settings && !settings.read && settings.write) {
  //   //     t = [...t, 'write'];
  //   //   }

  //   //   return t;
  //   // });

  //   // tags = [...tags, ...relayTags];

  //   // tags.push(['clent', 'Primal']);

  //   // const now = Math.floor((new Date()).getTime() / 1_000);
  //   // const pubkey = account.publicKey || '';
  //   // const identifier = generateIdentifier();
  //   // const coordinate = `${Kind.LongForm}:${account.publicKey}:${identifier}`;
  //   // const naddr = nip19.naddrEncode({
  //   //   kind: Kind.LongForm,
  //   //   pubkey,
  //   //   identifier,
  //   // });
  //   // const id = 'preview_article';

  //   // const previewArticle: PrimalArticle = {
  //   //   ...article,
  //   //   image: accordionSection().includes('hero_image') ? article.image : '',
  //   //   content,
  //   //   user: account.activeUser,
  //   //   published: now - 90,
  //   //   topZaps: [],
  //   //   id,
  //   //   pubkey,
  //   //   naddr,
  //   //   noteId: naddr,
  //   //   coordinate,
  //   //   wordCount: Math.ceil(content.split(' ').length / wordsPerMinute),
  //   //   noteActions: { event_id: id, liked: false, replied: false, reposted: false, zapped: false },
  //   //   likes: 0,
  //   //   mentions: 0,
  //   //   replies: 0,
  //   //   reposts: 0,
  //   //   bookmarks: 0,
  //   //   zaps: 0,
  //   //   score: 0,
  //   //   score24h: 0,
  //   //   satszapped: 0,
  //   //   client: 'Primal',
  //   //   msg: {
  //   //     kind: Kind.LongForm,
  //   //     content,
  //   //     id,
  //   //     pubkey,
  //   //     sig: 'signature',
  //   //     tags,
  //   //   },
  //   //   mentionedNotes: readMentions.notes,
  //   //   mentionedArticles: readMentions.reads,
  //   //   mentionedUsers: readMentions.users,
  //   //   // mentionedZaps: Record<string, PrimalZap>,
  //   //   // mentionedHighlights: Record<string, any>,
  //   // };

  //   // return previewArticle;
  // }

  let lastScrollTop = document.body.scrollTop || document.documentElement.scrollTop;

  const onScroll = () => {
    const scrollTop = document.body.scrollTop || document.documentElement.scrollTop;
    // const tb = document.getElementById('editor_toolbar') as HTMLDivElement | undefined;
    const md = document.getElementById('editor_metadata') as HTMLDivElement | undefined;

    // if (!tb) return;

    const h = md ? md.getBoundingClientRect().height : 0;

    const isScrollingDown = scrollTop > lastScrollTop;
    lastScrollTop = scrollTop;

    const treshold = isScrollingDown ? h + 5 : h;

    const isMetadataHidden = !accordionSection().includes('metadata');
    const isToolbarAtTheTop = window.scrollY > treshold;

    if (isMetadataHidden || isToolbarAtTheTop) {
      setFixedToolbar(true);
      // tb.classList.add('fixed_editor_toolbar');
    }
    else {
      setFixedToolbar(false);
      // tb.classList.remove('fixed_editor_toolbar');
    }
  }

  const loadArticle = async () => {
    let id = params.id;

    if (!id || !accountStore.pubkey) return;

    if (id.startsWith('naddr1')) {
      const reads = await fetchArticles([id], `reads_edit_${APP_ID}`);

      const r = reads[0];
      if(!r) return

      setIdentifier(() => (r.tags.find(t => t[0] === 'd') || ['d', ''])[1])

      const pubTime = parseInt((r.tags.find(t => t[0] === 'published_at') || ['published_at', '0'])[1]);

      const now = Math.ceil((new Date()).getTime() / 1_000);
      if (!isNaN(pubTime) && pubTime > now) {
        setFuturePublishDate(pubTime)
      }

      setArticle(() => ({
        title: r.title,
        image: r.image,
        summary: r.summary,
        content: r.content,
        keywords: [ ...r.keywords ],
        tags: [...r.tags],
      }));

      setMarkdownContent(r.content);

      setLastSaved(() => ({ ...article, mdContent: markdownContent(), time: r.published_at }));

      return;
    }

    if (id.startsWith(`nevent`)) {
      const decoded = nip19.decode(id);

      if (decoded.type === 'nevent') {
        id = decoded.data.id
      }

    }


    if (id) {
      // const eid = id.split('ndraft1')[1];

      const { reads } = await getScheduledEvents([id]);

      if (reads.length > 0) {

        const r = reads[0];
        if(!r) return

        setIdentifier(() => (r.tags.find(t => t[0] === 'd') || ['d', ''])[1])

        const pubTime = parseInt((r.tags.find(t => t[0] === 'published_at') || ['published_at', '0'])[1]);

        const now = Math.ceil((new Date()).getTime() / 1_000);

        if (!isNaN(pubTime) && pubTime > now) {
          setFuturePublishDate(pubTime)
        }

        setEditScheduled(true);

        setArticle(() => ({
          title: r.title,
          image: r.image,
          summary: r.summary,
          content: r.content,
          keywords: [ ...r.keywords ],
          tags: [...r.tags],
        }));

        setMarkdownContent(r.content);

        setLastSaved(() => ({ ...article, mdContent: markdownContent(), time: r.published_at }));

        return;
      }

      const events = await fetchDrafts(accountStore.pubkey, [id], `drafts_edit_${APP_ID}`);

      let draft = events[0];

      if (!draft) return;

      const pubkey = accountStore.pubkey === draft.sender.pubkey ?
        draft.receiver.pubkey :
        draft.sender.pubkey;

      const rJson = await decrypt44(pubkey, draft.content);

      const r = JSON.parse(rJson);

      const tgs: string[][] = (r.tags || []);
      const keywords = tgs.
        reduce<string[]>((acc, t) => {
          if (t[0] === 't' && t[1].length > 0) {
            return [...acc, t[1]]
          }

          return [...acc];
        }, []);

      const pubTime = parseInt((r.tags.find((t: string[]) => t[0] === 'published_at') || ['published_at', '0'])[1]);

      const now = Math.ceil((new Date()).getTime() / 1_000);
      if (!isNaN(pubTime) && pubTime > now) {
        setFuturePublishDate(pubTime)
      }

      setArticle(() => ({
        title: (tgs.find(t => t[0] === 'title') || ['title', ''])[1],
        summary: (tgs.find(t => t[0] === 'summary') || ['summary', ''])[1],
        image: (tgs.find(t => t[0] === 'image') || ['image', ''])[1],
        keywords,
        content: r.content || '',
        tags: [...tgs],
      }));

      setMarkdownContent(r.content);

      setLastSaved(() => ({ ...article, mdContent: markdownContent(), time: draft.created_at, draftId: draft.id }));

      return;
    }

  }

  const proposeDraft = async () => {
    const user = activeUser();
    if (!user) return;

    const lastDraft = lastSaved.draftId;

    let tags: string[][] = referencesToTags(article.content, {});;

    const relayTags = relayStore.all.map(r => ['r', r.url]);

    tags = [...tags, ...relayTags];

    // tags.push(['client', 'Primal']);

    // tags = [
    //   ...tags,
    //   ["title", article.title],
    //   ["summary", article.summary],
    //   ["image", article.image],
    //   ["d", generateIdentifier()],
    //   ...article.keywords.map(t => ['t', t]),
    // ];

    const articleToSend  = {
      ...article,
      tags,
    }

    const { success, note } = await sendDraft(
      proposedUser()!,
      articleToSend,
      markdownContent(),
      futurePublishDate(),
    );

    if (success && note) {
      toast?.sendSuccess('Proposal sent');

      if (lastDraft.length > 0) {
        sendDeleteEvent(
          user.pubkey,
          lastDraft,
          Kind.Draft,
        );
      }
    }
    else {
      toast?.sendWarning('Proposal sending failed');
    }
  };

  const publishArticle = async (promote: boolean) => {
    if (proposedUser()) {
      proposeDraft();
      return;
    }

    const user = activeUser();

    if (!user) return;


    const content = markdownContent();

    let relayHints = {}
    let tags: string[][] = referencesToTags(content, relayHints);;

    const relayTags = relayStore.all.map(r => ['r', r.url]);

    tags = [...tags, ...relayTags];

    tags.push(['client', 'Primal']);

    let articleToPost = {
      ...article,
      content,
    };

    if (!accordionSection().includes('hero_image')) {
      articleToPost.image = '';
    }

    tags = [
      ["title", articleToPost.title],
      ["summary", articleToPost.summary],
      ["image", articleToPost.image],
      ["d", generateIdentifier()],
      ...articleToPost.keywords.map(t => ['t', t]),
      ...tags,
    ];

    setIsPublishing(true);

    const pubDate = futurePublishDate();

    const { success, note } = pubDate ?
     await scheduleArticle(articleToPost, tags, pubDate, editScheduled() ? params.id : undefined) :
     await sendArticle(articleToPost, tags);

    if (success && note) {

      const lastDraft = lastSaved.draftId;

      if (lastDraft.length > 0) {
        sendDeleteEvent(
          user.pubkey,
          lastDraft,
          Kind.Draft,
        );
      }

      setShowPublishSucess(() => true);

      return;
    }
  }

  const quoteArticle = (postedEvent: NostrRelaySignedEvent) => {
    // if (!account) return;

    // const naddr = nip19.naddrEncode({
    //     pubkey: postedEvent.pubkey,
    //     kind: postedEvent.kind,
    //     identifier: (postedEvent.tags.find(t => t[0] === 'd') || [])[1] || '',
    //   });

    //   account.actions.quoteNote(`nostr:${naddr}`);
    //   account.actions.showNewNoteForm();
  }

  createEffect(() => {
    const tb = document.getElementById('editor_toolbar') as HTMLDivElement | undefined;
    if (!tb) return;

    const isMetadataHidden = !accordionSection().includes('metadata');

    if (isMetadataHidden) {
      tb.classList.add('fixed_editor_toolbar');
    }
    else {
      tb.classList.remove('fixed_editor_toolbar');
    }
  })

  onMount(() => {
    window.addEventListener('scroll', onScroll);
    loadArticle();
  });

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll)
  });

  useBeforeLeave((e: BeforeLeaveEventArgs) => {
    if (isUnsaved() && !isPublishing()) {
      e.preventDefault();
      setShowleavePage(e);
    }

    setIsPublishing(false);
  })

  const isUnsaved = () => {
    const {
      title,
      image,
      summary,
      content,
      keywords,
      mdContent,
    } = lastSaved;

    const changed = title !== article.title ||
      image !== article.image ||
      summary !== article.summary ||
      content.trim() !== article.content.trim() ||
      keywords.some((t: string) => !article.keywords.includes(t)) ||
      mdContent.trim().replaceAll(' ','') !== markdownContent().trim().replaceAll(' ','');

    return changed;
  }

  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (isUnsaved()) {
      e.preventDefault();
      return e.returnValue = true;
    }
  };

  onMount(() => {
    window.addEventListener('beforeunload', beforeUnload, { capture: true });
  });

  onCleanup(() => {
    window.removeEventListener('beforeunload', beforeUnload, { capture: true });
  });

  const saveDraft = async () => {
    const user = activeUser();
    if (!user) return;

    const lastDraft = lastSaved.draftId;

    const { success, note } = await sendDraft(
      user,
      article,
      markdownContent(),
    );

    if (success && note) {
      toast?.sendSuccess('Draft saved');

      setLastSaved(() => ({
        ...article,
        draft: { ...note },
        mdContent: markdownContent(),
        time: note.created_at,
        draftId: note.id,
      }));

      if (lastDraft.length > 0) {
        sendDeleteEvent(
          user.pubkey,
          lastDraft,
          Kind.Draft,
        );
      }
    }
    else {
      toast?.sendWarning('Draft saving failed');
    }
  };


  const genereatePreviewArticle = (): PrimalArticle | undefined => {
    const pubkey = accountStore.pubkey || '';
    const user = activeUser();
    if (!pubkey || !user) return;

    const content = markdownContent();

    let relayHints = {}
    let tags: string[][] = referencesToTags(content, relayHints);;

    const relayTags = relayStore.all.map(r => ['r', r.url])

    tags = [...tags, ...relayTags];

    tags.push(['clent', 'Primal']);

    const now = Math.floor((new Date()).getTime() / 1_000);
    const identifier = generateIdentifier();
    const coordinate = `${Kind.LongForm}:${pubkey}:${identifier}`;
    const naddr = nip19.naddrEncode({
      kind: Kind.LongForm,
      pubkey,
      identifier,
    });
    const id = 'preview_article';

    const previewArticle: PrimalArticle = {
      ...article,
      image: accordionSection().includes('hero_image') ? article.image : '',
      content,
      user,
      published_at: now,
      created_at: now,
      topZaps: [],
      id,
      pubkey,
      nId: naddr,
      nIdShort: naddr,
      kind: Kind.LongForm,
      coordinate,
      wordCount: Math.ceil(content.split(' ').length / wordsPerMinute),
      actions: { event_id: id, liked: false, replied: false, reposted: false, zapped: false },
      stats: {
        likes: 0,
        mentions: 0,
        replies: 0,
        reposts: 0,
        bookmarks: 0,
        zaps: 0,
        score: 0,
        score24h: 0,
        satszapped: 0,
        event_id: id,
      },
      studioStats: {
        satszapped: 0,
        score: 0,
        sentiment: 'neutral',
      },
      client: 'Primal',
      mentionedNotes: readMentions.notes,
      mentionedArticles: readMentions.reads,
      mentionedUsers: readMentions.users,
      // mentionedZaps: Record<string, PrimalZap>,
      // mentionedHighlights: Record<string, any>,
    };

    return previewArticle;
  }

  return (
    <div class={styles.editorPage}>

      <PageTitle
        title={article.title ? `Editing ${article.title}` : `New Article`}
      />

      <Switch>
        <Match when={isIPhone()}>
          <div class={styles.noArticlePhone}>
            No PHONE
            {/* <img src={noEditorPhone} /> */}
          </div>
        </Match>

        <Match when={!accountStore.pubkey}>
          <div class={styles.caption}>
            <p>
              You must be logged in to use Article Editor
            </p>
            {/* <ButtonPrimary onClick={account?.actions.showGetStarted}>
              {intl.formatMessage(tActions.getStarted)}
            </ButtonPrimary> */}
          </div>
        </Match>

        <Match when={true}>

          <div class={styles.mainContent}>
            <Switch>
              <Match when={editorPreviewMode() === 'editor'}>
                <ArticleEditor
                  accordionSection={accordionSection()}
                  markdownContent={markdownContent()}
                  setMarkdownContent={setMarkdownContent}
                  article={article}
                  setArticle={setArticle}
                  fixedToolbar={fixedToolbar()}
                  setEditor={setEditor}
                  showTableOptions={updateTableOptions}
                />
              </Match>

              <Match when={editorPreviewMode() === 'browser'}>
                <div>
                  {/* <ReadsEditorPreview
                    article={genereatePreviewArticle()}
                  /> */}
                </div>
              </Match>

              <Match when={editorPreviewMode() === 'phone'}>
                <div class={styles.phonePreview} >
                  {/* <ReadsEditorPreview
                    article={genereatePreviewArticle()}
                    isPhoneView={true}
                  /> */}
                </div>
              </Match>

              <Match when={editorPreviewMode() === 'feed'}>
                <div class={styles.feedPreview}>
                  <div class={styles.caption}>
                    Desktop Feed Preview
                  </div>
                  {/* <ArticlePreview
                    article={genereatePreviewArticle()}
                  /> */}

                  <div class={styles.caption}>
                    Phone Feed Preview
                  </div>
                  <div class={styles.phonePreview}>
                    {/* <ArticlePreviewPhone
                      article={genereatePreviewArticle()}
                      hideFooter={true}
                      noBorder={true}
                    /> */}
                  </div>


                  <div class={styles.caption}>
                    Sidebar Feed Preview
                  </div>
                  <div class={styles.sidebarPreview}>
                    {/* <ArticleShort
                      article={genereatePreviewArticle()}
                      noBorder={true}
                    /> */}
                  </div>
                </div>
              </Match>
            </Switch>
          </div>

          <div class={styles.sidebar}>
            <div class={styles.sidebarOptions}>
              <div class={styles.caption}>Options</div>
              <CheckBox
                onChange={(checked: boolean) => {
                  if (!checked) {
                    setAccordionSection((as) => as.filter(s => s !== 'metadata'));
                    return;
                  }

                  setAccordionSection((as) => [...as, 'metadata']);
                }}
                checked={accordionSection().includes('metadata')}
                label="Show article metadata"
              />
              <CheckBox
                onChange={(checked: boolean) => {
                  if (!checked) {
                    setAccordionSection((as) => as.filter(s => s !== 'hero_image'));
                    return;
                  }

                  setAccordionSection((as) => [...as, 'hero_image']);
                }}
                checked={accordionSection().includes('hero_image')}
                label="Use hero image"
              />
            </div>
            <div class={styles.sidebarTools}>
              <div class={styles.caption}>Edit & Preview</div>

              <button
                class={`${styles.toolButton} ${editorPreviewMode() === 'editor' ? styles.selected : ''}`}
                onClick={() => {
                  setEditorPreviewMode('editor');
                }}
              >
                Edit Mode
              </button>

              <button
                class={`${styles.toolButton} ${editorPreviewMode() === 'browser' ? styles.selected : ''}`}
                onClick={() => {
                  setEditorPreviewMode('browser');
                }}
              >
                Preview
              </button>
              {/* <button
                class={`${styles.toolButton} ${editorPreviewMode() === 'phone' ? styles.selected : ''}`}
                onClick={() => {
                  setEditorPreviewMode('phone');
                }}
              >
                Phone Preview
              </button>
              <button
                class={`${styles.toolButton} ${editorPreviewMode() === 'feed' ? styles.selected : ''}`}
                onClick={() => {
                  setEditorPreviewMode('feed');
                }}
              >
                Feed Preview
              </button> */}
            </div>

            <div class={styles.sidebarPublish}>
              <div class={styles.caption}>{'Content & Publishing'}</div>

              <Show
                when={futurePublishDate()}
                fallback={
                  <button
                    class={styles.toolButton}
                    onClick={() => setShowPublishDateDialog(true)}
                  >
                    Schedule Publish Time
                  </button>
                }
              >
                <div class={styles.publishDateDisplay}>
                  <div class={styles.calendarIconBig}></div>
                  <div class={styles.dateInfo}>
                    <div class={styles.label}>
                      Scheduled to publish:
                    </div>
                    <div class={styles.date}>
                      {longDate(futurePublishDate() || 0)}
                      <button
                        class={styles.linkButton}
                        onClick={() => setShowPublishDateDialog(true)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </Show>

              <Show
                when={proposedUser()}
                fallback={
                  <button
                    class={styles.toolButton}
                    onClick={() => setShowProposeDialog(true)}
                  >
                    Propose to a Nostr User
                  </button>
                }
              >
                <div class={styles.publishDateDisplay}>
                  <Avatar user={proposedUser()!} size={32} />

                  <div class={styles.dateInfo}>
                    <div class={styles.label}>
                      Proposed to:
                    </div>
                    <div class={styles.date}>
                      <div>{userName(proposedUser()!.pubkey)}</div>
                      <VerificationCheck user={proposedUser()} />
                      <div>{nip05Verification(proposedUser())}</div>
                      <button
                        class={styles.linkButton}
                        onClick={() => setShowProposeDialog(true)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
            <div class={styles.sidebarPublish}>
              <div class={styles.caption}>{'Save & Publish'}</div>
              <Switch>
                <Match when={article.title.length === 0}>
                  <div class={styles.status}>
                    Enter article title before you can save
                  </div>
                </Match>

                <Match when={!isUnsaved()}>
                  <div class={styles.status}>
                    <div class={`${styles.statusBulb} ${styles.savedBulb}`}></div>
                    <div>Saved changes: {lastSaved.time ? longDate(lastSaved.time) : 'never'}</div>
                  </div>
                </Match>

                <Match when={isUnsaved()}>
                  <div class={styles.status}>
                    <div class={`${styles.statusBulb} ${styles.unsavedBulb}`}></div>
                    <Show
                      when={lastSaved.time}
                      fallback={<div>Unsaved changes (no saved drafts yet)</div>}
                    >
                      <div>Unsaved changes since: {lastSaved.time ? longDate(lastSaved.time) : 'never'}</div>
                    </Show>
                  </div>
                </Match>
              </Switch>

              <button
                class={styles.toolButton}
                onClick={saveDraft}
                disabled={!isUnsaved()}
              >
                Save Draft Privately
              </button>

              <button
                class={styles.toolPrimaryButton}
                disabled={article.title.length === 0}
                onClick={() => {setShowPublishArticle(true)}}
              >
                <Show
                  when={proposedUser()}
                  fallback={<>Continue to Publish Article</>}
                >
                  <>Continue to Send Article</>
                </Show>
              </button>
            </div>

            <Show when={showTableOptions()}>
              <div id="tableOptions" class={styles.tableOptions}>
                <button
                  onClick={() => editor()?.chain().focus().addRowAfter().run()}
                >
                  <div>Insert Row After</div>
                  <div class={styles.rowBellowIcon}></div>
                </button>
                <button
                  onClick={() => editor()?.chain().focus().addRowBefore().run()}
                >
                  <div>Insert Row Before</div>
                  <div class={styles.rowAboveIcon}></div>
                </button>

                <button
                  onClick={() => editor()?.chain().focus().addColumnBefore().run()}
                >
                  <div>Insert Column Before</div>
                  <div class={styles.colBeforeIcon}></div>
                </button>
                <button
                  onClick={() => editor()?.chain().focus().addColumnAfter().run()}
                >
                  <div>Insert Column After</div>
                  <div class={styles.colAfterIcon}></div>
                </button>

                <button
                  onClick={() => editor()?.chain().focus().mergeCells().run()}
                >
                  <div>Merge Cell</div>
                  <div class={styles.mergeIcon}></div>
                </button>

                <button
                  onClick={() => editor()?.chain().focus().splitCell().run()}
                >
                  <div>Split Cell</div>
                  <div class={styles.splitIcon}></div>
                </button>
                <button
                  onClick={() => editor()?.chain().focus().deleteRow().run()}
                >
                  <div>Delete Row</div>
                  <div class={styles.delRowIcon}></div>
                </button>
                <button
                  onClick={() => editor()?.chain().focus().deleteColumn().run()}
                >
                  <div>Delete Column</div>
                  <div class={styles.delColIcon}></div>
                </button>
                <button
                  onClick={() => editor()?.chain().focus().deleteTable().run()}
                >
                  <div>Delete Table</div>
                  <div class={styles.delTableIcon}></div>
                </button>
              </div>
            </Show>
          </div>

          <ReadsProposeDialog
            open={showProposeDiaglog()}
            setOpen={setShowProposeDialog}
            onAddUser={(user) => {
              setProposedUser(user);
              setShowProposeDialog(false);
            }}
          />

          <ReadsPublishDialog
            article={genereatePreviewArticle()}
            articleData={article}
            open={showPublishArticle()}
            setOpen={setShowPublishArticle}
            onPublish={publishArticle}
            publishTime={futurePublishDate()}
            proposedUser={proposedUser()}
          />

          <ReadsPublishSuccessDialog
            open={showPublishSucess()}
            onClose={() => {
              setShowPublishSucess(false);
              navigate(`/articles`);
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

          <ReadsLeaveDialog
            open={showleavePage() !== undefined}
            setOpen={(v: boolean) => v === false && setShowleavePage(undefined)}
            title="Unsaved changes"
            description="Do you wish to save changes as a draft?"
            onSave={async () => {
              await saveDraft();
              showleavePage()?.retry(true);
              setShowleavePage(undefined);
            }}
            onLeave={() => {
              showleavePage()?.retry(true);
              setShowleavePage(undefined);
            }}
            onReturn={() => {
              setShowleavePage(undefined);
            }}
          />
        </Match>
      </Switch>

    </div>
  )
}

export default ReadsEditor;

