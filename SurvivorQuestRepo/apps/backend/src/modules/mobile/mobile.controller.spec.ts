import { BadRequestException } from '@nestjs/common';
import { MobileController } from './mobile.controller';

describe('MobileController payload validation', () => {
  function createController() {
    const mobileService = {
      selectMobileTeam: jest.fn(),
      updateMobileTeamLocation: jest.fn(),
      joinMobileSession: jest.fn(),
      completeMobileTask: jest.fn(),
      failMobileAdminTeamTask: jest.fn(),
    };

    const controller = new MobileController(mobileService as never);
    return { controller, mobileService };
  }

  it('rejects missing numeric team slot instead of passing NaN to service', async () => {
    const { controller, mobileService } = createController();

    await expect(
      controller.selectMobileTeam({ sessionToken: 'session-token' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mobileService.selectMobileTeam).not.toHaveBeenCalled();
  });

  it('rejects non-finite location coordinates before service call', async () => {
    const { controller, mobileService } = createController();

    await expect(
      controller.updateMobileTeamLocation({
        sessionToken: 'session-token',
        lat: Number.NaN,
        lng: 21.0122,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mobileService.updateMobileTeamLocation).not.toHaveBeenCalled();
  });

  it('trims required and optional string payload fields', async () => {
    const { controller, mobileService } = createController();
    mobileService.joinMobileSession.mockResolvedValue({ ok: true });

    await controller.joinMobileSession({
      joinCode: ' JOIN01 ',
      deviceId: ' device-1 ',
      memberName: ' Player ',
    });

    expect(mobileService.joinMobileSession).toHaveBeenCalledWith({
      joinCode: 'JOIN01',
      deviceId: 'device-1',
      memberName: 'Player',
    });
  });

  it('rejects non-object payloads', async () => {
    const { controller, mobileService } = createController();

    await expect(controller.completeMobileTask(null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mobileService.completeMobileTask).not.toHaveBeenCalled();
  });

  it('allows an admin to fail a task without an optional reason body', async () => {
    const { controller, mobileService } = createController();
    mobileService.failMobileAdminTeamTask.mockResolvedValue({
      taskStatus: 'failed',
    });

    await controller.failMobileAdminCurrentTeamTask(
      'team-1',
      'station-1',
      undefined,
    );

    expect(mobileService.failMobileAdminTeamTask).toHaveBeenCalledWith({
      realizationId: 'current',
      teamId: 'team-1',
      stationId: 'station-1',
      reason: undefined,
    });
  });
});
