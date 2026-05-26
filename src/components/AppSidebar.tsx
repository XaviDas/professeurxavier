import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, Users, LogOut, GraduationCap } from "lucide-react";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTeacher = pathname.startsWith("/dashboard/enseignant");
  const name = isTeacher ? "Pr. Xavier" : "Lucas";

  const items = isTeacher
    ? [
        { title: "Tableau de bord", url: "/dashboard/enseignant", icon: LayoutDashboard },
        { title: "Mes classes", url: "/dashboard/enseignant", icon: Users },
      ]
    : [
        { title: "Mon espace", url: "/dashboard/eleve", icon: LayoutDashboard },
        { title: "Révision", url: "/session", icon: Sparkles },
      ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg">Pr. Xavier</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">flashcards</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isTeacher ? "Espace enseignant" : "Espace élève"}</SidebarGroupLabel>
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-xs font-medium">
            {name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-sm font-medium">{name}</span>
            <span className="text-[10px] text-muted-foreground">
              {isTeacher ? "Enseignant" : "Élève · FRA-101"}
            </span>
          </div>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
