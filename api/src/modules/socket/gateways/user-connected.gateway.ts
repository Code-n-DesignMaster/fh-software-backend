import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage
} from '@nestjs/websockets';
import { RedisService } from 'nestjs-redis';
import { Socket } from 'socket.io';
import { AuthService } from 'src/modules/auth';
import { pick } from 'lodash';
import { QueueEventService } from 'src/kernel';
import { SocketUserService } from '../services/socket-user.service';
import { USER_SOCKET_CONNECTED_CHANNEL, USER_SOCKET_EVENT, PERFORMER_SOCKET_CONNECTED_CHANNEL } from '../constants';

@WebSocketGateway()
export class WsUserConnectedGateway
implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly authService: AuthService,
    private readonly socketUserService: SocketUserService,
    private readonly queueEventService: QueueEventService,
    private readonly redisService: RedisService
  ) { }

  async handleConnection(client: Socket): Promise<void> {
    if (!client.handshake.query.token) {
      return;
    }
    await this.login(client, client.handshake.query.token);
  }

  async handleDisconnect(client: Socket) {
    if (!client.authUser) {
      return;
    }

    const connectionLen = await this.socketUserService.removeConnection(
      client.authUser.sourceId,
      client.id
    );
    if (connectionLen) {
      return;
    }
    if (client.authUser.source === 'user') {
      await this.queueEventService.publish({
        channel: USER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.DISCONNECTED,
        data: client.authUser
      });
    }
    if (client.authUser.source === 'performer') {
      await this.queueEventService.publish({
        channel: PERFORMER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.DISCONNECTED,
        data: client.authUser
      });
    }
  }

  @SubscribeMessage('auth/login')
  async handleLogin(client: Socket, payload: { token: string }) {
    if (!payload || !payload.token) {
      // TODO - should do something?
      return;
      // client.emit('auth_error', {
      //   message: 'Invalid token!'
      // });
    }

    await this.login(client, payload.token);
  }

  @SubscribeMessage('auth/logout')
  async handleLogout(client: Socket, payload: { token: string }) {
    if (!payload || !payload.token) {
      // TODO - should do something?
      return;
      // client.emit('auth_error', {
      //   message: 'Invalid token!'
      // });
    }

    await this.logout(client, payload.token);
  }

  async login(client: Socket, token: string) {
    const decodeded = this.authService.verifyJWT(token);
    if (!decodeded) {
      return;
      // client.emit('auth_error', {
      //   message: 'Invalid token!'
      // });
    }
    await this.socketUserService.addConnection(decodeded.sourceId, client.id);
    // eslint-disable-next-line no-param-reassign
    client.authUser = pick(decodeded, ['source', 'sourceId', 'authId']);
    if (decodeded.source === 'user') {
      await this.queueEventService.publish({
        channel: USER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.CONNECTED,
        data: client.authUser
      });
    }
    if (decodeded.source === 'performer') {
      await this.queueEventService.publish({
        channel: PERFORMER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.CONNECTED,
        data: client.authUser
      });
    }
  }

  async logout(client: Socket, token: string) {
    const decodeded = this.authService.verifyJWT(token);
    if (!decodeded) {
      return;
      // client.emit('auth_error', {
      //   message: 'Invalid token!'
      // });
    }
    if (!client.authUser) {
      return;
    }
    const connectionLen = await this.socketUserService.removeConnection(decodeded.sourceId, client.id);
    if (connectionLen) {
      // TODO something?
      return;
    }
    // eslint-disable-next-line no-param-reassign
    client.authUser = pick(decodeded, ['source', 'sourceId', 'authId']);
    if (decodeded.source === 'user') {
      await this.queueEventService.publish({
        channel: USER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.DISCONNECTED,
        data: client.authUser
      });
    }
    if (decodeded.source === 'performer') {
      await this.queueEventService.publish({
        channel: PERFORMER_SOCKET_CONNECTED_CHANNEL,
        eventName: USER_SOCKET_EVENT.DISCONNECTED,
        data: client.authUser
      });
    }
  }
}
