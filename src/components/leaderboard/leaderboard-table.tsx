"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type LeaderboardRow = {
  id: string;
  student_code: string;
  full_name: string;
  classroom: string | null;
  level: number;
  xp: number;
  coins: number;
  avatar_url?: string | null;
  profile_picture_url?: string | null;
};

export function LeaderboardTable({ data }: { data: LeaderboardRow[] }) {
  const [filter, setFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "xp", desc: true }]);

  const columns = useMemo<ColumnDef<LeaderboardRow>[]>(
    () => [
      {
        id: "rank",
        header: "อันดับ",
        cell: ({ row }) => <span className="font-semibold">#{row.index + 1}</span>,
      },
      {
        accessorKey: "full_name",
        header: "ชื่อ-นามสกุล",
        cell: ({ row }) => (
          <Link href={`/students/${row.original.id}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
            <Avatar className="h-7 w-7">
              <AvatarImage src={row.original.profile_picture_url ?? row.original.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{row.original.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            {row.original.full_name}
          </Link>
        ),
      },
      { accessorKey: "student_code", header: "รหัสนักเรียน" },
      { accessorKey: "classroom", header: "ห้องเรียน" },
      {
        accessorKey: "level",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={() => column.toggleSorting()}>
            เลเวล <ArrowUpDown className="h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <Badge variant="outline">Lv.{row.original.level}</Badge>,
      },
      {
        accessorKey: "xp",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={() => column.toggleSorting()}>
            XP <ArrowUpDown className="h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold text-primary">{row.original.xp.toLocaleString()}</span>,
      },
      {
        accessorKey: "coins",
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="gap-1 px-0" onClick={() => column.toggleSorting()}>
            เหรียญ <ArrowUpDown className="h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span>{row.original.coins.toLocaleString()}</span>,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: filter, sorting },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="ค้นหานักเรียน..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  ไม่พบข้อมูล
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
