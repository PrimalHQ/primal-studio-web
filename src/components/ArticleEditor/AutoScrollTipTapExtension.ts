import { Editor, Extension } from '@tiptap/core';


const scrollToActiveNode = (
  editor: Editor,
  options: { padding?: number, behavior?: 'smooth' | 'instant'} = {},
) => {
  const { padding = 32, behavior = 'instant' } = options;

  if (!editor || !editor.state) {
    console.warn('No valid editor instance provided');
    return false;
  }

  try {
    // Get the current selection position
    const { selection } = editor.state;
    const { from } = selection;

    // Get the DOM node at the current position
    const domPositionInfo = editor.view.domAtPos(from);

    if (!domPositionInfo || !domPositionInfo.node) {
      console.warn('Could not find DOM node at current position');
      return false;
    }

    // Get the actual node (might be a text node, so we might need to get parent)
    let targetNode: HTMLElement | Node | null = domPositionInfo.node;

    // If it's a text node, get its parent element
    if (targetNode.nodeType === Node.TEXT_NODE) {
      targetNode = targetNode.parentElement;
    }

    if (!targetNode) {
      console.warn('Could not determine target node');
      return false;
    }

    // Get viewport and element positions
    // @ts-ignore
    const rect = targetNode.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Check if the element is fully in view
    const isInView = (
      rect.top >= 0 &&
      rect.bottom <= viewportHeight
    );

    if (isInView) {
      // Check if element is closer than padding to the bottom of the viewport
      const distanceToBottom = viewportHeight - rect.bottom;

      if (distanceToBottom < padding) {
        // Scroll additional padding
        window.scrollBy({
          top: padding - distanceToBottom,
          behavior
        });
      }

      return true;
    }

    // Element is not in view, scroll it into view
    // @ts-ignore
    targetNode.scrollIntoView({
      behavior,
      block: 'center'
    });

    return true;
  } catch (error) {
    console.error('Error scrolling to active node:', error);
    return false;
  }
}

export const AutoScrollExtension = Extension.create({
  addOptions() {
    return {
      // Default minimum padding
      minPadding: 32,
      // Whether to use dynamic padding based on node height
      useDynamicPadding: true
    }
  },
  // @ts-ignore
  onUpdate({ editor, transaction }) {
    // Skip if not a user-originated change
    if (!transaction.docChanged || transaction.getMeta('preventScroll')) {
      return;
    }

    // Get the currently active node and calculate padding based on its height
    const { selection } = editor.state;
    const domPositionInfo = editor.view.domAtPos(selection.from);
    let targetNode = domPositionInfo.node;

    let padding = this.options.minPadding
    // If it's a text node, get its parent element
    if (targetNode.nodeType === Node.TEXT_NODE) {
      targetNode = targetNode.parentElement;
    }

    let breakout = false;

    while (!breakout) {
      breakout =
        !targetNode.parentElement ||
        (
          targetNode.parentElement.className.includes('tiptap') &&
          targetNode.parentElement.className.includes('ProseMirror')
        );

      if (breakout) break;

      breakout = ['TABLE'].includes(targetNode.parentElement.nodeName);

      targetNode = targetNode.parentElement;

      if (breakout) break;
    }

    if (targetNode) {
      // Get the height of the node and use it as padding
      const rect = targetNode.getBoundingClientRect();
      padding = Math.max(this.options.minPadding, rect.height);
    }

    // Scroll to the node with the calculated padding
    scrollToActiveNode(editor, { padding });
  }
});
