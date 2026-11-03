import {safeRead,safeWrite,storageWarnings,clearStorageWarnings,flagStorage} from './safeStorage';
import { TestCase, RunResult } from '../types/qa';
import { validateDataset } from './evaluator';
import { SEED_TEST_CASES } from '../data/seedData';

const STORAGE_KEY_CASES = 'llm_qualitylab_cases_v1';
const STORAGE_KEY_RUNS = 'llm_qualitylab_runs_v1';
const STORAGE_KEY_ACTIVE_RUN = 'llm_qualitylab_active_run_id_v1';

export function getStoredCases(): TestCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CASES);
    if (raw === null) {
      // First time initialization with seed cases
      saveStoredCases(SEED_TEST_CASES);
      return SEED_TEST_CASES;
    }
    const parsed = safeRead<TestCase[]>(STORAGE_KEY_CASES, []);
    if (Array.isArray(parsed) && (parsed.length === 0 || validateDataset(parsed).isValid)) {
      // Migrate only untouched original seed trial cases; never alter run evidence.
      const trial = SEED_TEST_CASES.find(c => c.expectedDurationDays === 14);
      const migrated = parsed.map((c: TestCase) => trial && c.id === trial.id && c.question === trial.question && c.referenceContext === trial.referenceContext && c.expectedDurationDays === undefined && c.expectedRequiredPhrases.some(v => v === '14-day' || v === '14') ? {...c, expectedDurationDays:14, expectedRequiredPhrases:c.expectedRequiredPhrases.filter(v => v !== '14-day' && v !== '14')} : c);
      if (JSON.stringify(migrated) !== JSON.stringify(parsed)) saveStoredCases(migrated);
      return migrated;
    }
  } catch (e) {
    flagStorage(STORAGE_KEY_CASES);
    console.warn('[QualityLab Storage] Failed to load cases from localStorage:', e);
  }
  return SEED_TEST_CASES;
}

export function saveStoredCases(cases: TestCase[]): void {
  try {
    safeWrite(STORAGE_KEY_CASES, cases);
  } catch (e) {
    console.error('[QualityLab Storage] Failed to persist cases:', e);
  }
}

export function resetCasesToSeed(): TestCase[] {
  saveStoredCases(SEED_TEST_CASES);
  return SEED_TEST_CASES;
}

export function getStoredRuns(): RunResult[] { return safeRead<RunResult[]>(STORAGE_KEY_RUNS,[]); }

export function saveStoredRun(run: RunResult): void {
  try {
    const existing = getStoredRuns();
    // Keep up to 20 most recent runs
    const updated = [run, ...existing.filter((r) => r.runId !== run.runId)].slice(0, 20);
    safeWrite(STORAGE_KEY_RUNS, updated);
    if(!storageWarnings().includes(STORAGE_KEY_RUNS)) localStorage.setItem(STORAGE_KEY_ACTIVE_RUN, run.runId);
  } catch (e) {
    console.error('[QualityLab Storage] Failed to save run:', e);
  }
}

export function deleteStoredRun(runId: string): RunResult[] {
  try {
    const existing = getStoredRuns();
    const updated = existing.filter((r) => r.runId !== runId);
    safeWrite(STORAGE_KEY_RUNS, updated);
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE_RUN);
    if (active === runId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_RUN, updated[0]?.runId || '');
    }
    return updated;
  } catch (e) {
    console.error('[QualityLab Storage] Failed to delete run:', e);
    return getStoredRuns();
  }
}

export function getActiveRunId(): string | null {
  try{return localStorage.getItem(STORAGE_KEY_ACTIVE_RUN);}catch{flagStorage(STORAGE_KEY_ACTIVE_RUN);return null;}
}

export function setActiveRunId(runId: string): void {
  try{localStorage.setItem(STORAGE_KEY_ACTIVE_RUN, runId);}catch{flagStorage(STORAGE_KEY_ACTIVE_RUN);}
}

export function clearAllQualityLabStorage(): void {
  try {
    clearStorageWarnings();
    localStorage.removeItem(STORAGE_KEY_CASES);
    localStorage.removeItem(STORAGE_KEY_RUNS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_RUN);
    for (const k of ['ql_claims_v1','ql_claim_output_v1','ql_claim_context_v1','ql_turns_v1','ql_turn_context_v1','ql_perf_v1','ql_perf_case_v1','ql_semantic_v1','ql_semantic_human_v1','ql_reviewer_checks_v1']) localStorage.removeItem(k);
  } catch (e) {
    console.error('[QualityLab Storage] Failed to clear local storage:', e);
  }
}
