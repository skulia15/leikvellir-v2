"use client";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { PlaygroundInput } from "~/types";

const initialPlaygroundState: PlaygroundInput = {
  title: "",
  latitude: 0.0,
  longitude: 0.0,
  publiclyAccessible: true,
  toddlerFriendly: false,
  coverImage: "",
  images: [],
};

export function CreatePlaygroundForm() {
  const utils = api.useUtils();

  const [playground, setPlayground] = useState<PlaygroundInput>(
    initialPlaygroundState,
  );

  const createPlayground = api.playground.create.useMutation({
    onSuccess: async () => {
      await utils.playground.invalidate();
      setPlayground(initialPlaygroundState);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPlayground((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseFloat(value)
            : value,
    }));
  };

  return (
    <>
      {/* Form that creates a new playground */}
      {/* TODO: Use better form library */}
      {/* TODO: Use form validation for required fields, lat, lng format, etc. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPlayground.mutate({
            ...playground,
            coverImage: playground.coverImage ?? undefined, // Convert null to undefined
            images: playground.images ?? undefined, // Convert null to undefined
          });
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            type="text"
            placeholder="Title"
            value={playground.title}
            onChange={handleInputChange}
            className="w-full border-neutral-600 px-4 py-2 text-black"
          />
        </div>
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            placeholder="Latitude"
            value={playground.latitude}
            onChange={handleInputChange}
            className="w-full border-neutral-600 px-4 py-2 text-black"
          />
        </div>

        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            placeholder="Longitude"
            value={playground.longitude}
            onChange={handleInputChange}
            className="w-full border-neutral-600 px-4 py-2 text-black"
          />
        </div>

        <div className="mt-4 flex flex-row gap-3">
          <Input
            id="publiclyAccessible"
            name="publiclyAccessible"
            type="checkbox"
            checked={playground.publiclyAccessible}
            onChange={handleInputChange}
            className="h-4 w-4 border-2 border-black bg-white/10"
          />
          <Label htmlFor="publiclyAccessible">Publicly Accessible</Label>
        </div>

        <div className="flex flex-row gap-3">
          <Input
            id="toddlerFriendly"
            name="toddlerFriendly"
            type="checkbox"
            checked={playground.toddlerFriendly}
            onChange={handleInputChange}
            className="h-4 w-4 border-2 border-black bg-white/10"
          />
          <Label htmlFor="toddlerFriendly">Toddler Friendly</Label>
        </div>

        {/* coverImage input */}
        {/* images input */}

        <Button
          type="submit"
          className="mt-6 px-10 py-3 font-semibold transition hover:bg-zinc-900/20"
          disabled={createPlayground.isPending}
        >
          {createPlayground.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </>
  );
}
