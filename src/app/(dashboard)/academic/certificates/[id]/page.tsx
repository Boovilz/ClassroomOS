import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificatePrint } from "@/components/academic/certificate-print";

export default async function CertificateViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: certificate } = await supabase
    .from("academic_certificates")
    .select("title, description, issued_at, students(full_name, student_code, school_id)")
    .eq("id", id)
    .single();

  if (!certificate || !certificate.students) {
    notFound();
  }

  const { data: school } = await supabase
    .from("schools")
    .select("name")
    .eq("id", certificate.students.school_id)
    .single();

  return (
    <CertificatePrint
      certificate={{
        title: certificate.title,
        description: certificate.description,
        studentName: certificate.students.full_name,
        studentCode: certificate.students.student_code,
        schoolName: school?.name ?? "-",
        issuedAt: certificate.issued_at,
      }}
    />
  );
}
