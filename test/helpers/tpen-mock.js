// test/helpers/tpen-mock.js
// Minimal TPEN singleton mock for tests
export const TPEN = {
  getAuthorization: () => 'mock-token',
  login: () => 'mock-login',
  servicesURL: 'https://mock.services',
  eventDispatcher: {
    on: () => {},
    one: () => {},
    off: () => {},
    dispatch: () => {}
  }
}
