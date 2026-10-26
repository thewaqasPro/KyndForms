import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SystemSettingsType {
  @Field()
  allowRegistration: boolean

  @Field({ nullable: true })
  appLogoUrl?: string

  @Field({ nullable: true })
  appName?: string

  @Field(() => Int, { nullable: true })
  maxFormsPerWorkspace?: number

  @Field(() => Int, { nullable: true })
  maxSubmissionsPerMonth?: number

  @Field(() => Int, { nullable: true })
  maxUploadFileSizeMB?: number
}

@InputType()
export class UpdateSystemSettingsInput {
  @Field({ nullable: true })
  allowRegistration?: boolean

  @Field({ nullable: true })
  appLogoUrl?: string

  @Field({ nullable: true })
  appName?: string

  @Field(() => Int, { nullable: true })
  maxFormsPerWorkspace?: number

  @Field(() => Int, { nullable: true })
  maxSubmissionsPerMonth?: number

  @Field(() => Int, { nullable: true })
  maxUploadFileSizeMB?: number
}

@ObjectType()
export class AdminUserItemType {
  @Field()
  id: string

  @Field()
  name: string

  @Field({ nullable: true })
  email?: string

  @Field({ nullable: true })
  avatar?: string

  @Field({ nullable: true })
  isSystemAdmin?: boolean

  @Field({ nullable: true })
  isBlocked?: boolean

  @Field({ nullable: true })
  isEmailVerified?: boolean

  @Field({ nullable: true })
  createdAt?: string
}

@ObjectType()
export class AdminUserPaginationType {
  @Field(() => [AdminUserItemType])
  users: AdminUserItemType[]

  @Field(() => Int)
  total: number

  @Field(() => Int)
  page: number

  @Field(() => Int)
  limit: number
}
