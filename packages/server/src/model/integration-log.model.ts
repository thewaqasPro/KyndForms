import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export enum IntegrationDeliveryStatusEnum {
  SUCCESS = 'success',
  FAILED = 'failed'
}

@Schema({
  timestamps: true
})
export class IntegrationDeliveryLogModel extends Document {
  @Prop({ required: true, index: true })
  formId: string

  @Prop({ required: true, index: true })
  integrationId: string

  @Prop({ required: true })
  appId: string

  @Prop({ required: true, index: true })
  submissionId: string

  @Prop()
  endpointUrl?: string

  @Prop({ type: Number })
  responseStatus?: number

  @Prop()
  responseBody?: string

  @Prop({ type: Number, default: 0 })
  executionDurationMs?: number

  @Prop()
  errorMessage?: string

  @Prop({ type: Number, default: 1 })
  attempts: number

  @Prop({
    type: String,
    enum: Object.values(IntegrationDeliveryStatusEnum),
    default: IntegrationDeliveryStatusEnum.SUCCESS,
    index: true
  })
  status: IntegrationDeliveryStatusEnum

  @Prop({ type: Boolean, default: false })
  isAlertSent: boolean

  @Prop({ default: Date.now, expires: 30 * 24 * 60 * 60 }) // Auto-expire after 30 days
  createdAt: Date
}

export const IntegrationDeliveryLogSchema = SchemaFactory.createForClass(
  IntegrationDeliveryLogModel
)

IntegrationDeliveryLogSchema.index({ formId: 1, integrationId: 1, createdAt: -1 })
IntegrationDeliveryLogSchema.index({ formId: 1, status: 1, createdAt: -1 })
