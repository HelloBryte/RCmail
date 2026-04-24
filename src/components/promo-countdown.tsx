"use client";

import { useEffect, useState } from "react";

const PROMO_END = new Date("2026-05-05T23:59:59+08:00").getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function PromoCountdown() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function calc() {
      const diff = PROMO_END - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ d, h, m, s });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  if (expired || timeLeft === null) return null;

  const units = [
    { label: "天", value: pad(timeLeft.d), accent: false },
    { label: "时", value: pad(timeLeft.h), accent: false },
    { label: "分", value: pad(timeLeft.m), accent: false },
    { label: "秒", value: pad(timeLeft.s), accent: true },
  ];

  return (
    <div className="flex justify-center py-10">
      <div className="rounded-2xl border border-gray-100 bg-white px-10 py-7 shadow-sm">
        <p className="mb-5 text-center text-sm text-gray-500">距离优惠结束还剩</p>
        <div className="flex items-end gap-3">
          {units.map(({ label, value, accent }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white ${
                  accent ? "bg-red-500" : "bg-blue-600"
                }`}
              >
                {value}
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
