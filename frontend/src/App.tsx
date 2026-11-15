import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ModelRegistryPage } from './pages/ModelRegistryPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { EvaluationLabPage } from './pages/EvaluationLabPage';
import { BiasAnalysisPage } from './pages/BiasAnalysisPage';
import { PromptPlaygroundPage } from './pages/PromptPlaygroundPage';
import { MitigationStudioPage } from './pages/MitigationStudioPage';
import { ReportsPage } from './pages/ReportsPage';
import { CustomTestSuitePage } from './pages/CustomTestSuitePage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { SystemStatus } from './types';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Research Overview Dashboard',
    description: 'Empirical model metrics, fairness indicators, and live evaluation summary.',
  },
  '/models': {
    title: 'Pretrained Model Registry',
    description: 'Task-aware model loading, architecture inspection, and memory footprint management.',
  },
  '/datasets': {
    title: 'Benchmark Dataset Explorer',
    description: 'Standardized social bias datasets (StereoSet, CrowS-Pairs, WinoBias) & custom suite uploads.',
  },
  '/evaluations': {
    title: 'Evaluation Lab',
    description: 'Launch reproducible fairness audits across models, categories, and benchmark protocols.',
  },
  '/analysis': {
    title: 'Explainable Bias Analysis & Evidence',
    description: 'Examine per-example likelihood traces, decision rationales, and category distributions.',
  },
  '/playground': {
    title: 'Interactive Prompt Playground',
    description: 'Side-by-side prompt debiasing, directive injection, and counterfactual generation.',
  },
  '/mitigation': {
    title: 'Mitigation Studio',
    description: 'Prompt neutralization, counterfactual data augmentation (CDA), and subspace projection.',
  },
  '/reports': {
    title: 'Research Reports & Publications',
    description: 'Synthesize standards-compliant scientific audit manuscripts with empirical citations.',
  },
  '/testsuites': {
    title: 'Custom Test Suite & Invariance Assertions',
    description: 'Curate domain-specific counterfactual test cases and evaluate prediction consistency.',
  },
  '/settings': {
    title: 'Settings & Hardware Diagnostics',
    description: 'System resource monitoring, WEAT permutation calculator, and Responsible AI guidelines.',
  },
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const checkSystem = async () => {
      try {
        const s = await api.getSystemStatus();
        setStatus(s);
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    };
    checkSystem();
    const timer = setInterval(checkSystem, 10000);
    return () => clearInterval(timer);
  }, []);

  const meta = pageMeta[location.pathname] || {
    title: 'FairLens AI',
    description: 'Responsible AI Evaluation Platform',
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar device={status?.device} isOnline={isOnline} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={meta.title} description={meta.description} />

        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<OverviewDashboard />} />
            <Route path="/models" element={<ModelRegistryPage />} />
            <Route path="/datasets" element={<DatasetExplorerPage />} />
            <Route path="/evaluations" element={<EvaluationLabPage />} />
            <Route path="/analysis" element={<BiasAnalysisPage />} />
            <Route path="/playground" element={<PromptPlaygroundPage />} />
            <Route path="/mitigation" element={<MitigationStudioPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/testsuites" element={<CustomTestSuitePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;
