import { JSONContent } from '@tiptap/core';

export type ExtMediaConfig = {
  src: string,
  service: string,
  originalUrl: string,
};

export type ExtMediaService = {
  regex: RegExp,
  convert: (match: string[], ...strings: string[]) => ExtMediaConfig;
};

export const convertConfig: Record<string, ExtMediaService> = {
  // Spotify
  spotify: {
    regex: /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/g,
    convert: (match, type, id) => ({
      src: `https://open.spotify.com/embed/${type}/${id}`,
      service: 'spotify',
      originalUrl: match[0]
    })
  },

  // YouTube
  youtube: {
    regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/g,
    convert: (match, videoId) => ({
      src: `https://www.youtube.com/embed/${videoId}`,
      service: 'youtube',
      originalUrl: match[0]
    })
  },

  // SoundCloud
  soundcloud: {
    regex: /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/g,
    convert: (match) => ({
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(match[0])}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`,
      service: 'soundcloud',
      originalUrl: match[0]
    })
  },

  // Mixcloud
  mixcloud: {
    regex: /(?:https?:\/\/)?(?:www\.)?mixcloud\.com\/([^\/]+)\/([^\/\?]+)/g,
    convert: (match, user, show) => ({
      src: `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${user}%2F${show}%2F`,
      service: 'mixcloud',
      originalUrl: match[0]
    })
  },

  // Tidal
  tidal: {
    regex: /(?:https?:\/\/)?(?:www\.)?tidal\.com\/browse\/(track|album|playlist)\/([0-9]+)/g,
    convert: (match, type, id) => ({
      src: `https://embed.tidal.com/${type}s/${id}`,
      service: 'tidal',
      originalUrl: match[0]
    })
  },

  // Twitch
  twitch: {
    regex: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/g,
    convert: (match, channel) => ({
      src: `https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`,
      service: 'twitch',
      originalUrl: match[0]
    })
  },

  // Rumble
  rumble: {
    regex: /(?:https?:\/\/)?(?:www\.)?rumble\.com\/([a-zA-Z0-9_-]+)/g,
    convert: (match, videoId) => ({
      src: `https://rumble.com/embed/${videoId}/`,
      service: 'rumble',
      originalUrl: match[0]
    })
  },

  // Apple Music
  applemusic: {
    regex: /(?:https?:\/\/)?music\.apple\.com\/([a-z]{2})\/(album|song)\/[^\/]+\/([0-9]+)/g,
    convert: (match, country, type, id) => ({
      src: `https://embed.music.apple.com/${country}/${type}/${id}`,
      service: 'applemusic',
      originalUrl: match[0]
    })
  },

  // Nostr Nests
  // nostrnests: {
  //   regex: /(?:https?:\/\/)?(?:www\.)?nostrnests\.com\/([a-zA-Z0-9_-]+)/g,
  //   convert: (match, nestId) => ({
  //     src: `https://nostrnests.com/embed/${nestId}`,
  //     service: 'nostrnests',
  //     originalUrl: match[0]
  //   })
  // },

  // Wavlake
  wavlake: {
    regex: /(?:https?:\/\/)?(?:www\.)?wavlake\.com\/(track|album)\/([a-zA-Z0-9_-]+)/g,
    convert: (match, type, id) => ({
      src: `https://embed.wavlake.com/${type}/${id}`,
      service: 'wavlake',
      originalUrl: match[0]
    })
  }
}


/**
 * Converts TipTap editor JSON content to plain text representation
 * @param {Object} json - TipTap JSON content
 * @returns {string} Plain text representation
 */
export const tiptapJsonToPlainText = (json: any) => {
  if (!json || typeof json !== 'object') {
    return '';
  }

  // Handle different node types
  if (json.type === 'text') {
    return json.text || '';
  }

  // Handle Nostr specific types
  if (['nprofile', 'nevent', 'naddr'].includes(json.type)) {
    const bech32 = json.attrs?.bech32;
    return bech32 ? `nostr:${bech32}` : '';
  }

  // Handle media types - convert to URLs
  if (json.type === 'image') {
    return json.attrs?.src || '';
  }

  if (json.type === 'video') {
    return json.attrs?.src || '';
  }

  if (json.type === 'mediaEmbed') {
    return json.attrs?.originalUrl || json.attrs?.src || '';
  }

  // Handle other media types that might have URLs
  if (json.attrs?.src) {
    return json.attrs.src;
  }

  if (json.attrs?.href) {
    return json.attrs.href;
  }

  // Handle block-level elements (add newlines)
  const blockElements = ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem'];
  const isBlock = blockElements.includes(json.type);

  let result = '';

  // Process content array if it exists
  if (json.content && Array.isArray(json.content)) {
    for (let i = 0; i < json.content.length; i++) {
      const childText = tiptapJsonToPlainText(json.content[i]);
      result += childText;
    }
  }

  // Add newlines for block elements (except for the root doc)
  if (isBlock && json.type !== 'doc') {
    result += '\n';
  }

  return result;
}

/**
 * Converts plain text back to TipTap editor JSON content
 * @param {string} plainText - Plain text to convert
 * @returns {Object} TipTap JSON content
 */
export const plainTextToTiptapJson = (plainText: string): JSONContent => {
  if (typeof plainText !== 'string') {
    return { type: 'doc', content: [] };
  }
  const lines = plainText.split('\n');
  const content = [];

  for (const line of lines) {
    if (line.trim() === '') {
      // Empty line - create empty paragraph
      content.push({ type: 'paragraph' });
      continue;
    }

    const paragraphContent = [];

    // Split line by spaces to process each token
    const tokens = line.split(/(\s+)/); // Keep whitespace in the split

    for (const token of tokens) {
      // Look for external media
      let externalMediaEmbed: ExtMediaConfig | undefined;

      for (const service of Object.keys(convertConfig)) {
        const config = convertConfig[service];
        const regex = new RegExp(config.regex.source, config.regex.flags);
        let match = regex.exec(token);

        if (match !== null) {
          externalMediaEmbed = config.convert(match, ...match.slice(1));
          break;
        }
      }

      if (externalMediaEmbed) {
        paragraphContent.push({
          type: 'mediaEmbed',
          attrs: {
            ...externalMediaEmbed
          }
        });
        continue;
      }

      if (token.match(/^\s+$/) && token.length > 0) {
        // Pure whitespace token
        paragraphContent.push({
          type: 'text',
          text: token
        });
        continue;
      }

      if (token.startsWith('nostr:')) {
        // Handle Nostr entities
        const bech32 = token.substring(6); // Remove 'nostr:' prefix

        let nostrType = 'nprofile';

        if (bech32.startsWith('nevent')) {
          nostrType = 'nevent';
        }

        if (bech32.startsWith('naddr')) {
          nostrType = 'naddr';
        }

        const nostrNode = {
          type: nostrType,
          attrs: {
            type: nostrType,
            bech32: bech32
          }
        };

        // Add additional attrs based on type
        if (nostrType === 'nprofile') {
          // @ts-ignore
          nostrNode.attrs.pubkey = '';
          // @ts-ignore
          nostrNode.attrs.relays = [];
          // @ts-ignore
          nostrNode.attrs.name = '';
          // @ts-ignore
        }

        if (nostrType === 'nevent') {
          // @ts-ignore
          nostrNode.attrs.id = '';
          // @ts-ignore
          nostrNode.attrs.kind = 1;
          // @ts-ignore
          nostrNode.attrs.author = '';
          // @ts-ignore
          nostrNode.attrs.relays = [];
        }

        paragraphContent.push(nostrNode);
        continue;
      }

      if (token.match(/^https?:\/\//)) {
        // Handle URLs - could be images, videos, or regular links
        if (token.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          paragraphContent.push({
            type: 'image',
            attrs: {
              src: token
            }
          });
          continue;
        }
        if (token.match(/\.(mp4|webm|ogg|mov)$/i)) {
          paragraphContent.push({
            type: 'video',
            attrs: {
              src: token
            }
          });
          continue;
        }

        // Regular text that happens to be a URL
        paragraphContent.push({
          type: 'text',
          text: token
        });
        continue;
      }

      if (token.trim() !== '') {
        // Regular text
        paragraphContent.push({
          type: 'text',
          text: token
        });
        continue;
      }
    }

    // Create paragraph with content, or empty paragraph if no content
    if (paragraphContent.length > 0) {
      content.push({
        type: 'paragraph',
        content: paragraphContent
      });
    } else {
      content.push({ type: 'paragraph' });
    }
  }

  return {
    type: 'doc',
    content: content
  };
}
