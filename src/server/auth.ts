import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { eq } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
import { type UserRole } from "~/types";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";


/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      /**
       * Carried on the session so the client never has to query for it. With
       * `strategy: "database"` the session callback already receives the full
       * user row, so these cost nothing extra to expose.
       */
      role: UserRole;
      isBanned: boolean;
    } & DefaultSession["user"];
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    async signIn({ user, account }) {
      // If no account or email, allow (should not happen with OAuth)
      if (!account || !user.email) {
        return true;
      }

      // Only handle OAuth providers (not credentials)
      if (account.type !== "oauth") {
        return true;
      }

      try {
        // Check if a user with this email already exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
          with: {
            accounts: true,
          },
        });

        // If user exists and has accounts from other providers
        if (existingUser && existingUser.accounts.length > 0) {
          // Check if this specific provider account already exists
          const existingAccount = existingUser.accounts.find(
            (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
          );

          // If the account doesn't exist, link it to the existing user
          if (!existingAccount) {
            await db.insert(accounts).values({
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            });

          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // If there's an error, still allow sign in to avoid blocking users
        return true;
      }
    },
    session: ({ session, user }) => {
      // `user` is the full row from the users table (database session
      // strategy), so role and ban state are already loaded here. Passing them
      // through saves every client a `users.getCurrentUser` round-trip.
      const dbUser = user as typeof user & {
        role?: UserRole;
        isBanned?: boolean;
      };

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          role: dbUser.role ?? "user",
          isBanned: dbUser.isBanned ?? false,
        },
      };
    },
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    // Google provider (only if credentials are available)
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
        GoogleProvider({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        }),
      ]
      : []),

    // Facebook provider (only if credentials are available)
    ...(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
      ? [
        FacebookProvider({
          clientId: env.FACEBOOK_CLIENT_ID,
          clientSecret: env.FACEBOOK_CLIENT_SECRET,
        }),
      ]
      : []),

    // Discord provider (only if credentials are available)
    ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
      ? [
        DiscordProvider({
          clientId: env.DISCORD_CLIENT_ID,
          clientSecret: env.DISCORD_CLIENT_SECRET,
        }),
      ]
      : []),

    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
