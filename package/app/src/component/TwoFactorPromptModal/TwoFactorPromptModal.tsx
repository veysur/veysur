import { ShieldCheck } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

type Props = {
  open: boolean
  onEnable: () => void
  onLater: () => void
  onDismiss: () => void
}

export const TwoFactorPromptModal: React.FC<Props> = ({
  open,
  onEnable,
  onLater,
  onDismiss,
}) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onLater()}>
      <DialogContent className="sm:max-w-sm py-10 px-8">
        <div className="flex flex-col items-center gap-3 pt-2 pb-1">
          <div className="rounded-full bg-primary/10 p-3.5 ring-1 ring-primary/20">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <DialogHeader className="space-y-1.5 text-center">
            <DialogTitle className="text-center text-lg">
              Secure your account
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed">
              Add an extra layer of security — you&apos;ll need a code from your
              authenticator app each time you sign in.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-2.5 mt-1">
          <Button onClick={onEnable} className="w-full" size="lg">
            Enable Two-Factor Authentication
          </Button>
          <Button variant="outline" onClick={onLater} className="w-full">
            Remind me later
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="py-1.5 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Don&apos;t ask me again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TwoFactorPromptModal
