import { createFileRoute } from "@tanstack/react-router";
import { useRole } from "@/lib/role-context";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { role } = useRole();
  return role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}
