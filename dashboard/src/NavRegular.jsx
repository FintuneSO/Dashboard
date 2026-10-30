import NavAumPage from "./NavAumPage";
import { fetchNavRegular, getNavRegularExportUrl } from "./api";
export default function NavRegular() {
  return (
    <NavAumPage
      title="NAV Reg"
      subtitle="Raw daily NAV, Regular plan, per scheme."
      valueLabel="NAV Regular"
      valueKey="nav_value"
      fetchRows={fetchNavRegular}
      getExportUrl={getNavRegularExportUrl}
    />
  );
}
