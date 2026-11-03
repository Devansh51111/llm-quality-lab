import { useState } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit3,
  RotateCcw,
  Fingerprint,
  Search,
  Download,
  Upload,
  Check,
  X,
  FileCode,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { TestCase, SeverityLevel, Category } from '../types/qa';

interface DatasetsViewProps {
  cases: TestCase[];
  datasetFingerprint: string;
  onSaveCase: (updatedCase: TestCase) => void;
  onDeleteCase: (caseId: string) => void;
  onResetSeedData: () => void;
  onImportCases: (importedCases: TestCase[]) => void;
}

export function DatasetsView({
  cases,
  datasetFingerprint,
  onSaveCase,
  onDeleteCase,
  onResetSeedData,
  onImportCases,
}: DatasetsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form fields for create/edit
  const [formData, setFormData] = useState<Partial<TestCase>>({});

  const startEdit = (tc: TestCase) => {
    setEditingCase(tc);
    setIsCreatingNew(false);
    setFormData({
      ...tc,
      expectedRequiredPhrases: [...tc.expectedRequiredPhrases],
      prohibitedPhrases: [...tc.prohibitedPhrases],
      expectedCitations: [...tc.expectedCitations],
    });
  };

  const startCreate = () => {
    const newId = `tc-custom-${Date.now().toString(36)}`;
    setIsCreatingNew(true);
    setEditingCase(null);
    setFormData({
      id: newId,
      name: 'Custom Evaluation Test Case',
      category: 'Constraint Enforcement',
      severity: 'medium',
      question: '',
      referenceContext: '',
      expectedRequiredPhrases: [],
      prohibitedPhrases: [],
      expectedCitations: [],
      requireJson: false,
      privacyPatternsCheck: false,
      syntheticSampleOutput: 'Synthetic preview candidate output.',
      notes: '',
    });
  };

  const cancelEdit = () => {
    setEditingCase(null);
    setIsCreatingNew(false);
    setFormData({});
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.question) return;

    const caseId = (formData.id || '').trim();
    if (!caseId) {
      alert('Test Case ID cannot be empty.');
      return;
    }

    // Check for duplicate ID
    const isDuplicate = cases.some((c) => c.id === caseId && (!editingCase || editingCase.id !== caseId));
    if (isDuplicate) {
      alert(`Test Case ID "${caseId}" is already used by another test case. IDs must be unique.`);
      return;
    }

    const updated: TestCase = {
      id: caseId,
      name: formData.name.trim(),
      category: (formData.category as Category) || 'Factual Adherence',
      severity: (formData.severity as SeverityLevel) || 'medium',
      question: (formData.question || '').trim(),
      referenceContext: (formData.referenceContext || '').trim(),
      expectedDurationDays: formData.expectedDurationDays,
      expectedRequiredPhrases: (formData.expectedRequiredPhrases || []).filter((p) => p.trim() !== ''),
      prohibitedPhrases: (formData.prohibitedPhrases || []).filter((p) => p.trim() !== ''),
      expectedCitations: (formData.expectedCitations || []).filter((p) => p.trim() !== ''),
      requireJson: Boolean(formData.requireJson),
      privacyPatternsCheck: Boolean(formData.privacyPatternsCheck),
      syntheticSampleOutput: (formData.syntheticSampleOutput || '').trim(),
      lastUpdated: new Date().toISOString(),
      notes: formData.notes || '',
    };

    onSaveCase(updated);
    cancelEdit();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cases, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `qualitylab-dataset-${datasetFingerprint}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportCases(parsed);
        } else {
          alert('Invalid dataset file format. Expected a JSON array of test cases.');
        }
      } catch (err) {
        alert('Failed to parse dataset JSON file: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Evaluation Dataset Editor
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage deterministic criteria, required/prohibited patterns, and synthetic replay samples.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Test Case</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            title="Download dataset as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            onClick={onResetSeedData}
            className="flex items-center gap-1.5 px-3 py-2 text-zinc-400 hover:text-amber-300 hover:bg-amber-950/30 text-xs rounded-lg border border-zinc-800 transition-colors cursor-pointer"
            title="Reset dataset back to standard 8 fictional cases"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset 8 Seed Cases</span>
          </button>
        </div>
      </div>

      {/* Dataset Fingerprint Card */}
      <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-cyan-400">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-200">Non-Cryptographic Dataset Fingerprint:</span>
              <code className="text-cyan-300 font-mono font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                {datasetFingerprint}
              </code>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
              Non-cryptographic content fingerprint of case contents and deterministic rules. Modifying any case alters this fingerprint to detect edits (does not claim cryptographic security).
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono text-zinc-400 text-xs font-semibold">
            {cases.length} Total Test Cases
          </span>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search test cases by name, query or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-sans text-zinc-200 focus:outline-hidden focus:border-cyan-500 placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200 px-3 py-2 rounded-lg focus:outline-hidden focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            <option value="Constraint Enforcement">Constraint Enforcement</option>
            <option value="Factual Adherence">Factual Adherence</option>
            <option value="Unanswerable / Refusal">Unanswerable / Refusal</option>
            <option value="Citations & Sourcing">Citations &amp; Sourcing</option>
            <option value="Structured Output">Structured Output</option>
            <option value="Safety & PII">Safety &amp; PII</option>
            <option value="SLA & Policy">SLA &amp; Policy</option>
          </select>
        </div>
      </div>

      {/* Test Cases Table / List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="dataset-table w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] font-mono bg-zinc-950/60">
                <th className="py-3 px-4">Test Case &amp; Severity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Target Query</th>
                <th className="py-3 px-4">Deterministic Rules</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-zinc-800/30 transition-colors">
                  {/* Title & Severity */}
                  <td data-label="Case and severity" className="py-3.5 px-4">
                    <div className="font-semibold text-zinc-100 flex items-center gap-2">
                      <span>{tc.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                          tc.severity === 'critical'
                            ? 'bg-red-950/60 border-red-800 text-red-300'
                            : tc.severity === 'high'
                            ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {tc.severity}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{tc.id}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td data-label="Category" className="py-3.5 px-4 font-mono text-zinc-400">
                    {tc.category}
                  </td>

                  {/* Question */}
                  <td data-label="Question and context" className="py-3.5 px-4 max-w-sm">
                    <p className="truncate text-zinc-300 font-sans">{tc.question}</p>
                    <p className="truncate text-zinc-500 text-[11px] font-sans mt-0.5">
                      Context: {tc.referenceContext}
                    </p>
                  </td>

                  {/* Deterministic Rules */}
                  <td data-label="Declared rules" className="py-3.5 px-4 font-mono text-[11px]">
                    <div className="space-y-0.5">
                      {tc.expectedDurationDays !== undefined && <div className="text-cyan-400">Day-duration contract: {tc.expectedDurationDays} days</div>}
                      {tc.expectedRequiredPhrases.length > 0 && (
                        <div className="text-emerald-400 truncate">
                          +{tc.expectedRequiredPhrases.length} Required: &quot;{tc.expectedRequiredPhrases[0]}&quot;
                        </div>
                      )}
                      {tc.prohibitedPhrases.length > 0 && (
                        <div className="text-red-400 truncate">
                          -{tc.prohibitedPhrases.length} Prohibited: &quot;{tc.prohibitedPhrases[0]}&quot;
                        </div>
                      )}
                      {tc.requireJson && (
                        <div className="text-cyan-400">JSON Syntax Enforced</div>
                      )}
                      {tc.privacyPatternsCheck && (
                        <div className="text-purple-400">PII Pattern Guard</div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td data-label="Actions" className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => startEdit(tc)}
                        className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                        title="Edit test case"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {deleteConfirmId === tc.id ? (
                        <div className="flex items-center gap-1 bg-red-950/80 border border-red-800 p-0.5 rounded">
                          <button
                            onClick={() => {
                              onDeleteCase(tc.id);
                              setDeleteConfirmId(null);
                            }}
                            className="text-[10px] font-bold text-red-200 px-1 hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(tc.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          title="Delete test case"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Test Case Modal */}
      {(editingCase || isCreatingNew) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-200">
            <button
              onClick={cancelEdit}
              className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              {isCreatingNew ? 'Create New QA Test Case' : `Edit Case: ${editingCase?.name}`}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mb-5">
              Specify deterministic evaluation boundaries and grounding reference context.
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-zinc-300 font-semibold">Test Case Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-sans"
                    placeholder="e.g. OmniFlow Trial Window"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold">Severity Level</label>
                  <select
                    value={formData.severity || 'medium'}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as SeverityLevel })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-mono"
                  >
                    <option value="critical">Critical (Blocks Release)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Category</label>
                <select
                  value={formData.category || 'Constraint Enforcement'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-mono"
                >
                  <option value="Constraint Enforcement">Constraint Enforcement</option>
                  <option value="Factual Adherence">Factual Adherence</option>
                  <option value="Unanswerable / Refusal">Unanswerable / Refusal</option>
                  <option value="Citations & Sourcing">Citations &amp; Sourcing</option>
                  <option value="Structured Output">Structured Output</option>
                  <option value="Safety & PII">Safety &amp; PII</option>
                  <option value="SLA & Policy">SLA &amp; Policy</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Target Question / User Query</label>
                <textarea
                  required
                  rows={2}
                  value={formData.question || ''}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-sans"
                  placeholder="Enter the question to ask the model..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold">Fictional Reference Grounding Paragraph</label>
                <textarea
                  rows={3}
                  value={formData.referenceContext || ''}
                  onChange={(e) => setFormData({ ...formData, referenceContext: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-sans"
                  placeholder="The ground truth reference context the model must adhere to..."
                />
              </div>

              {/* Deterministic checks configuration */}
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
                <div className="font-mono text-zinc-300 font-bold text-[11px] uppercase">
                  Deterministic Rule Rules
                </div>

                <div className="space-y-1.5 mb-3"><label className="text-xs text-zinc-300">Day-duration contract (optional)</label><input aria-label="Day-duration contract" type="number" min="1" max="36500" value={formData.expectedDurationDays ?? ''} onChange={e=>setFormData({...formData,expectedDurationDays:e.target.value ? Number(e.target.value) : undefined})} className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs" /><p className="text-xs text-zinc-400">Digit/day forms only. Rejects conflicting units and explicit negation. Not semantic verification.</p></div>
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">
                    Expected Required Phrases (comma-separated, case-insensitive)
                  </label>
                  <input
                    type="text"
                    value={(formData.expectedRequiredPhrases || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedRequiredPhrases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    placeholder="14-day, no credit card, 23:59 UTC"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">
                    Prohibited Forbidden Phrases (comma-separated, case-insensitive)
                  </label>
                  <input
                    type="text"
                    value={(formData.prohibitedPhrases || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        prohibitedPhrases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    placeholder="30 days, free forever, credit card required"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">
                    Expected Citation Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(formData.expectedCitations || []).join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedCitations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 font-mono text-xs focus:outline-hidden focus:border-cyan-500"
                    placeholder="[DOC-14], [SEC-9]"
                  />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.requireJson)}
                      onChange={(e) => setFormData({ ...formData, requireJson: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-zinc-300 font-mono text-[11px]">Require Valid JSON Output</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.privacyPatternsCheck)}
                      onChange={(e) => setFormData({ ...formData, privacyPatternsCheck: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-zinc-300 font-mono text-[11px]">Enforce PII &amp; Secret Regex Guard</span>
                  </label>
                </div>
              </div>

              {/* Synthetic Sample Output for Offline / Sample Replay */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-semibold">
                    Saved Synthetic Sample Output (Labeled as Synthetic)
                  </label>
                  <span className="text-[10px] font-mono text-purple-300 uppercase">
                    Synthetic Fixture
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={formData.syntheticSampleOutput || ''}
                  onChange={(e) => setFormData({ ...formData, syntheticSampleOutput: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-hidden focus:border-cyan-500 font-mono text-xs"
                  placeholder="Pre-computed synthetic candidate response for sample replay runs..."
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Save Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
