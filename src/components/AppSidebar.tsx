import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, Users, BookOpen, LogOut, GraduationCap } from "lucide-react";
import { useRole } from "@/lib/role-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { role, setRole, name } = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const teacherItems = [
    { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    { title: "Classes", url: "/dashboard", icon: Users },
    { title: "Vocabulaire", url: "/dashboard", icon: BookOpen },
  ];

  const studentItems = [
    { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
    { title: "Revisão", url: "/session", icon: Sparkles },
  ];

  const items = role === "teacher" ? teacherItems : studentItems;
  const groupLabel = role === "teacher" ? "Espace enseignant" : "Meu espaço";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg">ClassDeck</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">FLE · BR</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Aperçu (démo)</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="flex rounded-md border border-sidebar-border bg-sidebar-accent p-0.5 text-xs">
              <button
                onClick={() => setRole("teacher")}
                className={`flex-1 rounded px-2 py-1 transition-colors ${role === "teacher" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Prof
              </button>
              <button
                onClick={() => setRole("student")}
                className={`flex-1 rounded px-2 py-1 transition-colors ${role === "student" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Aluno
              </button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper text-xs font-medium">
            {name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-[10px] text-muted-foreground">
              {role === "teacher" ? "Enseignant" : "Aluno · FRA-101"}
            </span>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
