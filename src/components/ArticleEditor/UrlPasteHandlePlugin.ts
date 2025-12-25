import { Image } from '@tiptap/extension-image'
import { Plugin } from 'prosemirror-state'
import { Extension } from '@tiptap/core'
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
  let insertPos = tr.selection.from

  // Split by lines first
  const lines = text.split(/\r?\n/)

  lines.forEach((line: string, lineIndex: number) => {
    if (!line.trim()) {
      // Empty line - add paragraph
      if (lineIndex < lines.length - 1) {
        const emptyParagraph = schema.nodes.paragraph.create()
        tr = tr.insert(insertPos, emptyParagraph)
        insertPos += emptyParagraph.nodeSize
      }
      return
    }

    // Process each line for URLs
    const urlRegex = /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s]*)?/gi
    const parts = splitTextByUrls(line, urlRegex)

    let lineContent: string[] = []

    parts.forEach(part => {
      if (isImageUrl(part)) {
        // Add any accumulated text first
        if (lineContent.length > 0) {
          const textContent = lineContent.join(' ').trim()
          if (textContent) {
            const textNode = schema.text(textContent)
            const paragraph = schema.nodes.paragraph.create({}, textNode)
            tr = tr.insert(insertPos, paragraph)
            insertPos += paragraph.nodeSize
          }
          lineContent = []
        }

        // Add image
        const imageNode = schema.nodes.image.create({ src: part })
        tr = tr.insert(insertPos, imageNode)
        insertPos += imageNode.nodeSize
        tr = tr.insert(insertPos, schema.text(' '));
      } else {
        lineContent.push(part)
      }
    })

    // Add any remaining text
    if (lineContent.length > 0) {
      const textContent = lineContent.join(' ').trim()
      if (textContent) {
        const textNode = schema.text(textContent)
        const paragraph = schema.nodes.paragraph.create({}, textNode)
        tr = tr.insert(insertPos, paragraph)
        insertPos += paragraph.nodeSize
      }
    }
  })

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
