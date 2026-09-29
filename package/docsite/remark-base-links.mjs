// Starlight prefixes its own generated links with `base`, but not root-relative links
// authored in markdown/MDX. Prefix them so the site works under a path such as `/docs`.
const isRootRelative = (url) => typeof url === 'string' && /^\/(?!\/)/.test(url)

export function remarkBaseLinks({ base }) {
  const prefix = base.replace(/\/+$/, '')

  const visit = (node) => {
    if ((node.type === 'link' || node.type === 'definition') && isRootRelative(node.url)) {
      node.url = prefix + node.url
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      for (const attr of node.attributes ?? []) {
        if (attr.name === 'href' && isRootRelative(attr.value)) attr.value = prefix + attr.value
      }
    }
    node.children?.forEach(visit)
  }

  return (tree) => {
    if (prefix) visit(tree)
  }
}
