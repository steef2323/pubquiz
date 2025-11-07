// Socket.io API route handler
// Note: Socket.io requires a persistent connection, so this route
// is mainly for initialization. The actual Socket.io server should
// be set up in a custom server.js file or using Next.js server components.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Socket.io endpoint - use WebSocket connection',
    status: 'active' 
  });
}

