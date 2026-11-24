// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Account, Profile, User } from "next-auth";

const { mockFindFirst, mockValues, mockInsert } = vi.hoisted(() => {
  const mockFindFirst = vi.fn();
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return { mockFindFirst, mockValues, mockInsert };
});

vi.mock("~/server/db", () => ({
  db: {
    query: {
      users: {
        findFirst: mockFindFirst,
      },
    },
    insert: mockInsert,
  },
}));

vi.mock("@auth/drizzle-adapter", () => ({
  DrizzleAdapter: vi.fn(() => ({})),
}));

import { authOptions, isOAuthEmailVerified } from "~/server/auth";
import { accounts } from "~/server/db/schema";

const signIn = authOptions.callbacks!.signIn!;

function createUser(overrides: Partial<User> & { isBanned?: boolean } = {}): User {
  return {
    id: "oauth-user-1",
    name: "Admin User",
    email: "admin@example.com",
    image: "https://example.com/avatar.png",
    ...overrides,
  };
}

function createOAuthAccount(overrides: Partial<Account> = {}): Account {
  return {
    type: "oauth",
    provider: "google",
    providerAccountId: "google-account-123",
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_at: 1700000000,
    token_type: "Bearer",
    scope: "openid email profile",
    id_token: "id-token",
    session_state: "session-state",
    ...overrides,
  };
}

function createExistingDbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "db-user-1",
    name: "Existing Admin",
    email: "admin@example.com",
    role: "super_admin",
    isBanned: false,
    accounts: [
      {
        userId: "db-user-1",
        type: "oauth",
        provider: "discord",
        providerAccountId: "discord-existing-1",
      },
    ],
    ...overrides,
  };
}

describe("isOAuthEmailVerified", () => {
  it("returns true for Google only when email_verified is strictly true", () => {
    expect(
      isOAuthEmailVerified(
        "google",
        { email: "a@example.com", email_verified: true } as Profile,
        "a@example.com",
      ),
    ).toBe(true);
    expect(
      isOAuthEmailVerified(
        "google",
        { email: "a@example.com", email_verified: false } as Profile,
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      isOAuthEmailVerified(
        "google",
        { email: "a@example.com", email_verified: "true" } as unknown as Profile,
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      isOAuthEmailVerified("google", { email: "a@example.com" } as Profile),
    ).toBe(false);
  });

  it("returns true for Discord only when verified is strictly true", () => {
    expect(
      isOAuthEmailVerified(
        "discord",
        { email: "a@example.com", verified: true } as Profile,
        "a@example.com",
      ),
    ).toBe(true);
    expect(
      isOAuthEmailVerified(
        "discord",
        { email: "a@example.com", verified: false } as Profile,
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      isOAuthEmailVerified(
        "discord",
        { email: "a@example.com", verified: 1 } as unknown as Profile,
        "a@example.com",
      ),
    ).toBe(false);
  });

  it("always returns false for Facebook and unknown providers", () => {
    expect(
      isOAuthEmailVerified(
        "facebook",
        {
          email: "a@example.com",
          verified: true,
          email_verified: true,
        } as unknown as Profile,
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      isOAuthEmailVerified(
        "github",
        { email: "a@example.com", email_verified: true } as Profile,
        "a@example.com",
      ),
    ).toBe(false);
  });

  it("returns false when profile is undefined or profile.email does not match expectedEmail", () => {
    expect(isOAuthEmailVerified("google", undefined, "a@example.com")).toBe(false);
    expect(
      isOAuthEmailVerified(
        "google",
        { email: "other@example.com", email_verified: true } as Profile,
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      isOAuthEmailVerified(
        "google",
        { email: "A@EXAMPLE.COM", email_verified: true } as Profile,
        "a@example.com",
      ),
    ).toBe(true);
  });
});

describe("authOptions.callbacks.signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValues.mockResolvedValue(undefined);
  });

  describe("verified cross-provider OAuth linking", () => {
    it("links a verified Google OAuth account to an existing user", async () => {
      const existingUser = createExistingDbUser();
      mockFindFirst.mockResolvedValueOnce(existingUser);

      const account = createOAuthAccount({
        provider: "google",
        providerAccountId: "google-456",
      });

      const result = await signIn({
        user: createUser(),
        account,
        profile: {
          email: "admin@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(accounts);
      expect(mockValues).toHaveBeenCalledWith({
        userId: "db-user-1",
        type: "oauth",
        provider: "google",
        providerAccountId: "google-456",
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
    });

    it("links a verified Discord OAuth account to an existing user", async () => {
      const existingUser = createExistingDbUser({
        accounts: [
          {
            userId: "db-user-1",
            type: "oauth",
            provider: "google",
            providerAccountId: "google-existing-1",
          },
        ],
      });
      mockFindFirst.mockResolvedValueOnce(existingUser);

      const account = createOAuthAccount({
        provider: "discord",
        providerAccountId: "discord-789",
      });

      const result = await signIn({
        user: createUser(),
        account,
        profile: {
          email: "admin@example.com",
          verified: true,
        } as Profile,
      });

      expect(result).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(accounts);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "db-user-1",
          provider: "discord",
          providerAccountId: "discord-789",
        }),
      );
    });

    it("allows returning sign-in for an already-linked account (including Facebook) without duplicating", async () => {
      const existingUser = createExistingDbUser({
        accounts: [
          {
            userId: "db-user-1",
            type: "oauth",
            provider: "facebook",
            providerAccountId: "fb-111",
          },
        ],
      });
      mockFindFirst.mockResolvedValueOnce(existingUser);

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "facebook",
          providerAccountId: "fb-111",
        }),
        profile: { email: "admin@example.com" } as Profile,
      });

      expect(result).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("allows sign-up for a brand-new user with no existing DB row", async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const result = await signIn({
        user: createUser({ email: "newuser@example.com" }),
        account: createOAuthAccount({
          provider: "facebook",
          providerAccountId: "fb-new-1",
        }),
        profile: { email: "newuser@example.com" } as Profile,
      });

      expect(result).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("unverified email rejection (account takeover prevention)", () => {
    it("rejects Google OAuth linking when profile.email_verified is false", async () => {
      mockFindFirst.mockResolvedValueOnce(createExistingDbUser());

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "attacker-google-1",
        }),
        profile: {
          email: "admin@example.com",
          email_verified: false,
        } as Profile,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects Google OAuth linking when profile is missing or email_verified is absent", async () => {
      mockFindFirst.mockResolvedValueOnce(createExistingDbUser());

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "attacker-google-2",
        }),
        profile: undefined,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects Discord OAuth linking when profile.verified is false", async () => {
      mockFindFirst.mockResolvedValueOnce(
        createExistingDbUser({
          accounts: [
            {
              userId: "db-user-1",
              type: "oauth",
              provider: "google",
              providerAccountId: "google-existing-1",
            },
          ],
        }),
      );

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "discord",
          providerAccountId: "attacker-discord-1",
        }),
        profile: {
          email: "admin@example.com",
          verified: false,
        } as Profile,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects Discord OAuth linking when profile.verified is missing", async () => {
      mockFindFirst.mockResolvedValueOnce(
        createExistingDbUser({
          accounts: [
            {
              userId: "db-user-1",
              type: "oauth",
              provider: "google",
              providerAccountId: "google-existing-1",
            },
          ],
        }),
      );

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "discord",
          providerAccountId: "attacker-discord-2",
        }),
        profile: {
          email: "admin@example.com",
        } as Profile,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("refuses automatic Facebook OAuth linking to an existing user", async () => {
      mockFindFirst.mockResolvedValueOnce(createExistingDbUser());

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "facebook",
          providerAccountId: "attacker-fb-1",
        }),
        profile: {
          email: "admin@example.com",
          verified: true,
          email_verified: true,
        } as unknown as Profile,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("rejects linking when profile.email mismatches user.email", async () => {
      mockFindFirst.mockResolvedValueOnce(createExistingDbUser());

      const result = await signIn({
        user: createUser({ email: "admin@example.com" }),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "attacker-google-3",
        }),
        profile: {
          email: "different@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe("/signin?error=OAuthAccountNotLinked");
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("banned user handling", () => {
    it("refuses to link a new verified OAuth provider to a banned user and denies sign-in", async () => {
      mockFindFirst.mockResolvedValueOnce(
        createExistingDbUser({ isBanned: true }),
      );

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "google-new-banned",
        }),
        profile: {
          email: "admin@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("denies sign-in for a banned user even when using an already-linked OAuth account", async () => {
      mockFindFirst.mockResolvedValueOnce(
        createExistingDbUser({ isBanned: true }),
      );

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "discord",
          providerAccountId: "discord-existing-1",
        }),
        profile: {
          email: "admin@example.com",
          verified: true,
        } as Profile,
      });

      expect(result).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("immediately denies sign-in when adapter-hydrated user is already marked banned", async () => {
      const result = await signIn({
        user: createUser({ isBanned: true }),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "google-123",
        }),
        profile: {
          email: "admin@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe(false);
      expect(mockFindFirst).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("DB error fail-closed behavior", () => {
    it("returns false when looking up the existing user throws a DB error", async () => {
      mockFindFirst.mockRejectedValueOnce(new Error("DB connection failed"));

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "google-123",
        }),
        profile: {
          email: "admin@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe(false);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("returns false when inserting the linked account throws a DB error", async () => {
      mockFindFirst.mockResolvedValueOnce(createExistingDbUser());
      mockValues.mockRejectedValueOnce(new Error("Unique constraint violation"));

      const result = await signIn({
        user: createUser(),
        account: createOAuthAccount({
          provider: "google",
          providerAccountId: "google-123",
        }),
        profile: {
          email: "admin@example.com",
          email_verified: true,
        } as Profile,
      });

      expect(result).toBe(false);
      expect(mockInsert).toHaveBeenCalledWith(accounts);
    });
  });

  describe("non-OAuth and missing-field edge cases", () => {
    it("allows non-OAuth accounts without DB lookup", async () => {
      const result = await signIn({
        user: createUser(),
        account: {
          type: "email",
          provider: "email",
          providerAccountId: "admin@example.com",
        } as Account,
      });

      expect(result).toBe(true);
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it("allows sign-in when account is null or email is missing", async () => {
      expect(
        await signIn({
          user: createUser(),
          account: null,
        }),
      ).toBe(true);

      expect(
        await signIn({
          user: createUser({ email: undefined }),
          account: createOAuthAccount(),
        }),
      ).toBe(true);

      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });
});
