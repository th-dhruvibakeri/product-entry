// SBPickerPanel.jsx — bigger grid + bigger preview swatch

import React, { useRef, useEffect, useState } from "react";

export function rgbToHsb(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max, d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) { h = 0; }
  else {
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
  s /= 100; v /= 100;
  const k = (n) => (n + h / 60) % 6;
  const f = (n) => v - v * s * Math.max(Math.min(k(n), 4 - k(n), 1), 0);
  const [r, g, b] = [f(5), f(3), f(1)].map(x =>
    Math.round(x * 255).toString(16).padStart(2, '0')
  );
  return `#${r}${g}${b}`;
}

export default function SBPickerPanel({
  show,
  hue,
  onClose,
  activeShadeIndex,
  shades,
  setShades,
  // 🔧 Bigger defaults:
  pickerSize = 384,       // square SB grid (was 256)
  panelWidth = 420,       // popup panel width (was 320)
  swatchSize = 48         // bottom preview swatch (was 24)
}) {
  const canvasRef = useRef();
  const [hoverHex, setHoverHex] = useState(null);
  const [hoverHSB, setHoverHSB] = useState(null);
  const [initialSB, setInitialSB] = useState(null);

  useEffect(() => {
    if (!show || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Paint the SB field
    for (let y = 0; y < height; y++) {
      const b = 100 - (y / height) * 100;
      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;
        ctx.fillStyle = hsbToHex(hue, s, b);
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw persistent marker (bigger ring)
    if (initialSB) {
      const [s, b] = initialSB;
      const x = (s / 100) * width;
      const y = ((100 - b) / 100) * height;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [hue, show, initialSB]);

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  };

  useEffect(() => {
    if (!show || hue === null) return;
    if (!shades?.[activeShadeIndex]?.hex) return;
    const [h, s, b] = rgbToHsb(...hexToRgb(shades[activeShadeIndex].hex));
    if (Math.round(h) === Math.round(hue)) setInitialSB([s, b]);
  }, [show, hue, shades, activeShadeIndex]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // because canvas.width === CSS width, no DPR scaling needed here
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const s = (x / canvas.width) * 100;
    const b = 100 - (y / canvas.height) * 100;
    const hex = hsbToHex(hue, s, b);

    const next = [...shades];
    next[activeShadeIndex].hex = hex;
    setShades(next);

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
      {/* Slightly darker click-away backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        className="relative h-full bg-white shadow-lg border-l p-4 overflow-auto z-50"
        style={{ width: panelWidth }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[#ab1f10]">Adjust Shade</h2>
          <button
            className="text-[#ab1f10] font-bold text-xl"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-3">
          Select brightness & saturation for hue{" "}
          <span className="font-mono">{hue}°</span>
        </div>

        <canvas
          ref={canvasRef}
          width={pickerSize}
          height={pickerSize}
          className="border rounded cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />

        {hoverHex && hoverHSB && (
          <div className="mt-5 text-sm">
            <div className="mb-2 font-mono text-gray-700">
              H: {hoverHSB[0]}° &nbsp; S: {hoverHSB[1]}% &nbsp; B: {hoverHSB[2]}%
            </div>
            <div className="flex items-center gap-3">
              <div
                className="rounded border-2"
                style={{
                  width: swatchSize,
                  height: swatchSize,
                  backgroundColor: hoverHex
                }}
              />
              <span className="font-mono text-gray-700 text-base">{hoverHex}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
