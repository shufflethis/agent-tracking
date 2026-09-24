import type { ScanJob } from "./db";

type Labels = { notScanned: string; scanScheduled: string; scanPending: string; scanRunning: string; scanFailed: string; scanDisabled: string; scanUnscheduled: string; scanSucceeded: string };

/** A 24-hour promise appears only for a stored due job and a fresh cron heartbeat. */
export function scanStatusText(job: ScanJob | null, labels: Labels, now = Date.now()): string {
  if (!job) return labels.notScanned;
  switch (job.status) {
    case "scheduled": return job.schedulerFresh && job.dueAt !== null && job.dueAt <= now + 86_400_000 ? labels.scanScheduled : labels.scanPending;
    case "running": return labels.scanRunning;
    case "success": return labels.scanSucceeded;
    case "failed": return labels.scanFailed;
    case "disabled": return labels.scanDisabled;
    case "unscheduled": return labels.scanUnscheduled;
  }
}
