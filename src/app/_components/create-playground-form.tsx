"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

export function CreatePlaygroundForm() {
  const utils = api.useUtils();

  const createPlayground = api.playground.create.useMutation({
    onSuccess: async () => {
      await utils.playground.invalidate();
      setTitle("");
      setLongitude(0.0);
      setLatitude(0.0);
      setPubliclyAccessible(true);
      setToddlerFriendly(false);
      setCoverImage("");
      setImages([]);
    },
  });

  const [title, setTitle] = useState("");
  const [longitude, setLongitude] = useState(0.0);
  const [latitude, setLatitude] = useState(0.0);
  const [publiclyAccessible, setPubliclyAccessible] = useState(true);
  const [toddlerFriendly, setToddlerFriendly] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [images, setImages] = useState([]);

  return (
    <>
      {/* Form that creates a new playground */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPlayground.mutate({
            title,
            latitude,
            longitude,
            publiclyAccessible,
            toddlerFriendly,
            coverImage,
            images,
          });
        }}
        className="flex flex-col gap-2"
      >
        <Label htmlFor="titleInput">Title</Label>
        <Input
          id="titleInput"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTitle(e.target.value)
          }
          className="w-full border-neutral-600 px-4 py-2 text-black"
        />

        <Label htmlFor="latitudeInput">Latitude</Label>
        <Input
          id="latitudeInput"
          type="text"
          placeholder="Latitude"
          value={latitude}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLatitude(+e.target.value)
          }
          className="w-full border-neutral-600 px-4 py-2 text-black"
        />

        <Label htmlFor="longitudeInput">Longitude</Label>
        <Input
          id="longitudeInput"
          type="text"
          placeholder="Longitude"
          value={longitude}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLongitude(+e.target.value)
          }
          className="w-full border-neutral-600 px-4 py-2 text-black"
        />

        <Label htmlFor="publiclyAccessibleInput">Publicly Accessible</Label>
        <Input
          id="publiclyAccessibleInput"
          type="checkbox"
          checked={publiclyAccessible}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPubliclyAccessible(e.target.checked)
          }
          className="h-4 w-4 border-2 border-black bg-white/10"
        />

        <Label htmlFor="toddlerFriendlyInput">Toddler Friendly</Label>
        <Input
          id="toddlerFriendlyInput"
          type="checkbox"
          checked={toddlerFriendly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setToddlerFriendly(e.target.checked)
          }
          className="h-4 w-4 border-2 border-black bg-white/10"
        />
        {/* coverImage input */}
        {/* images input */}

        <Button
          type="submit"
          className="px-10 py-3 font-semibold transition hover:bg-zinc-900/20"
          disabled={createPlayground.isPending}
        >
          {createPlayground.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </>
  );
}
