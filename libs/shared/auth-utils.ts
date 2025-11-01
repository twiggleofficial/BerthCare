import bcrypt from 'bcrypt';

const BCRYPT_COST_FACTOR = 12;
const BCRYPT_HASH_REGEX = /^\$2[abxy]\$\d{2}\$.{53}$/;

// Pre-compute a fallback hash once so we can safely compare even when the stored hash is malformed.
const FALLBACK_HASH = bcrypt.hashSync('fallback-password', BCRYPT_COST_FACTOR);

export const hashPassword = async (password: string): Promise<string> => {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }

  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string.');
  }

  if (typeof hash !== 'string' || hash.length === 0 || !BCRYPT_HASH_REGEX.test(hash)) {
    await bcrypt.compare(password, FALLBACK_HASH);
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    await bcrypt.compare(password, FALLBACK_HASH);
    return false;
  }
};
