import { Card } from 'antd'
import { BRAND_MAROON } from './chartConstants'

/**
 * House Card wrapper for every dashboard's sections — an icon next to the
 * title is a small thing, but repeated across a dozen sections it's what
 * keeps a dashboard from reading as a stack of plain white boxes.
 */
export default function DashboardSection({ icon: Icon, title, extra, noPadding, bodyStyle, className, style, children }) {
  const resolvedBodyStyle = bodyStyle ?? (noPadding ? { padding: 0 } : undefined)

  return (
    <Card
      className={['page-shell-card', className].filter(Boolean).join(' ')}
      style={{ marginTop: 0, ...style }}
      styles={resolvedBodyStyle ? { body: resolvedBodyStyle } : undefined}
      extra={extra}
      title={
        title ? (
          <span className="flex items-center gap-2">
            {Icon && <Icon size={15} color={BRAND_MAROON} />}
            <span>{title}</span>
          </span>
        ) : undefined
      }
    >
      {children}
    </Card>
  )
}
