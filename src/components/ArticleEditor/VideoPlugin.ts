import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: any) => ReturnType,
    }
  }
}

export const Video = Node.create({
  name: 'video',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      ratio: {
        default: null,
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes)]
  },

  addCommands() {
    return {
      setVideo: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  // Auto-convert video URLs to video elements
  addInputRules() {
    return [
      {
        find: /(?:https?:\/\/)?(?:www\.)?.*\.(mp4|webm|ogg|mov|avi)(?:\?[^\s]*)?$/gi,
        handler: ({ state, range, match }) => {
          const url = match[0]
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ src: url }))
        },
      },
    ]
  },

  // Handle pasted video URLs
  addPasteRules() {
    return [
      {
        find: /(?:https?:\/\/)?(?:www\.)?.*\.(mp4|webm|ogg|mov|avi)(?:\?[^\s]*)?/gi,
        handler: ({ state, range, match }) => {
          const url = match[0]
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ src: url }))
        },
      },
    ]
  },
})
