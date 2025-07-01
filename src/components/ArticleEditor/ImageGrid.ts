import { Editor, Node, mergeAttributes } from '@tiptap/core'
import styles from './ImageGrid.module.scss';
import { removeImageFromGrid } from './AutoImageGridPlugin';


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGrid: {
      createImageGrid: (options: any) => ReturnType,
    }
  }
}

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
      maxVisible: {
        default: 4,
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
    const maxVisible = node.attrs.maxVisible || 4;
    const hasOverflow = items > maxVisible;

    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'image-grid',
      'data-image-count': items,
      'data-max-visible': maxVisible,
      'data-has-overflow': hasOverflow,
      class: `image-grid-editor ${hasOverflow ? 'scrollable' : ''} gallery-${Math.min(items, maxVisible)}`,
      style: hasOverflow ? 'max-height: 400px; overflow-y: auto;' : '',
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

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const container = document.createElement('div');
      const maxVisible = node.attrs.maxVisible || 4;
      const totalImages = node.content.childCount;
      const hasOverflow = totalImages > maxVisible;

      const gridClass = styles[`gallery-${Math.min(totalImages, maxVisible)}`];

      // Apply attributes
      Object.entries(mergeAttributes(HTMLAttributes, {
        'data-type': 'image-grid',
        'data-image-count': totalImages,
        'data-max-visible': maxVisible,
        'data-has-overflow': hasOverflow,
        class: `${styles.imageGridEditor} ${hasOverflow ? styles.scrollable : ''} ${gridClass}`,
      })).forEach(([key, value]) => {
        if (key === 'class') {
          container.className = value
        } else {
          container.setAttribute(key, value)
        }
      })

      container.style.width = 'min(500px, 100%)';


      const visibleCount = Math.min(totalImages, maxVisible)


      // Render images
      node.content.forEach((imageNode, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = styles.imgWrapper;

        const imgOverlay = document.createElement('div');
        imgOverlay.className = styles.imgOverlay;
        imgOverlay.textContent = 'Remove this image';

        const removeImageIcon = document.createElement('div');
        removeImageIcon.className = styles.closeIcon;

        // // Special positioning for 3 images
        if (visibleCount === 3) {
          if (index === 0) {
            imgWrapper.style.gridColumn = '1 / -1'
          }
        }

        const img = document.createElement('img')
        img.src = imageNode.attrs.src
        img.alt = imageNode.attrs.alt || ''
        img.title = imageNode.attrs.title || ''
        img.style.cssText = `
          cursor: pointer;
          transition: transform 0.2s ease;
        `

        img.addEventListener('mouseenter', () => {
          // img.style.transform = 'scale(1.05)'
        })

        img.addEventListener('mouseleave', () => {
          // img.style.transform = 'scale(1)'
        })

        // Add click handler for image actions (optional)
        img.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (typeof getPos === 'function') {
            const pos = getPos();
            if (pos !== undefined) {
              removeImageFromGrid(editor, pos, index);
            }
          }
        })

        imgOverlay.appendChild(removeImageIcon);
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(imgOverlay);
        container.appendChild(imgWrapper);
      })

      setTimeout(() => {
      // Create scrollable container if needed
      if (hasOverflow) {
        let containerW = container.getBoundingClientRect().width;
        let containerH = containerW;
        container.style.maxHeight = `${containerH}px`;
        container.style.overflow = 'hidden';
        // container.style.overflowY = 'scroll';

        // Add scroll indicator
        const scrollIndicator = document.createElement('div')
        scrollIndicator.className = styles.scrollIndicator;
        scrollIndicator.textContent = `+${totalImages - maxVisible}`;

        const indicatorDim = containerW/2;
        scrollIndicator.style.top = `${indicatorDim+0.5}px`;
        scrollIndicator.style.left = `${indicatorDim+0.5}px`;
        scrollIndicator.style.width = `${indicatorDim-0.5}px`;
        scrollIndicator.style.height = `${indicatorDim-0.5}px`;

        container.appendChild(scrollIndicator)

        container.addEventListener('mouseenter', (event: MouseEvent) => {
          const c = event.target as HTMLDivElement | null;
          if (!c) return;

          const cW = c.getBoundingClientRect().width;
          c.style.width = `${cW + 6}px`;
          c.style.overflowY = 'scroll';
          c.style.paddingRight = '6px';
          scrollIndicator.style.opacity = '0';
        })

        container.addEventListener('mouseleave', (event: MouseEvent) => {
          const c = event.target as HTMLDivElement | null;
          if (!c) return;

          c.style.width = 'min(100%, 500px)';
          c.style.overflowY = 'hidden';
          c.style.paddingRight = '0px';

          const isAtBottom = c.scrollHeight - c.scrollTop <= c.clientHeight + 10;

          scrollIndicator.style.opacity = isAtBottom ? '0' : '1';
        })

        // Hide indicator when scrolled to bottom
        container.addEventListener('scroll', (event: Event) => {
          const c = event.target as HTMLDivElement | null;
          if (!c) return;

          const isAtBottom = c.scrollHeight - c.scrollTop <= c.clientHeight + 10;

          if (isAtBottom && scrollIndicator.style.opacity === '1')
          scrollIndicator.style.opacity = '0';
        })
      }

      }, 100)

      return {
        dom: container,
        contentDOM: null, // We're handling content rendering ourselves
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false

          // Re-render if content changed
          if (updatedNode.content.childCount !== node.content.childCount) {
            // Update the view
            const newTotalImages = updatedNode.content.childCount;
            const newHasOverflow = newTotalImages > maxVisible;

            container.setAttribute('data-image-count', `${newTotalImages}`)
            container.setAttribute('data-has-overflow', `${newHasOverflow}`)

            // You might want to re-render the entire view here
            // For simplicity, return false to trigger a full re-render
            return false;
          }

          return true;
        },
        destroy: () => {
          // Cleanup if needed
        }
      }
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
