import React from 'react'
import { HelpCircle, Download } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from 'component/shadcn/dialog'
import { Button } from 'component/shadcn/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'component/shadcn/table'

type ImportHelpModalProps = {
  show: boolean
  onHide: () => void
}

export const ImportHelpModal: React.FC<ImportHelpModalProps> = ({
  show,
  onHide,
}) => {
  const downloadTemplate = () => {
    const csvContent =
      'nameFirst,nameLast,email,token,inviteSent,reminderSent\nJohn,Doe,john@example.com,,,\nJane,Smith,jane@example.com,,,\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'participant_import_template.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onHide()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2" size={20} />
            CSV Import Format
          </DialogTitle>
          <DialogDescription>
            Learn about the CSV format for importing participants
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <h6 className="font-semibold mb-2">Required Columns</h6>
          <p className="text-muted-foreground text-sm mb-2">
            Each row must have at least one of the following:
          </p>
          <ul className="list-disc list-inside mb-4 text-sm">
            <li>
              <code className="bg-muted px-1 rounded">nameFirst</code> -
              Participant&apos;s first name
            </li>
            <li>
              <code className="bg-muted px-1 rounded">nameLast</code> -
              Participant&apos;s last name
            </li>
            <li>
              <code className="bg-muted px-1 rounded">email</code> -
              Participant&apos;s email address
            </li>
          </ul>

          <h6 className="font-semibold mb-2">Optional Columns</h6>
          <ul className="list-disc list-inside mb-4 text-sm">
            <li>
              <code className="bg-muted px-1 rounded">token</code> - Unique
              access token (auto-generated if empty)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">inviteSent</code> - When
              invite was sent (ISO date string, or true/false, yes/no, 1/0)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">reminderSent</code> - When
              reminder was sent (ISO date string, or true/false, yes/no, 1/0)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">_id</code> - Custom ID
              (auto-generated if empty)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">language</code> - Language
              code (e.g., eng, fra, deu - defaults to survey language)
            </li>
          </ul>

          <h6 className="font-semibold mb-2">Custom Attribute Columns</h6>
          <p className="text-muted-foreground text-sm mb-4">
            Any column whose name matches a custom participant attribute defined
            for this survey (see Participant Attributes settings) will be
            imported into that attribute. Values longer than 256 characters are
            truncated.
          </p>

          <h6 className="font-semibold mb-2">Supported Column Name Formats</h6>
          <p className="text-muted-foreground text-sm mb-2">
            Exported CSV files can be re-imported directly. The import supports
            multiple column name formats:
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Accepted Column Names</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">First Name</code>,{' '}
                  <code className="bg-muted px-1 rounded">nameFirst</code>,{' '}
                  <code className="bg-muted px-1 rounded">firstName</code>,{' '}
                  <code className="bg-muted px-1 rounded">first_name</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Last Name</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Last Name</code>,{' '}
                  <code className="bg-muted px-1 rounded">nameLast</code>,{' '}
                  <code className="bg-muted px-1 rounded">lastName</code>,{' '}
                  <code className="bg-muted px-1 rounded">last_name</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Email</code>,{' '}
                  <code className="bg-muted px-1 rounded">email</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Token</code>,{' '}
                  <code className="bg-muted px-1 rounded">token</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Invite Sent</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Invite Sent</code>,{' '}
                  <code className="bg-muted px-1 rounded">inviteSent</code>,{' '}
                  <code className="bg-muted px-1 rounded">invite_sent</code> (
                  <small>ISO date, Yes/No, true/false, 1/0</small>)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Reminder Sent</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Reminder Sent</code>,{' '}
                  <code className="bg-muted px-1 rounded">reminderSent</code>,{' '}
                  <code className="bg-muted px-1 rounded">reminder_sent</code>,{' '}
                  <code className="bg-muted px-1 rounded">
                    inviteReminderSent
                  </code>
                  ,{' '}
                  <code className="bg-muted px-1 rounded">
                    invite_reminder_sent
                  </code>{' '}
                  (<small>ISO date, Yes/No, true/false, 1/0</small>)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Language</TableCell>
                <TableCell>
                  <code className="bg-muted px-1 rounded">Language</code>,{' '}
                  <code className="bg-muted px-1 rounded">language</code>,{' '}
                  <code className="bg-muted px-1 rounded">lang</code>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <h6 className="font-semibold mt-4 mb-2">Example CSV</h6>
          <pre className="bg-muted p-3 rounded text-sm">
            {`nameFirst,nameLast,email,token,inviteSent,reminderSent
John,Doe,john@example.com,,2026-01-10T14:30:00Z,
Jane,Smith,jane@example.com,ABC123,true,false
,Johnson,bob.johnson@example.com,,yes,no`}
          </pre>

          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download size={16} className="mr-2" />
              Download Template
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
