export function setDomainSubdomain(domain: string, subdomain: string): string {
  const parts = domain.split('.')
  if (parts.length > 2) {
    parts[0] = subdomain
  } else {
    parts.unshift(subdomain)
  }
  return parts.join('.')
}
