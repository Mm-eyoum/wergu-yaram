import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { reportError } from "@/lib/errorReporting";

/** A create / update / delete / publish action recorded in the audit trail. */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "status_change"
  | "role_change"
  | "approve"
  | "reject";

export interface AuditChange {
  /** Per-field before/after, e.g. `{ status: { old: "draft", new: "published" } }`. */
  [field: string]: { old: unknown; new: unknown };
}

export interface AuditEntry {
  id: string;
  actorUid: string;
  actorName: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceTitle?: string;
  changes?: AuditChange;
  createdAt: string | null;
}

export interface LogAuditInput {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  resourceTitle?: string;
  changes?: AuditChange;
}

/**
 * Append an immutable entry to `auditLogs`. Best-effort: an audit write must
 * never break the primary action, so failures are swallowed (the Firestore
 * rules make the collection append-only and admin-readable).
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  if (!db) return;
  const actor = auth?.currentUser;
  if (!actor) return;
  try {
    await addDoc(collection(db, "auditLogs"), {
      actorUid: actor.uid,
      actorName: actor.displayName ?? actor.email ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceTitle: input.resourceTitle ?? null,
      changes: input.changes ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Auditing is non-blocking — never surface to the user — but the failure
    // must not vanish: report it (console + sink) so a broken audit trail is
    // visible in monitoring.
    reportError(e, {
      scope: "audit.logAudit",
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
  }
}

export interface AuditFilter {
  actorUid?: string;
  resourceType?: string;
  action?: AuditAction;
  max?: number;
}

/** Read the audit trail (admin only — rules enforce). Most recent first. */
export async function fetchAuditLogs(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  if (!db) return [];
  const constraints = [];
  if (filter.actorUid) constraints.push(where("actorUid", "==", filter.actorUid));
  if (filter.resourceType) constraints.push(where("resourceType", "==", filter.resourceType));
  if (filter.action) constraints.push(where("action", "==", filter.action));
  constraints.push(orderBy("createdAt", "desc"), fbLimit(filter.max ?? 100));

  const snap = await getDocs(query(collection(db, "auditLogs"), ...constraints));
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.createdAt as { toDate?: () => Date } | null;
    return {
      id: d.id,
      actorUid: data.actorUid as string,
      actorName: (data.actorName as string | null) ?? null,
      action: data.action as AuditAction,
      resourceType: data.resourceType as string,
      resourceId: data.resourceId as string,
      resourceTitle: (data.resourceTitle as string | undefined) ?? undefined,
      changes: (data.changes as AuditChange | undefined) ?? undefined,
      createdAt: ts?.toDate ? ts.toDate().toISOString() : null,
    };
  });
}
