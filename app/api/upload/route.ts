import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if we have Vercel Blob token (production) or use local storage (development)
    const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobReadWriteToken) {
      // Use Vercel Blob Storage (production)
      console.log('[upload] Using Vercel Blob Storage');
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      
      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: true, // Adds random suffix to prevent collisions
      });

      console.log('[upload] File uploaded to Vercel Blob:', blob.url);

      return NextResponse.json({
        success: true,
        url: blob.url, // This is already a public URL
        filename: file.name,
      });
    } else {
      // Fallback to local storage (development)
      console.log('[upload] Using local storage (development mode)');
      console.warn('[upload] WARNING: BLOB_READ_WRITE_TOKEN not set. Using local storage.');
      console.warn('[upload] Images saved locally will not be accessible to Airtable in production.');
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const filepath = join(uploadsDir, filename);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filepath, buffer);

      // Return public URL
      const url = `/uploads/${filename}`;
      const fullUrl = `${request.nextUrl.origin}${url}`;

      return NextResponse.json({
        success: true,
        url: fullUrl,
        filename: file.name,
      });
    }
  } catch (error: any) {
    console.error('[upload] Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

