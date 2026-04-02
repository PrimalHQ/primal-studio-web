import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core'

export interface VideoOptions {
  /**
   * HTML attributes applied to the <video> element.
   */
  HTMLAttributes: Record<string, unknown>
  /**
   * Whether to show native browser controls. Defaults to true.
   */
  controls: boolean
  /**
   * Whether to autoplay. Defaults to false.
   */
  autoplay: boolean
  /**
   * Whether to loop. Defaults to false.
   */
  loop: boolean
  /**
   * Whether to mute by default. Defaults to false.
   */
  muted: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      /**
       * Insert a video node at the current position.
       */
      setVideo: (attr: Record<string, string>) => ReturnType
    }
  }
}

// Matches .mp4 .mov .webm .ogg .avi URIs (http/https/relative)
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg|avi)(\?[^\s]*)?$/i

/**
 * Detects whether a string looks like a video URI.
 */
export function isVideoUri(uri: string): boolean {
  return VIDEO_EXTENSIONS.test(uri.trim())
}

/**
 * Regex used for InputRule and PasteRule.
 * Matches a bare URI ending in a supported video extension, optionally
 * preceded by whitespace / start-of-line and followed by end-of-line / space.
 */
// InputRule uses this without the global flag (it matches once per node)
const VIDEO_URI_REGEX =
  /(?:^|\s)((?:https?:\/\/|\/)[^\s]*\.(?:mp4|mov|webm|ogg|avi)(?:\?[^\s]*)?)(?:\s|$)/i

// nodePasteRule calls matchAll() internally, which requires the global flag
const VIDEO_URI_REGEX_GLOBAL =
  /(?:^|\s)((?:https?:\/\/|\/)[^\s]*\.(?:mp4|mov|webm|ogg|avi)(?:\?[^\s]*)?)(?:\s|$)/gi

export const Video = Node.create<VideoOptions>({
  name: 'video',

  group: 'block',

  atom: true, // treated as a single, indivisible unit

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      controls: true,
      autoplay: false,
      loop: false,
      muted: false,
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => {
          if (!attributes.src) return {}
          return { src: attributes.src }
        },
      },
      controls: {
        default: this.options.controls,
        parseHTML: (element) => element.hasAttribute('controls'),
        renderHTML: (attributes) => (attributes.controls ? { controls: '' } : {}),
      },
      autoplay: {
        default: this.options.autoplay,
        parseHTML: (element) => element.hasAttribute('autoplay'),
        renderHTML: (attributes) => (attributes.autoplay ? { autoplay: '' } : {}),
      },
      loop: {
        default: this.options.loop,
        parseHTML: (element) => element.hasAttribute('loop'),
        renderHTML: (attributes) => (attributes.loop ? { loop: '' } : {}),
      },
      muted: {
        default: this.options.muted,
        parseHTML: (element) => element.hasAttribute('muted'),
        renderHTML: (attributes) => (attributes.muted ? { muted: '' } : {}),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addCommands() {
    return {
      setVideo:
        (attrs: Record<string, string>) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...attrs },
          })
        },
    }
  },

  /**
   * InputRule: when a user types a video URI and presses Space or Enter,
   * the plain text is replaced with a video node.
   */
  addInputRules() {
    return [
      new InputRule({
        find: VIDEO_URI_REGEX,
        handler: ({ state, range, match }) => {
          const src = match[1]?.trim()
          if (!src) return null

          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ src }))
        },
      }),
    ]
  },

  /**
   * PasteRule: when a video URI is pasted, convert it to a video node.
   */
  addPasteRules() {
    return [
      nodePasteRule({
        find: VIDEO_URI_REGEX_GLOBAL,
        type: this.type,
        getAttributes: (match) => ({
          src: match[1]?.trim(),
        }),
      }),
    ]
  },
})

export default Video
