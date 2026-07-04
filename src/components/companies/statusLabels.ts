import type { CompanyStatus } from "@/types";

/** Human-readable labels for the relationship statuses (FR-005). */
export const STATUS_LABELS: Record<CompanyStatus, string> = {
  lead: "Lead",
  in_progress: "In progress",
  negotiating: "Negotiating",
  investor: "Investor",
  inactive: "Inactive",
};
