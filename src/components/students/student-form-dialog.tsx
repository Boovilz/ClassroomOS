"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
}

export function StudentFormDialog({ schoolId, initialValues }: StudentFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialValues?.id);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_code: initialValues?.student_code ?? "",
      full_name: initialValues?.full_name ?? "",
      nickname: initialValues?.nickname ?? "",
      gender: initialValues?.gender,
      birth_date: initialValues?.birth_date ?? "",
      grade: initialValues?.grade ?? "",
      classroom: initialValues?.classroom ?? "",
      blood_type: initialValues?.blood_type ?? "",
      address: initialValues?.address ?? "",
    },
  });

  async function onSubmit(values: StudentFormValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      ...values,
      nickname: values.nickname || null,
      birth_date: values.birth_date || null,
      grade: values.grade || null,
      classroom: values.classroom || null,
      blood_type: values.blood_type || null,
      address: values.address || null,
      school_id: schoolId,
    };

    const { error } = isEditing
      ? await supabase.from("students").update(payload).eq("id", initialValues!.id)
      : await supabase.from("students").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error(isEditing ? "บันทึกข้อมูลไม่สำเร็จ" : "เพิ่มนักเรียนไม่สำเร็จ", { description: error.message });
      return;
    }

    toast.success(isEditing ? "บันทึกข้อมูลสำเร็จ" : "เพิ่มนักเรียนสำเร็จ");
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isEditing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียนใหม่"}</DialogTitle>
          <DialogDescription>กรอกข้อมูลพื้นฐานของนักเรียน</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="student_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสนักเรียน</FormLabel>
                    <FormControl>
                      <Input placeholder="STU0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อเล่น</FormLabel>
                    <FormControl>
                      <Input placeholder="น้องฟ้า" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อ-นามสกุล</FormLabel>
                  <FormControl>
                    <Input placeholder="สมชาย ใจดี" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เพศ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกเพศ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">ชาย</SelectItem>
                        <SelectItem value="female">หญิง</SelectItem>
                        <SelectItem value="other">อื่นๆ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>วันเกิด</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ระดับชั้น</FormLabel>
                    <FormControl>
                      <Input placeholder="ป.4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classroom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ห้องเรียน</FormLabel>
                    <FormControl>
                      <Input placeholder="ป.4/1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="blood_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>กรุ๊ปเลือด</FormLabel>
                  <FormControl>
                    <Input placeholder="O, A, B, AB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ที่อยู่</FormLabel>
                  <FormControl>
                    <Input placeholder="ที่อยู่ปัจจุบัน" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
