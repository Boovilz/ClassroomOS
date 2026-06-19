"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type StudentRow = {
  id: string;
  student_code: string;
  full_name: string;
  nickname: string | null;
  gender: string | null;
  is_active: boolean;
};

export function StudentsTable({ data }: { data: StudentRow[] }) {
  const [filter, setFilter] = useState("");

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      { accessorKey: "student_code", header: "รหัสนักเรียน" },
      {
        accessorKey: "full_name",
        header: "ชื่อ-นามสกุล",
        cell: ({ row }) => (
          <Link href={`/students/${row.original.id}`} className="font-medium text-primary hover:underline">
            {row.original.full_name}
          </Link>
        ),
      },
      { accessorKey: "nickname", header: "ชื่อเล่น" },
      {
        accessorKey: "gender",
        header: "เพศ",
        cell: ({ row }) =>
          row.original.gender === "male" ? "ชาย" : row.original.gender === "female" ? "หญิง" : "-",
      },
      {
        accessorKey: "is_active",
        header: "สถานะ",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "secondary" : "outline"}>
            {row.original.is_active ? "กำลังศึกษา" : "ไม่ได้ศึกษา"}
          </Badge>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
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
                  ไม่พบข้อมูลนักเรียน
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
