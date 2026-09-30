export type ChecklistState = { id: string; done: boolean };

export function checklistProgress(items: ChecklistState[]): { done: number; total: number; currentId: string | null } {
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
    currentId: items.find((item) => !item.done)?.id ?? null,
  };
}
