"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StepStatus = "not-started" | "in-progress" | "done" | "blocked";

type OrientationStep = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  estMinutes: number;
  dueDate?: string;
  status: StepStatus;
};

function formatDate(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ORIENTATION_STORAGE_KEY = "so:orientation:demo:v1";

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        className="absolute inset-0 cursor-pointer bg-black/30"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#E9DDC8] bg-white shadow-xl outline-none flex flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#E9DDC8] bg-[#F7F0E4] p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Staff view</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#001e5a]">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition hover:bg-[#F7F0E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

const defaultSteps: OrientationStep[] = [
  {
    id: "profile",
    title: "Verify Student Profile",
    description: "Confirm contact info and preferred name.",
    required: true,
    estMinutes: 3,
    status: "done",
  },
  {
    id: "advisor",
    title: "Schedule Advisor Meeting",
    description: "Book time with an advisor to review plan and options.",
    required: true,
    estMinutes: 5,
    dueDate: "2026-08-15",
    status: "in-progress",
  },
  {
    id: "expectations",
    title: "Academic Expectations (Micro-module)",
    description: "Learn pacing and where to get help.",
    required: true,
    estMinutes: 8,
    dueDate: "2026-08-12",
    status: "not-started",
  },
  {
    id: "aid",
    title: "Financial Aid Confirmation",
    description: "Review aid status and missing docs.",
    required: true,
    estMinutes: 5,
    dueDate: "2026-08-10",
    status: "not-started",
  },
  {
    id: "register",
    title: "Register for Classes",
    description: "Finalize first-term schedule.",
    required: true,
    estMinutes: 12,
    dueDate: "2026-08-18",
    status: "not-started",
  },
  {
    id: "resources",
    title: "Explore Support Resources (Optional)",
    description: "Tutoring, tech help, accessibility services.",
    required: false,
    estMinutes: 6,
    status: "not-started",
  },
];

export default function StaffPortalPage() {
  const [steps, setSteps] = useState<OrientationStep[]>(defaultSteps);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [underReviewStepIds, setUnderReviewStepIds] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; dataUrl: string }>>({});
  const openStep = useMemo(() => steps.find((s) => s.id === openStepId) ?? null, [steps, openStepId]);

  const loadFromStorage = () => {
    try {
      const raw = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        updatedAt?: number;
        steps?: OrientationStep[];
        underReviewStepIds?: string[];
        uploadedFiles?: Record<string, { name: string; dataUrl: string }>;
      };
      if (Array.isArray(parsed.steps) && parsed.steps.length) setSteps(parsed.steps);
      if (typeof parsed.updatedAt === "number") setUpdatedAt(parsed.updatedAt);
      if (Array.isArray(parsed.underReviewStepIds)) setUnderReviewStepIds(parsed.underReviewStepIds);
      if (parsed.uploadedFiles && typeof parsed.uploadedFiles === "object") setUploadedFiles(parsed.uploadedFiles);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadFromStorage();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ORIENTATION_STORAGE_KEY) loadFromStorage();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function save(nextSteps: OrientationStep[]) {
    const payload = { updatedAt: Date.now(), steps: nextSteps };
    setSteps(nextSteps);
    setUpdatedAt(payload.updatedAt);
    try {
      const raw = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
      let toSave = payload as Record<string, unknown>;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            underReviewStepIds?: string[];
            uploadedFiles?: Record<string, { name: string; dataUrl: string }>;
          };
          if (Array.isArray(parsed.underReviewStepIds)) toSave.underReviewStepIds = parsed.underReviewStepIds;
          if (parsed.uploadedFiles && typeof parsed.uploadedFiles === "object") toSave.uploadedFiles = parsed.uploadedFiles;
        } catch {
          // ignore
        }
      }
      window.localStorage.setItem(ORIENTATION_STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }

  const requiredSteps = useMemo(() => steps.filter((s) => s.required), [steps]);
  const optionalSteps = useMemo(() => steps.filter((s) => !s.required), [steps]);
  const doneCount = useMemo(() => requiredSteps.filter((s) => s.status === "done").length, [requiredSteps]);
  const pct = useMemo(
    () => Math.round((doneCount / Math.max(1, requiredSteps.length)) * 100),
    [doneCount, requiredSteps.length]
  );

  return (
    <div className="min-h-screen bg-[#FFF8EB] px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <div className="text-sm text-[#667085]">Staff Portal / Orientation</div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#001e5a]">Orientation overview</h1>
              <p className="mt-2 max-w-2xl text-[#667085]">
                This page reads/writes the same local state as the Student Portal (demo sync via localStorage).
              </p>
            </div>

            <div className="rounded-2xl border border-[#E9DDC8] bg-white px-4 py-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Progress</div>
              <div className="mt-1 text-sm font-semibold text-[#243041]">
                {doneCount} of {requiredSteps.length} required steps complete
              </div>
              <div className="mt-2 h-2 w-56 rounded bg-[#F7F0E4]">
                <div className="h-2 rounded bg-[#d34508]" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs text-[#667085]">
                Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>
        </header>

        {/* Data visuals — synced with Student Portal via localStorage */}
        <section
          className="rounded-2xl border border-[#E9DDC8] bg-white p-6 shadow-sm"
          aria-label="Orientation analytics"
        >
          <h2 className="text-xl font-semibold text-[#001e5a]">Orientation insights</h2>
          <p className="mt-1 text-sm text-[#667085]">Visualizations driven by the same data as the Student Portal.</p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Completion donut */}
            <div className="rounded-xl border border-[#DDDDDD] bg-white p-5">
              <div className="text-sm font-semibold text-[#001e5a]">Required steps completion</div>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="relative flex h-28 w-28 flex-shrink-0 items-center justify-center">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E9DDC8"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#d34508"
                      strokeWidth="3"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeLinecap="round"
                      className="transition-[stroke-dasharray] duration-500"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-[#001e5a]">{pct}%</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#d34508]" aria-hidden />
                    <span className="text-[#243041]">Done: {doneCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#E9DDC8]" aria-hidden />
                    <span className="text-[#243041]">Remaining: {requiredSteps.length - doneCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status breakdown bar chart */}
            <div className="rounded-xl border border-[#DDDDDD] bg-white p-5">
              <div className="text-sm font-semibold text-[#001e5a]">Status breakdown (all steps)</div>
              <div className="mt-4 space-y-3">
                {(
                  [
                    { status: "done", label: "Done", color: "#22c55e" },
                    { status: "in-progress", label: "In progress", color: "#d34508" },
                    { status: "not-started", label: "Not started", color: "#94a3b8" },
                    { status: "blocked", label: "Blocked", color: "#ef4444" },
                  ] as const
                ).map(({ status, label, color }) => {
                  const count = steps.filter((s) => s.status === status).length;
                  const max = Math.max(...["done", "in-progress", "not-started", "blocked"].map((st) => steps.filter((s) => s.status === st).length), 1);
                  const widthPct = (count / max) * 100;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-[#667085]">{label}</span>
                      <div className="h-5 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-[#E9DDC8]">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${widthPct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-xs font-medium text-[#243041]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step-by-step progress bars */}
          <div className="mt-6 rounded-xl border border-[#DDDDDD] bg-white p-5">
            <div className="text-sm font-semibold text-[#001e5a]">Required steps by status</div>
            <div className="mt-4 space-y-2">
              {requiredSteps.map((s) => {
                const statusColors: Record<StepStatus, string> = {
                  done: "#22c55e",
                  "in-progress": "#d34508",
                  "not-started": "#94a3b8",
                  blocked: "#ef4444",
                };
                const pct =
                  s.status === "done" ? 100 : s.status === "in-progress" ? 50 : s.status === "blocked" ? 25 : 0;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 truncate text-xs text-[#243041] sm:w-48" title={s.title}>
                      {s.title}
                    </span>
                    <div className="h-4 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-[#E9DDC8]">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: statusColors[s.status],
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs capitalize text-[#667085]">{s.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9DDC8] bg-white p-6 shadow-sm" aria-label="Student steps">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#001e5a]">Steps (single student demo)</h2>
              <p className="mt-1 text-sm text-[#667085]">
                Change a status here, then refresh the Student Portal to see it update.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition hover:bg-[#F7F0E4]"
              >
                Open student portal
              </a>
              <button
                type="button"
                onClick={() => save(defaultSteps)}
                className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition hover:bg-[#F7F0E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
              >
                Reset demo data
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnderReviewStepIds((prev) => prev.filter((id) => id !== "expectations" && id !== "aid"));
                  setUploadedFiles((prev) => {
                    const next = { ...prev };
                    delete next.expectations;
                    delete next.aid;
                    return next;
                  });
                  try {
                    const raw = window.localStorage.getItem(ORIENTATION_STORAGE_KEY);
                    if (!raw) return;
                    const parsed = JSON.parse(raw) as Record<string, unknown>;
                    const nextUnder = (parsed.underReviewStepIds as string[] || []).filter((id) => id !== "expectations" && id !== "aid");
                    const nextFiles = { ...(parsed.uploadedFiles as Record<string, { name: string; dataUrl: string }> || {}) };
                    delete nextFiles.expectations;
                    delete nextFiles.aid;
                    window.localStorage.setItem(
                      ORIENTATION_STORAGE_KEY,
                      JSON.stringify({ ...parsed, underReviewStepIds: nextUnder, uploadedFiles: nextFiles })
                    );
                  } catch {
                    // ignore
                  }
                }}
                disabled={!underReviewStepIds.includes("expectations") && !uploadedFiles.expectations && !underReviewStepIds.includes("aid") && !uploadedFiles.aid}
                className="rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-[#243041] enabled:cursor-pointer enabled:hover:bg-[#F7F0E4]"
              >
                Reset uploads (for testing)
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {requiredSteps.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#DDDDDD] bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[#243041]">{s.title}</h3>
                    {s.dueDate ? (
                      <span className="text-xs text-[#667085]">Due {formatDate(s.dueDate)}</span>
                    ) : null}
                    <span className="rounded-full border border-[#DDDDDD] bg-white px-2 py-0.5 text-xs text-[#667085]">
                      Required
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#667085]">{s.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {s.id !== "advisor" && s.id !== "register" ? (
                    <button
                      type="button"
                      onClick={() => setOpenStepId(s.id)}
                      disabled={
                        s.id === "expectations"
                          ? !underReviewStepIds.includes("expectations")
                          : s.id === "aid"
                            ? !underReviewStepIds.includes("aid")
                            : false
                      }
                      className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition hover:bg-[#d34508] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-[#243041]"
                    >
                      Review
                    </button>
                  ) : null}
                  <label className="sr-only" htmlFor={`status-${s.id}`}>
                    Status for {s.title}
                  </label>
                  <select
                    id={`status-${s.id}`}
                    value={s.status}
                    onChange={(e) =>
                      save(steps.map((x) => (x.id === s.id ? { ...x, status: e.target.value as StepStatus } : x)))
                    }
                    className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm text-[#243041] outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
                  >
                    <option value="not-started">Not started</option>
                    <option value="in-progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Optional steps (collapsed) — same pattern as Student Portal */}
          <details className="mt-6 rounded-xl border border-[#DDDDDD] bg-[#F7F0E4] p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-[#001e5a]">
              Optional steps (recommended)
              <span className="ml-2 font-normal text-[#667085]">— click to expand</span>
            </summary>

            <div className="mt-4 space-y-3">
              {optionalSteps.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#DDDDDD] bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#243041]">{s.title}</h3>
                      <span className="rounded-full border border-[#DDDDDD] bg-white px-2 py-0.5 text-xs text-[#667085]">
                        Optional
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#667085]">{s.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenStepId(s.id)}
                      className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm font-semibold text-[#243041] transition hover:bg-[#d34508] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
                    >
                      Review
                    </button>
                    <label className="sr-only" htmlFor={`status-opt-${s.id}`}>
                      Status for {s.title}
                    </label>
                    <select
                      id={`status-opt-${s.id}`}
                      value={s.status}
                      onChange={(e) =>
                        save(steps.map((x) => (x.id === s.id ? { ...x, status: e.target.value as StepStatus } : x)))
                      }
                      className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm text-[#243041] outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
                    >
                      <option value="not-started">Not started</option>
                      <option value="in-progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>

      <Modal open={!!openStep} title={openStep?.title ?? "Step"} onClose={() => setOpenStepId(null)}>
        {openStep ? (
          <div className="space-y-4">
            {/* File preview for expectations / aid when student has uploaded */}
            {openStep.id === "expectations" && uploadedFiles.expectations ? (
              <div className="rounded-xl border border-[#DDDDDD] bg-white p-4">
                <div className="text-sm font-semibold text-[#001e5a]">Uploaded document</div>
                <p className="mt-1 text-sm text-[#667085]">{uploadedFiles.expectations.name}</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#DDDDDD] bg-white">
                  {uploadedFiles.expectations.dataUrl.startsWith("data:application/pdf") ? (
                    <iframe
                      src={uploadedFiles.expectations.dataUrl}
                      title="PDF preview"
                      className="min-h-[70vh] w-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6">
                      <p className="text-sm text-[#667085]">Preview not available for this format.</p>
                      <a
                        href={uploadedFiles.expectations.dataUrl}
                        download={uploadedFiles.expectations.name}
                        className="cursor-pointer rounded-lg bg-[#d34508] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#AF3A08]"
                      >
                        Download {uploadedFiles.expectations.name}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            {openStep.id === "aid" && uploadedFiles.aid ? (
              <div className="rounded-xl border border-[#DDDDDD] bg-white p-4">
                <div className="text-sm font-semibold text-[#001e5a]">Uploaded document</div>
                <p className="mt-1 text-sm text-[#667085]">{uploadedFiles.aid.name}</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#DDDDDD] bg-white">
                  {uploadedFiles.aid.dataUrl.startsWith("data:application/pdf") ? (
                    <iframe
                      src={uploadedFiles.aid.dataUrl}
                      title="PDF preview"
                      className="min-h-[70vh] w-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6">
                      <p className="text-sm text-[#667085]">Preview not available for this format.</p>
                      <a
                        href={uploadedFiles.aid.dataUrl}
                        download={uploadedFiles.aid.name}
                        className="cursor-pointer rounded-lg bg-[#d34508] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#AF3A08]"
                      >
                        Download {uploadedFiles.aid.name}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#DDDDDD] bg-white p-4">
              <div className="text-sm font-semibold text-[#001e5a]">Linked context (placeholder)</div>
              <dl className="mt-2 grid grid-cols-1 gap-2 text-sm text-[#667085] sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Student</dt>
                  <dd className="mt-1 text-[#243041]">Alex Student (demo)</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Cohort</dt>
                  <dd className="mt-1 text-[#243041]">Fall 2026</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Source system</dt>
                  <dd className="mt-1 text-[#243041]">SIS / CRM (placeholder)</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Last touched</dt>
                  <dd className="mt-1 text-[#243041]">—</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-[#DDDDDD] bg-white p-4">
              <div className="text-sm font-semibold text-[#001e5a]">Verification notes (placeholder)</div>
              <p className="mt-2 text-sm text-[#667085]">
                Add any confirmations, exceptions, or supporting links here (e.g., document IDs, email thread, case #).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DDDDDD] bg-white p-4">
              <div>
                <div className="text-sm font-semibold text-[#001e5a]">Status</div>
                <div className="mt-1 text-sm text-[#667085]">Update the student-facing status for this step.</div>
              </div>

              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`modal-status-${openStep.id}`}>
                  Status for {openStep.title}
                </label>
                <select
                  id={`modal-status-${openStep.id}`}
                  value={openStep.status}
                  onChange={(e) =>
                    save(steps.map((x) => (x.id === openStep.id ? { ...x, status: e.target.value as StepStatus } : x)))
                  }
                  className="cursor-pointer rounded-lg border border-[#DDDDDD] bg-white px-3 py-2 text-sm text-[#243041] outline-none focus-visible:ring-2 focus-visible:ring-[#d34508] focus-visible:ring-offset-2"
                >
                  <option value="not-started">Not started</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

