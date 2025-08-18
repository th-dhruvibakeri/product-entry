// Refactored hue-based SB Picker panel with full canvas-based SB selector, live tracking, and persistent marker from image selection

import React, { useRef, useEffect, useState } from "react";

export function rgbToHsb(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
}

function hsbToHex(h, s, v) {
  s /= 100;
  v /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => v - v * s * Math.max(Math.min(k(n), 4 - k(n), 1), 0);
  const [r, g, b] = [f(5), f(3), f(1)].map(x =>
    Math.round(x * 255).toString(16).padStart(2, '0')
  );
  return `#${r}${g}${b}`;
}

export default function SBPickerPanel({ show, hue, onClose, activeShadeIndex, shades, setShades }) {
  const canvasRef = useRef();
  const [hoverHex, setHoverHex] = useState(null);
  const [hoverHSB, setHoverHSB] = useState(null);
  const [initialSB, setInitialSB] = useState(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    for (let y = 0; y < height; y++) {
      const b = 100 - (y / height) * 100;
      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;
        const hex = hsbToHex(hue, s, b);
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    if (initialSB) {
      const [s, b] = initialSB;
      const x = (s / 100) * width;
      const y = ((100 - b) / 100) * height;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [hue, show, initialSB]);

  useEffect(() => {
    if (!show || hue === null) return;
    const [h, s, b] = rgbToHsb(...hexToRgb(shades[activeShadeIndex].hex));
    if (Math.round(h) === Math.round(hue)) {
      setInitialSB([s, b]);
    }
  }, [show, hue, shades, activeShadeIndex]);

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const s = (x / canvas.width) * 100;
    const b = 100 - (y / canvas.height) * 100;
    const hex = hsbToHex(hue, s, b);

    const newShades = [...shades];
    newShades[activeShadeIndex].hex = hex;
    setShades(newShades);

    // After clicking, reset marker
    setInitialSB(null);

    onClose();
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const s = (x / canvas.width) * 100;
    const b = 100 - (y / canvas.height) * 100;
    const hex = hsbToHex(hue, s, b);

    setHoverHex(hex);
    setHoverHSB([Math.round(hue), Math.round(s), Math.round(b)]);
  };

  if (!show || hue === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-opacity-30"
        onClick={onClose}
      ></div>

      <div className="relative w-[320px] h-full bg-white shadow-lg border-l p-4 overflow-auto z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[#ab1f10]">Adjust Shade</h2>
          <button
            className="text-[#ab1f10] font-bold text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          Select brightness and saturation for hue <span className="font-mono">{hue}°</span>
        </div>

        <canvas
          ref={canvasRef}
          width={256}
          height={256}
          className="border rounded cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />

        {hoverHex && hoverHSB && (
          <div className="mt-4 text-sm">
            <div className="mb-1 font-mono text-gray-700">H: {hoverHSB[0]}° S: {hoverHSB[1]}% B: {hoverHSB[2]}%</div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border" style={{ backgroundColor: hoverHex }} />
              <span className="font-mono text-gray-700">{hoverHex}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
