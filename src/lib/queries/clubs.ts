import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Interfaces
// ============================================================================

export interface Club {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  max_members: number | null;
  academic_year: string | null;
  semester: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ClubMembership {
  id: string;
  club_id: string;
  student_id: string;
  joined_at: string;
  status: string;
  attendance_count: number;
  notes: string | null;
}

export interface ClubWithMemberCount extends Club {
  member_count: number;
}

// ============================================================================
// listClubs
// ============================================================================

export async function listClubs(schoolId: string): Promise<ClubWithMemberCount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clubs")
    .select(
      `
      *,
      member_count:club_memberships(count)
    `
    )
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Club),
    member_count: Array.isArray(row.member_count)
      ? (row.member_count[0] as { count: number })?.count ?? 0
      : (row.member_count as number) ?? 0,
  }));
}

// ============================================================================
// getClubWithMembers
// ============================================================================

export async function getClubWithMembers(clubId: string): Promise<{
  club: Club;
  members: Array<{
    id: string;
    student_id: string;
    student_name: string;
    student_code: string;
    classroom: string | null;
    status: string;
    attendance_count: number;
  }>;
} | null> {
  const supabase = await createClient();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .single();

  if (clubError || !club) return null;

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select(
      `
      id,
      student_id,
      status,
      attendance_count,
      students (
        full_name,
        student_code,
        classroom
      )
    `
    )
    .eq("club_id", clubId)
    .neq("status", "dropped");

  if (membershipsError) throw new Error(membershipsError.message);

  const members = (memberships ?? []).map((m: Record<string, unknown>) => {
    const student = m.students as Record<string, unknown> | null;
    return {
      id: m.id as string,
      student_id: m.student_id as string,
      student_name: (student?.full_name as string) ?? "",
      student_code: (student?.student_code as string) ?? "",
      classroom: (student?.classroom as string) ?? null,
      status: m.status as string,
      attendance_count: (m.attendance_count as number) ?? 0,
    };
  });

  return { club: club as Club, members };
}

// ============================================================================
// createClub
// ============================================================================

export async function createClub(data: {
  schoolId: string;
  name: string;
  description?: string;
  teacherId?: string;
  maxMembers?: number;
  academicYear?: string;
  semester?: number;
}): Promise<Club> {
  const supabase = await createClient();

  const { data: club, error } = await (supabase as any)
    .from("clubs")
    .insert({
      school_id: data.schoolId,
      name: data.name,
      description: data.description ?? null,
      teacher_id: data.teacherId ?? null,
      max_members: data.maxMembers ?? null,
      academic_year: data.academicYear ?? null,
      semester: data.semester ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return club as Club;
}

// ============================================================================
// addClubMember
// ============================================================================

export async function addClubMember(clubId: string, studentId: string): Promise<ClubMembership> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("club_memberships")
    .insert({
      club_id: clubId,
      student_id: studentId,
      status: "active",
      attendance_count: 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ClubMembership;
}

// ============================================================================
// removeClubMember
// ============================================================================

export async function removeClubMember(clubId: string, studentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from("club_memberships")
    .update({ status: "dropped" })
    .eq("club_id", clubId)
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);
}

// ============================================================================
// updateClub
// ============================================================================

export async function updateClub(clubId: string, data: Partial<Club>): Promise<Club> {
  const supabase = await createClient();

  const { data: club, error } = await (supabase as any)
    .from("clubs")
    .update(data)
    .eq("id", clubId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return club as Club;
}
