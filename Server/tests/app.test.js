import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import User from '../models/user.js';
import Todo from '../models/todo.js';

const TEST_EMAIL = 'test@example.com';
// Must satisfy the registration password policy (min 8 chars, upper+lower+number+special)
const TEST_PASSWORD = 'Passw0rd!123';
const OTHER_PASSWORD = 'Passw0rd!456';
const JANE_PASSWORD = 'Secret2!abc';

let authToken;
let otherToken;

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const register = async (name, email, password) =>
  request(app).post('/api/auth/register').send({ name, email, password });

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Todo.deleteMany({})]);

  const res = await register('Test User', TEST_EMAIL, TEST_PASSWORD);
  authToken = res.body.token;

  const other = await register('Other User', 'other@example.com', OTHER_PASSWORD);
  otherToken = other.body.token;
});

describe('Health check', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('Auth', () => {
  it('registers a new user and returns a token', async () => {
    const res = await register('Jane', 'jane@example.com', JANE_PASSWORD);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('jane@example.com');
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects duplicate emails', async () => {
    const res = await register('Duplicate', TEST_EMAIL, TEST_PASSWORD);
    expect(res.status).toBe(409);
  });

  it('rejects invalid registration payloads', async () => {
    const noEmail = await register('X', 'not-an-email', TEST_PASSWORD);
    expect(noEmail.status).toBe(400);

    const shortPw = await register('X', 'x@example.com', '123');
    expect(shortPw.status).toBe(400);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: TEST_EMAIL,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns the current user via /me', async () => {
    const res = await request(app).get('/api/auth/me').set(authHeader(authToken));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(TEST_EMAIL);
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Todos', () => {
  it('creates a todo', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Buy milk', priority: 'high', tags: ['home', 'shopping'] });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy milk');
    expect(res.body.priority).toBe('high');
    expect(res.body.user).toBeTruthy();
  });

  it('rejects a todo without a title', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ description: 'no title here' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid priority', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'x', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown/mass-assignment fields on create and update', async () => {
    const me = await request(app).get('/api/auth/me').set(authHeader(authToken));
    const myId = me.body._id;

    const create = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Hacked', isAdmin: true, createdAt: '2000-01-01' });
    expect(create.status).toBe(400);

    const legit = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Legit', priority: 'high' });
    expect(legit.status).toBe(201);
    expect(legit.body.user).toBe(myId);

    const update = await request(app)
      .put(`/api/todos/${legit.body._id}`)
      .set(authHeader(authToken))
      .send({ user: new mongoose.Types.ObjectId().toString(), isAdmin: true, title: 'Legit' });
    expect(update.status).toBe(400);

    const after = await request(app)
      .get('/api/todos')
      .set(authHeader(authToken));
    expect(after.body.todos[0].title).toBe('Legit');
    expect(after.body.todos[0].user).toBe(myId);
  });

  it('lists todos with pagination and only the owner\u2019s todos', async () => {
    await request(app).post('/api/todos').set(authHeader(authToken)).send({ title: 'Mine' });
    await request(app).post('/api/todos').set(authHeader(otherToken)).send({ title: 'Theirs' });

    const res = await request(app).get('/api/todos').set(authHeader(authToken));
    expect(res.status).toBe(200);
    expect(res.body.todos).toHaveLength(1);
    expect(res.body.todos[0].title).toBe('Mine');
    expect(res.body.pagination.total).toBe(1);
  });

  it('supports filters and search', async () => {
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Email boss', priority: 'high', isCompleted: true });
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Grocery run', priority: 'low' });

    const searchRes = await request(app)
      .get('/api/todos?search=email')
      .set(authHeader(authToken));
    expect(searchRes.body.todos).toHaveLength(1);

    const completedRes = await request(app)
      .get('/api/todos?status=completed')
      .set(authHeader(authToken));
    expect(completedRes.body.todos).toHaveLength(1);

    const priorityRes = await request(app)
      .get('/api/todos?priority=low')
      .set(authHeader(authToken));
    expect(priorityRes.body.todos[0].title).toBe('Grocery run');
  });

  it('updates a todo (toggle completion)', async () => {
    const created = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Toggle me' });

    const res = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(authHeader(authToken))
      .send({ isCompleted: true });
    expect(res.status).toBe(200);
    expect(res.body.isCompleted).toBe(true);
  });

  it('cannot update or delete another user\u2019s todo', async () => {
    const created = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Private' });

    const update = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(authHeader(otherToken))
      .send({ title: 'Hijacked' });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/api/todos/${created.body._id}`)
      .set(authHeader(otherToken));
    expect(del.status).toBe(404);
  });

  it('deletes a todo', async () => {
    const created = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Delete me' });

    const res = await request(app)
      .delete(`/api/todos/${created.body._id}`)
      .set(authHeader(authToken));
    expect(res.status).toBe(200);

    const after = await request(app)
      .get('/api/todos')
      .set(authHeader(authToken));
    expect(after.body.pagination.total).toBe(0);
  });

  it('reorders todos', async () => {
    const a = await request(app).post('/api/todos').set(authHeader(authToken)).send({ title: 'A' });
    const b = await request(app).post('/api/todos').set(authHeader(authToken)).send({ title: 'B' });

    const res = await request(app)
      .put('/api/todos/reorder')
      .set(authHeader(authToken))
      .send({ orderedIds: [b.body._id, a.body._id] });
    expect(res.status).toBe(200);

    const list = await request(app).get('/api/todos').set(authHeader(authToken));
    expect(list.body.todos[0].title).toBe('B');
  });

  it('supports due-date filters (today/overdue/upcoming)', async () => {
    const day = 24 * 60 * 60 * 1000;
    // Build date strings from the server's LOCAL calendar day so the
    // assertions hold regardless of the machine's timezone.
    const fmt = (offsetMs) => {
      const d = new Date(Date.now() + offsetMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Overdue one', dueDate: fmt(-2 * day) });
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Due today', dueDate: fmt(0) });
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Upcoming one', dueDate: fmt(3 * day) });

    const overdueRes = await request(app)
      .get('/api/todos?due=overdue')
      .set(authHeader(authToken));
    expect(overdueRes.body.todos.map((t) => t.title)).toEqual(['Overdue one']);

    const todayRes = await request(app)
      .get('/api/todos?due=today')
      .set(authHeader(authToken));
    expect(todayRes.body.todos.map((t) => t.title)).toEqual(['Due today']);

    const upcomingRes = await request(app)
      .get('/api/todos?due=upcoming')
      .set(authHeader(authToken));
    expect(upcomingRes.body.todos.map((t) => t.title)).toEqual(['Upcoming one']);
  });

  it('sets completedAt when completing and clears it when reopening', async () => {
    const created = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Track me' });
    expect(created.body.completedAt).toBeNull();

    const done = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(authHeader(authToken))
      .send({ isCompleted: true });
    expect(done.status).toBe(200);
    expect(done.body.isCompleted).toBe(true);
    expect(done.body.completedAt).toBeTruthy();

    const reopened = await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(authHeader(authToken))
      .send({ isCompleted: false });
    expect(reopened.body.isCompleted).toBe(false);
    expect(reopened.body.completedAt).toBeNull();
  });

  it('counts activity by completedAt date', async () => {
    const created = await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Burst' });
    await request(app)
      .put(`/api/todos/${created.body._id}`)
      .set(authHeader(authToken))
      .send({ isCompleted: true });

    const stats = await request(app).get('/api/todos/stats').set(authHeader(authToken));
    expect(stats.body.completed).toBe(1);
    const today = new Date().toISOString().slice(0, 10);
    const entry = stats.body.activity.find((a) => a.date === today);
    expect(entry.count).toBe(1);
  });

  it('rejects invalid reorder payloads (duplicates and too many ids)', async () => {
    const dup = await request(app)
      .put('/api/todos/reorder')
      .set(authHeader(authToken))
      .send({ orderedIds: ['a', 'a'] });
    expect(dup.status).toBe(400);

    const tooMany = await request(app)
      .put('/api/todos/reorder')
      .set(authHeader(authToken))
      .send({ orderedIds: Array.from({ length: 501 }, (_, i) => `id-${i}`) });
    expect(tooMany.status).toBe(400);
  });

  it('returns stats', async () => {
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Done', priority: 'high', isCompleted: true });
    await request(app)
      .post('/api/todos')
      .set(authHeader(authToken))
      .send({ title: 'Open', priority: 'low' });

    const res = await request(app).get('/api/todos/stats').set(authHeader(authToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.completed).toBe(1);
    expect(res.body.completionRate).toBe(50);
    expect(res.body.priorityBreakdown.high).toBe(1);
    expect(res.body.activity).toHaveLength(7);
  });
});
