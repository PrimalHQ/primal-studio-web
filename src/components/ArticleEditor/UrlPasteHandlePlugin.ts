import { Image } from '@tiptap/extension-image'

export default Image.extend({
  addPasteRules() {
    return [
      {
        find: /(?:https?:\/\/)?(?:www\.)?[\w\-\.]+\.[\w]{2,}\/[\w\-\.\/]*\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[\w\-\.=&]*)?/gi,
        handler: ({ state, range, match }) => {
          let url = match[0]

          // Add protocol if missing
          if (!url.startsWith('http')) {
            url = 'https://' + url
          }

          const node = state.schema.nodes.image.create({ src: url })
          const transaction = state.tr.replaceRangeWith(range.from, range.to, node)
          return transaction
        },
        priority: 102,
      },
    ]
  },
})
