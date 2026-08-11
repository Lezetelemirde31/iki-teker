"use client";

import { BadgeCheck, Ban, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  verifiedBadge: boolean;
  kind: string;
  role: string;
  status: string;
  memberSince: string;
  listings: number;
};

const ROLES = ["user", "support", "moderator", "admin", "superadmin"] as const;

const ROLE_LABEL: Record<string, string> = {
  user: "İstifadəçi",
  support: "Dəstək",
  moderator: "Moderator",
  admin: "Admin",
  superadmin: "Baş admin",
};

const STATUS: Record<string, { label: string; variant: "muted" | "rentalSoft" | "warning" }> = {
  active: { label: "Aktiv", variant: "rentalSoft" },
  suspended: { label: "Dayandırılıb", variant: "warning" },
  banned: { label: "Bloklanıb", variant: "warning" },
};

/**
 * The account list and what can be done to one.
 *
 * Nothing deletes. A stopped account keeps its listings, its bookings and the
 * other half of every conversation it was in — the ban is a state, and a state
 * can be wrong. Reinstating is one tap; undeleting is not a thing.
 *
 * The role selector only appears for somebody who may grant roles, and never
 * on your own row: locking yourself out of the panel is the one mistake here
 * that cannot be undone from inside it.
 */
export function UserRows({
  users,
  canManageRoles,
  meId,
}: {
  users: AdminUser[];
  canManageRoles: boolean;
  meId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, string>>({});

  async function act(id: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(id);
    setFailed((all) => ({ ...all, [id]: "" }));

    const response = await fetch(`/api/admin/users/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      router.refresh();
    } else {
      const data = await response.json().catch(() => null);
      const message =
        data?.error === "self"
          ? "Öz hesabınıza tətbiq edilmir."
          : data?.error === "lastSuperadmin"
            ? "Son baş admini endirmək olmaz."
            : "Alınmadı.";
      setFailed((all) => ({ ...all, [id]: message }));
    }
    setBusy(null);
  }

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] text-sm">
          <thead className="border-border text-subtle-foreground border-b text-left">
            <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:tracking-[0.08em] [&>th]:uppercase">
              <th>Ad</th>
              <th>Əlaqə</th>
              <th>Qeydiyyat</th>
              <th>Elan</th>
              <th>Rol</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {users.map((user) => {
              const self = user.id === meId;
              const stopped = user.status !== "active";

              return (
                <tr
                  key={user.id}
                  className={cn("[&>td]:px-4 [&>td]:py-2.5", stopped && "opacity-70")}
                >
                  <td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{user.name}</span>
                      {user.verifiedBadge && (
                        <BadgeCheck className="text-rental size-3.5 shrink-0" strokeWidth={2.4} />
                      )}
                      {self && (
                        <Badge variant="muted" size="md">
                          siz
                        </Badge>
                      )}
                    </div>
                    <span className="text-subtle-foreground text-[0.625rem]">{user.id}</span>
                  </td>

                  <td className="whitespace-nowrap">
                    {user.email && <div className="text-xs">{user.email}</div>}
                    {user.phone && (
                      <div className="tabular text-xs">
                        {user.phone}
                        {!user.phoneVerified && (
                          <span className="text-subtle-foreground"> · təsdiqsiz</span>
                        )}
                      </div>
                    )}
                    {!user.email && !user.phone && (
                      <span className="text-subtle-foreground text-xs">—</span>
                    )}
                  </td>

                  <td className="tabular whitespace-nowrap text-xs">
                    {user.memberSince.slice(0, 10)}
                  </td>

                  <td className="tabular">{user.listings}</td>

                  <td>
                    {canManageRoles && !self ? (
                      <select
                        value={user.role}
                        disabled={busy === user.id}
                        onChange={(event) => act(user.id, { role: event.target.value })}
                        className="bg-surface-2 border-border rounded-lg border px-2 py-1 text-xs outline-none"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="muted" size="md">
                        {ROLE_LABEL[user.role] ?? user.role}
                      </Badge>
                    )}
                  </td>

                  <td>
                    <Badge variant={STATUS[user.status]?.variant ?? "muted"} size="md">
                      {STATUS[user.status]?.label ?? user.status}
                    </Badge>
                    {failed[user.id] && (
                      <p role="alert" className="text-destructive mt-1 text-[0.625rem]">
                        {failed[user.id]}
                      </p>
                    )}
                  </td>

                  <td>
                    {!self && (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === user.id}
                          onClick={() => act(user.id, { verified: !user.verifiedBadge })}
                        >
                          <BadgeCheck className="size-3.5" />
                          {user.verifiedBadge ? "Nişanı götür" : "Təsdiqlə"}
                        </Button>

                        {stopped ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === user.id}
                            onClick={() => act(user.id, { status: "active" })}
                          >
                            {busy === user.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3.5" />
                            )}
                            Aç
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy === user.id}
                            onClick={() => act(user.id, { status: "banned" })}
                          >
                            {busy === user.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Ban className="size-3.5" />
                            )}
                            Blokla
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
