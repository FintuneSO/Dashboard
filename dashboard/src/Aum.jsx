import NavAumPage from "./NavAumPage";
import { fetchAum, getAumExportUrl } from "./api";
export default function Aum() {
  return (
    <NavAumPage
      title="AUM"
      subtitle="Raw daily AUM (in Crore), per scheme."
      valueLabel="AUM in Crore"
      valueKey="aum_value"
      fetchRows={fetchAum}
      getExportUrl={getAumExportUrl}
    />
  );
}
