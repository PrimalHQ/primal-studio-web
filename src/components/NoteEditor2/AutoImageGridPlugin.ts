import { Editor } from '@tiptap/core';
import styles from './ImageGrid.module.scss';

export const areNodesConsecutive = (node1: any, node2: any, state: any) => {
  const between = state.doc.slice(
    node1.pos + node1.node.nodeSize,
    node2.pos
  )

  // Consider nodes consecutive if there's only whitespace or empty paragraphs between
  let hasOnlyWhitespace = true
  between.content.forEach((node: any) => {
    if (node.type.name === 'paragraph' && (node.content.size === 0 || node.textContent.trim().length === 0)) {
      return // Empty paragraph is OK
    }
    if (node.type.name === 'text' && /^\s*$/.test(node.text)) {
      return // Whitespace-only text is OK
    }
    hasOnlyWhitespace = false
  })

  return hasOnlyWhitespace
}

export const autoGroupImages = (editor: Editor) => {
  const { state } = editor
  const tr = state.tr
  let modified = false

  // Find all image and imageGrid nodes with their positions
  const nodes: any[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' || node.type.name === 'imageGrid') {
      nodes.push({ node, pos, type: node.type.name })
    }

    return node.type.name !== 'imageGrid';
  })

  // Process nodes to find grouping opportunities
  for (let i = 0; i < nodes.length; i++) {
    const current = nodes[i];
    const next = nodes[i + 1];

    if (!next) continue;

    // Case 1: imageGrid + image -> add image to grid
    if (current.type === 'imageGrid' && next.type === 'image') {
      if (areNodesConsecutive(current, next, state)) {
        const newImages = [
          {
            src: next.node.attrs.src,
            alt: next.node.attrs.alt || '',
            title: next.node.attrs.title || ''
          },
          ...current.node.attrs.images
        ]
        // Add the image to the existing grid
        const newContent = [...current.node.content.content, next.node]
        const newGrid = state.schema.nodes.imageGrid.create(
          { ...current.node.attrs, images: newImages},
          newContent
        )

        tr.replaceRangeWith(
          current.pos,
          next.pos + next.node.nodeSize,
          newGrid
        )
        modified = true
        break // Process one change at a time
      }
    }

    // Case 2: image + imageGrid -> add image to beginning of grid
    else if (current.type === 'image' && next.type === 'imageGrid') {
      if (areNodesConsecutive(current, next, state)) {
        const newContent = [current.node, ...next.node.content.content]
        const newImages = [
          {
            src: current.node.attrs.src,
            alt: current.node.attrs.alt || '',
            title: current.node.attrs.title || ''
          },
          ...next.node.attrs.images
        ]

        const newGrid = state.schema.nodes.imageGrid.create(
          { ...next.node.attrs, images: newImages, },
          newContent
        )

        tr.replaceRangeWith(
          current.pos,
          next.pos + next.node.nodeSize,
          newGrid
        )
        modified = true
        break
      }
    }

    // Case 3: imageGrid + imageGrid -> merge grids
    else if (current.type === 'imageGrid' && next.type === 'imageGrid') {
      if (areNodesConsecutive(current, next, state)) {
        const newImages = [
          ...current.node.attrs.images,
          {
            src: next.node.attrs.src,
            alt: next.node.attrs.alt || '',
            title: next.node.attrs.title || ''
          }
        ]

        const newContent = [
          ...current.node.content.content,
          ...next.node.content.content
        ]
        const newGrid = state.schema.nodes.imageGrid.create(
          { ...current.node.attrs, images: newImages, },
          newContent
        )

        tr.replaceRangeWith(
          current.pos,
          next.pos + next.node.nodeSize,
          newGrid
        )
        modified = true
        break
      }
    }

    // Case 4: image + image -> create new grid (original logic)
    else if (current.type === 'image' && next.type === 'image') {
      if (areNodesConsecutive(current, next, state)) {
        const images = [
          {
            src: current.node.attrs.src,
            alt: current.node.attrs.alt || '',
            title: current.node.attrs.title || ''
          },
          {
            src: next.node.attrs.src,
            alt: next.node.attrs.alt || '',
            title: next.node.attrs.title || ''
          }
        ]

        const newGrid = state.schema.nodes.imageGrid.create(
          { columns: 2, images },
          [current.node, next.node]
        )

        tr.replaceRangeWith(
          current.pos,
          next.pos + next.node.nodeSize,
          newGrid
        )
        modified = true
        break
      }
    }
  }

  if (modified) {
    editor.view.dispatch(tr)
  }
}

export const updateGridClassesDirectly = (editor: Editor) => {
  const gridElements = editor.view.dom.querySelectorAll('[data-type="image-grid"]')

  gridElements.forEach(gridEl => {
    const images = gridEl.querySelectorAll('img')
    const imageCount = images.length

    // Remove old grid-* classes and add new one
    gridEl.className = gridEl.className.replace(/grid-\d+/g, '') + ` grid-${imageCount}`
    gridEl.setAttribute('data-image-count', `${imageCount}`)
  })
}

export const autoUngroupImages = (editor: Editor) => {
  const { state } = editor
  const tr = state.tr
  let modified = false

  // Find all imageGrid nodes with only one image
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'imageGrid' && node.content.childCount === 1) {
      // Get the single image from the grid
      const singleImage = node.content.firstChild

      if (singleImage && singleImage.type.name === 'image') {
        // Replace the grid with just the image
        tr.replaceWith(pos, pos + node.nodeSize, singleImage)
        modified = true
      }
    }
  })

  if (modified) {
    editor.view.dispatch(tr)
  }
}


// Function to remove an image from a grid by index
export const removeImageFromGrid = (editor: Editor, gridPos: number, imageIndex: number) => {
  const { state } = editor
  const tr = state.tr
  const gridNode = state.doc.nodeAt(gridPos)

  if (!gridNode || gridNode.type.name !== 'imageGrid') {
    return false
  }

  // Get all images except the one to remove
  const newContent: any[] = []
  const newImages: any[] = []

  gridNode.content.forEach((imageNode, index) => {
    if (index !== imageIndex) {
      newContent.push(imageNode)
      newImages.push({
        src: imageNode.attrs.src,
        alt: imageNode.attrs.alt || '',
        title: imageNode.attrs.title || ''
      })
    }
  })

  // If only one image left, convert back to single image
  if (newContent.length === 1) {
    tr.replaceWith(gridPos, gridPos + gridNode.nodeSize, newContent[0])
  }
  // If no images left, remove the grid entirely
  else if (newContent.length === 0) {
    tr.delete(gridPos, gridPos + gridNode.nodeSize)
  }
  // Otherwise, update the grid with remaining images
  else {
    const newGrid = state.schema.nodes.imageGrid.create(
      { ...gridNode.attrs, images: newImages },
      newContent
    )
    tr.replaceWith(gridPos, gridPos + gridNode.nodeSize, newGrid)
  }

  editor.view.dispatch(tr)
  return true
}

export const refreshGalleryLayout = () => {
  const containers = document.querySelectorAll(`div.${styles.imageGridEditor}`);

  containers.forEach(c => {
    const container = c as HTMLDivElement;
    let containerW = container.getBoundingClientRect().width;
    let containerH = containerW;
    container.style.maxHeight = `${containerH}px`;
    container.style.overflow = 'hidden';

    const scrollIndicator = container.querySelector(`.${styles.scrollIndicator}`) as HTMLDivElement;

    const indicatorDim = containerW/2;
    scrollIndicator.style.top = `${indicatorDim+0.5}px`;
    scrollIndicator.style.left = `${indicatorDim+0.5}px`;
    scrollIndicator.style.width = `${indicatorDim-0.5}px`;
    scrollIndicator.style.height = `${indicatorDim-0.5}px`;

  })
}
