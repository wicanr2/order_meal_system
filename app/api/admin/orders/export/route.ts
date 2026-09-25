import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminCaller } from '@/lib/admin-auth';
import { CSV_BOM, EXPORT_HEADERS, csvLine, exportRowToCsvLine } from '@/lib/csv';
import type { ExportOrderRow } from '@/lib/csv';

// 全部訂單明細 CSV 匯出(admin only),見 docs/specs/0001-export-all-orders-csv.md。
// 資料由 export_orders RPC 一次取回(同一 snapshot、不受 max_rows 截斷),
// 核對 rows.length === total 後才串流輸出,避免產出看似正常的殘缺檔。

export const dynamic = 'force-dynamic';

const STATUSES = ['active', 'cancelled', 'all'] as const;
type ExportStatus = (typeof STATUSES)[number];

interface ExportPayload {
  total: number;
  rows: ExportOrderRow[];
}

function taipeiStamp(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

export async function GET(req: Request) {
  if (!(await isAdminCaller())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const status = new URL(req.url).searchParams.get('status') ?? 'active';
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('export_orders', { p_status: status as ExportStatus });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const payload = data as ExportPayload | null;
  const total = payload?.total;
  const rows = payload?.rows;
  if (!Number.isInteger(total) || (total as number) < 0 || !Array.isArray(rows) || rows.length !== total) {
    console.error('[orders/export] row count mismatch', { total, rows: Array.isArray(rows) ? rows.length : null });
    return NextResponse.json({ error: '匯出筆數核對不符' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const CHUNK = 500;
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvLine(EXPORT_HEADERS)));
    },
    pull(controller) {
      if (i >= rows.length) { controller.close(); return; }
      const lines = rows.slice(i, i + CHUNK).map(exportRowToCsvLine);
      i += CHUNK;
      controller.enqueue(encoder.encode('\n' + lines.join('\n')));
    },
  });

  const filename = `訂餐全部明細_${status}_${taipeiStamp(new Date())}.csv`;
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      'X-Export-Total': String(total),
    },
  });
}
