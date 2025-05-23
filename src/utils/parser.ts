export type NoteAST = {
  type: string,
  url?: string,
  value?: string,
  raw?: string,
}

export const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(\?\S*)?(\s|$)/i;

export const isYouTube = (url: string) => youtubeRegex.test(url);

/**
 * Parses text into an Abstract Syntax Tree (AST)
 * Recognizes images, videos, YouTube videos, links, emojis, hashtags, and Nostr entities
 * @param {string} text - The text to parse
 * @returns {NoteAST[]} - Array of AST nodes
 */
export const parseTextToAST = (text: string): NoteAST[] => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Final result array
  const result = [];

  // Remaining text to process
  let remaining = text;

  // Process until no text remains
  while (remaining.length > 0) {
    // Try to match various patterns in priority order

    // 1. Image URLs (.jpg, .jpeg, .png, .gif, .webp)
    const imageMatch = remaining.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?(\s|$)/i);
    if (imageMatch && imageMatch.index === 0) {
      result.push({
        type: 'image',
        url: imageMatch[0].trim(),
      });
      remaining = remaining.slice(imageMatch[0].length);
      continue;
    }

    // 2. Video URLs (.mp4, .webm, .mov, .avi)
    const videoMatch = remaining.match(/https?:\/\/\S+\.(mp4|webm|mov|avi)(\?\S*)?(\s|$)/i);
    if (videoMatch && videoMatch.index === 0) {
      result.push({
        type: 'video',
        url: videoMatch[0].trim(),
      });
      remaining = remaining.slice(videoMatch[0].length);
      continue;
    }

    // 3. YouTube videos
    const youtubeMatch = remaining.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch.index === 0) {
      result.push({
        type: 'youtube',
        url: youtubeMatch[0].trim(),
      });
      remaining = remaining.slice(youtubeMatch[0].length);
      continue;
    }

    // 4. Other URLs
    const urlMatch = remaining.match(/https?:\/\/\S+(\s|$)/i);
    if (urlMatch && urlMatch.index === 0) {
      result.push({
        type: 'link',
        url: urlMatch[0].trim(),
      });
      remaining = remaining.slice(urlMatch[0].length);
      continue;
    }

    // 5. Emojis (text between two colons)
    const emojiMatch = remaining.match(/:[^:]+:/);
    if (emojiMatch && emojiMatch.index === 0) {
      result.push({
        type: 'emoji',
        value: emojiMatch[0].slice(1, -1), // Remove the colons
      });
      remaining = remaining.slice(emojiMatch[0].length);
      continue;
    }

    // 6. Hashtags (# followed by word characters)
    const hashtagMatch = remaining.match(/#[^\s#]+/);
    if (hashtagMatch && hashtagMatch.index === 0) {
      result.push({
        type: 'hashtag',
        value: hashtagMatch[0].slice(1), // Remove the #
        raw: hashtagMatch[0],
      });
      remaining = remaining.slice(hashtagMatch[0].length);
      continue;
    }

    // 7. Nostr events
    const nostrEventMatch = remaining.match(/(nostr:)?nevent1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/);
    if (nostrEventMatch && nostrEventMatch.index === 0) {
      result.push({
        type: 'nostrEvent',
        value: nostrEventMatch[0],
      });
      remaining = remaining.slice(nostrEventMatch[0].length);
      continue;
    }

    // 8. Nostr notes
    const nostrNoteMatch = remaining.match(/(nostr:)?note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/);
    if (nostrNoteMatch && nostrNoteMatch.index === 0) {
      result.push({
        type: 'nostrNote',
        value: nostrNoteMatch[0],
      });
      remaining = remaining.slice(nostrNoteMatch[0].length);
      continue;
    }

    // 9. Nostr profiles
    const nostrProfileMatch = remaining.match(/(nostr:)?nprofile1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/);
    if (nostrProfileMatch && nostrProfileMatch.index === 0) {
      result.push({
        type: 'nostrProfile',
        value: nostrProfileMatch[0],
      });
      remaining = remaining.slice(nostrProfileMatch[0].length);
      continue;
    }

    // 10. Nostr npubs
    const nostrNpubMatch = remaining.match(/(nostr:)?npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/);
    if (nostrNpubMatch && nostrNpubMatch.index === 0) {
      result.push({
        type: 'nostrNpub',
        value: nostrNpubMatch[0],
      });
      remaining = remaining.slice(nostrNpubMatch[0].length);
      continue;
    }

    // 11. Nostr replaceable events
    const nostrReplacableMatch = remaining.match(/(nostr:)?naddr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/);
    if (nostrReplacableMatch && nostrReplacableMatch.index === 0) {
      result.push({
        type: 'nostrReplaceable',
        value: nostrReplacableMatch[0],
      });
      remaining = remaining.slice(nostrReplacableMatch[0].length);
      continue;
    }

    // 12. If no special pattern found, collect plain text until next special pattern
    let nextSpecialIndex = findNextSpecialPattern(remaining);

    if (nextSpecialIndex === -1) {
      // No more special patterns, rest is all text
      if (result.length > 0 && result[result.length - 1].type === 'text') {
        // Append to previous text node if the last node was also text
        result[result.length - 1].value += remaining;
      } else {
        // Create new text node
        result.push({
          type: 'text',
          value: remaining,
        });
      }
      remaining = '';
    } else {
      // Extract text until the next special pattern
      const textPart = remaining.slice(0, nextSpecialIndex);
      if (textPart) {
        if (result.length > 0 && result[result.length - 1].type === 'text') {
          // Append to previous text node if the last node was also text
          result[result.length - 1].value += textPart;
        } else {
          // Create new text node
          result.push({
            type: 'text',
            value: textPart,
          });
        }
      }
      remaining = remaining.slice(nextSpecialIndex);
    }
  }

  return result;
}

/**
 * Helper function to find the index of the next special pattern in the text
 * @param {string} text - The text to search in
 * @returns {number} - Index of the next special pattern or -1 if none found
 */
function findNextSpecialPattern(text: string) {
  const patterns = [
    /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)(\?\S*)?(\s|$)/i,           // Image URLs
    /https?:\/\/\S+\.(mp4|webm|mov|avi)(\?\S*)?(\s|$)/i,                // Video URLs
    /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}(\?\S*)?(\s|$)/i, // YouTube
    /https?:\/\/\S+(\s|$)/i,                                            // Other URLs
    /:[^:]+:/,                                                           // Emojis
    /#[^\s#]+/,                                                          // Hashtags
    /(nostr:)?nevent1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/,               // Nostr events
    /(nostr:)?note1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/,                 // Nostr notes
    /(nostr:)?nprofile1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/,             // Nostr profiles
    /(nostr:)?npub1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/,                 // Nostr npubs
    /(nostr:)?naddr1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+/                 // Nostr replaceable events
  ];

  let earliestIndex = -1;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const index = match?.index || 0;
    if (match && (earliestIndex === -1 || index < earliestIndex)) {
      earliestIndex = index;
    }
  }

  return earliestIndex;
}

// Example usage
function testParser() {
  const testText = `Check out this image https://example.com/image.jpg and this video https://example.com/video.mp4.
  Watch on YouTube: https://youtube.com/watch?v=dQw4w9WgXcQ
  Visit my website: https://example.com
  I love :heart: and :smile: emojis!
  Trending topics: #javascript #programming
  Nostr entities:
  - nevent1qqst8cuj0m363dt5wxdvkn66kw7rf8g2revs3m36f9nq5f3uea7dqpm0rgp
  - note1qqszfkmccfk5sp4c5z9u22t8tcmxegrfx240u6wj7nwjqg2lq0pcqqyh3qgl
  - nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nz9e3k7mg
  - npub1nlhnthxx5gvmkjq5nhk2hldvgxvfxwxsm6eusjj5p3fv93rcnlzqcnfuhh
  - naddr1qqxnzd3cxyerxd3h8qerwwfcqgsgydql3q4ka27d9wnlrmus6v74kmdqgsyg88st74k5cn9v94kzsrqsqqqa28jztfhv`;

  const ast = parseTextToAST(testText);
  console.log(JSON.stringify(ast, null, 2));
}

// Export the main function
// module.exports = parseTextToAST;
