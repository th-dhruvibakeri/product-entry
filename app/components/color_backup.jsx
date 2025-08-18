'use client';

import React, { useState, useRef, useEffect } from "react";

export default function ColorPickerTool() {
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("lip");
  const [shades, setShades] = useState([{ name: "", hex: "", skintone: "", undertone: "" }]);
  const [activeShadeIndex, setActiveShadeIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [productType, setProductType] = useState("");
  const [tags, setTags] = useState("");  
  const [lockedIndex, setLockedIndex] = useState(null);
  const canvasRef = useRef();
  const imageRef = useRef();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || lockedIndex === activeShadeIndex) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${[...pixel].slice(0, 3).map(x => x.toString(16).padStart(2, "0")).join("")}`;
    const newShades = [...shades];
    newShades[activeShadeIndex].hex = hex;
    setShades(newShades);
  };

  const handleClick = () => {
    setLockedIndex(activeShadeIndex);
  };

  const handleSave = async () => {
    if (!brand || !product) {
      alert("Brand and Product name are required!");
      return;
    }
  
    const filteredShades = shades.filter(s => s.name && s.hex);
  
    const res = await fetch('/api/upload-shades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, product, shades: filteredShades }),
    });
  
    const result = await res.json();
  
    if (result.success) {
      alert("Shades uploaded to S3 successfully!");
    } else {
      alert("Upload failed.");
    }
  };
  
  

  const handleSendToShopify = async () => {
    if (!brand || !product || !productType || !tags) {
      alert("All fields are required!");
      return;
    }

    console.log("Sending to Shopify:", JSON.stringify({
      product: {
        title: product,
        vendor: brand,
        product_type: productType,
        tags,
        published: true,
      }
    }, null, 2));
    
  
    const res = await fetch('/api/shopify-create-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: product,
        vendor: brand,
        productType,
        tags
      })
    });
  
    const result = await res.json();
  
    if (result.success) {
      alert("Product added to Shopify!");
    } else {
      alert("Failed to add product: " + result.error);
    }
  };
  
  

  const handleTriggerPhotoshop = () => {
    console.log("Triggered Photoshop for:", { brand, product, category, shades });
    alert("Photoshop action triggered (placeholder).")
  };

  useEffect(() => {
    if (image && imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
  
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      };
  
      if (img.complete) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      }
  
      img.src = image;
    }
  }, [image]);
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 font-sans p-6">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Roboto+Mono:wght@500&display=swap" rel="stylesheet" />
      <style>{`
        h1, h2 { font-family: 'Playfair Display', serif; }
        button { font-family: 'Roboto Mono', monospace; }
      `}</style>
      <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 p-6 space-y-4 bg-rose-50">
          <h1 className="text-2xl font-bold text-[#ab1f10] mb-4">TrueHue Shade Capture</h1>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#ab1f10]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-rose-200 rounded text-black"
            >
              <option value="lip">Lip</option>
              <option value="skin">Skin</option>
              <option value="other">Other</option>
            </select>
          </div>

          <input
            className="w-full p-2 border border-rose-200 rounded text-black"
            placeholder="Brand Name"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <input
            className="w-full p-2 border border-rose-200 rounded text-black"
            placeholder="Product Name"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />

          <input
            className="w-full p-2 border border-rose-200 rounded text-black"
            placeholder="Type"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
          />
          <input
            className="w-full p-2 border border-rose-200 rounded text-black"
            placeholder="Tags (comma separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />


          <h2 className="text-lg font-semibold mt-6 text-[#ab1f10]">Shades</h2>

          {shades.map((shade, i) => (
            <div key={i} className="space-y-1">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                <input
                  className="flex-grow p-2 border border-rose-200 rounded text-black placeholder:text-gray-400 min-w-0"
                  placeholder="Shade Name"
                  value={shade.name}
                  onChange={(e) => {
                    const newShades = [...shades];
                    newShades[i].name = e.target.value;
                    setShades(newShades);
                  }}
                  onFocus={() => {
                    setActiveShadeIndex(i);
                    setLockedIndex(null);
                  }}
                />

                <div
                  className="w-10 h-10 shrink-0 rounded border border-gray-300"
                  style={{ backgroundColor: shade.hex }}
                />
                  <span className="w-[80px] text-sm font-mono text-black">{shade.hex}</span>
                </div>
              </div>
              {category === "skin" && (
                <div className="flex flex-col gap-2 pt-1">
                  {!(shade.skintone && shade.undertone) ? (
                    <>
                      <select
                        className="p-2 border border-rose-200 rounded text-black"
                        value={shade.skintone || ""}
                        onChange={(e) => {
                          const newShades = [...shades];
                          newShades[i].skintone = e.target.value;
                          setShades(newShades);
                        }}
                      >
                        <option value="">Select Skin Tone</option>
                        <option value="F">F</option>
                        <option value="FM">FM</option>
                        <option value="MD">MD</option>
                        <option value="D1">D1</option>
                        <option value="D2">D2</option>
                        <option value="VD">VD</option>
                      </select>

                      <select
                        className="p-2 border border-rose-200 rounded text-black"
                        value={shade.undertone || ""}
                        onChange={(e) => {
                          const newShades = [...shades];
                          newShades[i].undertone = e.target.value;
                          setShades(newShades);
                        }}
                      >
                        <option value="">Select Undertone</option>
                        <option value="W">W</option>
                        <option value="N">N</option>
                        <option value="C">C</option>
                      </select>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-sm text-gray-600 italic pl-1">
                      <span>
                        Skin Tone: <span className="font-medium">{shade.skintone}</span> | Undertone: <span className="font-medium">{shade.undertone}</span>
                      </span>
                      <button
                        className="text-blue-500 text-xs ml-2 underline"
                        onClick={() => {
                          const newShades = [...shades];
                          newShades[i].skintone = "";
                          newShades[i].undertone = "";
                          setShades(newShades);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              )}



            </div>
          ))}

          <button
            className="px-4 py-2 bg-white text-[#ab1f10] border border-[#ab1f10] rounded w-full hover:bg-rose-100 "
            onClick={() => setShades([...shades, { name: "", hex: "", skintone: "", undertone: "" }])}
          >
            + Add Shade
          </button>

          {category === "lip" && (
            <button
              className="px-4 py-2 bg-[#ab1f10] hover:bg-red-700 text-white border border-[#ab1f10] rounded w-full"
              onClick={handleTriggerPhotoshop}
            >
              Trigger Photoshop
            </button>
          )}

          <button
            className="px-4 py-2 bg-[#ab1f10] hover:bg-red-700 text-white border border-[#ab1f10] rounded w-full"
            onClick={handleSave}
          >
            Send to S3
          </button>

          <button
            className="px-4 py-2 bg-[#ab1f10] hover:bg-red-700 text-white border border-[#ab1f10] rounded w-full"
            onClick={handleSendToShopify}
          >
            Send to Shopify
          </button>
        </div>

        <div className="w-full md:w-2/3 p-6 flex flex-col items-center">
        <div className="mb-4 w-full flex justify-center">
          <label className="px-4 py-2 bg-[#ab1f10] text-white rounded cursor-pointer hover:bg-red-700 transition">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

          {image && (
            <div className="w-full max-w-xl relative">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                className="w-full h-auto border rounded shadow-md"
              />
              <img
                ref={imageRef}
                src={image}
                alt="Uploaded"
                className="w-full h-auto object-contain rounded absolute top-0 left-0 opacity-0 pointer-events-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
