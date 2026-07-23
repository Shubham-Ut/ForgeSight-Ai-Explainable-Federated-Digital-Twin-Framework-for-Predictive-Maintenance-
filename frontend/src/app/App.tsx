import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@shared/components/layout/MainLayout';
import { PageLoader } from '@shared/components/ui/PageLoader';

// Lazy-loaded feature pages for optimal code-splitting
const DashboardPage      = React.lazy(() => import('@features/dashboard/pages/DashboardPage'));
const DigitalTwinPage    = React.lazy(() => import('@features/digital-twin/pages/DigitalTwinPage'));
const PredictionsPage    = React.lazy(() => import('@features/predictions/pages/PredictionsPage'));
const ExplainabilityPage = React.lazy(() => import('@features/explainability/pages/ExplainabilityPage'));
const FederatedPage      = React.lazy(() => import('@features/federated/pages/FederatedPage'));
const RagAssistantPage   = React.lazy(() => import('@features/rag-assistant/pages/RagAssistantPage'));
const ComputerVisionPage = React.lazy(() => import('@features/computer-vision/pages/ComputerVisionPage'));
const MaintenancePage    = React.lazy(() => import('@features/maintenance/pages/MaintenancePage'));
const ReportsPage        = React.lazy(() => import('@features/reports/pages/ReportsPage'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="digital-twin" element={<DigitalTwinPage />} />
          <Route path="predictions"  element={<PredictionsPage />} />
          <Route path="explainability" element={<ExplainabilityPage />} />
          <Route path="federated"    element={<FederatedPage />} />
          <Route path="assistant"    element={<RagAssistantPage />} />
          <Route path="vision"       element={<ComputerVisionPage />} />
          <Route path="maintenance"  element={<MaintenancePage />} />
          <Route path="reports"      element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
