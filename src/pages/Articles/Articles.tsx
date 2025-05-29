import { Component, createEffect, createSignal, For, on, Show } from 'solid-js';
import Wormhole from '../../helpers/Wormhole/Wormhole';
import { translate } from '../../translations/translate';

import styles from './Articles.module.scss';
import HeaderTitle from 'src/components/HeaderTitle/HeaderTitle';
import PageHeader from 'src/components/PageHeader/PageHeader';
import { articlesStore, fetchArticles, setArticlesStore } from './Articles.data';
import { FeedCriteria, GraphSpan } from '../Home/Home.data';
import SelectBox from 'src/components/SelectBox/SelectBox';
import { headerSortOptions } from 'src/constants';
import { clearPageStore, pageStore, removeEventFromPageStore } from 'src/stores/PageStore';
import FeedPage from 'src/components/Event/FeedPage';
import Paginator from 'src/components/Paginator/Paginator';
import ArticleHomePreview from 'src/components/Event/ArticleHomePreview';
import { accountStore } from 'src/stores/AccountStore';
import { useParams } from '@solidjs/router';
import { FeedEventState, HomePayload } from 'src/primal_api/studio';
import StudioTabs from 'src/components/Tabs/Tabs';
import FeedItemCard from 'src/components/Event/FeedItemCard';
import ArticlePreview from 'src/components/Event/ArticlePreview';
import { PrimalArticle } from 'src/primal';
import { nip19 } from 'src/utils/nTools';
import { appStore } from 'src/stores/AppStore';
import EventStats from 'src/components/Event/EventStats';

const Articles: Component = () => {
  const params = useParams();

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
    setArticlesStore('offset', () => 0)

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


  const openInPrimal = (article: PrimalArticle) => {
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
          onSpanSelect={(span: GraphSpan) => {
            setArticlesStore('graphSpan', () => ({ ...span }))
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
                {translate('articles', 'tabs', tab)}
              </div>
            )}
          >
          </StudioTabs>
          <SelectBox
            prefix="Sort by:"
            value={headerSortOptions.find(o => o.value === articlesStore.criteria) || headerSortOptions[0]}
            options={headerSortOptions}
            onChange={(option) => setArticlesStore('criteria', (option?.value || 'score') as FeedCriteria)}
          />
        </div>
        <div class={styles.feedContent}>
          <For each={articlePages()}>
            {(page, pageIndex) => (
              <FeedPage
                page={page}
                isRenderEmpty={shouldRenderEmptyArticles(pageIndex())}
                pageIndex={pageIndex()}
                observer={articlesPageObserver}
                key="homeArticles"
                twoColumns={articlePages().length === 0}
                eventComponent={(e) => {
                  const article = page.reads.find(a => a.id === e);

                  return (
                    <Show when={article}>
                      <FeedItemCard
                        onClick={() => {openInPrimal(article!)}}
                        event={article!}
                        onDelete={(id: string) => {
                          removeEventFromPageStore(id)
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
        </div>

        </div>
      </div>
    </>
  );
}

export default Articles;
