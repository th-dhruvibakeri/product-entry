'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
// If your file stays JS: this import still works
import ColorPickerTool from './components/ColorPickerTool.jsx';
// If you convert the component to TSX, change to:
// import ColorPickerTool from './components/ColorPickerTool';

export default function Home() {
  const sp = useSearchParams();
  const initialBrand = (sp.get('brand') ?? '');
  const initialProduct = (sp.get('product') ?? '');

  // Force a re-mount when params change so the editor reloads prefill
  const [key, setKey] = useState<string>('');
  useEffect(() => {
    setKey(`${initialBrand}:::${initialProduct}`);
  }, [initialBrand, initialProduct]);

  return (
    <main className="min-h-screen bg-pink-50 flex justify-center items-start p-10">
      <ColorPickerTool
        key={key}
        initialBrand={initialBrand}
        initialProduct={initialProduct}
      />
    </main>
  );
}
