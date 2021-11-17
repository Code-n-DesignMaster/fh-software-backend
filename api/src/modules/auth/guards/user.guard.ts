import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../services';

@Injectable()
export class LoadUser implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.headers.authorization || request.headers.authorization === 'null') return true;

    const user = request.user
      || (await this.authService.getSourceFromJWT(request.headers.authorization));
    if (!user) return true;
    if (!request.user) request.user = user;
    const decodded = this.authService.verifyJWT(request.headers.authorization);
    request.authUser = request.authUser || decodded;
    return true;
  }
}
