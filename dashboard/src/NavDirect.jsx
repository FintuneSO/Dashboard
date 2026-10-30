import NavAumPage from "./NavAumPage";
import { fetchNavDirect, getNavDirectExportUrl } from "./api";
export default function NavDirect() {
  return (
    <NavAumPage
      title="NAV Direct"
      subtitle="Raw daily NAV, Direct plan, per scheme."
      valueLabel="NAV Direct"
      valueKey="nav_value"
      fetchRows={fetchNavDirect}
      getExportUrl={getNavDirectExportUrl}
    />
  );
}
