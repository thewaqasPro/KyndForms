import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ timestamps: true })
export class MediaModel extends Document {
  @Prop({ required: true, index: true })
  teamId: string

  @Prop({ required: true, index: true })
  projectId: string

  @Prop({ index: true })
  formId?: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  filename: string

  @Prop({ required: true })
  key: string

  @Prop({ required: true })
  url: string

  @Prop({ required: true })
  size: number

  @Prop({ required: true })
  mimeType: string

  createdAt: Date
  updatedAt: Date
}

export const MediaSchema = SchemaFactory.createForClass(MediaModel)

MediaSchema.index({ teamId: 1, projectId: 1, createdAt: -1 })
MediaSchema.index({ teamId: 1, createdAt: -1 })
