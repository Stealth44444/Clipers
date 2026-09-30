import type { ReactNode } from 'react';

export type Column<Row> = { key: string; header: ReactNode; render: (row: Row) => ReactNode; align?: 'left' | 'right' };

export function DataTable<Row>({ columns, rows, rowKey, empty, label }: { columns: Column<Row>[]; rows: Row[]; rowKey: (row: Row) => string; empty: ReactNode; label: string }) {
  return (
    <div className="cl-table-wrap">
      <table aria-label={label} className="cl-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} style={{ textAlign: column.align ?? 'left' }}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="cl-table__empty" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
