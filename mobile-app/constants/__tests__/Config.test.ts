const originalDev = global.__DEV__;

describe('rider API configuration', () => {
  afterEach(() => {
    jest.resetModules();
    global.__DEV__ = originalDev;
  });

  it('uses the configured development API while testing locally', () => {
    global.__DEV__ = true;
    const { Config } = require('../Config');

    expect(Config.API_URL).toBe('http://10.5.22.51:3001');
  });
});
