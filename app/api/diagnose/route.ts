import { NextResponse } from 'next/server';

export async function GET() {
  const check = (name: string) => {
    const val = process.env[name];
    return {
      present: !!val,
      length: val ? val.length : 0,
    };
  };

  return NextResponse.json({
    BLOB_READ_WRITE_TOKEN: check('BLOB_READ_WRITE_TOKEN'),
    TELEGRAM_BOT_TOKEN: check('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: check('TELEGRAM_CHAT_ID'),
    CRON_SECRET: check('CRON_SECRET'),
  });
}
