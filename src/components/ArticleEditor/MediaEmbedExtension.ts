import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbed: {
      insertMediaEmbed: (options: any) => ReturnType,
    }
  }
}


const convertUrlToEmbed = (url: string) => {
  const patterns = {
    // Spotify
    spotify: {
      regex: /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
      convert: (match: string[]) => ({
        src: `https://open.spotify.com/embed/${match[1]}/${match[2]}`,
        service: 'spotify',
        originalUrl: url
      })
    },

    // YouTube
    youtube: {
      regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
      convert: (match: string[]) => ({
        src: `https://www.youtube.com/embed/${match[1]}`,
        service: 'youtube',
        originalUrl: url
      })
    },

    // SoundCloud
    soundcloud: {
      regex: /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/,
      convert: () => ({
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`,
        service: 'soundcloud',
        originalUrl: url
      })
    },

    // Mixcloud
    mixcloud: {
      regex: /(?:https?:\/\/)?(?:www\.)?mixcloud\.com\/([^\/]+)\/([^\/\?]+)/,
      convert: (match: string[]) => ({
        src: `https://www.mixcloud.com/widget/iframe/?hide_cover=1&feed=%2F${match[1]}%2F${match[2]}%2F`,
        service: 'mixcloud',
        originalUrl: url
      })
    },

    // Tidal
    tidal: {
      regex: /(?:https?:\/\/)?(?:www\.)?tidal\.com\/browse\/(track|album|playlist)\/([0-9]+)/,
      convert: (match: string[]) => ({
        src: `https://embed.tidal.com/${match[1]}s/${match[2]}`,
        service: 'tidal',
        originalUrl: url
      })
    },

    // Twitch
    twitch: {
      regex: /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/,
      convert: (match: string[]) => ({
        src: `https://player.twitch.tv/?channel=${match[1]}&parent=${window.location.hostname}`,
        service: 'twitch',
        originalUrl: url
      })
    },

    // Rumble
    rumble: {
      regex: /(?:https?:\/\/)?(?:www\.)?rumble\.com\/([a-zA-Z0-9_-]+)/,
      convert: (match: string[]) => ({
        src: `https://rumble.com/embed/${match[1]}/`,
        service: 'rumble',
        originalUrl: url
      })
    },

    // Apple Music
    applemusic: {
      regex: /(?:https?:\/\/)?music\.apple\.com\/([a-z]{2})\/(album|song)\/[^\/]+\/([0-9]+)/,
      convert: (match: string[]) => ({
        src: `https://embed.music.apple.com/${match[1]}/${match[2]}/${match[3]}`,
        service: 'applemusic',
        originalUrl: url
      })
    },

    // Nostr Nests
    nostrnests: {
      regex: /(?:https?:\/\/)?(?:www\.)?nostrnests\.com\/([a-zA-Z0-9_-]+)/,
      convert: (match: string[]) => ({
        src: `https://nostrnests.com/embed/${match[1]}`,
        service: 'nostrnests',
        originalUrl: url
      })
    },

    // Wavlake
    wavlake: {
      regex: /(?:https?:\/\/)?(?:www\.)?wavlake\.com\/(track|album)\/([a-zA-Z0-9_-]+)/,
      convert: (match: string[]) => ({
        src: `https://embed.wavlake.com/${match[1]}/${match[2]}`,
        service: 'wavlake',
        originalUrl: url
      })
    }
  }

  for (const [service, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern.regex)
    if (match) {
      return pattern.convert(match)
    }
  }

  return null
}


const MediaEmbed = Node.create({
  name: 'mediaEmbed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      service: {
        default: null,
      },
      originalUrl: {
        default: null,
      },
      width: {
        default: '100%',
      },
      height: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-media-embed]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, service, width, height } = HTMLAttributes

    // Default heights for different services
    const defaultHeights: Record<string, string> = {
      spotify: '352',
      tidal: '400',
      soundcloud: '166',
      mixcloud: '180',
      youtube: '315',
      twitch: '378',
      rumble: '315',
      applemusic: '450',
      nostrnests: '400',
      wavlake: '400'
    }

    const finalHeight = height || defaultHeights[service] || '400'

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-media-embed': service,
        style: `width: ${width}; height: ${finalHeight}px; max-width: 100%;`
      }),
      [
        'iframe',
        {
          src,
          width: '100%',
          height: '100%',
          frameborder: '0',
          allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
          loading: 'lazy',
        },
      ],
    ]
  },

  addCommands() {
    return {
      insertMediaEmbed: (options: any) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mediaEmbedAutoReplace'),
        props: {
          handleDOMEvents: {
            paste: (view, event) => {
              // @ts-ignore
              const clipboardData = event.clipboardData || window.clipboardData;
              const pastedText = clipboardData.getData('text')

              const embedData = convertUrlToEmbed(pastedText.trim())
              if (embedData) {
                event.preventDefault()

                const { state, dispatch } = view
                const { selection } = state
                const { from } = selection

                const tr = state.tr.replaceWith(
                  from,
                  from,
                  state.schema.nodes.mediaEmbed.create(embedData)
                )

                dispatch(tr)
                return true
              }

              return false
            }
          }
        }
      })
    ]
  },

})

export default MediaEmbed
