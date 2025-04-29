"use client";
import { insertProjectAction } from "@/app/api/chat/actions";
import { Lightbulb, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { handleErrorWithToast } from "ui/shared-toast";

export function CreateProjectPopup({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    safe(() => setIsLoading(true))
      .map(() => insertProjectAction({ name }))
      .watch(() => setIsLoading(false))
      .ifOk(() => setIsOpen(false))
      .ifOk(() => toast.success("Project created"))
      .ifOk(() => mutate("projects"))
      .ifOk((project) => router.push(`/project/${project.id}`))
      .ifFail(handleErrorWithToast);
  };

  useEffect(() => {
    if (!isOpen) {
      setName("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle>Project</DialogTitle>
          <DialogDescription asChild>
            <div className="my-2 p-4 flex bg-muted rounded-lg gap-2">
              <div className="px-2">
                <Lightbulb className="size-4 text-accent-foreground animate-pulse" />
              </div>
              <div className="">
                <p className="font-semibold text-accent-foreground mb-1">
                  What is a project?{" "}
                </p>
                A project is a place where you can keep your files and custom
                instructions all in one spot. It’s great for ongoing work or for
                keeping things organized.
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            autoFocus
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="eg. Korea Trip Plan"
            className="w-full bg-card"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild disabled={isLoading}>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isLoading || !name.trim()}
            onClick={handleCreate}
            variant={"secondary"}
          >
            {isLoading && <Loader className="size-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
