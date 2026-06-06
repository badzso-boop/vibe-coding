import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { ok, Errors } from '@/lib/response'

const GITHUB_OWNER = 'badzso-boop'
const GITHUB_REPO = 'vibe-coding'

const LABEL_MAP: Record<string, string> = {
  bug: 'bug',
  feature: 'enhancement',
  other: 'question',
}

const TYPE_LABEL: Record<string, string> = {
  bug: 'Bug report',
  feature: 'Feature request',
  other: 'Other',
}

const schema = z.object({
  type: z.enum(['bug', 'feature', 'other']),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(2000),
  email: z.string().max(255).optional(),
})

export async function POST(request: NextRequest) {
  const token = process.env.GITHUB_FEEDBACK_TOKEN
  if (!token) {
    console.error('[feedback] GITHUB_FEEDBACK_TOKEN is not set')
    return Errors.internalError()
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  // Try to get authenticated user — optional, never blocks submission
  let userLine: string
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userLine = user
      ? `**User:** ${user.email} (authenticated, id: \`${user.id}\`)`
      : body.email
        ? `**Contact:** ${body.email}`
        : '**User:** anonymous'
  } catch {
    userLine = body.email ? `**Contact:** ${body.email}` : '**User:** anonymous'
  }

  const issueBody = [
    '## Description',
    body.description,
    '',
    '---',
    `**Type:** ${TYPE_LABEL[body.type]}`,
    `**Submitted:** ${new Date().toUTCString()}`,
    userLine,
    '',
    '*Submitted via FlowSpace feedback form*',
  ].join('\n')

  const githubRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[Feedback] ${body.title}`,
        body: issueBody,
        labels: [LABEL_MAP[body.type]],
      }),
    },
  )

  if (!githubRes.ok) {
    console.error('[feedback] GitHub API error:', githubRes.status, await githubRes.text())
    return Errors.internalError()
  }

  return ok({ submitted: true })
}
