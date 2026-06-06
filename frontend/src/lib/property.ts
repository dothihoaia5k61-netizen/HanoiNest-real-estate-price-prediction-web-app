import type { PropertyPayload } from "../types";

export const DEFAULT_PROPERTY: PropertyPayload = {
  property_type_name: "Nhà",
  province_name: "Hà Nội",
  district_name: "Cầu Giấy",
  ward_name: "Dịch Vọng",
  street_name: "Cầu Giấy",
  project_name: "Unknown",
  area: 50,
  floor_count: 4,
  frontage_width: 4,
  house_depth: 12.5,
  road_width: null,
  bedroom_count: 3,
  bathroom_count: 3,
  house_direction: "Unknown",
  balcony_direction: "Unknown",
  published_at: "2025-06-15",
};

export function normalizeProperty(property: PropertyPayload): PropertyPayload {
  const isApartment = property.property_type_name === "Căn hộ chung cư";
  const isLand = property.property_type_name === "Đất";
  const frontage = isApartment ? null : property.frontage_width;

  return {
    ...property,
    ward_name: property.ward_name || "Unknown",
    street_name: property.street_name || "Unknown",
    project_name: "Unknown",
    frontage_width: frontage,
    house_depth: frontage && frontage > 0 ? property.area / frontage : null,
    road_width: null,
    floor_count: isApartment || isLand ? null : property.floor_count,
    bedroom_count: isLand ? null : property.bedroom_count,
    bathroom_count: isLand ? null : property.bathroom_count,
    balcony_direction: isApartment ? property.balcony_direction : "Unknown",
    published_at: "2025-06-15",
  };
}
