import { notFound } from "next/navigation";

import { UserRows, type AdminUser } from "@/components/admin/user-rows";
import { allUsers } from "@/server/admin";
import { can, currentPrincipal } from "@/server/authorization";

/**
 * Every account, newest first.
 *
 * Search and the two filters run on the server through the URL, so a filtered
 * list is a link somebody can send or come back to — and so a thousand accounts
 * are never all shipped to the browser to be filtered there.
 */
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
}) {
  if (!(await can("viewPanel"))) notFound();

  const { q, status, role } = await searchParams;
  const [rows, principal, manageRoles] = await Promise.all([
    allUsers({
      ...(q ? { search: q } : {}),
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
    }),
    currentPrincipal(),
    can("manageRoles"),
  ]);

  const stopped = rows.filter((row) => row.status !== "active").length;
  const staff = rows.filter((row) => row.role !== "user").length;

  const users: AdminUser[] = rows;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold">İstifadəçilər</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {rows.length === 0
            ? "Uyğun hesab yoxdur."
            : `${rows.length} hesab${stopped > 0 ? ` · ${stopped} bloklu` : ""}${staff > 0 ? ` · ${staff} səlahiyyətli` : ""}`}
        </p>
      </div>

      {/* A plain GET form: the filter ends up in the address bar, so it can be
          bookmarked, shared, and reloaded without vanishing. */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ad, email, nömrə və ya id"
          className="bg-card border-border w-64 rounded-lg border px-3 py-2 text-sm outline-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="bg-card border-border rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="">Bütün statuslar</option>
          <option value="active">Aktiv</option>
          <option value="suspended">Dayandırılıb</option>
          <option value="banned">Bloklanıb</option>
        </select>
        <select
          name="role"
          defaultValue={role ?? ""}
          className="bg-card border-border rounded-lg border px-3 py-2 text-sm outline-none"
        >
          <option value="">Bütün rollar</option>
          <option value="user">İstifadəçi</option>
          <option value="support">Dəstək</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Baş admin</option>
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Axtar
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="bg-card border-border text-subtle-foreground rounded-xl border px-4 py-10 text-center text-sm">
          Bu şərtlərə uyğun hesab tapılmadı.
        </p>
      ) : (
        <UserRows users={users} canManageRoles={manageRoles} meId={principal.id} />
      )}
    </div>
  );
}
