'use client';

import { useId, useState, type ReactNode } from 'react';
import { UploadSimpleIcon } from '@phosphor-icons/react/ssr';

export function Dropzone({ accept, onFile, title, hint, fileName }: { accept?: string; onFile: (file: File) => void; title: ReactNode; hint?: ReactNode; fileName?: string | null }) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <label
      className="cl-dropzone"
      data-dragging={dragging}
      htmlFor={inputId}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <UploadSimpleIcon size={22} />
      <span className="cl-dropzone__title">{fileName ?? title}</span>
      {hint && <span className="cl-dropzone__hint">{hint}</span>}
      <input
        accept={accept}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
        type="file"
      />
    </label>
  );
}
