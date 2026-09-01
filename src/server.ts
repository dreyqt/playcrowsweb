export type PlayCrowsServer = 'v1' | 'v2'

export const PLAYCROWS_SERVERS: Record<PlayCrowsServer, {
  id: PlayCrowsServer
  name: string
  shortName: string
  description: string
}> = {
  v1: {
    id: 'v1',
    name: 'PlayCrows V1',
    shortName: 'V1',
    description: 'Server 1',
  },
  v2: {
    id: 'v2',
    name: 'PlayCrows V2',
    shortName: 'V2',
    description: 'Server 2',
  },
}

export function isPlayCrowsServer(value: unknown): value is PlayCrowsServer {
  return value === 'v1' || value === 'v2'
}
