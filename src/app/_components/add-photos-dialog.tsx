"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ImageUpload } from "~/components/ui/image-upload";
import { api } from "~/trpc/react";
import { useT } from "~/lib/i18n";

interface AddPhotosDialogProps {
  playgroundId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddPhotosDialog({
  playgroundId,
  open,
  onOpenChange,
}: AddPhotosDialogProps) {
  const t = useT();
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const utils = api.useUtils();

  const addPhotosMutation = api.playground.addPhotos.useMutation({
    onSuccess: async () => {
      await utils.playground.getById.invalidate({ id: playgroundId });
      await utils.playground.getAll.invalidate();
      toast.success(t("forms.photosSaved"));
      setImages([]);
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t("forms.imageUploadError"));
    },
  });

  const handleSubmit = () => {
    if (images.length === 0) return;
    addPhotosMutation.mutate({ id: playgroundId, images });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t("forms.addPhotos")}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          <ImageUpload
            value={images}
            onChange={setImages}
            onUploadingChange={setIsUploading}
            config={{ maxFiles: 8 }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={images.length === 0 || isUploading || addPhotosMutation.isPending}
          >
            {addPhotosMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("common.saving")}
              </>
            ) : (
              t("forms.savePhotos")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
