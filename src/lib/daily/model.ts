export type Ride = { car: string; driver: string; passengers: string };
export type Waste = { product: string; quantity: string; reason: string };
export type DailyInput = {
  notes: string;
  diners: string;
  rides: Ride[];
  waste: Waste[];
};
export type DailySummary = DailyInput & {
  id: string;
  location_id: string;
  work_date: string;
  version: number;
  updated_at: string;
  updated_by: string;
  updated_name: string;
};
export type Feedback = {
  id: string;
  author_id: string;
  author_name: string;
  location_id: string | null;
  kind: "idea" | "bug";
  title: string;
  description: string;
  status: "new" | "planned" | "done";
  version: number;
  created_at: string;
  updated_at: string;
};
export function validDaily(value: DailyInput) {
  return (
    !!value &&
    [value.notes, value.diners].every(
      (v) => typeof v === "string" && v.length <= 4000,
    ) &&
    Array.isArray(value.rides) &&
    value.rides.length <= 50 &&
    value.rides.every(
      (r) =>
        r &&
        [r.car, r.driver, r.passengers].every(
          (v) => typeof v === "string" && v.length <= 500,
        ) &&
        r.car.trim() &&
        r.driver.trim(),
    ) &&
    Array.isArray(value.waste) &&
    value.waste.length <= 50 &&
    value.waste.every(
      (w) =>
        w &&
        [w.product, w.quantity, w.reason].every(
          (v) => typeof v === "string" && v.length <= 500,
        ) &&
        w.product.trim() &&
        w.quantity.trim(),
    )
  );
}
