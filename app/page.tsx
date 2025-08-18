'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ColorPickerTool from './components/ColorPickerTool.jsx';

function EditorShell() {
  const sp = useSearchParams();
  const initialBrand = sp.get('brand') ?? '';
  const initialProduct = sp.get('product') ?? '';

  // Force a re-mount when params change so the editor refreshes prefill
  const key = `${initialBrand}::${initialProduct}`;

  return (
    <ColorPickerTool
      key={key}
      initialBrand={initialBrand}
      initialProduct={initialProduct}
    />
  );
}

export default function Page() {
  return (
    <main className="min-h-screen bg-pink-50 flex justify-center items-start p-10">
      <Suspense fallback={<div className="text-gray-600">Loading…</div>}>
        <EditorShell />
      </Suspense>
    </main>
  );
}
