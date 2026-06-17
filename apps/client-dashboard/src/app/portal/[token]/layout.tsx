import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyPortalAccess } from "../../portal-actions";
import SidebarRequestButton from "../../../components/SidebarRequestButton";
import {
  LayoutDashboard,
  FolderKanban,
  Shapes,
  MessageSquare,
  Activity,
} from "lucide-react";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // We fetch the project. If it's locked, success is false, but we still get the project object.
  const authResult = await verifyPortalAccess(token);

  // If the project doesn't exist at all, hit 404
  if (!authResult.project) {
    notFound();
  }

  // If project exists but auth failed, it means the gate is locked.
  // Render ONLY the children (SecureGate) without the sidebar.
  if (!authResult.success) {
    return (
      <div className="min-h-screen bg-[#06070b] text-slate-200 flex flex-col font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#9d4edd]/10 via-[#06070b]/0 to-[#06070b]/0 pointer-events-none" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  const projectId = authResult.project.id;

  return (
    <div className="min-h-screen bg-[#06070b] text-slate-200 flex font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#171f33] bg-[#080b14] flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <div className="relative w-7 h-7 overflow-hidden rounded shadow-[0_0_15px_rgba(208,80,194,0.4)]">
                <div className="relative h-6 w-6 flex-shrink-0">
                  <Image
                    src="/images/logo.jpg"
                    alt="StudioFlow Logo"
                    fill
                    sizes="24px"
                    priority
                    className="object-contain"
                  />
                </div>
              </div>
              StudioFlow
            </h2>
          </div>

          <nav className="px-4 space-y-1.5 mt-2">
            {/* FIXED: Point Mission Control directly to the dashboard, not the welcome gate */}
            <NavItem
              href={`/portal/${token}/dashboard`}
              icon={<LayoutDashboard size={18} />}
              label="Mission Control"
            />
            <NavItem
              href={`/portal/${token}/projects`}
              icon={<FolderKanban size={18} />}
              label="Projects"
            />
            <NavItem
              href={`/portal/${token}/assets`}
              icon={<Shapes size={18} />}
              label="Assets"
            />
            <NavItem
              href={`/portal/${token}/messages`}
              icon={<MessageSquare size={18} />}
              label="Messages"
            />
            {/* NEW: Proof of Progress Link */}
            <NavItem
              href={`/portal/${token}/proofs`}
              icon={<Activity size={18} />}
              label="Proof of Progress"
            />
          </nav>
        </div>

        <div className="p-4">
          <SidebarRequestButton projectId={projectId} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#9d4edd]/10 via-[#06070b]/0 to-[#06070b]/0 pointer-events-none" />
        <div className="flex-1 overflow-y-auto relative z-10">{children}</div>
      </div>
    </div>
  );
}

// NavItem Helper Component
function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#7a849c] hover:text-[#e0e2ec] hover:bg-[#121827]"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
