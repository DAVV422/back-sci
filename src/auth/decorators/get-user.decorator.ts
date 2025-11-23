import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    console.log(request)

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado en la request')
    }

    return data ? user[data] : user
  },
)
