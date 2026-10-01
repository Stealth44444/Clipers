'use client';

import { useState } from 'react';
import { ButtonLink, Field, Input } from '@clipers/ui';

/** Picks a month (default: last month, the one being filed) and downloads its withholding report. */
export default function TaxReportForm() {
  const [month, setMonth] = useState(() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date());
    const [year, monthNumber] = today.split('-').map(Number);
    const last = new Date(Date.UTC(year, monthNumber - 2, 1));
    return last.toISOString().slice(0, 7);
  });

  return (
    <div className="cl-inline">
      <Field htmlFor="tax-report-month" label="지급 완료한 달">
        <Input id="tax-report-month" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
      </Field>
      <ButtonLink href={`/admin/settlements/tax-report?month=${month}`} variant="secondary">
        CSV 내려받기
      </ButtonLink>
    </div>
  );
}
