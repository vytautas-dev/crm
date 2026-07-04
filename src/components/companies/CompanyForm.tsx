import React, { useState } from "react";
import { Building2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerError } from "@/components/auth/ServerError";
import { COMPANY_STATUSES, type Company, type CompanyStatus } from "@/types";
import { STATUS_LABELS } from "./statusLabels";

export interface CompanyFormValues {
  name: string;
  status: CompanyStatus;
}

interface CompanyFormProps {
  /** When present, the form edits this company; otherwise it creates a new one. */
  initial?: Company | null;
  /** Persists the values. May throw — the message is shown inline. */
  onSubmit: (values: CompanyFormValues) => Promise<void>;
  onCancel: () => void;
}

const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 pl-10 text-white placeholder-white/40 transition-colors focus:ring-2 focus:ring-purple-400 focus:outline-none";

/** Shared add/edit form for a company (name + relationship status). */
export function CompanyForm({ initial, onSubmit, onCancel }: CompanyFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [status, setStatus] = useState<CompanyStatus>(initial ? (initial.status as CompanyStatus) : "lead");
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    setServerError(null);
    setPending(true);
    try {
      await onSubmit({ name: trimmed, status });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="company-name" className="mb-1 block text-sm text-blue-100/80">
          Name
        </label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40">
            <Building2 className="size-4" />
          </span>
          <input
            id="company-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Acme Inc."
            className={inputClass}
            autoFocus
          />
        </div>
        {nameError && <p className="mt-1 text-xs text-red-300">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="company-status" className="mb-1 block text-sm text-blue-100/80">
          Status
        </label>
        <select
          id="company-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CompanyStatus);
          }}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-colors focus:ring-2 focus:ring-purple-400 focus:outline-none [&>option]:text-black"
        >
          {COMPANY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <ServerError message={serverError} />

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="bg-purple-600 text-white hover:bg-purple-500">
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-4" />
              {initial ? "Save changes" : "Add company"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
