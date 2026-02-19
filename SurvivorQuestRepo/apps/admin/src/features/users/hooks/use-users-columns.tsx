"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "../types/user";

export function useUsersColumns() {
  return useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "role",
        header: "Rola",
      },
      {
        accessorKey: "createdAt",
        header: "Utworzono",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("pl-PL"),
      },
    ],
    []
  );
}