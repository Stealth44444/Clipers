import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

// The legal documents live as Markdown in content/legal (one source; review notes sit in HTML comments, which never
// render). This renders the small subset they use: headings, paragraphs, lists, tables and **bold**.

export function readLegalDocument(name: 'terms' | 'privacy'): string {
  return readFileSync(path.join(process.cwd(), 'content', 'legal', `${name}.md`), 'utf8');
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part
  );
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

/** The document's title (its first # heading) and its body rendered to elements. */
export function renderLegalMarkdown(source: string): { title: string; body: ReactNode[] } {
  const lines = source.replace(/<!--[\s\S]*?-->/g, '').replace(/\r/g, '').split('\n');
  const body: ReactNode[] = [];
  let title = '';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    const key = body.length;

    if (!line.trim()) {
      index += 1;
    } else if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      index += 1;
    } else if (line.startsWith('### ')) {
      body.push(<h3 key={key}>{inline(line.slice(4))}</h3>);
      index += 1;
    } else if (line.startsWith('## ')) {
      body.push(<h2 key={key}>{inline(line.slice(3))}</h2>);
      index += 1;
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        if (!/^\|?\s*-{3,}/.test(lines[index].trim().replace(/^\|/, ''))) rows.push(cells(lines[index]));
        index += 1;
      }
      const [header, ...rest] = rows;
      body.push(
        <div className="cl-legal__table" key={key}>
          <table>
            <thead>
              <tr>{header.map((cell, cellIndex) => <th key={cellIndex}>{inline(cell)}</th>)}</tr>
            </thead>
            <tbody>
              {rest.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (/^- /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^- /.test(lines[index])) items.push(lines[index++].slice(2).trim());
      body.push(<ul key={key}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\. /.test(lines[index])) items.push(lines[index++].replace(/^\d+\. /, '').trim());
      body.push(<ol key={key}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>);
    } else {
      const paragraph: string[] = [];
      while (index < lines.length && lines[index].trim() && !/^(#|\||- |\d+\. )/.test(lines[index])) paragraph.push(lines[index++].trim());
      body.push(<p key={key}>{inline(paragraph.join(' '))}</p>);
    }
  }

  return { title, body };
}
