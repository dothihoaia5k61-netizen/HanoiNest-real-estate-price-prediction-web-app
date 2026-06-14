import { BadgeCheck, CircleDollarSign, LoaderCircle, Sparkles } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { DealScore } from "../../types";
import { formatPercent } from "../../lib/formatters";

type DealScoreCardProps = {
  dealScore: DealScore | null | undefined;
  askingPrice: string;
  askingPriceUnit: "million" | "billion";
  loading: boolean;
  onPriceChange: (value: string) => void;
  onUnitChange: (value: "million" | "billion") => void;
  onAnalyze: () => void;
};

export function DealScoreCard({
  dealScore,
  askingPrice,
  askingPriceUnit,
  loading,
  onPriceChange,
  onUnitChange,
  onAnalyze,
}: DealScoreCardProps) {
  const gapTone = (value: number | null) => {
    if (value === null) return "neutral";
    return value <= 0 ? "favorable" : "caution";
  };

  const gapDescription = (value: number | null, reference: string) => {
    if (value === null) return `Chưa đủ dữ liệu ${reference}`;
    if (Math.abs(value) < 1) return `Gần sát ${reference}`;
    return value < 0 ? `Thấp hơn ${reference}` : `Cao hơn ${reference}`;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAnalyze();
  };

  return (
    <section className="deal-score-card">
      <div className="panel-heading">
        <div>
          <span>PHÂN TÍCH GIÁ CHÀO · KHÔNG BẮT BUỘC</span>
          <h3>Chất lượng mức giá đang chào</h3>
        </div>
        <CircleDollarSign size={20} />
      </div>

      <div className="deal-layout">
        <form className="deal-form" onSubmit={submit}>
          <label htmlFor="asking-price">Giá đang chào</label>
          <div className="deal-input deal-price-control">
            <input
              id="asking-price"
              type="number"
              min={askingPriceUnit === "billion" ? "0.1" : "1"}
              step={askingPriceUnit === "billion" ? "0.1" : "1"}
              placeholder={askingPriceUnit === "billion" ? "Ví dụ: 6.5" : "Ví dụ: 6500"}
              value={askingPrice}
              onChange={(event) => onPriceChange(event.target.value)}
            />
            <select
              aria-label="Đơn vị giá đang chào"
              value={askingPriceUnit}
              onChange={(event) =>
                onUnitChange(event.target.value as "million" | "billion")
              }
            >
              <option value="million">triệu VNĐ</option>
              <option value="billion">tỷ VNĐ</option>
            </select>
          </div>
          <p>
            Giá này chỉ dùng để chấm chất lượng giao dịch, không tác động vào kết quả
            định giá của model.
          </p>
          <button
            className="deal-action"
            type="submit"
            disabled={loading || !Number(askingPrice)}
          >
            {loading ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
            Phân tích giao dịch
          </button>
        </form>

        <div className="deal-result">
          {dealScore ? (
            <>
              <div
                className="score-ring"
                style={{ "--score": `${dealScore.score * 3.6}deg` } as CSSProperties}
              >
                <div>
                  <small>ĐIỂM GIAO DỊCH</small>
                  <strong>{dealScore.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="deal-copy">
                <span className="deal-badge">
                  <BadgeCheck size={15} /> {dealScore.label}
                </span>
                <div className="deal-deltas">
                  <span className={`delta-${gapTone(dealScore.price_gap_percent)}`}>
                    <small>SO VỚI GIÁ DỰ ĐOÁN</small>
                    <b>{formatPercent(dealScore.price_gap_percent)}</b>
                    <em>{gapDescription(dealScore.price_gap_percent, "giá dự đoán")}</em>
                  </span>
                  <span className={`delta-${gapTone(dealScore.market_gap_percent)}`}>
                    <small>SO VỚI THỊ TRƯỜNG</small>
                    <b>{formatPercent(dealScore.market_gap_percent)}</b>
                    <em>{gapDescription(dealScore.market_gap_percent, "trung vị thị trường")}</em>
                  </span>
                </div>
                <ul>
                  {dealScore.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="deal-empty">
              <BadgeCheck size={26} />
              <strong>Deal Score chưa được kích hoạt</strong>
              <p>Nhập mức giá đang chào để so với cả model và median thị trường.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
