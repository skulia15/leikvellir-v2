import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "~/components/ui/card";
import Image from "next/image";

// TODO: Remove this type use trpc for types instead, like posts is doing
type Card = {
  title: string;
  description: string;
  image: string;
};

export default function PlaygroundCard({ card }: { card: Card }) {
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
            <CardTitle className="text-xl">{card.title}</CardTitle>
            <CardDescription>{card.description}</CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
