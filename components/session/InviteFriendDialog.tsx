"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type InviteFriendDialogProps = {
  groupId: string;
  disabled?: boolean;
  onInvited?: (email: string) => void;
};

function isValidEmail(value: string): boolean {
  return value.includes("@") && value.includes(".");
}

export function InviteFriendDialog({
  groupId,
  disabled = false,
  onInvited
}: InviteFriendDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  function handleInvite() {
    if (disabled) {
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid guest email.");
      return;
    }

    setError(null);
    const inviteUrl = `/group/${groupId}?invite=${encodeURIComponent(normalizedEmail)}`;
    window.open(inviteUrl, "_blank", "noopener,noreferrer");
    onInvited?.(normalizedEmail);
    setEmail("");
  }

  return (
    <section className="rounded-xl border border-brand-dark/20 bg-background p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-dark">Invite a friend</h3>
      <p className="mt-1 text-xs text-brand-dark/70">
        Add a guest email and open a simulated invite tab.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="invite-email">
          Guest email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="friend@example.com"
          className="h-10 w-full rounded-md border border-brand-dark/30 bg-background px-3 text-sm text-brand-dark outline-none ring-0 focus:border-brand-primary"
          disabled={disabled}
        />
        <Button onClick={handleInvite} type="button" disabled={disabled}>
          Open Invite Tab
        </Button>
      </div>

      {error ? <p className="mt-2 text-xs text-brand-primary">{error}</p> : null}
      {disabled ? (
        <p className="mt-2 text-xs text-brand-dark/70">
          Invite is disabled because this group already has 3 participants.
        </p>
      ) : null}
    </section>
  );
}
