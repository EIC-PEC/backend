import { randomBytes } from 'node:crypto'
import { PrismaService } from '../../prisma/prisma.service'

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export async function generateUniqueReferralCode(
  prisma: PrismaService,
  prefix: string = 'PEC'
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Array.from(
      randomBytes(6),
      (byte) => REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length]
    ).join('')
    const code = `${prefix}${suffix}`

    const taken = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!taken) return code
  }

  throw new Error(`Could not generate a unique referral code with prefix ${prefix} after 5 attempts`)
}
