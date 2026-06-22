"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { MoreHorizontal, Eye, Pencil, Archive, ArchiveRestore, Trash2, Undo2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { CsvExportButton } from "@/components/health/export-buttons";
import { StudentsCsvImport } from "@/components/students/students-csv-import";
import type { StudentListRow } from "@/lib/queries/students";

export type StudentRow = StudentListRow;

const riskLabel: Record<string, string> = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" };
const riskVariant: Record<string, "success" | "secondary" | "destructive"> = {
  low: "success",
  medium: "secondary",
  high: "destructive",
};

export function StudentsTable({ data, schoolId }: { data: StudentRow[]; schoolId?: string }) {
  const [filter, setFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const router = useRouter();

  const handleArchiveToggle = useCallback(
    async (student: StudentRow) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("students")
        .update({ is_archived: !student.is_archived })
        .eq("id", student.id);
      if (error) {
        toast.error("ดำเนินการไม่สำเร็จ", { description: error.message });
        return;
      }
      toast.success(student.is_archived ? "กู้คืนนักเรียนแล้ว" : "เก็บถาวรนักเรียนแล้ว");
      router.refresh();
    },
    [router]
  );

  const handleDelete = useCallback(
    async (student: StudentRow) => {
      if (!window.confirm(`ยืนยันการลบ "${student.full_name}" ออกจากระบบ? (สามารถกู้คืนได้ภายหลัง)`)) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("students")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", student.id);
      if (error) {
        toast.error("ลบไม่สำเร็จ", { description: error.message });
        return;
      }
      void logAudit({
        schoolId: student.school_id,
        action: "delete",
        entityTable: "students",
        entityId: student.id,
        metadata: { student_code: student.student_code, full_name: student.full_name },
      });
      toast.success("ลบนักเรียนแล้ว (ย้ายไปถังขยะ)");
      router.refresh();
    },
    [router]
  );

  const handleRestore = useCallback(
    async (student: StudentRow) => {
      const supabase = createClient();
      const { error } = await supabase.from("students").update({ deleted_at: null }).eq("id", student.id);
      if (error) {
        toast.error("กู้คืนไม่สำเร็จ", { description: error.message });
        return;
      }
      void logAudit({
        schoolId: student.school_id,
        action: "restore",
        entityTable: "students",
        entityId: student.id,
        metadata: { student_code: student.student_code, full_name: student.full_name },
      });
      toast.success("กู้คืนนักเรียนแล้ว");
      router.refresh();
    },
    [router]
  );

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  );
  const selectedStudents = useMemo(
    () => data.filter((s) => rowSelection[s.id]),
    [data, rowSelection]
  );

  const handleBulkArchive = useCallback(
    async (archive: boolean) => {
      if (selectedIds.length === 0) return;
      setBulkBusy(true);
      const supabase = createClient();
      const { error } = await supabase.from("students").update({ is_archived: archive }).in("id", selectedIds);
      setBulkBusy(false);
      if (error) {
        toast.error("ดำเนินการไม่สำเร็จ", { description: error.message });
        return;
      }
      toast.success(archive ? `เก็บถาวร ${selectedIds.length} รายการแล้ว` : `กู้คืน ${selectedIds.length} รายการแล้ว`);
      setRowSelection({});
      router.refresh();
    },
    [selectedIds, router]
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`ยืนยันการลบนักเรียนที่เลือก ${selectedIds.length} คน? (สามารถกู้คืนได้ภายหลัง)`)) return;
    setBulkBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast.error("ลบไม่สำเร็จ", { description: error.message });
      return;
    }
    for (const student of selectedStudents) {
      void logAudit({
        schoolId: student.school_id,
        action: "delete",
        entityTable: "students",
        entityId: student.id,
        metadata: { student_code: student.student_code, full_name: student.full_name, bulk: true },
      });
    }
    toast.success(`ลบนักเรียน ${selectedIds.length} คนแล้ว (ย้ายไปถังขยะ)`);
    setRowSelection({});
    router.refresh();
  }, [selectedIds, selectedStudents, router]);

  const columns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        id: "photo",
        header: "",
        cell: ({ row }) => (
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.original.profile_picture_url ?? row.original.avatar_url ?? undefined} />
            <AvatarFallback>{row.original.full_name?.[0] ?? "น"}</AvatarFallback>
          </Avatar>
        ),
      },
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
      { accessorKey: "citizen_id", header: "เลขประจำตัวประชาชน", cell: ({ row }) => row.original.citizen_id ?? "-" },
      { accessorKey: "grade", header: "ระดับชั้น", cell: ({ row }) => row.original.grade ?? "-" },
      { accessorKey: "classroom", header: "ห้องเรียน", cell: ({ row }) => row.original.classroom ?? "-" },
      {
        accessorKey: "gender",
        header: "เพศ",
        cell: ({ row }) =>
          row.original.gender === "male" ? "ชาย" : row.original.gender === "female" ? "หญิง" : "-",
      },
      {
        accessorKey: "risk_level",
        header: "ระดับความเสี่ยง",
        cell: ({ row }) =>
          row.original.risk_level ? (
            <Badge variant={riskVariant[row.original.risk_level]}>{riskLabel[row.original.risk_level]}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "is_archived",
        header: "สถานะ",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.deleted_at && <Badge variant="destructive">ถังขยะ</Badge>}
            <Badge variant={row.original.is_archived ? "outline" : row.original.is_active ? "secondary" : "outline"}>
              {row.original.is_archived ? "เก็บถาวร" : row.original.is_active ? "กำลังศึกษา" : "ไม่ได้ศึกษา"}
            </Badge>
          </div>
        ),
      },
      {
        id: "actions",
        header: "การจัดการ",
        cell: ({ row }) => {
          const student = row.original;
          if (student.deleted_at) {
            return (
              <Button variant="ghost" size="icon" onClick={() => handleRestore(student)} title="กู้คืน">
                <Undo2 className="h-4 w-4" />
              </Button>
            );
          }
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/students/${student.id}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <StudentFormDialog
                schoolId={student.school_id}
                trigger={
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
                initialValues={{ id: student.id, student_code: student.student_code, full_name: student.full_name }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleArchiveToggle(student)}>
                    {student.is_archived ? (
                      <ArchiveRestore className="mr-2 h-4 w-4" />
                    ) : (
                      <Archive className="mr-2 h-4 w-4" />
                    )}
                    {student.is_archived ? "กู้คืน" : "เก็บถาวร"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(student)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    ลบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleArchiveToggle, handleDelete, handleRestore]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter: filter, rowSelection },
    onGlobalFilterChange: setFilter,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const exportRows = useMemo(
    () =>
      data.map((s) => [
        s.student_code,
        s.full_name,
        s.nickname ?? "",
        s.citizen_id ?? "",
        s.gender ?? "",
        s.grade ?? "",
        s.classroom ?? "",
        s.risk_level ?? "",
        s.is_archived ? "archived" : "active",
      ]),
    [data]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="ค้นหานักเรียน..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <CsvExportButton
            filename="students.csv"
            headers={["รหัสนักเรียน", "ชื่อ-นามสกุล", "ชื่อเล่น", "เลขประจำตัวประชาชน", "เพศ", "ระดับชั้น", "ห้องเรียน", "ความเสี่ยง", "สถานะ"]}
            rows={exportRows}
            label="ส่งออก CSV"
          />
          {schoolId && <StudentsCsvImport schoolId={schoolId} />}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <span className="text-sm text-muted-foreground">เลือกแล้ว {selectedIds.length} รายการ</span>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkArchive(true)}>
            <Archive className="mr-2 h-4 w-4" />
            เก็บถาวร
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkArchive(false)}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            กู้คืนจากถาวร
          </Button>
          <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            ลบที่เลือก
          </Button>
        </div>
      )}

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
