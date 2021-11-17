import { QueueEvent } from 'src/kernel/events';

export abstract class QueueEventServiceAbstract {
  abstract async subscribe(
    topic: string,
    eventName: string,
    handler: Function
  ): Promise<void>;

  abstract async publish(event: QueueEvent): Promise<void>;
}
