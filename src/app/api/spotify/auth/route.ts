import { NextResponse } from 'next/server';
import { getSpotifyToken } from '@/lib/spotify/client';

export async function GET() {
  try {
    const token = await getSpotifyToken();
    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
