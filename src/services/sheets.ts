import { CreditCard, Transaction, MonthlyStats, GoogleSheetInfo } from '../types';

const DEFAULT_SHEET_TITLE = 'บัตรเครดิต - บันทึกค่าใช้จ่าย & กำหนดชำระ';

export const findExistingTrackerSheet = async (
  accessToken: string
): Promise<GoogleSheetInfo | null> => {
  try {
    const query = encodeURIComponent(
      "name contains 'บัตรเครดิต' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      if (res.status === 401) throw new Error('Token expired');
      return null;
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      return {
        spreadsheetId: file.id,
        spreadsheetUrl: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
        title: file.name,
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding existing spreadsheet:', error);
    return null;
  }
};

export const createTrackerSpreadsheet = async (
  accessToken: string,
  title: string = DEFAULT_SHEET_TITLE
): Promise<GoogleSheetInfo> => {
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Transactions',
          gridProperties: { rowCount: 1000, columnCount: 11 },
        },
      },
      {
        properties: {
          title: 'Cards',
          gridProperties: { rowCount: 50, columnCount: 8 },
        },
      },
      {
        properties: {
          title: 'Monthly_Summary',
          gridProperties: { rowCount: 100, columnCount: 7 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create spreadsheet: ${errorText}`);
  }

  const sheetData = await res.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize header rows
  await initSheetHeaders(accessToken, spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    lastSyncedAt: new Date().toISOString(),
  };
};

const initSheetHeaders = async (accessToken: string, spreadsheetId: string) => {
  const headerUpdates = [
    {
      range: 'Transactions!A1:L1',
      values: [
        [
          'ID',
          'วันที่ (Date)',
          'บัตรเครดิต (Card)',
          'รายการ (Description)',
          'หมวดหมู่ (Category)',
          'แท็ก (Tags)',
          'จำนวนเงิน (THB)',
          'รอบบิล (Billing Month)',
          'ผ่อนชำระ (Installment)',
          'สถานะการชำระ (Paid)',
          'หมายเหตุ (Note)',
          'บันทึกเมื่อ (Timestamp)',
        ],
      ],
    },
    {
      range: 'Cards!A1:H1',
      values: [
        [
          'ID',
          'ชื่อบัตร (Card Name)',
          'ธนาคาร (Bank)',
          'เลข 4 ตัวท้าย (Last 4)',
          'วงเงิน (Limit THB)',
          'วันตัดรอบบิล (Cutoff Day)',
          'วันครบกำหนดชำระ (Due Day)',
          'ธีมสี (Gradient)',
        ],
      ],
    },
    {
      range: 'Monthly_Summary!A1:F1',
      values: [
        [
          'รอบเดือน (Month)',
          'ยอดใช้จ่ายรวม (Total Spend)',
          'ยอดที่ต้องชำระ (Due Amount)',
          'ยอดชำระแล้ว (Paid)',
          'ยอดค้างชำระ (Pending)',
          'อัปเดตล่าสุด (Last Updated)',
        ],
      ],
    },
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerUpdates,
      }),
    }
  );
};

export const syncAllDataToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  cards: CreditCard[],
  transactions: Transaction[],
  summaries: MonthlyStats[]
): Promise<void> => {
  // Ensure headers exist
  await initSheetHeaders(accessToken, spreadsheetId);

  // 1. Prepare Cards data
  const cardRows = cards.map((c) => [
    c.id,
    c.name,
    c.bank,
    c.last4,
    c.creditLimit,
    c.billingCutoffDay,
    c.paymentDueDay,
    c.colorGradient,
  ]);

  // 2. Prepare Transactions data
  const cardMap = new Map(cards.map((c) => [c.id, `${c.name} (•••• ${c.last4})`]));
  const transactionRows = transactions.map((t) => [
    t.id,
    t.date,
    cardMap.get(t.cardId) || t.cardId,
    t.title,
    t.category,
    t.tags?.join(', ') || '',
    t.isInstallment && t.monthlyInstallmentAmount ? t.monthlyInstallmentAmount : t.amount,
    t.billingCycleMonth,
    t.isInstallment ? `งวดที่ ${t.currentInstallment || 1}/${t.totalInstallments || 1}` : 'ชำระเต็ม',
    t.isPaid ? 'ชำระแล้ว' : 'รอชำระ',
    t.note || '',
    t.createdAt,
  ]);

  // 3. Prepare Monthly Summary data
  const summaryRows = summaries.map((s) => [
    s.month,
    s.totalSpent,
    s.totalDue,
    s.totalPaid,
    s.totalPending,
    new Date().toLocaleString('th-TH'),
  ]);

  // Clear previous body rows to avoid stale rows, then write
  const batchData = [
    {
      range: 'Cards!A2:H' + Math.max(cardRows.length + 1, 50),
      values: cardRows.length > 0 ? cardRows : [['', '', '', '', '', '', '', '']],
    },
    {
      range: 'Transactions!A2:L' + Math.max(transactionRows.length + 1, 100),
      values: transactionRows.length > 0 ? transactionRows : [['', '', '', '', '', '', '', '', '', '', '', '']],
    },
    {
      range: 'Monthly_Summary!A2:F' + Math.max(summaryRows.length + 1, 30),
      values: summaryRows.length > 0 ? summaryRows : [['', '', '', '', '', '']],
    },
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to sync to Google Sheets: ${errorText}`);
  }
};

export const appendTransactionToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  card: CreditCard | undefined,
  transaction: Transaction
): Promise<void> => {
  const cardLabel = card ? `${card.name} (•••• ${card.last4})` : transaction.cardId;
  const row = [
    transaction.id,
    transaction.date,
    cardLabel,
    transaction.title,
    transaction.category,
    transaction.tags?.join(', ') || '',
    transaction.amount,
    transaction.billingCycleMonth,
    transaction.isInstallment
      ? `${transaction.currentInstallment || 1}/${transaction.totalInstallments || 1}`
      : 'ชำระเต็ม',
    transaction.isPaid ? 'ชำระแล้ว' : 'รอชำระ',
    transaction.note || '',
    transaction.createdAt,
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to append transaction: ${errorText}`);
  }
};
