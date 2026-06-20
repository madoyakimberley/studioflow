import Image from "next/image";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyPortalAccess } from "../../portal-actions";
import SidebarRequestButton from "../../../components/SidebarRequestButton";
import ThemeModal from "../../../components/ThemeSelector"; // Adjust path to ThemeModal!
import { cookies } from "next/headers";
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

  const projectId = authResult.project.id;

  // Check the secure session cookie to verify actual authorization status
  const sessionCookieJar = await cookies();
  const isAuthorized = sessionCookieJar.has(
    `studioflow_portal_auth_${projectId}`,
  );

  // If the user isn't fully authorized through the SecureGate, completely remove the layout shell.
  // Render ONLY the children (SecureGate) without the sidebar.
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-theme-bg text-theme-text flex flex-col font-sans relative overflow-hidden transition-colors duration-300">
        {/* ✨ Themed Toaster (Uses CSS Variables to dynamically shift colors!) */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-theme-surface)",
              color: "var(--color-theme-text)",
              border: "1px solid var(--color-theme-outline)",
            },
            success: {
              iconTheme: {
                primary: "var(--color-theme-primary)",
                secondary: "var(--color-theme-surface)",
              },
            },
            error: {
              iconTheme: {
                primary: "var(--color-theme-secondary)",
                secondary: "var(--color-theme-surface)",
              },
            },
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-theme-primary/10 via-theme-bg/0 to-theme-bg/0 pointer-events-none transition-colors duration-300" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text flex font-sans transition-colors duration-300">
      {/* ✨ Themed Toaster for Authenticated State */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-theme-surface)",
            color: "var(--color-theme-text)",
            border: "1px solid var(--color-theme-outline)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          },
          success: {
            iconTheme: {
              primary: "var(--color-theme-primary)",
              secondary: "var(--color-theme-surface)",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--color-theme-secondary)",
              secondary: "var(--color-theme-surface)",
            },
          },
        }}
      />

      {/* ✨ Sidebar Navigation (Migrated to Theme Variables) */}
      <aside className="w-64 border-r border-theme-outline bg-theme-surface flex flex-col justify-between hidden md:flex shrink-0 transition-colors duration-300">
        <div>
          {/* Header containing Logo and ThemeModal */}
          <div className="p-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-theme-text tracking-tight flex items-center gap-2">
              <div className="relative w-7 h-7 overflow-hidden rounded shadow-[0_0_15px_var(--color-theme-primary)]">
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

            {/* THE THEME SWITCHER UI */}
            <ThemeModal />
          </div>

          <nav className="px-4 space-y-1.5 mt-2">
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-theme-primary/10 via-theme-bg/0 to-theme-bg/0 pointer-events-none transition-colors duration-300" />
        <div className="flex-1 overflow-y-auto relative z-10">{children}</div>
      </div>
    </div>
  );
}

// NavItem Helper Component (Migrated to Theme Variables)
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
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-theme-muted hover:text-theme-text hover:bg-theme-bg/50"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
