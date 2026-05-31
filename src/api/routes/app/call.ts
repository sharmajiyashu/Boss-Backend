import { Router, Request, Response } from 'express';
import Container from 'typedi';
import { CallService } from '../../../services/app/CallService';
import { ResponseWrapper } from '../../responseWrapper';
import { appAuthMiddleware } from '../../middleware/appAuthMiddleware';
import { validate } from '../../validators';
import { scheduleCallSchema, updateCallStatusSchema, saveCallHistorySchema } from '../../validators/call';

export default (router: Router) => {
  const callService = Container.get(CallService);

  // POST /api/app/calls/schedule - Schedule a new call
  router.post(
    '/calls/schedule',
    appAuthMiddleware,
    validate(scheduleCallSchema),
    async (req: Request, res: Response) => {
      try {
        const callerId = (req as any).user.id;
        const { receiverId, scheduledTime, notes } = req.body;
        const call = await callService.scheduleCall(callerId, receiverId, new Date(scheduledTime), notes);
        return ResponseWrapper.success(res, call, 'Call scheduled successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // PATCH /api/app/calls/:id/status - Update call status (accept, reject, start, complete, etc.)
  router.patch(
    '/calls/:id/status',
    appAuthMiddleware,
    validate(updateCallStatusSchema),
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const callId = req.params.id as string;
        const { status } = req.body;
        const updatedCall = await callService.updateCallStatus(userId, callId, status);
        return ResponseWrapper.success(res, updatedCall, `Call status updated to ${status}`);
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // GET /api/app/calls/history - Get scheduled calls history for the authenticated user
  router.get(
    '/calls/history',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const history = await callService.getCallHistory(userId);
        return ResponseWrapper.success(res, history, 'Call history fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // GET /api/app/calls/history-logs - Get actual call session logs for the authenticated user
  router.get(
    '/calls/history-logs',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const logs = await callService.getCallHistoryLogs(userId);
        return ResponseWrapper.success(res, logs, 'Call history logs fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // GET /api/app/calls/:id - Get details of a specific scheduled call
  router.get(
    '/calls/:id',
    appAuthMiddleware,
    async (req: Request, res: Response) => {
      try {
        const userId = (req as any).user.id;
        const callId = req.params.id as string;
        const call = await callService.getCallDetail(userId, callId);
        return ResponseWrapper.success(res, call, 'Call details fetched successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );

  // POST /api/app/calls/history - Save a call session log (Zegocloud logs)
  router.post(
    '/calls/history',
    appAuthMiddleware,
    validate(saveCallHistorySchema),
    async (req: Request, res: Response) => {
      try {
        const callerId = (req as any).user.id;
        const { receiverId, scheduledCallId, startTime, endTime, status } = req.body;
        const log = await callService.saveCallHistory(
          callerId,
          receiverId,
          new Date(startTime),
          new Date(endTime),
          status,
          scheduledCallId
        );
        return ResponseWrapper.success(res, log, 'Call history log saved successfully');
      } catch (error: any) {
        return ResponseWrapper.error(res, error.message);
      }
    }
  );
};
