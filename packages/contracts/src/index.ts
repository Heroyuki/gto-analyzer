/** docs/architecture/DESIGN.md §8。遷移の可否は実装時に別途検証する。 */
export type UploadStatus =
  | "PENDING_UPLOAD"
  | "QUEUED"
  | "PARSING"
  | "READY"
  | "PARTIAL"
  | "FAILED"
  | "DELETING"
  | "DELETED";

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

/** docs/architecture/DESIGN.md §10。初期版は solver_verified を許容しない。 */
export type ReviewEvidenceKind = "observed" | "calculated" | "inferred";
