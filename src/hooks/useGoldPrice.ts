import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config";

export interface GoldPriceData {
  update_date: string;
  update_time: string;
  price: {
    gold:     { buy: string; sell: string };
    gold_bar: { buy: string; sell: string };
  };
}

const EXTERNAL = "https://api.chnwt.dev/thai-gold-api/latest";

export function useGoldPrice() {
  const [price, setPrice]     = useState<GoldPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // ลองดึงผ่าน backend proxy ก่อน (มี cache) — ถ้าไม่มี endpoint ให้ fallback ดึงตรง
      let data: GoldPriceData | null = null;
      try {
        const res = await fetch(`${API_BASE}/gold-price/live`);
        if (res.ok) {
          const json = await res.json();
          if (json?.price) { data = json; }
        }
      } catch {}

      if (!data) {
        const res = await fetch(EXTERNAL);
        if (!res.ok) throw new Error();
        const json = await res.json();
        data = json.response as GoldPriceData;
      }

      setPrice(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const barBuy  = (p: GoldPriceData) => parseFloat(p.price.gold_bar.buy.replace(/,/g, ""));
  const barSell = (p: GoldPriceData) => parseFloat(p.price.gold_bar.sell.replace(/,/g, ""));
  const ornBuy  = (p: GoldPriceData) => parseFloat(p.price.gold.buy.replace(/,/g, ""));
  const ornSell = (p: GoldPriceData) => parseFloat(p.price.gold.sell.replace(/,/g, ""));

  return { price, loading, error, refetch: fetch_, barBuy, barSell, ornBuy, ornSell };
}
