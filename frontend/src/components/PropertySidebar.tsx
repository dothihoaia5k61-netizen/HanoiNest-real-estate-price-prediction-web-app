import {
  Bath,
  BedDouble,
  Building2,
  Calculator,
  ChevronDown,
  Compass,
  House,
  LoaderCircle,
  MapPin,
  Ruler,
  RotateCcw,
  Sparkles,
  Waypoints,
} from "lucide-react";
import type { FormEvent } from "react";
import type { LocationOptions, MetadataOptions, PropertyPayload } from "../types";

type PropertySidebarProps = {
  value: PropertyPayload;
  metadata: MetadataOptions | null;
  locations: LocationOptions | null;
  loading: boolean;
  locationLoading: boolean;
  onChange: (next: PropertyPayload) => void;
  onDistrictChange: (districtName: string) => void;
  onWardChange: (wardName: string) => void;
  onSubmit: () => void;
  onReset: () => void;
};

type NumberKey =
  | "area"
  | "floor_count"
  | "bedroom_count"
  | "bathroom_count";

const fallbackPropertyTypes = ["Nhà", "Căn hộ chung cư", "Đất", "Biệt thự/Nhà liền kề"];
const fallbackDistricts = ["Cầu Giấy", "Ba Đình", "Đống Đa", "Tây Hồ", "Hà Đông"];
const fallbackDirections = [
  "Unknown",
  "Đông",
  "Tây",
  "Nam",
  "Bắc",
  "Đông Bắc",
  "Đông Nam",
  "Tây Bắc",
  "Tây Nam",
];
const frontageOptions = [3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, 12, 15, 20];

function optionLabel(value: string) {
  return value === "Unknown" ? "Chưa xác định" : value;
}

export function PropertySidebar({
  value,
  metadata,
  locations,
  loading,
  locationLoading,
  onChange,
  onDistrictChange,
  onWardChange,
  onSubmit,
  onReset,
}: PropertySidebarProps) {
  const isApartment = value.property_type_name === "Căn hộ chung cư";
  const isLand = value.property_type_name === "Đất";
  const supportsFrontage = !isApartment;
  const supportsFloors = !isApartment && !isLand;
  const supportsRooms = !isLand;
  const computedDepth =
    supportsFrontage && value.frontage_width && value.frontage_width > 0
      ? value.area / value.frontage_width
      : null;

  const setText = (key: keyof PropertyPayload, next: string) => {
    onChange({ ...value, [key]: next });
  };

  const setNumber = (key: NumberKey, next: string) => {
    const parsed = next === "" ? null : Number(next);
    const updated = { ...value, [key]: parsed };
    if (key === "area" && updated.frontage_width && parsed) {
      updated.house_depth = Number(parsed) / updated.frontage_width;
    }
    onChange(updated);
  };

  const setFrontage = (next: string) => {
    const frontage = next === "" ? null : Number(next);
    onChange({
      ...value,
      frontage_width: frontage,
      house_depth: frontage ? value.area / frontage : null,
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <aside className="property-sidebar">
      <div className="sidebar-heading">
        <div>
          <span className="eyebrow">THÔNG TIN ĐỊNH GIÁ</span>
          <h2>Thông tin tài sản</h2>
        </div>
        <button className="icon-button" type="button" onClick={onReset} title="Đặt lại dữ liệu">
          <RotateCcw size={17} />
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="field-group">
          <label htmlFor="property-type">
            <Building2 size={15} /> Loại bất động sản
          </label>
          <div className="select-wrap">
            <select
              id="property-type"
              value={value.property_type_name}
              onChange={(event) => setText("property_type_name", event.target.value)}
            >
              {(metadata?.property_types.length
                ? metadata.property_types
                : fallbackPropertyTypes
              ).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="district">
            <MapPin size={15} /> Quận/Huyện
          </label>
          <div className="select-wrap">
            <select
              id="district"
              value={value.district_name}
              onChange={(event) => onDistrictChange(event.target.value)}
            >
              {(metadata?.districts.length ? metadata.districts : fallbackDistricts).map(
                (option) => (
                  <option key={option}>{option}</option>
                ),
              )}
            </select>
            <ChevronDown size={16} />
          </div>
        </div>

        <div className="field-row">
          <div className="field-group">
            <label htmlFor="ward">Phường/Xã</label>
            <div className="select-wrap">
              <select
                id="ward"
                value={value.ward_name}
                disabled={locationLoading}
                onChange={(event) => onWardChange(event.target.value)}
              >
                <option value="Unknown">Chưa xác định</option>
                {(locations?.wards ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
          <div className="field-group">
            <label htmlFor="street">Tên đường</label>
            <div className="select-wrap">
              <select
                id="street"
                value={value.street_name}
                disabled={locationLoading}
                onChange={(event) => setText("street_name", event.target.value)}
              >
                <option value="Unknown">Chưa xác định</option>
                {(locations?.streets ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="numeric-grid">
          <div className="field-group">
            <label htmlFor="area">
              <Ruler size={15} /> Diện tích
            </label>
            <div className="unit-input">
              <input
                id="area"
                type="number"
                min="10"
                step="1"
                value={value.area}
                onChange={(event) => setNumber("area", event.target.value)}
              />
              <span>m²</span>
            </div>
          </div>

          {supportsFrontage && (
            <div className="field-group">
              <label htmlFor="frontage">
                <House size={15} /> Mặt tiền
              </label>
              <div className="select-wrap">
                <select
                  id="frontage"
                  value={value.frontage_width ?? ""}
                  onChange={(event) => setFrontage(event.target.value)}
                >
                  <option value="">Chưa xác định</option>
                  {frontageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} m
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} />
              </div>
            </div>
          )}

          {supportsFloors && (
            <div className="field-group">
              <label htmlFor="floors">
                <Waypoints size={15} /> Số tầng
              </label>
              <input
                id="floors"
                type="number"
                min="0"
                value={value.floor_count ?? ""}
                onChange={(event) => setNumber("floor_count", event.target.value)}
              />
            </div>
          )}

          {supportsRooms && (
            <>
              <div className="field-group">
                <label htmlFor="bedrooms">
                  <BedDouble size={15} /> Phòng ngủ
                </label>
                <input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={value.bedroom_count ?? ""}
                  onChange={(event) => setNumber("bedroom_count", event.target.value)}
                />
              </div>
              <div className="field-group">
                <label htmlFor="bathrooms">
                  <Bath size={15} /> Phòng tắm
                </label>
                <input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={value.bathroom_count ?? ""}
                  onChange={(event) => setNumber("bathroom_count", event.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {supportsFrontage && (
          <div className="computed-field">
            <Calculator size={16} />
            <div>
              <span>Chiều sâu tự tính</span>
              <strong>{computedDepth ? `${computedDepth.toFixed(1)} m` : "Chưa xác định"}</strong>
            </div>
            <small>Diện tích ÷ mặt tiền</small>
          </div>
        )}

        <details className="advanced-fields">
          <summary>
            Hướng tài sản <ChevronDown size={15} />
          </summary>
          <div className="details-content">
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="house-direction">
                  <Compass size={15} /> {isApartment ? "Hướng căn hộ" : "Hướng tài sản"}
                </label>
                <div className="select-wrap">
                  <select
                    id="house-direction"
                    value={value.house_direction}
                    onChange={(event) => setText("house_direction", event.target.value)}
                  >
                    {(metadata?.house_directions.length
                      ? metadata.house_directions
                      : fallbackDirections
                    ).map((option) => (
                      <option key={option} value={option}>
                        {optionLabel(option)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>

              {isApartment && (
                <div className="field-group">
                  <label htmlFor="balcony-direction">Hướng ban công</label>
                  <div className="select-wrap">
                    <select
                      id="balcony-direction"
                      value={value.balcony_direction}
                      onChange={(event) => setText("balcony_direction", event.target.value)}
                    >
                      {(metadata?.balcony_directions.length
                        ? metadata.balcony_directions
                        : fallbackDirections
                      ).map((option) => (
                        <option key={option} value={option}>
                          {optionLabel(option)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>

        <button className="primary-action" type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
          {loading ? "Đang phân tích" : "Ước tính giá trị"}
        </button>
      </form>
    </aside>
  );
}
