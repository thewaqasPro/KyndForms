import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({
  timestamps: true,
  collection: 'system_settings'
})
export class SystemSettingModel extends Document {
  @Prop({ required: true, unique: true, index: true, default: 'global' })
  key: string

  @Prop({ default: true })
  allowRegistration: boolean

  @Prop()
  appLogoUrl?: string

  @Prop({ default: 'KyndForm' })
  appName?: string

  @Prop({ default: 0 })
  maxFormsPerWorkspace?: number

  @Prop({ default: 0 })
  maxSubmissionsPerMonth?: number

  @Prop({ default: 20 })
  maxUploadFileSizeMB?: number
}

export const SystemSettingSchema = SchemaFactory.createForClass(SystemSettingModel)
