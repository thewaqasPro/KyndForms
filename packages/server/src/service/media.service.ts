import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model } from 'mongoose'

import { deleteUploadedFile, deleteUploadedFiles } from '@config'
import { helper } from '@kyndform/utils'
import { MediaModel } from '@model'

export interface FindMediaParams {
  teamId: string
  projectId?: string
  keyword?: string
  page?: number
  limit?: number
}

@Injectable()
export class MediaService {
  constructor(
    @InjectModel(MediaModel.name)
    private readonly mediaModel: Model<MediaModel>
  ) {}

  public async create(data: Partial<MediaModel>): Promise<MediaModel> {
    return this.mediaModel.create(data)
  }

  public async findById(id: string): Promise<MediaModel | null> {
    return this.mediaModel.findById(id)
  }

  public async findAll(params: FindMediaParams): Promise<MediaModel[]> {
    const { teamId, projectId, keyword, page = 1, limit = 50 } = params

    const query: FilterQuery<MediaModel> = {
      teamId
    }

    if (helper.isValid(projectId)) {
      query.projectId = projectId
    }

    if (helper.isValid(keyword) && keyword.trim().length > 0) {
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.filename = { $regex: escaped, $options: 'i' }
    }

    const skip = Math.max(0, (page - 1) * limit)

    return this.mediaModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec()
  }

  public async count(params: Omit<FindMediaParams, 'page' | 'limit'>): Promise<number> {
    const { teamId, projectId, keyword } = params

    const query: FilterQuery<MediaModel> = {
      teamId
    }

    if (helper.isValid(projectId)) {
      query.projectId = projectId
    }

    if (helper.isValid(keyword) && keyword.trim().length > 0) {
      const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.filename = { $regex: escaped, $options: 'i' }
    }

    return this.mediaModel.countDocuments(query).exec()
  }

  public async delete(id: string, teamId: string): Promise<boolean> {
    const media = await this.mediaModel.findOne({ _id: id, teamId })
    if (!media) {
      return false
    }

    if (media.key) {
      await deleteUploadedFile(media.key)
    }

    const result = await this.mediaModel.deleteOne({ _id: id })
    return (result.deletedCount || 0) > 0
  }

  public async deleteByProject(projectId: string): Promise<number> {
    if (!helper.isValid(projectId)) {
      return 0
    }

    const medias = await this.mediaModel.find({ projectId }).select('key').lean()
    const keys = medias.map(m => m.key).filter(Boolean)

    if (keys.length > 0) {
      await deleteUploadedFiles(keys)
    }

    const result = await this.mediaModel.deleteMany({ projectId })
    return result.deletedCount || 0
  }

  public async deleteByTeam(teamId: string): Promise<number> {
    if (!helper.isValid(teamId)) {
      return 0
    }

    const medias = await this.mediaModel.find({ teamId }).select('key').lean()
    const keys = medias.map(m => m.key).filter(Boolean)

    if (keys.length > 0) {
      await deleteUploadedFiles(keys)
    }

    const result = await this.mediaModel.deleteMany({ teamId })
    return result.deletedCount || 0
  }
}
