import { NextResponse } from 'next/server';

export async function GET() {
  const check = (name: string) => {
    const val = process.env[name];
    return {
      present: !!val,
      length: val ? val.length : 0,
    };
  };

  const blobReadWriteToken = check('BLOB_READ_WRITE_TOKEN');
  const blobStoreId = check('BLOB_STORE_ID');
  const vercelOidcToken = check('VERCEL_OIDC_TOKEN');

  return NextResponse.json({
    BLOB_READ_WRITE_TOKEN: blobReadWriteToken,
    BLOB_STORE_ID: blobStoreId,
    VERCEL_OIDC_TOKEN: vercelOidcToken,
    blobAuthReady: blobReadWriteToken.present || (blobStoreId.present && vercelOidcToken.present),
    TELEGRAM_BOT_TOKEN: check('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: check('TELEGRAM_CHAT_ID'),
    CRON_SECRET: check('CRON_SECRET'),
  });
}
