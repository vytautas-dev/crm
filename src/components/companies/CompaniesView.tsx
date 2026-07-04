import { useState } from "react";
import { Building2, Pencil, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerError } from "@/components/auth/ServerError";
import { COMPANY_STATUSES, type Company, type CompanyStatus } from "@/types";
import { Modal } from "./Modal";
import { CompanyForm, type CompanyFormValues } from "./CompanyForm";
import { STATUS_LABELS } from "./statusLabels";

interface Props {
  initialCompanies: Company[];
}

/** Parse a JSON response, throwing the API's `{ error }` message on failure. */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

/**
 * Interactive company list: add/edit via a shared modal form, change status
 * inline (optimistic with rollback), and archive (soft-delete). All mutations
 * go through the Phase 2 JSON API; RLS keeps rows scoped to the current user.
 */
export default function CompaniesView({ initialCompanies }: Props) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(company: Company) {
    setEditing(company);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(values: CompanyFormValues) {
    setError(null);
    if (editing) {
      const { company } = await apiFetch<{ company: Company }>(`/api/companies/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? company : c)));
    } else {
      const { company } = await apiFetch<{ company: Company }>("/api/companies", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setCompanies((prev) => [company, ...prev]);
    }
    closeModal();
  }

  async function handleStatusChange(company: Company, status: CompanyStatus) {
    const previous = companies;
    setError(null);
    // Optimistic update.
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, status } : c)));
    try {
      await apiFetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setCompanies(previous); // rollback
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleArchive(company: Company) {
    setBusyId(company.id);
    setError(null);
    try {
      await apiFetch(`/api/companies/${company.id}`, { method: "DELETE" });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive company");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="text-white">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-2xl font-bold text-transparent">
          Companies
        </h1>
        <Button onClick={openAdd} className="bg-purple-600 text-white hover:bg-purple-500">
          <Plus className="size-4" />
          Add company
        </Button>
      </div>

      <ServerError message={error} />

      {companies.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
          <Building2 className="mx-auto mb-3 size-8 text-white/30" />
          <p className="text-blue-100/70">No companies yet.</p>
          <p className="mt-1 text-sm text-blue-100/40">Add your first company to get started.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {companies.map((company) => {
            const busy = busyId === company.id;
            return (
              <li
                key={company.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="truncate font-medium">{company.name}</span>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${company.id}`}>
                    Status for {company.name}
                  </label>
                  <select
                    id={`status-${company.id}`}
                    value={company.status}
                    disabled={busy}
                    onChange={(e) => {
                      void handleStatusChange(company, e.target.value as CompanyStatus);
                    }}
                    className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white transition-colors focus:ring-2 focus:ring-purple-400 focus:outline-none disabled:opacity-50 [&>option]:text-black"
                  >
                    {COMPANY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${company.name}`}
                    onClick={() => {
                      openEdit(company);
                    }}
                    disabled={busy}
                    className="text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Archive ${company.name}`}
                    onClick={() => handleArchive(company)}
                    disabled={busy}
                    className="text-white/70 hover:bg-red-500/20 hover:text-red-200"
                  >
                    <Archive className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modalOpen && (
        <Modal title={editing ? "Edit company" : "Add company"} onClose={closeModal}>
          <CompanyForm initial={editing} onSubmit={handleSubmit} onCancel={closeModal} />
        </Modal>
      )}
    </div>
  );
}
