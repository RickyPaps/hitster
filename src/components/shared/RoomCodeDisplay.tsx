'use client';

interface RoomCodeDisplayProps {
  code: string;
  large?: boolean;
}

export default function RoomCodeDisplay({ code, large }: RoomCodeDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono tracking-[0.3em] font-bold ${large ? 'text-5xl' : 'text-2xl'}`} style={{ color: 'var(--accent)' }}>
        {code}
      </span>
    </div>
  );
}
