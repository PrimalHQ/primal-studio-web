import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import styles from './ImageGrid.module.scss';

export const areNodesConsecutive = (node1: any, node2: any, state: any) => {
  const afterFirst = node1.parentPos + node1.parentNode.nodeSize;
  const beforeSecond = node2.parentPos;

  // Adjacent or same block
  if (afterFirst >= beforeSecond) return true;

  // Check all top-level doc children between the two parent blocks
  const startIdx = state.doc.resolve(afterFirst).index(0);
  const endIdx = state.doc.resolve(beforeSecond).index(0);

  for (let i = startIdx; i < endIdx; i++) {
    const child = state.doc.child(i);
    // Only truly empty paragraphs (no inline nodes, no non-whitespace text) are allowed
    if (child.type.name === 'paragraph') {
      let hasContent = false;
      child.forEach((c: any) => {
        if (c.type.name !== 'text' || c.text.trim() !== '') {
          hasContent = true;
        }
      });
      if (!hasContent) continue;
    }
    return false;
  }

  return true;
}

export const autoGroupImages = (editor: Editor) => {
  const { state } = editor
  const tr = state.tr
  let modified = false

  // Find all image and imageGrid nodes with their positions and parent block info
  const nodes: any[] = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') {
      const $pos = state.doc.resolve(pos);
      const parentDepth = Math.max(1, $pos.depth);
      const parentPos = $pos.before(parentDepth);
      const parentNode = $pos.node(parentDepth);

      // Only consider images that are alone in their parent paragraph
      // (no other content besides other images or whitespace text)
      if (parentNode.type.name === 'paragraph') {
        let hasOtherContent = false;
        parentNode.forEach((child: any) => {
          if (child.type.name === 'image') return; // other images are fine
          if (child.type.name === 'text' && child.text?.trim() === '') return; // whitespace ok
          hasOtherContent = true;
        });
        if (hasOtherContent) return; // skip images that share a paragraph with other content
      }

      nodes.push({ node, pos, type: 'image', parentPos, parentNode });
    } else if (node.type.name === 'imageGrid') {
      nodes.push({ node, pos, type: 'imageGrid', parentPos: pos, parentNode: node });
    }

    return node.type.name !== 'imageGrid';
  })

  const setCursorAfterGrid = (gridStartPos: number, gridNodeSize: number) => {
    const afterGrid = gridStartPos + gridNodeSize;
    let sel = TextSelection.findFrom(tr.doc.resolve(afterGrid), 1);
    if (!sel) {
      tr.insert(afterGrid, state.schema.nodes.paragraph.create());
      sel = TextSelection.findFrom(tr.doc.resolve(afterGrid), 1);
    }
    if (sel) {
      tr.setSelection(sel);
    }
  }

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
          current.parentPos,
          next.parentPos + next.parentNode.nodeSize,
          newGrid
        )
        setCursorAfterGrid(current.parentPos, newGrid.nodeSize)
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
          current.parentPos,
          next.parentPos + next.parentNode.nodeSize,
          newGrid
        )
        setCursorAfterGrid(current.parentPos, newGrid.nodeSize)
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
          current.parentPos,
          next.parentPos + next.parentNode.nodeSize,
          newGrid
        )
        setCursorAfterGrid(current.parentPos, newGrid.nodeSize)
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
          current.parentPos,
          next.parentPos + next.parentNode.nodeSize,
          newGrid
        )
        setCursorAfterGrid(current.parentPos, newGrid.nodeSize)
        modified = true
        break
      }
    }
  }

  if (modified) {
    editor.view.dispatch(tr)
  }
}

export const isolateImages = (editor: Editor) => {
  const { state } = editor
  const tr = state.tr
  let modified = false

  // Find images that share a paragraph with non-image, non-whitespace content
  // and split them into their own paragraphs
  state.doc.descendants((node, pos) => {
    if (modified) return false;
    if (node.type.name !== 'paragraph') return true;

    let hasImage = false;
    let hasOtherContent = false;

    node.forEach((child) => {
      if (child.type.name === 'image') { hasImage = true; return; }
      if (child.type.name === 'text' && child.text?.trim() === '') return;
      hasOtherContent = true;
    });

    if (!hasImage || !hasOtherContent) return false;

    // Split: collect images and non-image content separately
    const images: any[] = [];
    const otherContent: any[] = [];

    node.forEach((child) => {
      if (child.type.name === 'image') {
        images.push(child);
      } else {
        otherContent.push(child);
      }
    });

    const blocks: any[] = [];

    // Non-image content stays in a paragraph (drop trailing whitespace)
    const trimmed = otherContent.filter((n, i) =>
      !(n.type.name === 'text' && n.text?.trim() === '' && i === otherContent.length - 1)
    );

    if (trimmed.length > 0) {
      blocks.push(state.schema.nodes.paragraph.create(null, trimmed));
    }

    // Each image gets its own paragraph
    for (const img of images) {
      blocks.push(state.schema.nodes.paragraph.create(null, img));
    }

    // Add empty paragraph after images for cursor placement
    blocks.push(state.schema.nodes.paragraph.create());

    tr.replaceWith(pos, pos + node.nodeSize, blocks);
    modified = true;

    return false;
  })

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
