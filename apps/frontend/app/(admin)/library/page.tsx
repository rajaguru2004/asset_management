import { LibraryTable } from '@/components/library/LibraryTable';

export default function LibraryPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Library</h2>
        <p className="mt-1 text-sm text-muted">
          Shared vocabularies (locations, fuel types, booking purposes, maintenance types) used across
          Assets, Allocations, Bookings and Maintenance.
        </p>
      </div>
      <LibraryTable />
    </div>
  );
}
