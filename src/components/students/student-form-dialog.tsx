"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UserPlus } from "lucide-react";

interface StudentFormDialogProps {
  schoolId: string;
  /** Pass an existing student to edit instead of create. */
  initialValues?: Partial<StudentFormValues> & { id: string };
  /** Custom trigger element (e.g. an icon button in a table row). */
  trigger?: React.ReactNode;
}

export function StudentFormDialog({ schoolId, initialValues, trigger }: StudentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialValues?.id);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_code: initialValues?.student_code ?? "",
      title: initialValues?.title ?? "",
      full_name: initialValues?.full_name ?? "",
      full_name_en: initialValues?.full_name_en ?? "",
      nickname: initialValues?.nickname ?? "",
      gender: initialValues?.gender,
      birth_date: initialValues?.birth_date ?? "",
      citizen_id: initialValues?.citizen_id ?? "",
      nationality: initialValues?.nationality ?? "",
      religion: initialValues?.religion ?? "",
      blood_type: initialValues?.blood_type ?? "",
      phone_number: initialValues?.phone_number ?? "",
      address: initialValues?.address ?? "",
      province: initialValues?.province ?? "",
      district: initialValues?.district ?? "",
      subdistrict: initialValues?.subdistrict ?? "",
      postal_code: initialValues?.postal_code ?? "",
      emergency_contact_name: initialValues?.emergency_contact_name ?? "",
      emergency_contact_relationship: initialValues?.emergency_contact_relationship ?? "",
      emergency_contact_phone: initialValues?.emergency_contact_phone ?? "",
      grade: initialValues?.grade ?? "",
      classroom: initialValues?.classroom ?? "",
      student_number: initialValues?.student_number ?? "",
      enrollment_date: initialValues?.enrollment_date ?? "",
      graduation_status: initialValues?.graduation_status ?? "",
      learning_support_status: initialValues?.learning_support_status ?? "",
      scholarship_status: initialValues?.scholarship_status ?? "",
      risk_level: initialValues?.risk_level,
      risk_category: initialValues?.risk_category ?? "",
      parent_full_name: initialValues?.parent_full_name ?? "",
      parent_relationship: initialValues?.parent_relationship,
      parent_phone: initialValues?.parent_phone ?? "",
      parent_occupation: initialValues?.parent_occupation ?? "",
      parent_income: initialValues?.parent_income ?? "",
      parent_line_id: initialValues?.parent_line_id ?? "",
      parent_address: initialValues?.parent_address ?? "",
      height_cm: initialValues?.height_cm ?? "",
      weight_kg: initialValues?.weight_kg ?? "",
      vision_left: initialValues?.vision_left ?? "",
      vision_right: initialValues?.vision_right ?? "",
      allergies: initialValues?.allergies ?? "",
      chronic_conditions: initialValues?.chronic_conditions ?? "",
      health_notes: initialValues?.health_notes ?? "",
      family_income: initialValues?.family_income ?? "",
      family_members_count: initialValues?.family_members_count ?? "",
      housing_type: initialValues?.housing_type ?? "",
      internet_access: initialValues?.internet_access,
      device_ownership: initialValues?.device_ownership ?? "",
      transportation_method: initialValues?.transportation_method ?? "",
      poor_student_program: initialValues?.poor_student_program ?? false,
      government_support_programs: initialValues?.government_support_programs ?? "",
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    const orNull = (v: string | undefined) => (v ? v : null);
    const orNumber = (v: string | undefined) => (v ? Number(v) : null);

    const studentPayload = {
      student_code: values.student_code,
      title: orNull(values.title),
      full_name: values.full_name,
      full_name_en: orNull(values.full_name_en),
      nickname: orNull(values.nickname),
      gender: values.gender,
      birth_date: orNull(values.birth_date),
      citizen_id: orNull(values.citizen_id),
      nationality: orNull(values.nationality),
      religion: orNull(values.religion),
      blood_type: orNull(values.blood_type),
      phone_number: orNull(values.phone_number),
      address: orNull(values.address),
      province: orNull(values.province),
      district: orNull(values.district),
      subdistrict: orNull(values.subdistrict),
      postal_code: orNull(values.postal_code),
      emergency_contact_name: orNull(values.emergency_contact_name),
      emergency_contact_relationship: orNull(values.emergency_contact_relationship),
      emergency_contact_phone: orNull(values.emergency_contact_phone),
      grade: orNull(values.grade),
      classroom: orNull(values.classroom),
      student_number: orNull(values.student_number),
      enrollment_date: orNull(values.enrollment_date),
      graduation_status: orNull(values.graduation_status),
      learning_support_status: orNull(values.learning_support_status),
      scholarship_status: orNull(values.scholarship_status),
      risk_level: values.risk_level,
      risk_category: orNull(values.risk_category),
      family_income: orNumber(values.family_income),
      family_members_count: orNumber(values.family_members_count),
      housing_type: orNull(values.housing_type),
      internet_access: values.internet_access ?? null,
      device_ownership: orNull(values.device_ownership),
      transportation_method: orNull(values.transportation_method),
      poor_student_program: values.poor_student_program ?? false,
      government_support_programs: orNull(values.government_support_programs),
      school_id: schoolId,
    };

    let studentId = initialValues?.id;
    const { data: savedStudent, error } = isEditing
      ? await supabase.from("students").update(studentPayload).eq("id", initialValues!.id).select("id").single()
      : await supabase.from("students").insert(studentPayload).select("id").single();

    if (error) {
      setIsSubmitting(false);
      toast.error(isEditing ? "บันทึกข้อมูลไม่สำเร็จ" : "เพิ่มนักเรียนไม่สำเร็จ", { description: error.message });
      return;
    }
    studentId = savedStudent.id;

    void logAudit({
      schoolId,
      action: isEditing ? "update" : "create",
      entityTable: "students",
      entityId: studentId,
      metadata: { student_code: values.student_code, full_name: values.full_name },
    });

    // Inline parent add (only if a name was provided)
    if (values.parent_full_name) {
      const { error: parentError } = await supabase.from("parents").insert({
        school_id: schoolId,
        student_id: studentId,
        full_name: values.parent_full_name,
        relationship: values.parent_relationship,
        phone: orNull(values.parent_phone),
        occupation: orNull(values.parent_occupation),
        income: orNumber(values.parent_income),
        line_id: orNull(values.parent_line_id),
        address: orNull(values.parent_address),
      });
      if (parentError) {
        toast.error("บันทึกข้อมูลผู้ปกครองไม่สำเร็จ", { description: parentError.message });
      }
    }

    // Upsert latest health_records row
    if (
      values.height_cm ||
      values.weight_kg ||
      values.vision_left ||
      values.vision_right ||
      values.allergies ||
      values.chronic_conditions ||
      values.health_notes
    ) {
      const { error: healthError } = await supabase.from("health_records").insert({
        school_id: schoolId,
        student_id: studentId,
        height_cm: orNumber(values.height_cm),
        weight_kg: orNumber(values.weight_kg),
        vision_left: orNull(values.vision_left),
        vision_right: orNull(values.vision_right),
        allergies: orNull(values.allergies),
        chronic_conditions: orNull(values.chronic_conditions),
        notes: orNull(values.health_notes),
      });
      if (healthError) {
        toast.error("บันทึกข้อมูลสุขภาพไม่สำเร็จ", { description: healthError.message });
      }
    }

    setIsSubmitting(false);
    toast.success(isEditing ? "บันทึกข้อมูลสำเร็จ" : "เพิ่มนักเรียนสำเร็จ");
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            {isEditing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียนใหม่"}</DialogTitle>
          <DialogDescription>กรอกข้อมูลของนักเรียนแยกตามหมวด</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="personal">
              <TabsList className="flex w-full flex-wrap gap-1 h-auto">
                <TabsTrigger value="personal">ข้อมูลส่วนตัว</TabsTrigger>
                <TabsTrigger value="parent">ข้อมูลผู้ปกครอง</TabsTrigger>
                <TabsTrigger value="education">ข้อมูลการศึกษา</TabsTrigger>
                <TabsTrigger value="health">ข้อมูลสุขภาพ</TabsTrigger>
                <TabsTrigger value="socioeconomic">ข้อมูลเศรษฐกิจสังคม</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="student_code" render={({ field }) => (
                    <FormItem><FormLabel>รหัสนักเรียน</FormLabel><FormControl><Input placeholder="STU0001" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>คำนำหน้า</FormLabel><FormControl><Input placeholder="เด็กชาย/เด็กหญิง" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem><FormLabel>ชื่อ-นามสกุล</FormLabel><FormControl><Input placeholder="สมชาย ใจดี" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="nickname" render={({ field }) => (
                    <FormItem><FormLabel>ชื่อเล่น</FormLabel><FormControl><Input placeholder="น้องฟ้า" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem>
                      <FormLabel>เพศ</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกเพศ" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="male">ชาย</SelectItem>
                          <SelectItem value="female">หญิง</SelectItem>
                          <SelectItem value="other">อื่นๆ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="birth_date" render={({ field }) => (
                    <FormItem><FormLabel>วันเกิด</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="citizen_id" render={({ field }) => (
                    <FormItem><FormLabel>เลขประจำตัวประชาชน</FormLabel><FormControl><Input placeholder="1-2345-67890-12-3" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="blood_type" render={({ field }) => (
                    <FormItem><FormLabel>กรุ๊ปเลือด</FormLabel><FormControl><Input placeholder="O, A, B, AB" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="nationality" render={({ field }) => (
                    <FormItem><FormLabel>สัญชาติ</FormLabel><FormControl><Input placeholder="ไทย" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="religion" render={({ field }) => (
                    <FormItem><FormLabel>ศาสนา</FormLabel><FormControl><Input placeholder="พุทธ" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="phone_number" render={({ field }) => (
                  <FormItem><FormLabel>เบอร์โทรศัพท์</FormLabel><FormControl><Input placeholder="08x-xxx-xxxx" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>ที่อยู่</FormLabel><FormControl><Textarea placeholder="ที่อยู่ปัจจุบัน" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="subdistrict" render={({ field }) => (
                    <FormItem><FormLabel>ตำบล/แขวง</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem><FormLabel>อำเภอ/เขต</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="province" render={({ field }) => (
                    <FormItem><FormLabel>จังหวัด</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="postal_code" render={({ field }) => (
                  <FormItem><FormLabel>รหัสไปรษณีย์</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
                    <FormItem><FormLabel>ผู้ติดต่อฉุกเฉิน</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_relationship" render={({ field }) => (
                    <FormItem><FormLabel>ความสัมพันธ์</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
                    <FormItem><FormLabel>เบอร์โทรฉุกเฉิน</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="parent" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  เพิ่มผู้ปกครองหลัก 1 คนได้ที่นี่ — การจัดการผู้ปกครองหลายคนทำได้ที่หน้ารายละเอียดนักเรียน
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="parent_full_name" render={({ field }) => (
                    <FormItem><FormLabel>ชื่อ-นามสกุล</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="parent_relationship" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ความสัมพันธ์</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกความสัมพันธ์" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="father">บิดา</SelectItem>
                          <SelectItem value="mother">มารดา</SelectItem>
                          <SelectItem value="guardian">ผู้ปกครอง</SelectItem>
                          <SelectItem value="other">อื่นๆ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="parent_phone" render={({ field }) => (
                    <FormItem><FormLabel>เบอร์โทรศัพท์</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="parent_occupation" render={({ field }) => (
                    <FormItem><FormLabel>อาชีพ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="parent_income" render={({ field }) => (
                    <FormItem><FormLabel>รายได้ (บาท/เดือน)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="parent_line_id" render={({ field }) => (
                    <FormItem><FormLabel>LINE ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="parent_address" render={({ field }) => (
                  <FormItem><FormLabel>ที่อยู่</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem><FormLabel>ระดับชั้น</FormLabel><FormControl><Input placeholder="ป.4" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="classroom" render={({ field }) => (
                    <FormItem><FormLabel>ห้องเรียน</FormLabel><FormControl><Input placeholder="ป.4/1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="student_number" render={({ field }) => (
                    <FormItem><FormLabel>เลขที่ในห้อง</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="enrollment_date" render={({ field }) => (
                    <FormItem><FormLabel>วันที่เข้าเรียน</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="graduation_status" render={({ field }) => (
                    <FormItem><FormLabel>สถานะการจบการศึกษา</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="scholarship_status" render={({ field }) => (
                    <FormItem><FormLabel>สถานะทุนการศึกษา</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="learning_support_status" render={({ field }) => (
                  <FormItem><FormLabel>สถานะการเรียนรู้ที่ต้องการการสนับสนุน</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="risk_level" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ระดับความเสี่ยง</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="เลือกระดับความเสี่ยง" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="low">ต่ำ</SelectItem>
                          <SelectItem value="medium">ปานกลาง</SelectItem>
                          <SelectItem value="high">สูง</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="risk_category" render={({ field }) => (
                    <FormItem><FormLabel>ประเภทความเสี่ยง</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="health" className="space-y-4">
                <p className="text-sm text-muted-foreground">บันทึกนี้จะถูกเพิ่มเป็นรายการสุขภาพล่าสุดของนักเรียน</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="height_cm" render={({ field }) => (
                    <FormItem><FormLabel>ส่วนสูง (ซม.)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="weight_kg" render={({ field }) => (
                    <FormItem><FormLabel>น้ำหนัก (กก.)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vision_left" render={({ field }) => (
                    <FormItem><FormLabel>สายตาซ้าย</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="vision_right" render={({ field }) => (
                    <FormItem><FormLabel>สายตาขวา</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="allergies" render={({ field }) => (
                  <FormItem><FormLabel>ประวัติการแพ้</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="chronic_conditions" render={({ field }) => (
                  <FormItem><FormLabel>โรคประจำตัว/ยาที่ใช้/ความต้องการพิเศษ</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="health_notes" render={({ field }) => (
                  <FormItem><FormLabel>หมายเหตุ (รวมสถานะการฉีดวัคซีน)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </TabsContent>

              <TabsContent value="socioeconomic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="family_income" render={({ field }) => (
                    <FormItem><FormLabel>รายได้ครอบครัว (บาท/เดือน)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="family_members_count" render={({ field }) => (
                    <FormItem><FormLabel>จำนวนสมาชิกในครอบครัว</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="housing_type" render={({ field }) => (
                    <FormItem><FormLabel>ลักษณะที่อยู่อาศัย</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="device_ownership" render={({ field }) => (
                    <FormItem><FormLabel>การมีอุปกรณ์ดิจิทัล</FormLabel><FormControl><Input placeholder="สมาร์ทโฟน/แท็บเล็ต/คอมพิวเตอร์" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="transportation_method" render={({ field }) => (
                  <FormItem><FormLabel>วิธีการเดินทางมาโรงเรียน</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="government_support_programs" render={({ field }) => (
                  <FormItem><FormLabel>โครงการสนับสนุนจากรัฐที่ได้รับ</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="internet_access" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">มีอินเทอร์เน็ตใช้งานที่บ้าน</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="poor_student_program" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">อยู่ในโครงการนักเรียนยากจน</FormLabel>
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
