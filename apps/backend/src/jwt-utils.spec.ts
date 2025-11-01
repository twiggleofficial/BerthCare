import {
  configureJwtKeySet,
  generateAccessToken,
  generateRefreshToken,
  resetJwtKeySet,
  verifyToken,
} from 'libs/shared/jwt-utils';
import type { JwtPayload } from 'jsonwebtoken';

const ACTIVE_KEY_ID = 'key-20240201';
const ROTATED_KEY_ID = 'key-20240530';

const KEY_ONE_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDjFlWGDuyPFBjP
h/3FNCDR/aWn1ASBLVnhC50nWwAGu5V8rQStN3FqdijhXY7DYNnruzDpVRIfb+PD
y64Qj/5Y8UQEJ0imsw2SuwZotlvBemh4viQHu9tdF9lTPeyPwjZnHmJvHxMipx4c
uQOt5NK3Iom8CQQPs05WGv2+YXgoX/gp6gJ+MpmqTutZugNngkPXRI8mDfdCcGYX
GPW4IZpz3maSuXsctLUtIbRfjnson7GBuFjJHjd3eahENziYcLGIPJeQspdY0CvG
IXE2oYPPIKiBd5i/jVq7KTPcb40s7NeKmXxZA8AYG2lEwUv0kp0j2YHeEQ8sTqz6
moa768RrAgMBAAECggEBAJTLh5JlqP8/Tdp94vwaYf72UlsbgzAZRTE+aOTmrae7
tgGRZOUS1Q/LCJJSuT6v8VqSt0PMaCmNKRKcHRvhHemtfMGz89i2rggc3+AwzQKD
cHzdKcKfhucCv3XZt22i9f6vXBQvqlwkYIi1egGxU5iH2vQIfE7FUGj/GpBqUU8y
Buzi2GzY6CJuRzLOgyFYlFKSyJowmAbEQCThZjFIeRLEDeYldfhXuxQANRxCpphZ
ouPqJO8FZwuNJpdCrgggyJ8Og50FP86w52Emzwig3prVKPxH95MHpIyPPahrJ4Uw
Msr3aCW/rlkZm1bVVgj8IJJmMIGuDtGORQ5zj1Zz9VECgYEA9AGyMMUaX0JkpY1V
CxmxWHyTEi4CHHyP7CWKyuA8GqIKQbPDpCp7j10FokcppWmPhZeig4hns5jtBE6l
0G014ALloFokB00eXd4mg0SCC3dXAKhGy8cSYCSFfZeJlPO2kwlv4jwYrNbHpHKN
gKvbdj1XFX5z33+/vSVi4TdTRb8CgYEA7j++XPZb+yVn5W4GbrBZmGkdFjXQAu8C
f9OqvZOMrqt9RMaeA4D61E75qoFFQfEvs1zvFwZ9myAjD5kiA5TEj6KObYEqjx20
v7enqGDLGF0zwpJBMhulamC5hJmF+jl52PzEhgog6EGHuhZ1MuS9V7jjJlOIV3zJ
v+jpHFG5ZFUCgYBINhRI8JvsYxasE9Z+MX1VhZB0yd7gFVD2funDPncrHpdQeGXG
uLfWZp4bN1ow1Lufuo9iw8SE1xYVtzzFIPzXraPNP7/31S/OcccOBAFEaW37CNHi
zqg2gbhrwaP6y+FVRG6zEjvvMqTkmu4bjUCmjmKuPr0GAKV60YygwCHJuwKBgQDH
nrMicuyopjPCIQjUr3+yWsgbNuVdv+LpNXGGu90Q8PDZskztBKGlR7KasQtVb/8W
mpRdR3vwgOG/jP/Z3kk/S+VoTORa23n5dKjORKOGe3kF2sMzd8SGOBrYxkViXcwB
CfCjmlLuJxHQ0kZKaStYF7qC/1RqcU0dNcozhyn9rQKBgQCcl87gCdDMPEqZLgKC
WF0JNl9XECa+7elMVhdCIK+bSgSyz91AuJ9oeR/B7ptfCA+nZRVcdGuzc6MRDVrU
wcVfBbn8JausgtK62URFJyI4oVIf/LaUFDn79DPNu9tUw9whBzhbhcIHRR3KnmV8
gms5cUOCDHrfE4oq3+dr3IqlnQ==
-----END PRIVATE KEY-----`;

const KEY_ONE_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4xZVhg7sjxQYz4f9xTQg
0f2lp9QEgS1Z4QudJ1sABruVfK0ErTdxanYo4V2Ow2DZ67sw6VUSH2/jw8uuEI/+
WPFEBCdIprMNkrsGaLZbwXpoeL4kB7vbXRfZUz3sj8I2Zx5ibx8TIqceHLkDreTS
tyKJvAkED7NOVhr9vmF4KF/4KeoCfjKZqk7rWboDZ4JD10SPJg33QnBmFxj1uCGa
c95mkrl7HLS1LSG0X457KJ+xgbhYyR43d3moRDc4mHCxiDyXkLKXWNArxiFxNqGD
zyCogXeYv41auykz3G+NLOzXipl8WQPAGBtpRMFL9JKdI9mB3hEPLE6s+pqGu+vE
awIDAQAB
-----END PUBLIC KEY-----`;

const KEY_TWO_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjDbc3Hn395cgq
rN9emj+WVNTWjyitcI0+BjjavBmDJ2C0HW5xk3gTtb6dmbsXC48+VLw/oMicbzsX
gP/3R4cKte84SOtiwIiFGME1BCCfK/i5F6bzrIwxo/CvqsH0I70C+/ZYY8vW0RH9
tyS90ij5sVJ+yOW2L74Zi5zGrkKVszsJq0iF3SDrHdY7C/gDcFr5MUMjUBFOC0kf
1Lm2FI9+77mKgZR8fYx0fDJN+B6kFlzD/bdldkL2xmRAKpo+SvAzzN/uSbhG5FlB
40J1TjhslnyL9PEG6ER7E1A/YtVAovYj4OOVHf8MGuB5G+DPBYBBcLRPRLL3Gpcc
HJTGD/xjAgMBAAECggEAXHPidvZrKhOoM8phvRppA6yGIkJ6Jh2zeH++rQgKzzr8
siQeA3hClapvsp0AYEjFp+oT82APX+QR9XnHqUZ9Y61VPuzZytywjAdFRfJZLOeZ
2Bl5KKGlvF/gkTqZTv0UpySGwgeUBPH26Y1238rSQQIybIEs/uiDOajX9C/KwWY/
WhvowAv1iruC6eoUYKIP7aaB/9CDmq6BcgIsmM46jrKhwn8WlTlYw3u0QOfTNwGA
3JXNNtuGde1wfzSPE3Od/VMZVRA12jjSuqGQMyIiwSUHMa8M5hpKup4pczM7rcHp
wQhw0n2PZdC8jpPUvyhKtppeLrN7hOnMbqm9E1UCwQKBgQDM2eynoet2ff4QGXxA
WOxsXSwDtONB51a6/6IBq/J6gIRjFAvW5iYHX8CmzWqIdB+zsI1rk3TNwHxQCKUP
6b9PLzuGpa79scDZ5Mhqhf9HO+qsovw4yT1FmMAdrmFP1ZBuOsQ+6uLoe9QbKoIX
tBu4KRSKmsyuwnUjupfWd3XJdwKBgQDLxBYg1emw4i1K+KIU9Cg4WkgME9tmAMlq
IihBzTa56cVxw3JtJc0zNHJpaRoYs/tYkagc/02ymRSFHIla4LwCHtlkB493N7sw
hzybuBGrx7zI3Uy4watSEigubG8J2Rg1/goq5mzltc633TsF/APkbk0jopnJEQ/P
QExIKjafdQKBgFVFIU1mCS15pJfvA9mFKmSxI/EnCrIUKfYNEtK/UF/Nv02+um7p
vkqzgO3t87p5G/kgNL3i02wSA60M7CiDlC7R6mVR8lWH+E66/PHadTihqD3UWkkI
+4hM3St9uuQQcd5wd9/4xhsf8Fqehyh2wFMYRoSriyfzqe8FbM7JSy5hAoGAe2QE
mmGvH+P21X12eQXZDTbuhhHIPB6h2VlR03b3euFrJRbbxeisOCO8XMS+ftMOk3Ww
vc6EOHCmkmzTaGrKruYLcp15bRIckqhyNUHjwYg0c9Y+zWrJ2esQ1fvnyajjFl79
vTjIHNpZkdGwGlGf8cYxhDDEu5NPZYtkJhcZ+LkCgYEAoDeK9y/V/jjX6K+tP85k
1k31vjb/G0atN4Q7J+KWMrqBQsRHxG3rjv8/hD4OwC6m7wziWS0ZDvlT0BMIgZ4t
ftza8gyVAYtjZ2Al14r6b7uhwjjTzrTo7cQ+X0+dFSiJQd02UF36MQmBI7p3R0Qa
HIlF5/pwSGL2fLqoROTSpc0=
-----END PRIVATE KEY-----`;

const KEY_TWO_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAow23Nx59/eXIKqzfXpo/
llTU1o8orXCNPgY42rwZgydgtB1ucZN4E7W+nZm7FwuPPlS8P6DInG87F4D/90eH
CrXvOEjrYsCIhRjBNQQgnyv4uRem86yMMaPwr6rB9CO9Avv2WGPL1tER/bckvdIo
+bFSfsjlti++GYucxq5ClbM7CatIhd0g6x3WOwv4A3Ba+TFDI1ARTgtJH9S5thSP
fu+5ioGUfH2MdHwyTfgepBZcw/23ZXZC9sZkQCqaPkrwM8zf7km4RuRZQeNCdU44
bJZ8i/TxBuhEexNQP2LVQKL2I+DjlR3/DBrgeRvgzwWAQXC0T0Sy9xqXHByUxg/8
YwIDAQAB
-----END PUBLIC KEY-----`;

const configureKeySet = () => {
  configureJwtKeySet({
    activeKeyId: ACTIVE_KEY_ID,
    keys: [
      { id: ACTIVE_KEY_ID, privateKey: KEY_ONE_PRIVATE, publicKey: KEY_ONE_PUBLIC },
      { id: ROTATED_KEY_ID, privateKey: KEY_TWO_PRIVATE, publicKey: KEY_TWO_PUBLIC },
    ],
  });
};

const claims = {
  userId: 'user-123',
  role: 'coordinator',
  zoneId: 'zone-456',
};

describe('jwt utils', () => {
  beforeEach(() => {
    configureKeySet();
  });

  afterEach(() => {
    resetJwtKeySet();
    delete process.env.JWT_PRIVATE_KEY_SET;
    delete process.env.JWT_PRIVATE_KEYS;
  });

  it('generates an access token with the expected claims and expiry', () => {
    const token = generateAccessToken(claims);
    const { payload, header } = verifyToken(token);
    const typedPayload = payload as JwtPayload & {
      exp: number;
      iat: number;
      role: string;
      token_type: string;
      user_id: string;
      zone_id: string;
    };

    expect(header.kid).toBe(ACTIVE_KEY_ID);
    expect(typedPayload.sub).toBe(claims.userId);
    expect(typedPayload.user_id).toBe(claims.userId);
    expect(typedPayload.role).toBe(claims.role);
    expect(typedPayload.zone_id).toBe(claims.zoneId);
    expect(typedPayload.token_type).toBe('access');
    expect(typedPayload.exp - typedPayload.iat).toBe(3600);
  });

  it('generates a refresh token that expires in 30 days', () => {
    const token = generateRefreshToken(claims);
    const { payload, header } = verifyToken(token);
    const typedPayload = payload as JwtPayload & {
      exp: number;
      iat: number;
      token_type: string;
    };

    expect(header.kid).toBe(ACTIVE_KEY_ID);
    expect(typedPayload.token_type).toBe('refresh');
    expect(typedPayload.exp - typedPayload.iat).toBe(60 * 60 * 24 * 30);
  });

  it('supports key rotation by honouring the kid header on verification', () => {
    const legacyToken = generateAccessToken(claims);

    configureJwtKeySet({
      activeKeyId: ROTATED_KEY_ID,
      keys: [
        { id: ROTATED_KEY_ID, privateKey: KEY_TWO_PRIVATE, publicKey: KEY_TWO_PUBLIC },
        // keep legacy key for verification of previously-issued tokens
        { id: ACTIVE_KEY_ID, privateKey: KEY_ONE_PRIVATE, publicKey: KEY_ONE_PUBLIC },
      ],
    });

    const newToken = generateAccessToken(claims);

    expect(verifyToken(legacyToken).header.kid).toBe(ACTIVE_KEY_ID);
    expect(verifyToken(newToken).header.kid).toBe(ROTATED_KEY_ID);
  });

  it('loads key material from JWT_PRIVATE_KEY_SET when no in-memory key set is configured', () => {
    process.env.JWT_PRIVATE_KEY_SET = JSON.stringify({
      activeKeyId: ACTIVE_KEY_ID,
      keys: [
        {
          id: ACTIVE_KEY_ID,
          privateKey: KEY_ONE_PRIVATE.replace(/\n/g, '\\n'),
          publicKey: KEY_ONE_PUBLIC.replace(/\n/g, '\\n'),
        },
      ],
    });

    resetJwtKeySet();

    const token = generateAccessToken(claims);
    const { header } = verifyToken(token);

    expect(header.kid).toBe(ACTIVE_KEY_ID);
  });
});
