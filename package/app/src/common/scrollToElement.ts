export const scrollToElement = (
  id: string,
  offset = 0,
  containerId?: string,
) => {
  const element = document.getElementById(id)
  if (!element) return

  if (!containerId) {
    // Window scrolling
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    })
  } else {
    // Div scrolling
    const container = document.getElementById(containerId)
    if (!container) return

    const elementRect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const relativeTop = elementRect.top - containerRect.top
    const scrollPosition = relativeTop + container.scrollTop - offset

    container.scrollTo({
      top: scrollPosition,
      behavior: 'smooth',
    })
  }
}
