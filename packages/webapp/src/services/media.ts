import { apollo } from '@/utils'

import { DELETE_MEDIA_GQL, MEDIAS_GQL } from '@/consts'

export interface MediaItem {
  id: string
  teamId: string
  projectId: string
  formId?: string
  filename: string
  key: string
  url: string
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
}

export interface MediaListFilter {
  teamId: string
  projectId?: string
  keyword?: string
  page?: number
  limit?: number
}

export class MediaService {
  static async list(input: MediaListFilter): Promise<MediaItem[]> {
    return (
      (await apollo.query<MediaItem[]>({
        query: MEDIAS_GQL,
        variables: {
          input
        },
        fetchPolicy: 'network-only'
      })) || []
    )
  }

  static async delete(id: string, teamId: string): Promise<boolean> {
    return apollo.mutate<boolean>({
      mutation: DELETE_MEDIA_GQL,
      variables: {
        input: {
          id,
          teamId
        }
      }
    })
  }
}
