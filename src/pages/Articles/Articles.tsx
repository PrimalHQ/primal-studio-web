import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Articles.module.scss';
import PageHeader from 'src/components/PageHeader/PageHeader';
import { articlesStore, deleteSelected, fetchArticles, fetchFeedTotals, isAllSelected, setArticlesStore, toggleSelectAll, toggleSelected } from './Articles.data';
import { FeedCriteria, GraphSpan } from '../Home/Home.data';
import SelectBox from 'src/components/SelectBox/SelectBox';
import { headerSortOptions } from 'src/constants';
import { clearPageStore, pageStore, removeEventFromPageStore } from 'src/stores/PageStore';
import FeedPage from 'src/components/Event/FeedPage';
import Paginator from 'src/components/Paginator/Paginator';
import { accountStore } from 'src/stores/AccountStore';
import { useNavigate, useParams } from '@solidjs/router';
import { FeedEventState, HomePayload } from 'src/primal_api/studio';
import StudioTabs from 'src/components/Tabs/Tabs';
import FeedItemCard from 'src/components/Event/FeedItemCard';
import ArticlePreview from 'src/components/Event/ArticlePreview';
import { PrimalArticle, PrimalDraft } from 'src/primal';
import { nip19 } from 'src/utils/nTools';
import { appStore } from 'src/stores/AppStore';
import EventStats from 'src/components/Event/EventStats';
import DraftPreview from 'src/components/Event/DraftPreview';
import ProposalPreview from 'src/components/Event/ProposalPreview';
import ScheduledInfo from 'src/components/Event/ScheduledInfo';
import { humanizeNumber } from 'src/utils/ui';
import ReadsApproveDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsApproveDialog';
import { NoteHomeSkeleton } from 'src/components/Event/NoteHomePreview';
import ReadsPublishingDateDialog from 'src/components/ArticleEditor/ReadsDialogs/ReadsPublishingDateDialog';
import { unwrap } from 'solid-js/store';
import { scheduleArticle } from 'src/primal_api/nostr';
import { storeGraphSpan } from 'src/utils/localStore';

const Articles: Component = () => {
  const params = useParams();
  const navigate = useNavigate();

  const articlePages = () => pageStore.articles.feedPages;
  const [visibleArticlesPages, setVisibleArticlesPages] = createSignal<number[]>([]);

  const shouldRenderEmptyArticles = (index: number) => {
    return !visibleArticlesPages().includes(index);
  };

  let articlesPageObserver: IntersectionObserver | undefined;

  articlesPageObserver = new IntersectionObserver(entries => {
    let i=0;

    for (i=0; i<entries.length; i++) {
      const entry = entries[i];

      const target = entry.target;
      const id = parseInt(target.getAttribute('data-page-index') || '0');

      if (entry.isIntersecting) {
        const min = id < 3 ? 0 : id - 3;
        const max = id + 3;

        let config: number[] = [];

        for (let i=min; i<= max; i++) {
          config.push(i);
        }

        setVisibleArticlesPages(() => [...config]);
      }
    }
  });

  const loadNextArticlesPage = () => {
    if (pageStore.articles.lastRange.since === 0) return;

    const { since, until } = articlesStore.graphSpan;

    let offset = articlesStore.offset;

    fetchArticles(
      params.pubkey || accountStore.pubkey,
      {
        since,
        until,
        offset,
        limit: 30,
        criteria: articlesStore.criteria,
      },
    );
  };

  const resetArticleLists = (pubkey: string, span: Partial<HomePayload>) => {

    const { since, until } = span;

    clearPageStore('articles');
    setArticlesStore('offset', () => 0);
    setArticlesStore('selected', () => []);

    fetchFeedTotals(pubkey, { since, until, kind: 'articles' });

    fetchArticles(
      pubkey,
      {
        since,
        until,
        limit: 30,
        offset: 0,
        criteria: articlesStore.criteria,
      },
    );
  }

  createEffect(on(
    () => [articlesStore.graphSpan.since, articlesStore.graphSpan.until],
    (changes, prev) => {
      if (!prev) return;
      // When graph span changes

      const since = changes[0] as number;
      const until = changes[1] as number;

      if (since === prev[0] && until === prev[1]) return;

      const pubkey = params.pubkey || accountStore.pubkey;
      resetArticleLists(pubkey, { since, until });
    })
  );

  createEffect(on(() => articlesStore.criteria, (criteria, prev) => {
    if (!prev || criteria === prev) return;
    const { since, until } = articlesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetArticleLists(pubkey, { since, until, criteria });
  }));

  createEffect(on(() => articlesStore.tab, (state, prev) => {
    if (!prev || state === prev) return;

    const { since, until } = articlesStore.graphSpan;

    const pubkey = params.pubkey || accountStore.pubkey;

    resetArticleLists(pubkey, { since, until, state });
  }));


  const openInPrimal = (article: PrimalArticle | PrimalDraft) => {
    let link = `e/${article?.nId}`;

    if (article.nId.startsWith('naddr')) {
      const vanityName = appStore.verifiedUsers[article.pubkey];

      if (vanityName) {
        const decoded = nip19.decode(article.nId);

        const data = decoded.data as nip19.AddressPointer;

        link = `${vanityName}/${encodeURIComponent(data.identifier)}`;
      }
    }

    return window.open(`https://primal.net/${link}`, '_blank')?.focus();
  };

  return (
    <>
      <Wormhole to="header">
        <PageHeader
          title={translate('articles', 'header')}
          selection={articlesStore.graphSpan.name}
          hideSpans={!['published'].includes(articlesStore.tab)}
          onSpanSelect={(span: GraphSpan) => {
            setArticlesStore('graphSpan', () => ({ ...span }));
            storeGraphSpan(accountStore.pubkey, 'articles', span);
          }}
        />
      </Wormhole>

      <div class={styles.feedHolder}>
        <div class={styles.itemsHolder}>
        <div class={styles.feedHeader}>
          <StudioTabs
            tabs={['published', 'scheduled', 'inbox', 'sent', 'drafts']}
            activeTab={articlesStore.tab}
            defaultTab="published"
            onChange={(tab: string) => setArticlesStore('tab', tab as FeedEventState)}
            tabTriggerComponent={(tab: string) => (
              <div class={tab === articlesStore.tab ? styles.activeTab : styles.inactiveTab}>
                {translate('articles', 'tabs', tab)} ({humanizeNumber(articlesStore.feedTotals[tab as FeedEventState])})
              </div>
            )}
          >
          </StudioTabs>
          <SelectBox
            prefix="Sort by:"
            value={
              headerSortOptions(articlesStore.tab).find(o => o.value === articlesStore.criteria) ||
              headerSortOptions(articlesStore.tab)[0]
            }
            options={headerSortOptions(articlesStore.tab)}
            onChange={(option) => setArticlesStore('criteria', (option?.value || 'score') as FeedCriteria)}
          />
        </div>
        <Show when={['sent', 'inbox'].includes(articlesStore.tab) && !pageStore.articles.isFetching}>
          <div class={styles.bulkControls}>
            <button
              class={styles.bulkControlButton}
              onClick={toggleSelectAll}
            >
              <Show
                when={isAllSelected()}
                fallback={<>Select All</>}
              >
                <>Deselect All</>
              </Show>
            </button>
            <Show when={['inbox'].includes(articlesStore.tab)}>
              <button
                class={styles.bulkControlButton}
                disabled={articlesStore.selected.length === 0}
                onClick={() => {
                  const drafts = pageStore.articles.feedPages.flatMap(page => page.drafts.filter(d => articlesStore.selected.includes(d.id)))

                  setArticlesStore('approvedEvents', drafts);
                  setArticlesStore('showApproveDialog', true);
                }}
              >
                Approve Selected
              </button>
            </Show>
            <button
              class={styles.bulkControlButton}
              disabled={articlesStore.selected.length === 0}
              onClick={() => deleteSelected('drafts')}
            >
              Delete Selected
            </button>
          </div>
        </Show>
        <div class={styles.feedContent}>
          <Show
            when={articlePages().length > 0 || !pageStore.articles.isFetching}
            fallback={
              <div class={styles.emptyList}>
                <For each={Array(10)}>
                  {() =>
                    <NoteHomeSkeleton stretch={true} />
                  }
                </For>
              </div>
            }
          >
            <For each={articlePages()}>
              {(page, pageIndex) => (
                <FeedPage
                  page={page}
                  isRenderEmpty={shouldRenderEmptyArticles(pageIndex())}
                  pageIndex={pageIndex()}
                  observer={articlesPageObserver}
                  key="articles"
                  twoColumns={articlePages().length === 0}
                  eventComponent={(e) => {
                    if (articlesStore.tab === 'sent') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published'].includes(articlesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts')
                            }}
                          >
                            <ProposalPreview
                              draft={draft!}
                              onEdit={() => {
                                navigate(`/edit/article/${draft!.id}`);
                              }}
                              // onDelete={(id: string) => {
                              //   removeEventFromPageStore(id, 'drafts')
                              // }}
                              onView={() => {
                                navigate(`/view/draft/${draft!.id}`);
                              }}
                              type='sent'
                              checked={articlesStore.selected.includes(draft?.id || '-')}
                              onCheck={toggleSelected}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (articlesStore.tab === 'inbox') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published'].includes(articlesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts')
                            }}
                          >
                            <ProposalPreview
                              draft={draft!}
                              onEdit={() => {
                                navigate(`/edit/article/${draft!.id}`);
                              }}
                              onDelete={(id: string) => {
                                removeEventFromPageStore(id, 'drafts')
                              }}
                              onApprove={() => {
                                setArticlesStore('approvedEvents', [draft!]);
                                setArticlesStore('showApproveDialog', true);
                              }}
                              type='inbox'
                              checked={articlesStore.selected.includes(draft?.id || '-')}
                              onCheck={toggleSelected}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (articlesStore.tab === 'drafts') {
                      const draft = page.drafts.find(a => a.id === e);

                      return (
                        <Show when={draft}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={draft!}
                            hideContextMenu={!['published'].includes(articlesStore.tab)}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'drafts')
                            }}
                          >
                            <DraftPreview
                              draft={draft!}
                              onEdit={() => {
                                navigate(`/edit/article/${draft!.id}`);
                              }}
                              onDelete={(id: string) => {
                                removeEventFromPageStore(id, 'drafts')
                              }}
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    if (articlesStore.tab === 'scheduled') {

                      const article = page.reads.find(a => a.id === e);

                      return (
                        <Show when={article}>
                          <FeedItemCard
                            onClick={() => {}}
                            event={article!}
                            hideContextMenu={true}
                            onDelete={(id: string) => {
                              removeEventFromPageStore(id, 'reads')
                            }}
                          >
                            <ArticlePreview
                              article={article!}
                              hideTime={true}
                            />
                            <ScheduledInfo
                              event={article!}
                              onEdit={() => {
                                navigate(`/edit/article/${article!.id}`);
                              }}
                              onTimeChange={() => {
                                setArticlesStore('changePublishDateArticle', article)
                              }}
                              kind='articles'
                            />
                          </FeedItemCard>
                        </Show>
                      );
                    }

                    const article = page.reads.find(a => a.id === e);

                    return (
                      <Show when={article}>
                        <FeedItemCard
                          onClick={() => {openInPrimal(article!)}}
                          event={article!}
                          onDelete={(id: string) => {
                            removeEventFromPageStore(id, 'reads')
                          }}
                        >
                          <ArticlePreview
                            article={article!}
                          />
                          <EventStats
                            event={article!}
                          />
                        </FeedItemCard>
                      </Show>
                    )
                  }}
                />
              )}
            </For>
            <Paginator
              loadNextPage={loadNextArticlesPage}
              isSmall={true}
            />
          </Show>
        </div>

        </div>
      </div>

      <ReadsApproveDialog
        open={articlesStore.showApproveDialog}
        setOpen={(v) => setArticlesStore('showApproveDialog', v)}
        drafts={articlesStore.approvedEvents}
        onClose={() => {
          setArticlesStore('approvedEvents', () => []);
        }}
      />

      <ReadsPublishingDateDialog
        open={articlesStore.changePublishDateArticle !== undefined}
        setOpen={(v) => !v && setArticlesStore('changePublishDateArticle', undefined)}
        initialValue={articlesStore.changePublishDateArticle?.created_at}
        onSetPublishDate={async (timestamp) => {
          const article = unwrap(articlesStore.changePublishDateArticle);
          if (!article) return;

          const today = () => Math.ceil((new Date()).getTime() / 1_000);

          const pubTime = timestamp || today();
          await scheduleArticle(article, article.tags, pubTime, article.id);

          setArticlesStore('changePublishDateArticle', undefined);
        }}
      />


    </>
  );
}

export default Articles;
