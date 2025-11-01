import { hashPassword, verifyPassword } from 'libs/shared/auth-utils';
import bcrypt from 'bcrypt';

const COMPLEX_PASSWORD = 'V@lidPassw0rd!';

describe('auth utils', () => {
  it('hashes and verifies a valid password', async () => {
    const hash = await hashPassword(COMPLEX_PASSWORD);

    expect(hash).not.toEqual(COMPLEX_PASSWORD);
    expect(hash.startsWith('$2')).toBe(true);

    await expect(verifyPassword(COMPLEX_PASSWORD, hash)).resolves.toBe(true);
  });

  it('rejects an invalid password', async () => {
    const hash = await hashPassword(COMPLEX_PASSWORD);

    await expect(verifyPassword('WrongPassword123!', hash)).resolves.toBe(false);
  });

  it('invokes the fallback comparison when the stored hash is malformed', async () => {
    const compareSpy = jest.spyOn(bcrypt, 'compare');

    await expect(verifyPassword(COMPLEX_PASSWORD, 'not-a-real-hash')).resolves.toBe(false);

    expect(compareSpy).toHaveBeenCalledTimes(1);
    const [, usedHash] = compareSpy.mock.calls[0];
    expect(typeof usedHash).toBe('string');
    expect(usedHash).not.toBe('not-a-real-hash');
    expect((usedHash as string).startsWith('$2')).toBe(true);

    compareSpy.mockRestore();
  });
});
