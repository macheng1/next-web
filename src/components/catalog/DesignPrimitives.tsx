"use client";
export function Chips({ values, empty }: { values: string[]; empty?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.length ? (
        values.map((v) => (
          <span
            key={v}
            className="max-w-full rounded-md bg-jade-50 px-2.5 py-1 text-xs break-words text-jade-800"
          >
            {v}
          </span>
        ))
      ) : (
        <p className="text-sm text-ink-500">{empty}</p>
      )}
    </div>
  );
}
