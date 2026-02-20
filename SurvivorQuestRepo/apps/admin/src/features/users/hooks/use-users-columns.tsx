"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "../types/user";

type UseUsersColumnsProps = {
  onEdit: (user: User) => void;
};

export function useUsersColumns({ onEdit }: UseUsersColumnsProps) {
  return useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "photoUrl",
        header: "Zdjęcie",
        cell: ({ row }) => (
          <img
            src={row.original.photoUrl}
            alt={`Zdjęcie użytkownika ${row.original.email}`}
            className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
            loading="lazy"
          />
        ),
      },
      {
        accessorKey: "displayName",
        header: "Nazwa",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone",
        header: "Telefon",
        cell: ({ row }) => row.original.phone || "-",
      },
      {
        accessorKey: "role",
        header: "Rola",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;

          const statusClassName =
            status === "active"
              ? "bg-emerald-500/20 text-emerald-300"
              : status === "invited"
                ? "bg-sky-500/20 text-sky-300"
                : "bg-rose-500/20 text-rose-300";

          return (
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClassName}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Utworzono",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("pl-PL"),
      },
      {
        accessorKey: "lastLoginAt",
        header: "Ostatnie logowanie",
        cell: ({ row }) =>
          row.original.lastLoginAt ? new Date(row.original.lastLoginAt).toLocaleString("pl-PL") : "-",
      },
      {
        accessorKey: "updatedAt",
        header: "Zaktualizowano",
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString("pl-PL"),
      },
      {
        id: "actions",
        header: "Akcje",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-amber-400/70 hover:text-amber-300"
          >
            Edytuj
          </button>
        ),
      },
    ],
    [onEdit]
  );
}