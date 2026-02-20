"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { User } from "../types/user";
import { useUsersColumns } from "../hooks/use-users-columns";

type UsersTableProps = {
  data: User[];
  onEdit: (user: User) => void;
};

export function UsersTable({ data, onEdit }: UsersTableProps) {
  const columns = useUsersColumns({ onEdit });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mt-2 w-full max-w-5xl overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/80">
      <table className="w-full min-w-245 text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-zinc-800">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 text-left font-medium">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-zinc-800/80 bg-zinc-900/60 last:border-0">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 text-zinc-100">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-zinc-400" colSpan={10}>
                Brak użytkowników
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}