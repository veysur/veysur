export interface ListFilterRowProps {
  /** ID filter inputs shown on the left. */
  idFilters: React.ReactNode
  /** The FilterToolbar shown on the right. */
  children: React.ReactNode
}

/**
 * Shared two-column filter row layout used by list pages that pair free-text
 * ID filters with a FilterToolbar — identical across every list page that
 * uses it.
 */
export const ListFilterRow: React.FC<ListFilterRowProps> = ({
  idFilters,
  children,
}) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div className="flex flex-wrap items-end gap-3">{idFilters}</div>
    <div className="flex flex-wrap items-end gap-3">{children}</div>
  </div>
)
