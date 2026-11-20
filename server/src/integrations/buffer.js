const endpoint = 'https://api.buffer.com';

async function bufferQuery(query) {
  const key = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
  if (!key) throw new Error('Buffer API key is missing. Add BUFFER_ACCESS_TOKEN in Vercel.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ query })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(x => x.message).filter(Boolean).join('; ') || 'Buffer API request failed (' + response.status + ').';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.data || {};
}

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


export async function publishBufferPost({ service, text, assetUrl, mode = 'addToQueue' }) {
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
  const input = {
    text: String(text || '').trim(),
    channelId: channel.id,
    schedulingType: 'automatic',
    mode,
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
  const result = await bufferQueryWithVariables(mutation, input);
  const created = result.createPost;
  if (created?.message) throw new Error(created.message);
  if (!created?.post?.id) throw new Error('Buffer did not confirm that the post was created.');
  return { service, channel: channel.name, ...created.post };
}

async function bufferQueryWithVariables(query, variables) {
  const key = process.env.BUFFER_ACCESS_TOKEN || process.env.BUFFER_API_KEY;
  if (!key) throw new Error('Buffer API key is missing. Add BUFFER_ACCESS_TOKEN in Vercel.');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.map(x => x.message).filter(Boolean).join('; ') || 'Buffer API request failed (' + response.status + ').';
    const error = new Error(message); error.status = response.status; throw error;
  }
  return payload.data || {};
}
