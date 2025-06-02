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
import CredentialsProvider from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";

import { env } from "~/env";
import { db } from "~/server/db";
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
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

// Mock users for development
const mockUsers = [
  {
    id: "mock-user-1",
    name: "Skúli Arnarsson",
    email: "skuli@example.com",
    image: "	https://avatars.githubusercontent.com/u/16030738?v=4",
  },
];

// Function to ensure mock users exist in database
async function ensureMockUsersExist() {
  if (env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development") {
    for (const mockUser of mockUsers) {
      try {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, mockUser.id),
        });

        // Create user if it doesn't exist
        if (!existingUser) {
          await db.insert(users).values({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            image: mockUser.image,
          });
          console.log(`Created mock user: ${mockUser.name}`);
        }
      } catch (error) {
        console.error(
          `Error ensuring mock user exists: ${mockUser.name}`,
          error,
        );
      }
    }
  }
}

// Initialize mock users on startup
if (env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development") {
  ensureMockUsersExist().catch(console.error);
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    async signIn({ user, account }) {
      // Allow sign in for mock authentication
      if (env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development") {
        return true;
      }

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
          where: eq(users.email, user.email!),
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

            console.log(`Linked ${account.provider} account to existing user: ${user.email}`);
          }
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // If there's an error, still allow sign in to avoid blocking users
        return true;
      }
    },
    session: ({ session, user, token }) => {
      if (env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development") {
        // In mock mode, use token data
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub!,
          },
        };
      }

      // Regular mode with database user
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
    jwt: ({ token, user }) => {
      if (env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development") {
        // In mock mode, preserve user data in token
        if (user) {
          token.sub = user.id;
          token.name = user.name;
          token.email = user.email;
          token.picture = user.image;
        }
      }
      return token;
    },
  },
  adapter:
    env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development"
      ? undefined // Don't use adapter in mock mode
      : (DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }) as Adapter),
  session: {
    strategy:
      env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development"
        ? "jwt" // Use JWT for mock mode
        : "database", // Use database for production
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    // Mock authentication provider for development
    ...(env.ENABLE_MOCK_AUTH === "true" && env.NODE_ENV === "development"
      ? [
        CredentialsProvider({
          id: "mock",
          name: "Mock Authentication",
          credentials: {
            email: {
              label: "Email",
              type: "email",
              placeholder: "Choose a mock user email",
            },
          },
          async authorize(credentials) {
            console.log("Mock auth - received credentials:", credentials);

            if (!credentials?.email) {
              console.log("Mock auth - no email provided");
              return null;
            }

            // Find user by email
            const user = mockUsers.find((u) => u.email === credentials.email);
            if (!user) {
              console.log(
                "Mock auth - user not found for email:",
                credentials.email,
              );
              console.log(
                "Available mock users:",
                mockUsers.map((u) => u.email),
              );
              return null;
            }

            // Ensure this user exists in the database
            await ensureMockUsersExist();

            console.log("Mock auth - found user:", user);
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
            };
          },
        }),
      ]
      : []),

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
