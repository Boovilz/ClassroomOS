"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  setOpen: () => {},
});

function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

function AlertDialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement<{ onClick?: React.MouseEventHandler }> }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  if (asChild) {
    return React.cloneElement(children, { onClick: () => setOpen(true) });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(AlertDialogContext);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <DialogHeader>{children}</DialogHeader>;
}

function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <DialogTitle>{children}</DialogTitle>;
}

function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <DialogDescription>{children}</DialogDescription>;
}

function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <DialogFooter>{children}</DialogFooter>;
}

function AlertDialogCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <Button variant="outline" onClick={() => { onClick?.(); setOpen(false); }}>
      {children}
    </Button>
  );
}

function AlertDialogAction({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button className={className} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};
