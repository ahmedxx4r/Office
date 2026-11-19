let queue, worker, redis;
let fallbackChain = Promise.resolve();
let processor;
export async function initTaskQueue(handleTask) {
  processor = handleTask;
  if (process.env.REDIS_URL) {
    try {
      const { default: IORedis } = await import('ioredis');
      const { Queue, Worker } = await import('bullmq');
      redis = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
      queue = new Queue('virtual-office-tasks', { connection: redis, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: 500, removeOnFail: 1000 } });
      worker = new Worker('virtual-office-tasks', async job => processor(job.data.taskId), { connection: redis, concurrency: Number(process.env.QUEUE_CONCURRENCY || 1) });
      worker.on('failed', (job, err) => console.error('[queue] job failed:', job?.id, err.message));
      console.log('[queue] Redis/BullMQ durable queue enabled');
      return;
    } catch (err) {
      console.error('[queue] Redis requested but BullMQ could not start:', err.message);
      throw new Error('REDIS_URL is set but Redis queue dependencies or connection are unavailable. Check bullmq/ioredis and Redis.');
    }
  }
  console.warn('[queue] Using in-process queue. Configure REDIS_URL for durable jobs.');
}
export async function enqueueTask(taskId) {
  if (queue) return queue.add('execute-task', { taskId });
  fallbackChain = fallbackChain.then(() => processor(taskId)).catch(err => console.error('[queue] task failed:', err.message));
  return fallbackChain;
}
export async function closeQueue() { await worker?.close(); await queue?.close(); await redis?.quit(); }
