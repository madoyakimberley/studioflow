import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyPortalAccess } from "../../portal-actions";
import SidebarRequestButton from "../../../components/SidebarRequestButton";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Shapes,
  MessageSquare,
} from "lucide-react";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // We must fetch the project here to get the ID for the Request Modal
  const authResult = await verifyPortalAccess(token);
  if (!authResult.success || !authResult.project) {
    notFound();
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
                <Image
                  src="/images/logo.jpg"
                  alt="StudioFlow Logo"
                  fill
                  className="object-cover"
                />
              </div>
              StudioFlow
            </h2>
            <p className="text-xs text-[#e364a7] font-medium mt-1">
              Track Your Project
            </p>
          </div>

          <nav className="mt-6 flex flex-col gap-1 px-4">
            <NavItem
              href={`/portal/${token}/dashboard`}
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
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
          </nav>
        </div>

        <div className="p-4">
          {/* Inject the interactive client component here */}
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
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-[#7a849c] hover:text-white hover:bg-[#111827] focus:bg-[#1f1d36]/80 focus:text-white focus:shadow-[inset_2px_0_0_#d050c2]"
    >
      {icon}
      {label}
    </Link>
  );
}
