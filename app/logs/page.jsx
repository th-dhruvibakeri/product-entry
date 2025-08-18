"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogsPage() {
  const [query, setQuery] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentUser, setCurrentUser] = useState(""); // 👈
  const router = useRouter();

  // who is logged in? (cookie is not httpOnly, so we can read it)
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)th_auth=([^;]+)/);
    if (m) setCurrentUser(decodeURIComponent(m[1]));
  }, []);

  // fetch list (debounced)
  useEffect(() => {
    let active = true;
    const fetchList = async () => {
      setLoadingList(true);
      try {
        const r = await fetch(`/api/logs/list?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const j = await r.json();
        if (active) setItems(j.items || []);
      } finally {
        if (active) setLoadingList(false);
      }
    };
    const t = setTimeout(fetchList, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  // fetch details for selected item
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selected) { setDetails(null); return; }
      setLoadingDetails(true);
      try {
        const r = await fetch(
          `/api/logs/get?brand=${encodeURIComponent(selected.brand)}&product=${encodeURIComponent(selected.product)}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (active) setDetails(j);
      } finally {
        if (active) setLoadingDetails(false);
      }
    };
    run();
    return () => { active = false; };
  }, [selected]);

  const list = useMemo(() => items, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 p-6">
      <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-xl p-6">
        {/* Header with Audit button (dhruvi-only) */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#ab1f10]">TrueHue — Saved Products Log</h1>
          <button
            className="px-4 py-2 bg-white text-[#ab1f10] border border-[#ab1f10] rounded hover:bg-rose-100"
            onClick={() => router.push('/')}
          >
            Back to Editor
          </button>
          {currentUser === "dhruvi" && (
            <button
              className="px-4 py-2 bg-white text-[#ab1f10] border border-[#ab1f10] rounded hover:bg-rose-100"
              onClick={() => router.push("/audit")}
              type="button"
              title="View shade saves by user & date"
            >
              Audit
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-4">
          <input
            className="w-full p-3 border border-rose-200 rounded text-black"
            placeholder="Search by brand or product…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: results */}
          <div className="md:col-span-1">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-rose-50 px-3 py-2 text-sm text-[#ab1f10] font-semibold">
                Results {loadingList ? "…loading" : `(${list.length})`}
              </div>
              <ul className="max-h-[60vh] overflow-auto divide-y">
                {list.map((it) => {
                  const isSel = selected && it.brand === selected.brand && it.product === selected.product;
                  return (
                    <li
                      key={`${it.brand}:::${it.product}`}
                      className={`px-3 py-2 cursor-pointer hover:bg-rose-50 ${isSel ? "bg-rose-100" : ""}`}
                      onClick={() => setSelected(it)}
                    >
                      <div className="text-sm font-semibold text-black">{it.product}</div>
                      <div className="text-xs text-gray-600">{it.brand}</div>
                    </li>
                  );
                })}
                {!loadingList && list.length === 0 && (
                  <li className="px-3 py-6 text-sm text-gray-500 text-center">No matches.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Right: details */}
          <div className="md:col-span-2">
            {!selected && <div className="text-gray-600">Select a product to view details.</div>}
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-black">{selected.product}</div>
                    <div className="text-sm text-gray-600">{selected.brand}</div>
                    {details?.meta?.lastSavedBy && (
                      <div className="text-xs text-gray-600">
                        Saved by <span className="font-medium">{details.meta.lastSavedBy}</span>
                        {details.meta.lastSavedAt ? ` on ${new Date(details.meta.lastSavedAt).toLocaleString()}` : ""}
                      </div>
                    )}
                  </div>
                  <button
                    className="px-4 py-2 bg-[#ab1f10] text-white rounded hover:bg-red-700"
                    onClick={() => {
                      router.push(`/?brand=${encodeURIComponent(selected.brand)}&product=${encodeURIComponent(selected.product)}&from=logs`);
                    }}
                  >
                    Edit in Editor
                  </button>
                </div>

                <div className="text-xs text-gray-600">
                  {details?.meta?.hasLinks ? "Links ✓" : "Links —"} &nbsp;·&nbsp;
                  {details?.meta?.hasPrice ? "Prices ✓" : "Prices —"} &nbsp;·&nbsp;
                  {details?.meta?.hasType ? "Type ✓" : "Type —"}
                </div>

                <div className="border rounded-lg p-3 bg-rose-50">
                  {loadingDetails && <div className="text-sm text-gray-600">Loading details…</div>}
                  {!loadingDetails && details && (
                    <div className="space-y-3">
                      {details.shades.length === 0 && (
                        <div className="text-sm text-gray-600">No shades found.</div>
                      )}
                      {details.shades.map((s, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center bg-white rounded p-2">
                          <div className="col-span-2">
                            <div className="text-sm font-semibold text-black">{s.name}</div>
                            <div className="text-xs text-gray-600">{s.hex}</div>
                          </div>
                          <div className="w-10 h-10 rounded border" style={{ backgroundColor: s.hex }} />
                          <div className="text-xs text-gray-700">
                            {s.skintone ? `Tone: ${s.skintone}` : "-"} {s.undertone ? `· UT: ${s.undertone}` : ""}
                          </div>
                          <div className="text-xs truncate">{s.link || "-"}</div>
                          <div className="text-sm text-right">{s.price ? `₹${s.price}` : "-"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
