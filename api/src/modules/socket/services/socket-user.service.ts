import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { ObjectId } from 'mongodb';
import { uniq } from 'lodash';
import { WebSocketServer, WebSocketGateway } from '@nestjs/websockets';
import { Server } from 'socket.io';

export const CONNECTED_USER_REDIS_KEY = 'connected_users';

@Injectable()
@WebSocketGateway()
export class SocketUserService {
  @WebSocketServer() server: Server;

  constructor(
    private readonly redisService: RedisService
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addConnection(sourceId: string | ObjectId, socketId: string, options?: Record<string, any>) {
    // TODO - pass config
    const redisClient = this.redisService.getClient();

    // add to online list
    await redisClient.sadd(CONNECTED_USER_REDIS_KEY, sourceId.toString());
    // add to set: source_id & sockets, to check connection lengths in future in needd?
    await redisClient.sadd(sourceId.toString(), socketId);

    // join this member into member room for feature use?
    // this.server.join(sourceId.toString());
  }

  async removeConnection(sourceId: string | ObjectId, socketId: string) {
    const redisClient = this.redisService.getClient();
    await redisClient.srem(sourceId.toString(), socketId);

    // if hash is empty, remove conencted user
    const len = await redisClient.scard(sourceId.toString());
    if (!len) {
      await redisClient.srem(CONNECTED_USER_REDIS_KEY, sourceId.toString());
    }
    return len;
  }

  async emitToUsers(userIds: string | string[] | ObjectId | ObjectId[], eventName: string, data: any) {
    const stringIds = uniq((Array.isArray(userIds) ? userIds : [userIds])).map((i) => i.toString());
    const redisClient = this.redisService.getClient();
    Promise.all(stringIds.map(async (userId) => {
      // TODO - check
      const socketIds = await redisClient.smembers(userId);
      (socketIds || []).forEach((socketId) => this.server.to(socketId).emit(eventName, data));
    }));
  }
}
