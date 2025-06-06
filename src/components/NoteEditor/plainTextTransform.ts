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
export const plainTextToTiptapJson = (plainText: string) => {
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
      if (token.match(/^\s+$/)) {
        // Pure whitespace token
        if (token.length > 0) {
          paragraphContent.push({
            type: 'text',
            text: token
          });
        }
      }
      else if (token.startsWith('nostr:')) {
        // Handle Nostr entities
        const bech32 = token.substring(6); // Remove 'nostr:' prefix

        let nostrType = 'nprofile'; // default
        if (bech32.startsWith('nevent')) {
          nostrType = 'nevent';
        } else if (bech32.startsWith('naddr')) {
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
        } else if (nostrType === 'nevent') {
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
      }
      else if (token.match(/^https?:\/\//)) {
        // Handle URLs - could be images, videos, or regular links
        if (token.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          paragraphContent.push({
            type: 'image',
            attrs: {
              src: token
            }
          });
        } else if (token.match(/\.(mp4|webm|ogg|mov)$/i)) {
          paragraphContent.push({
            type: 'video',
            attrs: {
              src: token
            }
          });
        } else {
          // Regular text that happens to be a URL
          paragraphContent.push({
            type: 'text',
            text: token
          });
        }
      }
      else if (token.trim() !== '') {
        // Regular text
        paragraphContent.push({
          type: 'text',
          text: token
        });
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
