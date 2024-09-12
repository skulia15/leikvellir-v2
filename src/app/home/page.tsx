// TODO: only use client in client components, not this page
import { GoogleMap } from "../_components/map";

import NavigationBar from "../_components/navigation-bar";
import { api, HydrateClient } from "~/trpc/server";
import PlaygroundCard from "../_components/playground-card";
import PlaygroundDrawer from "../_components/playground-drawer";

export default function Home() {
  // const [snap, setSnap] = useState<number | string | null>(1);

  // const [playgrounds] = api.playground.getAll.useQuery();
  // void api.playground.getAll.prefetch();

  // TODO: Remove this type use trpc for types instead, like posts is doing
  type Card = {
    title: string;
    description: string;
    image: string;
  };
  const playgroundsMock: Array<Card> = [
    {
      title: "Playground 1",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 2",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 3",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 4",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 5",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 6",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 7",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 8",
      description: "Playground description",
      image: "/playground.jpg",
    },
    {
      title: "Playground 9",
      description: "Playground description",
      image: "/playground.jpg",
    },
  ];

  return (
    <HydrateClient>
      <div className="flex flex-col gap-2">
        <GoogleMap />
        <PlaygroundDrawer>
          {playgroundsMock.map((card) => (
            <PlaygroundCard key={card.title} card={card} />
          ))}
        </PlaygroundDrawer>
      </div>
    </HydrateClient>
  );
}
