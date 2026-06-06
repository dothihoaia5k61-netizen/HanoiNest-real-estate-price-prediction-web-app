import { ChartNoAxesCombined, DatabaseZap, Layers3, ScanLine } from "lucide-react";

const features = [
  {
    icon: ScanLine,
    title: "AI valuation",
    copy: "Ước tính giá và giá trên mỗi mét vuông từ mô hình stacking ensemble.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Market position",
    copy: "Đặt tài sản vào đúng dải Q25–Q75 của phân khúc và vị trí đang xét.",
  },
  {
    icon: Layers3,
    title: "Comparable intelligence",
    copy: "Ưu tiên listing cùng đường, cùng phường và có diện tích gần nhất.",
  },
  {
    icon: DatabaseZap,
    title: "Transparent confidence",
    copy: "Hiển thị metric validation và khoảng sai số model thay vì tạo cảm giác chắc chắn giả.",
  },
];

export function FeatureGrid() {
  return (
    <section className="feature-section section-shell">
      <div className="section-intro compact-intro">
        <span className="section-kicker">VALUATION ENGINE</span>
        <h2>One system. Four layers of evidence.</h2>
      </div>
      <div className="feature-grid">
        {features.map(({ icon: Icon, title, copy }, index) => (
          <article
            key={title}
          >
            <span className="feature-index">0{index + 1}</span>
            <Icon size={21} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
