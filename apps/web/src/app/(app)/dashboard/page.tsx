import { KpiGrid } from "./components/KpiGrid";
import { MapPreview } from "./components/MapPreview";
import { RecentMeasurementsTable } from "./components/RecentMeasurementsTable";
import { SpeedTrendsChart } from "./components/SpeedTrendsChart";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <KpiGrid />
      <MapPreview />
      <SpeedTrendsChart />
      <RecentMeasurementsTable />
    </div>
  );
}
