import { Image } from '@tiptap/extension-image'
import { Plugin } from 'prosemirror-state'
import { Extension } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import { EditorView } from 'prosemirror-view';


export const isImageUrl = (text: string) => {
  return /^https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?$/i.test(text.trim())
};


export const containsImageUrls = (text: string) => {
  return /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi.test(text)
};

export const processTextWithImages = (view: EditorView, text: string) => {
  const { schema } = view.state
  let tr = view.state.tr.deleteSelection()
  const insertPos = tr.selection.from

  // Build all content as block-level paragraphs upfront to avoid
  // position tracking issues from incremental inserts
  const blocks: any[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((line: string, lineIndex: number) => {
    if (!line.trim()) {
      if (lineIndex < lines.length - 1) {
        blocks.push(schema.nodes.paragraph.create())
      }
      return
    }

    const urlRegex = /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi
    const parts = splitTextByUrls(line, urlRegex)
    let lineContent: string[] = []

    const flushText = () => {
      if (lineContent.length > 0) {
        const textContent = lineContent.join(' ').trim()
        if (textContent) {
          blocks.push(schema.nodes.paragraph.create({}, schema.text(textContent)))
        }
        lineContent = []
      }
    }

    parts.forEach(part => {
      if (isImageUrl(part)) {
        flushText()
        const imageNode = schema.nodes.image.create({ src: part })
        blocks.push(schema.nodes.paragraph.create({}, imageNode))
      } else {
        lineContent.push(part)
      }
    })

    flushText()
  })

  if (blocks.length > 0) {
    tr = tr.insert(insertPos, Fragment.from(blocks))
  }

  tr.setMeta('paste', true)
  view.dispatch(tr)
};

export const splitTextByUrls = (text: string, urlRegex: RegExp) => {
  const parts = []
  let lastIndex = 0
  let match

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add URL
    parts.push(match[0])
    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.filter(part => part.trim())
};

export const SmartImagePasteHandler = Extension.create({
  name: 'smartImagePasteHandler',
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event, slice) => {
            const text = event.clipboardData?.getData('text/plain')

            if (text && containsImageUrls(text)) {
              processTextWithImages(view, text)
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})

// Keep the paste rules as fallback
export const EnhancedImage = Image.extend({
  // @ts-ignore return type
  addPasteRules() {
    return [
      {
        find: /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi,
        handler: ({ state, range, match }) => {
          const url = match[0]
          const imageNode = state.schema.nodes.image.create({ src: url })
          return state.tr.replaceRangeWith(range.from, range.to, imageNode)
        },
        priority: 1000,
      },
    ]
  },
})
