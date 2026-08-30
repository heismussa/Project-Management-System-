import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import './DataTable.css'

function getValue(record, dataIndex) {
  if (dataIndex == null) return undefined
  if (Array.isArray(dataIndex)) return dataIndex.reduce((acc, key) => acc?.[key], record)
  return record?.[dataIndex]
}

/**
 * House-style table: maroon header, fixed row heights, fixed per-column
 * widths, and a client-side search box that filters across every column's
 * value (or a column's `searchValue(record)` when its display isn't plain
 * text). No built-in sorting/pagination — tables that need those keep
 * AntD's `<Table>` restyled to match instead of using this component.
 */
export default function DataTable({
  columns,
  data,
  rowKey = 'id',
  searchPlaceholder = 'Search...',
  emptyText = 'No records found.',
  onRowClick,
  hideSearch = false,
  className,
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return data
    return data.filter((record) =>
      columns.some((column) => {
        const text = column.searchValue ? column.searchValue(record) : getValue(record, column.dataIndex)
        return text != null && String(text).toLowerCase().includes(term)
      }),
    )
  }, [data, search, columns])

  const getRowKey = (record, index) =>
    typeof rowKey === 'function' ? rowKey(record, index) : (record?.[rowKey] ?? index)

  return (
    <div className={['pms-datatable-container', className].filter(Boolean).join(' ')}>
      {!hideSearch && (
        <div className="pms-datatable-search">
          <Search className="pms-datatable-search-icon" size={16} />
          <input
            type="text"
            className="pms-datatable-search-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}

      <div className="pms-datatable-scroll">
        <table className="pms-datatable">
          <colgroup>
            {columns.map((column) => (
              <col key={column.key ?? column.dataIndex} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key ?? column.dataIndex} style={{ textAlign: column.align || 'left' }}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="pms-datatable-empty">
                  {emptyText}
                </td>
              </tr>
            ) : (
              filtered.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={onRowClick ? 'pms-datatable-row-clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key ?? column.dataIndex} style={{ textAlign: column.align || 'left' }}>
                      {column.render
                        ? column.render(getValue(record, column.dataIndex), record, index)
                        : (getValue(record, column.dataIndex) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
