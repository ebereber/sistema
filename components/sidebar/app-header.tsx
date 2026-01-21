"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CommandMenu } from "./command-menu";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 z-20 items-center gap-2 border-b sticky top-0 bg-background  px-4">
      {/* Sidebar Trigger */}
      <SidebarTrigger className="-ml-1 md:hidden flex" />
      <Separator orientation="vertical" className="mr-2 h-4 md:hidden flex" />

      {/* Command Menu */}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <div className="max-w-md">
          <CommandMenu />
        </div>
        {/* <Button variant="ghost" size="sm" className="gap-2" asChild>
          <a
            href="https://wa.me/5493515001234"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Escribinos</span>
          </a>
        </Button> */}

        {/* Settings */}
        {/* <NavUser
          user={{
            name: "Lorianaleg ",
            email: "lorianaleg57@gmail.com",
            avatar: "/avatars/shadcn.jpg",
          }}
        /> */}
        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
