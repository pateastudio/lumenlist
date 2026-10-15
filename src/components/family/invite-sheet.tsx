"use client"

import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { CopyInviteLink } from "@/components/family/copy-invite-link"
import { InviteMemberForm } from "@/components/family/invite-member-form"
import { ResetJoinLinkButton } from "@/components/family/reset-join-link-button"

type InviteSheetProps = {
  familyId: string
  familyName: string
  link: string
  /** The owner can reset the link; the API and RLS are the real check. */
  canReset?: boolean
}

/** "Invite someone" button that opens a bottom sheet with the share link and the email form. */
export function InviteSheet({ familyId, familyName, link, canReset = false }: InviteSheetProps) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ink" size="lg" className="w-full sm:w-auto" />}>
        <UserPlus aria-hidden />
        Invite someone
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-lg gap-5 overflow-y-auto rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="p-0 pr-10">
          <SheetTitle className="font-display text-2xl font-(weight:--display-weight)">Invite someone</SheetTitle>
          <SheetDescription className="text-base">Anyone with this link can join {familyName}.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3">
          <p className="min-w-0 truncate rounded-lg bg-muted px-4 py-3 font-mono text-sm" title={link}>
            {link}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CopyInviteLink link={link} />
            {canReset ? <ResetJoinLinkButton familyId={familyId} /> : null}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Separator className="flex-1" /> or <Separator className="flex-1" />
        </div>
        <InviteMemberForm familyId={familyId} />
      </SheetContent>
    </Sheet>
  )
}
