import { NextResponse } from 'next/server';
import { getBase, TABLES } from '@/lib/airtable';

export async function GET() {
  try {
    // Test connection by trying to read from Users table
    const records = await getBase()(TABLES.USERS).select({
      maxRecords: 1,
    }).firstPage();
    
    return NextResponse.json({
      success: true,
      message: 'Airtable connection successful!',
      recordCount: records.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Airtable connection failed',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

