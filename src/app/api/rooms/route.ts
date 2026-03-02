import { NextResponse } from 'next/server';

export async function POST() {
  // Room creation is handled via Socket.io
  // This endpoint exists as a health check
  return NextResponse.json({ status: 'ok', message: 'Use Socket.io to create rooms' });
}
