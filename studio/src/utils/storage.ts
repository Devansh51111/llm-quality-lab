import { TestCase, RunResult } from '../types/qa';
import { validateDataset } from './evaluator';
import { SEED_TEST_CASES } from '../data/seedData';

const STORAGE_KEY_CASES = 'llm_qualitylab_cases_v1';
const STORAGE_KEY_RUNS = 'llm_qualitylab_runs_v1';
const STORAGE_KEY_ACTIVE_RUN = 'llm_qualitylab_active_run_id_v1';

export function getStoredCases(): TestCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CASES);
    if (!raw) {
      // First time initialization with seed cases
      saveStoredCases(SEED_TEST_CASES);
      return SEED_TEST_CASES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && (parsed.length === 0 || validateDataset(parsed).isValid)) {
      // Migrate only untouched original seed trial cases; never alter run evidence.
      const trial = SEED_TEST_CASES.find(c => c.expectedDurationDays === 14);
      const migrated = parsed.map((c: TestCase) => trial && c.id === trial.id && c.question === trial.question && c.referenceContext === trial.referenceContext && c.expectedDurationDays === undefined && c.expectedRequiredPhrases.some(v => v === '14-day' || v === '14') ? {...c, expectedDurationDays:14, expectedRequiredPhrases:c.expectedRequiredPhrases.filter(v => v !== '14-day' && v !== '14')} : c);
      if (JSON.stringify(migrated) !== JSON.stringify(parsed)) saveStoredCases(migrated);
      return migrated;
    }
  } catch (e) {
    console.warn('[QualityLab Storage] Failed to load cases from localStorage:', e);
  }
  return SEED_TEST_CASES;
}

export function saveStoredCases(cases: TestCase[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CASES, JSON.stringify(cases));
  } catch (e) {
    console.error('[QualityLab Storage] Failed to persist cases:', e);
  }
}

export function resetCasesToSeed(): TestCase[] {
  saveStoredCases(SEED_TEST_CASES);
  return SEED_TEST_CASES;
}

export function getStoredRuns(): RunResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RUNS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn('[QualityLab Storage] Failed to load runs from localStorage:', e);
  }
  return [];
}

export function saveStoredRun(run: RunResult): void {
  try {
    const existing = getStoredRuns();
    // Keep up to 20 most recent runs
    const updated = [run, ...existing.filter((r) => r.runId !== run.runId)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_RUNS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_ACTIVE_RUN, run.runId);
  } catch (e) {
    console.error('[QualityLab Storage] Failed to save run:', e);
  }
}

export function deleteStoredRun(runId: string): RunResult[] {
  try {
    const existing = getStoredRuns();
    const updated = existing.filter((r) => r.runId !== runId);
    localStorage.setItem(STORAGE_KEY_RUNS, JSON.stringify(updated));
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
  return localStorage.getItem(STORAGE_KEY_ACTIVE_RUN);
}

export function setActiveRunId(runId: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_RUN, runId);
}

export function clearAllQualityLabStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CASES);
    localStorage.removeItem(STORAGE_KEY_RUNS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_RUN);
    for (const k of ['ql_claims_v1','ql_claim_output_v1','ql_claim_context_v1','ql_turns_v1','ql_turn_context_v1','ql_perf_v1','ql_perf_case_v1','ql_semantic_v1','ql_semantic_human_v1','ql_reviewer_checks_v1']) localStorage.removeItem(k);
  } catch (e) {
    console.error('[QualityLab Storage] Failed to clear local storage:', e);
  }
}
