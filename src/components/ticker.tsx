import { TrendingDown, TrendingUp } from "lucide-react";
import { getTickerData } from "@/lib/market";

export async function PriceTicker() {
  let items: { label: string; value: string; change: number }[] = [];
  try {
    items = await getTickerData();
  } catch {
    return null;
  }
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-border bg-card" aria-label="Ticker harga pasar">
      <div className="flex w-max animate-ticker gap-8 px-4 py-2">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="tabular-nums">{item.value}</span>
            {item.change !== 0 && (
              <span
                className={`flex items-center gap-0.5 tabular-nums ${item.change > 0 ? "text-positive" : "text-negative"}`}
              >
                {item.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
