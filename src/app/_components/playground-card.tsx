import { Card, CardContent, CardTitle } from "~/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { type Playground } from "~/types";

// TODO: Remove this type use trpc for types instead, like posts is doing

export default function PlaygroundCard({
  playground,
}: {
  playground: Playground;
}) {
  return (
    <Link href={`/playground/${playground.id}`}>
      <Card className="cursor-pointer border-0 py-2 transition-colors hover:bg-muted/50">
        <CardContent className="py-0">
          <div className="flex flex-row gap-2">
            <Image
              src={
                playground.coverImage && playground.coverImage.trim() !== ""
                  ? playground.coverImage
                  : "/playground.jpg"
              }
              alt="Playground"
              width={80}
              height={80}
              className="rounded-md object-cover"
            />
            <div>
              <CardTitle className="text-xl">{playground.title}</CardTitle>
              <div className="text-sm text-muted-foreground">
                <span className="block">
                  {playground.toddlerFriendly
                    ? "Toddler Friendly"
                    : "Not Toddler Friendly"}
                </span>
                <span className="block">
                  {playground.publiclyAccessible
                    ? "Publicly Accessible"
                    : "Not Publicly Accessible"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
