import { BadgeCheck, CircleDollarSign, LoaderCircle, Sparkles } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { DealScore } from "../../types";
import { formatPercent } from "../../lib/formatters";

type DealScoreCardProps = {
  dealScore: DealScore | null | undefined;
  askingPriceBillion: string;
  loading: boolean;
  onPriceChange: (value: string) => void;
  onAnalyze: () => void;
};

export function DealScoreCard({
  dealScore,
  askingPriceBillion,
  loading,
  onPriceChange,
  onAnalyze,
}: DealScoreCardProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onAnalyze();
  };

  return (
    <section className="deal-score-card">
      <div className="panel-heading">
        <div>
          <span>OPTIONAL DEAL ANALYSIS</span>
          <h3>Chất lượng mức giá đang chào</h3>
        </div>
        <CircleDollarSign size={20} />
      </div>

      <div className="deal-layout">
        <form className="deal-form" onSubmit={submit}>
          <label htmlFor="asking-price">Giá đang chào</label>
          <div className="deal-input">
            <input
              id="asking-price"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Ví dụ: 6.5"
              value={askingPriceBillion}
              onChange={(event) => onPriceChange(event.target.value)}
            />
            <span>tỷ VNĐ</span>
          </div>
          <p>
            Giá này chỉ dùng để chấm chất lượng giao dịch, không tác động vào kết quả
            định giá của model.
          </p>
          <button
            className="deal-action"
            type="submit"
            disabled={loading || !Number(askingPriceBillion)}
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
                  <strong>{dealScore.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="deal-copy">
                <span className="deal-badge">
                  <BadgeCheck size={15} /> {dealScore.label}
                </span>
                <div className="deal-deltas">
                  <span>
                    So với model <b>{formatPercent(dealScore.price_gap_percent)}</b>
                  </span>
                  <span>
                    So với thị trường <b>{formatPercent(dealScore.market_gap_percent)}</b>
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
