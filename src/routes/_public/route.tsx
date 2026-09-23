import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { PublicLayout as SitePublicLayout } from "@/components/layout/public-layout";
import { Toaster } from "@/components/layout/toaster";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { authClient } from "@/lib/auth/auth.client";
import { CACHE_CONTROL } from "@/lib/constants";
import { clientEnv } from "@/lib/env/client.env";
import { isExternalNavHref } from "@/features/config/utils/nav-links";
import { m } from "@/paraglide/messages";

/**
 * Microsoft Clarity 官方只给内联 IIFE（没有可用的外链 src 形式）。
 * project id 会出现在 HTML 里，本身不是机密；仅在构建期变量存在时才注入。
 */
function claritySnippet(projectId: string): string {
  return [
    "(function(c,l,a,r,i,t,y){",
    "c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};",
    't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;',
    "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);",
    `})(window, document, "clarity", "script", "${projectId}");`,
  ].join("\n");
}

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  headers: () => {
    return CACHE_CONTROL.public;
  },
  head: () => {
    const env = clientEnv();
    const umamiWebsiteId = env.VITE_UMAMI_WEBSITE_ID;
    const clarityProjectId = env.VITE_CLARITY_PROJECT_ID;

    return {
      scripts: [
        ...(umamiWebsiteId
          ? [
              {
                src: "/stats.js",
                defer: true,
                "data-website-id": umamiWebsiteId,
              },
            ]
          : []),
        ...(clarityProjectId
          ? [
              {
                type: "text/javascript",
                children: claritySnippet(clarityProjectId),
              },
            ]
          : []),
      ],
    };
  },
});

function PublicLayout() {
  const navigate = useNavigate();
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { logout } = useLogout();

  const navOptions = [
    { id: "home", label: m.nav_home(), href: "/", external: false },
    { id: "posts", label: m.nav_posts(), href: "/posts", external: false },
    {
      id: "friend-links",
      label: m.nav_friend_links(),
      href: "/friend-links",
      external: false,
    },
    ...siteConfig.navLinks.map((link, index) => ({
      id: `custom-${index}`,
      label: link.label,
      href: link.href,
      external: isExternalNavHref(link.href),
    })),
  ];

  // Global shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <SitePublicLayout
        navOptions={navOptions}
        user={session?.user}
        isSessionLoading={isSessionPending}
        logout={logout}
      >
        <Outlet />
      </SitePublicLayout>
      <Toaster />
    </>
  );
}
