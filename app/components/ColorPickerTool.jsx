'use client';

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import SBPickerPanel from "./SBPickerPanel"; // adjust path if needed
import { rgbToHsb } from "./SBPickerPanel"; // optional if it's not already in same file

// Treat these as "lip" categories
const LIP_CATEGORIES = [
  "matte-lipstick",
  "satin-lipstick",
  "lip-gloss",
  "lip-tint",
  "lip-balm",
];

const isLipCategory = (c) => LIP_CATEGORIES.includes(c);


export default function ColorPickerTool({ initialBrand = "", initialProduct = "" }) {

  const router = useRouter();

  const [brand, setBrand] = useState(initialBrand);
  const [product, setProduct] = useState(initialProduct);
  const [category, setCategory] = useState("lip");
  const [shades, setShades] = useState([{ name: "", hex: "", skintone: "", undertone: "", link: "", price: "" }]);
  const [activeShadeIndex, setActiveShadeIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const canvasRef1 = useRef();
  const canvasRef2 = useRef();
  const imageRef1 = useRef();
  const imageRef2 = useRef();
  const [productType, setProductType] = useState("");
  const [tags, setTags] = useState("");  
  const [lockedIndex, setLockedIndex] = useState(null);
  const [showSBPicker, setShowSBPicker] = useState(false);
  const [currentHue, setCurrentHue] = useState(null);
  const [coverage, setCoverage] = useState("");
  const [finish, setFinish] = useState("");


  const canvasRef = useRef();
  const imageRef = useRef();

  const handleImageUpload = (e, imageNumber) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (imageNumber === 1) {
        setImage1(reader.result);
      } else if (imageNumber === 2) {
        setImage2(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };
  

  const handleMouseMove = (e, imgNum) => {
    const canvas = imgNum === 1 ? canvasRef1.current : canvasRef2.current;
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

  const handleClick = (e, imgNum) => {
    const canvas = imgNum === 1 ? canvasRef1.current : canvasRef2.current;
    if (!canvas) {
      console.warn("Canvas not ready");
      return;
    }
  
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
  
    const [r, g, b] = pixel;
    const [h] = rgbToHsb(r, g, b);
    setCurrentHue(h);
    setShowSBPicker(true);
    setLockedIndex(activeShadeIndex);
  };
  

  const handleSave = async () => {
    if (!brand || !product || !category ) {
      alert("Brand, Product, and Category are required!");
      return;
    }
  
    const filteredShades = shades.filter(s => s.name && s.hex);
  
    // Build shade structure for upload
    let structuredShades;
    if (category === "foundation" || category === "contour" || category === "concealer" || category === "skin-tint") {
      structuredShades = filteredShades.map(s => ({
        name: s.name,
        hex: s.hex,
        skintone: s.skintone,
        undertone: s.undertone
      }));
    } else {
      structuredShades = filteredShades.map(s => ({
        name: s.name,
        hex: s.hex
      }));
    }
  
    // Upload shades.json
    const res = await fetch('/api/upload-shades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand,
        product,
        category,
        shades: structuredShades
      })
    });
  
    let result = {};
    try {
      result = await res.json();
    } catch (err) {
      alert("Upload failed: invalid response");
      return;
    }
  
    // Upload links.json
    const linkMap = {};
    filteredShades.forEach(s => {
      if (s.link) linkMap[s.name] = s.link;
    });
  
    if (Object.keys(linkMap).length > 0) {
      await fetch('/api/upload-links-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          product,
          links: linkMap
        })
      });
    }

    // Upload price.json
    const priceMap = {};
    filteredShades.forEach(s => {
      if (s.price) priceMap[s.name] = s.price;
    });
  
    if (Object.keys(priceMap).length > 0) {
      await fetch('/api/upload-price-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          product,
          price: priceMap
        })
      });
    }

    // Upload types.json
    const typeMap = {};
    filteredShades.forEach(s => {
      if (category) typeMap[s.name] = category;
    });
  
    if (Object.keys(typeMap).length > 0) {
      await fetch('/api/upload-type-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          product,
          type: typeMap
        })
      });
    }
  
    if (result.success) {
      alert("Shades and links uploaded to S3 successfully!");
    
      // 👇 Add this
      await fetch('/api/update-all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          product,
          type: category
        })
      });
    
    } else {
      alert("Upload failed: " + (result.error || "Unknown error"));
    }
    
  };
  
  

  const handleAddToProductDatabase = async () => {
    if (!brand || !product) {
      alert("Brand and Product name are required!");
      return;
    }
  
    const filteredShades = shades.filter(s => s.name && s.hex && s.price);
  
    // Base payload with all required fields
    const payload = filteredShades.map(s => {
      const base = {
        brand,
        product_name: product,
        shade_name: s.name,
        shade_hex_code: s.hex,
        price: s.price,
        link: s.link || "",
        type: s.category
      };
  
      if (["foundation", "concealer", "skin-tint"].includes(category)) {
        base.coverage = coverage;
        base.skintone = s.skintone;  // Needed for backend to determine L/M/D
      }

      if (["contour"].includes(category)) {
        base.finish = finish;
        base.skintone = s.skintone;  // Needed for backend to determine L/M/D
      }
  
      return base;
    });
  
    if (["foundation", "concealer", "skin-tint"].includes(category) && !coverage) {
      alert("Please select coverage (Low, Medium, Full) for this product.");
      return;
    }

    if (["contour"].includes(category) && !finish) {
      alert("Please select finish for this product.");
      return;
    }
  
    const res = await fetch('/api/add-to-product-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shades: payload,
        product_category: category,
      })
    });
  
    const result = await res.json();
    if (result.success) {
      alert("Shades successfully added to product database!");
    } else {
      alert("Failed to update product database.");
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

  const logout = () => {
    // clear cookie by expiring it
    document.cookie = 'th_auth=; Max-Age=0; Path=/; SameSite=Lax';
    localStorage.removeItem('th_user');
    router.push('/login');
  };

  const exportText = useMemo(() => {
    const headerLabel = product
      ? `// ${product}`
      : `// ${category?.replace(/-/g, " ") || "Shades"}`;
    const rows = shades
      .filter(s => s.name && s.hex)
      .map(s => `    {name: "${s.name}",   hex: "${s.hex}"}`)
      .join(",\n");
  
    return `var shades = [\n    ${headerLabel}\n${rows}\n];`;
  }, [shades, product, category]);
  
  const copyExportText = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      alert("Copied to clipboard!");
    } catch (e) {
      // Fallback: select the textarea programmatically if needed
      const ta = document.getElementById("th-export-textarea");
      if (ta) {
        ta.focus();
        ta.select();
      }
    }
  };

  useEffect(() => {
    if (image1 && imageRef1.current && canvasRef1.current) {
      const img = imageRef1.current;
      const canvas = canvasRef1.current;
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      };
      img.src = image1;
    }
  }, [image1]);
  
  useEffect(() => {
    if (image2 && imageRef2.current && canvasRef2.current) {
      const img = imageRef2.current;
      const canvas = canvasRef2.current;
      const ctx = canvas.getContext("2d");
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      };
      img.src = image2;
    }
  }, [image2]);  

  useEffect(() => {
    const load = async () => {
      if (!initialBrand || !initialProduct) return;
      const r = await fetch(`/api/logs/get?brand=${encodeURIComponent(initialBrand)}&product=${encodeURIComponent(initialProduct)}`, { cache: "no-store" });
      const j = await r.json();
      if (j?.shades) {
        setBrand(j.brand);
        setProduct(j.product);
      
        // NEW: prefer API-level productType; fallback to first shade's type
        const inferredType =
          j.productType ||
          (j.shades.find((s) => !!s.type)?.type ?? "");
      
        if (inferredType) setCategory(inferredType);
      
        setShades(
          j.shades.map((s) => ({
            name: s.name || "",
            hex: s.hex || "",
            skintone: s.skintone || "",
            undertone: s.undertone || "",
            link: s.link || "",
            price: s.price || "",
          }))
        );
      }
      
    };
    load();
  }, [initialBrand, initialProduct]);
  

  const deleteShade = (index) => {
    setShades(prev => {
      if (prev.length === 1) {
        // keep one empty row so the UI never goes blank
        setActiveShadeIndex(0);
        setLockedIndex(null);
        return [{ name: "", hex: "", skintone: "", undertone: "", link: "", price: "" }];
      }
  
      const next = [...prev];
      next.splice(index, 1);
  
      // fix active/locked indices
      setActiveShadeIndex(curr => {
        if (curr === index) return Math.max(0, index - 1);
        if (curr > index) return curr - 1;
        return curr;
      });
      setLockedIndex(curr => {
        if (curr == null) return curr;
        if (curr === index) return null;
        if (curr > index) return curr - 1;
        return curr;
      });
  
      return next;
    });
  };
  

  


  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 font-sans p-6">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=Roboto+Mono:wght@500&display=swap" rel="stylesheet" />
      <style>{`
        h1, h2 { font-family: 'Playfair Display', serif; }
        button { font-family: 'Roboto Mono', monospace; }
      `}</style>
            <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-white text-[#ab1f10] border border-[#ab1f10] rounded hover:bg-rose-100"
            onClick={() => router.push('/logs')}
            type="button"
          >
            View Logs
          </button>
        </div>
        <button
          className="px-4 py-2 bg-[#ab1f10] text-white rounded hover:bg-red-700"
          onClick={logout}
          type="button"
        >
          Logout
        </button>
      </div>
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
              <option value="matte-lipstick">Matte Lipstick</option>
              <option value="satin-lipstick">Satin Lipstick</option>
              <option value="lip-gloss">Lip Gloss / Lip Oil</option>
              <option value="lip-tint">Lip Tint / Lip Stain</option>
              <option value="lip-balm">Lip Balm</option>
              <option value="foundation">foundation</option>
              <option value="concealer">Concealer</option>
              <option value="skin-tint">Skin Tint</option>
              <option value="cream-blush">Cream Blush / Liquid Blush</option>
              <option value="powder-blush">Powder Blush</option>
              <option value="contour">Contour</option>
              <option value="cream-eyeshadow">Cream Eyeshadow</option>
              <option value="powder-eyeshadow">Powder Eyeshadow</option>
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
          {["foundation", "concealer", "skin-tint"].includes(category) && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#ab1f10]">Coverage</label>
              <select
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                className="w-full p-2 border border-rose-200 rounded text-black"
              >
                <option value="">Select Coverage</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="full">Full</option>
              </select>
            </div>
          )}

          {["contour"].includes(category) && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#ab1f10]">Finish</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value)}
                className="w-full p-2 border border-rose-200 rounded text-black"
              >
                <option value="">Select Finish</option>
                <option value="cream">Cream</option>
                <option value="powder">Powder</option>
              </select>
            </div>
          )}

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
                  <input
                    className="flex-grow p-2 border border-rose-200 rounded text-black placeholder:text-gray-400 min-w-0"
                    placeholder="Product Link"
                    value={shade.link || ""}
                    onChange={(e) => {
                      const newShades = [...shades];
                      newShades[i].link = e.target.value;
                      setShades(newShades);
                    }}
                  />

                  <input
                    className="flex-grow p-2 border border-rose-200 rounded text-black placeholder:text-gray-400 min-w-0"
                    placeholder="Price (e.g. 1299.99)"
                    type="number"
                    value={shade.price || ""}
                    onChange={(e) => {
                      const newShades = [...shades];
                      newShades[i].price = parseFloat(e.target.value);
                      setShades(newShades);
                    }}
                  />

                  <button
                      type="button"
                      aria-label={`Delete shade ${shade.name || i + 1}`}
                      title="Delete shade"
                      onClick={() => deleteShade(i)}
                      className="shrink-0 px-3 py-2 rounded border border-rose-200 text-rose-700 hover:bg-rose-100"
                    >
                      Delete
                    </button>


                </div>
              </div>
              {(category === "foundation" || category === "contour" || category === "concealer" || category === "skin-tint")  && (
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
            onClick={handleAddToProductDatabase}
          >
            Add to Product Database 
          </button>

          {/* --- Export (JS array) — only for lip categories --- */}
          {isLipCategory(category) && (
            <div className="mt-6 space-y-2">
              <h2 className="text-lg font-semibold text-[#ab1f10]">
                Export Shades (JS array)
              </h2>

              <textarea
                id="th-export-textarea"
                readOnly
                value={exportText}
                rows={Math.min(12, Math.max(6, shades.length + 4))}
                className="w-full p-3 border border-rose-200 rounded text-black font-mono text-sm bg-rose-50"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyExportText}
                  className="px-4 py-2 bg-[#ab1f10] hover:bg-red-700 text-white rounded"
                >
                  Copy
                </button>
                <span className="text-xs text-gray-500 self-center">
                  Format: <code>var shades = [&#123;name, hex&#125; ...]</code>
                </span>
              </div>
            </div>
          )}


        </div>

        <div className="w-full md:w-2/3 p-6 flex flex-col items-center">
        <div className="mb-4 w-full flex justify-center gap-4">
          <label className="px-4 py-2 bg-[#ab1f10] text-white rounded cursor-pointer hover:bg-red-700 transition">
            Upload Image 1
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 1)}
              className="hidden"
            />
          </label>
          <label className="px-4 py-2 bg-[#ab1f10] text-white rounded cursor-pointer hover:bg-red-700 transition">
            Upload Image 2
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 2)}
              className="hidden"
            />
          </label>
        </div>

        <div className="w-full flex flex-col gap-6 items-center">
          {image1 && (
            <div className="w-full max-w-xl relative">
              <canvas
                ref={canvasRef1}
                onMouseMove={(e) => handleMouseMove(e, 1)}
                onClick={(e) => handleClick(e, 1)}
                className="w-full h-auto border rounded shadow-md"
              />
              <img
                ref={imageRef1}
                src={image1}
                alt="Uploaded 1"
                className="w-full h-auto object-contain rounded absolute top-0 left-0 opacity-0 pointer-events-none"
              />
            </div>
          )}

          {image2 && (
            <div className="w-full max-w-xl relative">
              <canvas
                ref={canvasRef2}
                onMouseMove={(e) => handleMouseMove(e, 2)}
                onClick={(e) => handleClick(e, 2)}
                className="w-full h-auto border rounded shadow-md"
              />
              <img
                ref={imageRef2}
                src={image2}
                alt="Uploaded 2"
                className="w-full h-auto object-contain rounded absolute top-0 left-0 opacity-0 pointer-events-none"
              />
            </div>
          )}
        </div>
        </div>
      </div>
    <SBPickerPanel
      show={showSBPicker}
      hue={currentHue}
      onClose={() => setShowSBPicker(false)}
      activeShadeIndex={activeShadeIndex}
      shades={shades}
      setShades={setShades}
      pickerSize={448}     // e.g., 448 or 512
      panelWidth={520}
      swatchSize={56}
    />
    </div>
  );
}
