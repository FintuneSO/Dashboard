import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import FlowIntelligenceShell from "./flow-intelligence/FlowIntelligenceShell.jsx";
import IndustryOverview from "./flow-intelligence/screens/IndustryOverview.jsx";
import AmcList from "./flow-intelligence/screens/AmcList.jsx";
import AmcDetail from "./flow-intelligence/screens/AmcDetail.jsx";
import CategoryList from "./flow-intelligence/screens/CategoryList.jsx";
import CategoryDetail from "./flow-intelligence/screens/CategoryDetail.jsx";
import SchemeList from "./flow-intelligence/screens/SchemeList.jsx";
import SchemeDetail from "./flow-intelligence/screens/SchemeDetail.jsx";
import AssetClassDetail from "./flow-intelligence/screens/AssetClassDetail.jsx";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/flow-intelligence" element={<FlowIntelligenceShell />}>
          <Route index element={<IndustryOverview />} />
          <Route path="amc" element={<AmcList />} />
          <Route path="amc/:id" element={<AmcDetail />} />
          <Route path="category" element={<CategoryList />} />
          <Route path="category/:id" element={<CategoryDetail />} />
          <Route path="scheme" element={<SchemeList />} />
          <Route path="scheme/:id" element={<SchemeDetail />} />
          <Route path="asset-class/:name" element={<AssetClassDetail />} />
        </Route>
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
