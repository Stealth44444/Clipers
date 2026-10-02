'use client';

import { PLATFORMS } from '@clipers/db';

/** The discover search bar's platform filter: a plain select that applies as soon as it changes (submits its form). */
export default function PlatformSelect({ value }: { value: string | null }) {
  return (
    <select
      aria-label="플랫폼"
      className="cl-select cl-search__select"
      defaultValue={value ?? ''}
      name="platform"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="">모든 플랫폼</option>
      {PLATFORMS.map((platform) => (
        <option key={platform.value} value={platform.value}>
          {platform.label}
        </option>
      ))}
    </select>
  );
}
