"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const onboardingSchema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่อโรงเรียน"),
  province: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "", province: "", address: "", phone: "" },
  });

  async function onSubmit(values: OnboardingFormValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: values.name,
        province: values.province || null,
        address: values.address || null,
        phone: values.phone || null,
      })
      .select("id")
      .single();

    if (schoolError || !school) {
      setIsSubmitting(false);
      toast.error("สร้างโรงเรียนไม่สำเร็จ", { description: schoolError?.message });
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const { error: userError } = await supabase
      .from("users")
      .update({ school_id: school.id, role: "school_admin" })
      .eq("id", auth.user!.id);

    setIsSubmitting(false);

    if (userError) {
      toast.error("ผูกบัญชีกับโรงเรียนไม่สำเร็จ", { description: userError.message });
      return;
    }

    toast.success("ตั้งค่าโรงเรียนสำเร็จ");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="glass-card">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground font-bold text-lg">
          T
        </div>
        <CardTitle className="text-2xl">ตั้งค่าโรงเรียนของคุณ</CardTitle>
        <CardDescription>กรอกข้อมูลโรงเรียนเพื่อเริ่มใช้งาน Teacher Classroom OS</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อโรงเรียน</FormLabel>
                  <FormControl>
                    <Input placeholder="โรงเรียนบ้านสุขใจ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จังหวัด</FormLabel>
                  <FormControl>
                    <Input placeholder="เชียงใหม่" {...field} />
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
                    <Input placeholder="ที่อยู่โรงเรียน" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>เบอร์โทรศัพท์</FormLabel>
                  <FormControl>
                    <Input placeholder="05x-xxx-xxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
