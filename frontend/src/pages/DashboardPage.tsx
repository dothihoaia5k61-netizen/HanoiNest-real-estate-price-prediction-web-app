import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Building2,
  Database,
  GitCompareArrows,
  LayoutDashboard,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  analyzeProperty,
  getLocationOptions,
  getMarketSummary,
  getMetadata,
} from "../api";
import { DealScoreCard } from "../components/dashboard/DealScoreCard";
import { MetricCard } from "../components/dashboard/MetricCard";
import { PropertySidebar } from "../components/PropertySidebar";
import { formatPercent, formatVnd, knownLocation, shortenedLabel } from "../lib/formatters";
import { DEFAULT_PROPERTY, normalizeProperty } from "../lib/property";
import type {
  AnalysisResponse,
  LocationOptions,
  MarketSummaryRow,
  MetadataOptions,
  PropertyPayload,
} from "../types";

const tabs = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "market", label: "Thị trường", icon: BarChart3 },
  { id: "comparables", label: "Listing tương tự", icon: TableProperties },
  { id: "range", label: "Dải giá", icon: Scale },
  { id: "deal", label: "Phân tích giao dịch", icon: GitCompareArrows },
] as const;

type TabId = (typeof tabs)[number]["id"];

function LoadingPanel() {
  return (
    <div className="loading-panel" aria-live="polite">
      <div className="loading-mark">
        <BrainCircuit size={24} />
      </div>
      <span>Đang đồng bộ dữ liệu định giá...</span>
    </div>
  );
}

export function DashboardPage() {
  const [draft, setDraft] = useState<PropertyPayload>(DEFAULT_PROPERTY);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [metadata, setMetadata] = useState<MetadataOptions | null>(null);
  const [locations, setLocations] = useState<LocationOptions | null>(null);
  const [districtSummary, setDistrictSummary] = useState<MarketSummaryRow[]>([]);
  const [typeSummary, setTypeSummary] = useState<MarketSummaryRow[]>([]);
  const [askingPriceBillion, setAskingPriceBillion] = useState("");
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const runAnalysis = useCallback(
    async (property: PropertyPayload, askingPriceVnd?: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const normalized = normalizeProperty(property);
        const result = await analyzeProperty(normalized, askingPriceVnd);
        setAnalysis(result);
        setDraft((current) => ({
          ...current,
          house_depth: normalized.house_depth,
        }));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Không thể kết nối API.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadLocations = useCallback(async (districtName: string, wardName?: string) => {
    setLocationLoading(true);
    try {
      const nextLocations = await getLocationOptions(districtName, wardName);
      setLocations(nextLocations);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Không thể tải địa chỉ.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      getMetadata(),
      getMarketSummary("district_name"),
      getMarketSummary("property_type_name"),
      getLocationOptions(DEFAULT_PROPERTY.district_name, DEFAULT_PROPERTY.ward_name),
      analyzeProperty(normalizeProperty(DEFAULT_PROPERTY)),
    ])
      .then(([nextMetadata, districts, propertyTypes, nextLocations, initialAnalysis]) => {
        setMetadata(nextMetadata);
        setDistrictSummary(districts.rows);
        setTypeSummary(propertyTypes.rows);
        setLocations(nextLocations);
        setAnalysis(initialAnalysis);
        setError(null);
      })
      .catch((nextError) => {
        setError(nextError instanceof Error ? nextError.message : "Không thể kết nối API.");
      })
      .finally(() => setLoading(false));
  }, []);

  const prediction = analysis?.prediction;
  const market = analysis?.market_position;
  const reference = analysis?.reference_range;
  const confidence = analysis?.model_confidence;
  const comparableRows = analysis?.comparables.rows ?? [];
  const modelGap = reference?.model_gap_to_median_percent ?? null;

  const topDistricts = useMemo(
    () =>
      districtSummary
        .slice()
        .sort((a, b) => b.median_price_per_m2_vnd - a.median_price_per_m2_vnd)
        .slice(0, 10)
        .reverse(),
    [districtSummary],
  );
  const marketBand = useMemo(
    () => [
      { name: "Q25", value: market?.q25_price_per_m2_vnd ?? 0 },
      { name: "Median", value: market?.median_price_per_m2_vnd ?? 0 },
      { name: "Model", value: prediction?.predicted_price_per_m2_vnd ?? 0 },
      { name: "Q75", value: market?.q75_price_per_m2_vnd ?? 0 },
    ],
    [market, prediction],
  );
  const rangePosition = useMemo(() => {
    if (!reference || !prediction) return null;
    const width = reference.high_price_vnd - reference.low_price_vnd;
    if (width <= 0) return 50;
    return Math.min(
      100,
      Math.max(
        0,
        ((prediction.predicted_price_vnd - reference.low_price_vnd) / width) * 100,
      ),
    );
  }, [prediction, reference]);

  const handleDistrictChange = (districtName: string) => {
    setDraft((current) => ({
      ...current,
      district_name: districtName,
      ward_name: "Unknown",
      street_name: "Unknown",
    }));
    void loadLocations(districtName);
  };

  const handleWardChange = (wardName: string) => {
    setDraft((current) => ({
      ...current,
      ward_name: wardName,
      street_name: "Unknown",
    }));
    void loadLocations(draft.district_name, wardName);
  };

  const currentAskingPrice = Number(askingPriceBillion) > 0
    ? Number(askingPriceBillion) * 1_000_000_000
    : null;

  const reset = () => {
    setDraft(DEFAULT_PROPERTY);
    setAskingPriceBillion("");
    void loadLocations(DEFAULT_PROPERTY.district_name, DEFAULT_PROPERTY.ward_name);
    void runAnalysis(DEFAULT_PROPERTY);
  };

  const signalBadges = [
    reference?.model_position,
    confidence?.label,
    reference?.data_coverage_label,
    analysis?.deal_score?.score && analysis.deal_score.score >= 80
      ? "Strong Deal"
      : analysis?.deal_score?.label,
  ].filter(Boolean) as string[];

  return (
    <motion.div
      className="dashboard-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.38 }}
    >
      <header className="dashboard-topbar">
        <Link className="dashboard-brand" to="/">
          <span>
            <Building2 size={18} />
          </span>
          <div>
            <strong>Dự đoán giá nhà Hà Nội</strong>
            <small>AI VALUATION SYSTEM</small>
          </div>
        </Link>
        <div className="dashboard-status">
          <span className={`status-dot ${error ? "status-error" : ""}`} />
          {error ? "API gián đoạn" : "Model trực tuyến"}
          <i />
          Hà Nội · 06/2025
        </div>
        <Link className="back-link" to="/">
          <ArrowLeft size={16} /> Landing
        </Link>
      </header>

      <div className="dashboard-workspace">
        <PropertySidebar
          value={draft}
          metadata={metadata}
          locations={locations}
          loading={loading}
          locationLoading={locationLoading}
          onChange={setDraft}
          onDistrictChange={handleDistrictChange}
          onWardChange={handleWardChange}
          onSubmit={() => runAnalysis(draft, currentAskingPrice)}
          onReset={reset}
        />

        <main className="dashboard-main">
          {error && (
            <div className="error-banner">
              <Database size={18} />
              <span>{error}</span>
              <button type="button" onClick={() => runAnalysis(draft, currentAskingPrice)}>
                <RefreshCw size={16} /> Thử lại
              </button>
            </div>
          )}

          <section className="dashboard-intro">
            <div>
              <span className="dashboard-kicker">
                <Sparkles size={15} /> LIVE PROPERTY INTELLIGENCE
              </span>
              <h1>Phân tích định giá</h1>
              <p>
                {draft.property_type_name} · {draft.district_name} · {draft.area} m²
              </p>
            </div>
            <div className="intro-value">
              <small>AI ESTIMATED VALUE</small>
              <strong>{prediction?.formatted_price ?? (loading ? "Đang tính..." : "—")}</strong>
              <span>{prediction?.selected_model ?? "Model chưa sẵn sàng"}</span>
            </div>
          </section>

          <div className="signal-badges" aria-label="Tín hiệu định giá">
            {signalBadges.map((badge, index) => (
              <span key={`${badge}-${index}`} className={index === 0 ? "badge-primary" : ""}>
                {index === 1 ? <ShieldCheck size={14} /> : <Activity size={14} />}
                {badge}
              </span>
            ))}
          </div>

          <section className="premium-metric-grid">
            <MetricCard
              label="Giá model"
              value={prediction?.formatted_price ?? "—"}
              meta={`${draft.area} m² · ${draft.district_name}`}
              icon={Sparkles}
              tone="cyan"
              help="Mức giá do mô hình AI ước tính từ vị trí, diện tích và đặc điểm của tài sản. Đây là giá tham khảo, không phải giá giao dịch đã công chứng."
            />
            <MetricCard
              label="Khoảng ước tính model"
              value={
                confidence
                  ? `${formatVnd(confidence.low_price_vnd, true)} – ${formatVnd(confidence.high_price_vnd, true)}`
                  : "—"
              }
              meta={confidence ? `Validation MAE · ${formatVnd(confidence.mae_vnd, true)}` : "Chưa có metric"}
              icon={BrainCircuit}
              tone="violet"
              help="Khoảng giá quanh dự đoán, được tính từ sai số tuyệt đối trung bình (MAE) trên tập kiểm thử của mô hình."
            />
            <MetricCard
              label="Dải thị trường"
              value={
                reference
                  ? `${formatVnd(reference.low_price_vnd, true)} – ${formatVnd(reference.high_price_vnd, true)}`
                  : "—"
              }
              meta={reference?.model_position ?? "Chưa đủ dữ liệu"}
              icon={Scale}
              help="Khoảng Q25–Q75 của các listing cùng phân khúc. Phần lớn mức giá tham khảo trên thị trường nằm trong vùng này."
            />
            <MetricCard
              label="Listing so sánh"
              value={`${analysis?.comparables.total ?? 0}`}
              meta={`${market?.listing_count.toLocaleString("vi-VN") ?? 0} listing trong nhóm`}
              icon={GitCompareArrows}
              tone="success"
              help="Số listing gần nhất được chọn để đối chiếu, ưu tiên cùng đường, cùng phường rồi đến cùng quận."
            />
          </section>

          <div className="dashboard-tabs" role="tablist" aria-label="Các góc nhìn phân tích">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                className={activeTab === id ? "tab-active" : ""}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          {loading && !analysis ? (
            <LoadingPanel />
          ) : (
            <div className="dashboard-tab-content">
              {activeTab === "overview" && (
                <div className="overview-grid">
                  <section className="dashboard-panel chart-panel">
                    <div className="panel-heading">
                      <div>
                        <span>PRICE POSITION</span>
                        <h3>Biên độ giá / m²</h3>
                      </div>
                      <BarChart3 size={20} />
                    </div>
                    <div className="chart-frame">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={marketBand} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="#202d40" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={62}
                            tickFormatter={(value) => `${Math.round(value / 1_000_000)}tr`}
                          />
                          <Tooltip
                            formatter={(value) => formatVnd(Number(value))}
                            cursor={{ fill: "rgba(71, 217, 244, 0.06)" }}
                          />
                          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                            {marketBand.map((item) => (
                              <Cell
                                key={item.name}
                                fill={
                                  item.name === "Model"
                                    ? "#47d9f4"
                                    : item.name === "Median"
                                      ? "#8b6dff"
                                      : "#34445b"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="dashboard-panel signal-panel">
                    <div className="panel-heading">
                      <div>
                        <span>VALUATION SIGNALS</span>
                        <h3>Đọc kết quả nhanh</h3>
                      </div>
                      {modelGap !== null && modelGap > 0 ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div className="signal-list">
                      <div>
                        <span title="Chênh lệch phần trăm giữa giá AI dự đoán và mức giá trung vị của nhóm thị trường tương tự.">
                          Model so với median thị trường
                        </span>
                        <strong>{formatPercent(modelGap)}</strong>
                      </div>
                      <div>
                        <span title="R² càng gần 1 thì mô hình giải thích biến động giá trên tập kiểm thử càng tốt.">
                          Chất lượng model validation
                        </span>
                        <strong>{confidence ? `R² ${confidence.r2.toFixed(3)}` : "—"}</strong>
                      </div>
                      <div>
                        <span title="Sai số phần trăm tuyệt đối trung bình trên tập kiểm thử; số càng thấp càng tốt.">
                          MAPE toàn tập validation
                        </span>
                        <strong>{confidence ? `${confidence.mape_percent.toFixed(1)}%` : "—"}</strong>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "market" && (
                <div className="market-layout">
                  <section className="dashboard-panel chart-panel chart-wide">
                    <div className="panel-heading">
                      <div>
                        <span>DISTRICT BENCHMARK</span>
                        <h3>Top khu vực theo median giá / m²</h3>
                      </div>
                      <BarChart3 size={20} />
                    </div>
                    <div className="chart-frame chart-tall">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={topDistricts}
                          layout="vertical"
                          margin={{ top: 4, right: 26, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid horizontal={false} stroke="#202d40" />
                          <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${Math.round(value / 1_000_000)}tr`}
                          />
                          <YAxis
                            type="category"
                            dataKey="district_name"
                            axisLine={false}
                            tickLine={false}
                            width={104}
                            tickFormatter={shortenedLabel}
                          />
                          <Tooltip formatter={(value) => formatVnd(Number(value))} />
                          <Bar
                            dataKey="median_price_per_m2_vnd"
                            fill="#34445b"
                            radius={[0, 5, 5, 0]}
                            barSize={13}
                          />
                          <Line
                            dataKey="q75_price_per_m2_vnd"
                            stroke="#47d9f4"
                            strokeWidth={2}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="dashboard-panel type-summary">
                    <div className="panel-heading">
                      <div>
                        <span>ASSET CLASSES</span>
                        <h3>Phân khúc</h3>
                      </div>
                      <Building2 size={20} />
                    </div>
                    <div className="type-list">
                      {typeSummary.slice(0, 6).map((row) => (
                        <div key={row.property_type_name}>
                          <span>{row.property_type_name}</span>
                          <strong>{formatVnd(row.median_price_per_m2_vnd, true)}/m²</strong>
                          <small>{row.listing_count.toLocaleString("vi-VN")} listing</small>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === "comparables" && (
                <section className="dashboard-panel table-panel">
                  <div className="panel-heading">
                    <div>
                      <span>COMPARABLE SET</span>
                      <h3>{analysis?.comparables.total ?? 0} listing gần nhất</h3>
                    </div>
                    <TableProperties size={20} />
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Vị trí</th>
                          <th>Diện tích</th>
                          <th>Giá rao</th>
                          <th>Giá / m²</th>
                          <th>Phòng</th>
                          <th>Mức gần vị trí</th>
                          <th>Độ lệch DT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparableRows.map((row, index) => (
                          <tr key={`${row.street_name}-${row.price}-${index}`}>
                            <td>
                              <strong>
                                {knownLocation(row.street_name, row.ward_name, row.district_name)}
                              </strong>
                              <span>{knownLocation(row.ward_name, row.district_name)}</span>
                            </td>
                            <td>{row.area?.toLocaleString("vi-VN")} m²</td>
                            <td>{formatVnd(row.price, true)}</td>
                            <td>{formatVnd(row.price_per_m2, true)}</td>
                            <td>
                              {row.bedroom_count ?? "—"} PN · {row.bathroom_count ?? "—"} PT
                            </td>
                            <td>
                              {row.location_rank === 0
                                ? "Cùng đường"
                                : row.location_rank === 1
                                  ? "Cùng phường"
                                  : "Cùng quận"}
                            </td>
                            <td>{row.area_distance?.toFixed(1) ?? "—"} m²</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === "range" && (
                <div className="range-layout">
                  <section className="dashboard-panel range-panel">
                    <div className="panel-heading">
                      <div>
                        <span>MARKET REFERENCE RANGE</span>
                        <h3>Dải giá theo thị trường</h3>
                      </div>
                      <Scale size={20} />
                    </div>
                    {reference ? (
                      <>
                        <div className="range-track-wrap">
                          <div className="range-track">
                            <span className="range-fill" />
                            {rangePosition !== null && (
                              <span className="model-marker" style={{ left: `${rangePosition}%` }}>
                                <b>Model</b>
                              </span>
                            )}
                          </div>
                          <div className="range-axis">
                            <span>
                              Q25 <b>{formatVnd(reference.low_price_vnd, true)}</b>
                            </span>
                            <span>
                              Median <b>{formatVnd(reference.median_price_vnd, true)}</b>
                            </span>
                            <span>
                              Q75 <b>{formatVnd(reference.high_price_vnd, true)}</b>
                            </span>
                          </div>
                        </div>
                        <div className="range-summary">
                          <span>Giá model</span>
                          <strong>{prediction?.formatted_price ?? "—"}</strong>
                          <small>{reference.model_position}</small>
                        </div>
                      </>
                    ) : (
                      <div className="range-empty">Chưa đủ dữ liệu để xây dựng dải giá.</div>
                    )}
                  </section>

                  <section className="dashboard-panel range-notes">
                    <div className="panel-heading">
                      <div>
                        <span>MODEL CONFIDENCE</span>
                        <h3>Khoảng sai số validation</h3>
                      </div>
                      <ShieldCheck size={20} />
                    </div>
                    <div className="confidence-value">
                      <small>ESTIMATED RANGE</small>
                      <strong>
                        {confidence
                          ? `${formatVnd(confidence.low_price_vnd, true)} – ${formatVnd(confidence.high_price_vnd, true)}`
                          : "—"}
                      </strong>
                      <span>{confidence?.label ?? "Chưa có dữ liệu"}</span>
                    </div>
                    <p className="confidence-method">
                      {confidence?.methodology ??
                        "Khoảng này sẽ xuất hiện khi model và metric validation sẵn sàng."}
                    </p>
                  </section>
                </div>
              )}

              {activeTab === "deal" && (
                <DealScoreCard
                  dealScore={analysis?.deal_score}
                  askingPriceBillion={askingPriceBillion}
                  loading={loading}
                  onPriceChange={setAskingPriceBillion}
                  onAnalyze={() => {
                    if (currentAskingPrice) {
                      void runAnalysis(draft, currentAskingPrice);
                    }
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}
