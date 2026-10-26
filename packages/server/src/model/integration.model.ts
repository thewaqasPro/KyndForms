import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export enum IntegrationStatusEnum {
  PENDING = 0,
  ACTIVE = 1,
  DISABLED = 2,
  BROKEN = 3,
  DEGRADED = 4
}

@Schema({
  timestamps: true
})
export class IntegrationModel extends Document {
  @Prop({ required: true })
  formId: string

  @Prop({ required: true })
  appId: string

  @Prop({ type: Map, default: {} })
  config?: Record<string, any>

  @Prop()
  thirdPartyOauthId?: string

  @Prop({
    type: Number,
    required: true,
    default: IntegrationStatusEnum.ACTIVE
  })
  status: IntegrationStatusEnum

  @Prop()
  lastFailureAt?: Date

  @Prop({ default: 0 })
  consecutiveFailures?: number

  @Prop()
  lastErrorMessage?: string

  @Prop()
  lastAlertSentAt?: Date
}

export const IntegrationSchema = SchemaFactory.createForClass(IntegrationModel)

IntegrationSchema.index({ formId: 1, appId: 1 }, { unique: true })
