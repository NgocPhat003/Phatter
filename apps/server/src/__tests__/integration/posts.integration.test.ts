import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mockHolder = vi.hoisted(() => ({ instance: null as any }));

vi.mock("phatter-db", async () => {
  const { createMockDatabase } = await import("../helpers/mockDb.js");
  mockHolder.instance = createMockDatabase();
  return { db: mockHolder.instance.db };
});

import { app } from "../../app.js";
import { signAccessToken } from "../../shared/utils/jwt.util.js";
import { jwtConfig } from "../../shared/config/jwt.config.js";

describe("Integration — Posts CRUD & Authorization (/api/posts)", () => {
  const userA = { id: "usr_author_a", username: "sarah_dev", isGuestSandbox: false };
  const userB = { id: "usr_other_b", username: "alexchen", isGuestSandbox: false };

  const tokenA = signAccessToken({ userId: userA.id, isGuestSandbox: false });
  const tokenB = signAccessToken({ userId: userB.id, isGuestSandbox: false });

  beforeEach(async () => {
    mockHolder.instance?.resetAll();
    await mockHolder.instance.tables.User.create(userA);
    await mockHolder.instance.tables.User.create(userB);
  });

  describe("POST /api/posts", () => {
    it("blocks unauthenticated post creation with 401", async () => {
      const res = await request(app)
        .post("/api/posts")
        .send({ content: "Unauthenticated attempt" });

      expect(res.status).toBe(401);
    });

    it("rejects empty or invalid post content with 400", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("Cookie", `${jwtConfig.accessCookieName}=${tokenA}`)
        .send({ content: "   ", imageUrl: "not-a-url" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it("creates a post for authenticated user and returns 201", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("Cookie", `${jwtConfig.accessCookieName}=${tokenA}`)
        .send({
          content: "Shipping unit & integration tests! #TypeScript #Vitest",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.post).toMatchObject({
        content: "Shipping unit & integration tests! #TypeScript #Vitest",
        authorId: userA.id,
      });
    });
  });

  describe("GET /api/posts", () => {
    it("filters posts by hashtag and sorts by popularity", async () => {
      const p1 = await mockHolder.instance.tables.Post.create({
        id: "pst_1",
        content: "First post #Vitest",
        authorId: userA.id,
        createdAt: "2026-10-01T10:00:00.000Z",
      });
      const p2 = await mockHolder.instance.tables.Post.create({
        id: "pst_2",
        content: "Second popular post #Vitest",
        authorId: userB.id,
        createdAt: "2026-10-02T10:00:00.000Z",
      });
      await mockHolder.instance.tables.Post.create({
        id: "pst_3",
        content: "Unrelated post #Other",
        authorId: userA.id,
        createdAt: "2026-10-03T10:00:00.000Z",
      });

      // Give p2 two likes so it ranks first on ?sort=popular
      await mockHolder.instance.tables.Like.create({ postId: p2.id, userId: userA.id });
      await mockHolder.instance.tables.Like.create({ postId: p2.id, userId: userB.id });
      await mockHolder.instance.tables.Like.create({ postId: p1.id, userId: userB.id });

      const res = await request(app).get("/api/posts?hashtag=vitest&sort=popular");

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.posts.map((p: any) => p.id)).toEqual(["pst_2", "pst_1"]);
      expect(res.body.posts[0].engagement.likesCount).toBe(2);
    });
  });

  describe("DELETE /api/posts/:id (IDOR Protection & Cleanup)", () => {
    it("returns 404 when post does not exist", async () => {
      const res = await request(app)
        .delete("/api/posts/nonexistent_id")
        .set("Cookie", `${jwtConfig.accessCookieName}=${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("returns 403 Forbidden when a non-author attempts to delete another user's post", async () => {
      await mockHolder.instance.tables.Post.create({
        id: "pst_owned_by_a",
        content: "Only Sarah can delete this",
        authorId: userA.id,
      });

      const res = await request(app)
        .delete("/api/posts/pst_owned_by_a")
        .set("Cookie", `${jwtConfig.accessCookieName}=${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden");

      // Post must still exist in DB
      const stillThere = await mockHolder.instance.tables.Post.where({
        id: "pst_owned_by_a",
      }).first();
      expect(stillThere).not.toBeNull();
    });

    it("deletes post and cleans up related notifications when requested by the author", async () => {
      await mockHolder.instance.tables.Post.create({
        id: "pst_to_delete",
        content: "Delete me cleanly",
        authorId: userA.id,
      });
      await mockHolder.instance.tables.Notification.create({
        id: "ntf_1",
        postId: "pst_to_delete",
        recipientId: userA.id,
        actorId: userB.id,
        type: "like",
      });

      const res = await request(app)
        .delete("/api/posts/pst_to_delete")
        .set("Cookie", `${jwtConfig.accessCookieName}=${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.postId).toBe("pst_to_delete");

      expect(
        await mockHolder.instance.tables.Post.where({ id: "pst_to_delete" }).first()
      ).toBeNull();
      expect(await mockHolder.instance.tables.Notification.all()).toHaveLength(0);
    });
  });
});
