"use client";
import { api } from "~/trpc/react";
import { Playground } from "~/types";
import PlaygroundCard from "./playground-card";

export default function PlaygroundList() {
  const [playgrounds] = api.playground.getAll.useSuspenseQuery();

  if (!playgrounds) {
    return <div>Loading...</div>;
  }

  return (
    //   TODO: In a client component use suspense queries to fetch data
    //   while query is loading render a loading skeleton
    <div>
      {playgrounds?.map((playground: Playground) => (
        <PlaygroundCard key={playground.id} playground={playground} />
      ))}
    </div>
  );
}
