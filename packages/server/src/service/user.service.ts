import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'

import { RedisService } from './redis.service'
import { ADMIN_EMAILS } from '@environments'
import { timestamp } from '@kyndform/utils'
import { UserModel } from '@model'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserModel.name) private readonly userModel: Model<UserModel>,
    private readonly redisService?: RedisService
  ) {}

  async findById(id: string): Promise<UserModel | null> {
    const user = await this.userModel.findById(id)
    if (
      user &&
      user.email &&
      ADMIN_EMAILS.includes(user.email.toLowerCase()) &&
      !user.isSystemAdmin
    ) {
      user.isSystemAdmin = true
      await this.userModel.updateOne({ _id: user._id }, { isSystemAdmin: true })
    }
    return user
  }

  async findAll(ids: string[]): Promise<UserModel[]> {
    return this.userModel.find({
      _id: {
        $in: ids
      }
    })
  }

  async findAllDeletionScheduled(): Promise<UserModel[]> {
    return this.userModel.find({
      isDeletionScheduled: true,
      deletionScheduledAt: {
        $gt: 0,
        $lte: timestamp()
      }
    })
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    const user = await this.userModel.findOne({
      email
    })
    if (
      user &&
      user.email &&
      ADMIN_EMAILS.includes(user.email.toLowerCase()) &&
      !user.isSystemAdmin
    ) {
      user.isSystemAdmin = true
      await this.userModel.updateOne({ _id: user._id }, { isSystemAdmin: true })
    }
    return user
  }

  async create(user: UserModel | any): Promise<string | undefined> {
    const userCount = await this.userModel.countDocuments()
    const emailLower = (user.email || '').toLowerCase()

    // Automatically grant System Admin to the first registered user or configured ADMIN_EMAILS
    if (userCount === 0 || (emailLower && ADMIN_EMAILS.includes(emailLower))) {
      user.isSystemAdmin = true
    }

    const result = await this.userModel.create(user as any)
    return result.id
  }

  async update(id: string, updates: Record<string, any>): Promise<any> {
    const result = await this.userModel.updateOne(
      {
        _id: id
      },
      updates
    )
    return result.acknowledged
  }

  public async delete(id: string): Promise<boolean> {
    const result = await this.userModel.deleteOne({
      _id: id
    })
    return (result.deletedCount ?? 0) > 0
  }

  async findPaginated(options: {
    page?: number
    limit?: number
    keyword?: string
  }): Promise<{ users: UserModel[]; total: number }> {
    const page = Math.max(1, options.page || 1)
    const limit = Math.min(100, Math.max(1, options.limit || 20))
    const filter: Record<string, any> = {}

    if (options.keyword && options.keyword.trim()) {
      const sanitized = options.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(sanitized, 'i')
      filter.$or = [{ name: regex }, { email: regex }]
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(filter)
    ])

    return { users, total }
  }

  async toggleBlock(id: string): Promise<boolean> {
    const user = await this.userModel.findById(id)
    if (!user) return false
    const newBlocked = !user.isBlocked
    await this.userModel.updateOne(
      { _id: id },
      {
        isBlocked: newBlocked,
        blockedAt: newBlocked ? timestamp() : undefined
      }
    )
    if (newBlocked && this.redisService) {
      await this.redisService.del(`sess:${id}`)
    }
    return newBlocked
  }

  async toggleSystemAdmin(id: string): Promise<boolean> {
    const user = await this.userModel.findById(id)
    if (!user) return false
    const newAdmin = !user.isSystemAdmin
    await this.userModel.updateOne({ _id: id }, { isSystemAdmin: newAdmin })
    return newAdmin
  }
}
