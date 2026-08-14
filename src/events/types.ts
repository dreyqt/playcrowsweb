export type EventStatus = 'draft' | 'active' | 'ended'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type EventFieldType = 'text' | 'textarea' | 'url'

export type EventFormField = {
  id: string
  label: string
  type: EventFieldType
  required: boolean
  placeholder?: string
  helpText?: string
}

export type PlayCrowsEvent = {
  id: string
  slug: string
  event_number: string
  title: string
  short_description: string | null
  description: string | null
  mechanics: string[]
  rewards: string[]
  form_fields: EventFormField[]
  status: EventStatus
  starts_at: string | null
  ends_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export type EventSubmission = {
  id: string
  reference_code: string
  event_id: string
  discord_username: string
  character_name: string | null
  player_id: string | null
  answers: Record<string, string>
  status: SubmissionStatus
  rejection_reason: string | null
  reward_sent_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  event?: Pick<PlayCrowsEvent, 'event_number' | 'title' | 'slug'>
}
