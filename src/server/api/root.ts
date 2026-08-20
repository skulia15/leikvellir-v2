import { checkInRouter } from "~/server/api/routers/checkin";
import { equipmentRouter } from "~/server/api/routers/equipment";
import { playgroundRouter } from "~/server/api/routers/playground";
import { usersRouter } from "~/server/api/routers/users";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  playground: playgroundRouter,
  equipment: equipmentRouter,
  users: usersRouter,
  checkIn: checkInRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
