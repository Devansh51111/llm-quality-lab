import {SemanticReviewView} from './views/SemanticReviewView';
import {importRun} from './utils/importRun';
import {ClaimsView} from './views/ClaimsView';
import {ConversationsView} from './views/ConversationsView';
import {PerformanceView} from './views/PerformanceView';
import {AnalyticsView} from './views/AnalyticsView';
import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabId } from './components/Sidebar';
import { HowThisWorksModal } from './components/HowThisWorksModal';
import { RoadmapModal } from './components/RoadmapModal';
import { OverviewView } from './views/OverviewView';
import { DatasetsView } from './views/DatasetsView';
import { EvaluationLabView } from './views/EvaluationLabView';
import { SafetyView } from './views/SafetyView';
import { RegressionView } from './views/RegressionView';
import { ReportsView } from './views/ReportsView';

import { TestCase, RunResult, TestCaseResult } from './types/qa';
import {
  getStoredCases,
  saveStoredCases,
  resetCasesToSeed,
  getStoredRuns,
  saveStoredRun,
  getActiveRunId,
  setActiveRunId,
  clearAllQualityLabStorage
} from './utils/storage';
import { computeDatasetFingerprint, evaluateTestCase, buildRunResult } from './utils/evaluator';

export default function App() {
  const [ownerPassword,setOwnerPassword]=useState('');
  const [ownerStatus,setOwnerStatus]=useState('');
  const [ownerSignedIn,setOwnerSignedIn]=useState(false);
  const [currentTab, setCurrentTab] = useState<TabId>('eval_lab');
  const [cases, setCases] = useState<TestCase[]>(() => getStoredCases());
  const [allRuns, setAllRuns] = useState<RunResult[]>(() => getStoredRuns());
  const [activeRunId, setActiveRunIdState] = useState<string | null>(() => getActiveRunId());
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState<{ current: number; total: number; currentCaseName: string } | null>(null);

  // Server & key status
  const [serverStatus, setServerStatus] = useState<{ hasApiKey: boolean; tier: string } | null>(null);

  // Modals & responsive navigation
  const [isHowThisWorksOpen, setIsHowThisWorksOpen] = useState(false);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [labSelectedCaseId, setLabSelectedCaseId] = useState<string | null>(null);

  async function refreshServerStatus(){
    try{const r=await fetch('api/status');if(!r.ok)throw Error('No backend');const data=await r.json();setServerStatus({hasApiKey:Boolean(data.hasApiKey),tier:data.tier});}
    catch{setServerStatus({hasApiKey:false,tier:'Disconnected'});}
  }
  useEffect(()=>{void refreshServerStatus();},[]);

  const datasetFingerprint = useMemo(() => {
    return computeDatasetFingerprint(cases);
  }, [cases]);

  // Active run object
  const activeRun = useMemo(() => {
    if (!activeRunId) return allRuns[0] || null;
    return allRuns.find((r) => r.runId === activeRunId) || allRuns[0] || null;
  }, [activeRunId, allRuns]);

  // Execute full suite on Live Gemini API
  const handleRunLiveSuite = async () => {
    if (isRunningSuite || cases.length === 0) return;
    setIsRunningSuite(true);
    setSuiteProgress({ current: 0, total: cases.length, currentCaseName: '' });

    const results: TestCaseResult[] = [];
    const requestedModel = 'gemini-3.5-flash-lite';
    let actualModelReported = 'not reported';

    for (let i = 0; i < cases.length; i++) {
      const tc = cases[i];
      setSuiteProgress({ current: i + 1, total: cases.length, currentCaseName: tc.name });

      try {
        const response = await fetch('api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: tc.question,
            referenceContext: tc.referenceContext,
            requireJson: tc.requireJson,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}: Generation failed`);
        }

        if (data.actualModelVersion) {
          actualModelReported = data.actualModelVersion;
        }

        const evalResult = evaluateTestCase(
          tc,
          data.text || '',
          data.latencyMs || null,
          'live_gemini_api',
          requestedModel,
          data.actualModelVersion || 'not reported'
        );
        results.push(evalResult);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        // Genuine runtime error captured and counted in denominator
        const failedEvalResult = evaluateTestCase(
          tc,
          '',
          null,
          'live_gemini_api',
          requestedModel,
          'not reported',
          errorMsg
        );
        results.push(failedEvalResult);
        for (const skipped of cases.slice(i+1)) results.push(evaluateTestCase(skipped,'',null,'live_gemini_api',requestedModel,'not reported','Not executed: suite stopped after provider/transport error.'));
        break;
      }
    }

    const newRun = buildRunResult(
      results,
      cases,
      'live_gemini_api',
      requestedModel,
      datasetFingerprint,
      actualModelReported
    );
    saveStoredRun(newRun);
    setAllRuns(getStoredRuns());
    setActiveRunIdState(newRun.runId);
    setIsRunningSuite(false);
    setSuiteProgress(null);
  };

  // Replay synthetic sample fixture suite (Latency is strictly null/unmeasured)
  const handleRunSampleReplaySuite = () => {
    if (isRunningSuite || cases.length === 0) return;
    setIsRunningSuite(true);

    const results: TestCaseResult[] = cases.map((tc) => {
      return evaluateTestCase(
        tc,
        tc.syntheticSampleOutput,
        null, // null/unmeasured latency for synthetic samples
        'synthetic_sample_replay',
        'synthetic-sample-fixture-v1',
        'synthetic-sample-fixture-v1'
      );
    });

    const newRun = buildRunResult(
      results,
      cases,
      'synthetic_sample_replay',
      'synthetic-sample-fixture-v1',
      datasetFingerprint,
      'synthetic-sample-fixture-v1'
    );

    saveStoredRun(newRun);
    setAllRuns(getStoredRuns());
    setActiveRunIdState(newRun.runId);
    setIsRunningSuite(false);
  };

  // Select a past run
  const handleSelectRun = (runId: string) => {
    setActiveRunIdState(runId);
    setActiveRunId(runId);
  };

  // Dataset case handlers
  const handleSaveCase = (updatedCase: TestCase) => {
    const existingIndex = cases.findIndex((c) => c.id === updatedCase.id);
    let updatedCases: TestCase[];
    if (existingIndex >= 0) {
      updatedCases = [...cases];
      updatedCases[existingIndex] = updatedCase;
    } else {
      updatedCases = [updatedCase, ...cases];
    }
    setCases(updatedCases);
    saveStoredCases(updatedCases);
  };

  const handleDeleteCase = (caseId: string) => {
    const updated = cases.filter((c) => c.id !== caseId);
    setCases(updated);
    saveStoredCases(updated);
  };

  const handleResetSeedData = () => {
    const seeded = resetCasesToSeed();
    setCases(seeded);
  };

  const handleImportCases = (imported: TestCase[]) => {
    setCases(imported);
    saveStoredCases(imported);
  };

  const handleClearAllStorage = () => {
    clearAllQualityLabStorage();
    const seeded = getStoredCases();
    setCases(seeded);
    setAllRuns([]);
    setActiveRunIdState(null);
  };

  const handleNavigateToCaseInLab = (caseId: string) => {
    setLabSelectedCaseId(caseId);
    setCurrentTab('eval_lab');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        onOpenHowThisWorks={() => setIsHowThisWorksOpen(true)}
        onOpenRoadmap={() => setIsRoadmapOpen(true)}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        activeRunOrigin={activeRun?.runOrigin}
        serverStatus={serverStatus}
      />

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          datasetCount={cases.length}
          datasetFingerprint={datasetFingerprint}
          activeRun={activeRun}
          onClearStorage={handleClearAllStorage}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-5 p-4 bg-zinc-900 border border-zinc-700 rounded-xl text-sm space-y-2">
            <details open={!ownerSignedIn}><summary className="cursor-pointer text-cyan-300 font-semibold">{ownerSignedIn?'Connected for live AI':'Connect your private AI access'}</summary><p className="text-xs text-zinc-400 mt-2">Paste your QualityLab website password below, not your Google password or API key. Live AI stays private to you.</p><input aria-label="Owner access password" type="password" autoComplete="current-password" placeholder="Your QualityLab website password" className="ql-input" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)}/><button className="ql-button mt-2" onClick={async()=>{try{const r=await fetch('api/owner/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:ownerPassword})});const d=await r.json();setOwnerStatus(r.ok?'Owner signed in for 8 hours.':d.error);setOwnerSignedIn(r.ok);setOwnerPassword('');await refreshServerStatus();}catch{setOwnerStatus('No private backend is connected at this URL.');}}}>Connect live AI</button><button className="ql-button mt-2 ml-2" onClick={async()=>{try{await fetch('api/owner/logout',{method:'POST'});setOwnerStatus('Signed out. Live calls are locked.');setOwnerSignedIn(false);await refreshServerStatus();}catch{setOwnerStatus('Could not reach private backend.');}}}>Sign out</button><p role="status">{ownerStatus}</p></details>
            <p className="text-xs text-zinc-400">Fictional/public inputs only. Use a ready-made test below or open advanced settings to design your own. Free hosting can wake slowly.</p>
            <details className="text-xs text-zinc-500"><summary>Import a saved run (advanced)</summary>
            <label className="block text-cyan-300">Import full run JSON (unverified evidence, checks recomputed)<input aria-label="Import full run JSON" type="file" accept="application/json,.json" className="block mt-2 max-w-full text-xs" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{if(f.size>5000000)throw Error('Maximum file size5MB.');const run=importRun(JSON.parse(await f.text()));saveStoredRun(run);setAllRuns(getStoredRuns());setActiveRunIdState(run.runId);}catch(err){alert(String(err));}e.target.value='';}}/></label>
            </details>
            {activeRun?.notes?.includes('IMPORTED_UNVERIFIED')&&<p className="text-amber-300">{activeRun.notes}</p>}
          </div>
          {/* Progress Banner during Live Suite Run */}
          {isRunningSuite && suiteProgress && (
            <div className="mb-6 p-4 bg-cyan-950/70 border border-cyan-700/80 rounded-xl shadow-lg animate-pulse text-xs font-mono text-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  Executing Live Gemini API QA Suite ({suiteProgress.current} / {suiteProgress.total})
                </span>
                <span>{Math.round((suiteProgress.current / suiteProgress.total) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden mb-2">
                <div
                  className="bg-cyan-400 h-1.5 transition-all duration-300"
                  style={{ width: `${(suiteProgress.current / suiteProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Evaluating: <span className="text-white">{suiteProgress.currentCaseName}</span>
              </p>
            </div>
          )}

          {currentTab === 'semantic' && <SemanticReviewView activeRun={activeRun}/>}
          {currentTab === 'claims' && <ClaimsView activeRun={activeRun}/>}
          {currentTab === 'conversations' && <ConversationsView/>}
          {currentTab === 'performance' && <PerformanceView cases={cases}/>}
          {currentTab === 'analytics' && <AnalyticsView activeRun={activeRun} allRuns={allRuns}/>}
          {/* Current Active View */}
          {currentTab === 'overview' && (
            <OverviewView
              activeRun={activeRun}
              cases={cases}
              allRuns={allRuns}
              isRunningSuite={isRunningSuite}
              onRunLiveSuite={handleRunLiveSuite}
              onRunSampleReplaySuite={handleRunSampleReplaySuite}
              onSelectRun={handleSelectRun}
              onNavigateToCaseInLab={handleNavigateToCaseInLab}
            />
          )}

          {currentTab === 'datasets' && (
            <DatasetsView
              cases={cases}
              datasetFingerprint={datasetFingerprint}
              onSaveCase={handleSaveCase}
              onDeleteCase={handleDeleteCase}
              onResetSeedData={handleResetSeedData}
              onImportCases={handleImportCases}
            />
          )}

          {currentTab === 'eval_lab' && (
            <EvaluationLabView
              cases={cases}
              selectedCaseId={labSelectedCaseId}
              onSaveCaseResult={(result, editedCaseConfig) => {
                const singleCaseSnapshot = [editedCaseConfig];
                const singleFingerprint = computeDatasetFingerprint(singleCaseSnapshot);
                const singleRun = buildRunResult(
                  [result],
                  singleCaseSnapshot,
                  result.runOrigin,
                  result.requestedModel,
                  singleFingerprint,
                  result.actualModelVersion,
                  `Lab Single: ${editedCaseConfig.name}`
                );
                saveStoredRun(singleRun);
                setAllRuns(getStoredRuns());
                setActiveRunIdState(singleRun.runId);
              }}
            />
          )}

          {currentTab === 'safety' && <SafetyView cases={cases} />}

          {currentTab === 'regression' && (
            <RegressionView allRuns={allRuns} activeRun={activeRun} />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              activeRun={activeRun}
              allRuns={allRuns}
              onSelectRun={handleSelectRun}
              onClearStorage={handleClearAllStorage}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <HowThisWorksModal
        isOpen={isHowThisWorksOpen}
        onClose={() => setIsHowThisWorksOpen(false)}
      />

      <RoadmapModal
        isOpen={isRoadmapOpen}
        onClose={() => setIsRoadmapOpen(false)}
      />
    </div>
  );
}
