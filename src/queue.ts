import {Queue} from 'bullmq';
import { Redis } from 'ioredis';
import type {Task} from './core.ts';
export const queueName='pr-review';
export const redis=new Redis(process.env.REDIS_URL??'redis://localhost:6379',{maxRetriesPerRequest:null});
export const queue=new Queue<Task>(queueName,{connection:redis});
