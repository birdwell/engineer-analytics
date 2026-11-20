import { expect, test } from '@playwright/test';

const mergeRequest = {
  id: 1,
  iid: 7,
  project_id: 42,
  title: 'Upgrade analytics dependencies',
  state: 'opened',
  draft: false,
  author: {
    id: 10,
    name: 'Ada Lovelace',
    username: 'ada',
    avatar_url: '',
  },
  assignees: [],
  reviewers: [
    {
      id: 11,
      name: 'Grace Hopper',
      username: 'grace',
      avatar_url: '',
    },
  ],
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-02T00:00:00.000Z',
  web_url: 'https://gitlab.com/group/demo/-/merge_requests/7',
};

test('connects with a token and shows project merge-request stats', async ({ page }) => {
  await page.route('https://gitlab.com/api/v4/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/groups/')) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
      return;
    }

    if (url.includes('/changes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ changes: [] }),
      });
      return;
    }

    if (url.includes('/merge_requests')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mergeRequest]),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'GitLab MR Dashboard' })).toBeVisible();
  const connect = page.getByRole('button', { name: 'Connect to GitLab Project' });
  await expect(connect).toBeDisabled();

  await page.getByLabel('Personal Access Token').fill('glpat-test-token');
  await page.getByLabel('Project Path').fill('group/demo');
  await expect(connect).toBeEnabled();

  await page.getByRole('button', { name: /Analyze all group repos/ }).click();
  await expect(page.getByRole('button', { name: 'Connect to GitLab Group' })).toBeEnabled();
  await page.getByRole('button', { name: /Analyze one repository/ }).click();
  await expect(connect).toBeEnabled();

  await connect.click();

  await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect(page.getByText('group/demo')).toBeVisible();

  await page.getByRole('button', { name: 'Disconnect' }).click();
  await expect(page.getByLabel('Personal Access Token')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect to GitLab Project' })).toBeDisabled();
});
