/** Concatenated text content of a hast node. */
export function toString(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(toString).join('');
  return '';
}
