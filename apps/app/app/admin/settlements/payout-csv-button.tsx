'use client';

import { Button } from '@clipers/ui';

export type PayoutRequest = {
  creatorId: string;
  creatorName: string;
  settlementIds: string[];
  firstPeriod: string;
  lastPeriod: string;
  gross: number;
  withholding: number;
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

/** One row per creator with an open payout request, for the bank transfer sheet. */
export default function PayoutCsvButton({ requests }: { requests: PayoutRequest[] }) {
  function exportCsv() {
    const rows = [
      ['크리에이터', '크리에이터 ID', '정산 주', '정산 건수', '정산액', '원천징수', '이체할 금액'],
      ...requests.map((request) => [
        request.creatorName,
        request.creatorId,
        request.firstPeriod === request.lastPeriod ? request.firstPeriod : `${request.firstPeriod} ~ ${request.lastPeriod}`,
        request.settlementIds.length,
        request.gross.toFixed(2),
        request.withholding.toFixed(2),
        (request.gross - request.withholding).toFixed(2),
      ]),
    ];
    const csv = `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipers-payout-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button onClick={exportCsv} variant="secondary">
      CSV 내보내기
    </Button>
  );
}
