import { Editor, Node, mergeAttributes } from '@tiptap/core'

export const ImageGrid = Node.create({
  name: 'imageGrid',

  group: 'block',
  atom: true,

  content: 'image{1,}', // At least 2 images

  addAttributes() {
    return {
      columns: {
        default: 2,
      },
      images: {
        default: [],
        parseHTML: element => {
          const images = Array.from(element.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt || '',
            title: img.title || ''
          }))
          return images
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-grid"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const items = node.content.childCount;

    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'image-grid',
      class: `image-grid-editor gallery-${items}`,
      items,
    }), 0]
  },

  addCommands() {
    return {
      createImageGrid: (attributes = {}) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: attributes,
        })
      },
    }
  },
})


export const forceUpdateImageGrids = (editor: Editor) => {
  const { state } = editor
  let tr = state.tr.setMeta('skipGridUpdate', true) // Mark this transaction
  let modified = false

  state.doc.descendants((node, pos) => {
    if (node.type.name === 'imageGrid') {
      tr = tr.setNodeMarkup(pos, null, node.attrs)
      modified = true
    }
  })

  if (modified) {
    editor.view.dispatch(tr)
  }
}
