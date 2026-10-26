import { IsEnum } from 'class-validator'

import { FormDetailInput } from './form.graphql'
import { IntegrationStatusEnum } from '@model'
import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'

@InputType()
export class IntegrationInput extends FormDetailInput {
  @Field()
  appId: string
}

@InputType()
export class IntegrationOAuthInput extends IntegrationInput {
  @Field()
  code: string
}

@InputType()
export class UpdateIntegrationInput extends IntegrationInput {
  @Field(type => GraphQLJSONObject)
  config: Record<string, any>
}

@InputType()
export class UpdateIntegrationStatusInput extends IntegrationInput {
  @Field(type => Number)
  @IsEnum(IntegrationStatusEnum)
  status: IntegrationStatusEnum
}

@InputType()
export class GetIntegrationLogsInput extends FormDetailInput {
  @Field({ nullable: true })
  integrationId?: string

  @Field({ nullable: true, defaultValue: 50 })
  limit?: number

  @Field({ nullable: true, defaultValue: 0 })
  skip?: number
}

@InputType()
export class RetryIntegrationDeliveryInput extends FormDetailInput {
  @Field()
  logId: string
}

@ObjectType()
export class IntegrationDeliveryLogType {
  @Field()
  id: string

  @Field()
  formId: string

  @Field()
  integrationId: string

  @Field()
  appId: string

  @Field()
  submissionId: string

  @Field({ nullable: true })
  endpointUrl?: string

  @Field({ nullable: true })
  responseStatus?: number

  @Field({ nullable: true })
  responseBody?: string

  @Field({ nullable: true })
  executionDurationMs?: number

  @Field({ nullable: true })
  errorMessage?: string

  @Field()
  attempts: number

  @Field()
  status: string

  @Field()
  isAlertSent: boolean

  @Field()
  createdAt: Date
}

@ObjectType()
export class IntegrationLogsResultType {
  @Field(type => [IntegrationDeliveryLogType])
  logs: IntegrationDeliveryLogType[]

  @Field()
  total: number
}
