import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@InputType()
export class MediaListInput {
  @Field()
  teamId: string

  @Field({ nullable: true })
  projectId?: string

  @Field({ nullable: true })
  keyword?: string

  @Field(() => Int, { nullable: true })
  page?: number

  @Field(() => Int, { nullable: true })
  limit?: number
}

@ObjectType()
export class MediaType {
  @Field()
  id: string

  @Field()
  teamId: string

  @Field()
  projectId: string

  @Field({ nullable: true })
  formId?: string

  @Field()
  filename: string

  @Field()
  key: string

  @Field()
  url: string

  @Field(() => Int)
  size: number

  @Field()
  mimeType: string

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@InputType()
export class DeleteMediaInput {
  @Field()
  id: string

  @Field()
  teamId: string
}
