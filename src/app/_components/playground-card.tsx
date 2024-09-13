import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "~/components/ui/card";
import Image from "next/image";
import { Playground } from "~/types";

// TODO: Remove this type use trpc for types instead, like posts is doing

export default function PlaygroundCard({
  playground,
}: {
  playground: Playground;
}) {
  return (
    <Card className="border-0 py-2">
      <CardContent className="py-0">
        <div className="flex flex-row gap-2">
          <Image
            src={"/playground.jpg"}
            alt="Playground"
            width={80}
            height={80}
          />
          <div>
            <CardTitle className="text-xl">{playground.title}</CardTitle>
            <CardDescription>
              <div>
                {playground.toddlerFriendly
                  ? "Toddler Friendly"
                  : "Not Toddler Friendly"}
              </div>
              <div>
                {playground.publiclyAccessible
                  ? "Publicly Accessible"
                  : "Not Publicly Accessible"}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
