import { unwrap } from 'solid-js/store';

import { Editor, Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import {
  DOMSerializer,
  DOMParser,
  Node as ProsemirrorNode,
} from 'prosemirror-model';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkStringify from 'remark-stringify';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';

import { nip19 } from 'src/utils/nTools';
import { APP_ID } from 'src/App';
import { Kind } from 'src/constants';
import { PrimalArticle, PrimalNote, PrimalUser } from 'src/primal';
import { userName } from 'src/utils/profile';
import { fetchArticles, fetchNotes } from 'src/primal_api/events';
import { getUsers } from 'src/primal_api/profile';
import { renderEmbeddedNote } from '../Event/Note';
import { mentionStore, updateMentionStore } from 'src/stores/MentionStore';
import { convertConfig } from '../NoteEditor/plainTextTransform';
import { renderArticlePreview } from '../Event/ArticlePreviewPublish';
import { renderArticleReviewPreview } from '../Event/ArticleReviewPreview';

// import { readMentions, setReadMentions } from '../pages/ReadsEditor';
// import { fetchUserProfile } from '../handleFeeds';
// import { fetchArticles, fetchNotes } from '../handleNotes';
// import { renderEmbeddedNote } from '../components/EmbeddedNote/EmbeddedNote';
// import { renderArticlePreview } from '../components/ArticlePreview/ArticlePreview';

export interface MarkdownPluginOptions {
  exportOnUpdate?: boolean
  importOnPaste?: boolean
  onMarkdownUpdate?: (markdown: string) => void
}

export const defaultMarkdownPluginOptions: MarkdownPluginOptions = {
  exportOnUpdate: false,
  importOnPaste: true,
  onMarkdownUpdate: () => {}
}

const findMissingUser = async (nprofile: string) => {
  const decode = nip19.decode(nprofile);

  let pubkey = '';

  if (decode.type === 'npub') {
    pubkey = decode.data;
  }

  if (decode.type === 'nprofile') {
    pubkey = decode.data.pubkey;
  }

  if (pubkey.length === 0) return;

  let user = unwrap(mentionStore.users[pubkey]);

  if (!user) {
    const users = await getUsers([pubkey]);
    user = { ...users[0] };
    updateMentionStore('users', () => ({ [pubkey]: { ...user } }));
  }

  return user;
  // setTimeout(() => {
  //   const mention = document.querySelector(`span[type=${decode.type}][bech32=${nprofile}]`);
  //   mention && (mention.innerHTML = `@${userName(user)}`);
  // }, 0);
}


const findMissingEvent = async (nevent: string) => {
  if (!nevent) return;
  const decode = nip19.decode(nevent);

  let id = '';

  if (decode.type === 'note') {
    id = decode.data;
  }

  if (decode.type === 'nevent') {
    id = decode.data.id;
  }

  if (id.length === 0) return;

  const events = await fetchNotes(undefined, [id], `event_missing_${nevent}${APP_ID}`);

  return events[0];
}


const findMissingAddr = async (naddr: string) => {
  if (!naddr) return;
  const decode = nip19.decode(naddr);

  let identifier = '';
  let kind = Kind.LongForm;
  let pubkey = '';

  if (decode.type === 'naddr') {
    identifier = decode.data.pubkey
    kind = decode.data.kind || Kind.LongForm;
    pubkey = decode.data.pubkey;
  }

  if (identifier.length === 0) return;

  const events = await fetchArticles([naddr], `reads_missing_${naddr}_${APP_ID}`);

  return events[0];

}

// Helper function to handle external media in HTML -> Markdown conversion
export const processHTMLForExternalMedia = (html: string): string => {
  // Replace nostr spans with their markdown representation
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Find all nostr spans and replace them
  const mediaDivs = tempDiv.querySelectorAll('div[originalurl]');

  mediaDivs.forEach(div => {
    const url = div.getAttribute('originalurl');
    if (url) {
      // Create a text node with the url
      const nodeText = document.createTextNode(`${url}`);
      div.parentNode?.replaceChild(nodeText, div);
    }
  });

  return tempDiv.innerHTML;
}

// Helper function to handle external media in Markdown -> HTML conversion
export const processMarkdownForExternalMedia = (html: string): string => {
  const services: Record<string, { patterns: RegExp[], url: (...args: string[]) => string}> = {
    spotify: {
      patterns: [
        /https?:\/\/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/,
        /https?:\/\/spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/
      ],
      url: (match, type, id) => `https://open.spotify.com/embed/${type}/${id}`
    },

    youtube: {
      patterns: [
        /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
        /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
      ],
      url: (match, id) => `https://www.youtube.com/embed/${id}`
    },

    twitch: {
      patterns: [
        /https?:\/\/(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/,
        /https?:\/\/(?:www\.)?twitch\.tv\/videos\/([0-9]+)/
      ],
      url: (match, channelOrVideo) => {
        const isVideo = match.includes('/videos/')
        if (isVideo) {
          return `https://player.twitch.tv/?video=${channelOrVideo}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}" height="378" width="620" allowfullscreen></iframe>`;
        }
        return `https://player.twitch.tv/?channel=${channelOrVideo}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}" height="378" width="620" allowfullscreen></iframe>`;
      }
    },

    soundcloud: {
      patterns: [
        /https?:\/\/soundcloud\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/
      ],
      url: (match, path) => `https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/${encodeURIComponent(path)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`
    },

    mixcloud: {
      patterns: [
        /https?:\/\/(?:www\.)?mixcloud\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/
      ],
      url: (match, path) => `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${encodeURIComponent(path)}%2F`
    },

    tidal: {
      patterns: [
        /https?:\/\/(?:listen\.)?tidal\.com\/(track|album|playlist)\/([a-zA-Z0-9-]+)/
      ],
      url: (match, type, id) => `https://embed.tidal.com/${type}s/${id}`
    },

    applemusic: {
      patterns: [
        /https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|song|playlist)\/[^\/]*\/([0-9]+)/
      ],
      url: (match, country, type, id) => `https://embed.music.apple.com/${country}/${type}/${id}`
    },

    rumble: {
      patterns: [
        /https?:\/\/rumble\.com\/([a-zA-Z0-9_-]+)\.html/,
        /https?:\/\/rumble\.com\/embed\/([a-zA-Z0-9_-]+)/
      ],
      url: (match, id) => `https://rumble.com/embed/${id}/`
    },

    wavlake: {
      patterns: [
        /https?:\/\/(?:www\.)?wavlake\.com\/(track|album)\/([a-zA-Z0-9-]+)/
      ],
      url: (match, type: string, id: string) => `https://embed.wavlake.com/${type}/${id}`
    },

    // nostrnests: {
    //   patterns: [
    //     /https?:\/\/(?:www\.)?nostrnests\.com\/([a-zA-Z0-9_-]+)/
    //   ],
    //   url: (id) => `https://nostrnests.com/embed/${id}`
    // }
  };

  // Helper function to check if URL matches any service pattern
  function getServiceMatch(url: string) {
    for (const [serviceName, config] of Object.entries(services)) {
      for (const pattern of config.patterns) {
        const match = url.match(pattern);
        if (match) {
          return { serviceName, match, config };
        }
      }
    }
    return null;
  }

  // Replace anchor tags with iframes
  const anchorRegex = /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>(.*?)<\/a>/gi;

  const result = html.replace(anchorRegex, (fullMatch, beforeHref, url, afterHref, linkText) => {
    const serviceMatch = getServiceMatch(url);

    if (serviceMatch) {
      const src = services[serviceMatch.serviceName].url.apply(null, serviceMatch.match);

      const mention = document.createElement('div');
      mention.setAttribute('data-media-embed', serviceMatch.serviceName);
      mention.setAttribute('src', src);
      mention.setAttribute('service', serviceMatch.serviceName);
      mention.setAttribute('originalurl', serviceMatch.match[0]);

      return mention.outerHTML;
    }

    return fullMatch; // Return original anchor tag if URL doesn't match any service
  });

  return result;
}


// Helper function to handle nostr IDs in HTML -> Markdown conversion
export const processHTMLForNostr = (html: string): string => {
  // Replace nostr spans with their markdown representation
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Find all nostr spans and replace them
  const nostrSpans = tempDiv.querySelectorAll('span[type="nprofile"], span[type="npub"], div[type="note"], div[type="nevent"], div[type="naddr"]');
  nostrSpans.forEach(span => {
    const bech32 = span.getAttribute('bech32');
    if (bech32) {
      // Create a text node with the nostr format
      const nostrText = document.createTextNode(` nostr:${bech32} `);
      span.parentNode?.replaceChild(nostrText, span);
    }
  });

  return tempDiv.innerHTML;
}

// Helper function to handle nostr IDs in Markdown -> HTML conversion
export const processMarkdownForNostr = async (html: string): Promise<string> => {
  // This regex matches nostr: followed by an npub or nprofile identifier
  const nostrRegex = /nostr:(n(pub|profile|ote|event|addr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)/g;

  const nostrIds = html.match(nostrRegex) || [];
  let foundUsers: Record<string, PrimalUser> = {};
  let foundNotes: Record<string, PrimalNote> = {};
  let foundArticles: Record<string, PrimalArticle> = {};

  for (let i = 0; i < nostrIds.length;i++) {
    const nId = nostrIds[i];
    const bech32 = nId.startsWith('nostr:') ? nId.slice(6) : nId;

    const { type } = nip19.decode(bech32);

    if (['npub', 'nprofile'].includes(type)) {
      const user = await findMissingUser(bech32);

      if (user) {
        foundUsers[bech32] = { ...user };
      }
    }

    if (['note', 'nevent'].includes(type)) {
      const note = await findMissingEvent(bech32);

      if (note) {
        foundNotes[bech32] = { ...note };
      }
    }

    if (['naddr'].includes(type)) {
      const article = await findMissingAddr(bech32);

      if (article) {
        foundArticles[bech32] = { ...article };
      }
    }

  }

  return html.replace(nostrRegex, (match, bech32) => {
    const { type } = nip19.decode(bech32);


    if (['npub', 'nprofile'].includes(type)) {
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const user = foundUsers[bech32]
      const name = userName(user.pubkey);

      // Create the span element with the appropriate attributes
      return `<span type="${type}" bech32="${bech32}" pubkey="${pubkey}" relays="${relays.join(',')}" name="${name}" data-type="${type}" class="linkish_editor">@${name}</span>`;
    }

    if (['note', 'nevent'].includes(type)) {
      // return `nostr:${bech32}`;
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const note = foundNotes[bech32];

      const el = renderEmbeddedNote({
        note: note,
        // mentionedUsers: note.mentionedUsers,
        // includeEmbeds: true,
        // hideFooter: true,
        // noLinks: "links",
      })

      const mention = document.createElement('div');
      mention.setAttribute('data-type', type);
      mention.setAttribute('data-bech32', bech32);
      mention.setAttribute('data-relays', '');
      mention.setAttribute('data-id', note.id);
      mention.setAttribute('data-kind', `${Kind.Text}`);
      mention.setAttribute('data-author', note.user.npub);
      mention.setAttribute('type', type);
      mention.setAttribute('bech32', bech32);
      mention.setAttribute('relays', '');
      mention.setAttribute('id', note.id);
      mention.setAttribute('kind', `${Kind.Text}`);
      mention.setAttribute('author', note.user.npub);
      mention.innerHTML = el;

      return mention.outerHTML;
    }

    if (['naddr'].includes(type)) {
      // return `nostr:${bech32}`;
      const pubkey = 'placeholder-pubkey';
      const relays: string[] = [];
      const article = foundArticles[bech32];

      const el = renderArticleReviewPreview({
        article,
      })

      const mention = document.createElement('div');
      mention.setAttribute('data-type', type);
      mention.setAttribute('data-bech32', bech32);
      mention.setAttribute('data-relays', '');
      mention.setAttribute('data-id', article.id);
      mention.setAttribute('data-kind', `${Kind.Text}`);
      mention.setAttribute('data-author', article.user.npub);
      mention.setAttribute('type', type);
      mention.setAttribute('bech32', bech32);
      mention.setAttribute('relays', '');
      mention.setAttribute('id', article.id);
      mention.setAttribute('kind', `${Kind.LongForm}`);
      mention.setAttribute('author', article.user.npub);
      // @ts-ignore
      mention.innerHTML = el;

      return mention.outerHTML;
    }

    return bech32;
  });
}

export const mdToHtml = async (markdown: string) => {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm, {
        tableCellPadding: false,
        tablePipeAlign: false,
      })
      // .use(remarkImages)
      .use(remarkRehype, {
        allowDangerousHtml: true,
      })
      // .use(rehypeExtendedTable)
      // .use(rehypeRaw)
      .use(rehypeStringify);
      // .process(markdown);


    const result = await processor.process(markdown);
    let html = result.toString();

    // Process the HTML for nostr identifiers
    html = await processMarkdownForNostr(html);

    html = processMarkdownForExternalMedia(html);

    return html;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback to simple conversion or return original markdown
    return `<pre>${markdown}</pre>`;
  }
}

export const htmlToMd = (html: string): string => {
  try {
    // Process HTML to handle nostr spans before converting to markdown
    let processedHtml = processHTMLForNostr(html);

    processedHtml = processHTMLForExternalMedia(processedHtml);

    const result = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify, {
        fences: true,
        incrementListMarker: true,
        // table: true,
        // tableCellPadding: true,
        // tablePipeAlign: true
      })
      .processSync(processedHtml);

    return result.toString().replaceAll('\n\n', '\n');
  } catch (error) {
    console.error('Error converting HTML to markdown:', error);
    // Return a sanitized version of the HTML as fallback
    return html.replace(/<[^>]*>/g, '');
  }
}

export const cToMd = (doc: ProsemirrorNode): string => {
  try {
    // Convert ProseMirror document to HTML
    const div = document.createElement('div');
    const fragment = DOMSerializer.fromSchema(doc.type.schema).serializeFragment(doc.content);
    div.appendChild(fragment);

    // Convert HTML to markdown
    return htmlToMd(div.innerHTML);
  } catch (error) {
    console.error('Error converting document to markdown:', error);
    return '';
  }
}

export const MarkdownPlugin = Extension.create<MarkdownPluginOptions>({
  name: 'markdown',

  addOptions() {
    return defaultMarkdownPluginOptions
  },

  addProseMirrorPlugins() {
    const { exportOnUpdate, importOnPaste, onMarkdownUpdate } = this.options

    return [
      new Plugin({
        key: new PluginKey('markdown'),
        props: {
          handlePaste: (view, event) => {
            if (!importOnPaste) {
              return false
            }

            const clipboardData = event.clipboardData
            if (!clipboardData) {
              return false
            }

            const text = clipboardData.getData('text/plain')
            if (!text) {
              return false
            }

            try {
              // Check if text is markdown by looking for common markdown patterns
              const hasMarkdownSyntax = /^#|\n#|^-|\n-|^\*|\n\*|^\d+\.|\n\d+\.|^>|\n>|^\[.*\]|^\s*```|\|.*\|/.test(text)

              if (hasMarkdownSyntax) {
                // Convert markdown to HTML
                const html = mdToHtml(text)

                // Parse HTML to DOM
                // @ts-ignore
                const parser = new DOMParser()
                // @ts-ignore
                const dom = parser.parseFromString(html, 'text/html')

                // Insert content at current selection
                const slice = DOMParser.fromSchema(view.state.schema).parseSlice(dom.body)
                const transaction = view.state.tr.replaceSelection(slice)
                view.dispatch(transaction)

                return true
              }
            } catch (error) {
              console.error('Error parsing markdown:', error)
            }

            return false
          }
        },

        // Track updates and convert to markdown if needed
        appendTransaction: (transactions, oldState, newState) => {
          if (!exportOnUpdate) {
            return null
          }

          const docChanged = transactions.some(tr => tr.docChanged)

          if (docChanged && onMarkdownUpdate) {
            const markdown = cToMd(newState.doc)
            onMarkdownUpdate(markdown)
          }

          return null
        }
      })
    ]
  },

  // Methods to convert between formats
  async markdownToHtml(markdown: string) {
    return await mdToHtml(markdown);
  },

  htmlToMarkdown(html: string): string {
    return htmlToMd(html);
  },

  contentToMarkdown(doc: ProsemirrorNode): string {
    return cToMd(doc);
  },

  // Add utility methods for external use
  extendMarkdownEditor(editor: any) {
    return {
      ...editor,
      getMarkdown: () => {
        if (!editor) return ''
        return this.contentToMarkdown(editor.state.doc)
      },
      setMarkdown: async (markdown: string) => {
        if (!editor) return
        const html = await mdToHtml(markdown);
        editor.commands.setContent(html, false);
      }
    }
  }
})

// Add utility methods for external use
export const extendMarkdownEditor = (editor: Editor) => {
  return {
    ...editor,
    getMarkdown: () => {
      if (!editor) return ''
      return cToMd(editor.state.doc)
    },
    setMarkdown: async (markdown: string) => {
      if (!editor) return
      let html = await mdToHtml(markdown)

      editor.commands.setContent(html, false);
      // editorTipTap()?.chain().setContent(html, false).focus().run();
      // editor.commands.setContent('', false)
      // editor.chain().
      //   setContent(html, false).
      //   applyNostrPasteRules(html).
      //   applyNProfilePasteRules(html).
      //   applyNAddrPasteRules(html).
      //   focus().run();
    }
  }
}


// nostr:nevent1qvzqqqqqqypzpzxvzd935e04fm6g4nqa7dn9qc7nafzlqn4t3t6xgmjkr3dwnyreqqsx6u9ykdnn50df50prxl2rkt0zl03y0x2wudl5esnw9td6phjeekgnj2yfp
