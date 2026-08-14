import type { LanguageCode } from '../i18n'

export type EventStatus = 'draft' | 'active' | 'ended'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type EventFieldType = 'text' | 'textarea' | 'url' | 'links'
export type ClaimFrequency = 'once' | 'weekly'

export type EventFieldTranslation = {
  label?: string
  placeholder?: string
  helpText?: string
}

export type EventFormField = {
  id: string
  label: string
  type: EventFieldType
  required: boolean
  placeholder?: string
  helpText?: string
  minItems?: number
  maxItems?: number
  translations?: Partial<Record<LanguageCode, EventFieldTranslation>>
}

export type EventTranslation = {
  title?: string
  short_description?: string
  description?: string
  mechanics?: string[]
  rewards?: string[]
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
  translations?: Partial<Record<LanguageCode, EventTranslation>>
  status: EventStatus
  starts_at: string | null
  ends_at: string | null
  published_at: string | null
  claim_frequency?: ClaimFrequency
  weekly_reset_day?: number
  weekly_reset_hour?: number
  weekly_reset_timezone?: string
  require_character_name?: boolean
  require_player_id?: boolean
  created_at: string
  updated_at: string
}

export type EventAnswerValue = string | string[]

export type EventSubmission = {
  id: string
  reference_code: string
  event_id: string
  discord_username: string
  character_name: string | null
  player_id: string | null
  answers: Record<string, EventAnswerValue>
  status: SubmissionStatus
  rejection_reason: string | null
  reward_sent_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  event?: Pick<PlayCrowsEvent, 'event_number' | 'title' | 'slug'>
}
