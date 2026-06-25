import { createClient } from "@/lib/supabase/server";
import { extractPlaceholders, renderTemplate } from "@/lib/documents/engine";
import { resolveStudentFields } from "@/lib/documents/fields";

async function getCurrentSchoolId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data: profile } = await supabase.from("users").select("school_id").eq("id", auth.user.id).single();
  return profile?.school_id ?? null;
}

export async function listDocumentTemplates() {
  const supabase = await createClient();
  const { data } = await supabase.from("document_templates").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function uploadDocumentTemplate(params: {
  name: string;
  description?: string;
  category: string;
  file: Buffer;
  fileName: string;
}) {
  const supabase = await createClient();
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) throw new Error("ไม่พบโรงเรียนของผู้ใช้");

  const { data: auth } = await supabase.auth.getUser();
  const fields = extractPlaceholders(params.file);
  const storagePath = `${schoolId}/${Date.now()}_${params.fileName}`;

  const { error: uploadError } = await supabase.storage.from("document-templates").upload(storagePath, params.file, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  if (uploadError) throw uploadError;

  const { data: template, error } = await supabase
    .from("document_templates")
    .insert({
      school_id: schoolId,
      name: params.name,
      description: params.description ?? null,
      category: params.category,
      storage_path: storagePath,
      fields,
      created_by: auth?.user?.id ?? null,
      updated_by: auth?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return template;
}

export async function generateDocumentForStudent(params: { templateId: string; studentId: string }) {
  const supabase = await createClient();
  const schoolId = await getCurrentSchoolId();
  if (!schoolId) throw new Error("ไม่พบโรงเรียนของผู้ใช้");

  const { data: template } = await supabase.from("document_templates").select("*").eq("id", params.templateId).single();
  if (!template) throw new Error("ไม่พบเทมเพลต");

  const { data: templateFile, error: downloadError } = await supabase.storage.from("document-templates").download(template.storage_path);
  if (downloadError || !templateFile) throw downloadError ?? new Error("ไม่สามารถดาวน์โหลดเทมเพลตได้");

  const { data: student } = await supabase.from("students").select("full_name, student_code").eq("id", params.studentId).single();
  if (!student) throw new Error("ไม่พบนักเรียน");

  const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
  const fields = await resolveStudentFields(schoolId, params.studentId);
  const renderedBuffer = renderTemplate(templateBuffer, fields);

  const fileName = `${template.name}_${student.student_code}_${Date.now()}.docx`;
  const storagePath = `${schoolId}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from("generated-documents").upload(storagePath, renderedBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  if (uploadError) throw uploadError;

  const { data: auth } = await supabase.auth.getUser();
  const { data: generated, error } = await supabase
    .from("generated_documents")
    .insert({
      school_id: schoolId,
      template_id: params.templateId,
      student_id: params.studentId,
      storage_path: storagePath,
      file_name: fileName,
      generated_by: auth?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const { data: signedUrl } = await supabase.storage.from("generated-documents").createSignedUrl(storagePath, 60 * 10);

  return { generated, downloadUrl: signedUrl?.signedUrl ?? null };
}

export async function listGeneratedDocuments(templateId?: string) {
  const supabase = await createClient();
  let query = supabase.from("generated_documents").select("*, document_templates(name), students(full_name, student_code)").order("created_at", { ascending: false });
  if (templateId) query = query.eq("template_id", templateId);
  const { data } = await query;
  return data ?? [];
}
