#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/30b5699020534fc908287fdb9130f474a0d70d74facbbcb0361a242d40116d86/contract';
import endContract from '../../snapshots/30b5699020534fc908287fdb9130f474a0d70d74facbbcb0361a242d40116d86/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'comment',
        columns: [
          col('authorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'follows',
        columns: [
          col('followerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('followingId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['followerId', 'followingId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'like',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'post',
        columns: [
          col('authorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'postTag',
        columns: [
          col('postId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['postId', 'tagId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tag',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('bio', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isGuestSandbox', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('profilePictureUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'like',
        constraint: 'like_postId_userId_key',
        columns: ['postId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'tag',
        constraint: 'tag_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment',
        index: 'comment_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment',
        index: 'comment_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'follows',
        index: 'follows_followerId_idx_2aa6c62d',
        columns: ['followerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'follows',
        index: 'follows_followingId_idx_1cf16645',
        columns: ['followingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'like',
        index: 'like_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'like',
        index: 'like_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'post',
        index: 'post_authorId_idx_e47547ed',
        columns: ['authorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'postTag',
        index: 'postTag_postId_idx_a7a72715',
        columns: ['postId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'postTag',
        index: 'postTag_tagId_idx_86854244',
        columns: ['tagId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment',
        foreignKey: {
          name: 'comment_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment',
        foreignKey: {
          name: 'comment_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'follows',
        foreignKey: {
          name: 'follows_followerId_fkey',
          columns: ['followerId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'follows',
        foreignKey: {
          name: 'follows_followingId_fkey',
          columns: ['followingId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'like',
        foreignKey: {
          name: 'like_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'like',
        foreignKey: {
          name: 'like_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'post',
        foreignKey: {
          name: 'post_authorId_fkey',
          columns: ['authorId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'postTag',
        foreignKey: {
          name: 'postTag_postId_fkey',
          columns: ['postId'],
          references: { schema: 'public', table: 'post', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'postTag',
        foreignKey: {
          name: 'postTag_tagId_fkey',
          columns: ['tagId'],
          references: { schema: 'public', table: 'tag', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
