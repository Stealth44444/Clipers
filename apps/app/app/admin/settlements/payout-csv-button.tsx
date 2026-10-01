'use client';

import { Button } from '@clipers/ui';

export type PayoutRequest = {
  id: string;
  creatorName: string;
  legalName: string;
  bank: string;
  accountNumber: string;
  gross: number;
  incomeTax: number;
  localTax: number;
  net: number;
  requestedAt: string;
};

function csvCell(value: string | number): string {
  const text = String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

/** Open payout requests as a bank transfer sheet: who, where, how much. */
export default function PayoutCsvButton({ requests }: { requests: PayoutRequest[] }) {
  function exportCsv() {
    const rows = [
      ['크리에이터', '예금주', '은행', '계좌번호', '정산액', '소득세', '지방소득세', '이체할 금액', '요청 시각', '지급 ID'],
      ...requests.map((request) => [
        request.creatorName,
        request.legalName,
        request.bank,
        request.accountNumber,
        request.gross,
        request.incomeTax,
        request.localTax,
        request.net,
        request.requestedAt,
        request.id,
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
      이체용 CSV
    </Button>
  );
}
