import type { ReactNode } from 'react';
import { CheckIcon } from '@phosphor-icons/react/ssr';
import { checklistProgress } from '../lib/checklist';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';

export type ChecklistItem = { id: string; icon: ReactNode; title: ReactNode; description?: ReactNode; done: boolean; action?: ReactNode };

export function Checklist({ title, description, items }: { title: ReactNode; description?: ReactNode; items: ChecklistItem[] }) {
  const { done, total, currentId } = checklistProgress(items);
  return (
    <Card actions={<span className="cl-checklist__count">{done} / {total}</span>} description={description} title={title}>
      <div className="cl-checklist__progress">
        <ProgressBar label="진행도" value={total > 0 ? done / total : 0} />
      </div>
      <ol className="cl-checklist__items">
        {items.map((item) => (
          <li className="cl-checklist__item" data-current={item.id === currentId} data-done={item.done} key={item.id}>
            <span className="cl-checklist__icon">{item.done ? <CheckIcon size={18} weight="bold" /> : item.icon}</span>
            <div className="cl-checklist__text">
              <p className="cl-checklist__title">{item.title}</p>
              {item.description && <p className="cl-checklist__description">{item.description}</p>}
            </div>
            {!item.done && item.action}
          </li>
        ))}
      </ol>
    </Card>
  );
}
