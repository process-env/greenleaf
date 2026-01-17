# Complete Examples

## Email Drip Campaign

```typescript
// inngest/functions/email-campaign.ts
import { inngest } from '@/lib/inngest';
import { NonRetriableError } from 'inngest';
import { sendEmail, getUser, trackEmail } from '@/lib/email';

export const emailDripCampaign = inngest.createFunction(
    {
        id: 'email-drip-campaign',
        name: 'Email Drip Campaign',
        cancelOn: [
            { event: 'user/unsubscribed', match: 'data.userId' },
            { event: 'user/deleted', match: 'data.userId' },
        ],
    },
    { event: 'user/signed-up' },
    async ({ event, step }) => {
        const { userId, email } = event.data;

        // Validate user exists
        const user = await step.run('validate-user', async () => {
            const u = await getUser(userId);
            if (!u) throw new NonRetriableError('User not found');
            return u;
        });

        // Day 0: Welcome email
        await step.run('send-welcome', async () => {
            await sendEmail({
                to: email,
                template: 'welcome',
                data: { name: user.name },
            });
            await trackEmail(userId, 'welcome');
        });

        // Day 1: Getting started guide
        await step.sleep('wait-day-1', '1 day');
        await step.run('send-getting-started', async () => {
            await sendEmail({
                to: email,
                template: 'getting-started',
                data: { name: user.name },
            });
            await trackEmail(userId, 'getting-started');
        });

        // Day 3: Feature highlights
        await step.sleep('wait-day-3', '2 days');
        await step.run('send-features', async () => {
            await sendEmail({
                to: email,
                template: 'feature-highlights',
                data: { name: user.name },
            });
            await trackEmail(userId, 'feature-highlights');
        });

        // Day 7: Check-in
        await step.sleep('wait-day-7', '4 days');

        // Check if user has been active
        const activity = await step.run('check-activity', async () => {
            return await getUserActivity(userId);
        });

        if (activity.isActive) {
            await step.run('send-power-user-tips', async () => {
                await sendEmail({
                    to: email,
                    template: 'power-user-tips',
                    data: { name: user.name },
                });
            });
        } else {
            await step.run('send-re-engagement', async () => {
                await sendEmail({
                    to: email,
                    template: 're-engagement',
                    data: { name: user.name },
                });
            });
        }

        return { completed: true, userId };
    }
);
```

---

## Order Processing Pipeline

```typescript
// inngest/functions/process-order.ts
import { inngest } from '@/lib/inngest';
import { NonRetriableError, RetryAfterError } from 'inngest';

export const processOrder = inngest.createFunction(
    {
        id: 'process-order',
        name: 'Process Order',
        concurrency: { limit: 10 },
        retries: 5,
        onFailure: async ({ error, event, step }) => {
            await step.run('notify-failure', async () => {
                await slack.send({
                    channel: '#orders-alerts',
                    text: `Order ${event.data.orderId} failed: ${error.message}`,
                });
            });
            await step.run('refund-if-charged', async () => {
                if (event.data.paymentId) {
                    await stripe.refunds.create({ payment_intent: event.data.paymentId });
                }
            });
        },
    },
    { event: 'order/placed' },
    async ({ event, step }) => {
        const { orderId, userId, items, paymentMethodId } = event.data;

        // Step 1: Validate order
        const order = await step.run('validate-order', async () => {
            const o = await db.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            });
            if (!o) throw new NonRetriableError('Order not found');
            if (o.status !== 'pending') throw new NonRetriableError('Order already processed');
            return o;
        });

        // Step 2: Check inventory
        const inventory = await step.run('check-inventory', async () => {
            const available = await checkInventory(items);
            if (!available.allAvailable) {
                throw new NonRetriableError(`Items unavailable: ${available.unavailable.join(', ')}`);
            }
            return available;
        });

        // Step 3: Reserve inventory
        await step.run('reserve-inventory', async () => {
            await reserveInventory(orderId, items);
        });

        // Step 4: Process payment
        const payment = await step.run('process-payment', async () => {
            try {
                return await stripe.paymentIntents.create({
                    amount: order.total,
                    currency: 'usd',
                    payment_method: paymentMethodId,
                    confirm: true,
                }, {
                    idempotencyKey: `order-${orderId}`,
                });
            } catch (error) {
                if (error.type === 'card_error') {
                    throw new NonRetriableError(`Payment failed: ${error.message}`);
                }
                throw error;
            }
        });

        // Step 5: Update order status
        await step.run('update-order', async () => {
            await db.order.update({
                where: { id: orderId },
                data: {
                    status: 'paid',
                    paymentId: payment.id,
                    paidAt: new Date(),
                },
            });
        });

        // Step 6: Trigger fulfillment
        await step.sendEvent('trigger-fulfillment', {
            name: 'order/fulfill',
            data: { orderId, paymentId: payment.id },
        });

        // Step 7: Send confirmation
        await step.run('send-confirmation', async () => {
            await sendEmail({
                to: order.email,
                template: 'order-confirmation',
                data: { orderId, items, total: order.total },
            });
        });

        return { orderId, paymentId: payment.id, status: 'completed' };
    }
);
```

---

## AI Content Generation with Rate Limiting

```typescript
// inngest/functions/generate-content.ts
import { inngest } from '@/lib/inngest';
import OpenAI from 'openai';

const openai = new OpenAI();

export const generateContent = inngest.createFunction(
    {
        id: 'generate-content',
        name: 'Generate AI Content',
        throttle: {
            limit: 50,
            period: '1m', // 50 requests per minute to OpenAI
        },
        concurrency: {
            limit: 5, // Max 5 concurrent generations
        },
    },
    { event: 'content/generate' },
    async ({ event, step }) => {
        const { contentId, prompt, type } = event.data;

        // Step 1: Generate content
        const generated = await step.run('generate', async () => {
            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: getSystemPrompt(type) },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 2000,
            });
            return response.choices[0].message.content;
        });

        // Step 2: Moderate content
        const moderation = await step.run('moderate', async () => {
            const response = await openai.moderations.create({
                input: generated,
            });
            return response.results[0];
        });

        if (moderation.flagged) {
            await step.run('flag-content', async () => {
                await db.content.update({
                    where: { id: contentId },
                    data: { status: 'flagged', moderationResults: moderation },
                });
            });
            return { contentId, status: 'flagged' };
        }

        // Step 3: Save content
        await step.run('save-content', async () => {
            await db.content.update({
                where: { id: contentId },
                data: {
                    content: generated,
                    status: 'completed',
                    generatedAt: new Date(),
                },
            });
        });

        return { contentId, status: 'completed' };
    }
);
```

---

## Bulk Data Sync with Batching

```typescript
// inngest/functions/sync-records.ts
import { inngest } from '@/lib/inngest';

export const syncRecords = inngest.createFunction(
    {
        id: 'sync-records',
        name: 'Sync Records to External System',
        batchEvents: {
            maxSize: 100,
            timeout: '5s',
        },
        throttle: {
            limit: 10,
            period: '1s', // External API rate limit
        },
    },
    { event: 'record/updated' },
    async ({ events, step }) => {
        const records = events.map(e => e.data);

        // Step 1: Prepare batch
        const prepared = await step.run('prepare-batch', async () => {
            return records.map(r => ({
                externalId: r.externalId,
                data: transformForExternalSystem(r),
            }));
        });

        // Step 2: Send to external API
        const result = await step.run('sync-to-external', async () => {
            const response = await externalAPI.bulkUpsert(prepared);
            return response;
        });

        // Step 3: Update local records
        await step.run('update-sync-status', async () => {
            await db.record.updateMany({
                where: { id: { in: records.map(r => r.id) } },
                data: { lastSyncedAt: new Date() },
            });
        });

        return {
            synced: result.successful.length,
            failed: result.failed.length,
        };
    }
);
```

---

## Approval Workflow with Event Coordination

```typescript
// inngest/functions/approval-workflow.ts
import { inngest } from '@/lib/inngest';

export const approvalWorkflow = inngest.createFunction(
    {
        id: 'approval-workflow',
        name: 'Multi-Level Approval',
    },
    { event: 'request/submitted' },
    async ({ event, step }) => {
        const { requestId, amount, requesterId } = event.data;

        // Determine approval levels needed
        const levels = await step.run('determine-levels', async () => {
            if (amount > 10000) return ['manager', 'director', 'finance'];
            if (amount > 1000) return ['manager', 'director'];
            return ['manager'];
        });

        // Process each approval level
        for (const level of levels) {
            // Find approver
            const approver = await step.run(`find-${level}-approver`, async () => {
                return await findApprover(requesterId, level);
            });

            // Request approval
            await step.run(`request-${level}-approval`, async () => {
                await sendApprovalRequest(approver.id, requestId, level);
            });

            // Wait for response
            const response = await step.waitForEvent(`wait-${level}-approval`, {
                event: 'approval/response',
                if: `async.data.requestId == "${requestId}" && async.data.level == "${level}"`,
                timeout: '72h',
            });

            if (!response) {
                // Timeout - escalate
                await step.run(`escalate-${level}`, async () => {
                    await escalateApproval(requestId, level);
                });
                return { requestId, status: 'escalated', level };
            }

            if (!response.data.approved) {
                // Rejected
                await step.run('notify-rejection', async () => {
                    await notifyRequester(requesterId, 'rejected', level, response.data.reason);
                });
                return { requestId, status: 'rejected', level, reason: response.data.reason };
            }

            // Approved at this level, continue to next
            await step.run(`record-${level}-approval`, async () => {
                await recordApproval(requestId, level, approver.id);
            });
        }

        // All levels approved
        await step.run('finalize-approval', async () => {
            await finalizeRequest(requestId);
            await notifyRequester(requesterId, 'approved');
        });

        return { requestId, status: 'approved' };
    }
);
```

---

## Scheduled Health Checks

```typescript
// inngest/functions/health-check.ts
import { inngest } from '@/lib/inngest';

export const healthCheck = inngest.createFunction(
    { id: 'health-check', name: 'System Health Check' },
    { cron: '*/5 * * * *' }, // Every 5 minutes
    async ({ step }) => {
        const checks = await Promise.all([
            step.run('check-api', async () => {
                const start = Date.now();
                const response = await fetch('https://api.example.com/health');
                return {
                    service: 'api',
                    status: response.ok ? 'healthy' : 'unhealthy',
                    latency: Date.now() - start,
                };
            }),
            step.run('check-database', async () => {
                const start = Date.now();
                await db.$queryRaw`SELECT 1`;
                return {
                    service: 'database',
                    status: 'healthy',
                    latency: Date.now() - start,
                };
            }),
            step.run('check-redis', async () => {
                const start = Date.now();
                await redis.ping();
                return {
                    service: 'redis',
                    status: 'healthy',
                    latency: Date.now() - start,
                };
            }),
        ]);

        const unhealthy = checks.filter(c => c.status !== 'healthy');

        if (unhealthy.length > 0) {
            await step.run('alert', async () => {
                await pagerduty.trigger({
                    summary: `Health check failed: ${unhealthy.map(c => c.service).join(', ')}`,
                    severity: 'critical',
                    details: unhealthy,
                });
            });
        }

        await step.run('record-metrics', async () => {
            for (const check of checks) {
                await metrics.gauge(`health.${check.service}.latency`, check.latency);
                await metrics.gauge(`health.${check.service}.status`, check.status === 'healthy' ? 1 : 0);
            }
        });

        return { checks, healthy: unhealthy.length === 0 };
    }
);
```

---

## File Processing Pipeline

```typescript
// inngest/functions/process-file.ts
import { inngest } from '@/lib/inngest';

export const processFile = inngest.createFunction(
    {
        id: 'process-file',
        name: 'Process Uploaded File',
        concurrency: { limit: 3 }, // Limit concurrent processing
    },
    { event: 'file/uploaded' },
    async ({ event, step }) => {
        const { fileId, userId, filename, mimetype } = event.data;

        // Step 1: Download file
        const file = await step.run('download-file', async () => {
            return await storage.download(fileId);
        });

        // Step 2: Scan for viruses
        const scanResult = await step.run('virus-scan', async () => {
            return await virusScanner.scan(file);
        });

        if (scanResult.infected) {
            await step.run('quarantine-file', async () => {
                await storage.quarantine(fileId);
                await notifyUser(userId, 'file-infected', { filename });
            });
            return { fileId, status: 'quarantined' };
        }

        // Step 3: Process based on type
        let processedData;
        if (mimetype.startsWith('image/')) {
            processedData = await step.run('process-image', async () => {
                const thumbnails = await imageProcessor.generateThumbnails(file);
                const metadata = await imageProcessor.extractMetadata(file);
                return { thumbnails, metadata };
            });
        } else if (mimetype === 'application/pdf') {
            processedData = await step.run('process-pdf', async () => {
                const text = await pdfProcessor.extractText(file);
                const pageCount = await pdfProcessor.getPageCount(file);
                return { text, pageCount };
            });
        }

        // Step 4: Save processed data
        await step.run('save-processed', async () => {
            await db.file.update({
                where: { id: fileId },
                data: {
                    status: 'processed',
                    processedData,
                    processedAt: new Date(),
                },
            });
        });

        // Step 5: Notify user
        await step.run('notify-complete', async () => {
            await notifyUser(userId, 'file-processed', { filename });
        });

        return { fileId, status: 'processed', data: processedData };
    }
);
```
