import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({
  timestamps: true
})
export class WorkspaceIntegrationModel extends Document {
  @Prop({ required: true, index: true })
  teamId: string

  @Prop({ required: true })
  appId: string

  @Prop({ type: Map, default: {} })
  config?: Record<string, any>

  @Prop({ default: true })
  isActive: boolean
}

export const WorkspaceIntegrationSchema = SchemaFactory.createForClass(WorkspaceIntegrationModel)

WorkspaceIntegrationSchema.index({ teamId: 1, appId: 1 }, { unique: true })
