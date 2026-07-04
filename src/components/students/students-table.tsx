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
import { MoreHorizontal, Eye, Pencil, Archive, ArchiveRestore, Trash2, Undo2, QrCode, ArrowUpCircle, FolderInput, Link2, FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { CsvExportButton } from "@/components/health/export-buttons";
import { StudentsCsvImport } from "@/components/students/students-csv-import";
import { QrCardsGrid } from "@/app/(dashboard)/attendance/qr/qr-cards-grid";
import type { StudentListRow } from "@/lib/queries/students";

// Thai grade-progression map, e.g. ป.1 -> ป.2 ... ป.6 -> ม.1, used by "Bulk
// Promote Grade". Matches the free-text `grade` string format already used
// across the codebase (see student-form-dialog.tsx placeholder "ป.4").
const GRADE_PROGRESSION: Record<string, string> = {
  "ป.1": "ป.2",
  "ป.2": "ป.3",
  "ป.3": "ป.4",
  "ป.4": "ป.5",
  "ป.5": "ป.6",
  "ป.6": "ม.1",
  "ม.1": "ม.2",
  "ม.2": "ม.3",
  "ม.3": "ม.4",
  "ม.4": "ม.5",
  "ม.5": "ม.6",
};

export type StudentRow = StudentListRow;

function exportToExcel(rows: StudentRow[], filename = "รายชื่อนักเรียน.xlsx") {
  const data = rows.map((r, i) => ({
    "ลำดับ": i + 1,
    "รหัสนักเรียน": r.student_code,
    "ชื่อ-สกุล": r.full_name,
    "ชั้น": r.grade ?? "",
    "ห้อง": r.classroom ?? "",
    "เพศ": r.gender === "male" ? "ชาย" : r.gender === "female" ? "หญิง" : "อื่นๆ",
    "วันเกิด": r.birth_date ?? "",
    "อัตราเข้าเรียน": r.attendanceRate != null ? r.attendanceRate + "%" : "",
    "GPA": r.gpa ?? "",
    "สถานะ": r.is_archived ? "ไม่ใช้งาน" : "ปกติ",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "นักเรียน");
  XLSX.writeFile(wb, filename);
}

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
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdateGrade, setBulkUpdateGrade] = useState("");
  const [bulkUpdateClassroom, setBulkUpdateClassroom] = useState("");
  const [bulkUpdateRisk, setBulkUpdateRisk] = useState<string>("");
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveClassroom, setBulkMoveClassroom] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
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

  const handleBulkRestore = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("students").update({ deleted_at: null }).in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast.error("กู้คืนไม่สำเร็จ", { description: error.message });
      return;
    }
    for (const student of selectedStudents) {
      void logAudit({
        schoolId: student.school_id,
        action: "restore",
        entityTable: "students",
        entityId: student.id,
        metadata: { student_code: student.student_code, full_name: student.full_name, bulk: true },
      });
    }
    toast.success(`กู้คืนนักเรียน ${selectedIds.length} คนแล้ว`);
    setRowSelection({});
    router.refresh();
  }, [selectedIds, selectedStudents, router]);

  const handleBulkUpdate = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const fields: { grade?: string; classroom?: string; risk_level?: "low" | "medium" | "high" } = {};
    if (bulkUpdateGrade.trim()) fields.grade = bulkUpdateGrade.trim();
    if (bulkUpdateClassroom.trim()) fields.classroom = bulkUpdateClassroom.trim();
    if (bulkUpdateRisk) fields.risk_level = bulkUpdateRisk as "low" | "medium" | "high";
    if (Object.keys(fields).length === 0) {
      toast.error("กรุณากรอกข้อมูลที่ต้องการอัปเดตอย่างน้อย 1 ฟิลด์");
      return;
    }
    setBulkBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("students").update(fields).in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast.error("อัปเดตไม่สำเร็จ", { description: error.message });
      return;
    }
    for (const student of selectedStudents) {
      void logAudit({
        schoolId: student.school_id,
        action: "update",
        entityTable: "students",
        entityId: student.id,
        metadata: { ...fields, bulk: true },
      });
    }
    toast.success(`อัปเดต ${selectedIds.length} รายการแล้ว`);
    setBulkUpdateOpen(false);
    setBulkUpdateGrade("");
    setBulkUpdateClassroom("");
    setBulkUpdateRisk("");
    setRowSelection({});
    router.refresh();
  }, [selectedIds, selectedStudents, bulkUpdateGrade, bulkUpdateClassroom, bulkUpdateRisk, router]);

  const handleBulkMoveClassroom = useCallback(async () => {
    if (selectedIds.length === 0 || !bulkMoveClassroom.trim()) return;
    setBulkBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("students").update({ classroom: bulkMoveClassroom.trim() }).in("id", selectedIds);
    setBulkBusy(false);
    if (error) {
      toast.error("ย้ายห้องเรียนไม่สำเร็จ", { description: error.message });
      return;
    }
    for (const student of selectedStudents) {
      void logAudit({
        schoolId: student.school_id,
        action: "update",
        entityTable: "students",
        entityId: student.id,
        metadata: { classroom: bulkMoveClassroom.trim(), bulk: true, move_classroom: true },
      });
    }
    toast.success(`ย้ายห้องเรียน ${selectedIds.length} คนแล้ว`);
    setBulkMoveOpen(false);
    setBulkMoveClassroom("");
    setRowSelection({});
    router.refresh();
  }, [selectedIds, selectedStudents, bulkMoveClassroom, router]);

  const handleBulkPromoteGrade = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const promotable = selectedStudents.filter((s) => s.grade && GRADE_PROGRESSION[s.grade]);
    if (promotable.length === 0) {
      toast.error("ไม่มีนักเรียนที่เลือกที่สามารถเลื่อนชั้นได้ (ไม่พบระดับชั้นที่ตรงกับตารางเลื่อนชั้น)");
      return;
    }
    setBulkBusy(true);
    const supabase = createClient();
    for (const student of promotable) {
      const nextGrade = GRADE_PROGRESSION[student.grade!];
      const { error } = await supabase.from("students").update({ grade: nextGrade }).eq("id", student.id);
      if (!error) {
        void logAudit({
          schoolId: student.school_id,
          action: "update",
          entityTable: "students",
          entityId: student.id,
          metadata: { grade_from: student.grade, grade_to: nextGrade, bulk: true, promote_grade: true },
        });
      }
    }
    setBulkBusy(false);
    toast.success(`เลื่อนชั้น ${promotable.length} คนแล้ว`);
    setRowSelection({});
    router.refresh();
  }, [selectedIds, selectedStudents, router]);

  const handleBulkCreateParentLinks = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    const supabase = createClient();
    let createdCount = 0;
    let skippedCount = 0;
    for (const student of selectedStudents) {
      const { data: parent } = await supabase
        .from("parents")
        .select("id, school_id")
        .eq("student_id", student.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!parent) {
        skippedCount++;
        continue;
      }
      // Reuse the same linking_code mechanism as Module 11's line_users
      // (src/lib/queries/communication.ts createLineLinkingRequest) — there
      // is no "parent account" concept anywhere else in the schema, so a
      // one-time linking code is the real, buildable equivalent.
      const linkingCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { error } = await supabase.from("line_users").upsert(
        {
          school_id: parent.school_id,
          parent_id: parent.id,
          line_user_id: `pending-${parent.id}`,
          linking_code: linkingCode,
          verification_status: "pending",
        },
        { onConflict: "parent_id" }
      );
      if (!error) createdCount++;
      else skippedCount++;
    }
    setBulkBusy(false);
    toast.success(`สร้างโค้ดเชื่อมต่อผู้ปกครอง ${createdCount} รายการ${skippedCount > 0 ? ` (ข้าม ${skippedCount} รายการที่ไม่มีข้อมูลผู้ปกครอง)` : ""}`);
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
              <Button variant="ghost" size="icon" asChild title="Student Timeline">
                <Link href={`/students/${student.id}/timeline`}>
                  <span className="text-sm">📅</span>
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportToExcel(table.getFilteredRowModel().rows.map((r) => r.original))}
          >
            <FileSpreadsheet className="h-4 w-4" />
            ดาวน์โหลด Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            พิมพ์รายชื่อ
          </Button>
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
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={handleBulkRestore}>
            <Undo2 className="mr-2 h-4 w-4" />
            กู้คืนที่เลือก
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => setBulkUpdateOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            อัปเดตข้อมูล
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => setBulkMoveOpen(true)}>
            <FolderInput className="mr-2 h-4 w-4" />
            ย้ายห้องเรียน
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={handleBulkPromoteGrade}>
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            เลื่อนชั้น
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => setQrDialogOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            สร้าง QR
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={handleBulkCreateParentLinks}>
            <Link2 className="mr-2 h-4 w-4" />
            สร้างโค้ดเชื่อมต่อผู้ปกครอง
          </Button>
        </div>
      )}

      <Dialog open={bulkUpdateOpen} onOpenChange={setBulkUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อัปเดตข้อมูลที่เลือก ({selectedIds.length} คน)</DialogTitle>
            <DialogDescription>กรอกเฉพาะฟิลด์ที่ต้องการเปลี่ยน ฟิลด์ที่เว้นว่างจะไม่ถูกแก้ไข</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">ระดับชั้น</label>
              <Input placeholder="ป.4" value={bulkUpdateGrade} onChange={(e) => setBulkUpdateGrade(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">ห้องเรียน</label>
              <Input placeholder="4/2" value={bulkUpdateClassroom} onChange={(e) => setBulkUpdateClassroom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">ระดับความเสี่ยง</label>
              <Select value={bulkUpdateRisk} onValueChange={setBulkUpdateRisk}>
                <SelectTrigger>
                  <SelectValue placeholder="ไม่เปลี่ยน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">ต่ำ</SelectItem>
                  <SelectItem value="medium">ปานกลาง</SelectItem>
                  <SelectItem value="high">สูง</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUpdateOpen(false)}>
              ยกเลิก
            </Button>
            <Button disabled={bulkBusy} onClick={handleBulkUpdate}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ย้ายห้องเรียน ({selectedIds.length} คน)</DialogTitle>
          </DialogHeader>
          <Input placeholder="4/2" value={bulkMoveClassroom} onChange={(e) => setBulkMoveClassroom(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMoveOpen(false)}>
              ยกเลิก
            </Button>
            <Button disabled={bulkBusy || !bulkMoveClassroom.trim()} onClick={handleBulkMoveClassroom}>
              ย้าย
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>QR สำหรับนักเรียนที่เลือก ({selectedIds.length} คน)</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <QrCardsGrid
              students={selectedStudents.map((s) => ({
                id: s.id,
                full_name: s.full_name,
                student_code: s.student_code,
                classroom: s.classroom,
                avatar_url: s.avatar_url,
              }))}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border bg-card overflow-x-auto">
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

      {/* Print-only roster — hidden on screen, visible when window.print() is called */}
      <div id="print-roster" style={{ display: "none" }}>
        <div style={{ fontFamily: "sans-serif", padding: "24px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "4px" }}>
            รายชื่อนักเรียน
            {(() => {
              const filtered = table.getFilteredRowModel().rows.map((r) => r.original);
              const grade = filtered[0]?.grade;
              const classroom = filtered[0]?.classroom;
              return grade || classroom ? ` ชั้น ${grade ?? ""} ห้อง ${classroom ?? ""}` : "";
            })()}
          </h2>
          <p style={{ textAlign: "center", marginBottom: "16px", fontSize: "13px", color: "#555" }}>
            วันที่พิมพ์: {new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>ลำดับ</th>
                <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>รหัส</th>
                <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>ชื่อ-สกุล</th>
                <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>เพศ</th>
                <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>เบอร์โทร</th>
              </tr>
            </thead>
            <tbody>
              {table.getFilteredRowModel().rows.map((row, i) => {
                const s = row.original;
                return (
                  <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px" }}>{s.student_code}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px" }}>{s.full_name}</td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>
                      {s.gender === "male" ? "ชาย" : s.gender === "female" ? "หญิง" : "อื่นๆ"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "5px 8px", textAlign: "center" }}>
                      -
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
