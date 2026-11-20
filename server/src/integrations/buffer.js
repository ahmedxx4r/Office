const endpoint = 'https://api.buffer.com';

async function bufferRequest(query, variables) {
  const key = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
  if (!key) {
    const error = new Error('Buffer API key is missing. Add BUFFER_ACCESS_TOKEN in Vercel.');
    error.retryable = false;
    throw error;
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify(variables ? { query, variables } : { query })
    });
  } catch (networkError) {
    const error = new Error('Buffer network error: ' + networkError.message);
    error.retryable = true;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(x => x.message).filter(Boolean).join('; ') || 'Buffer API request failed (' + response.status + ').';
    const error = new Error(message);
    error.status = response.status;
    error.retryable = response.status === 429 || response.status >= 500;
    throw error;
  }
  return payload.data || {};
}

const bufferQuery = query => bufferRequest(query);

export function registerBufferRoutes(app) {
  app.get('/api/integrations/buffer/status', async (_req, res) => {
    try {
      const account = await bufferQuery(`query ISystemBufferAccount {
        account { id name email organizations { id name } }
      }`);
      const organizations = account.account?.organizations || [];
      const org = organizations[0];
      if (!org) return res.json({ connected: true, account: account.account, organizations: [], channels: [] });
      const channelsData = await bufferQuery(`query ISystemBufferChannels {
        channels(input: { organizationId: "${org.id}" }) { id name service }
      }`);
      const channels = channelsData.channels || [];
      res.json({
        connected: true,
        account: { name: account.account?.name, email: account.account?.email },
        organization: org,
        channels: channels.map(({ id, name, service }) => ({ id, name, service }))
      });
    } catch (error) {
      const status = error.status === 401 ? 502 : 503;
      res.status(status).json({ connected: false, error: error.status === 401 ? 'Buffer rejected the API key. Check that the saved key is valid and has account/channel read access.' : error.message });
    }
  });
}


export async function publishBufferPost({ service, text, assetUrl, mode = 'addToQueue', dueAt }) {
  const account = await bufferQuery(`query ISystemBufferPublishTargets {
    account { organizations { id name } }
  }`);
  const organization = account.account?.organizations?.[0];
  if (!organization) throw new Error('No Buffer organization is connected.');
  const channelData = await bufferQuery(`query ISystemBufferPublishChannels {
    channels(input: { organizationId: "${organization.id}" }) { id name service isDisconnected }
  }`);
  const channel = (channelData.channels || []).find(item => item.service === service && !item.isDisconnected);
  if (!channel) throw new Error('No active ' + service + ' channel is connected in Buffer.');
  if (service === 'instagram' && !assetUrl) throw new Error('Instagram requires a public image or video URL. Attach media before publishing.');
  if (mode === 'customScheduled' && !dueAt) throw new Error('A scheduled post needs a dueAt time.');
  const input = {
    text: String(text || '').trim(),
    channelId: channel.id,
    schedulingType: 'automatic',
    mode,
    ...(mode === 'customScheduled' ? { dueAt: new Date(dueAt).toISOString() } : {}),
    ...(assetUrl ? { assets: [{ image: { url: assetUrl, metadata: { altText: 'NEXLOVA social media post' } } }] } : {}),
    metadata: service === 'facebook' ? { facebook: { type: 'post' } } : { instagram: { type: 'post', shouldShareToFeed: true } }
  };
  if (!input.text) throw new Error('Post text is empty.');
  const mutation = `mutation ISystemCreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess { post { id text status dueAt externalLink } }
      ... on MutationError { message }
    }
  }`;
  const result = await bufferRequest(mutation, { input });
  const created = result.createPost;
  if (created?.message) { const error = new Error(created.message); error.retryable = false; throw error; }
  if (!created?.post?.id) { const error = new Error('Buffer did not confirm that the post was created.'); error.retryable = false; throw error; }
  return { service, channel: channel.name, channelId: channel.id, ...created.post };
}

export async function deleteBufferPost(id) {
  const result = await bufferRequest(`mutation ISystemDeletePost($input: DeletePostInput!) {
    deletePost(input: $input) { __typename ... on MutationError { message } }
  }`, { input: { id } });
  if (result.deletePost?.message) { const error = new Error(result.deletePost.message); error.retryable = false; throw error; }
  return { ok: true };
}

export async function getBufferPost(id) {
  const data = await bufferQuery(`query ISystemGetPost {
    post(input: { id: ${JSON.stringify(String(id))} }) { id status dueAt externalLink }
  }`);
  return data.post || null;
}