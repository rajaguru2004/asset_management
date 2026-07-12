// AssetFlow Library engine — generic key/value vocabularies (location, fuel_type, ...)
// consumed as select-field sources across Modules 4-7 (Asset.location, category
// customValues, booking/maintenance dropdowns).

export const LIBRARY_NAMES = [
  'location',
  'fuel_type',
  'booking_purpose',
  'maintenance_type',
] as const;

export type LibraryName = (typeof LIBRARY_NAMES)[number];

// Libraries with a real, cheaply-checkable usage count blocking delete.
// fuel_type/booking_purpose/maintenance_type live inside per-category customValues
// JSON or free-text fields — no reference check, soft-deactivate only.
// TODO: extend usage-checking once those fields are structurally queryable.
export const CHECKABLE_LIBRARIES: LibraryName[] = ['location'];
