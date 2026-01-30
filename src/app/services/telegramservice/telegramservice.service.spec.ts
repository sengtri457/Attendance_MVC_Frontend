import { TestBed } from '@angular/core/testing';

import { TelegramserviceService } from './telegramservice.service';

describe('TelegramserviceService', () => {
  let service: TelegramserviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TelegramserviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
